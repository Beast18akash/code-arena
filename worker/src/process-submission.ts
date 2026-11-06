import {
  executeJudge0Submission,
  getJudge0LanguageConfig,
  Judge0ConfigurationError,
  Judge0RequestError,
  Judge0TimeoutError,
  normalizeJudge0Output,
  type Judge0SubmissionResult,
} from "../../lib/judge0-core.js";
import { prepareJavaSubmission } from "../../lib/java-submission.js";
import { prepareJavaScriptSubmission } from "../../lib/javascript-submission.js";
import { preparePythonSubmission } from "../../lib/python-submission.js";

export type SubmissionVerdict =
  | "ACCEPTED"
  | "WRONG_ANSWER"
  | "COMPILATION_ERROR"
  | "RUNTIME_ERROR"
  | "TIME_LIMIT_EXCEEDED"
  | "JUDGE_ERROR";

export type SubmissionProcessingResult = {
  verdict: SubmissionVerdict;
  score: 0 | 1;
  stdout: string | null;
  stderr: string | null;
  compileOutput: string | null;
};

export type SubmissionTestCase = {
  input: string;
  output: string;
};

export class SubmissionInputError extends Error {
  constructor(
    readonly code: "unsupported-language" | "invalid-test-cases" | "source-preparation",
    message: string,
  ) {
    super(message);
    this.name = "SubmissionInputError";
  }
}

export class SubmissionInfrastructureError extends Error {
  constructor(
    readonly code:
      | "judge0-configuration"
      | "judge0-request"
      | "judge0-timeout"
      | "unexpected-judge0-response"
      | "execution-failure",
    readonly judge0RequestKind?: Judge0RequestError["kind"],
  ) {
    super("Submission execution infrastructure failed.");
    this.name = "SubmissionInfrastructureError";
  }
}

export async function processSubmission(input: {
  sourceCode: string;
  language: string;
  testCases: unknown;
}): Promise<SubmissionProcessingResult> {
  const languageConfig = getJudge0LanguageConfig(input.language);
  if (!languageConfig) {
    throw new SubmissionInputError("unsupported-language", "Unsupported submission language.");
  }

  const testCases = validateTestCases(input.testCases);
  const executableSource = prepareSource(languageConfig.codeArenaLanguage, input.sourceCode);

  let verdict: SubmissionVerdict = "JUDGE_ERROR";
  let stdout: string | null = null;
  let stderr: string | null = null;
  let compileOutput: string | null = null;
  let passedCases = 0;

  for (const testCase of testCases) {
    const judgeResult = await executeTestCase({
      language_id: languageConfig.judge0LanguageId,
      source_code: executableSource,
      stdin: testCase.input,
    });

    stdout = judgeResult.stdout ?? null;
    stderr = judgeResult.stderr ?? null;

    const statusId = judgeResult.status?.id;
    if (statusId === 6) {
      verdict = "COMPILATION_ERROR";
      compileOutput = judgeResult.compile_output ?? null;
      break;
    }

    if (statusId === 5) {
      verdict = "TIME_LIMIT_EXCEEDED";
      break;
    }

    if ([7, 8, 9, 10, 11].includes(statusId ?? 0)) {
      verdict = "RUNTIME_ERROR";
      break;
    }

    if (statusId !== 3 && statusId !== 4) {
      verdict = "JUDGE_ERROR";
      compileOutput = judgeResult.compile_output ?? null;
      break;
    }

    const actualOutput = normalizeJudge0Output(judgeResult.stdout);
    const expectedOutput = normalizeJudge0Output(testCase.output);
    if (actualOutput !== expectedOutput) {
      verdict = "WRONG_ANSWER";
      break;
    }

    passedCases += 1;
    verdict = "ACCEPTED";
  }

  if (passedCases === testCases.length) {
    verdict = "ACCEPTED";
  }

  return {
    verdict,
    score: verdict === "ACCEPTED" ? 1 : 0,
    stdout,
    stderr,
    compileOutput,
  };
}

function prepareSource(language: string, sourceCode: string) {
  try {
    switch (language) {
      case "Java":
        return prepareJavaSubmission(sourceCode);
      case "Python":
        return preparePythonSubmission(sourceCode);
      case "JavaScript":
        return prepareJavaScriptSubmission(sourceCode);
      default:
        throw new SubmissionInputError(
          "unsupported-language",
          "Unsupported submission language.",
        );
    }
  } catch (error) {
    if (error instanceof SubmissionInputError) {
      throw error;
    }

    throw new SubmissionInputError("source-preparation", "Could not prepare submission source.");
  }
}

function validateTestCases(value: unknown): SubmissionTestCase[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new SubmissionInputError(
      "invalid-test-cases",
      "Submission must contain at least one test case.",
    );
  }

  return value.map((testCase) => {
    if (
      !isRecord(testCase) ||
      typeof testCase.input !== "string" ||
      typeof testCase.output !== "string"
    ) {
      throw new SubmissionInputError(
        "invalid-test-cases",
        "Each test case must have non-empty string input and output.",
      );
    }

    return { input: testCase.input, output: testCase.output };
  });
}

async function executeTestCase(request: {
  language_id: number;
  source_code: string;
  stdin: string;
}): Promise<Judge0SubmissionResult> {
  let result: Judge0SubmissionResult;
  try {
    result = await executeJudge0Submission(request);
  } catch (error) {
    if (error instanceof Judge0ConfigurationError) {
      throw new SubmissionInfrastructureError("judge0-configuration");
    }
    if (error instanceof Judge0RequestError) {
      throw new SubmissionInfrastructureError("judge0-request", error.kind);
    }
    if (error instanceof Judge0TimeoutError) {
      throw new SubmissionInfrastructureError("judge0-timeout");
    }
    throw new SubmissionInfrastructureError("execution-failure");
  }

  if (!isJudge0Result(result)) {
    throw new SubmissionInfrastructureError("unexpected-judge0-response");
  }

  return result;
}

function isJudge0Result(value: unknown): value is Judge0SubmissionResult {
  if (!isRecord(value) || !isRecord(value.status) || !Number.isInteger(value.status.id)) {
    return false;
  }

  if (value.status.id === 1 || value.status.id === 2) {
    return false;
  }

  return (
    isOptionalString(value.stdout) &&
    isOptionalString(value.stderr) &&
    isOptionalString(value.compile_output)
  );
}

function isOptionalString(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
