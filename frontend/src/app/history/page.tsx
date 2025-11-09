"use client";

import { useEffect, useState } from "react";
import TopNavBar from "../components/navbar/TopNavBar";
import { useRequireAuth } from "../../../lib/useRequireAuth";
import { qnJson } from "../../../lib/qn";

type Attempt = {
  user_id: string;
  question_id: string;
  status?: string;
  started_at: string;
  submitted_at?: string;
  created_at?: string;
  question?: {
    id?: number | string;
    name?: string;
    title?: string;
    description?: string;
    difficulty?: string;
    topic?: string;
    related_topics?: string[];
  } | null;
};

export default function HistoryPage() {
  const ok = useRequireAuth();
  const [items, setItems] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ok) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await qnJson<{ items: Attempt[] }>(`/attempts`);
        if (!cancelled) setItems(data.items || []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load history');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [ok]);

  if (!ok || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600" />
      </div>
    );
  }

  return (
    <main className="relative min-h-screen flex p-6">
      <div className="flex-1">
        <TopNavBar />
        <div className="my-4">
          <h1 className="text-2xl font-bold mb-4">History</h1>
          {error && (
            <div className="text-red-600 mb-3">{error}</div>
          )}
          {items.length === 0 ? (
            <p className="text-gray-600">No attempts yet.</p>
          ) : (
            <div className="space-y-3">
              {items.map((a, idx) => {
                const title = a.question?.title || a.question?.name || `Question ${a.question_id}`;
                const dateStr = a.submitted_at || a.created_at || a.started_at;
                const date = dateStr ? new Date(dateStr) : null;
                const dateFmt = date ? date.toLocaleString() : '—';
                const difficulty = (a.question?.difficulty || '').toString();
                const topic = a.question?.topic || (Array.isArray(a.question?.related_topics) ? a.question?.related_topics?.[0] : undefined) || '—';
                return (
                  <div key={idx} className="border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <div className="font-semibold">{title}</div>
                      <div className="text-sm text-gray-600">{dateFmt}</div>
                    </div>
                    <div className="flex gap-3 text-sm">
                      <span className="px-2 py-1 rounded bg-gray-100">{difficulty || '—'}</span>
                      <span className="px-2 py-1 rounded bg-gray-100">{topic}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
