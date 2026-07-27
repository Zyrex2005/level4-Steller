import React, { useState } from "react";

interface FeedbackWidgetProps {
  userAddress: string | null;
  apiBaseUrl?: string;
  onFeedbackSubmitted?: () => void;
}

export const FeedbackWidget: React.FC<FeedbackWidgetProps> = ({
  userAddress,
  apiBaseUrl = "http://localhost:3001",
  onFeedbackSubmitted,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMsg(null);

    try {
      const res = await fetch(`${apiBaseUrl}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          comment,
          address: userAddress || "anonymous",
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to submit feedback to API server");
      }
    } catch (err) {
      console.warn("[Feedback] API server offline or error, saving locally:", err);
      try {
        const localItems = JSON.parse(localStorage.getItem("skillescrow_feedback") || "[]");
        localItems.push({
          id: `fb_local_${Date.now()}`,
          rating,
          comment: comment.trim(),
          address: userAddress || "anonymous",
          timestamp: new Date().toISOString(),
        });
        localStorage.setItem("skillescrow_feedback", JSON.stringify(localItems));
      } catch (localErr) {
        console.error("Local storage error:", localErr);
      }
    }

    setStatusMsg({ type: "success", text: "Thank you for your feedback!" });
    setComment("");
    if (onFeedbackSubmitted) onFeedbackSubmitted();

    setTimeout(() => {
      setIsOpen(false);
      setStatusMsg(null);
    }, 2500);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
      {isOpen && (
        <div className="mb-3 bg-ink-800 border border-brass-500/30 p-5 rounded-seal max-w-xs w-full shadow-2xl animate-fade-in text-parchment-100">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-brass-400">Share App Feedback</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-ink-400 hover:text-parchment-100 text-xs font-bold"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
              <label className="block text-xs text-ink-400 mb-1">Your Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setRating(star)}
                    className={`text-lg transition ${
                      star <= rating ? "text-yellow-400 scale-110" : "text-ink-600"
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-ink-400 mb-1">Comment (Optional)</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What did you like or want improved?"
                rows={3}
                className="w-full bg-ink-900 border border-brass-500/20 rounded p-2 text-xs text-parchment-100 placeholder-ink-500 focus:outline-none focus:border-brass-400"
              />
            </div>

            {statusMsg && (
              <div
                className={`p-2 rounded text-xs text-center font-bold ${
                  statusMsg.type === "success"
                    ? "bg-mint-500/20 text-mint-400 border border-mint-500/30"
                    : "bg-red-500/20 text-red-400 border border-red-500/30"
                }`}
              >
                {statusMsg.text}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-brass-500 hover:bg-brass-400 text-ink-900 font-bold py-2 rounded text-xs transition disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Submit Feedback"}
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-brass-500 hover:bg-brass-400 text-ink-900 font-bold py-2.5 px-4 rounded-full shadow-lg flex items-center gap-2 text-xs transition transform hover:scale-105"
      >
        <span>💬</span>
        <span>{isOpen ? "Close" : "Feedback"}</span>
      </button>
    </div>
  );
};
