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

  const { status, joinQueue } = useMatching({
    token,
    onMatched: ({ roomId, matchedUserId }) => {
      console.log(`Matched! Room ID: ${roomId}, Matched User ID: ${matchedUserId}`);
    }
  });

  const payload = useMemo(() => ({
    userId: userId,
    difficulty: problem.difficulty.toLowerCase(),
    topics: [problem.topic],
  }), [problem, userId]);

  const handleFindMatch = () => {
    console.log("Finding match for:");
    console.log({
      name: problem.name,
      topic: problem.topic,
      difficulty: problem.difficulty,
    });
    joinQueue(payload);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <button
      onClick={handleFindMatch}
      className="w-full py-2 px-4 rounded-lg font-semibold transition cursor-pointer"
      style={{
        backgroundColor: theme.primary,
        color: theme.background,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.accent)}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = theme.primary)}
      disabled={status === "searching" || userId === null}
    >
      Find Match
    </button>
  );
}
