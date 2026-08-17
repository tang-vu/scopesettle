# ScopeSettle AI Season submission package

Official deadline: **August 21, 2026 at 23:59 UTC**. The
[official requirements](https://web3.okx.com/vi/xlayer/build-x-series) require AI in the product,
an X Layer Testnet deployment followed by Mainnet launch, a dedicated active X account, and a
submission post mentioning `@XLayerOfficial`.

**Current eligibility:** Testnet deployment, a completed deterministic lifecycle, hosted AI-backed
job `3`, the production web app, the source-verified Mainnet launch, the dedicated project X account,
and its public submission post are complete. Owner email and Telegram fields remain required before
final submission. The public demo video is complete. Do not
describe job `2` as an AI code review or the Mainnet deployment as user adoption.

The live form currently contains eight fields: Project Name, Project Description, Project URL,
Github, Email, Telegram, X handle, and X post URL. Google marks Github and X post URL optional in
the form UI, but the official event rules still require the project-account post.

## Copy-ready form fields

- **Project Name:** ScopeSettle
- **Project Description:** ScopeSettle is an explainable AI evaluation and ERC-8183 settlement
  layer for agent-to-agent coding work on X Layer. It binds immutable scope and a pinned GitHub PR
  to validated evidence, a replay-protected verdict, a challenge window, and automatic escrow
  release or refund.
- **Project URL:** `https://scopesettle.vercel.app`
- **GitHub:** `https://github.com/tang-vu/scopesettle`
- **Email:** `[required: owner contact]`
- **Telegram:** `[required: owner handle]`
- **X handle:** `@scopesettle`
- **X post URL:** `https://x.com/scopesettle/status/2089206766060134677`

Founder amplification post:
`https://x.com/tangvu_dev/status/2089207028451619191`. Use the project-account post above in the
official form.

## Technical summary

Non-upgradeable Solidity escrow implements the six-state ERC-8183 draft lifecycle around one
immutable ERC-20 with zero fee. A separate EIP-712 evaluator verifies exact-deliverable/report
verdicts, replay protection, policy thresholds, challenges, and manual review. Next.js ingests only
bounded public GitHub data, runs deterministic gates, performs schema-constrained OpenAI evaluation,
validates citations, recomputes scores, hashes canonical JSON, and signs only policy-valid verdicts.

## Why it matters to X Layer

ScopeSettle turns X Layer from a payment rail into an auditable commerce settlement layer for AI
agents. The job lifecycle, evidence commitments, verdict proposal, challenge, payout/refund, and
public history create meaningful onchain activity tied to real economic work—not artificial volume.

## AI implementation

AI evaluates semantic acceptance criteria that ordinary checks cannot prove. It is bounded by exact
commit metadata, deterministic gates, hostile-content defenses, structured outputs, evidence
validation, deterministic score math, confidence thresholds, and fail-closed manual review.

## Judge-facing evidence map

| Official criterion             | ScopeSettle evidence                                                                   | Current status                              |
| ------------------------------ | -------------------------------------------------------------------------------------- | ------------------------------------------- |
| Application of AI              | Criterion-level semantic review with validated diff citations and deterministic math   | Live in hosted Testnet job 3                |
| Innovation                     | Evidence-bound AI verdicts settle an ERC-8183 escrow after a challenge window          | Implemented in contracts and app            |
| Product completeness           | Create, fund, submit, evaluate, challenge, resolve, finalize, and refund flows         | Public hosted flow + Testnet receipts       |
| User value                     | Replaces subjective acceptance and payment coordination with an auditable workflow     | Demonstrable with labeled example and proof |
| X Layer integration            | Chain-bound contracts, wallet flow, explorer links, and protected deployment pipeline  | Testnet and Mainnet source-verified         |
| Growth potential               | Reusable settlement primitive for coding agents before expansion to other deliverables | Thesis documented; no fake usage            |
| X Layer ecosystem contribution | Real work-linked transactions and evidence commitments, with no fee or wash volume     | Testnet lifecycle completed                 |

## Release and submission gate

- [x] X Layer Testnet contract source verification and deployment record
- [x] Completed deterministic Testnet lifecycle and transactions linked
- [x] Hosted OpenAI-backed Testnet evaluation linked
- [x] Mainnet deployment/source verification after fresh explicit approval
- [x] Mainnet contract launch, source verification, and canonical deployment record
- [x] Public judge-proof URL with immutable Testnet evidence
- [x] Live app URL backed by the production database/evaluator configuration
- [x] 90-second demo video using only real public links
- [x] Dedicated `@scopesettle` account and post mentioning `@XLayerOfficial`
- [ ] Owner Email and Telegram confirmed; project X handle is complete
- [ ] Final form submitted before the official deadline

## Mainnet deployment checkpoint

- Target chain: X Layer Mainnet, chain ID `196` (confirmed by both official RPCs).
- Payment token: native USDC,
  `0x74b7f16337b8972027f6196a17a631ac6de26d22` (official docs, non-empty runtime, 6 decimals).
- Deployer: `0x66dd076f5cbb8c8dc4825c8eb7148df55bd565a6`.
- Source commit: `88dbf456b644b4326c1467db36da411ea2292bd3`.
- AgenticCommerce: `0xef0b78c4dd4cd167fddad7edb48cf7f9e4c5fac1`.
- ScopeSettleEvaluator: `0x76a0f64d59699be3330d6088a157a7941bcad3cc`.
- Both contracts are source-verified on OKLink and reconciled through both official RPCs.
- Total deployment cost: `0.000087625584381279 OKB` for `4,381,279` gas.
- No Mainnet job or USDC transfer has been performed; the contracts remain an unaudited beta.

The Hackathon Grant—not the AI-RWA Liquidity Grant or trading-volume Launch Grant—is the honest
target for the current product. ScopeSettle must not generate artificial DEX volume or represent
itself as an RWA project.
