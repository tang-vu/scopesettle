# Architecture

ScopeSettle is a narrow evaluation and settlement system for public GitHub pull-request work.
Onchain escrow is authoritative; the web/database layer cannot fabricate settlement.

```mermaid
flowchart LR
  C[Client wallet] -->|create, approve, fund| AC[AgenticCommerce\nERC-8183 escrow]
  P[Provider wallet] -->|submit exact PR commitment| AC
  W[Next.js web/API] --> GH[GitHub API\npublic metadata + exact SHA]
  W --> G[Deterministic gates]
  G --> AI[Structured AI evaluator]
  AI --> R[(Canonical report store)]
  R --> S[Trusted evaluator signer]
  S -->|EIP-712 verdict| EV[ScopeSettleEvaluator]
  R --> V[Deterministic verification engine]
  X --> V
  V --> CERT[(Machine-readable certificate)]
  EV -->|propose / finalize| AC
  EV -->|report hash, score, confidence| X[X Layer events]
  AC -->|release or refund ERC-20| C
  AC -->|release or refund ERC-20| P
  W -->|reconcile reads| X
```

## Components and trust boundaries

`AgenticCommerce` implements the minimal six-state escrow with one immutable token and no
fee/admin withdrawal. A ScopeSettle job adds immutable specification and rubric commitments
plus score, confidence, and challenge policy. The provider submits a `bytes32` commitment
covering repository identity, PR number, and exact head SHA.

`ScopeSettleEvaluator` is the job evaluator address. It verifies a server-held signer's EIP-712
verdict, binds it to this chain/contract/job/deliverable/report/nonce/deadline, and records the
proposal. Eligible unchallenged proposals can be finalized by anyone after the challenge
window. Either party can challenge; challenged or model-ambiguous outcomes require the named
reviewer. This is a transparent trusted-evaluator system, not a trustless AI oracle.

The Next.js server verifies wallet sessions, reads the onchain job, ingests bounded GitHub data
for the exact commit, runs deterministic gates, sends hostile repository content to a structured
model prompt with explicit data delimiters, validates the output, recomputes the weighted score,
canonicalizes and hashes the report, persists evidence, and only then prepares/signs a verdict.

PostgreSQL stores expiring single-use auth nonces, job documents, reports, atomic per-job evaluator
leases, and UTC-hour per-wallet quota buckets. A ten-minute expiring lease prevents concurrent paid
model calls for one job; a completed report is reused and only its expired verdict signature is
refreshed. The database may cache public metadata, but all job state and settlement displays are
reconciled against RPC reads/events. The public example is clearly labeled local fixture data until
a real Testnet job exists.

Database migrations run in filename order under a PostgreSQL advisory transaction lock. Applied
SHA-256 checksums are persisted, and editing an already-applied migration fails closed.

The verification engine is a pure shared-package function. Given a report and public context, it
validates the schema, removes the embedded report hash, re-hashes canonical JSON, recalculates the
weighted score and policy verdict, binds the funded rubric and pinned deliverable, and compares the
result with the evaluator proposal. The web API gathers current RPC and database evidence but does
not decide whether a check passes; consumers can reproduce the same checks independently.

## Canonical commitments

- Specification/rubric JSON uses deterministic recursive key ordering and UTF-8 encoding.
- `keccak256` commits the resulting bytes for EVM-native verification.
- Deliverable commitment includes schema version, normalized owner/repository, PR number,
  base SHA, and pinned head SHA.
- The report excludes `reportHash` while hashing; the displayed object then adds that hash.
- EIP-712 domain separation supplies chain ID and verifying contract replay protection.

## Failure policy

Invalid URL/input, stale head SHA, oversized/binary-only diffs, low confidence, schema-invalid
model output, provider outage, or insufficient time before expiry fails closed to manual review;
production never substitutes the deterministic mock evaluator. Concurrent evaluation returns 409;
quota exhaustion returns 429 with `Retry-After`.
