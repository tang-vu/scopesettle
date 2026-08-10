"use client";

import {
  agenticCommerceAbi,
  scopeSettleEvaluatorAbi,
} from "@scopesettle/shared";
import { AlertCircle, Gavel, GitPullRequest, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getAddress, keccak256, toBytes } from "viem";
import {
  useConnection,
  usePublicClient,
  useSignMessage,
  useSwitchChain,
  useWriteContract,
} from "wagmi";

import { authenticateWallet } from "@/lib/wallet-auth";

type Verdict = {
  jobId: string;
  deliverableHash: `0x${string}`;
  reportHash: `0x${string}`;
  score: number;
  confidence: number;
  outcome: number;
  nonce: string;
  deadline: string;
  signature: `0x${string}`;
};

type Properties = {
  readonly chainId: number;
  readonly jobId: string;
  readonly status: number;
  readonly provider: `0x${string}`;
  readonly client: `0x${string}`;
  readonly reviewer: `0x${string}`;
  readonly expiredAt: number;
  readonly proposal?: {
    challengeUntil: number;
    challenged: boolean;
    finalized: boolean;
    outcome: number;
  };
  readonly signedVerdict?: Verdict;
};

export function JobActions(properties: Properties) {
  const connection = useConnection();
  const publicClient = usePublicClient();
  const router = useRouter();
  const { signMessageAsync } = useSignMessage();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const [pullRequestUrl, setPullRequestUrl] = useState("");
  const [challengeReason, setChallengeReason] = useState("");
  const [resolutionReason, setResolutionReason] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const commerce = process.env.NEXT_PUBLIC_AGENTIC_COMMERCE_ADDRESS as
    string | undefined;
  const evaluator = process.env.NEXT_PUBLIC_SCOPESETTLE_EVALUATOR_ADDRESS as
    string | undefined;
  const address = connection.address;
  const isProvider =
    address?.toLowerCase() === properties.provider.toLowerCase();
  const isParty =
    isProvider || address?.toLowerCase() === properties.client.toLowerCase();
  const isClient = address?.toLowerCase() === properties.client.toLowerCase();
  const isReviewer =
    address?.toLowerCase() === properties.reviewer.toLowerCase();

  async function prepare(): Promise<void> {
    if (!address || !commerce || !evaluator) {
      throw new Error("Connect a wallet and configure the deployment first.");
    }
    if (connection.chainId !== properties.chainId) {
      await switchChainAsync({ chainId: properties.chainId as 1952 | 196 });
    }
  }

  async function authenticate(): Promise<void> {
    if (!address) throw new Error("Connect the authorized wallet first.");
    await authenticateWallet({
      address,
      chainId: properties.chainId,
      signMessage: (message) => signMessageAsync({ message }),
    });
  }

  async function act(label: string, operation: () => Promise<void>) {
    setError(null);
    setPending(label);
    try {
      await prepare();
      await operation();
      router.refresh();
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "The operation failed.";
      setError(
        /rejected|denied|cancelled/iu.test(message)
          ? "The wallet request was rejected; no subsequent operation was sent."
          : message,
      );
    } finally {
      setPending(null);
    }
  }

  async function submitDeliverable() {
    await act("Pinning pull request", async () => {
      await authenticate();
      const preparedResponse = await fetch(
        `/api/jobs/${properties.chainId}/${properties.jobId}/deliverable/prepare`,
        {
          body: JSON.stringify({ pullRequestUrl }),
          headers: { "content-type": "application/json" },
          method: "POST",
        },
      );
      const prepared = (await preparedResponse.json()) as {
        deliverable?: unknown;
        deliverableHash?: `0x${string}`;
        error?: string;
      };
      if (
        !preparedResponse.ok ||
        !prepared.deliverableHash ||
        !prepared.deliverable
      ) {
        throw new Error(
          prepared.error ?? "The pull request could not be pinned.",
        );
      }
      setPending("Submitting exact commit");
      const transactionHash = await writeContractAsync({
        abi: agenticCommerceAbi,
        address: getAddress(commerce!),
        args: [BigInt(properties.jobId), prepared.deliverableHash, "0x"],
        chainId: properties.chainId as 1952 | 196,
        functionName: "submit",
      });
      await publicClient!.waitForTransactionReceipt({ hash: transactionHash });
      setPending("Indexing pinned commitment");
      const saveResponse = await fetch(
        `/api/jobs/${properties.chainId}/${properties.jobId}/deliverable`,
        {
          body: JSON.stringify({
            deliverable: prepared.deliverable,
            transactionHash,
          }),
          headers: { "content-type": "application/json" },
          method: "POST",
        },
      );
      if (!saveResponse.ok) {
        const result = (await saveResponse.json()) as { error?: string };
        throw new Error(
          result.error ?? "The onchain commit could not be indexed.",
        );
      }
    });
  }

  async function evaluate() {
    await act("Evaluating pinned commit", async () => {
      await authenticate();
      const response = await fetch(
        `/api/jobs/${properties.chainId}/${properties.jobId}/evaluate`,
        { method: "POST" },
      );
      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error ?? "Evaluation failed closed.");
      }
    });
  }

  async function propose() {
    if (!properties.signedVerdict) return;
    await act("Proposing signed verdict", async () => {
      const verdict = properties.signedVerdict!;
      const transactionHash = await writeContractAsync({
        abi: scopeSettleEvaluatorAbi,
        address: getAddress(evaluator!),
        args: [
          {
            ...verdict,
            deadline: BigInt(verdict.deadline),
            jobId: BigInt(verdict.jobId),
            nonce: BigInt(verdict.nonce),
          },
          verdict.signature,
        ],
        chainId: properties.chainId as 1952 | 196,
        functionName: "proposeVerdict",
      });
      await publicClient!.waitForTransactionReceipt({ hash: transactionHash });
    });
  }

  async function challenge() {
    await act("Challenging verdict", async () => {
      if (challengeReason.trim().length < 10) {
        throw new Error("Describe the challenge in at least ten characters.");
      }
      const transactionHash = await writeContractAsync({
        abi: scopeSettleEvaluatorAbi,
        address: getAddress(evaluator!),
        args: [
          BigInt(properties.jobId),
          keccak256(toBytes(challengeReason.trim())),
        ],
        chainId: properties.chainId as 1952 | 196,
        functionName: "challenge",
      });
      await publicClient!.waitForTransactionReceipt({ hash: transactionHash });
    });
  }

  async function finalize() {
    await act("Finalizing settlement", async () => {
      const transactionHash = await writeContractAsync({
        abi: scopeSettleEvaluatorAbi,
        address: getAddress(evaluator!),
        args: [BigInt(properties.jobId)],
        chainId: properties.chainId as 1952 | 196,
        functionName: "finalize",
      });
      await publicClient!.waitForTransactionReceipt({ hash: transactionHash });
    });
  }

  async function refund() {
    await act("Claiming expiry refund", async () => {
      const transactionHash = await writeContractAsync({
        abi: agenticCommerceAbi,
        address: getAddress(commerce!),
        args: [BigInt(properties.jobId)],
        chainId: properties.chainId as 1952 | 196,
        functionName: "claimRefund",
      });
      await publicClient!.waitForTransactionReceipt({ hash: transactionHash });
    });
  }

  async function rejectOpenJob() {
    await act("Rejecting open job", async () => {
      if (resolutionReason.trim().length < 10) {
        throw new Error("Describe the rejection in at least ten characters.");
      }
      const transactionHash = await writeContractAsync({
        abi: agenticCommerceAbi,
        address: getAddress(commerce!),
        args: [
          BigInt(properties.jobId),
          keccak256(toBytes(resolutionReason.trim())),
          "0x",
        ],
        chainId: properties.chainId as 1952 | 196,
        functionName: "reject",
      });
      await publicClient!.waitForTransactionReceipt({ hash: transactionHash });
    });
  }

  async function resolveManualReview(approved: boolean) {
    await act(
      approved ? "Approving manual review" : "Rejecting manual review",
      async () => {
        if (resolutionReason.trim().length < 10) {
          throw new Error("Record a review reason of at least ten characters.");
        }
        const transactionHash = await writeContractAsync({
          abi: scopeSettleEvaluatorAbi,
          address: getAddress(evaluator!),
          args: [
            BigInt(properties.jobId),
            approved,
            keccak256(toBytes(resolutionReason.trim())),
          ],
          chainId: properties.chainId as 1952 | 196,
          functionName: "resolveManualReview",
        });
        await publicClient!.waitForTransactionReceipt({
          hash: transactionHash,
        });
      },
    );
  }

  const [now] = useState(() => Math.floor(Date.now() / 1_000));
  return (
    <section className="panel content-block" aria-live="polite">
      <h2>Available actions</h2>
      {!address ? (
        <p>Connect the relevant wallet to reveal role-authorized actions.</p>
      ) : null}
      {properties.status === 0 && isClient ? (
        <div className="field">
          <label htmlFor="open-rejection-reason">Cancellation reason</label>
          <textarea
            className="textarea"
            id="open-rejection-reason"
            onChange={(event) => setResolutionReason(event.target.value)}
            value={resolutionReason}
          />
          <button
            className="button button-secondary button-wide"
            disabled={Boolean(pending)}
            onClick={rejectOpenJob}
            type="button"
          >
            Reject unfunded job
          </button>
        </div>
      ) : null}
      {properties.status === 1 && isProvider ? (
        <div className="field">
          <label htmlFor="pull-request-url">Public GitHub pull request</label>
          <input
            className="input"
            id="pull-request-url"
            onChange={(event) => setPullRequestUrl(event.target.value)}
            placeholder="https://github.com/org/repository/pull/12"
            type="url"
            value={pullRequestUrl}
          />
          <button
            className="button button-primary button-wide"
            disabled={Boolean(pending) || !pullRequestUrl}
            onClick={submitDeliverable}
            type="button"
          >
            <GitPullRequest aria-hidden="true" size={15} />{" "}
            {pending ?? "Pin and submit commit"}
          </button>
        </div>
      ) : null}
      {properties.status === 2 && isParty && !properties.signedVerdict ? (
        <button
          className="button button-primary button-wide"
          disabled={Boolean(pending)}
          onClick={evaluate}
          type="button"
        >
          <RefreshCw aria-hidden="true" size={15} />{" "}
          {pending ?? "Run evidence evaluation"}
        </button>
      ) : null}
      {properties.status === 2 &&
      properties.signedVerdict &&
      !properties.proposal ? (
        <button
          className="button button-primary button-wide"
          disabled={Boolean(pending) || !address}
          onClick={propose}
          type="button"
        >
          <Gavel aria-hidden="true" size={15} />{" "}
          {pending ?? "Propose signed verdict"}
        </button>
      ) : null}
      {properties.proposal &&
      !properties.proposal.finalized &&
      !properties.proposal.challenged &&
      isParty &&
      now < properties.proposal.challengeUntil ? (
        <div className="field">
          <label htmlFor="challenge-reason">Challenge reason</label>
          <textarea
            className="textarea"
            id="challenge-reason"
            onChange={(event) => setChallengeReason(event.target.value)}
            value={challengeReason}
          />
          <button
            className="button button-secondary button-wide"
            disabled={Boolean(pending)}
            onClick={challenge}
            type="button"
          >
            Challenge before deadline
          </button>
        </div>
      ) : null}
      {properties.proposal &&
      !properties.proposal.finalized &&
      !properties.proposal.challenged &&
      properties.proposal.outcome !== 2 &&
      now >= properties.proposal.challengeUntil ? (
        <button
          className="button button-primary button-wide"
          disabled={Boolean(pending) || !address}
          onClick={finalize}
          type="button"
        >
          Finalize permissionlessly
        </button>
      ) : null}
      {properties.proposal &&
      !properties.proposal.finalized &&
      (properties.proposal.challenged || properties.proposal.outcome === 2) &&
      isReviewer ? (
        <div className="field">
          <label htmlFor="manual-review-reason">Manual review decision</label>
          <textarea
            className="textarea"
            id="manual-review-reason"
            onChange={(event) => setResolutionReason(event.target.value)}
            placeholder="Cite the evidence and explain the final decision."
            value={resolutionReason}
          />
          <div className="action-pair">
            <button
              className="button button-primary"
              disabled={Boolean(pending)}
              onClick={() => resolveManualReview(true)}
              type="button"
            >
              Approve and release
            </button>
            <button
              className="button button-secondary"
              disabled={Boolean(pending)}
              onClick={() => resolveManualReview(false)}
              type="button"
            >
              Reject and refund
            </button>
          </div>
        </div>
      ) : null}
      {[1, 2].includes(properties.status) && now >= properties.expiredAt ? (
        <button
          className="button button-secondary button-wide"
          disabled={Boolean(pending) || !address}
          onClick={refund}
          type="button"
        >
          Claim expiry refund
        </button>
      ) : null}
      {error ? (
        <div className="notice" role="alert">
          <AlertCircle aria-hidden="true" size={15} /> <span>{error}</span>
        </div>
      ) : null}
      {pending ? (
        <p>{pending}. Confirm only the expected chain, contract, and method.</p>
      ) : null}
    </section>
  );
}
