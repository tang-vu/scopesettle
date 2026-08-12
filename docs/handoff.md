# ScopeSettle handoff

Last verified: 2026-08-12. Read this file together with [`PLANS.md`](../PLANS.md),
[`README.md`](../README.md), and the [deployment runbook](deployment-runbook.md).

## Repository state

- GitHub: `https://github.com/tang-vu/scopesettle`
- Branch: `main`; remote and local were synchronized and the worktree was clean.
- Verified implementation commits through `6416859084f3f4187d4af31d34bb72fa5305e752`.
- No open pull request, Dependabot alert, or CodeQL alert remained.
- Latest CI passed: `https://github.com/tang-vu/scopesettle/actions/runs/31400453787`.
- Latest CodeQL passed for Actions and JavaScript/TypeScript:
  `https://github.com/tang-vu/scopesettle/actions/runs/31400453238`.
- `main` requires strict `database`, `web`, `contracts`, `Analyze (actions)`, and
  `Analyze (javascript-typescript)` checks. Force pushes and deletion are disabled; linear history
  and conversation resolution are required. Admin enforcement is intentionally off so the owner
  can preserve the requested direct commit/push workflow.
- Dependabot alerts, automated security fixes, secret scanning, push protection, CodeQL default
  setup, and private vulnerability reporting are enabled. Unsupported dependency majors are
  narrowly ignored until their peer/runtime constraints become compatible; patch/minor/security
  updates remain enabled.

## What is complete

- Milestones 1–5, 7, and 8 are complete; milestone 6 now includes a completed deterministic
  contract lifecycle on X Layer Testnet.
- The product includes the public landing page, wallet dashboard, create/fund flow, exact job view,
  role actions, evidence report, responsive design, accessibility/error/loading states, and a
  clearly labeled illustrative example.
- Every completed report now exposes a deterministic decision proof: weighted score arithmetic,
  immutable thresholds, gate outcomes, and fail-closed manual-review precedence are visible without
  requiring a judge to reconstruct evaluator code.
- `AgenticCommerce` implements the minimal zero-fee, non-upgradeable ERC-8183 lifecycle with an
  immutable ERC-20, SafeERC20, reentrancy protection, escrow accounting, and permissionless expiry.
- `ScopeSettleEvaluator` verifies chain/contract-bound EIP-712 verdicts, prevents nonce/digest
  replay, enforces score/confidence/challenge policy, and supports trusted manual review.
- GitHub ingestion pins the exact public PR head SHA, caps files/patches/response sizes, consumes CI
  metadata without executing repository code, and treats all repository text as hostile input.
- The OpenAI Responses provider is server-only, validates structured output with Zod, recalculates
  weighted scores deterministically, fails closed, and has no production mock fallback.
- PostgreSQL stores auth nonces/sessions, immutable job documents, evidence reports, evaluation
  leases, and atomic wallet quota buckets. Onchain state remains authoritative.
- Protected local, Testnet mock, and production-shaped deployment scripts exist. Testnet source
  verification is automated through OKLink after the required delay.
- Protected workflows now reject invalid token/role/chain inputs, reconcile deployed runtime and
  immutable bindings from RPC, verify sources, and preserve normalized deployment plus raw
  broadcast records for review before they enter the canonical ledger.
- Submission documentation, demo script, X thread, threat model, methodology, architecture,
  deployment ledger, security policy, and contribution guide are present.

## Last verified quality evidence

- Local `pnpm check`: passed.
- Solidity: 45/45 tests passed, including fuzz and invariant suites.
- TypeScript unit/component: 23/23 tests passed.
- Playwright: 24/24 public, mobile, accessibility, metadata, visual, and wallet lifecycle tests.
- Production Next.js build: passed.
- PostgreSQL 17 migration set applied twice in CI, proving application and idempotency.
- Contract coverage: 93.82% total lines and 98.55% total branches; the three core contracts have
  100% line/branch/function coverage.
- `pnpm peers check`: no peer issues. `pnpm audit --audit-level low`: no known vulnerabilities.
- Latest recorded Lighthouse audit: desktop 99/100/100/100 and mobile 82/100/100/100 for
  performance/accessibility/best-practices/SEO, with zero cumulative layout shift.

## External configuration already completed

- Repository description is `Explainable AI settlement for ERC-8183 agent jobs on X Layer.`
- Topics: `ai-agents`, `erc-8183`, `nextjs`, `solidity`, `xlayer`.
- GitHub environments exist:
  - `xlayer-testnet-preflight`
  - `xlayer-testnet-broadcast`, protected by reviewer `tang-vu`
  - `xlayer-mainnet-preflight`
  - `xlayer-mainnet-broadcast`, protected by reviewer `tang-vu`
- Both Testnet environments contain only `XLAYER_TESTNET_RPC_URL`, set to the official primary
  Testnet RPC.
- Both Mainnet environments contain only `XLAYER_MAINNET_RPC_URL`, set to the official primary
  Mainnet RPC. No deployment credential or role has been generated.
- Both official Testnet RPCs returned chain ID `1952`; the observed gas price was `20,000,001` wei.
- Both configured Mainnet RPCs returned chain ID `196`; they reported the same current gas price.
- The mock stack was deployed at X Layer Testnet block `38086528`; RPC reads reconciled all runtime
  bytecode and immutable bindings, and OKLink published matching sources for all three contracts.
- Canonical addresses, transaction hashes, compiler settings, roles, and deployment time are in
  `deployments/xlayer-testnet-1952-2026-08-12.json`.
- Official Testnet verifier URL used by the protected workflow:
  `https://www.oklink.com/api/v5/explorer/contract/verify-source-code-plugin/XLAYER_TESTNET`.

## External blockers and secrets still missing

No hosted OpenAI-backed Testnet evaluation, full app deployment, Mainnet deployment, or public X
post exists. A static public judge dossier is published through GitHub Pages. The Testnet contract
deployment and deterministic job `2` lifecycle are real and source-verified; never describe the
smoke verdict as an AI code evaluation.

Testnet job `2` completed through create, fund, EOA submit, signed verdict, challenge window, and
finalization. It released exactly `1 mUSDG` to the dedicated Testnet EOA provider. The immutable
report, verdict, role, receipt, and post-settlement evidence is recorded in
`deployments/xlayer-testnet-job-2-2026-08-12.json`.

Testnet job `1` is funded with `1 mUSDG` and awaits submission by the configured Agentic Wallet
provider. Its evidence record is `deployments/xlayer-testnet-job-1-2026-08-12.json`. The OKX
transaction scanner does not support chain `1952`, which is a coverage limitation rather than a
risk verdict. The funded job becomes permissionlessly refundable after
`2026-08-13T15:24:32Z`.

The owner later authorized bypassing the unavailable scan. RPC simulation of `submit` succeeded at
an estimated `56,908` gas, but Agentic Wallet rejected the UserOperation before broadcast with
`may_be_out_of_gas` even at explicit `100,000` and `500,000` gas limits. No submit transaction was
created. Retry only after the Agentic Wallet Testnet backend changes or support resolves the issue;
otherwise claim the permissionless refund after expiry.

The two Testnet GitHub environments still need these names if future deployments must use the
protected workflow, configured independently without putting values in chat or Git:

- `DEPLOYER_PRIVATE_KEY`
- `EVALUATOR_SIGNER_ADDRESS`
- `REVIEWER_ADDRESS`
- `OKLINK_API_KEY`

The generic production-shaped environments additionally require `PAYMENT_TOKEN_ADDRESS`,
`OKLINK_API_KEY`, `DEPLOYER_PRIVATE_KEY`, `EVALUATOR_SIGNER_ADDRESS`, `REVIEWER_ADDRESS`, and
`OKLINK_CHAIN_SHORT_NAME` copied from OKLink's current supported-chain list. Their appropriate
X Layer RPC secrets are already configured.

The current Testnet deployer remains funded with valueless Testnet OKB. Its key, the evaluator
signer, and the reviewer must remain securely recoverable. Do not generate a production key without
an owner-approved custody/backup plan.

A hosted web release additionally needs:

- `DATABASE_URL`
- `SESSION_SECRET` of at least 32 random characters
- `OPENAI_API_KEY` and `OPENAI_MODEL`
- `EVALUATOR_PRIVATE_KEY` matching `EVALUATOR_SIGNER_ADDRESS`
- optional `GITHUB_TOKEN`
- deployed public addresses/block in the documented `NEXT_PUBLIC_*` variables

The dedicated ScopeSettle X account, public launch post, hosting/database accounts, and any Mainnet
approval are still human/external actions. Mainnet must not be attempted before a source-verified,
end-to-end Testnet job and fresh explicit approval.

## Tooling note

`onchainos preflight --skill-version 4.1.0` reported the installed runtime integrity as valid, but
its attempted update to `4.4.9` failed checksum verification. No forced global upgrade was
performed. Do not bypass that checksum; use the repository's bundled Foundry tools or resolve the
official package integrity issue first.

Local Docker was not running, so PostgreSQL integration was validated with GitHub Actions' isolated
PostgreSQL 17 service instead. That gate passed on the final CI run.

## Exact next sequence

1. Configure the deployed Testnet addresses in the hosted web environment, together with the
   PostgreSQL/OpenAI/evaluator secrets, run migrations, deploy the web app, and complete an
   OpenAI-backed Testnet create → fund → submit → evaluate → challenge/finalize flow.
2. Link the judge path to the hosted completed job while retaining the deterministic job `2`
   evidence as the contract-wiring proof, then rerun
   `pnpm check`, CodeQL, dependency/secret review, Lighthouse, responsive QA, and documentation audit.
3. Optionally add the Testnet signer/role secrets to the protected GitHub environments before any
   future redeployment; never paste a private key into chat or Git.
4. Only then request fresh Mainnet approval, deploy/verify with a real supported payment token, and
   perform the public X launch/submission actions.

## Rules for the next chat

- Communicate with the owner in Vietnamese.
- After every coherent update, run relevant checks, commit, and push to `main`.
- Do not invent addresses, use a mock as real infrastructure, execute submitted code, print keys,
  weaken tests, or broadcast a real transaction without the required chain check and approval.
- Start with `git status`, read `AGENTS.md`, this handoff, `PLANS.md`, and the deployment runbook;
  continue from the existing implementation rather than rebuilding it.
