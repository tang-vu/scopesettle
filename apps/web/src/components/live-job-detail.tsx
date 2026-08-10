import {
  explorerAddressUrl,
  explorerTransactionUrl,
  jobStatusNames,
  type EvaluationReport,
} from "@scopesettle/shared";
import {
  CircleCheck,
  CircleX,
  Download,
  ExternalLink,
  FileCode2,
  GitCommitHorizontal,
  ShieldAlert,
} from "lucide-react";

import { formatDate, shortAddress } from "@/lib/format";
import type { SignedVerdictRecord } from "@/server/db/schema";

import { JobActions } from "./job-actions";
import { Providers } from "./providers";
import { Status } from "./status";
import { WalletButton } from "./wallet-button";

type Properties = {
  readonly chainId: number;
  readonly jobId: string;
  readonly job: {
    client: `0x${string}`;
    provider: `0x${string}`;
    evaluator: `0x${string}`;
    budget: string;
    expiredAt: number;
    status: number;
  };
  readonly specification: {
    title: string;
    scope: string;
    repositoryUrl: string;
    minimumPassingScore: number;
    minimumConfidence: number;
    challengeWindowSeconds: number;
    criteria: Array<{
      id: string;
      title: string;
      description: string;
      weight: number;
    }>;
  };
  readonly transactionHash: string;
  readonly submissionTransactionHash: string | null;
  readonly deliverable: {
    owner: string;
    repository: string;
    pullNumber: number;
    baseSha: string;
    headSha: string;
  } | null;
  readonly report: EvaluationReport | null;
  readonly signedVerdict: SignedVerdictRecord | null;
  readonly proposal: {
    challengeUntil: number;
    challenged: boolean;
    finalized: boolean;
    outcome: number;
  } | null;
  readonly token: { symbol: string; decimals: number };
  readonly reviewer: `0x${string}`;
};

function formatBudget(baseUnits: string, decimals: number): string {
  const value = BigInt(baseUnits);
  const divisor = 10n ** BigInt(decimals);
  const whole = value / divisor;
  const fraction = (value % divisor)
    .toString()
    .padStart(decimals, "0")
    .replace(/0+$/u, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

export function LiveJobDetail(properties: Properties) {
  const statusName = jobStatusNames[properties.job.status] ?? "Unknown";
  const statusTone = [3].includes(properties.job.status)
    ? "green"
    : [4, 5].includes(properties.job.status)
      ? "red"
      : "amber";
  const report = properties.report;
  const creationUrl = explorerTransactionUrl(
    properties.chainId,
    properties.transactionHash,
  );
  const submissionUrl = properties.submissionTransactionHash
    ? explorerTransactionUrl(
        properties.chainId,
        properties.submissionTransactionHash,
      )
    : null;

  return (
    <>
      <header className="job-hero">
        <div className="shell">
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <Status tone={statusTone}>{statusName}</Status>
            <Status tone="blue">Onchain reconciled</Status>
          </div>
          <div className="job-title-row">
            <div>
              <p className="eyebrow">X Layer · job {properties.jobId}</p>
              <h1>{properties.specification.title}</h1>
            </div>
            <div className="job-score-big">
              {report ? report.weightedScore : "—"}
              <span>Weighted score / 100</span>
            </div>
          </div>
          <div className="job-meta-grid">
            <div>
              <span className="meta-label">Budget</span>
              <span className="meta-value">
                {formatBudget(properties.job.budget, properties.token.decimals)}{" "}
                {properties.token.symbol}
              </span>
            </div>
            <div>
              <span className="meta-label">Confidence</span>
              <span className="meta-value">
                {report ? `${report.confidence}%` : "Pending"}
              </span>
            </div>
            <div>
              <span className="meta-label">Pinned commit</span>
              <span className="meta-value">
                {properties.deliverable?.headSha ?? "Awaiting provider"}
              </span>
            </div>
            <div>
              <span className="meta-label">Expiry</span>
              <span className="meta-value">
                {formatDate(
                  new Date(properties.job.expiredAt * 1_000).toISOString(),
                )}
              </span>
            </div>
          </div>
        </div>
      </header>
      <div className="shell job-content-grid">
        <div className="job-main-stack">
          <section className="panel content-block">
            <h2>Scope</h2>
            <p>{properties.specification.scope}</p>
          </section>
          <section className="panel content-block">
            <h2>Immutable acceptance rubric</h2>
            {properties.specification.criteria.map((criterion, index) => (
              <div className="rubric-row" key={criterion.id}>
                <span className="rubric-index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3>{criterion.title}</h3>
                  <p>{criterion.description}</p>
                </div>
                <span className="rubric-weight">
                  {criterion.weight}% weight
                </span>
              </div>
            ))}
          </section>
          {report ? (
            <>
              <section className="panel content-block">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                  }}
                >
                  <h2>Deterministic checks</h2>
                  <Status tone="green">Separate from AI</Status>
                </div>
                <ul className="check-list">
                  {report.deterministicChecks.map((check) => (
                    <li className="check-row" key={check.id}>
                      {check.status === "pass" ? (
                        <CircleCheck
                          className="check-icon-pass"
                          aria-hidden="true"
                          size={16}
                        />
                      ) : (
                        <CircleX aria-hidden="true" size={16} />
                      )}
                      <div>
                        <h3>{check.label}</h3>
                        <p>{check.evidence ?? "No additional evidence."}</p>
                      </div>
                      <Status
                        tone={
                          check.status === "pass"
                            ? "green"
                            : check.status === "fail"
                              ? "red"
                              : "amber"
                        }
                      >
                        {check.status}
                      </Status>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="panel content-block">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                  }}
                >
                  <h2>AI evidence by criterion</h2>
                  <Status tone={report.verdict === "pass" ? "green" : "amber"}>
                    {report.verdict.replace("_", " ")}
                  </Status>
                </div>
                <div className="evidence-list">
                  {report.criteria.map((criterion) => (
                    <article className="evidence-card" key={criterion.id}>
                      <div className="evidence-card-head">
                        <div>
                          <h3>{criterion.title}</h3>
                          <p>{criterion.reason}</p>
                        </div>
                        <span className="criterion-score">
                          {criterion.score}/100
                        </span>
                      </div>
                      {criterion.evidence.length === 0 ? (
                        <p>
                          Unverifiable: no citation survived evidence
                          validation.
                        </p>
                      ) : (
                        criterion.evidence.map((evidence, index) => (
                          <div
                            className="code-evidence"
                            key={`${criterion.id}-${index}`}
                          >
                            <div className="code-evidence-head">
                              <span>
                                <FileCode2 aria-hidden="true" size={10} />{" "}
                                {evidence.file ?? "GitHub evidence"}
                              </span>
                              <span>
                                {evidence.startLine
                                  ? `L${evidence.startLine}–${evidence.endLine ?? evidence.startLine}`
                                  : "Exact commit"}
                              </span>
                            </div>
                            {evidence.excerpt ? (
                              <pre>{evidence.excerpt}</pre>
                            ) : null}
                          </div>
                        ))
                      )}
                    </article>
                  ))}
                </div>
              </section>
              <section className="panel content-block">
                <h2>Limitations</h2>
                <ul className="info-list" style={{ padding: 0 }}>
                  {report.limitations.map((item) => (
                    <li key={item}>
                      <ShieldAlert aria-hidden="true" size={15} /> {item}
                    </li>
                  ))}
                </ul>
              </section>
            </>
          ) : (
            <section className="panel content-block">
              <h2>Evaluation pending</h2>
              <p>
                The exact PR head must be committed onchain before deterministic
                gates and AI evidence review can run.
              </p>
            </section>
          )}
        </div>
        <aside className="job-side-stack">
          <Providers>
            <section className="panel wallet-context">
              <span className="meta-label">Transaction wallet</span>
              <WalletButton />
            </section>
            <JobActions
              chainId={properties.chainId}
              client={properties.job.client}
              expiredAt={properties.job.expiredAt}
              jobId={properties.jobId}
              {...(properties.proposal
                ? { proposal: properties.proposal }
                : {})}
              provider={properties.job.provider}
              reviewer={properties.reviewer}
              {...(properties.signedVerdict
                ? { signedVerdict: properties.signedVerdict }
                : {})}
              status={properties.job.status}
            />
          </Providers>
          <section className="panel content-block">
            <h2>Repository</h2>
            <a
              href={properties.specification.repositoryUrl}
              rel="noreferrer"
              target="_blank"
            >
              {properties.specification.repositoryUrl}{" "}
              <ExternalLink aria-hidden="true" size={12} />
            </a>
            {properties.deliverable ? (
              <>
                <span className="meta-label" style={{ marginTop: 16 }}>
                  Pull request
                </span>
                <a
                  href={`https://github.com/${properties.deliverable.owner}/${properties.deliverable.repository}/pull/${properties.deliverable.pullNumber}`}
                  rel="noreferrer"
                  target="_blank"
                >
                  #{properties.deliverable.pullNumber}{" "}
                  <ExternalLink aria-hidden="true" size={12} />
                </a>
                <span className="hash-box">
                  <GitCommitHorizontal aria-hidden="true" size={12} />{" "}
                  {properties.deliverable.headSha}
                </span>
              </>
            ) : null}
          </section>
          <section className="panel content-block">
            <h2>Parties</h2>
            {(
              [
                ["Client", properties.job.client],
                ["Provider", properties.job.provider],
                ["Evaluator", properties.job.evaluator],
                ["Reviewer", properties.reviewer],
              ] as const
            ).map(([label, address]) => (
              <div key={label} style={{ marginTop: 12 }}>
                <span className="meta-label">{label}</span>
                <a
                  className="meta-value"
                  href={
                    explorerAddressUrl(properties.chainId, address) ?? undefined
                  }
                  rel="noreferrer"
                  target="_blank"
                >
                  {shortAddress(address)}
                </a>
              </div>
            ))}
          </section>
          <section className="panel content-block">
            <h2>Onchain trail</h2>
            <ol className="timeline">
              <li>
                <strong>Job created</strong>
                {creationUrl ? (
                  <a href={creationUrl} rel="noreferrer" target="_blank">
                    View transaction
                  </a>
                ) : null}
              </li>
              {submissionUrl ? (
                <li>
                  <strong>Commit submitted</strong>
                  <a href={submissionUrl} rel="noreferrer" target="_blank">
                    View transaction
                  </a>
                </li>
              ) : null}
              {report ? (
                <li>
                  <strong>Evidence report signed</strong>
                  <span>{report.verdict.replace("_", " ")}</span>
                </li>
              ) : null}
              {properties.proposal ? (
                <li>
                  <strong>
                    {properties.proposal.finalized
                      ? "Verdict finalized"
                      : properties.proposal.challenged
                        ? "Verdict challenged"
                        : "Verdict proposed"}
                  </strong>
                  <span>
                    {properties.proposal.outcome === 0
                      ? "pass"
                      : properties.proposal.outcome === 1
                        ? "fail"
                        : "manual review"}
                  </span>
                </li>
              ) : null}
              <li>
                <strong>Current state</strong>
                <span>{statusName}</span>
              </li>
            </ol>
          </section>
          {report ? (
            <section className="panel content-block">
              <h2>Evidence commitment</h2>
              <span className="meta-label">Report hash</span>
              <code className="hash-box">{report.reportHash}</code>
              <a
                className="button button-secondary button-wide"
                href={`/api/jobs/${properties.chainId}/${properties.jobId}/report`}
                download
              >
                <Download aria-hidden="true" size={15} /> Download canonical
                report
              </a>
            </section>
          ) : null}
          <div className="notice">
            <ShieldAlert aria-hidden="true" size={15} />
            <span>
              The evaluator signer and reviewer are trusted beta roles. Model
              output may be wrong. Contracts are unaudited.
            </span>
          </div>
        </aside>
      </div>
    </>
  );
}
