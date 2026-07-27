import { useCallback, useEffect, useState } from "react";
import {
  isConnected,
  requestAccess,
  signTransaction,
} from "@stellar/freighter-api";

export type WalletState = {
  address: string | null;
  isConnecting: boolean;
  isInstalled: boolean | null;
  error: string | null;
};

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    isConnecting: false,
    isInstalled: null,
    error: null,
  });

  useEffect(() => {
    isConnected()
      .then((res) => {
        const installed = typeof res === "boolean" ? res : (res && (res as any).isConnected);
        setState((s) => ({ ...s, isInstalled: !!installed }));
      })
      .catch(() => setState((s) => ({ ...s, isInstalled: false })));
  }, []);

  const connect = useCallback(async () => {
    setState((s) => ({ ...s, isConnecting: true, error: null }));
    try {
      const result = await requestAccess();
      
      let address: string | null = null;
      if (typeof result === "string") {
        address = result;
      } else if (result && typeof result === "object") {
        if ("error" in result && result.error) {
          throw new Error(String(result.error));
        }
        address = (result as any).address || null;
      }
      
      if (!address) {
        throw new Error("No address returned from Freighter.");
      }
      
      setState((s) => ({ ...s, address, isConnecting: false }));
    } catch (err) {
      console.error("[useWallet] Connect failed:", err);
      setState((s) => ({
        ...s,
        isConnecting: false,
        error:
          err instanceof Error
            ? err.message
            : "Couldn't connect to Freighter. Is the extension installed?",
      }));
    }
  }, []);

  const disconnect = useCallback(() => {
    setState((s) => ({ ...s, address: null, error: null }));
  }, []);

  const sign = useCallback(async (xdrToSign: string, networkPassphrase: string) => {
    const result = await signTransaction(xdrToSign, { networkPassphrase });
    if (typeof result === "string") {
      return result;
    }
    if (result && typeof result === "object") {
      if ("error" in result && result.error) {
        throw new Error(String(result.error));
      }
      if ("signedTxXdr" in result && (result as any).signedTxXdr) {
        return (result as any).signedTxXdr as string;
      }
    }
    throw new Error("Failed to sign transaction with Freighter.");
  }, []);

  return { ...state, connect, disconnect, sign };
}
