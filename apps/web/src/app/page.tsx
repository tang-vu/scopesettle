import {
  ArrowRight,
  Bot,
  Braces,
  CheckCircle2,
  FileCheck2,
  Fingerprint,
  GitPullRequest,
  LockKeyhole,
  ScanSearch,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";

import { Status } from "@/components/status";
import { exampleReport } from "@/lib/example-data";
import { shortHash } from "@/lib/format";

const flow = [
  {
    number: "01 / SCOPE",
    title: "Commit the agreement",
    body: "The rubric, weights, thresholds, provider, budget, and expiry are hashed before escrow is funded.",
  },
  {
    number: "02 / EVIDENCE",
    title: "Evaluate the exact commit",
    body: "Deterministic GitHub checks and structured AI findings cite the pinned PR diff—never a moving branch.",
  },
  {
    number: "03 / SETTLEMENT",
    title: "Anchor, challenge, settle",
    body: "A signed report hash starts a bounded challenge window before permissionless release or refund.",
  },
];

export default function LandingPage() {
  return (
    <>
      <section className="hero">
        <div className="shell hero-grid">
          <div>
            <p className="eyebrow">Agent commerce infrastructure · X Layer</p>
            <h1>
              Verified work.
              <br />
              <span className="accent">Automatic</span> settlement.
            </h1>
            <p className="hero-copy">
              ScopeSettle evaluates agent-built GitHub pull requests against an
              immutable rubric, anchors an evidence-linked verdict onchain, and
              settles ERC-8183 escrow.
            </p>
            <div className="hero-actions">
              <a
                className="button button-primary"
                href="https://www.oklink.com/x-layer-testnet/tx/0x7016b1c12d0fcbf0c1a9b1b9eb7313ad8fb017e97c6d210e6adea3bdca2da330"
                rel="noreferrer"
                target="_blank"
              >
                Inspect Testnet proof{" "}
                <ArrowRight aria-hidden="true" size={16} />
              </a>
              <Link
                className="button button-secondary"
                href="/jobs/1952/42"
                prefetch={false}
              >
                Explore example report
              </Link>
            </div>
            <div className="network-line">
              <span className="live-dot" /> X Layer · Testnet lifecycle +
              Mainnet contracts · source-verified
            </div>
          </div>

          <div
            className="report-card"
            aria-label="Illustrative evaluation report preview"
          >
            <div className="window-bar">
              <span>Evaluation / job 42</span>
              <span className="window-dots" aria-hidden="true">
                <i /> <i /> <i />
              </span>
            </div>
            <div className="report-body">
              <div className="report-score-row">
                <div>
                  <Status tone="green">Pass</Status>
                  <div className="report-score">
                    91.3<small>/100</small>
                  </div>
                </div>
                <div className="report-stat">
                  Confidence<strong>87%</strong>
                  Commit<strong>c02ce0c…</strong>
                </div>
              </div>
              {[
                ["Idempotent settlement endpoint", "94 / 100"],
                ["Runtime request validation", "88 / 100"],
                ["Regression coverage", "91 / 100"],
              ].map(([label, score]) => (
                <div className="criterion-row" key={label}>
                  <CheckCircle2 aria-hidden="true" size={15} />
                  <span>{label}</span>
                  <code>{score}</code>
                </div>
              ))}
              <div className="hash-strip">
                REPORT {shortHash(exampleReport.reportHash)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="protocol-flow" aria-label="ScopeSettle workflow">
        <div className="shell flow-grid">
          {flow.map((step) => (
            <article className="flow-step" key={step.number}>
              <span className="flow-number">{step.number}</span>
              <h2>{step.title}</h2>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section" id="methodology">
        <div className="shell">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Auditable by design</p>
              <h2>A verdict you can inspect.</h2>
            </div>
            <p>
              Payment rails know that work was submitted. They cannot know
              whether it met the brief. ScopeSettle makes that missing judgment
              explicit, bounded, and reviewable.
            </p>
          </div>
          <div className="feature-grid">
            <article className="feature-card">
              <Fingerprint aria-hidden="true" size={24} />
              <h3>Immutable agreement</h3>
              <p>
                Specification and rubric hashes lock acceptance criteria before
                funding.
              </p>
            </article>
            <article className="feature-card">
              <GitPullRequest aria-hidden="true" size={24} />
              <h3>Exact-commit binding</h3>
              <p>
                The deliverable commits to repository, PR, base SHA, and
                immutable head SHA.
              </p>
            </article>
            <article className="feature-card">
              <ScanSearch aria-hidden="true" size={24} />
              <h3>Deterministic gates</h3>
              <p>
                Identity, size, files, PR state, and CI are checked before any
                model judgment.
              </p>
            </article>
            <article className="feature-card">
              <Bot aria-hidden="true" size={24} />
              <h3>Explainable AI</h3>
              <p>
                Each rubric item receives a bounded score, concise reason, and
                diff-level evidence.
              </p>
            </article>
            <article className="feature-card">
              <Braces aria-hidden="true" size={24} />
              <h3>Canonical report</h3>
              <p>
                Application code recalculates totals, validates the schema, then
                hashes stable JSON.
              </p>
            </article>
            <article className="feature-card">
              <LockKeyhole aria-hidden="true" size={24} />
              <h3>Bounded settlement</h3>
              <p>
                An EIP-712 verdict binds{" "}
                <code>chain + job + deliverable + report</code>.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="section section-compact">
        <div className="shell split-callout">
          <div>
            <p className="eyebrow">Why AI</p>
            <h2>Software acceptance is evidence-heavy, not purely binary.</h2>
            <p>
              CI can say tests passed. It cannot reliably decide whether those
              tests prove the requested behavior, whether a change only appears
              compliant, or which diff lines support each criterion.
            </p>
            <ul className="mono-list">
              <li>Criteria evaluated independently</li>
              <li>Weighted total computed deterministically</li>
              <li>Ambiguity routes to manual review</li>
            </ul>
          </div>
          <div>
            <p className="eyebrow">Why X Layer + ERC-8183</p>
            <h2>
              Fast EVM settlement around a shared agent-commerce primitive.
            </h2>
            <p>
              ERC-8183 supplies the client-provider-evaluator escrow lifecycle.
              X Layer provides an EVM-equivalent execution environment where
              ScopeSettle’s hashes, verdict, and settlement remain independently
              inspectable.
            </p>
            <ul className="mono-list">
              <li>Single-token non-custodial escrow</li>
              <li>Permissionless expiry refund</li>
              <li>Indexed evidence-linked events</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="beta-band">
        <div className="shell beta-inner">
          <ShieldAlert aria-hidden="true" size={24} />
          <div>
            <h2>Transparent beta security model</h2>
            <p>
              Contracts are unaudited. The evaluator signer and reviewer are
              trusted. AI and CI can be wrong. Use only low-value test funds and
              inspect cited evidence.
            </p>
          </div>
          <Link
            className="button button-secondary button-small"
            href="/jobs/1952/42"
            prefetch={false}
          >
            <FileCheck2 aria-hidden="true" size={15} /> Inspect the report
          </Link>
        </div>
      </section>
    </>
  );
}
