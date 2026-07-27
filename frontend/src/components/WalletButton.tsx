import { useWallet } from "../hooks/useWallet";

function truncateAddress(addr: string) {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

type WalletButtonProps = {
  address?: string | null;
  isConnecting?: boolean;
  isInstalled?: boolean | null;
  error?: string | null;
  connect?: () => Promise<void>;
  disconnect?: () => void;
};

export function WalletButton(props: WalletButtonProps) {
  const hookWallet = useWallet();

  const address = props.address !== undefined ? props.address : hookWallet.address;
  const isConnecting = props.isConnecting !== undefined ? props.isConnecting : hookWallet.isConnecting;
  const isInstalled = props.isInstalled !== undefined ? props.isInstalled : hookWallet.isInstalled;
  const error = props.error !== undefined ? props.error : hookWallet.error;
  const connect = props.connect !== undefined ? props.connect : hookWallet.connect;
  const disconnect = props.disconnect !== undefined ? props.disconnect : hookWallet.disconnect;

  if (isInstalled === false) {
    return (
      <a
        href="https://www.freighter.app/"
        target="_blank"
        rel="noreferrer"
        className="focus-ring border border-brass-500/40 px-4 py-2 text-sm rounded-seal font-medium text-parchment-200 transition hover:border-brass-500 hover:text-parchment-100"
      >
        Install Freighter to connect
      </a>
    );
  }

  if (address) {
    return (
      <button
        onClick={disconnect}
        className="focus-ring border border-mint-500/40 bg-mint-500/10 px-4 py-2 font-mono text-sm rounded-seal text-mint-500 transition hover:bg-mint-500/20"
        aria-label={`Connected as ${address}. Click to disconnect.`}
      >
        {truncateAddress(address)}
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={connect}
        disabled={isConnecting}
        className="focus-ring bg-brass-500 px-5 py-2 text-sm rounded-seal font-semibold text-ink-900 transition hover:bg-brass-400 disabled:cursor-wait disabled:opacity-60"
      >
        {isConnecting ? "Connecting…" : "Connect wallet"}
      </button>
      {error && (
        <p className="max-w-[250px] text-right text-xs text-red-400 font-medium">
          {error}
        </p>
      )}
    </div>
  );
}
