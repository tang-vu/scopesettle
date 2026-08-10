import { notFound } from "next/navigation";

import { JobActions } from "@/components/job-actions";
import { Providers } from "@/components/providers";
import { WalletButton } from "@/components/wallet-button";

const CLIENT = "0x000000000000000000000000000000000000cafe" as const;
const PROVIDER = "0x000000000000000000000000000000000000beef" as const;
const REVIEWER = "0x0000000000000000000000000000000000004444" as const;

type Properties = {
  readonly searchParams: Promise<{ stage?: string }>;
};

export default async function ActionsHarness({ searchParams }: Properties) {
  if (process.env.SCOPESETTLE_E2E !== "1") notFound();
  const { stage = "open" } = await searchParams;
  const status = stage === "open" ? 0 : stage === "funded" ? 1 : 2;
  const proposal = ["proposed", "finalizable", "challenged", "manual"].includes(
    stage,
  )
    ? {
        challenged: stage === "challenged",
        challengeUntil: stage === "finalizable" ? 1 : 4_102_444_800,
        finalized: false,
        outcome: stage === "manual" ? 2 : 0,
      }
    : undefined;
  const signedVerdict =
    stage === "signed"
      ? {
          confidence: 9_100,
          deadline: "4102444800",
          deliverableHash: `0x${"44".repeat(32)}` as `0x${string}`,
          jobId: "7",
          nonce: "17",
          outcome: 0,
          reportHash: `0x${"55".repeat(32)}` as `0x${string}`,
          score: 9_200,
          signature: `0x${"66".repeat(65)}` as `0x${string}`,
        }
      : undefined;

  return (
    <div className="shell" style={{ maxWidth: 680, paddingBlock: 80 }}>
      <p className="eyebrow">Automated lifecycle harness</p>
      <h1>Wallet action state: {stage}</h1>
      <p>
        This route exists only while the isolated Playwright server sets
        SCOPESETTLE_E2E=1; production responds with 404.
      </p>
      <Providers>
        <div className="page-wallet-row">
          <span>Harness wallet</span>
          <WalletButton />
        </div>
        <JobActions
          chainId={1952}
          client={CLIENT}
          expiredAt={stage === "expired" ? 1 : 4_102_444_800}
          jobId="7"
          {...(proposal ? { proposal } : {})}
          provider={PROVIDER}
          reviewer={REVIEWER}
          {...(signedVerdict ? { signedVerdict } : {})}
          status={status}
        />
      </Providers>
    </div>
  );
}
