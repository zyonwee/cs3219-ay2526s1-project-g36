"use client";

import { useRef, useEffect } from "react";
import { Editor } from "@monaco-editor/react";
import { useCollaborativeDoc } from "../../../../hooks/useCollaborativeDoc";
import { useTheme } from "../../../../context/ThemeContext";

export default function CommentPanel({
  roomId,
  token,
}: {
  roomId: string;
  token: string;
}) {
  const { theme } = useTheme();
  const { content, updateContent } = useCollaborativeDoc(roomId, token, "comments");
  const editorRef = useRef<any>(null);

  // Prepend '//' to each new line automatically
  const handleChange = (val: string | undefined) => {
    if (!val) {
      updateContent("");
      return;
    }

    // Ensure each line starts with "//"
    const formatted = val
      .split("\n")
      .map((line) => (line.trim().startsWith("//") ? line : `// ${line}`))
      .join("\n");

    updateContent(formatted);
  };

  const handleEditorMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    (window as any).monaco = monaco;

    // Define a light-weight custom theme matching your UI
    monaco.editor.defineTheme("commentTheme", {
      base: "vs-dark",
      inherit: true,
      rules: [{ token: "", foreground: theme.text.replace("#", "") }],
      colors: {
        "editor.background": theme.surface,
        "editor.foreground": theme.text,
        "editorCursor.foreground": theme.accent,
      },
    });

    monaco.editor.setTheme("commentTheme");
  };

  useEffect(() => {
    if ((window as any).monaco) {
      (window as any).monaco.editor.setTheme("commentTheme");
    }
  }, [theme]);

  return (
    <div
      className="rounded-lg p-2"
      style={{
        backgroundColor: theme.surface,
        border: `1px solid ${theme.border}`,
        height: "100%",
      }}
    >
      <h2 className="font-semibold mb-2" style={{ color: theme.text }}>
        Comments
      </h2>

      <Editor
        height="100%"
        defaultLanguage="javascript" // so "//" syntax is valid
        value={content}
        onChange={handleChange}
        onMount={handleEditorMount}
        options={{
          minimap: { enabled: false },
          lineNumbers: "on",
          automaticLayout: true,
          wordWrap: "on",
          fontSize: 14,
          padding: { top: 8 },
          scrollbar: { vertical: "hidden" },
        }}
      />
    </div>
  );
}
