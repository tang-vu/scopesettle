"use client";

import {
  agenticCommerceAbi,
  erc20Abi,
  explorerTransactionUrl,
  hashCanonicalJson,
  jobSpecificationSchema,
} from "@scopesettle/shared";
import { CircleAlert, FileLock2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { getAddress, parseEventLogs, parseUnits } from "viem";
import {
  useConnection,
  usePublicClient,
  useSignMessage,
  useSwitchChain,
  useWriteContract,
} from "wagmi";

import { authenticateWallet } from "@/lib/wallet-auth";

import { Status } from "./status";

type CriterionDraft = {
  id: string;
  title: string;
  description: string;
  weight: number;
  requiredFiles: string;
  requiresPassingCi: boolean;
};

type FundingProgress = {
  chainId: number;
  client: `0x${string}`;
  commerce: `0x${string}`;
  specificationHash: `0x${string}`;
  jobId: string;
  createHash: `0x${string}`;
  metadataSaved: boolean;
  budgetSet: boolean;
  approvalConfirmed: boolean;
  funded: boolean;
};

function readFundingProgress(
  storageKey: string,
  specificationHash: `0x${string}`,
  expectedClient: `0x${string}`,
  expectedChainId: number,
  expectedCommerce: `0x${string}`,
): FundingProgress | null {
  try {
    const value = JSON.parse(
      localStorage.getItem(storageKey) ?? "null",
    ) as Partial<FundingProgress> | null;
    if (
      !value ||
      value.specificationHash !== specificationHash ||
      value.client?.toLowerCase() !== expectedClient.toLowerCase() ||
      value.chainId !== expectedChainId ||
      value.commerce?.toLowerCase() !== expectedCommerce.toLowerCase() ||
      typeof value.jobId !== "string" ||
      !/^\d+$/u.test(value.jobId) ||
      typeof value.createHash !== "string" ||
      !/^0x[\da-fA-F]{64}$/u.test(value.createHash)
    ) {
      return null;
    }
    return {
      approvalConfirmed: value.approvalConfirmed === true,
      budgetSet: value.budgetSet === true,
      chainId: expectedChainId,
      client: expectedClient,
      commerce: expectedCommerce,
      createHash: value.createHash as `0x${string}`,
      funded: value.funded === true,
      jobId: value.jobId,
      metadataSaved: value.metadataSaved === true,
      specificationHash,
    };
  } catch {
    return null;
  }
}

const defaultCriteria: CriterionDraft[] = [
  {
    id: "requested-behavior",
    title: "Requested behavior is implemented",
    description:
      "The pull request implements the behavior described in the scope without bypasses.",
    weight: 50,
    requiredFiles: "",
    requiresPassingCi: true,
  },
  {
    id: "regression-tests",
    title: "Regression tests prove the change",
    description:
      "Focused tests fail without the change and cover success and meaningful failure paths.",
    weight: 30,
    requiredFiles: "",
    requiresPassingCi: true,
  },
  {
    id: "quality-security",
    title: "Quality and security constraints",
    description:
      "The change follows repository conventions and does not introduce an obvious security issue.",
    weight: 20,
    requiredFiles: "",
    requiresPassingCi: false,
  },
];

function defaultExpiry(): string {
  const date = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  return date.toISOString().slice(0, 16);
}

export function JobCreateForm() {
  const connection = useConnection();
  const router = useRouter();
  const publicClient = usePublicClient();
  const { signMessageAsync } = useSignMessage();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const [title, setTitle] = useState("");
  const [scope, setScope] = useState("");
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [issueUrl, setIssueUrl] = useState("");
  const [provider, setProvider] = useState("");
  const [budget, setBudget] = useState("500");
  const [expiresAt, setExpiresAt] = useState(defaultExpiry);
  const [minimumPassingScore, setMinimumPassingScore] = useState(80);
  const [minimumConfidence, setMinimumConfidence] = useState(75);
  const [challengeHours, setChallengeHours] = useState(24);
  const [criteria, setCriteria] = useState<CriterionDraft[]>(defaultCriteria);
  const [reviewing, setReviewing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [transactionState, setTransactionState] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fundingProgress, setFundingProgress] =
    useState<FundingProgress | null>(null);

  const weightTotal = useMemo(
    () =>
      criteria.reduce(
        (total, criterion) => total + Number(criterion.weight || 0),
        0,
      ),
    [criteria],
  );

  const parsed = useMemo(() => {
    let baseUnits = "";
    try {
      baseUnits = parseUnits(budget || "0", 6).toString();
    } catch {
      baseUnits = "invalid";
    }

    return jobSpecificationSchema.safeParse({
      schemaVersion: "1.0.0",
      title,
      scope,
      repositoryUrl,
      ...(issueUrl ? { issueUrl } : {}),
      provider,
      budget: baseUnits,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : "",
      minimumPassingScore,
      minimumConfidence,
      challengeWindowSeconds: challengeHours * 60 * 60,
      criteria: criteria.map((criterion) => ({
        id: criterion.id,
        title: criterion.title,
        description: criterion.description,
        weight: Number(criterion.weight),
        requiredFiles: criterion.requiredFiles
          .split(",")
          .map((file) => file.trim())
          .filter(Boolean),
        requiresPassingCi: criterion.requiresPassingCi,
      })),
    });
  }, [
    budget,
    challengeHours,
    criteria,
    expiresAt,
    issueUrl,
    minimumConfidence,
    minimumPassingScore,
    provider,
    repositoryUrl,
    scope,
    title,
  ]);

  const hashes = parsed.success
    ? {
        specification: hashCanonicalJson(parsed.data),
        rubric: hashCanonicalJson(parsed.data.criteria),
      }
    : null;

  const deploymentReady = Boolean(
    process.env.NEXT_PUBLIC_AGENTIC_COMMERCE_ADDRESS &&
    process.env.NEXT_PUBLIC_SCOPESETTLE_EVALUATOR_ADDRESS &&
    process.env.NEXT_PUBLIC_PAYMENT_TOKEN_ADDRESS,
  );
  const targetChainId = Number(
    process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID || 1952,
  );

  function updateCriterion(index: number, update: Partial<CriterionDraft>) {
    setCriteria((current) =>
      current.map((criterion, criterionIndex) =>
        criterionIndex === index ? { ...criterion, ...update } : criterion,
      ),
    );
    setReviewing(false);
  }

  function review() {
    if (!parsed.success) {
      setErrors(parsed.error.issues.map((issue) => issue.message));
      setReviewing(false);
      return;
    }
    if (new Date(parsed.data.expiresAt).getTime() <= Date.now()) {
      setErrors(["Expiry must be in the future."]);
      setReviewing(false);
      return;
    }
    if (
      new Date(parsed.data.expiresAt).getTime() <=
      Date.now() + (parsed.data.challengeWindowSeconds + 10 * 60) * 1_000
    ) {
      setErrors([
        "Expiry must leave the full challenge window plus ten minutes for evaluation.",
      ]);
      setReviewing(false);
      return;
    }
    setErrors([]);
    setReviewing(true);
  }

  async function createAndFund() {
    if (!parsed.success || !hashes || !deploymentReady || !connection.address)
      return;
    const commerce = process.env.NEXT_PUBLIC_AGENTIC_COMMERCE_ADDRESS as
      string | undefined;
    const evaluator = process.env.NEXT_PUBLIC_SCOPESETTLE_EVALUATOR_ADDRESS as
      string | undefined;
    const paymentToken = process.env.NEXT_PUBLIC_PAYMENT_TOKEN_ADDRESS as
      string | undefined;
    if (!commerce || !evaluator || !paymentToken) return;
    const storageKey = [
      "scopesettle-funding",
      targetChainId,
      commerce.toLowerCase(),
      connection.address.toLowerCase(),
      hashes.specification,
    ].join(":");
    setSubmitting(true);
    setErrors([]);
    try {
      if (connection.chainId !== targetChainId) {
        setTransactionState("Switching to X Layer Testnet");
        await switchChainAsync({ chainId: targetChainId as 1952 | 196 });
      }
      setTransactionState("Authenticating immutable metadata");
      await authenticateWallet({
        address: connection.address,
        chainId: targetChainId,
        signMessage: (message) => signMessageAsync({ message }),
      });
      const amount = BigInt(parsed.data.budget);
      let progress =
        fundingProgress?.client.toLowerCase() ===
          connection.address.toLowerCase() &&
        fundingProgress.chainId === targetChainId &&
        fundingProgress.commerce.toLowerCase() === commerce.toLowerCase() &&
        fundingProgress.specificationHash === hashes.specification
          ? fundingProgress
          : readFundingProgress(
              storageKey,
              hashes.specification,
              connection.address,
              targetChainId,
              getAddress(commerce),
            );
      const remember = (update: Partial<FundingProgress>) => {
        if (!progress) return;
        progress = { ...progress, ...update };
        localStorage.setItem(storageKey, JSON.stringify(progress));
        setFundingProgress(progress);
      };
      if (progress) {
        const resumedProgress = progress;
        setTransactionState("Verifying the saved onchain checkpoint");
        const [createReceipt, resumedJob] = await Promise.all([
          publicClient.getTransactionReceipt({
            hash: resumedProgress.createHash,
          }),
          publicClient.readContract({
            abi: agenticCommerceAbi,
            address: getAddress(commerce),
            args: [BigInt(resumedProgress.jobId)],
            functionName: "getJob",
          }),
        ]);
        const created = parseEventLogs({
          abi: agenticCommerceAbi,
          eventName: "JobCreated",
          logs: createReceipt.logs,
          strict: true,
        }).find((event) => event.args.jobId === BigInt(resumedProgress.jobId));
        const checkpointMatches =
          createReceipt.to?.toLowerCase() === commerce.toLowerCase() &&
          created?.args.client.toLowerCase() ===
            connection.address.toLowerCase() &&
          created.args.provider.toLowerCase() ===
            parsed.data.provider.toLowerCase() &&
          created.args.evaluator.toLowerCase() === evaluator.toLowerCase() &&
          resumedJob.id === BigInt(resumedProgress.jobId) &&
          resumedJob.client.toLowerCase() ===
            connection.address.toLowerCase() &&
          (resumedJob.budget === 0n || resumedJob.budget === amount);
        if (!checkpointMatches) {
          localStorage.removeItem(storageKey);
          setFundingProgress(null);
          throw new Error(
            "The saved funding checkpoint does not match the confirmed onchain job. It was cleared before any transaction was sent.",
          );
        }
        const alreadyFunded = resumedJob.status !== 0;
        const approved = alreadyFunded
          ? true
          : (await publicClient.readContract({
              abi: erc20Abi,
              address: getAddress(paymentToken),
              args: [connection.address, getAddress(commerce)],
              functionName: "allowance",
            })) >= amount;
        remember({
          approvalConfirmed: approved,
          budgetSet: resumedJob.budget === amount,
          funded: alreadyFunded,
        });
      }
      if (!progress) {
        setTransactionState("Creating scoped job");
        const createHash = await writeContractAsync({
          abi: agenticCommerceAbi,
          address: getAddress(commerce),
          args: [
            getAddress(parsed.data.provider),
            getAddress(evaluator),
            BigInt(
              Math.floor(new Date(parsed.data.expiresAt).getTime() / 1_000),
            ),
            `ScopeSettle specification ${hashes.specification}`,
            {
              specificationHash: hashes.specification,
              rubricHash: hashes.rubric,
              minimumScore: parsed.data.minimumPassingScore * 100,
              minimumConfidence: parsed.data.minimumConfidence * 100,
              challengeWindow: parsed.data.challengeWindowSeconds,
            },
          ],
          chainId: targetChainId as 1952 | 196,
          functionName: "createScopedJob",
        });
        const createReceipt = await publicClient.waitForTransactionReceipt({
          hash: createHash,
        });
        const created = parseEventLogs({
          abi: agenticCommerceAbi,
          eventName: "JobCreated",
          logs: createReceipt.logs,
          strict: true,
        })[0];
        const createdJobId = created?.args.jobId;
        if (!createdJobId)
          throw new Error("The confirmed transaction did not emit JobCreated.");
        progress = {
          approvalConfirmed: false,
          budgetSet: false,
          chainId: targetChainId,
          client: connection.address,
          commerce: getAddress(commerce),
          createHash,
          funded: false,
          jobId: createdJobId.toString(),
          metadataSaved: false,
          specificationHash: hashes.specification,
        };
        localStorage.setItem(storageKey, JSON.stringify(progress));
        setFundingProgress(progress);
      }
      const jobId = BigInt(progress.jobId);
      setTransactionState(
        "Anchoring and verifying the immutable specification",
      );
      const saveResponse = await fetch("/api/jobs", {
        body: JSON.stringify({
          chainId: targetChainId,
          jobId: progress.jobId,
          specification: parsed.data,
          transactionHash: progress.createHash,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      if (!saveResponse.ok) {
        const result = (await saveResponse.json()) as { error?: string };
        throw new Error(
          result.error ??
            `Job ${jobId} was created, but metadata indexing failed. Retry will resume this job.`,
        );
      }
      remember({ metadataSaved: true });
      if (!progress.budgetSet) {
        setTransactionState("Setting the agreed budget");
        const budgetHash = await writeContractAsync({
          abi: agenticCommerceAbi,
          address: getAddress(commerce),
          args: [jobId, amount, "0x"],
          chainId: targetChainId as 1952 | 196,
          functionName: "setBudget",
        });
        await publicClient.waitForTransactionReceipt({ hash: budgetHash });
        remember({ budgetSet: true });
      }
      if (!progress.approvalConfirmed) {
        setTransactionState("Approving the exact payment amount");
        const approvalHash = await writeContractAsync({
          abi: erc20Abi,
          address: getAddress(paymentToken),
          args: [getAddress(commerce), amount],
          chainId: targetChainId as 1952 | 196,
          functionName: "approve",
        });
        await publicClient.waitForTransactionReceipt({ hash: approvalHash });
        remember({ approvalConfirmed: true });
      }
      if (!progress.funded) {
        setTransactionState("Funding non-custodial escrow");
        const fundingHash = await writeContractAsync({
          abi: agenticCommerceAbi,
          address: getAddress(commerce),
          args: [jobId, amount, "0x"],
          chainId: targetChainId as 1952 | 196,
          functionName: "fund",
        });
        await publicClient.waitForTransactionReceipt({ hash: fundingHash });
        remember({ funded: true });
      }
      setTransactionState("Funded — opening job");
      router.push(`/jobs/${targetChainId}/${jobId}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "The transaction flow failed.";
      setErrors([
        /rejected|denied|cancelled/iu.test(message)
          ? "The wallet request was rejected. No later transaction was sent."
          : message,
      ]);
      setTransactionState(null);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="shell form-layout">
      <div className="form-stack">
        {fundingProgress ? (
          <div className="notice" role="status">
            <FileLock2 aria-hidden="true" size={15} />
            <span>
              Job {fundingProgress.jobId} already exists onchain. Inputs are
              locked and retry resumes its remaining confirmations without
              creating a duplicate.{" "}
              {fundingProgress.metadataSaved ? (
                <a href={`/jobs/${targetChainId}/${fundingProgress.jobId}`}>
                  Open indexed job
                </a>
              ) : (
                <span>Retry to finish metadata anchoring.</span>
              )}
              {explorerTransactionUrl(
                targetChainId,
                fundingProgress.createHash,
              ) ? (
                <>
                  {" "}
                  ·{" "}
                  <a
                    href={explorerTransactionUrl(
                      targetChainId,
                      fundingProgress.createHash,
                    )!}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Creation transaction
                  </a>
                </>
              ) : null}
            </span>
          </div>
        ) : null}
        <fieldset className="form-fields" disabled={Boolean(fundingProgress)}>
          {errors.length > 0 ? (
            <div className="error-summary" role="alert" tabIndex={-1}>
              <h2>
                Review {errors.length === 1 ? "this issue" : "these issues"}
              </h2>
              <ul>
                {[...new Set(errors)].map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <section className="panel form-section">
            <div className="form-section-head">
              <div>
                <h2>Work definition</h2>
                <p>
                  Public GitHub repositories only. Pull request comes at
                  provider submission.
                </p>
              </div>
              <Status tone="neutral">01</Status>
            </div>
            <div className="field-grid">
              <div className="field-full">
                <label htmlFor="title">Job title</label>
                <input
                  className="input"
                  id="title"
                  maxLength={140}
                  onChange={(event) => {
                    setTitle(event.target.value);
                    setReviewing(false);
                  }}
                  placeholder="Add idempotent settlement API"
                  value={title}
                />
              </div>
              <div className="field-full">
                <label htmlFor="scope">Detailed scope</label>
                <textarea
                  className="textarea"
                  id="scope"
                  maxLength={10_000}
                  onChange={(event) => {
                    setScope(event.target.value);
                    setReviewing(false);
                  }}
                  placeholder="Describe the requested behavior, constraints, excluded work, and expected tests."
                  value={scope}
                />
                <p className="field-help">
                  Write observable outcomes. Repository text is treated as
                  untrusted.
                </p>
              </div>
              <div className="field">
                <label htmlFor="repository">Public repository URL</label>
                <input
                  className="input"
                  id="repository"
                  onChange={(event) => {
                    setRepositoryUrl(event.target.value);
                    setReviewing(false);
                  }}
                  placeholder="https://github.com/org/repository"
                  type="url"
                  value={repositoryUrl}
                />
              </div>
              <div className="field">
                <label htmlFor="issue">
                  Issue URL <span>optional</span>
                </label>
                <input
                  className="input"
                  id="issue"
                  onChange={(event) => {
                    setIssueUrl(event.target.value);
                    setReviewing(false);
                  }}
                  placeholder="https://github.com/org/repository/issues/12"
                  type="url"
                  value={issueUrl}
                />
              </div>
            </div>
          </section>

          <section className="panel form-section">
            <div className="form-section-head">
              <div>
                <h2>Escrow policy</h2>
                <p>
                  Budget and thresholds become immutable after the job is
                  funded.
                </p>
              </div>
              <Status tone="neutral">02</Status>
            </div>
            <div className="field-grid">
              <div className="field-full">
                <label htmlFor="provider">Provider wallet</label>
                <input
                  autoComplete="off"
                  className="input"
                  id="provider"
                  onChange={(event) => {
                    setProvider(event.target.value);
                    setReviewing(false);
                  }}
                  placeholder="0x…"
                  spellCheck={false}
                  value={provider}
                />
              </div>
              <div className="field">
                <label htmlFor="budget">
                  Budget <span>mUSDG, 6 decimals</span>
                </label>
                <input
                  className="input"
                  id="budget"
                  min="0.000001"
                  onChange={(event) => {
                    setBudget(event.target.value);
                    setReviewing(false);
                  }}
                  step="0.000001"
                  type="number"
                  value={budget}
                />
              </div>
              <div className="field">
                <label htmlFor="expiry">Expiry</label>
                <input
                  className="input"
                  id="expiry"
                  onChange={(event) => {
                    setExpiresAt(event.target.value);
                    setReviewing(false);
                  }}
                  type="datetime-local"
                  value={expiresAt}
                />
              </div>
              <div className="field">
                <label htmlFor="passing-score">Minimum passing score</label>
                <input
                  className="input"
                  id="passing-score"
                  max="100"
                  min="0"
                  onChange={(event) =>
                    setMinimumPassingScore(Number(event.target.value))
                  }
                  type="number"
                  value={minimumPassingScore}
                />
              </div>
              <div className="field">
                <label htmlFor="confidence">Minimum AI confidence</label>
                <input
                  className="input"
                  id="confidence"
                  max="100"
                  min="0"
                  onChange={(event) =>
                    setMinimumConfidence(Number(event.target.value))
                  }
                  type="number"
                  value={minimumConfidence}
                />
              </div>
              <div className="field">
                <label htmlFor="challenge">
                  Challenge window <span>hours</span>
                </label>
                <input
                  className="input"
                  id="challenge"
                  max="720"
                  min="1"
                  onChange={(event) =>
                    setChallengeHours(Number(event.target.value))
                  }
                  type="number"
                  value={challengeHours}
                />
              </div>
            </div>
          </section>

          <section className="panel form-section">
            <div className="form-section-head">
              <div>
                <h2>Acceptance criteria</h2>
                <p>
                  Each criterion is evaluated independently and requires cited
                  evidence.
                </p>
              </div>
              <span
                className={`weight-total ${weightTotal === 100 ? "weight-good" : "weight-bad"}`}
              >
                {weightTotal} / 100
              </span>
            </div>
            {criteria.map((criterion, index) => (
              <div
                className="criterion-editor"
                key={`${criterion.id}-${index}`}
              >
                <span className="rubric-index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="criterion-editor-fields">
                  <label
                    className="legend-label"
                    htmlFor={`criterion-title-${index}`}
                  >
                    Criterion
                  </label>
                  <input
                    className="input"
                    id={`criterion-title-${index}`}
                    onChange={(event) =>
                      updateCriterion(index, { title: event.target.value })
                    }
                    value={criterion.title}
                  />
                  <textarea
                    aria-label={`Criterion ${index + 1} description`}
                    className="textarea"
                    onChange={(event) =>
                      updateCriterion(index, {
                        description: event.target.value,
                      })
                    }
                    value={criterion.description}
                  />
                  <input
                    aria-label={`Criterion ${index + 1} required files`}
                    className="input"
                    onChange={(event) =>
                      updateCriterion(index, {
                        requiredFiles: event.target.value,
                      })
                    }
                    placeholder="Required paths, comma separated (optional)"
                    value={criterion.requiredFiles}
                  />
                  <label style={{ color: "var(--muted)", fontSize: 10 }}>
                    <input
                      checked={criterion.requiresPassingCi}
                      onChange={(event) =>
                        updateCriterion(index, {
                          requiresPassingCi: event.target.checked,
                        })
                      }
                      type="checkbox"
                    />{" "}
                    Require passing CI for the pinned commit
                  </label>
                </div>
                <div className="field">
                  <label htmlFor={`criterion-weight-${index}`}>Weight</label>
                  <input
                    className="input"
                    id={`criterion-weight-${index}`}
                    max="100"
                    min="1"
                    onChange={(event) =>
                      updateCriterion(index, {
                        weight: Number(event.target.value),
                      })
                    }
                    type="number"
                    value={criterion.weight}
                  />
                </div>
                <button
                  aria-label={`Remove criterion ${index + 1}`}
                  className="icon-button"
                  disabled={criteria.length === 1}
                  onClick={() =>
                    setCriteria((current) =>
                      current.filter((_, item) => item !== index),
                    )
                  }
                  type="button"
                >
                  <Trash2 aria-hidden="true" size={15} />
                </button>
              </div>
            ))}
            <button
              className="button button-quiet button-small"
              disabled={criteria.length >= 12}
              onClick={() =>
                setCriteria((current) => [
                  ...current,
                  {
                    id: `criterion-${current.length + 1}`,
                    title: "",
                    description: "",
                    weight: 1,
                    requiredFiles: "",
                    requiresPassingCi: false,
                  },
                ])
              }
              type="button"
            >
              <Plus aria-hidden="true" size={14} /> Add criterion
            </button>
          </section>

          {reviewing && parsed.success && hashes ? (
            <section
              className="panel form-section"
              aria-labelledby="review-title"
            >
              <div className="form-section-head">
                <div>
                  <h2 id="review-title">Review immutable job</h2>
                  <p>
                    These values are encoded into the create transaction and
                    hash commitments.
                  </p>
                </div>
                <FileLock2 aria-hidden="true" color="var(--green)" size={20} />
              </div>
              <div className="review-grid">
                <div>
                  <span className="meta-label">Provider</span>
                  <strong>{parsed.data.provider}</strong>
                </div>
                <div>
                  <span className="meta-label">Budget base units</span>
                  <strong>{parsed.data.budget}</strong>
                </div>
                <div>
                  <span className="meta-label">Expiry unix time</span>
                  <strong>
                    {Math.floor(
                      new Date(parsed.data.expiresAt).getTime() / 1000,
                    )}
                  </strong>
                </div>
                <div>
                  <span className="meta-label">Score / confidence</span>
                  <strong>
                    {minimumPassingScore * 100} / {minimumConfidence * 100} bps
                  </strong>
                </div>
                <div className="review-full">
                  <span className="meta-label">Specification hash</span>
                  <strong>{hashes.specification}</strong>
                </div>
                <div className="review-full">
                  <span className="meta-label">Rubric hash</span>
                  <strong>{hashes.rubric}</strong>
                </div>
                <div className="review-full">
                  <span className="meta-label">Evaluator contract</span>
                  <strong>
                    {process.env.NEXT_PUBLIC_SCOPESETTLE_EVALUATOR_ADDRESS ??
                      "Not deployed/configured"}
                  </strong>
                </div>
              </div>
              <div className="notice" style={{ marginTop: 16 }}>
                <CircleAlert aria-hidden="true" size={15} />
                <span>
                  Funding is two wallet confirmations: ERC-20 approval, then
                  escrow funding. Review your wallet’s chain, contract, token,
                  and amount before signing.
                </span>
              </div>
            </section>
          ) : null}

          <div className="form-actions">
            {reviewing ? (
              <button
                className="button button-secondary"
                onClick={() => setReviewing(false)}
                type="button"
              >
                Edit job
              </button>
            ) : null}
            <button
              className="button button-primary"
              onClick={review}
              type="button"
            >
              Review immutable job
            </button>
          </div>
        </fieldset>
      </div>

      <aside className="sticky-summary side-stack">
        <section className="panel">
          <div className="panel-header">
            <h2>Transaction summary</h2>
            <Status tone={deploymentReady ? "green" : "amber"}>
              {deploymentReady ? "Ready" : "Pending deploy"}
            </Status>
          </div>
          <dl className="summary-list">
            <div className="summary-row">
              <dt>Network</dt>
              <dd>X Layer Testnet</dd>
            </div>
            <div className="summary-row">
              <dt>Connected</dt>
              <dd>{connection.status === "connected" ? "Yes" : "No"}</dd>
            </div>
            <div className="summary-row">
              <dt>Budget</dt>
              <dd>{budget || "0"} mUSDG</dd>
            </div>
            <div className="summary-row">
              <dt>Criteria</dt>
              <dd>{criteria.length}</dd>
            </div>
            <div className="summary-row">
              <dt>Weights</dt>
              <dd
                className={weightTotal === 100 ? "weight-good" : "weight-bad"}
              >
                {weightTotal}%
              </dd>
            </div>
            <div className="summary-row">
              <dt>Platform fee</dt>
              <dd>0%</dd>
            </div>
          </dl>
          <ol className="transaction-steps">
            <li>Create scoped job</li>
            <li>Set agreed budget</li>
            <li>Approve exact token budget</li>
            <li>Fund ERC-8183 escrow</li>
          </ol>
          <div style={{ padding: "0 18px 18px" }}>
            <button
              className="button button-primary button-wide"
              disabled={
                !deploymentReady ||
                !reviewing ||
                submitting ||
                !connection.address
              }
              onClick={createAndFund}
              type="button"
            >
              {transactionState ??
                (deploymentReady
                  ? connection.address
                    ? fundingProgress
                      ? fundingProgress.funded
                        ? `Open funded job ${fundingProgress.jobId}`
                        : `Resume funding job ${fundingProgress.jobId}`
                      : "Create and fund job"
                    : "Connect wallet to continue"
                  : "Deployment required")}
            </button>
          </div>
        </section>
        <div className="notice">
          <CircleAlert aria-hidden="true" size={15} />
          <span>
            The payment token address is intentionally unset until an official
            Testnet asset is verified or the clearly labeled mock is deployed.
          </span>
        </div>
      </aside>
    </div>
  );
}
