import {
  executeJudge0Submission,
  getJudge0LanguageConfig,
  normalizeJudge0Output,
} from "@/lib/judge0";

type TestCase = { input: string; output: string };

type ValidationFailure = {
  language: string;
  testCase: TestCase | null;
  actualOutput: string | null;
  error: string;
  details?: unknown;
};

export async function validateReferenceSolutions(
  testCases: TestCase[],
  referenceSolutions: Record<string, string>,
): Promise<ValidationFailure | null> {
  for (const [language, solutionCode] of Object.entries(referenceSolutions)) {
    const languageConfig = getJudge0LanguageConfig(language);
    if (!languageConfig) {
      return {
        language,
        testCase: null,
        actualOutput: null,
        error: `Unsupported language: ${language}`,
      };
    }

    const code = solutionCode.trim();
    if (!code || /Add your reference solution here|Write your code here/i.test(code)) {
      continue;
    }

    for (const testCase of testCases) {
      const result = await executeJudge0Submission({
        language_id: languageConfig.judge0LanguageId,
        source_code: code,
        stdin: testCase.input,
      });
      const statusId = result.status?.id;

      if (statusId !== 3 && statusId !== 4) {
        return {
          language,
          testCase,
          actualOutput: result.stdout ?? null,
          error:
            result.compile_output ||
            result.stderr ||
            result.status?.description ||
            "Judge0 could not execute the reference solution",
          details: result,
        };
      }

      if (
        normalizeJudge0Output(result.stdout) !==
        normalizeJudge0Output(testCase.output)
      ) {
        return {
          language,
          testCase,
          actualOutput: result.stdout ?? null,
          error: "Reference solution output did not match the expected output",
          details: result,
        };
      }
    }
  }

  return null;
}