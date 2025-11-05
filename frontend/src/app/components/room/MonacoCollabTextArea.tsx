"use client";

import dynamic from "next/dynamic";
import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import { useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import type { editor as MonacoEditorNS } from "monaco-editor";
import { useTheme } from "../../../../context/ThemeContext";
import { clear } from "console";

type RoomProps = { roomId: string; token: string };

type Change = {
    type: "insert" | "delete";
    line: number;
    col: number;
    snippet: string;
};

type EditHistoryRecord = {
    userId: string;
    timestamp: number;
    changes: Change[];
};

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const toUint8Array = (data: unknown): Uint8Array =>
    data instanceof Uint8Array
        ? data
        : data instanceof ArrayBuffer
          ? new Uint8Array(data)
          : ArrayBuffer.isView(data)
            ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
            : new Uint8Array();

const formatRelativeTime = (timestamp: number): string => {
    const diff = Date.now() - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleString();
};

export default function MonacoCollabTextArea({ roomId, token }: RoomProps) {
    const { theme } = useTheme();
    const serverUrl = process.env.NEXT_PUBLIC_COLLAB_WS_URL!;
    const socketRef = useRef<Socket | null>(null);

    // Monaco refs
    const editorRef = useRef<MonacoEditorNS.IStandaloneCodeEditor | null>(null);
    const monacoNSRef = useRef<typeof import("monaco-editor") | null>(null);
    const bindingMadeRef = useRef(false); // guard against double-mount in dev
    const bindingRef = useRef<any | null>(null);

    // Yjs
    const yDoc = useMemo(() => new Y.Doc(), []);
    const yText = useMemo(() => yDoc.getText("content"), [yDoc]);
    const awareness = useMemo(() => new Awareness(yDoc), [yDoc]);

    const [status, setStatus] = useState<
        "disconnected" | "connecting" | "connected"
    >("disconnected");
    const [language, setLanguage] = useState("python");
    const [history, setHistory] = useState<EditHistoryRecord[]>([]);

    // Socket.IO wiring
    useEffect(() => {
        setStatus("connecting");
        const socket = io(serverUrl, {
            transports: ["websocket"],
            auth: { token, sessionId: roomId },
            forceNew: true,
        });
        socketRef.current = socket;

        socket.on("connect", () => {
            setStatus("connected");
            socket.emit("collab:history:get", { limit: 50 });
        });
        socket.on("disconnect", () => setStatus("disconnected"));
        socket.on("collab:state", (data: unknown) =>
            Y.applyUpdate(yDoc, toUint8Array(data))
        );
        socket.on("collab:update", (data: unknown) =>
            Y.applyUpdate(yDoc, toUint8Array(data))
        );
        socket.on("collab:language", ({ language: lang }) => {
            setLanguage((prev) => (prev === lang ? prev : lang));

            const editor = editorRef.current;
            const monacoNS = monacoNSRef.current;
            if (!editor || !monacoNS) return;

            const model = editor.getModel();
            if (model) monacoNS.editor.setModelLanguage(model, lang);
        });

        socket.on("collab:history", (history: EditHistoryRecord[]) => {
            setHistory(history);
        });

        socket.on("collab:history:new", (record: EditHistoryRecord) => {
            setHistory((prevHistory) => [record, ...prevHistory].slice(0, 50));
        });

        const onLocalUpdate = (update: Uint8Array, origin: unknown) => {
            if (origin !== bindingRef.current) {
                return;
            }
            socketRef.current?.emit("collab:update", update);
        };

        yDoc.on("update", onLocalUpdate);

        return () => {
            yDoc.off("update", onLocalUpdate);
            socket.disconnect();
            socketRef.current = null;
            yDoc.destroy();
        };
    }, [roomId, serverUrl, token, yDoc]);

    // Monaco mount
    const handleMount = async (
        editor: MonacoEditorNS.IStandaloneCodeEditor,
        monacoNS: typeof import("monaco-editor")
    ) => {
        editorRef.current = editor;
        monacoNSRef.current = monacoNS;

        // Avoid duplicate binding in dev StrictMode (Next.js mounts twice)
        if (bindingMadeRef.current) return;
        bindingMadeRef.current = true;

        const model = editor.getModel();
        if (!model) return;

        // Define Monaco theme dynamically
        monacoNS.editor.defineTheme("customTheme", {
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
                editorLineHighlightBackground:
                    theme.id === "dark" ? "#1E1E1E30" : "#EAEAEA80",
            },
        });

        monacoNS.editor.setTheme("customTheme");

        // Dynamic import to avoid "window is not defined" at module eval
        const { MonacoBinding } = await import("y-monaco");
        const binding = new MonacoBinding(
            yText,
            model,
            new Set([editor]),
            awareness
        );
        bindingRef.current = binding;

        // set initial language
        monacoNS.editor.setModelLanguage(model, language);
    };

    // Update theme dynamically
    useEffect(() => {
        const monacoNS = monacoNSRef.current;
        if (monacoNS) {
            monacoNS.editor.setTheme("customTheme");
        }
    }, [theme]);

    // Change language
    useEffect(() => {
        const editor = editorRef.current;
        const monacoNS = monacoNSRef.current;
        if (!editor || !monacoNS) return;
        const model = editor.getModel();
        if (model) monacoNS.editor.setModelLanguage(model, language);
    }, [language]);

    return (
        <div
            style={{
                height: "100%",
                width: "100%",
                backgroundColor: theme.surface,
                display: "flex",
                flexDirection: "row",
                gap: "12px",
            }}
        >
            {/* Left Side: Editor */}
            <div
                style={{
                    flex: "1",
                    display: "flex",
                    flexDirection: "column",
                    minWidth: 0,
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
                        onChange={(e) => {
                            const lang = e.target.value;
                            // 1) optimistic UI update (prevents flicker/revert)
                            setLanguage(lang);
                            // 2) tell the server; its broadcast will keep everyone in sync
                            socketRef.current?.emit("collab:language:set", {
                                language: lang,
                            });
                        }}
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
                        theme="customTheme"
                        options={{
                            automaticLayout: true,
                            minimap: { enabled: false },
                            fontSize: 14,
                            padding: { top: 10 },
                            scrollBeyondLastLine: false,
                            lineNumbers: "on",
                            smoothScrolling: true,
                        }}
                        onMount={handleMount}
                    />
                </div>
            </div>

            {/* Right Side: Edit History */}
            <div
                style={{
                    width: "280px",
                    display: "flex",
                    flexDirection: "column",
                    backgroundColor: theme.card.background,
                    border: `1px solid ${theme.border}`,
                    borderRadius: "8px",
                    padding: "12px",
                    overflow: "hidden",
                }}
            >
                <h2
                    style={{
                        fontWeight: 600,
                        marginBottom: "8px",
                        color: theme.text,
                        fontSize: "0.95rem",
                        flexShrink: 0,
                    }}
                >
                    Edit History
                </h2>
                <div
                    style={{
                        flex: 1,
                        overflowY: "auto",
                        minHeight: 0,
                    }}
                >
                    {history.length === 0 ? (
                        <p
                            style={{
                                fontSize: "0.85rem",
                                color: theme.textSecondary,
                            }}
                        >
                            No edits yet.
                        </p>
                    ) : (
                        <ul
                            style={{ listStyle: "none", padding: 0, margin: 0 }}
                        >
                            {history.map((record, i) => (
                                <li
                                    key={i}
                                    style={{
                                        borderBottom: `1px solid ${theme.border}`,
                                        paddingBottom: "8px",
                                        marginBottom: "8px",
                                        fontSize: "0.85rem",
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: "0.75rem",
                                            color: theme.textSecondary,
                                            marginBottom: "4px",
                                        }}
                                    >
                                        <strong style={{ color: theme.text }}>
                                            {record.userId}
                                        </strong>{" "}
                                        • {formatRelativeTime(record.timestamp)}
                                    </div>
                                    {record.changes.map(
                                        (change: any, j: number) => {
                                            const isInsert =
                                                change.type === "insert";
                                            const changeColor = isInsert
                                                ? "#22c55e"
                                                : "#ef4444";
                                            const bgColor = isInsert
                                                ? "#22c55e20"
                                                : "#ef444420";

                                            return (
                                                <div
                                                    key={j}
                                                    style={{
                                                        marginLeft: "8px",
                                                        fontSize: "0.8rem",
                                                        color: theme.text,
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            color: changeColor,
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        {isInsert
                                                            ? "Added"
                                                            : "Removed"}
                                                    </span>{" "}
                                                    Line {change.line}:Column{" "}
                                                    {change.col} →{" "}
                                                    <code
                                                        style={{
                                                            backgroundColor:
                                                                bgColor,
                                                            color: changeColor,
                                                            padding: "2px 4px",
                                                            borderRadius: "3px",
                                                            fontSize: "0.75rem",
                                                            fontFamily:
                                                                "monospace",
                                                            border: `1px solid ${changeColor}40`,
                                                        }}
                                                    >
                                                        {change.snippet}
                                                    </code>
                                                </div>
                                            );
                                        }
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
