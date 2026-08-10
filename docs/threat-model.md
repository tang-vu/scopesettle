# Threat model

ScopeSettle is unaudited beta software for low-value public-repository jobs. The evaluator
signer and reviewer are trusted. AI and GitHub CI can be wrong or malicious.

## Assets and trust boundaries

Assets are escrowed ERC-20 funds, job/rubric integrity, exact-commit identity, report evidence,
signing/session keys, and truthful UI state. Boundaries exist between wallets and browser, browser
and API, API and GitHub/model/database, signer and evaluator contract, evaluator and escrow,
and X Layer RPC/indexed cache.

| Threat                                      | Implemented or required mitigation                                                                                                                                                | Residual risk                                                        |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Malicious client                            | Immutable scope/rubric hashes; expected-budget check; provider protected after funding                                                                                            | Scope can still be poorly written                                    |
| Malicious provider                          | Provider-only submission; exact PR/commit commitment; deterministic metadata gates                                                                                                | Public code and CI may deceive evaluators                            |
| Compromised evaluator signer                | EIP-712 domain, deadline, digest/nonce replay protection, challenge window, separate reviewer                                                                                     | Signer can propose false verdicts; rotate by new deployment          |
| Malicious GitHub content / prompt injection | Treat all repo text as quoted untrusted data; fixed system policy; structured schema; evidence validation                                                                         | Models remain susceptible to novel attacks                           |
| SSRF through URLs                           | Parse/normalize only `https://github.com/{owner}/{repo}` and issue/PR forms; call fixed `api.github.com` origin                                                                   | GitHub itself remains an external dependency                         |
| API abuse / duplicate model calls           | Authenticated mutations, atomic per-job lease, three-run hourly wallet quota, `Retry-After`, report reuse                                                                         | Distributed wallets/public reads still need host-level edge controls |
| Large or adversarial diffs                  | Response/patch/file/line/time caps; binary/oversized inputs route to manual review; submitted code never runs                                                                     | GitHub availability and metadata remain external dependencies        |
| Signature replay / chain confusion          | Expiring single-use SIWE-style nonces; domain/URI/chain checks; EIP-712 chain and contract binding                                                                                | Compromised wallet can authenticate normally                         |
| Stale or changed PR                         | Read and bind exact head SHA; reject mismatch immediately before signing                                                                                                          | Force-pushed historical objects may become unavailable               |
| Evaluator centralization                    | Visible signer/reviewer disclosure, challenge path, hashes for independent audit                                                                                                  | No decentralized dispute court in beta                               |
| Reentrancy / hostile ERC-20                 | SafeERC20, nonReentrant transfers, effects first, immutable curated token, adversarial tests                                                                                      | Fee-on-transfer/rebasing tokens are unsupported                      |
| Expiry-boundary transaction ordering        | Challenge end cannot exceed expiry; terminal states are final; tests prove finalize/refund are mutually exclusive and the losing transaction fully reverts                        | At exact expiry, ERC-8183 permits both paths; block ordering decides |
| Database tampering                          | Onchain status is authoritative; report hash compared with event commitment                                                                                                       | Offchain evidence availability can be disrupted                      |
| Frontend transaction spoofing               | Review exact chain, contract, method, budget, token, hashes; resume checkpoints are receipt/state/allowance reconciled; index writes require the exact lifecycle event and job ID | Compromised frontend can still mislead; users should inspect wallets |
| Unsafe explorer links                       | Construct links only from fixed per-chain base URLs and validated hashes/addresses                                                                                                | Explorer content is third party                                      |
| Secret leakage                              | `server-only` import guards, env names only, redacted logs, secret scan in review/CI                                                                                              | Host compromise exposes runtime secrets                              |
| Dependency/supply chain                     | Lockfile enforcement, minimal packages, audit/updates, CI pinning                                                                                                                 | Malicious upstream release or action remains possible                |
| Mainnet deployment                          | Testnet-first checklist, bytecode/source verification, explicit approval, small-value warning                                                                                     | Contracts are unaudited; deployment mistakes are irreversible        |

## Smart-contract invariants

Escrow is conserved; terminal states are final; payout/refund occurs at most once; unauthorized
transitions revert; expiry refunds remain callable; a verdict cannot bind a different job,
deliverable, chain, contract, report, or policy; challenge-window boundaries are explicit.

## Operational response

If a signer, reviewer, web host, RPC, or dependency is compromised: stop new job creation in the
UI, publish the affected immutable deployment and time range, preserve onchain/report evidence,
advise users to claim eligible expiry refunds, rotate by deploying a new evaluator or full pair,
and never claim that an old immutable contract was upgraded.
