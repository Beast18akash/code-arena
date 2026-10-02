type JavaScriptCallable = {
  className: string | null;
  methodName: string;
  parameterCount: number;
};

export function prepareJavaScriptSubmission(sourceCode: string) {
  if (hasJavaScriptRunner(sourceCode)) {
    return sourceCode;
  }

  const callable = findJavaScriptCallable(sourceCode);
  const target = callable.className
    ? `new ${callable.className}().${callable.methodName}`
    : callable.methodName;
  const args = callable.parameterCount === 0
    ? "[]"
    : callable.parameterCount === 1
      ? "[parseInput(rawInput)]"
      : "rawInput.split(/\\r?\\n/).map(parseInput)";

  return `${sourceCode.trim()}

const fs = require("fs");
const rawInput = fs.readFileSync(0, "utf8").replace(/\\r?\\n$/, "");
const parseInput = (value) => {
  try { return JSON.parse(value); } catch { return value; }
};
const result = ${target}(...${args});
console.log(Array.isArray(result) || (result !== null && typeof result === "object")
  ? JSON.stringify(result)
  : String(result));
`;
}

function hasJavaScriptRunner(sourceCode: string) {
  const readsStdin = /\bprocess\s*\.\s*stdin\b|readFileSync\s*\(\s*(?:0|process\s*\.\s*stdin\s*\.\s*fd)/.test(sourceCode);
  return readsStdin && /\bconsole\s*\.\s*log\s*\(/.test(sourceCode);
}

function findJavaScriptCallable(sourceCode: string): JavaScriptCallable {
  const classMatch = sourceCode.match(/\bclass\s+([A-Za-z_$][\w$]*)\s*\{/);
  if (classMatch && classMatch.index !== undefined) {
    const classBody = sourceCode.slice(classMatch.index + classMatch[0].length);
    const method = classBody.match(/\b(?:(?:static|async)\s+)*([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{/);
    if (method && method[1] !== "constructor") {
      return {
        className: classMatch[1],
        methodName: method[1],
        parameterCount: parameterNames(method[2]).length,
      };
    }
  }

  const functionMatch = sourceCode.match(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{/);
  if (functionMatch) {
    return {
      className: null,
      methodName: functionMatch[1],
      parameterCount: parameterNames(functionMatch[2]).length,
    };
  }

  const assignedFunction = sourceCode.match(
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?function(?:\s+[A-Za-z_$][\w$]*)?\s*\(([^)]*)\)\s*\{/,
  );
  if (assignedFunction) {
    return {
      className: null,
      methodName: assignedFunction[1],
      parameterCount: parameterNames(assignedFunction[2]).length,
    };
  }

  const arrowFunction = sourceCode.match(
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?(?:\(([^)]*)\)|([A-Za-z_$][\w$]*))\s*=>/,
  );
  if (arrowFunction) {
    return {
      className: null,
      methodName: arrowFunction[1],
      parameterCount: parameterNames(arrowFunction[2] ?? arrowFunction[3]).length,
    };
  }

  throw new Error("Could not find a JavaScript function or class method to run.");
}

function parameterNames(parameters: string) {
  return parameters.trim()
    ? parameters.split(",").map((parameter) => parameter.trim().replace(/=.*$/, "").replace(/^\.\.\./, ""))
    : [];
}