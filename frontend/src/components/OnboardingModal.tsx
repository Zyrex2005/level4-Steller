import React, { useState } from "react";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  isWalletInstalled: boolean;
  isConnected: boolean;
  onConnectWallet: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  isWalletInstalled,
  isConnected,
  onConnectWallet,
}) => {
  const [step, setStep] = useState(1);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-ink-800 border border-brass-500/30 rounded-seal max-w-lg w-full p-6 shadow-2xl flex flex-col gap-6 relative text-parchment-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-ink-400 hover:text-parchment-100 text-xl font-bold transition"
          aria-label="Close modal"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brass-500/10 border border-brass-500/30 flex items-center justify-center text-brass-400 font-bold text-lg">
            {step}
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-brass-400">
              {step === 1 && "Welcome to SkillEscrow"}
              {step === 2 && "Connect Freighter Wallet"}
              {step === 3 && "How Escrow & Reputation Work"}
            </h2>
            <p className="text-xs text-ink-400">Step {step} of 3 — Quick Setup Guide</p>
          </div>
        </div>

        {/* Step 1: Introduction */}
        {step === 1 && (
          <div className="flex flex-col gap-4 text-sm text-parchment-300">
            <p>
              SkillEscrow is a decentralized freelance marketplace on the Stellar network (Soroban) that holds buyer funds safely in smart contract escrow until delivery.
            </p>
            <div className="bg-ink-900/50 p-4 rounded-seal border border-brass-500/15 flex flex-col gap-2 text-xs">
              <div className="flex items-center gap-2 text-mint-400 font-semibold">
                <span>✓</span> Trustless Escrow Protection
              </div>
              <div className="flex items-center gap-2 text-mint-400 font-semibold">
                <span>✓</span> Immutable On-Chain Freelancer Reputation Scores
              </div>
              <div className="flex items-center gap-2 text-mint-400 font-semibold">
                <span>✓</span> Automated Timed Refunds & Dispute Guarding
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Wallet Setup & Network Check */}
        {step === 2 && (
          <div className="flex flex-col gap-4 text-sm text-parchment-300">
            <p>
              SkillEscrow requires the <strong>Freighter Wallet</strong> browser extension connected to the <strong>Stellar Testnet</strong> network.
            </p>

            {!isWalletInstalled ? (
              <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-seal text-xs text-yellow-300 flex flex-col gap-2">
                <span className="font-bold">⚠️ Freighter Wallet Not Detected</span>
                <span>Install Freighter to sign transactions and create jobs on Stellar Testnet.</span>
                <a
                  href="https://www.freighter.app/"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-center bg-brass-500 hover:bg-brass-400 text-ink-900 font-bold py-2 px-4 rounded transition text-xs"
                >
                  Download Freighter Extension ↗
                </a>
              </div>
            ) : isConnected ? (
              <div className="bg-mint-500/10 border border-mint-500/30 p-4 rounded-seal text-xs text-mint-400 font-semibold flex items-center gap-2">
                <span>✓</span> Freighter Wallet Connected Successfully!
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <button
                  onClick={onConnectWallet}
                  className="w-full bg-brass-500 hover:bg-brass-400 text-ink-900 font-bold py-2.5 px-4 rounded transition text-sm shadow-md"
                >
                  Connect Freighter Wallet Now
                </button>
                <p className="text-3xs text-ink-400 text-center font-mono">
                  Make sure your wallet network is set to <strong>Testnet</strong> in Freighter settings.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 3: How it Works */}
        {step === 3 && (
          <div className="flex flex-col gap-4 text-sm text-parchment-300">
            <ol className="list-decimal list-inside space-y-2 text-xs">
              <li>
                <strong>Post a Gig:</strong> Specify the freelancer address, token budget, description, and deadline.
              </li>
              <li>
                <strong>Fund Escrow:</strong> Deposit tokens into the smart contract to activate the gig.
              </li>
              <li>
                <strong>Complete & Rate:</strong> Upon delivery, release payment to the freelancer and leave a 1-5 star score that updates their on-chain reputation score automatically.
              </li>
            </ol>
          </div>
        )}

        {/* Footer Navigation */}
        <div className="flex justify-between items-center pt-4 border-t border-brass-500/15">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="text-xs font-semibold text-ink-400 hover:text-parchment-100 transition"
            >
              ← Back
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="bg-brass-500 hover:bg-brass-400 text-ink-900 font-bold py-2 px-5 rounded text-xs transition"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={onClose}
              className="bg-mint-500 hover:bg-mint-400 text-ink-900 font-bold py-2 px-5 rounded text-xs transition"
            >
              Get Started 🚀
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
