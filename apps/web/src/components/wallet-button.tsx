"use client";

import { ChevronDown, CircleAlert, LogOut, Wallet } from "lucide-react";
import { useState } from "react";
import {
  useConnect,
  useConnection,
  useDisconnect,
  useSwitchChain,
} from "wagmi";

import { shortAddress } from "@/lib/format";

const TARGET_CHAIN = Number(
  process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID || 1952,
) as 1952 | 196;
const TARGET_LABEL = TARGET_CHAIN === 196 ? "Mainnet" : "Testnet";

export function WalletButton() {
  const connection = useConnection();
  const { connectors, connect, error: connectError, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const [open, setOpen] = useState(false);

  if (connection.status !== "connected") {
    const connector = connectors[0];
    return (
      <div className="wallet-wrap">
        <button
          className="button button-primary button-small"
          disabled={isPending}
          onClick={() => connect({ connector })}
          type="button"
        >
          <Wallet aria-hidden="true" size={15} />
          {isPending ? "Check wallet" : "Connect wallet"}
        </button>
        {connectError ? (
          <p className="wallet-error" role="alert">
            {connectError.message.includes("rejected")
              ? "Connection was rejected. Reopen your wallet to try again."
              : "Wallet connection failed. Check that an EVM wallet is unlocked."}
          </p>
        ) : null}
      </div>
    );
  }

  if (connection.chainId !== TARGET_CHAIN) {
    return (
      <button
        className="button button-warning button-small"
        disabled={isSwitching}
        onClick={() => switchChain({ chainId: TARGET_CHAIN })}
        type="button"
      >
        <CircleAlert aria-hidden="true" size={15} />
        {isSwitching ? "Switching…" : `Switch to ${TARGET_LABEL}`}
      </button>
    );
  }

  return (
    <div className="wallet-wrap">
      <button
        aria-expanded={open}
        className="button button-quiet button-small wallet-address"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span className="live-dot" />
        {shortAddress(connection.address)}
        <ChevronDown aria-hidden="true" size={14} />
      </button>
      {open ? (
        <div className="wallet-menu">
          <p>X Layer {TARGET_LABEL}</p>
          <button onClick={() => disconnect()} type="button">
            <LogOut aria-hidden="true" size={14} /> Disconnect
          </button>
        </div>
      ) : null}
    </div>
  );
}
