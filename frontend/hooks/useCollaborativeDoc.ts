"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import * as Y from "yjs";

const toUint8Array = (data: unknown): Uint8Array => {
  return data instanceof Uint8Array
    ? data
    : data instanceof ArrayBuffer
    ? new Uint8Array(data)
    : ArrayBuffer.isView(data)
    ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
    : new Uint8Array();
};

export function useCollaborativeDoc(roomId: string, token: string, docName: string = "default") {
  const serverUrl = process.env.NEXT_PUBLIC_COLLAB_WS_URL!;
  const [status, setStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [content, setContent] = useState("");
  
  const yDoc = useMemo(() => new Y.Doc(), []);
  const yText = useMemo(() => yDoc.getText(docName), [yDoc, docName]);
  const socketRef = useRef<Socket | null>(null);
  const isApplyingRemoteUpdate = useRef(false);

  useEffect(() => {
    const onLocalUpdate = () => setContent(yText.toString());

    yText.observe(onLocalUpdate);

    return () => yText.unobserve(onLocalUpdate);
  }, [yText]);

  useEffect(() => {
    setStatus("connecting");

    const socket = io(serverUrl, {
      transports: ["websocket"],
      auth: { token, sessionId: roomId },
      forceNew: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => setStatus("connected"));
    socket.on("disconnect", () => setStatus("disconnected"));

    socket.on("collab:state", (data) => {
      const update = toUint8Array(data);
      isApplyingRemoteUpdate.current = true;
      try {
        Y.applyUpdate(yDoc, update);
      } finally {
        isApplyingRemoteUpdate.current = false;
      }
    });

    socket.on("collab:update", (data) => {
      const update = toUint8Array(data);
      isApplyingRemoteUpdate.current = true;
      try {
        Y.applyUpdate(yDoc, update);
      } finally {
        isApplyingRemoteUpdate.current = false;
      }
    });

    yDoc.on("update", (update: Uint8Array) => {
      if (!isApplyingRemoteUpdate.current) {
        socket.emit("collab:update", update);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      yDoc.destroy();
    };
  }, [roomId, serverUrl, token, yDoc]);

  const updateContent = (text: string) => {
    yDoc.transact(() => {
      const current = yText.toString();
      yText.delete(0, current.length);
      yText.insert(0, text);
    });
  };

  return { content, updateContent, status };
}
