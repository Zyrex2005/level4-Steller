import { useEffect, useState } from "react";
import { getReputationDetails } from "../lib/soroban";

export function ReputationBadge({ freelancerAddress }: { freelancerAddress: string }) {
  const [rep, setRep] = useState<{ total_score: number; rating_count: number } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!freelancerAddress) return;
    setLoading(true);
    getReputationDetails(freelancerAddress)
      .then((res) => {
        setRep(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load reputation:", err);
        setLoading(false);
      });
  }, [freelancerAddress]);

  if (loading) {
    return <span className="animate-pulse text-xs text-brass-400 font-mono">Loading rating…</span>;
  }

  const ratingCount = rep?.rating_count || 0;
  const totalScore = rep?.total_score || 0;
  const averageRating = ratingCount > 0 ? (totalScore / ratingCount).toFixed(1) : null;

  return (
    <div className="inline-flex items-center gap-1.5 bg-ink-800/80 border border-brass-500/20 px-2.5 py-1 rounded-seal text-xs font-medium">
      <span className="text-brass-400">★</span>
      {averageRating ? (
        <span className="text-parchment-100">
          {averageRating} <span className="text-ink-400">/ 5.0</span>
          <span className="text-ink-500 font-mono ml-1">({ratingCount} gig{ratingCount !== 1 ? 's' : ''})</span>
        </span>
      ) : (
        <span className="text-ink-400 font-mono">No ratings yet</span>
      )}
    </div>
  );
}
