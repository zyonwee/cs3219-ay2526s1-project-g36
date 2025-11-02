"use client";

import { use, useState, useEffect } from "react";
import { getSession, logout } from "../../../../lib/auth";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "../../../../lib/useRequireAuth";
import ProblemTitle from "../../components/room/ProblemTitle";
import CodeEditorPanel from "../../components/room/CodeEditorPanel";
import CommentPanel from "../../components/room/CommentPanel";
import ChatPanel from "../../components/room/ChatPanel";
import { Session } from "@supabase/supabase-js";

type Props = {
  params: Promise<{ roomId: string }>;
};

export default function RoomPage({ params }: Props) {
  const { roomId } = use(params);
  const ok = useRequireAuth();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (!ok || loading) return <div className="p-8">Loading room...</div>;

  const token = session?.access_token;

  const handleLeave = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <main className="p-8">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <ProblemTitle
          title="Reverse Linked List"
          description="Implement a function that reverses a linked list."
          difficulty="Medium"
          acceptanceRate="62%"
        />
        {/* <LeaveButton onClick={handleLeave} /> */}
      </div>

      {/* Panels Section */}
      <div className="flex flex-row gap-6 h-[80vh]">
        {token && (
          <>
            <div className="flex-1">
              <CodeEditorPanel roomId={roomId} token={token} />
            </div>
            <div className="flex-1 max-w-[400px]">
              <CommentPanel roomId={roomId} token={token} />
            </div>
            <div className="flex-1 max-w-[400px]">
              <ChatPanel />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
