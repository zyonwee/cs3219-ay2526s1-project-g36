"use client";

import { useEffect, useRef, useState } from "react";
import { Editor } from "@monaco-editor/react";
import { useCollaborativeDoc } from "../../../../hooks/useCollaborativeDoc";
import { useTheme } from "../../../../context/ThemeContext";
import { CODE_SNIPPETS } from "./constants"; 

type Props = {
  roomId: string;
  token: string;
};

export default function CodeEditorPanel({ roomId, token }: Props) {
  const { theme } = useTheme();
  const { content, updateContent, status } = useCollaborativeDoc(roomId, token, "code");
  const editorRef = useRef<any>(null);

  // Language selection
  const [language, setLanguage] = useState("python");

  /** 🧩 Mount Monaco Editor */
  const handleEditorMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    (window as any).monaco = monaco;

    // 🎨 Define Monaco theme dynamically
    monaco.editor.defineTheme("customTheme", {
      base: theme.id === "dark" ? "vs-dark" : "vs",
      inherit: true,
      rules: [
        {
          token: "",
          foreground: theme.text.replace("#", ""),
          background: theme.surface.replace("#", ""),
        },
      ],
      colors: {
        "editor.background": theme.surface,
        "editor.foreground": theme.text,
        "editorCursor.foreground": theme.accent,
        "editorLineNumber.foreground": theme.textSecondary,
        "editorLineNumber.activeForeground": theme.accent,
        "editor.selectionBackground": "#264F78",
        "editor.inactiveSelectionBackground": "#3A3D41",
        "editorIndentGuide.background": theme.border,
        "editorIndentGuide.activeBackground": theme.accent,
        "editorLineHighlightBackground":
          theme.id === "dark" ? "#1E1E1E30" : "#EAEAEA80",
      },
    });

    monaco.editor.setTheme("customTheme");
  };

  /** Update theme dynamically */
  useEffect(() => {
    if ((window as any).monaco) {
      (window as any).monaco.editor.setTheme("customTheme");
    }
  }, [theme]);

  /** Sync backend → Monaco */
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || content === undefined) return;
    const model = editor.getModel();
    if (model && model.getValue() !== content) {
      model.setValue(content);
    }
  }, [content]);

  /** Sync Monaco → backend */
  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) updateContent(value);
  };

  /** Update code snippet when language changes */
  useEffect(() => {
    const snippet = CODE_SNIPPETS[language as keyof typeof CODE_SNIPPETS];
    if (snippet) {
      updateContent(snippet);
    }
  }, [language]); // only runs when language changes

  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        backgroundColor: theme.surface,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "6px 12px",
          backgroundColor: theme.background,
          borderBottom: `1px solid ${theme.border}`,
        }}
      >
        {/* Language Selector */}
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          style={{
            backgroundColor: theme.input.background,
            color: theme.input.text,
            border: `1px solid ${theme.input.border}`,
            padding: "4px 8px",
            borderRadius: "6px",
            fontSize: "0.9rem",
          }}
        >
          <option value="python">Python</option>
          <option value="javascript">JavaScript</option>
          <option value="cpp">C++</option>
          <option value="java">Java</option>
          <option value="c">C</option>
        </select>

        {/* 🔌 Connection Status */}
        <span
          style={{
            fontSize: "0.85rem",
            color: theme.textSecondary,
          }}
        >
          {status === "connected"
            ? "🟢 Connected"
            : status === "connecting"
            ? "🟡 Connecting..."
            : "🔴 Disconnected"}
        </span>
      </div>

      {/* Monaco Editor */}
      <div style={{ flexGrow: 1 }}>
        <Editor
          height="100%"
          language={language}
          value={content}
          onChange={handleEditorChange}
          onMount={handleEditorMount}
          options={{
            theme: "customTheme",
            automaticLayout: true,
            minimap: { enabled: false },
            fontSize: 14,
            padding: { top: 10 },
            scrollBeyondLastLine: false,
            lineNumbers: "on",
            smoothScrolling: true,
          }}
        />
      </div>
    </div>
  );
}
