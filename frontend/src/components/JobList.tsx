import { useState } from "react";
import { ReputationBadge } from "./ReputationBadge";

export type JobItem = {
  id: number;
  client: string;
  freelancer: string;
  token: string;
  amount: string;
  description: string;
  deadline: number; // Unix timestamp in seconds
  status: "Created" | "Funded" | "Completed" | "Refunded";
  rated: boolean;
};

type JobListProps = {
  jobs: JobItem[];
  walletAddress: string | null;
  onFund: (jobId: number) => Promise<void>;
  onComplete: (jobId: number) => Promise<void>;
  onRefund: (jobId: number) => Promise<void>;
  onRate: (jobId: number, score: number) => Promise<void>;
  activeActionJobId: number | null; // Id of job currently being updated
};

export function JobList({
  jobs,
  walletAddress,
  onFund,
  onComplete,
  onRefund,
  onRate,
  activeActionJobId,
}: JobListProps) {
  const [ratingScores, setRatingScores] = useState<{ [jobId: number]: number }>({});

  const handleScoreChange = (jobId: number, score: number) => {
    setRatingScores((prev) => ({ ...prev, [jobId]: score }));
  };

  if (jobs.length === 0) {
    return (
      <div className="bg-ink-800/10 border border-brass-500/5 p-8 rounded-seal text-center">
        <p className="text-ink-400 font-medium">No job listings found.</p>
        <p className="text-xs text-ink-500 mt-1">Create your first gig listing using the form on the left.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {jobs.map((job) => {
        const isClient = walletAddress && walletAddress.toLowerCase() === job.client.toLowerCase();
        const isDeadlinePassed = Date.now() / 1000 >= job.deadline;
        const isBusy = activeActionJobId === job.id;
        
        const selectedScore = ratingScores[job.id] ?? 5;

        // Render status badges with clean, themed colors
        let statusBadge = (
          <span className="bg-ink-800 text-ink-400 border border-ink-500/20 px-2 py-0.5 rounded-full text-xs font-semibold">
            Draft
          </span>
        );
        if (job.status === "Funded") {
          statusBadge = (
            <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded-full text-xs font-semibold">
              Active / Funded
            </span>
          );
        } else if (job.status === "Completed") {
          statusBadge = (
            <span className="bg-mint-500/10 text-mint-500 border border-mint-500/20 px-2.5 py-0.5 rounded-full text-xs font-semibold">
              Completed
            </span>
          );
        } else if (job.status === "Refunded") {
          statusBadge = (
            <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-0.5 rounded-full text-xs font-semibold">
              Refunded
            </span>
          );
        }

        return (
          <div key={job.id} className="bg-ink-800/20 border border-brass-500/10 p-5 rounded-seal flex flex-col gap-3 transition hover:border-brass-500/25">
            <div className="flex justify-between items-start gap-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-lg font-bold text-parchment-100">Job #{job.id}</h4>
                  {statusBadge}
                  {job.rated && (
                    <span className="bg-brass-500/10 text-brass-400 border border-brass-500/20 px-2 py-0.5 rounded-full text-2xs font-semibold">
                      Rated
                    </span>
                  )}
                </div>
                <span className="text-xs text-ink-400 font-mono">
                  Freelancer: {job.freelancer.slice(0, 8)}…{job.freelancer.slice(-6)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xl font-bold text-brass-400 font-mono">{job.amount}</span>
                <span className="text-xs text-ink-400 font-semibold block">SAC Tokens</span>
              </div>
            </div>

            <p className="text-sm text-parchment-200 bg-ink-900/30 p-3 rounded-seal border border-brass-500/5">
              {job.description}
            </p>

            <div className="flex flex-wrap justify-between items-center gap-3 pt-1 text-xs">
              <div className="flex flex-col gap-0.5 text-ink-400 font-medium">
                <span>Client: {job.client.slice(0, 6)}…{job.client.slice(-4)}</span>
                <span>Deadline: {new Date(job.deadline * 1000).toLocaleString()}</span>
              </div>
              <div>
                <ReputationBadge freelancerAddress={job.freelancer} />
              </div>
            </div>

            {/* Render Contextual Action Buttons */}
            <div className="flex justify-end items-center gap-2 pt-2 border-t border-brass-500/5">
              {job.status === "Created" && isClient && (
                <button
                  onClick={() => onFund(job.id)}
                  disabled={isBusy}
                  className="bg-brass-500 text-ink-900 px-4 py-2 text-xs rounded-seal font-bold hover:bg-brass-400 transition disabled:opacity-50"
                >
                  {isBusy ? "Funding gig…" : "Fund & Activate Gig"}
                </button>
              )}

              {job.status === "Funded" && isClient && (
                <button
                  onClick={() => onComplete(job.id)}
                  disabled={isBusy}
                  className="bg-mint-500 text-ink-900 px-4 py-2 text-xs rounded-seal font-bold hover:opacity-90 transition disabled:opacity-50"
                >
                  {isBusy ? "Completing gig…" : "Release Payment"}
                </button>
              )}

              {job.status === "Funded" && isDeadlinePassed && (
                <button
                  onClick={() => onRefund(job.id)}
                  disabled={isBusy}
                  className="bg-red-500/20 text-red-400 border border-red-500/40 px-4 py-2 text-xs rounded-seal font-bold hover:bg-red-500/30 transition disabled:opacity-50"
                >
                  {isBusy ? "Refunding gig…" : "Request Refund"}
                </button>
              )}

              {job.status === "Completed" && !job.rated && isClient && (
                <div className="flex items-center gap-2 bg-ink-900/40 border border-brass-500/10 p-2 rounded-seal">
                  <div className="flex items-center gap-1">
                    <label className="text-2xs text-parchment-200 font-bold uppercase">Rate Freelancer:</label>
                    <select
                      value={selectedScore}
                      onChange={(e) => handleScoreChange(job.id, Number(e.target.value))}
                      className="bg-ink-800 border border-brass-500/25 text-parchment-100 rounded px-1 py-0.5 text-xs focus:outline-none"
                    >
                      <option value={5}>5 Stars ★★★★★</option>
                      <option value={4}>4 Stars ★★★★</option>
                      <option value={3}>3 Stars ★★★</option>
                      <option value={2}>2 Stars ★★</option>
                      <option value={1}>1 Star ★</option>
                    </select>
                  </div>
                  <button
                    onClick={() => onRate(job.id, selectedScore)}
                    disabled={isBusy}
                    className="bg-brass-500 text-ink-900 px-3 py-1.5 text-2xs rounded-seal font-bold hover:bg-brass-400 transition disabled:opacity-50"
                  >
                    {isBusy ? "Rating…" : "Submit Rating"}
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
