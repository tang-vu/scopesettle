"use client";

import { jobStatusNames } from "@scopesettle/shared";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CircleHelp,
  Database,
  FileSearch2,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { formatUnits } from "viem";
import { useConnection } from "wagmi";

import { Status } from "./status";

type JobsResponse = {
  jobs: Array<{
    budget: string;
    chainId: number;
    client: string;
    expiresAt: string;
    jobId: string;
    provider: string;
    score: number | null;
    status: number;
    title: string;
    transactionHash: string;
  }>;
  token: { decimals: number; symbol: string };
};

async function loadJobs(
  chainId: number,
  address?: string,
): Promise<JobsResponse> {
  const search = new URLSearchParams({ chainId: chainId.toString() });
  if (address) search.set("address", address);
  const response = await fetch(`/api/jobs?${search}`);
  if (!response.ok) {
    const result = (await response.json()) as { error?: string };
    throw new Error(result.error ?? "Job index unavailable.");
  }
  return response.json() as Promise<JobsResponse>;
}

function JobRows({
  data,
  address,
}: {
  readonly data: JobsResponse;
  readonly address?: string;
}) {
  if (data.jobs.length === 0) return null;
  return data.jobs.map((job) => {
    const role = address
      ? job.client.toLowerCase() === address.toLowerCase()
        ? "Client"
        : "Provider"
      : "Public";
    return (
      <Link
        className="job-row"
        href={`/jobs/${job.chainId}/${job.jobId}`}
        key={job.jobId}
      >
        <div>
          <h3>{job.title}</h3>
          <p>
            {role} · X Layer {job.chainId === 1952 ? "Testnet" : "Mainnet"}
          </p>
        </div>
        <div>
          <span className="job-cell-label">Status</span>
          <strong>{jobStatusNames[job.status] ?? "Unknown"}</strong>
        </div>
        <div>
          <span className="job-cell-label">Score</span>
          <strong>
            {job.score === null ? "Pending" : `${job.score} / 100`}
          </strong>
        </div>
        <div>
          <span className="job-cell-label">Budget</span>
          <strong>
            {formatUnits(BigInt(job.budget), data.token.decimals)}{" "}
            {data.token.symbol}
          </strong>
        </div>
        <ArrowRight aria-hidden="true" size={15} />
      </Link>
    );
  });
}

export function DashboardClient() {
  const connection = useConnection();
  const chainId = Number(process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID || 1952);
  const deploymentReady = Boolean(
    process.env.NEXT_PUBLIC_AGENTIC_COMMERCE_ADDRESS &&
    process.env.NEXT_PUBLIC_SCOPESETTLE_EVALUATOR_ADDRESS &&
    process.env.NEXT_PUBLIC_PAYMENT_TOKEN_ADDRESS,
  );
  const personal = useQuery({
    enabled: deploymentReady && Boolean(connection.address),
    queryFn: () => loadJobs(chainId, connection.address),
    queryKey: ["jobs", chainId, connection.address],
  });
  const recent = useQuery({
    enabled: deploymentReady,
    queryFn: () => loadJobs(chainId),
    queryKey: ["jobs", chainId, "recent"],
  });
  const unsupported = connection.address && connection.chainId !== chainId;

  return (
    <div className="shell dashboard-grid">
      {unsupported ? (
        <div className="notice" role="alert" style={{ gridColumn: "1 / -1" }}>
          <CircleHelp aria-hidden="true" size={15} />
          <span>
            Your wallet is on chain {connection.chainId}. Switch to X Layer{" "}
            {chainId === 1952 ? "Testnet" : "Mainnet"} ({chainId}) before
            transacting.
          </span>
        </div>
      ) : null}
      <section className="panel" aria-labelledby="wallet-jobs-title">
        <div className="panel-header">
          <h2 id="wallet-jobs-title">Your jobs</h2>
          <span>
            {connection.status === "connected"
              ? "Onchain reconciled"
              : "Wallet required"}
          </span>
        </div>
        {personal.isLoading ? (
          <div className="empty-state">
            <Database aria-hidden="true" size={28} />
            <div>
              <h3>Reconciling onchain jobs</h3>
              <p>Reading the index and checking each current contract state.</p>
            </div>
          </div>
        ) : null}
        {personal.isError ? (
          <div className="empty-state" role="alert">
            <CircleHelp aria-hidden="true" size={28} />
            <div>
              <h3>RPC or index unavailable</h3>
              <p>{personal.error.message}</p>
              <button
                className="button button-secondary button-small"
                onClick={() => personal.refetch()}
                type="button"
              >
                Retry
              </button>
            </div>
          </div>
        ) : null}
        {personal.data?.jobs.length ? (
          <JobRows
            {...(connection.address ? { address: connection.address } : {})}
            data={personal.data}
          />
        ) : null}
        {connection.status === "connected" &&
        personal.data?.jobs.length === 0 ? (
          <div className="empty-state">
            <Database aria-hidden="true" size={28} />
            <div>
              <h3>No jobs found for this wallet</h3>
              <p>
                The index is reachable and no matching onchain jobs were found.
              </p>
              <Link
                className="button button-secondary button-small"
                href="/jobs/new"
              >
                Create job
              </Link>
            </div>
          </div>
        ) : null}
        {connection.status !== "connected" ? (
          <div className="empty-state">
            <Wallet aria-hidden="true" size={28} />
            <div>
              <h3>Connect to see your jobs</h3>
              <p>
                Wallet access is read-only until you approve a transaction.
                Public reports remain accessible.
              </p>
            </div>
          </div>
        ) : null}
      </section>

      <aside className="side-stack">
        <section className="panel network-card">
          <div className="network-card-top">
            <h3>X Layer {chainId === 1952 ? "Testnet" : "Mainnet"}</h3>
            <Status tone={deploymentReady ? "green" : "amber"}>
              {deploymentReady ? "Configured" : "Deploy pending"}
            </Status>
          </div>
          <p>
            {deploymentReady
              ? "Contract reads use the official public RPC and are reconciled before display."
              : "Contract addresses remain unset; no deployment is fabricated."}
          </p>
          <div className="network-meta">
            <div>
              <span>Chain ID</span>
              <strong>{chainId}</strong>
            </div>
            <div>
              <span>Gas</span>
              <strong>OKB</strong>
            </div>
          </div>
        </section>
        <section className="panel">
          <div className="panel-header">
            <h3>Data integrity</h3>
          </div>
          <ul className="info-list">
            <li>
              <ShieldCheck aria-hidden="true" size={15} /> Onchain status
              remains authoritative.
            </li>
            <li>
              <FileSearch2 aria-hidden="true" size={15} /> Reports are matched
              against event hashes.
            </li>
            <li>
              <CircleHelp aria-hidden="true" size={15} /> RPC failures are never
              rendered as empty success.
            </li>
          </ul>
        </section>
      </aside>

      <section
        className="panel"
        style={{ gridColumn: "1 / -1" }}
        aria-labelledby="public-jobs-title"
      >
        <div className="panel-header">
          <h2 id="public-jobs-title">Public recent jobs</h2>
          <span>
            {recent.data
              ? `${recent.data.jobs.length} indexed`
              : deploymentReady
                ? "Loading index"
                : "0 indexed"}
          </span>
        </div>
        {recent.isError ? (
          <div className="empty-state" role="alert">
            <CircleHelp aria-hidden="true" size={28} />
            <div>
              <h3>Public index unavailable</h3>
              <p>{recent.error.message}</p>
            </div>
          </div>
        ) : null}
        {recent.data?.jobs.length ? <JobRows data={recent.data} /> : null}
        <Link className="job-row" href="/jobs/1952/42">
          <div>
            <h3>Add idempotent settlement API</h3>
            <p>Illustrative fixture · no onchain transaction</p>
          </div>
          <div>
            <span className="job-cell-label">Status</span>
            <strong>Completed</strong>
          </div>
          <div>
            <span className="job-cell-label">Score</span>
            <strong>91.3 / 100</strong>
          </div>
          <div>
            <span className="job-cell-label">Budget</span>
            <strong>500 mUSDG</strong>
          </div>
          <ArrowRight aria-hidden="true" size={15} />
        </Link>
      </section>
    </div>
  );
}
