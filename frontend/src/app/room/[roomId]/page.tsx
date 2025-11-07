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
import { set } from "lib0/encoding.js";

type Props = {
    params: Promise<{ roomId: string }>;
};

export default function RoomPage({ params }: Props) {
    const [roomId, setRoomId] = useState<string | null>(null);
    const ok = useRequireAuth();
    const router = useRouter();
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [ownUserId, setOwnUserId] = useState<string | null>(null);
    const [partnerId, setPartnerId] = useState<string | null>(null);
    const [ownName, setOwnName] = useState<string | null>(null);
    const [partnerName, setPartnerName] = useState<string | null>(null);

    // Resolve params safely
    useEffect(() => {
        (async () => {
            const resolved = await params;
            setRoomId(resolved.roomId);
            try {
                const meta = sessionStorage.getItem(
                    `roommeta:${resolved.roomId}`
                );
                if (meta) {
                    const parsed = JSON.parse(meta);
                    setPartnerId(parsed.matchedUserId || null);
                }
            } catch (e) {
                console.error("Error parsing room metadata:", e);
            }
        })();
    }, [params]);

    // Load session
    useEffect(() => {
        if (!ok) return;

        const loadSession = async () => {
            const s = await getSession();
            if (!s) throw new Error("Unable to fetch session");
            setSession(s);
            setOwnUserId(s.user.id);
            setLoading(false);
        };
        loadSession();
    }, [ok]);

    useEffect(() => {
        if (!partnerId || !session) return;

        const fetchOwnName = async () => {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_USER_SERVICE_URL}/profile/me`,
                {
                    headers: {
                        Authorization: `Bearer ${session?.access_token}`,
                    },
                }
            );
            if (!response.ok) {
                return;
            }
            const data = await response.json();
            setOwnName(data.profile.username || null);
        };

        const fetchPartnerName = async () => {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_USER_SERVICE_URL}/profile/username?userId=${partnerId}`,
                {
                    headers: {
                        Authorization: `Bearer ${session?.access_token}`,
                    },
                }
            );
            if (!response.ok) {
                return;
            }
            const { username } = await response.json();
            setPartnerName(username || null);
        };
        fetchPartnerName();
        fetchOwnName();
    }, [partnerId, session]);

    if (!roomId || !ok || !ownUserId || !partnerName || !ownName || loading)
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

            <div className="mb-4 text-sm text-gray-700 dark:text-gray-300">
                {partnerName ? (
                    <>
                        Matched with{" "}
                        <span className="text-blue-500 dark:text-blue-400 font-semibold">
                            {partnerName}
                        </span>
                    </>
                ) : partnerId ? (
                    <span className="text-gray-500 dark:text-gray-400">
                        Loading partner…
                    </span>
                ) : (
                    <span className="text-gray-500 dark:text-gray-400">
                        Matched user unknown
                    </span>
                )}
            </div>

            {token && (
                <div className="flex-grow overflow-hidden">
                    <MonacoCollabTextArea
                        roomId={roomId}
                        token={token}
                        ownUserId={ownUserId}
                        ownName={ownName}
                        partnerName={partnerName}
                    />
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
