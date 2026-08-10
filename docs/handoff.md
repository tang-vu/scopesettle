# ScopeSettle handoff

Last verified: 2026-08-10. Read this file together with [`PLANS.md`](../PLANS.md),
[`README.md`](../README.md), and the [deployment runbook](deployment-runbook.md).

## Repository state

- GitHub: `https://github.com/tang-vu/scopesettle`
- Branch: `main`; remote and local were synchronized and the worktree was clean.
- Verified base before this handoff note: `5d7b81585fd71beb0fd1a0941501ba8307f579f8`.
- No open pull request, Dependabot alert, or CodeQL alert remained.
- Latest CI passed: `https://github.com/tang-vu/scopesettle/actions/runs/31363633961`.
- Latest CodeQL passed for Actions and JavaScript/TypeScript:
  `https://github.com/tang-vu/scopesettle/actions/runs/31363633850`.
- `main` requires strict `database`, `web`, `contracts`, `Analyze (actions)`, and
  `Analyze (javascript-typescript)` checks. Force pushes and deletion are disabled; linear history
  and conversation resolution are required. Admin enforcement is intentionally off so the owner
  can preserve the requested direct commit/push workflow.
- Dependabot alerts, automated security fixes, secret scanning, push protection, CodeQL default
  setup, and private vulnerability reporting are enabled. Unsupported dependency majors are
  narrowly ignored until their peer/runtime constraints become compatible; patch/minor/security
  updates remain enabled.

## What is complete

- Milestones 1–5, 7, and 8 are complete; the locally achievable part of milestone 6 is complete.
- The product includes the public landing page, wallet dashboard, create/fund flow, exact job view,
  role actions, evidence report, responsive design, accessibility/error/loading states, and a
  clearly labeled illustrative example.
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
- Both environments contain only `XLAYER_TESTNET_RPC_URL`, set to the official primary Testnet RPC.
- Both official Testnet RPCs returned chain ID `1952`; the observed gas price was `20,000,001` wei.
- A local Anvil deployment using chain ID `1952` succeeded. The mock stack estimated `6,589,351`
  gas; local addresses and transactions are deliberately not recorded as external proof.
- Official Testnet verifier URL used by the protected workflow:
  `https://www.oklink.com/api/v5/explorer/contract/verify-source-code-plugin/XLAYER_TESTNET`.

## External blockers and secrets still missing

No external web or contract deployment exists. There are no real contract addresses, transaction
links, live URL, completed Testnet job, or public X post. Never substitute local/fixture evidence.

The two Testnet GitHub environments still need these names, configured independently without
putting values in chat or Git:

- `DEPLOYER_PRIVATE_KEY`
- `EVALUATOR_SIGNER_ADDRESS`
- `REVIEWER_ADDRESS`
- `OKLINK_API_KEY`

The deployer must be funded with valueless Testnet OKB from the official faucet. The deployer,
evaluator signer, and reviewer should be deliberately selected and securely recoverable. Do not
generate a production key without an owner-approved custody/backup plan.

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

1. Add the four missing Testnet secrets to both protected GitHub environments and fund the derived
   deployer with Testnet OKB. Never paste a private key into chat.
2. Recheck the ERC-8183 draft, chain ID, RPC health, deployer address/balance, immutable signer and
   reviewer, current gas price, and exact simulation output.
3. Trigger only the protected Testnet workflow:

   ```powershell
   gh workflow run deploy-testnet-mock.yml `
     --repo tang-vu/scopesettle `
     -f confirmation="DEPLOY VALUELESS TESTNET BETA"
   ```

4. Inspect preflight evidence, then explicitly approve the separate broadcast environment. Record
   the resulting addresses, transactions, deployment commit/block/date, constructor roles, explorer
   links, and verification status in `deployments/`, `docs/deployments.md`, and the web environment.
5. Configure the hosted PostgreSQL/OpenAI/evaluator/web secrets, run migrations, deploy the web app,
   and complete a real low-value Testnet create → fund → submit → evaluate → challenge/finalize flow.
6. Replace the illustrative judge path with a clearly labeled real completed Testnet job, rerun
   `pnpm check`, CodeQL, dependency/secret review, Lighthouse, responsive QA, and documentation audit.
7. Only then request fresh Mainnet approval, deploy/verify with a real supported payment token, and
   perform the public X launch/submission actions.

## Rules for the next chat

- Communicate with the owner in Vietnamese.
- After every coherent update, run relevant checks, commit, and push to `main`.
- Do not invent addresses, use a mock as real infrastructure, execute submitted code, print keys,
  weaken tests, or broadcast a real transaction without the required chain check and approval.
- Start with `git status`, read `AGENTS.md`, this handoff, `PLANS.md`, and the deployment runbook;
  continue from the existing implementation rather than rebuilding it.
