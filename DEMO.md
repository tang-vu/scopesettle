# 90-second judge demo

**Published video:** https://tang-vu.github.io/scopesettle/assets/scopesettle-demo.mp4

The final 90-second, 1920x1080 demo uses public ScopeSettle product screens and hosted job `3`.
The developer-console scene is a visibly labelled local UI fixture with no production credentials;
the verifier CLI scene presents the independently reproduced result for that public job. English
narration was synthesized locally with Kokoro ONNX, checked segment-by-segment and after the final
mix with faster-whisper ASR, and paired with burned-in English captions. No exposed or Token Plan API
key was used.

## Storyboard

- **0:00-0:09 — problem:** an agent payment rail cannot determine whether an offchain pull request
  met its scope.
- **0:09-0:19 — immutable agreement:** rubric, parties, policy, budget, and expiry are locked before
  funding the ERC-8183 escrow.
- **0:19-0:29 — pinned evidence:** the public job binds one GitHub pull request plus immutable base
  and head commits.
- **0:29-0:41 — bounded evaluation:** deterministic gates validate identity, files, bounds, and CI;
  hosted AI scores only cited evidence.
- **0:41-0:52 — explainable result:** scores, reasons, citations, and limitations remain visible;
  deterministic code recomputes the weighted result.
- **0:52-1:01 — fail closed:** the trusted reviewer rejects the uncertain verdict and refunds the
  full valueless Testnet escrow.
- **1:01-1:11 — integrity certificate:** ten report, policy, deliverable, evaluator, and onchain
  bindings independently reproduce for public job `3`.
- **1:11-1:20 — open SDK and CLI:** integrators reproduce the checks directly from X Layer RPC,
  without trusting the ScopeSettle web server.
- **1:20-1:30 — integration infrastructure:** scoped API keys, signed webhooks, durable retries, and
  an audit trail extend the settlement primitive into a product platform.

The downloadable file is checked in at `docs/assets/scopesettle-demo.mp4`. The reproducible render
package, capture test, local narration generator, and timing manifest live in `video/` and `scripts/`.
