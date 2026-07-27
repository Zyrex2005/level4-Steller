import React, { useState } from "react";
import { WalletButton } from "./WalletButton";

interface NavbarProps {
  address: string | null;
  isConnecting: boolean;
  isInstalled: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  onOpenOnboarding: () => void;
  onToggleAdmin: () => void;
  isAdminOpen: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  address,
  isConnecting,
  isInstalled,
  error,
  connect,
  disconnect,
  onOpenOnboarding,
  onToggleAdmin,
  isAdminOpen,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="border-b border-brass-500/15 bg-ink-900/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black tracking-tight text-brass-400 font-serif">
            SkillEscrow
          </h1>
          <span className="bg-brass-500/10 text-brass-400 border border-brass-500/25 px-2 py-0.5 rounded-full text-3xs font-bold uppercase tracking-wider font-mono">
            Testnet
          </span>
        </div>

        {/* Desktop Navigation Links & Wallet */}
        <div className="hidden md:flex items-center gap-4">
          <button
            onClick={onOpenOnboarding}
            className="text-xs font-semibold text-parchment-300 hover:text-brass-400 transition"
          >
            📖 Guide
          </button>

          <button
            onClick={onToggleAdmin}
            className={`text-xs font-semibold px-3 py-1.5 rounded-seal border transition ${
              isAdminOpen
                ? "bg-brass-500/20 text-brass-300 border-brass-500/40"
                : "border-brass-500/15 text-parchment-300 hover:text-brass-400"
            }`}
          >
            📊 {isAdminOpen ? "Back to App" : "Admin Stats"}
          </button>

          <WalletButton
            address={address}
            isConnecting={isConnecting}
            isInstalled={isInstalled}
            error={error}
            connect={connect}
            disconnect={disconnect}
          />
        </div>

        {/* Mobile Hamburger Button */}
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-brass-400 hover:text-brass-300 focus:outline-none text-xl"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-brass-500/15 bg-ink-900 px-4 py-4 flex flex-col gap-3 animate-fade-in">
          <button
            onClick={() => {
              onOpenOnboarding();
              setMobileMenuOpen(false);
            }}
            className="text-left text-sm font-semibold text-parchment-200 py-2 border-b border-brass-500/10"
          >
            📖 User Onboarding Guide
          </button>

          <button
            onClick={() => {
              onToggleAdmin();
              setMobileMenuOpen(false);
            }}
            className="text-left text-sm font-semibold text-brass-400 py-2 border-b border-brass-500/10"
          >
            📊 {isAdminOpen ? "Back to Main App" : "Admin Stats Dashboard"}
          </button>

          <div className="pt-2">
            <WalletButton
              address={address}
              isConnecting={isConnecting}
              isInstalled={isInstalled}
              error={error}
              connect={connect}
              disconnect={disconnect}
            />
          </div>
        </div>
      )}
    </header>
  );
};
