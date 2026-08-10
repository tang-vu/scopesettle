# ScopeSettle AI Season submission package

Official deadline: **August 21, 2026 at 23:59 UTC**. The
[official requirements](https://web3.okx.com/vi/xlayer/build-x-series) require AI in the product,
an X Layer Testnet deployment followed by Mainnet launch, a dedicated active X account, and a
submission post mentioning `@XLayerOfficial`.

**Current eligibility:** not ready to submit. The software and local proof are complete, but the
required external Testnet/Mainnet deployments, public app, dedicated X account, and post do not yet
exist. Do not submit fixture URLs or local transactions in their place.

## Copy-ready form fields

- **Project Name:** ScopeSettle
- **Project Description:** ScopeSettle is an explainable AI evaluator and settlement layer for
  agent-to-agent coding work. A client funds an ERC-8183 job on X Layer, a provider commits an exact
  public GitHub PR head, and ScopeSettle produces an evidence-linked verdict that can release or
  refund escrow after a challenge window.
- **Project URL:** `[required: live public app]`
- **GitHub:** `https://github.com/tang-vu/scopesettle`
- **Email:** `[required: owner contact]`
- **Telegram:** `[required: owner handle]`
- **X handle:** `[required: dedicated active project account]`
- **X post URL:** `[required: public post mentioning @XLayerOfficial]`

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

| Official criterion             | ScopeSettle evidence                                                                   | Current status                    |
| ------------------------------ | -------------------------------------------------------------------------------------- | --------------------------------- |
| Application of AI              | Criterion-level semantic review with validated diff citations and deterministic math   | Implemented and tested locally    |
| Innovation                     | Evidence-bound AI verdicts settle an ERC-8183 escrow after a challenge window          | Implemented in contracts and app  |
| Product completeness           | Create, fund, submit, evaluate, challenge, resolve, finalize, and refund flows         | Local end-to-end beta complete    |
| User value                     | Replaces subjective acceptance and payment coordination with an auditable workflow     | Demonstrable with honest fixture  |
| X Layer integration            | Chain-bound contracts, wallet flow, explorer links, and protected deployment pipeline  | External deployment still missing |
| Growth potential               | Reusable settlement primitive for coding agents before expansion to other deliverables | Thesis documented; no fake usage  |
| X Layer ecosystem contribution | Real work-linked transactions and evidence commitments, with no fee or wash volume     | Requires real launch proof        |

## Release and submission gate

- [ ] X Layer Testnet contract source verification and deployment record
- [ ] Real completed Testnet job/report/transactions linked
- [ ] Mainnet deployment/source verification after fresh explicit approval
- [ ] Mainnet web configuration and low-value launch validation
- [ ] Live public URL backed by the production database/evaluator configuration
- [ ] 90-second demo video using only real public links
- [ ] Dedicated X account and post mentioning `@XLayerOfficial`
- [ ] Owner Email, Telegram, X handle, and self-custodial prize wallet confirmed
- [ ] Final form submitted before the official deadline

The Hackathon Grant—not the AI-RWA Liquidity Grant or trading-volume Launch Grant—is the honest
target for the current product. ScopeSettle must not generate artificial DEX volume or represent
itself as an RWA project.
