"use client";

import dynamic from "next/dynamic";
import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import { useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import type { editor as MonacoEditorNS } from "monaco-editor";

type RoomProps = { roomId: string; token: string };

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const toUint8Array = (data: unknown): Uint8Array =>
    data instanceof Uint8Array
        ? data
        : data instanceof ArrayBuffer
          ? new Uint8Array(data)
          : ArrayBuffer.isView(data)
            ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
            : new Uint8Array();

export default function MonacoCollabTextArea({ roomId, token }: RoomProps) {
    const serverUrl = process.env.NEXT_PUBLIC_COLLAB_WS_URL!;
    const socketRef = useRef<Socket | null>(null);

    // Monaco refs
    const editorRef = useRef<MonacoEditorNS.IStandaloneCodeEditor | null>(null);
    const monacoNSRef = useRef<typeof import("monaco-editor") | null>(null);
    const bindingMadeRef = useRef(false); // guard against double-mount in dev

    // Yjs
    const yDoc = useMemo(() => new Y.Doc(), []);
    const yText = useMemo(() => yDoc.getText("content"), [yDoc]);
    const awareness = useMemo(() => new Awareness(yDoc), [yDoc]);

    const [status, setStatus] = useState<
        "disconnected" | "connecting" | "connected"
    >("disconnected");
    const [language, setLanguage] = useState("javascript");

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

        const onLocalUpdate = (update: Uint8Array) =>
            socket.emit("collab:update", update);
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

        // ⬇️ Dynamic import to avoid "window is not defined" at module eval
        const { MonacoBinding } = await import("y-monaco");
        new MonacoBinding(yText, model, new Set([editor]), awareness);

        // set initial language
        monacoNS.editor.setModelLanguage(model, language);
    };

    // Change language
    useEffect(() => {
        const editor = editorRef.current;
        const monacoNS = monacoNSRef.current;
        if (!editor || !monacoNS) return;
        const model = editor.getModel();
        if (model) monacoNS.editor.setModelLanguage(model, language);
    }, [language]);

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">
                    Session: <code>{roomId}</code> • Status: {status}
                </div>
                <div className="flex items-center gap-2">
                    <label htmlFor="lang" className="text-sm text-gray-500">
                        Language
                    </label>
                    <select
                        id="lang"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="border rounded px-2 py-1 text-sm"
                    >
                        {[
                            "javascript",
                            "typescript",
                            "python",
                            "java",
                            "cpp",
                            "csharp",
                        ].map((l) => (
                            <option key={l} value={l}>
                                {l}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <Editor
                height="500px"
                theme="vs-dark"
                defaultLanguage="javascript"
                options={{ automaticLayout: true, fontSize: 14 }}
                onMount={handleMount}
            />
        </div>
    );
}
