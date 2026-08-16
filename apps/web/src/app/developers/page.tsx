import type { Metadata } from "next";

import { DeveloperConsole } from "@/components/developer-console";
import { Providers } from "@/components/providers";
import { WalletButton } from "@/components/wallet-button";

export const metadata: Metadata = {
  title: "Developer console",
  description:
    "Manage ScopeSettle organizations, scoped API keys, signed webhooks, deliveries, and audit events.",
};

export default function DevelopersPage() {
  return (
    <>
      <header className="page-header">
        <div className="shell page-header-row">
          <div>
            <p className="eyebrow">Integration control plane</p>
            <h1>Developer console</h1>
            <p>
              Issue scoped credentials, subscribe to signed job events, and
              inspect delivery evidence without exposing wallet secrets.
            </p>
          </div>
        </div>
      </header>
      <Providers>
        <div className="shell page-wallet-row">
          <span>Wallet-owned organizations</span>
          <WalletButton />
        </div>
        <DeveloperConsole />
      </Providers>
    </>
  );
}
