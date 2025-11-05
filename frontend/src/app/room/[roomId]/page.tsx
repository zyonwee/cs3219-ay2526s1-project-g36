"use client";

import { useState, useEffect, useRef } from "react";
import { getSession, logout } from "../../../../lib/auth";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "../../../../lib/useRequireAuth";
import ProblemTitle from "../../components/room/ProblemTitle";
import CodeEditorPanel from "../../components/room/CodeEditorPanel";
import CommentPanel from "../../components/room/CommentPanel";
import MonacoCollabTextArea from "../../components/room/MonacoCollabTextArea";
import LeaveButton from "../../components/room/LeaveButton";
import { Session } from "@supabase/supabase-js";

type Props = {
    params: Promise<{ roomId: string }>;
};

export default function RoomPage({ params }: Props) {
    const [roomId, setRoomId] = useState<string | null>(null);
    const ok = useRequireAuth();
    const router = useRouter();
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    // Resolve params safely
    useEffect(() => {
        (async () => {
            const resolved = await params;
            setRoomId(resolved.roomId);
        })();
    }, [params]);

    // Load session
    useEffect(() => {
        if (!ok) return;

        const loadSession = async () => {
            const s = await getSession();
            if (!s) throw new Error("Unable to fetch session");
            setSession(s);
            setLoading(false);
        };
        loadSession();
    }, [ok]);

    if (!roomId || !ok || loading)
        return <div className="p-8">Loading room...</div>;

    const token = session?.access_token;

    return (
        <main className="p-8 h-screen flex flex-col overflow-hidden select-none">
            <div className="flex justify-between items-center mb-6">
                {/* TODO: Problem metadata display */}
                <ProblemTitle
                    title="Reverse Linked List"
                    description="Implement a function that reverses a linked list."
                    difficulty="Medium"
                    acceptanceRate="62%"
                />
                <LeaveButton />
            </div>

            {token && (
                <div className="flex-grow overflow-hidden">
                    <MonacoCollabTextArea roomId={roomId} token={token} />
                </div>
            )}

            {/* Comment Panel - Kept for potential future use */}
            {/* {token && (
                <div className="grow h-full" style={{ minWidth: "250px" }}>
                    <CommentPanel roomId={roomId} token={token} />
                </div>
            )} */}
        </main>
    );
}
