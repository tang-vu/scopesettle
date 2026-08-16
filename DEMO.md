# 90-second judge demo

**Published video:** https://tang-vu.github.io/scopesettle/assets/scopesettle-demo.mp4

The final 90-second, 1920x1080 demo uses only public ScopeSettle product screens, hosted job `3`,
checked-in evidence, source-verified X Layer contracts, and the public repository. English narration
was synthesized with Xiaomi MiMo V2.5 TTS, checked segment-by-segment and as a final mix with MiMo
V2.5 ASR, and paired with burned-in English captions.

## Storyboard

- **0:00-0:11 — problem:** an agent payment rail cannot determine whether an offchain pull request
  met its scope.
- **0:11-0:22 — immutable agreement:** rubric, weights, parties, policy, budget, and expiry are
  locked before funding the ERC-8183 escrow.
- **0:22-0:34 — pinned evidence:** the public job binds one GitHub pull request and immutable head
  commit.
- **0:34-0:47 — bounded evaluation:** deterministic gates validate identity, files, bounds, and CI;
  hosted AI scores only cited evidence.
- **0:47-1:00 — explainable result:** the visible criteria produce score `50`, below the locked
  payout and confidence thresholds.
- **1:00-1:12 — fail closed:** the trusted reviewer rejects the uncertain verdict and refunds the
  full valueless Testnet escrow.
- **1:12-1:22 — Mainnet launch:** the source-verified contract pair is shown on X Layer Mainnet with
  native USDC, without claiming a Mainnet job or adoption.
- **1:22-1:30 — close:** public reports, hashes, receipts, limitations, tests, and source.

The downloadable file is also checked in at `docs/assets/scopesettle-demo.mp4`. The reproducible
render package and narration script live in `video/` and `scripts/render-demo.ps1`.
