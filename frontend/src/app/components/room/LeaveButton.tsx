"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { qnJson } from "../../../../lib/qn";
import { getSession } from "../../../../lib/auth";
import { supabaseBrowser } from "../../../../utils/supabase/client";

export default function LeaveButton() {
  const [step, setStep] = useState<"none" | "confirm" | "completed">("none");
  const router = useRouter();

  const handleCompletion = async (completed: boolean) => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('currentProblem') : null;
      const startedAt = typeof window !== 'undefined' ? localStorage.getItem('attemptStart') : null;
      const question = raw ? JSON.parse(raw) : null;
      const questionId = question?.id ?? question?.question_id ?? null;

      if (questionId != null) {
        await qnJson('/attempts', {
          method: 'POST',
          body: JSON.stringify({
            question_id: questionId,
            status: completed ? 'completed' : 'left',
            started_at: startedAt || new Date().toISOString(),
            submitted_at: new Date().toISOString(),
            question,
          }),
        });
      }

      // If user completed the question, update their total_points in Supabase `profile` table.
      if (completed) {
        try {
          // Derive points from difficulty if explicit points not provided.
          const difficulty = (question?.difficulty || question?.level || '')?.toString()?.toLowerCase() || 'medium';
          const pointsMap = { easy: 1, medium: 3, hard: 5 } as Record<string, number>;
          const points = question?.points ?? pointsMap[difficulty] ?? 3;

          // Get logged-in user id from session
          const session = await getSession();
          const userId = session?.user?.id ?? null;
          if (userId) {
            // Use a Postgres RPC to atomically increment total_points in DB.
            // This avoids race conditions from concurrent clients. The RPC
            // `increment_total_points` should be created in your Supabase DB
            // (see notes below). We pass `p_user_id` and `p_delta`.
            try {
              const { data: rpcData, error: rpcError } = await supabaseBrowser.rpc('increment_total_points', {
                p_user_id: userId,
                p_delta: Number(points || 0),
              });
              if (rpcError) {
                // If RPC reports error (e.g. profile not found), surface it so
                // it's visible in logs and (optionally) to the user.
                throw new Error(rpcError.message || 'increment_total_points RPC error');
              }
              // rpcData contains the updated total_points (if the function returns it)
            } catch (rpcErr) {
              // Log and show a visible alert — this should not happen in normal operation.
              // We do not block navigation but we surface the issue.
              // eslint-disable-next-line no-console
              console.error('RPC increment_total_points failed', rpcErr);
              try {
                if (typeof window !== 'undefined') {
                  alert('Internal error while updating points. Please contact support.');
                }
              } catch {}
            }
          }
        } catch (err) {
          // don't block navigation for Supabase errors; optionally log for debugging
          // console.error('Failed to update total_points', err);
        }
      }
    } catch (e) {
      // swallow errors to avoid blocking navigation
      // console.error('Failed to record attempt', e);
    } finally {
      try {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('attemptStart');
        }
      } catch {}
      router.push("/problems");
    }
  };

  return (
    <>
      <button
        onClick={() => setStep("confirm")}
        className="bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-2 rounded-lg transition cursor-pointer"
      >
        Leave Room
      </button>

      {/* First modal — confirm leaving */}
      {step === "confirm" && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"
          onClick={() => setStep("none")}
        >
          <div
            className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-lg w-[320px] animate-fade-in"
            onClick={(e) => e.stopPropagation()} // prevent click-through
          >
            <h3 className="font-semibold text-lg mb-4 text-center">Leave the room?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 text-center">
              Are you sure you want to leave this room?
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setStep("completed")}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition cursor-pointer"
              >
                Yes
              </button>
              <button
                onClick={() => setStep("none")}
                className="bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-900 dark:text-white px-4 py-2 rounded-md transition cursor-pointer"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Second modal — problem completion prompt */}
      {step === "completed" && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"
          onClick={() => setStep("none")}
        >
          <div
            className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-lg w-[340px] animate-fade-in"
            onClick={(e) => e.stopPropagation()} // prevent click-through
          >
            <h3 className="font-semibold text-lg mb-4 text-center">
              Did you successfully complete the problem?
            </h3>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => handleCompletion(true)}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md transition cursor-pointer"
              >
                Yes
              </button>
              <button
                onClick={() => handleCompletion(false)}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md transition cursor-pointer"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Simple fade animation */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.15s ease-out;
        }
      `}</style>
    </>
  );
}
