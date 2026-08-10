# Deployments

No external ScopeSettle deployment has been made. Addresses and transaction links remain absent
because the repository never fabricates deployment evidence.

| Network         | Chain ID | RPC source            | Payment token      | Commerce          | Evaluator         | Status                                 |
| --------------- | -------: | --------------------- | ------------------ | ----------------- | ----------------- | -------------------------------------- |
| Local Anvil     |    31337 | local process         | `MockUSDG`         | generated per run | generated per run | supported                              |
| X Layer Testnet |     1952 | official X Layer docs | `MockUSDG` planned | —                 | —                 | RPC verified; awaiting signer/approval |
| X Layer Mainnet |      196 | official X Layer docs | not yet selected   | —                 | —                 | blocked until Testnet proof + approval |

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

## Latest Testnet readiness evidence

On 2026-08-10, both official X Layer Testnet RPCs returned chain ID `1952`. A local Anvil run using
that chain ID deployed the mock beta stack successfully and estimated `6,589,351` gas. The official
RPC gas price observed during the same preflight was `20,000,001` wei, implying an indicative
`0.000131787` OKB before buffer. These are not external deployment records; gas, balance, roles,
nonce, and addresses must be freshly simulated from the real deployer before approval.
