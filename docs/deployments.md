# Deployments

ScopeSettle's mock beta stack was deployed to X Layer Testnet on 2026-08-12. The canonical
machine-readable evidence is stored in `deployments/xlayer-testnet-1952-2026-08-12.json`.

| Network         | Chain ID | RPC source            | Payment token    | Commerce          | Evaluator         | Status                                 |
| --------------- | -------: | --------------------- | ---------------- | ----------------- | ----------------- | -------------------------------------- |
| Local Anvil     |    31337 | local process         | `MockUSDG`       | generated per run | generated per run | supported                              |
| X Layer Testnet |     1952 | official X Layer docs | `0xef0b…fac1`    | `0x76a0…d3cc`     | `0x02fa…1bf0`     | deployed and source-verified on OKLink |
| X Layer Mainnet |      196 | official X Layer docs | not yet selected | —                 | —                 | blocked until Testnet proof + approval |

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
