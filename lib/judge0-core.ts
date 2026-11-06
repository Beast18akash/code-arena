import axios from "axios";

const JUDGE0_REQUEST_TIMEOUT_MS = 10_000;
const JUDGE0_EXECUTION_TIMEOUT_MS = 120_000;
const JUDGE0_POLL_INTERVAL_MS = 1_000;

export class Judge0ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Judge0ConfigurationError";
  }
}

export class Judge0RequestError extends Error {
  constructor(
    message = "Judge0 could not complete the request.",
    readonly kind:
      | "authentication"
      | "rate-limit"
      | "upstream"
      | "network"
      | "request-timeout"
      | "http" = "http",
    readonly status?: number,
  ) {
    super(message);
    this.name = "Judge0RequestError";
  }
}

export class Judge0TimeoutError extends Error {
  constructor(message = "Judge0 execution timed out.") {
    super(message);
    this.name = "Judge0TimeoutError";
  }
}

export const JUDGE0_LANGUAGE_REGISTRY = {
  PYTHON: {
    codeArenaLanguage: "Python",
    judge0LanguageId: 71,
    version: "Python 3.8.1",
    enabled: true,
  },
  JAVASCRIPT: {
    codeArenaLanguage: "JavaScript",
    judge0LanguageId: 63,
    version: "Node.js 12.14.0",
    enabled: true,
  },
  JAVA: {
    codeArenaLanguage: "Java",
    judge0LanguageId: 62,
    version: "OpenJDK 13.0.1",
    enabled: true,
  },
} as const;

export type SupportedJudge0Language = keyof typeof JUDGE0_LANGUAGE_REGISTRY;

export function getJudge0Url() {
  const configuredUrl = process.env.JUDGE0_URL?.trim();
  if (!configuredUrl) {
    throw new Judge0ConfigurationError("JUDGE0_URL is not configured.");
  }

  let url: URL;
  try {
    url = new URL(configuredUrl);
  } catch {
    throw new Judge0ConfigurationError("JUDGE0_URL must be a valid HTTPS URL.");
  }

  if (
    url.protocol !== "https:" ||
    url.port === "2359" ||
    url.username ||
    url.password
  ) {
    throw new Judge0ConfigurationError(
      "JUDGE0_URL must use HTTPS through the reverse proxy and must not include credentials or port 2359.",
    );
  }

  return url.toString().replace(/\/+$/, "");
}

function getJudge0Credentials() {
  const username = process.env.JUDGE0_USERNAME?.trim();
  const password = process.env.JUDGE0_PASSWORD;
  if (!username || !password) {
    throw new Judge0ConfigurationError(
      "JUDGE0_USERNAME and JUDGE0_PASSWORD must be configured.",
    );
  }

  return { username, password };
}

export function validateJudge0Configuration() {
  getJudge0Url();
  getJudge0Credentials();
}

export function getJudge0LanguageConfig(language: string) {
  const normalized = language?.trim().toUpperCase();
  if (!normalized) {
    return null;
  }

  return (
    JUDGE0_LANGUAGE_REGISTRY[
      normalized as SupportedJudge0Language
    ] ?? null
  );
}

export function getJudge0languageId(language: string) {
  return getJudge0LanguageConfig(language)?.judge0LanguageId ?? null;
}

export function normalizeJudge0Output(value?: string | null) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\r\n/g, "\n").replace(/\n+$/, "").trimEnd();
}

export function mapJudge0StatusToVerdict(statusId?: number) {
  switch (statusId) {
    case 3:
      return "ACCEPTED";
    case 4:
      return "WRONG_ANSWER";
    case 5:
      return "TIME_LIMIT_EXCEEDED";
    case 6:
      return "COMPILATION_ERROR";
    case 7:
    case 8:
    case 9:
    case 10:
    case 11:
      return "RUNTIME_ERROR";
    case 12:
    case 13:
      return "JUDGE_ERROR";
    default:
      return "JUDGE_ERROR";
  }
}

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export type Judge0SubmissionRequest = {
  language_id: number;
  source_code: string;
  stdin: string;
  expected_output?: string;
};

export type Judge0SubmissionResult = {
  token?: string;
  status?: {
    id?: number;
    description?: string;
  };
  stdout?: string | null;
  stderr?: string | null;
  compile_output?: string | null;
  time?: string | null;
  memory?: number | null;
};

export class Judge0Client {
  async submitSubmission(submission: Judge0SubmissionRequest) {
    return this.submitSubmissionUntil(submission);
  }

  private async submitSubmissionUntil(
    submission: Judge0SubmissionRequest,
    deadline?: number,
  ) {
    const baseUrl = getJudge0Url();
    const auth = getJudge0Credentials();
    const payload = {
      language_id: submission.language_id,
      source_code: submission.source_code,
      stdin: submission.stdin,
      ...(submission.expected_output !== undefined
        ? { expected_output: submission.expected_output }
        : {}),
    };
    const data = await this.request<{ token?: string }>(
      ({ timeout, signal }) =>
        axios.post(`${baseUrl}/submissions`, payload, {
          auth,
          timeout,
          signal,
          params: { base64_encoded: false },
        }),
      deadline,
    );
    if (!data.token) {
      throw new Judge0RequestError();
    }

    return { token: data.token };
  }

  async getSubmission(token: string) {
    return this.getSubmissionUntil(token);
  }

  private async getSubmissionUntil(
    token: string,
    deadline?: number,
  ) {
    const baseUrl = getJudge0Url();
    const auth = getJudge0Credentials();
    return this.request<Judge0SubmissionResult>(
      ({ timeout, signal }) =>
        axios.get(`${baseUrl}/submissions/${encodeURIComponent(token)}`, {
          auth,
          timeout,
          signal,
          params: {
            base64_encoded: false,
            fields: "*",
          },
        }),
      deadline,
    );
  }

  async waitForSubmission(token: string) {
    return this.waitForSubmissionUntil(
      token,
      Date.now() + JUDGE0_EXECUTION_TIMEOUT_MS,
    );
  }

  private async waitForSubmissionUntil(token: string, deadline: number) {
    while (Date.now() < deadline) {
      const result = await this.getSubmissionUntil(token, deadline);
      const statusId = result.status?.id;

      if (statusId !== 1 && statusId !== 2) {
        return result;
      }

      await sleep(Math.min(JUDGE0_POLL_INTERVAL_MS, deadline - Date.now()));
    }

    throw new Judge0TimeoutError();
  }

  async executeSubmission(submission: Judge0SubmissionRequest) {
    const deadline = Date.now() + JUDGE0_EXECUTION_TIMEOUT_MS;
    const submitted = await this.submitSubmissionUntil(
      submission,
      deadline,
    );
    return this.waitForSubmissionUntil(submitted.token, deadline);
  }

  private async request<T>(
    operation: (options: { timeout: number; signal: AbortSignal }) => Promise<{ data: T }>,
    deadline?: number,
  ): Promise<T> {
    const remainingMs = deadline === undefined
      ? JUDGE0_REQUEST_TIMEOUT_MS
      : Math.floor(deadline - Date.now());
    if (remainingMs <= 0) {
      throw new Judge0TimeoutError();
    }

    const timeout = Math.min(JUDGE0_REQUEST_TIMEOUT_MS, remainingMs);
    const deadlineBound = deadline !== undefined && remainingMs <= JUDGE0_REQUEST_TIMEOUT_MS;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await operation({ timeout, signal: controller.signal });
      if (deadline !== undefined && Date.now() >= deadline) {
        throw new Judge0TimeoutError();
      }

      return response.data;
    } catch (error) {
      if (error instanceof Judge0TimeoutError) {
        throw error;
      }

      if (axios.isAxiosError(error)) {
        const requestTimedOut =
          controller.signal.aborted ||
          error.code === "ECONNABORTED" ||
          error.code === "ETIMEDOUT";

        if (requestTimedOut) {
          if (deadlineBound || (deadline !== undefined && Date.now() >= deadline)) {
            throw new Judge0TimeoutError();
          }

          throw new Judge0RequestError(
            "The Judge0 request timed out.",
            "request-timeout",
          );
        }

        const status = error.response?.status;
        if (status === 401) {
          throw new Judge0RequestError(
            "Judge0 authentication failed.",
            "authentication",
            status,
          );
        }
        if (status === 429) {
          throw new Judge0RequestError(
            "Judge0 is rate limiting requests. Please try again later.",
            "rate-limit",
            status,
          );
        }
        if (status === 502 || status === 503 || status === 504) {
          throw new Judge0RequestError(
            "Judge0 is temporarily unavailable.",
            "upstream",
            status,
          );
        }
        if (!error.response) {
          throw new Judge0RequestError(
            "Judge0 could not be reached.",
            "network",
          );
        }

        throw new Judge0RequestError(
          "Judge0 could not complete the request.",
          "http",
          status,
        );
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const judge0Client = new Judge0Client();

export async function submitToJudge0(submission: Judge0SubmissionRequest) {
  return judge0Client.submitSubmission(submission);
}

export async function pollJudge0Result(token: string) {
  return judge0Client.waitForSubmission(token);
}

export async function executeJudge0Submission(submission: Judge0SubmissionRequest) {
  return judge0Client.executeSubmission(submission);
}
