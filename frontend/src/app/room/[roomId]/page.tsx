"use client";

import { useState, useEffect, useRef } from "react";
import { getSession, logout } from "../../../../lib/auth";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "../../../../lib/useRequireAuth";
import ProblemTitle from "../../components/room/ProblemTitle";
import QuestionPanel from "../../components/room/QuestionPanel";
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
    const [problem, setProblem] = useState<{
        title: string;
        description: string;
        difficulty: string;
        acceptanceRate?: number | string;
    } | null>(null);
    const [dividerX, setDividerX] = useState(60); // %
    const isDragging = useRef(false);

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

    // Load selected problem from localStorage (set when user clicked Find Match)
    useEffect(() => {
        try {
            const raw = typeof window !== 'undefined' ? localStorage.getItem('currentProblem') : null;
            if (raw) {
                const p = JSON.parse(raw);
                if (p && typeof p === 'object') {
                    setProblem({
                        title: p.name || p.title || 'Problem',
                        description: p.description || '',
                        difficulty: String(p.difficulty || 'medium'),
                        acceptanceRate: p.acceptanceRate ?? p.acceptance_rate ?? undefined,
                    });
                }
            }
        } catch {}
    }, []);

    // Record attempt start time when entering room
    useEffect(() => {
        try {
            if (typeof window !== 'undefined') {
                const existing = localStorage.getItem('attemptStart');
                if (!existing) {
                    localStorage.setItem('attemptStart', new Date().toISOString());
                }
            }
        } catch {}
    }, []);

    // Divider drag logic
    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        isDragging.current = true;
        document.body.style.cursor = "col-resize";
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging.current) return;
        const container = document.getElementById("resizable-container");
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const newWidthPercent = Math.min(
            80,
            Math.max(30, (offsetX / rect.width) * 100)
        );
        setDividerX(newWidthPercent);
    };

    const handleMouseUp = () => {
        isDragging.current = false;
        document.body.style.cursor = "default";
    };

    useEffect(() => {
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, []);

    if (!roomId || !ok || loading)
        return <div className="p-8">Loading room...</div>;

    const token = session?.access_token;

    return (
        <main className="p-8 h-screen flex flex-col overflow-hidden select-none">
            <div className="flex justify-between items-center mb-3">
                <ProblemTitle
                    title={problem?.title || 'Problem'}
                    description={problem?.description || 'Open the question panel to view details.'}
                    difficulty={(problem?.difficulty ?? 'medium').toString()}
                    acceptanceRate={
                        problem?.acceptanceRate !== undefined
                            ? `${problem.acceptanceRate}`
                            : '—'
                    }
                />
                <LeaveButton />
            </div>
            {/* Inline hint when no problem found */}
            {!problem && (
                <div className="mb-4 text-sm text-gray-600">
                    No question selected. If you matched from a problem card, it will show here.
                </div>
            )}

            {token && (
                <div
                    id="resizable-container"
                    className="flex flex-row flex-grow overflow-hidden relative"
                    style={{ minHeight: 0 }}
                >
                    {/* Code Editor Panel */}
                    <div
                        className="h-full"
                        style={{
                            width: `${dividerX}%`,
                            minWidth: "300px",
                            transition: isDragging.current
                                ? "none"
                                : "width 0.1s ease-out",
                        }}
                    >
                        <MonacoCollabTextArea roomId={roomId} token={token} />
                    </div>

                    {/* Divider */}
                    <div
                        onMouseDown={handleMouseDown}
                        className="cursor-col-resize hover:bg-accent transition-colors"
                        style={{
                            width: "6px",
                            backgroundColor: "rgba(150, 150, 150, 0.3)",
                            cursor: "col-resize",
                            zIndex: 10,
                        }}
                    ></div>

                    {/* Question Panel (right side) */}
                    <div
                        className="grow h-full overflow-auto"
                        style={{
                            width: `${100 - dividerX}%`,
                            minWidth: "250px",
                            maxHeight: "100%",
                        }}
                    >
                        <QuestionPanel
                            title={problem?.title}
                            description={problem?.description}
                            difficulty={problem?.difficulty}
                            acceptanceRate={typeof problem?.acceptanceRate === 'number' ? problem?.acceptanceRate : undefined}
                        />
                    </div>
                </div>
            )}
        </main>
    );
}
