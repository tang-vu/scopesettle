# ScopeSettle execution plan

Last updated: 2026-08-12

Current cross-chat continuation state: [`docs/handoff.md`](docs/handoff.md).

Status markers: `[ ]` pending, `[~]` active, `[x]` complete, `[!]` externally blocked.

## Milestone 1 — Foundation

- [x] Inspect repository, Git state, and installed toolchain.
- [x] Verify hackathon, ERC-8183, X Layer network, and faucet facts.
- [x] Record sourced research and unresolved facts.
- [x] Choose and document architecture and initial threat model.
- [x] Initialize pnpm workspace, strict TypeScript, root commands, and CI skeleton.

Acceptance: clean install and the available root quality gates execute.

## Milestone 2 — Protocol

- [x] Implement non-upgradeable zero-fee ERC-8183 escrow.
- [x] Implement EIP-712 verdict proposal, challenge, review, and finalization.
- [x] Add local/Testnet-only payment token and deployment scripts.
- [x] Add unit, fuzz, invariant, replay, boundary, token, and reentrancy tests.
- [x] Export contract interfaces to the shared package.

Acceptance: Foundry build/test/coverage pass with at least 90% meaningful line/branch coverage.

## Milestone 3 — Product shell

- [x] Build design system, logo, responsive navigation, and status primitives.
- [x] Build landing, dashboard, create-job review, and job-detail evidence routes.
- [x] Implement required loading, empty, error, disconnected, and wrong-chain states.

Acceptance: routes are responsive, accessible, truthful, and contain no fake CTAs/data.

## Milestone 4 — Chain integration

- [x] Configure X Layer chains and injected EIP-1193 wallet support.
- [x] Add contract reads/writes, switching, approvals, receipts, and explorer links.
- [x] Reconcile indexed/cache data with RPC state.

Acceptance: local chain create/fund/submit/finalize/refund flows work with actionable errors.

## Milestone 5 — Evaluator

- [x] Add public GitHub URL validation and bounded exact-commit ingestion.
- [x] Add deterministic gates and adversarial fixtures.
- [x] Add server-only provider abstraction and OpenAI Responses implementation.
- [x] Validate, rescore, canonicalize, hash, persist, and EIP-712-sign reports.
- [x] Render deterministic and AI evidence separately.

Acceptance: exact commit binding, hostile-content handling, outages, and manual review are tested.

## Milestone 6 — End-to-end beta

- [x] Complete deterministic local workflow and public completed-job fixture.
- [x] Deploy and source-verify the mock stack on X Layer Testnet.
- [x] Run a deterministic, valueless Testnet contract lifecycle and record explorer evidence.
- [x] Run the hosted OpenAI-backed product workflow and publish its report and receipts.

Acceptance: judges can inspect a real completed Testnet job without a wallet.

## Milestone 7 — Product polish

- [x] Run browser QA at mobile, laptop, and desktop sizes and fix findings.
- [x] Run accessibility, dependency, static, and security review.
- [x] Audit error states, copy, dead code, dependencies, and secret leakage.

Acceptance: no serious accessibility issue and all achievable quality gates pass.

## Milestone 8 — Launch package

- [x] Finalize README, methodology, deployments, demo, submission, and X thread.
- [x] Prepare portable web and local/Testnet/Mainnet deployment instructions.
- [x] Run the final aggregate check and evidence-backed release review.
- [x] Deploy and source-verify the production-shaped pair on X Layer Mainnet after explicit approval.
- [x] Publish the database-backed application and completed hosted-AI Testnet job.
- [!] Dedicated X launch, demo video, owner contacts, and final submission.

Acceptance: submission assets match reality; human-only checklist is minimal and exact.

## Release hardening pass

- [x] Make create/fund retries resumable by client, chain, deployment, and specification hash,
      with creation-receipt, job-state, budget, and allowance reconciliation before continuation.
- [x] Expose client cancellation and trusted-reviewer resolution in the role action UI.
- [x] Serialize evaluator work per job and enforce an atomic per-wallet AI quota.
- [x] Add checksummed, advisory-lock-protected PostgreSQL migration execution.
- [x] Exercise network switch, wallet rejection/resume, submit, evaluate, propose, finalize, and
      manual review in isolated Chromium tests with no paid calls or public transactions.
- [x] Add production metadata, crawl/install/social assets, global recovery UI, and hardened headers.
- [x] Route-scope wallet providers, disable unnecessary route prefetch, and audit the production
      landing page at mobile and desktop Lighthouse profiles with zero layout shift.
- [x] Exercise the checksummed migration runner twice against PostgreSQL 17 in CI so schema drift
      and migration idempotency fail the release gate.
- [x] Enable GitHub dependency alerts and automated fixes, consolidate patched build tooling, add
      weekly dependency updates, and protect `main` with strict database/web/contract checks.
- [x] Expose a deterministic decision proof with visible weighted math, locked thresholds, and the
      exact pass/fail/manual-review precedence on every completed report.
- [x] Reconcile deployed bytecode and immutable bindings from RPC, verify sources, and preserve
      normalized deployment records plus raw Foundry receipts as protected workflow artifacts.
- [x] Add a deterministic verification engine, downloadable machine-readable certificates, and a
      live-job integrity UI covering schema, hash, score, rubric, policy, deliverable, and proposal.

## Architecture decisions

1. One immutable ERC-20 per escrow deployment; no fee, proxy, hook, or custody layer.
2. ERC-8183 kernel remains small; ScopeSettle-specific immutable commitments live in a
   policy extension attached at job creation.
3. The evaluator contract verifies signed verdicts and adds a bounded challenge period.
   Unchallenged eligible verdicts finalize permissionlessly; challenged/ambiguous ones
   require an explicitly trusted reviewer.
4. The exact PR head SHA is included in the deliverable commitment; verbose documents
   remain offchain and are content-hashed with deterministic canonical JSON.
5. GitHub content is data, never instructions; repository code is never executed.
6. Onchain state is authoritative. PostgreSQL is an optional index/cache and report store.
7. A deterministic fixture provider is test-only. Production evaluation fails closed when
   the configured AI provider is unavailable.

## External blockers log

- Mainnet and Testnet deployment evidence, a Neon-backed public app, and a Vercel AI Gateway-backed
  job are live. The remaining external inputs are the dedicated X account/post, demo video, owner
  contact fields, and final form submission.

## Testnet deployment readiness

- [x] Reverify both official Testnet RPCs return chain ID 1952.
- [x] Add a chain-guarded, valueless `MockUSDG` Testnet deployment path.
- [x] Add separate protected simulation and broadcast environments for the mock beta stack.
- [x] Automate post-broadcast explorer links and Foundry source verification through the official
      OKLink `XLAYER_TESTNET` endpoint.
- [x] Derive deployer, check balance, simulate exact gas, broadcast, reconcile immutable bindings,
      and source-verify all three contracts.
