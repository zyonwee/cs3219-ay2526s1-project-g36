"use client";

import TopNavBar from "../components/navbar/TopNavBar";
import { useRequireAuth } from "../../../lib/useRequireAuth";

export default function HistoryPage() {
  const ok = useRequireAuth();

  if (!ok) {
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
          <h1 className="text-2xl font-bold mb-2">History</h1>
          <p className="text-gray-600">Your recent activity will appear here.</p>
        </div>
      </div>
    </main>
  );
}

