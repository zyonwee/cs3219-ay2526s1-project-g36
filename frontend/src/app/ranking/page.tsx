"use client";

import { useEffect, useState } from "react";
import { useTheme } from "../../../context/ThemeContext";
import RankingRow from "../components/ranking/RankingRow";
import TopNavBar from "../components/navbar/TopNavBar";
import UserRank from "../components/common/UserRank";
import { supabaseBrowser } from "../../../utils/supabase/client";

interface User {
  username: string;
  solved: number;
  rating: number;
  userId?: string;
}

export default function RankingPage() {
  const { theme } = useTheme();
  const [users, setUsers] = useState<User[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10; // number of rows per page

  useEffect(() => {
    let mounted = true;
    (async () => {
  setIsLoading(true);
      try {
        // Get current user id from Supabase session
        const {
          data: { user: currentUser },
        } = await supabaseBrowser.auth.getUser();

        // Fetch profiles from Supabase and order by total_points desc
        const { data, error } = await supabaseBrowser
          .from("profiles")
          .select("user_id, username, questions_completed, total_points")
          .order("total_points", { ascending: false });

        if (error) {
          console.error("Failed to load leaderboard from Supabase:", error);
          return;
        }

        if (!mounted || !data) return;

        const mapped: User[] = data.map((row: any) => ({
          userId: row.user_id ?? row.id ?? undefined,
          username: row.username || "Anonymous",
          solved: Number(row.questions_completed ?? 0),
          rating: Number(row.total_points ?? 0),
        }));

        // Ensure sorted just in case
        mapped.sort((a, b) => b.rating - a.rating);

        setUsers(mapped);

        // find current user's rank
        if (currentUser && currentUser.id) {
          const idx = mapped.findIndex((u) => u.userId === currentUser.id || u.username === currentUser.email);
          setMyRank(idx >= 0 ? idx + 1 : null);
        }
      } catch (e) {
        console.error("Error fetching ranking:", e);
      } finally {
        setIsLoading(false);
      }
      
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Sort users by rating (desc) and assign ranks
  const sortedUsers = [...users].sort((a, b) => b.rating - a.rating);
  const rankedUsers = sortedUsers.map((user, index) => ({
    rank: index + 1,
    ...user,
  }));

  // Pagination logic
  const startIdx = (currentPage - 1) * pageSize;
  const paginatedUsers = rankedUsers.slice(startIdx, startIdx + pageSize);
  const totalPages = Math.ceil(rankedUsers.length / pageSize);

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage((p) => p + 1);
  };

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage((p) => p - 1);
  };

  return (
    <>
    <div
      className="px-6 min-h-screen"
      style={{
        backgroundColor: theme.background,
        color: theme.text,
      }}
    >
      <TopNavBar />
        <div className="flex items-center justify-between mb-6">
        <h1
          className="pt-6 text-3xl font-bold"
          style={{ color: theme.accent }}
        >
          Top Peers
        </h1>
  {/* User's current rank on the leaderboard (computed from Supabase) */}
  <UserRank rank={myRank} />
      </div>

      {/* Loading overlay when waiting for Supabase */}
      {isLoading && (
        <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 60 }}>
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)' }} />
          <div style={{ backgroundColor: theme.card.background, border: `1px solid ${theme.border}`, padding: 20, borderRadius: 10, boxShadow: theme.card.shadow, zIndex: 70, minWidth: 240, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, border: `4px solid ${theme.border}`, borderTop: `4px solid ${theme.accent}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <div style={{ color: theme.text, fontWeight: 600 }}>Loading rankings…</div>
          </div>
        </div>
      )}


      <div
        className="rounded-lg shadow-md overflow-hidden"
        style={{
          backgroundColor: theme.card.background,
          boxShadow: theme.card.shadow,
        }}
      >
        <table className="w-full border-collapse table-fixed">
      <colgroup><col style={{ width: "9%" }} /><col style={{ width: "30%" }} /><col style={{ width: "20%" }} /><col style={{ width: "20%" }} /></colgroup>

            <thead
                style={{
                backgroundColor: theme.surface,
                color: theme.textSecondary,
                }}
            >
                <tr>
                <th
                    className="p-3 border-b font-semibold text-center"
                    style={{ borderColor: theme.border, textAlign: "center" }}
                >
                    Rank
                </th>

                <th
                    className="p-3 border-b font-semibold text-left"
                    style={{ borderColor: theme.border, textAlign: "left" }}
                >
                    Username
                </th>

                <th
                    className="p-3 border-b font-semibold text-center"
                    style={{ borderColor: theme.border, textAlign: "center" }}
                >
                    Problems Solved
                </th>

                <th
                    className="p-3 border-b font-semibold text-right"
                    style={{ borderColor: theme.border, textAlign: "right" }}
                >
                    Rating
                </th>
                </tr>
            </thead>

            <tbody>
                {paginatedUsers.map((user) => (
                <RankingRow
                    key={user.username}
                    rank={user.rank}
                    username={user.username}
                    solved={user.solved}
                    rating={user.rating}
                />
                ))}
            </tbody>
        </table>

      </div>

      {/* Pagination Controls */}
      <div className="flex justify-center items-center mt-4 space-x-4">
        <button
          onClick={handlePrev}
          disabled={currentPage === 1}
          className="px-4 py-2 rounded-md font-medium transition"
          style={{
            backgroundColor: currentPage === 1 ? theme.border : theme.primary,
            color: currentPage === 1 ? theme.textSecondary : theme.button.text,
            cursor: currentPage === 1 ? "not-allowed" : "pointer",
          }}
        >
          Prev
        </button>

        <span style={{ color: theme.textSecondary }}>
          Page {currentPage} of {totalPages}
        </span>

        <button
          onClick={handleNext}
          disabled={currentPage === totalPages}
          className="px-4 py-2 rounded-md font-medium transition"
          style={{
            backgroundColor: currentPage === totalPages ? theme.border : theme.primary,
            color: currentPage === totalPages ? theme.textSecondary : theme.button.text,
            cursor: currentPage === totalPages ? "not-allowed" : "pointer",
          }}
        >
          Next
        </button>
      </div>
    </div>
    <style jsx>{`
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `}</style>
    </>
  );
}
