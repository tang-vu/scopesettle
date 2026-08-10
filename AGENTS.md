# ScopeSettle repository guide

## Structure

- `apps/web`: Next.js App Router product and API routes.
- `contracts`: Foundry project, deploy scripts, and Solidity tests.
- `packages/shared`: canonical schemas, hashing, chain metadata, and ABIs.
- `deployments`: checked-in deployment records; never invent addresses.
- `docs`: research, architecture, evaluation, security, and operations.
- `scripts`: repository-wide automation.

## Commands

- `pnpm install --frozen-lockfile`: install exact dependencies.
- `pnpm dev`: run the web app.
- `pnpm check`: required aggregate quality gate.
- `pnpm test`: TypeScript unit and component tests.
- `pnpm test:e2e`: Playwright critical paths.
- `pnpm contracts:build`: compile Solidity with Foundry.
- `pnpm contracts:test`: run unit, fuzz, and invariant contract tests.
- `pnpm contracts:coverage`: meaningful Solidity coverage report.

## Conventions

- Always communicate with the repository owner in Vietnamese.
- After every completed source or documentation update, commit the coherent change and
  push it to the current upstream branch. Never include secrets or knowingly broken work.
- TypeScript is strict; validate every trust boundary with Zod.
- Server-only secrets stay in server modules and environment variables.
- Canonical documents use stable key ordering and lowercase `0x` hex.
- Prefer pure functions and explicit state machines over hidden side effects.
- UI copy must distinguish onchain truth, cached data, fixtures, and estimates.
- Use accessible HTML, visible focus states, reduced-motion support, and useful errors.

## Contract safety invariants

- Escrow inflow equals provider payout or client refund; no fee or admin withdrawal.
- Only valid ERC-8183 transitions are possible and terminal states never change.
- Only the provider submits; only the configured evaluator settles after submission.
- Effects precede interactions; token transfers use `SafeERC20` and reentrancy guards.
- Verdict signatures bind chain, evaluator contract, job, deliverable, report, outcome,
  nonce, and deadline; a nonce or digest is never accepted twice.
- Expired funded/submitted jobs remain permissionlessly refundable.
- The evaluator is trusted and must never be described as a trustless oracle.

## Definition of done

A change is done only when relevant lint, types, tests, production build, contract tests,
and documentation pass; core flows have honest loading/error/empty states; no secret,
fake metric, fake transaction, placeholder CTA, or unsupported claim is introduced.

## Prohibited shortcuts

Never execute submitted repository code, expose a private/evaluator key, fabricate
deployment data, silently fall back to fake AI in production, bypass report schema
validation, weaken tests to make CI green, or perform a real deployment without an
explicit chain-ID check and user confirmation.
