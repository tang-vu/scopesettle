# Deployments

ScopeSettle's mock beta stack was deployed to X Layer Testnet on 2026-08-12. The canonical
machine-readable evidence is stored in `deployments/xlayer-testnet-1952-2026-08-12.json`.

| Network         | Chain ID | RPC source            | Payment token    | Commerce          | Evaluator         | Status                                 |
| --------------- | -------: | --------------------- | ---------------- | ----------------- | ----------------- | -------------------------------------- |
| Local Anvil     |    31337 | local process         | `MockUSDG`       | generated per run | generated per run | supported                              |
| X Layer Testnet |     1952 | official X Layer docs | `0xef0b…fac1`    | `0x76a0…d3cc`     | `0x02fa…1bf0`     | deployed; OKLink verification pending  |
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
is a valueless six-decimal faucet token for Testnet demonstrations only. OKLink source verification
remains pending and must not be described as complete until the explorer publishes the sources.
