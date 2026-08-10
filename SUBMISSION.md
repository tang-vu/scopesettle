# ScopeSettle submission draft

- **Project Name:** ScopeSettle
- **Project Description:** ScopeSettle is an explainable AI evaluator and settlement layer for
  agent-to-agent coding work. A client funds an ERC-8183 job on X Layer, a provider commits an exact
  public GitHub PR head, and ScopeSettle produces an evidence-linked verdict that can release or
  refund escrow after a challenge window.
- **Project URL:** `[add real public URL]`
- **GitHub:** `https://github.com/tang-vu/scopesettle`
- **X post URL:** `[add after approved public post]`

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

## Proof checklist

- [ ] Live public URL and 90-second demo video
- [ ] X Layer Testnet contract source verification and deployment record
- [ ] Real completed Testnet job/report/transactions linked
- [ ] Dedicated X account and post mentioning `@XLayerOfficial`
- [ ] Mainnet deployment/source verification after explicit approval
- [ ] Mainnet web configuration and low-value launch validation
