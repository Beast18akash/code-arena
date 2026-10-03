"use client";
import dynamic from "next/dynamic";
import type { EditorProps } from "@monaco-editor/react";
import { CodeEditorPlaceholder } from "@/components/ui/codearena-loading";

const LANGUAGE_MAP = {
  javascript: "javascript",
  python: "python",
  java: "java",
};

type CodeEditorProps = {
  value: string;
  onChange: (value?: string) => void;
  language?: keyof typeof LANGUAGE_MAP;
  height?: string;
};

export function CodeEditor({ value, onChange, language = "javascript", height = "300px" }: CodeEditorProps) {
  const MonacoEditor = dynamic<EditorProps>(
    () => import("@monaco-editor/react").then((mod) => mod.Editor),
    {
      ssr: false,
      loading: () => <CodeEditorPlaceholder height={height} />,
    }
  );

  return (
    <div className="border rounded-md bg-slate-950 text-slate-50">
      <div className="px-4 py-2 bg-slate-800 border-b text-sm font-mono">
        {language}
      </div>

      <div className="w-full" style={{ height }}>
        <MonacoEditor
          height={height}
          language={LANGUAGE_MAP[language]}
          theme="vs-dark"
          value={value}
          onChange={onChange}
          options={{
            minimap: { enabled: false },
            fontSize: 18,
            lineNumbers: "on",
            readOnly: false,
            wordWrap: "on",
            formatOnPaste: true,
            formatOnType: true,
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
}