import { useState, useEffect, lazy, Suspense } from "react";
import { useWallet } from "./hooks/useWallet";
import { useJobs } from "./hooks/useJobs";
import { Navbar } from "./components/Navbar";
import { CreateJobForm } from "./components/CreateJobForm";
import type { JobFormData } from "./components/CreateJobForm";
import { JobList } from "./components/JobList";
import { FeedbackWidget } from "./components/FeedbackWidget";
import {
  callContractMethod,
  ESCROW_CONTRACT_ID,
  SOROBAN_RPC_URL,
} from "./lib/soroban";
import { Address, nativeToScVal } from "@stellar/stellar-sdk";
import { analytics } from "./lib/analytics";
import { initSentry, captureException } from "./lib/sentry";

// Code-split / lazy-load non-critical views
const OnboardingModal = lazy(() =>
  import("./components/OnboardingModal").then((module) => ({
    default: module.OnboardingModal,
  }))
);

const AdminStats = lazy(() =>
  import("./components/AdminStats").then((module) => ({
    default: module.AdminStats,
  }))
);

export default function App() {
  const wallet = useWallet();
  const { address, sign } = wallet;
  const { jobs, loading, error, refreshJobs } = useJobs();

  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeJobId, setActiveJobId] = useState<number | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [txSuccess, setTxSuccess] = useState<string | null>(null);

  useEffect(() => {
    initSentry();
    analytics.init();
  }, []);

  useEffect(() => {
    if (address) {
      analytics.trackWalletConnect(address);
    }
  }, [address]);

  // Helper to clear alerts after a timeout
  const setTimedAlerts = (successMsg: string | null, errorMsg: string | null) => {
    setTxSuccess(successMsg);
    setTxError(errorMsg);
    setTimeout(() => {
      setTxSuccess(null);
      setTxError(null);
    }, 8000);
  };

  const handleCreateJob = async (data: JobFormData) => {
    if (!address) return;
    setIsSubmitting(true);
    setTxError(null);
    setTxSuccess(null);

    try {
      const budgetInStroops = BigInt(Math.floor(parseFloat(data.amount) * 10_000_000));
      const deadlineSec = BigInt(Math.floor(new Date(data.deadlineDate).getTime() / 1000));

      const args = [
        new Address(address).toScVal(),
        new Address(data.freelancer).toScVal(),
        new Address(data.token).toScVal(),
        nativeToScVal(budgetInStroops, { type: "i128" }),
        nativeToScVal(data.description, { type: "string" }),
        nativeToScVal(deadlineSec, { type: "u64" }),
      ];

      await callContractMethod(address, ESCROW_CONTRACT_ID, "create_job", args, sign);

      setTimedAlerts("Gig listing created successfully!", null);
      analytics.trackJobCreated(Date.now(), address, data.freelancer, data.amount);
      await refreshJobs();
    } catch (err) {
      captureException(err, "handleCreateJob");
      setTimedAlerts(null, err instanceof Error ? err.message : "Failed to create job.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFundJob = async (jobId: number) => {
    if (!address) return;
    setActiveJobId(jobId);
    setTxError(null);
    setTxSuccess(null);

    try {
      const args = [nativeToScVal(BigInt(jobId), { type: "u64" })];
      await callContractMethod(address, ESCROW_CONTRACT_ID, "fund_job", args, sign);
      setTimedAlerts(`Job #${jobId} funded and activated!`, null);
      analytics.trackJobFunded(jobId, address);
      await refreshJobs();
    } catch (err) {
      captureException(err, "handleFundJob");
      setTimedAlerts(null, err instanceof Error ? err.message : "Failed to fund job.");
    } finally {
      setActiveJobId(null);
    }
  };

  const handleCompleteJob = async (jobId: number) => {
    if (!address) return;
    setActiveJobId(jobId);
    setTxError(null);
    setTxSuccess(null);

    try {
      const args = [nativeToScVal(BigInt(jobId), { type: "u64" })];
      await callContractMethod(address, ESCROW_CONTRACT_ID, "complete_job", args, sign);
      setTimedAlerts(`Job #${jobId} completed. Payment released!`, null);
      analytics.trackJobCompleted(jobId, address);
      await refreshJobs();
    } catch (err) {
      captureException(err, "handleCompleteJob");
      setTimedAlerts(null, err instanceof Error ? err.message : "Failed to complete job.");
    } finally {
      setActiveJobId(null);
    }
  };

  const handleRefundJob = async (jobId: number) => {
    if (!address) return;
    setActiveJobId(jobId);
    setTxError(null);
    setTxSuccess(null);

    try {
      const args = [nativeToScVal(BigInt(jobId), { type: "u64" })];
      await callContractMethod(address, ESCROW_CONTRACT_ID, "refund_job", args, sign);
      setTimedAlerts(`Job #${jobId} refunded successfully.`, null);
      await refreshJobs();
    } catch (err) {
      captureException(err, "handleRefundJob");
      setTimedAlerts(null, err instanceof Error ? err.message : "Failed to request refund.");
    } finally {
      setActiveJobId(null);
    }
  };

  const handleRateJob = async (jobId: number, score: number) => {
    if (!address) return;
    setActiveJobId(jobId);
    setTxError(null);
    setTxSuccess(null);

    try {
      const args = [
        nativeToScVal(BigInt(jobId), { type: "u64" }),
        nativeToScVal(score, { type: "u32" }),
      ];
      await callContractMethod(address, ESCROW_CONTRACT_ID, "submit_rating", args, sign);
      setTimedAlerts(`Submitted rating of ${score} stars!`, null);
      analytics.trackRatingSubmitted(jobId, score);
      await refreshJobs();
    } catch (err) {
      captureException(err, "handleRateJob");
      setTimedAlerts(null, err instanceof Error ? err.message : "Failed to submit rating.");
    } finally {
      setActiveJobId(null);
    }
  };

  const isConfigured = ESCROW_CONTRACT_ID !== "";

  return (
    <div className="min-h-screen bg-ink-900 text-parchment-100 flex flex-col font-sans">
      {/* Header Navbar */}
      <Navbar
        address={wallet.address}
        isConnecting={wallet.isConnecting}
        isInstalled={!!wallet.isInstalled}
        error={wallet.error}
        connect={wallet.connect}
        disconnect={wallet.disconnect}
        onOpenOnboarding={() => setIsOnboardingOpen(true)}
        onToggleAdmin={() => setIsAdminOpen(!isAdminOpen)}
        isAdminOpen={isAdminOpen}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Global Config Check */}
        {!isConfigured && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-seal text-xs text-yellow-400 font-medium flex justify-between items-center">
            <span>
              ⚠️ <strong>Contracts Not Configured:</strong> The escrow contract ID is missing. Build & deploy using <code>deploy.sh</code> and write to <code>.env.local</code>.
            </span>
            <button
              onClick={() => setIsOnboardingOpen(true)}
              className="text-xs bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 font-bold px-3 py-1 rounded transition"
            >
              Onboarding Setup Guide →
            </button>
          </div>
        )}

        {/* Transaction Alerts */}
        {txSuccess && (
          <div className="bg-mint-500/10 border border-mint-500/30 p-4 rounded-seal text-sm text-mint-500 font-bold animate-fade-in shadow-lg">
            ✓ {txSuccess}
          </div>
        )}
        {txError && (
          <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-seal text-sm text-red-400 font-bold animate-fade-in shadow-lg">
            ✗ Error: {txError}
          </div>
        )}

        {/* Dynamic Main View: Admin Stats vs Escrow Marketplace */}
        {isAdminOpen ? (
          <Suspense fallback={<div className="text-center py-12 text-ink-400">Loading Telemetry Dashboard...</div>}>
            <AdminStats jobs={jobs} />
          </Suspense>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Post Gig Panel */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <CreateJobForm
                onSubmit={handleCreateJob}
                isSubmitting={isSubmitting}
                walletConnected={!!address}
              />

              <div className="bg-ink-800/20 border border-brass-500/5 p-5 rounded-seal text-xs text-ink-400 flex flex-col gap-2 font-medium">
                <span className="font-bold text-brass-500/80">Stellar Testnet Status:</span>
                <span className="break-all font-mono">RPC: {SOROBAN_RPC_URL}</span>
                <span className="break-all font-mono">
                  Escrow ID: {ESCROW_CONTRACT_ID || "Not Deployed"}
                </span>
              </div>
            </div>

            {/* Active Manifest Panel */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight text-parchment-200">
                  Active Gigs
                </h2>
                <button
                  onClick={refreshJobs}
                  className="text-xs font-semibold text-brass-400 hover:text-brass-300 transition"
                >
                  Refresh List
                </button>
              </div>

              {loading ? (
                <div className="flex flex-col gap-4">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="bg-ink-800/10 border border-brass-500/5 p-6 rounded-seal animate-pulse flex flex-col gap-3"
                    >
                      <div className="h-6 bg-ink-800 w-1/3 rounded"></div>
                      <div className="h-12 bg-ink-800 w-full rounded"></div>
                      <div className="h-4 bg-ink-800 w-2/3 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-seal text-center text-red-400 text-sm font-semibold">
                  {error}
                </div>
              ) : (
                <JobList
                  jobs={jobs}
                  walletAddress={address}
                  onFund={handleFundJob}
                  onComplete={handleCompleteJob}
                  onRefund={handleRefundJob}
                  onRate={handleRateJob}
                  activeActionJobId={activeJobId}
                />
              )}
            </div>
          </div>
        )}
      </main>

      {/* Floating In-App Feedback Widget */}
      <FeedbackWidget
        userAddress={address}
        onFeedbackSubmitted={() => {
          analytics.trackFeedbackSubmitted(5, 0);
        }}
      />

      {/* Lazy Loaded Onboarding Modal */}
      <Suspense fallback={null}>
        <OnboardingModal
          isOpen={isOnboardingOpen}
          onClose={() => setIsOnboardingOpen(false)}
          isWalletInstalled={!!wallet.isInstalled}
          isConnected={!!wallet.address}
          onConnectWallet={wallet.connect}
        />
      </Suspense>
    </div>
  );
}
