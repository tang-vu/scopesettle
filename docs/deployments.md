# Deployments

ScopeSettle's mock beta stack was deployed to X Layer Testnet on 2026-08-12, followed by the
production-shaped pair on X Layer Mainnet on 2026-08-13. Canonical machine-readable evidence is
stored under `deployments/`.

| Network         | Chain ID | RPC source            | Payment token | Commerce          | Evaluator         | Status                                 |
| --------------- | -------: | --------------------- | ------------- | ----------------- | ----------------- | -------------------------------------- |
| Local Anvil     |    31337 | local process         | `MockUSDG`    | generated per run | generated per run | supported                              |
| X Layer Testnet |     1952 | official X Layer docs | `0xef0b…fac1` | `0x76a0…d3cc`     | `0x02fa…1bf0`     | deployed and source-verified on OKLink |
| X Layer Mainnet |      196 | official X Layer docs | native `USDC` | `0xef0b…fac1`     | `0x76a0…d3cc`     | deployed and source-verified on OKLink |

Every external record must add deployment date, source commit SHA, deployer, payment token,
contract addresses, deployment block, explorer links, transaction hashes, compiler settings, and
verification status. A Testnet mock must be labeled `MockUSDG`; it must never be represented as an
official asset or deployed to Mainnet.

## Preflight order

1. Recheck the EIP draft, official RPC, explorer, verification method, and payment-token address.
2. Run `pnpm check` and `pnpm contracts:coverage` on the exact commit.
3. Query `eth_chainId`; require `1952` for Testnet or `196` for Mainnet.
4. Derive and show the deployer address without printing its private key.
5. simulate/estimate the deployment and show expected OKB gas plus the immutable token/signer/reviewer.
6. Obtain explicit confirmation for that exact network and command, then broadcast.
7. Verify deployed bytecode, immutable token/role bindings, and sources; compare the exported
   deployment record with Foundry's broadcast receipt before committing it to `deployments/`.
8. Complete one low-value end-to-end job before changing web configuration.

See [deployment runbook](deployment-runbook.md) for commands.

## X Layer Mainnet deployment

The owner explicitly confirmed chain `196` and native USDC
`0x74b7f16337b8972027f6196a17a631ac6de26d22`. Source commit
`88dbf456b644b4326c1467db36da411ea2292bd3` deployed the following immutable contracts on
2026-08-13:

- [`AgenticCommerce`](https://www.oklink.com/x-layer/address/0xef0b78c4dd4cd167fddad7edb48cf7f9e4c5fac1/contract)
  at `0xef0b78c4dd4cd167fddad7edb48cf7f9e4c5fac1`, deployment transaction
  [`0xbc26…6b85`](https://www.oklink.com/x-layer/tx/0xbc26c1f047af79bd1630f5fb90707f9669632bbc02a2063fe9e1df14a6b36b85).
- [`ScopeSettleEvaluator`](https://www.oklink.com/x-layer/address/0x76a0f64d59699be3330d6088a157a7941bcad3cc/contract)
  at `0x76a0f64d59699be3330d6088a157a7941bcad3cc`, deployment transaction
  [`0x01b8…11c7`](https://www.oklink.com/x-layer/tx/0x01b8b2b0d965dfa538bafa60e77e903b0bae6f048b9b421cef56f7622d9b11c7).

Both official RPCs returned matching runtime bytecode and immutable payment-token, commerce,
verdict-signer, and reviewer bindings. OKLink published matching source using Solidity `0.8.28`,
optimizer runs `10000`, and Cancun EVM. The two transactions used `4,381,279` gas and cost
`0.000087625584381279 OKB` in total. The canonical record is
`deployments/xlayer-mainnet-196-2026-08-13.json`.

No Mainnet job, USDC transfer, hosted AI evaluation, or user activity is claimed. These immutable
contracts remain unaudited beta software and must not hold meaningful funds.

## X Layer Testnet deployment

The deployment was mined at block `38086528` from source commit
`a21be84a2b6e6b5c86567fbb391f96f818e800ce`. RPC reads confirmed non-empty runtime bytecode and
the expected immutable payment-token, commerce, verdict-signer, and reviewer bindings. `MockUSDG`
is a valueless six-decimal faucet token for Testnet demonstrations only. OKLink published matching
sources for all three contracts using Solidity `0.8.28`, optimizer runs `10000`, and Cancun EVM.

## Testnet lifecycle evidence

Job `1` was created and funded on 2026-08-12 with exactly `1 mUSDG`, the explicitly valueless
Testnet mock. The client, Agentic Wallet provider, evaluator, immutable policy hashes, pinned public
pull-request commitment, and confirmed transaction receipts are recorded in
`deployments/xlayer-testnet-job-1-2026-08-12.json`. The initial provider submit was paused because
the OKX transaction scanner returned `Unsupported EVM chainId: 1952`. This is a scanner-coverage
limitation, not a low-risk verdict. This record must not be described as a completed or AI-evaluated
job.

The owner subsequently confirmed continuing without the unavailable scan. Direct RPC simulation
estimated `56,908` gas, but the Agentic Wallet backend rejected the submit UserOperation before
broadcast with `may_be_out_of_gas` using automatic, `100,000`, and `500,000` gas limits. Wallet
history remained empty and the provider nonce did not advance. The job therefore remains safely
funded and unchanged; do not present any transaction hash for the failed submission attempts.

Job `2` completed the same contract lifecycle with a dedicated ordinary Testnet EOA provider. The
client approved and funded exactly `1 mUSDG`; the provider submitted the pinned PR commitment; the
trusted evaluator signer proposed a deterministic pass verdict; and permissionless finalization
released the full escrow to the provider. All eight receipts succeeded on chain `1952`, and the
final RPC state reports job status `Completed`, provider balance `1 mUSDG`, and zero remaining job
`2` escrow. The commerce contract still holds `1 mUSDG` solely for unfinished job `1`.

The canonical evidence is
`deployments/xlayer-testnet-job-2-2026-08-12.json`. This proves source-verified contract wiring and
settlement, not AI evaluation quality: no model reviewed or executed repository code in this smoke
run. The completed transaction is
[`0x7016…a330`](https://www.oklink.com/x-layer-testnet/tx/0x7016b1c12d0fcbf0c1a9b1b9eb7313ad8fb017e97c6d210e6adea3bdca2da330).

Job `3` completed the hosted product workflow on 2026-08-13. Vercel served the application, Neon
persisted the immutable job document and report, and `openai/gpt-5-mini` evaluated the bounded diff
for pinned PR head `6899e3a96ea19c09d6d0cc28958cfa8241cc9a30`. It scored `50/100` with
`50%` confidence because the required lockfile criterion could not pass while pinned GitHub CI was
failing. The result correctly routed to `manual_review`; the explicitly trusted reviewer rejected
it, and transaction
[`0x27e4…e7ea`](https://www.oklink.com/x-layer-testnet/tx/0x27e4f1911b5cf7a6ecdde390182e87db2ff52896360ac09ef79c05e00df0e7ea)
refunded the full valueless `1 mUSDG` escrow. The public
[job](https://scopesettle.vercel.app/jobs/1952/3), downloadable
[report](https://scopesettle.vercel.app/api/jobs/1952/3/report), and
`deployments/xlayer-testnet-job-3-ai-2026-08-13.json` are the canonical hosted-AI evidence. Client
and provider intentionally share one Testnet EOA in this valueless proof; this is not user adoption.
