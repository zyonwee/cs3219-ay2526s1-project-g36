"use client";

import { useEffect, useMemo, useState } from "react";
import { useTheme } from "../../../../context/ThemeContext";
import { useMatching } from "../../../../hooks/useMatching";
import { getSession } from "../../../../lib/auth";
import { set } from "lib0/encoding.js";

export default function FindMatchButton({ problem }) {
  const { theme } = useTheme();

  const [session, setSession] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [showSetupModal, setShowSetupModal] = useState(false);

  useEffect(() => {
    const fetchSession = async () => {
      const session = await getSession();
      if (!session) {
        console.error("No user session found.");
        return;
      }
      setSession(session);
      setUserId(session.user.id);
      setToken(session.access_token);
      setLoading(false);
    };
    fetchSession();
  }, []);

  // IMPORTANT: useMatching should return { status, position, joinQueue, leaveQueue, error }
  const { status, position, joinQueue, leaveQueue, error } = useMatching({
    token: token,
    onMatched: ({ roomId, matchedUserId }) => {
      console.log(`Matched! Room ID: ${roomId}, Matched User ID: ${matchedUserId}`);
      // show a brief setup modal to indicate server is provisioning the room
      setShowSetupModal(true);
      // navigation to the room is handled by the matching hook; the modal
      // will be removed when the page changes (component unmounts).
    },
  });

  const payload = useMemo(
    () => ({
      userId: session?.user?.id,
      difficulty: String(problem.difficulty || "medium").toLowerCase(),
      topics: [problem.topic].filter(Boolean),
      questionId: problem.id ?? problem._id ?? problem.name,
    }),
    [problem, userId]
  );

  const isQueuing = status === "connecting" || status === "queued";

  const handleFindMatch = () => {
    try {
      // Persist the selected problem so the Room page can display it
      const toStore = {
        id: problem.id,
        name: problem.name,
        title: problem.name,
        description: problem.description,
        difficulty: problem.difficulty,
        topic: problem.topic,
        acceptanceRate: problem.acceptanceRate,
      };
      localStorage.setItem("currentProblem", JSON.stringify(toStore));
    } catch {}

    console.log("Finding match for:", {
      name: problem.name,
      topic: problem.topic,
      difficulty: problem.difficulty,
    });
    joinQueue(payload);
  };

  const handleLeave = () => {
    console.log("Leaving matchmaking");
    leaveQueue();
  };

  // Close modal if user cancels matchmaking or leaves queue
  useEffect(() => {
    if (status === "idle") setShowSetupModal(false);
  }, [status]);

  return (
    <>
      <div>
        <button
          onClick={handleFindMatch}
          className="w-full py-3 px-4 rounded-lg font-semibold transition cursor-pointer"
          style={{
            backgroundColor: isQueuing ? theme.accent : theme.primary,
            color: theme.background,
            opacity: isQueuing ? 0.95 : 1,
            pointerEvents: isQueuing ? "none" : "auto",
            fontSize: 16,
            letterSpacing: 0.2,
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = isQueuing ? theme.accent : theme.accent)
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = isQueuing ? theme.accent : theme.primary)
          }
          aria-disabled={isQueuing}
        >
          {isQueuing ? "Finding match…" : "Find Match"}
        </button>
      </div>

      {/* Persistent Overlay / modal shown while queuing */}
      <div
        aria-hidden={!isQueuing}
        style={{
          display: isQueuing ? "flex" : "none",
          position: "fixed",
          inset: 0,
          alignItems: "center",
          justifyContent: "center",
          zIndex: 60,
        }}
      >
        {/* inert backdrop - does NOT close the modal on click */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            // no onClick handler here anymore - backdrop is inert
          }}
        />

        {/* larger card */}
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "relative",
            zIndex: 61,
            width: "min(760px, 96%)", // bigger card
            maxWidth: "96%",
            padding: 28,
            borderRadius: 16,
            boxShadow: "0 12px 48px rgba(0,0,0,0.35)",
            background: theme.background,
            color: theme.text,
            display: "flex",
            flexDirection: "column",
            gap: 18,
            alignItems: "center",
          }}
        >
          {/* big spinner */}
          <div
            aria-hidden="true"
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              border: "6px solid rgba(0,0,0,0.08)",
              borderTopColor: theme.primary,
              animation: "spin 1s linear infinite",
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

          <div style={{ fontWeight: 800, fontSize: 20, color: theme.primary, textAlign: "center" }}>
            Finding match…
          </div>

          <div style={{ fontSize: 16, color: theme.text, textAlign: "center", minHeight: 22 }}>
            {status === "connecting" && "Connecting to matching server..."}
            {status === "queued" && position && `You are #${position} in queue`}
            {status === "queued" && !position && "You are in queue"}
          </div>

          {error && (
            <div style={{ color: "#c0392b", fontSize: 14, textAlign: "center", maxWidth: "85%" }}>
              {error}
            </div>
          )}

          {/* Big action buttons row */}
          <div style={{ display: "flex", gap: 16, width: "100%", justifyContent: "center", marginTop: 6 }}>
            <button
              onClick={handleLeave}
              style={{
                minWidth: 220,
                padding: "14px 20px",
                borderRadius: 12,
                border: "none",
                background: theme.primary,
                color: theme.background,
                fontWeight: 700,
                fontSize: 16,
                cursor: "pointer",
                boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
                transition: "background 0.2s"
              }}
              onMouseEnter={e => e.currentTarget.style.background = theme.accent}
              onMouseLeave={e => e.currentTarget.style.background = theme.primary}
            >
              Leave Matchmaking
            </button>
          </div>
        </div>
      </div>

      {/* Setup modal shown briefly when a match is found and the backend is creating the room */}
      {showSetupModal && (
        <div
          aria-hidden={false}
          style={{
            display: "flex",
            position: "fixed",
            inset: 0,
            alignItems: "center",
            justifyContent: "center",
            zIndex: 70,
          }}
        >
          {/* dim the background to focus attention on the setup modal */}
          <div
            aria-hidden="true"
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 70 }}
          />

          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: "relative",
              zIndex: 71,
              width: "min(540px, 92%)",
              padding: 28,
              borderRadius: 12,
              boxShadow: "0 12px 48px rgba(0,0,0,0.35)",
              background: theme.background,
              color: theme.text,
              display: "flex",
              flexDirection: "column",
              gap: 18,
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
              <div style={{ fontWeight: 800, fontSize: 18, color: theme.primary }}>
                Setting up collaboration room
              </div>
              <div style={{ height: 28 }} />
              <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "center" }}>
                <div className="dots-spinner" />
              </div>
              <div style={{ fontSize: 14, color: theme.textSecondary, textAlign: "center", maxWidth: 420 }}>
                Hang tight — creating a shared coding session for you and your peer.
              </div>
            </div>
          </div>
          <style>{`
            .dots-spinner {
              width: 64px;
              height: 16px;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 6px;
            }
            .dots-spinner::before,
            .dots-spinner::after,
            .dots-spinner > div {
              content: '';
              width: 10px;
              height: 10px;
              background: ${theme.primary};
              border-radius: 50%;
              display: inline-block;
              animation: dots 0.9s infinite ease-in-out;
            }
            .dots-spinner > div { animation-delay: 0.15s }
            .dots-spinner::before { animation-delay: 0s }
            .dots-spinner::after { animation-delay: 0.3s }

            @keyframes dots {
              0% { transform: translateX(0) scale(1); opacity: 0.4 }
              50% { transform: translateX(6px) scale(1.2); opacity: 1 }
              100% { transform: translateX(0) scale(1); opacity: 0.4 }
            }
          `}</style>
        </div>
      )}
    </>
  );
}
