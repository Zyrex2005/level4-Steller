import React, { useEffect, useState } from "react";
import type { JobItem } from "./JobList";

interface AdminStatsProps {
  jobs: JobItem[];
  apiBaseUrl?: string;
}

interface FeedbackEntry {
  id: string;
  rating: number;
  comment: string;
  address: string;
  timestamp: string;
}

export const AdminStats: React.FC<AdminStatsProps> = ({
  jobs,
  apiBaseUrl = "http://localhost:3001",
}) => {
  const [feedbackList, setFeedbackList] = useState<FeedbackEntry[]>([]);
  const [averageRating, setAverageRating] = useState<number | string>("N/A");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchFeedback();
  }, []);

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/feedback`);
      if (res.ok) {
        const data = await res.json();
        setFeedbackList(data.feedback || []);
        setAverageRating(data.averageRating || "N/A");
      }
    } catch (err) {
      console.error("[AdminStats] Failed to fetch feedback:", err);
    } finally {
      setLoading(false);
    }
  };

  // Compute metrics from jobs
  const totalJobs = jobs.length;
  const fundedJobs = jobs.filter((j) => j.status === "Funded").length;
  const completedJobs = jobs.filter((j) => j.status === "Completed").length;

  const uniqueWallets = Array.from(
    new Set(jobs.flatMap((j) => [j.client, j.freelancer]))
  ).filter(Boolean);

  const ratedJobs = jobs.filter((j) => j.rated);

  return (
    <div className="flex flex-col gap-6 animate-fade-in text-parchment-100">
      <div className="flex justify-between items-center border-b border-brass-500/15 pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-brass-400">
            📊 SkillEscrow Admin & Metrics Dashboard
          </h2>
          <p className="text-xs text-ink-400">
            Live telemetry, smart contract usage metrics, and user feedback submissions
          </p>
        </div>
        <button
          onClick={fetchFeedback}
          className="bg-ink-800 border border-brass-500/30 hover:border-brass-400 text-brass-400 px-3 py-1.5 rounded text-xs font-semibold transition"
        >
          🔄 Refresh Telemetry
        </button>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-ink-800 border border-brass-500/20 p-5 rounded-seal flex flex-col gap-1">
          <span className="text-3xs font-mono uppercase text-ink-400 font-bold">Total Jobs Listed</span>
          <span className="text-3xl font-black text-brass-400">{totalJobs}</span>
          <span className="text-3xs text-ink-400 font-medium">
            {fundedJobs} Active Escrows • {completedJobs} Settled
          </span>
        </div>

        <div className="bg-ink-800 border border-brass-500/20 p-5 rounded-seal flex flex-col gap-1">
          <span className="text-3xs font-mono uppercase text-ink-400 font-bold">Unique Active Wallets</span>
          <span className="text-3xl font-black text-mint-400">{uniqueWallets.length}</span>
          <span className="text-3xs text-ink-400 font-medium">Clients & Freelancers</span>
        </div>

        <div className="bg-ink-800 border border-brass-500/20 p-5 rounded-seal flex flex-col gap-1">
          <span className="text-3xs font-mono uppercase text-ink-400 font-bold">Average User Score</span>
          <span className="text-3xl font-black text-yellow-400">
            {averageRating} <span className="text-sm">★</span>
          </span>
          <span className="text-3xs text-ink-400 font-medium">
            From {feedbackList.length} user submissions
          </span>
        </div>

        <div className="bg-ink-800 border border-brass-500/20 p-5 rounded-seal flex flex-col gap-1">
          <span className="text-3xs font-mono uppercase text-ink-400 font-bold">Contract Rated Gigs</span>
          <span className="text-3xl font-black text-parchment-200">{ratedJobs.length}</span>
          <span className="text-3xs text-ink-400 font-medium">Atomic cross-contract ratings</span>
        </div>
      </div>

      {/* Unique Wallets List */}
      <div className="bg-ink-800 border border-brass-500/20 p-6 rounded-seal flex flex-col gap-3">
        <h3 className="text-base font-bold text-parchment-200">
          Distinct Interacting Wallets ({uniqueWallets.length})
        </h3>
        {uniqueWallets.length === 0 ? (
          <p className="text-xs text-ink-400 italic">No wallet interactions recorded yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-mono text-xs">
            {uniqueWallets.map((addr) => (
              <div
                key={addr}
                className="bg-ink-900/60 border border-brass-500/10 p-2.5 rounded text-brass-300 break-all"
              >
                {addr}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Feedback Table */}
      <div className="bg-ink-800 border border-brass-500/20 p-6 rounded-seal flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-bold text-parchment-200">
            Product Validation User Feedback ({feedbackList.length})
          </h3>
        </div>

        {loading ? (
          <p className="text-xs text-ink-400 animate-pulse">Loading feedback entries...</p>
        ) : feedbackList.length === 0 ? (
          <p className="text-xs text-ink-400 italic">
            No feedback entries submitted yet. Use the floating feedback widget to test!
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-brass-500/20 text-ink-400 uppercase font-mono">
                  <th className="py-2 px-3">Rating</th>
                  <th className="py-2 px-3">User Address</th>
                  <th className="py-2 px-3">Comment</th>
                  <th className="py-2 px-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brass-500/10">
                {feedbackList.map((fb) => (
                  <tr key={fb.id} className="hover:bg-ink-900/40">
                    <td className="py-2 px-3 font-bold text-yellow-400 font-mono">
                      {fb.rating} ★
                    </td>
                    <td className="py-2 px-3 font-mono text-ink-300 truncate max-w-[150px]">
                      {fb.address}
                    </td>
                    <td className="py-2 px-3 text-parchment-200">{fb.comment || "—"}</td>
                    <td className="py-2 px-3 text-ink-400 font-mono text-3xs">
                      {new Date(fb.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
