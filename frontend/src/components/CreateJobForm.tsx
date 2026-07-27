import React, { useState } from "react";

export type JobFormData = {
  freelancer: string;
  token: string;
  amount: string;
  description: string;
  deadlineDate: string;
};

type CreateJobFormProps = {
  onSubmit: (data: JobFormData) => Promise<void>;
  isSubmitting: boolean;
  walletConnected: boolean;
};

const DEFAULT_SAC_TOKEN = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC"; // Stellar Testnet XLM Native contract ID

export function CreateJobForm({ onSubmit, isSubmitting, walletConnected }: CreateJobFormProps) {
  const [formData, setFormData] = useState<JobFormData>({
    freelancer: "",
    token: DEFAULT_SAC_TOKEN,
    amount: "",
    description: "",
    deadlineDate: "",
  });
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate fields
    if (!formData.freelancer.startsWith("G") || formData.freelancer.length !== 56) {
      setError("Please enter a valid Stellar freelancer public key (starting with G).");
      return;
    }
    if (!formData.token.startsWith("C") || formData.token.length !== 56) {
      setError("Please enter a valid Stellar Asset Contract token ID (starting with C).");
      return;
    }
    const amt = parseFloat(formData.amount);
    if (isNaN(amt) || amt <= 0) {
      setError("Please enter a valid budget amount greater than 0.");
      return;
    }
    if (!formData.description.trim()) {
      setError("Please enter a description for the job.");
      return;
    }
    if (!formData.deadlineDate) {
      setError("Please select a valid job completion deadline date.");
      return;
    }
    const selectedTime = new Date(formData.deadlineDate).getTime();
    if (selectedTime <= Date.now()) {
      setError("Deadline must be in the future.");
      return;
    }

    try {
      await onSubmit(formData);
      // Reset form
      setFormData({
        freelancer: "",
        token: DEFAULT_SAC_TOKEN,
        amount: "",
        description: "",
        deadlineDate: "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create job.");
    }
  };

  return (
    <form onSubmit={handleFormSubmit} noValidate className="bg-ink-800/40 border border-brass-500/10 p-6 rounded-seal flex flex-col gap-4">
      <h3 className="text-xl font-bold text-brass-400">Post a New Gig</h3>

      {error && (
        <div role="alert" className="bg-red-500/15 border border-red-500/30 p-3 rounded-seal text-xs text-red-400 font-medium">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-parchment-200">Freelancer Wallet Address</label>
        <input
          type="text"
          name="freelancer"
          value={formData.freelancer}
          onChange={handleChange}
          placeholder="e.g. GB44L2MS..."
          className="focus-ring bg-ink-900 border border-brass-500/10 px-4 py-2.5 rounded-seal text-sm text-parchment-100 placeholder-ink-400"
          required
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-parchment-200">Payment Token Contract ID</label>
        <input
          type="text"
          name="token"
          value={formData.token}
          onChange={handleChange}
          placeholder="e.g. CDWS..."
          className="focus-ring bg-ink-900 border border-brass-500/10 px-4 py-2.5 rounded-seal text-sm text-parchment-100 placeholder-ink-400 font-mono text-xs"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-parchment-200">Budget (Amount)</label>
          <input
            type="number"
            name="amount"
            step="any"
            value={formData.amount}
            onChange={handleChange}
            placeholder="e.g. 150"
            className="focus-ring bg-ink-900 border border-brass-500/10 px-4 py-2.5 rounded-seal text-sm text-parchment-100 placeholder-ink-400"
            required
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-parchment-200">Job Deadline</label>
          <input
            type="date"
            name="deadlineDate"
            value={formData.deadlineDate}
            onChange={handleChange}
            className="focus-ring bg-ink-900 border border-brass-500/10 px-4 py-2.5 rounded-seal text-sm text-parchment-100 placeholder-ink-400"
            required
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-parchment-200">Project Requirements & Description</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Describe the deliverables, timeline, and terms..."
          rows={3}
          className="focus-ring bg-ink-900 border border-brass-500/10 px-4 py-2.5 rounded-seal text-sm text-parchment-100 placeholder-ink-400 resize-none"
          required
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !walletConnected}
        className="focus-ring mt-2 bg-brass-500 text-ink-900 py-3 rounded-seal font-bold transition hover:bg-brass-400 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
      >
        {isSubmitting ? "Broadcasting to Stellar…" : walletConnected ? "Create Job Listing" : "Connect Wallet to Post"}
      </button>
    </form>
  );
}
