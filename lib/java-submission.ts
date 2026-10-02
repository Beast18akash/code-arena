const SCALAR_INPUT_TYPES = new Set([
  "String",
  "int",
  "Integer",
  "long",
  "Long",
  "double",
  "Double",
  "float",
  "Float",
  "boolean",
  "Boolean",
  "char",
  "Character",
]);

const ARRAY_INPUT_TYPES = new Set(["int[]", "long[]", "double[]", "String[]"]);

export function prepareJavaSubmission(sourceCode: string) {
  if (/\bstatic\s+void\s+main\s*\(/.test(sourceCode)) {
    return sourceCode;
  }

  const imports = [...sourceCode.matchAll(/^\s*import\s+[^;]+;\s*$/gm)].map((match) =>
    match[0].trim(),
  );
  let userCode = sourceCode.replace(/^\s*import\s+[^;]+;\s*$/gm, "").trim();
  const classMatch = userCode.match(/\b(?:public\s+)?class\s+([A-Za-z_$][\w$]*)\b/);
  let className = classMatch?.[1] ?? "Solution";

  if (classMatch) {
    userCode = userCode.replace(/\bpublic\s+(?=class\s+)/, "");
    if (className === "Main") {
      userCode = userCode.replace(/\bclass\s+Main\b/, "class CodeArenaSolution");
      className = "CodeArenaSolution";
    }
  } else {
    userCode = `class ${className} {\n${userCode}\n}`;
  }

  const methodMatch = userCode.match(
    /\b((?:(?:public|protected|private|static|final|synchronized|abstract|native|strictfp)\s+)*)([\w$.<>?]+(?:\s*\[\])*)\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{/m,
  );

  if (!methodMatch) {
    throw new Error("Could not find a Java method to run. Add a method to your solution class.");
  }

  const [, modifiers, rawReturnType, methodName, rawParameters] = methodMatch;
  const returnType = rawReturnType.replace(/\s+/g, "");
  const parameters = rawParameters.trim()
    ? rawParameters.split(",").map((parameter) => {
        const match = parameter.trim().match(/^(?:final\s+)?(.+?)\s+([A-Za-z_$][\w$]*)$/);
        if (!match) {
          throw new Error("Could not read the Java method parameters. Use named, typed parameters.");
        }

        const type = match[1].replace(/\s+/g, "");
        if (!SCALAR_INPUT_TYPES.has(type) && !ARRAY_INPUT_TYPES.has(type)) {
          throw new Error(`Automatic Java runner does not support the parameter type ${type} yet.`);
        }

        return { type, name: match[2] };
      })
    : [];

  const argumentLines = parameters.map(({ type, name }, index) => {
    const rawValue = parameters.length === 1 ? "rawInput" : `rawArguments[${index}]`;
    return `    ${type} ${name} = ${parseJavaInput(type, rawValue)};`;
  });
  const argumentsList = parameters.map(({ name }) => name).join(", ");
  const invocation = `${modifiers.includes("static") ? className : `new ${className}()`}.${methodName}(${argumentsList})`;
  const resultLines = returnType === "void"
    ? [`    ${invocation};`]
    : [
        `    ${returnType} result = ${invocation};`,
        `    System.out.println(${formatJavaOutput(returnType)});`,
      ];
  const helpers = [...new Set(parameters.map(({ type }) => type))]
    .filter((type) => ARRAY_INPUT_TYPES.has(type))
    .map(arrayParser)
    .join("\n");

  return `${imports.join("\n")}${imports.length ? "\n\n" : ""}${userCode}

class Main {
  public static void main(String[] args) throws Exception {
    String rawInput = new String(System.in.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
    if (rawInput.endsWith("\\r\\n")) rawInput = rawInput.substring(0, rawInput.length() - 2);
    else if (rawInput.endsWith("\\n")) rawInput = rawInput.substring(0, rawInput.length() - 1);
${parameters.length > 1 ? '    String[] rawArguments = rawInput.split(java.util.regex.Pattern.quote(System.lineSeparator()), -1);\n' : ""}${argumentLines.join("\n")}
${resultLines.join("\n")}
  }
${helpers ? `${helpers}\n  private static String arrayContents(String raw) {\n    String value = raw.trim();\n    if (value.startsWith("[") && value.endsWith("]")) {\n      return value.substring(1, value.length() - 1).trim();\n    }\n    return value;\n  }\n` : ""}}
`;
}

function parseJavaInput(type: string, rawValue: string) {
  switch (type) {
    case "String":
      return rawValue;
    case "int":
    case "Integer":
      return `Integer.parseInt(${rawValue}.trim())`;
    case "long":
    case "Long":
      return `Long.parseLong(${rawValue}.trim())`;
    case "double":
    case "Double":
      return `Double.parseDouble(${rawValue}.trim())`;
    case "float":
    case "Float":
      return `Float.parseFloat(${rawValue}.trim())`;
    case "boolean":
    case "Boolean":
      return `Boolean.parseBoolean(${rawValue}.trim())`;
    case "char":
    case "Character":
      return `${rawValue}.trim().charAt(0)`;
    case "int[]":
      return `parseIntArray(${rawValue})`;
    case "long[]":
      return `parseLongArray(${rawValue})`;
    case "double[]":
      return `parseDoubleArray(${rawValue})`;
    case "String[]":
      return `parseStringArray(${rawValue})`;
    default:
      throw new Error(`Automatic Java runner does not support the parameter type ${type} yet.`);
  }
}

function formatJavaOutput(returnType: string) {
  if (returnType === "int[]") return "java.util.Arrays.toString(result)";
  if (returnType === "long[]") return "java.util.Arrays.toString(result)";
  if (returnType === "double[]") return "java.util.Arrays.toString(result)";
  if (returnType === "String[]") return "java.util.Arrays.toString(result)";
  return "result";
}

function arrayParser(type: string) {
  const name = type.slice(0, -2);
  const method = {
    "int[]": "parseIntArray",
    "long[]": "parseLongArray",
    "double[]": "parseDoubleArray",
    "String[]": "parseStringArray",
  }[type];
  const elementParser = {
    int: "Integer::parseInt",
    long: "Long::parseLong",
    double: "Double::parseDouble",
  }[name as "int" | "long" | "double"];

  if (type === "String[]") {
    return `  private static String[] ${method}(String raw) {
    String value = arrayContents(raw);
    if (value.isEmpty()) return new String[0];
    return java.util.Arrays.stream(value.split(",")).map(String::trim)
      .map(item -> item.replaceAll("^\\\"|\\\"$", "")).toArray(String[]::new);
  }`;
  }

  return `  private static ${type} ${method}(String raw) {
    String value = arrayContents(raw);
    if (value.isEmpty()) return new ${name}[0];
    return java.util.Arrays.stream(value.split(",")).map(String::trim)
      .mapTo${name[0].toUpperCase()}${name.slice(1)}(${elementParser}).toArray();
  }`;
}