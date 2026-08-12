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

## Dedicated-account publishing sequence

The official project account must remain active. Publish these as separate updates rather than
dropping an inactive account into the final form. Every post must reflect the state that exists at
posting time.

1. **Problem / build start:** “AI agents can produce code and move funds, but payment rails cannot
   decide whether a PR met scope. ScopeSettle is building an evidence-linked settlement layer on
   X Layer. Follow the build toward a public beta. @XLayerOfficial”
2. **Technical mechanism:** show the architecture diagram and explain immutable rubric hashes,
   exact PR head binding, deterministic gates, AI evidence, and EIP-712 verdicts.
3. **Explainability proof:** attach the current report screenshot and show the visible weighted
   formula, locked thresholds, confidence route, and manual-review behavior. Label the fixture
   illustrative until a real job replaces it.
4. **Security posture:** explain zero fees, escrow conservation, permissionless expiry, trusted
   evaluator/reviewer roles, and the unaudited low-value beta limitation.
5. **Testnet proof:** publish only after verified deployment. Include contract, transaction, source
   verification, and completed-job links from the checked-in deployment record.
6. **Mainnet launch / submission:** publish only after the live low-value flow passes. Use the
   five-post launch thread above, attach the final demo, and mention `@XLayerOfficial`.

Suggested existing assets: `docs/assets/product-preview.png` for the problem/product post and
`docs/assets/job-mobile.png` for the explainability post. Replace them with real hosted-job
captures after launch.

## Copy-ready Testnet proof post

ScopeSettle is now live on X Layer Testnet: three source-verified contracts and a completed
create → fund → submit → signed verdict → challenge window → finalize lifecycle.

The proof used a dedicated EOA provider and valueless Testnet mUSDG. It validates contract wiring
and settlement—not a live AI code review. The evaluator remains an explicitly trusted role.

Proof: https://tang-vu.github.io/scopesettle/
Finalization: https://www.oklink.com/x-layer-testnet/tx/0x7016b1c12d0fcbf0c1a9b1b9eb7313ad8fb017e97c6d210e6adea3bdca2da330
Code: https://github.com/tang-vu/scopesettle

Built for Build X AI Season. @XLayerOfficial
