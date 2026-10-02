type PythonCallable = {
  className: string | null;
  methodName: string;
  parameterCount: number;
};

export function preparePythonSubmission(sourceCode: string) {
  if (hasPythonRunner(sourceCode)) {
    return sourceCode;
  }

  const callable = findPythonCallable(sourceCode);
  const target = callable.className
    ? `${callable.className}().${callable.methodName}`
    : callable.methodName;
  const args = callable.parameterCount === 0
    ? "[]"
    : callable.parameterCount === 1
      ? "[_parse_input(raw_input)]"
      : "[_parse_input(line) for line in raw_input.splitlines()]";

  return `${sourceCode.trim()}

if __name__ == "__main__":
    import json
    import sys

    raw_input = sys.stdin.read()
    if raw_input.endswith("\\r\\n"):
        raw_input = raw_input[:-2]
    elif raw_input.endswith("\\n"):
        raw_input = raw_input[:-1]

    def _parse_input(value):
        try:
            return json.loads(value)
        except (json.JSONDecodeError, TypeError):
            return value

    result = ${target}(*${args})
    if isinstance(result, bool):
        print(str(result).lower())
    elif isinstance(result, (list, dict)):
        print(json.dumps(result, separators=(",", ":")))
    else:
        print(result)
`;
}

function hasPythonRunner(sourceCode: string) {
  const hasInput = /\b(?:sys\s*\.\s*stdin|input\s*\()/.test(sourceCode);
  return /if\s+__name__\s*==\s*["']__main__["']/.test(sourceCode) ||
    (hasInput && /\bprint\s*\(/.test(sourceCode));
}

function findPythonCallable(sourceCode: string): PythonCallable {
  const classMatch = sourceCode.match(/^\s*class\s+([A-Za-z_]\w*)\b[^:]*:/m);
  if (classMatch && classMatch.index !== undefined) {
    const classBody = sourceCode.slice(classMatch.index + classMatch[0].length);
    const classIndent = classMatch[0].match(/^\s*/)?.[0].length ?? 0;
    const methods = [...classBody.matchAll(/^(\s+)def\s+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*(?:->\s*[^:]+)?\s*:/gm)];
    const method = methods.find((match) => {
      const indent = match[1].replace(/\t/g, "    ").length;
      return indent > classIndent && match[2] !== "__init__" && !match[2].startsWith("__");
    });

    if (method) {
      const parameters = parameterNames(method[3]).filter((name) => name !== "self" && name !== "cls");
      return { className: classMatch[1], methodName: method[2], parameterCount: parameters.length };
    }
  }

  const functionMatch = sourceCode.match(/^\s*(?:async\s+)?def\s+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*(?:->\s*[^:]+)?\s*:/m);
  if (!functionMatch) {
    throw new Error("Could not find a Python function or class method to run.");
  }

  return {
    className: null,
    methodName: functionMatch[1],
    parameterCount: parameterNames(functionMatch[2]).length,
  };
}

function parameterNames(parameters: string) {
  return parameters.trim()
    ? parameters.split(",").map((parameter) => parameter.trim().split(/[=:]/, 1)[0].replace(/^\*+/, "").trim())
    : [];
}