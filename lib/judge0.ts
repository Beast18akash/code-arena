import axios from "axios";

export const DEFAULT_JUDGE0_URL = "http://localhost:2359";

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
  return process.env.JUDGE0_URL?.trim() || DEFAULT_JUDGE0_URL;
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
  constructor(private readonly baseUrl: string = getJudge0Url()) {}

  async submitSubmission(submission: Judge0SubmissionRequest) {
    const { data } = await axios.post(`${this.baseUrl}/submissions`, {
      language_id: submission.language_id,
      source_code: submission.source_code,
      stdin: submission.stdin,
      expected_output: submission.expected_output ?? "",
      base64_encoded: false,
    });

    return data as { token: string };
  }

  async getSubmission(token: string) {
    const { data } = await axios.get(`${this.baseUrl}/submissions/${token}`, {
      params: {
        base64_encoded: false,
        fields: "*",
      },
    });

    return data as Judge0SubmissionResult;
  }

  async waitForSubmission(token: string) {
    while (true) {
      const result = await this.getSubmission(token);
      const statusId = result.status?.id;

      if (statusId !== 1 && statusId !== 2) {
        return result;
      }

      await sleep(1000);
    }
  }

  async executeSubmission(submission: Judge0SubmissionRequest) {
    const submitted = await this.submitSubmission(submission);
    return this.waitForSubmission(submitted.token);
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
