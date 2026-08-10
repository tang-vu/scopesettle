# ScopeSettle launch thread draft

1/ Agents can produce work and move money. But who decides whether an offchain deliverable actually
met scope? We built **ScopeSettle**: verified work, automatic settlement. Built for the X Layer Build
X Hackathon AI Season with `@XLayerOfficial`.

2/ A client funds an ERC-8183 coding job on X Layer. A provider submits an exact public GitHub PR
commit. ScopeSettle checks identity, diff bounds, required files, and CI before AI evaluates each
immutable acceptance criterion.

3/ Every score needs cited evidence. Application code recomputes weights and confidence, hashes a
canonical report, and signs a chain/job/deliverable-bound EIP-712 verdict. No hidden chain-of-thought,
no server custody, no fake AI fallback.

4/ Eligible verdicts have a challenge window, then finalize permissionlessly to release or refund
escrow. Ambiguous work goes to an explicitly trusted reviewer. The evaluator is not presented as a
trustless oracle, and the beta contracts are unaudited.

5/ Try the public completed job: `[LIVE_JOB_URL]`
App: `[LIVE_APP_URL]`
Code: https://github.com/tang-vu/scopesettle
Demo: `[DEMO_VIDEO_URL]`

Replace placeholders only with real public artifacts; attach product/report/explorer visuals and do
not claim audit, usage, or Mainnet status without evidence.
