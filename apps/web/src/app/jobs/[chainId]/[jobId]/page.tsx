import { erc20Abi, scopeSettleEvaluatorAbi } from "@scopesettle/shared";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  CircleCheck,
  Download,
  FileCode2,
  GitCommitHorizontal,
  ShieldAlert,
} from "lucide-react";
import { and, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Status } from "@/components/status";
import { LiveJobDetail } from "@/components/live-job-detail";
import { exampleJob, exampleReport } from "@/lib/example-data";
import { formatDate, shortAddress } from "@/lib/format";
import { readJob } from "@/server/chain";
import { getDatabase } from "@/server/db";
import { evaluationReports, jobDocuments } from "@/server/db/schema";

type PageProperties = {
  readonly params: Promise<{ chainId: string; jobId: string }>;
};

export async function generateMetadata({
  params,
}: PageProperties): Promise<Metadata> {
  const { chainId, jobId } = await params;
  return {
    title:
      chainId === "1952" && jobId === "42" ? exampleJob.title : `Job ${jobId}`,
  };
}

export default async function JobDetailPage({ params }: PageProperties) {
  const { chainId, jobId } = await params;
  if (chainId !== "1952" || jobId !== "42") {
    if (!/^\d+$/u.test(chainId) || !/^\d+$/u.test(jobId)) notFound();
    const numericChainId = Number(chainId);
    const numericJobId = BigInt(jobId);
    const database = getDatabase();
    const [{ client, deployment, job }, documents, reports] = await Promise.all(
      [
        readJob(numericChainId, numericJobId),
        database
          .select()
          .from(jobDocuments)
          .where(
            and(
              eq(jobDocuments.chainId, numericChainId),
              eq(jobDocuments.jobId, numericJobId),
            ),
          )
          .limit(1),
        database
          .select()
          .from(evaluationReports)
          .where(
            and(
              eq(evaluationReports.chainId, numericChainId),
              eq(evaluationReports.jobId, numericJobId),
            ),
          )
          .limit(1),
      ],
    );
    const document = documents[0];
    if (!document) notFound();
    const [symbol, decimals, proposal] = await Promise.all([
      client.readContract({
        abi: erc20Abi,
        address: deployment.paymentToken,
        functionName: "symbol",
      }),
      client.readContract({
        abi: erc20Abi,
        address: deployment.paymentToken,
        functionName: "decimals",
      }),
      client
        .readContract({
          abi: scopeSettleEvaluatorAbi,
          address: deployment.evaluator,
          args: [numericJobId],
          functionName: "getProposal",
        })
        .catch(() => null),
    ]);
    const evaluation = reports[0] ?? null;
    return (
      <LiveJobDetail
        chainId={numericChainId}
        deliverable={document.deliverable ?? null}
        job={{
          budget: job.budget.toString(),
          client: job.client,
          evaluator: job.evaluator,
          expiredAt: Number(job.expiredAt),
          provider: job.provider,
          status: job.status,
        }}
        jobId={jobId}
        proposal={
          proposal
            ? {
                challenged: proposal.challenged,
                challengeUntil: Number(proposal.challengeUntil),
                finalized: proposal.finalized,
                outcome: proposal.outcome,
              }
            : null
        }
        report={evaluation?.report ?? null}
        signedVerdict={evaluation?.signedVerdict ?? null}
        specification={document.specification}
        submissionTransactionHash={document.submissionTransactionHash}
        token={{ decimals, symbol }}
        transactionHash={document.transactionHash}
      />
    );
  }

  return (
    <>
      <header className="job-hero">
        <div className="shell">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href="/app">Jobs</Link>
            <ChevronRight aria-hidden="true" size={11} />
            <span>X Layer Testnet</span>
            <ChevronRight aria-hidden="true" size={11} />
            <span>42</span>
          </nav>
          <div className="fixture-banner" role="note">
            <AlertTriangle aria-hidden="true" size={16} />
            <span>
              <strong>Illustrative fixture.</strong> This fully rendered example
              is not a live AI run or an onchain job. It will be replaced by a
              real completed Testnet job after deployment; no transaction or
              explorer link is fabricated.
            </span>
          </div>
          <div className="job-title-row">
            <div>
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <Status tone="green">Completed</Status>
                <Status tone="blue">Client role</Status>
              </div>
              <h1>{exampleJob.title}</h1>
            </div>
            <div className="job-score-big">
              {exampleReport.weightedScore}
              <span>Weighted score / 100</span>
            </div>
          </div>
          <div className="job-meta-grid">
            <div>
              <span className="meta-label">Budget</span>
              <span className="meta-value">{exampleJob.budget}</span>
            </div>
            <div>
              <span className="meta-label">Confidence</span>
              <span className="meta-value">{exampleReport.confidence}%</span>
            </div>
            <div>
              <span className="meta-label">Pinned commit</span>
              <span className="meta-value">
                {exampleReport.repository.headSha}
              </span>
            </div>
            <div>
              <span className="meta-label">Settlement</span>
              <span className="meta-value">Released to provider</span>
            </div>
          </div>
        </div>
      </header>

      <div className="shell job-content-grid">
        <div className="job-main-stack">
          <section className="panel content-block">
            <h2>Scope</h2>
            <p>{exampleJob.scope}</p>
          </section>

          <section className="panel content-block">
            <h2>Acceptance rubric</h2>
            {exampleJob.criteria.map((criterion, index) => (
              <div className="rubric-row" key={criterion.title}>
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

          <section className="panel content-block">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              <h2>Deterministic checks</h2>
              <Status tone="green">4 / 4 passed</Status>
            </div>
            <ul className="check-list">
              {exampleReport.deterministicChecks.map((check) => (
                <li className="check-row" key={check.id}>
                  <CircleCheck
                    className="check-icon-pass"
                    aria-hidden="true"
                    size={16}
                  />
                  <div>
                    <h3>{check.label}</h3>
                    <p>{check.evidence}</p>
                  </div>
                  <Status tone="green">{check.status}</Status>
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
              <Status tone="amber">Illustrative output</Status>
            </div>
            <div className="evidence-list">
              {exampleReport.criteria.map((criterion) => (
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
                  {criterion.evidence.map((evidence) => (
                    <div
                      className="code-evidence"
                      key={`${evidence.file ?? "evidence"}-${evidence.startLine ?? 0}`}
                    >
                      <div className="code-evidence-head">
                        <span>
                          <FileCode2 aria-hidden="true" size={10} />{" "}
                          {evidence.file}
                        </span>
                        <span>
                          L{evidence.startLine}–{evidence.endLine}
                        </span>
                      </div>
                      <pre>{evidence.excerpt}</pre>
                    </div>
                  ))}
                </article>
              ))}
            </div>
          </section>

          <section className="panel content-block">
            <h2>Limitations</h2>
            <ul className="info-list" style={{ padding: 0 }}>
              {exampleReport.limitations.map((limitation) => (
                <li key={limitation}>
                  <ShieldAlert aria-hidden="true" size={15} /> {limitation}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="job-side-stack">
          <section className="panel content-block">
            <h2>Repository</h2>
            <span className="meta-label">Public repository</span>
            <p>{exampleJob.repository}</p>
            <span className="meta-label" style={{ marginTop: 16 }}>
              Pull request
            </span>
            <p>#{exampleJob.pullNumber} · example reference</p>
            <span className="meta-label" style={{ marginTop: 16 }}>
              Exact head SHA
            </span>
            <span className="hash-box">
              <GitCommitHorizontal aria-hidden="true" size={12} />{" "}
              {exampleReport.repository.headSha}
            </span>
          </section>

          <section className="panel content-block">
            <h2>Parties</h2>
            <span className="meta-label">Client</span>
            <span className="meta-value">
              {shortAddress(exampleJob.client)}
            </span>
            <span className="meta-label" style={{ marginTop: 14 }}>
              Provider
            </span>
            <span className="meta-value">
              {shortAddress(exampleJob.provider)}
            </span>
            <span className="meta-label" style={{ marginTop: 14 }}>
              Evaluator contract
            </span>
            <span className="meta-value">
              {shortAddress(exampleJob.evaluator)}
            </span>
          </section>

          <section className="panel content-block">
            <h2>Onchain timeline</h2>
            <ol className="timeline">
              {exampleJob.timeline.map(([event, time]) => (
                <li key={event}>
                  <strong>{event}</strong>
                  <span>{time}</span>
                </li>
              ))}
            </ol>
            <p style={{ marginTop: 18, color: "var(--amber)" }}>
              Example sequence only; no transaction hashes are claimed.
            </p>
          </section>

          <section className="panel content-block">
            <h2>Evidence commitment</h2>
            <span className="meta-label">Report hash</span>
            <code className="hash-box">{exampleReport.reportHash}</code>
            <span className="meta-label" style={{ marginTop: 14 }}>
              Generated
            </span>
            <span className="meta-value">
              {formatDate(exampleReport.generatedAt)}
            </span>
            <span className="meta-label" style={{ marginTop: 14 }}>
              Challenge
            </span>
            <span className="meta-value">{exampleJob.challenge}</span>
          </section>

          <section className="panel side-action">
            <a
              className="button button-secondary button-wide"
              href="/api/examples/report"
              download
            >
              <Download aria-hidden="true" size={15} /> Download canonical
              report
            </a>
            <button
              className="button button-quiet button-wide"
              disabled
              type="button"
            >
              <CheckCircle2 aria-hidden="true" size={15} /> Already finalized
            </button>
            <p>
              Role actions activate only for a connected wallet and a deployed
              onchain job in an eligible state.
            </p>
          </section>

          <div className="notice">
            <ShieldAlert aria-hidden="true" size={15} />
            <span>
              Evaluator signer is trusted. Contracts are unaudited. Never use
              meaningful Mainnet funds until an independent audit.
            </span>
          </div>
        </aside>
      </div>
    </>
  );
}
