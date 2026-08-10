# Deployment runbook

Use environment variables; never paste or echo keys. Foundry must be installed from its official
release. The deployment is non-upgradeable and has no admin withdrawal.

## Local Anvil

Start Anvil, then set the first three addresses to distinct local accounts:

```powershell
anvil --chain-id 31337
$env:LOCAL_TOKEN_HOLDER='<local account>'
$env:EVALUATOR_SIGNER_ADDRESS='<distinct local signer>'
$env:REVIEWER_ADDRESS='<distinct local reviewer>'
Push-Location contracts
forge script script/DeployLocal.s.sol --target-contract DeployLocal --rpc-url http://127.0.0.1:8545 --broadcast --unlocked --sender $env:LOCAL_TOKEN_HOLDER
Pop-Location
```

`MockUSDG` is valueless. Copy generated addresses only into `apps/web/.env.local`, run migrations
with `pnpm --filter @scopesettle/web db:migrate`, and start `pnpm dev`. The migration runner takes a
PostgreSQL advisory lock and rejects changed checksums for migrations that were already applied.

## X Layer Testnet then Mainnet

The official network/faucet pages currently do not publish a verified USDG Testnet contract
address. For the first public beta, use the explicitly Testnet-only `DeployTestnetMock` script. It
deploys a valueless six-decimal `MockUSDG` with a public faucet and has an immutable chain-ID guard
that reverts anywhere except chain `1952`:

```powershell
$env:TESTNET_TOKEN_HOLDER='<deployer address>'
Push-Location contracts
node ../scripts/run-forge.mjs script script/DeployTestnetMock.s.sol --target-contract DeployTestnetMock --rpc-url $env:XLAYER_TESTNET_RPC_URL --private-key $env:DEPLOYER_PRIVATE_KEY
# Add --broadcast only after reviewing the simulation and explicitly confirming the exact deployment.
Pop-Location
```

The protected `deploy-testnet-mock.yml` workflow runs tests, verifies chain ID, displays deployer,
OKB balance, gas price, immutable roles, and Foundry's gas estimate, then waits for the separately
protected `xlayer-testnet-broadcast` environment approval. After broadcast it waits the officially
recommended minute, derives the exact constructor arguments, and verifies all three contracts with
the OKLink `XLAYER_TESTNET` Foundry endpoint. It then reads every deployed runtime and immutable
role/token back from RPC, emits a normalized machine-readable deployment record, and preserves that
record plus Foundry's broadcast receipt as a 90-day workflow artifact. Review and commit the record
under `deployments/`; the artifact alone is not the canonical ledger. `MockUSDG` must always be
labelled valueless and must never be reused on Mainnet. Configure the five required secrets independently in
both GitHub environments: `XLAYER_TESTNET_RPC_URL`, `DEPLOYER_PRIVATE_KEY`,
`EVALUATOR_SIGNER_ADDRESS`, `REVIEWER_ADDRESS`, and `OKLINK_API_KEY`.

For an existing, independently verified payment token, the production-shaped broadcast remains:

After preflight and explicit confirmation, the broadcast shape is:

```powershell
Push-Location contracts
forge script script/DeployScopeSettle.s.sol --target-contract DeployScopeSettle --rpc-url $env:XLAYER_TESTNET_RPC_URL --private-key $env:DEPLOYER_PRIVATE_KEY --broadcast
Pop-Location
```

For Mainnet, substitute `XLAYER_MAINNET_RPC_URL` only after a verified Testnet workflow and fresh
explicit approval. The evaluator private key is separate from the deployer, stays server-side, and
must correspond to `EVALUATOR_SIGNER_ADDRESS`. Reconfirm the official verifier documentation and
the `XLAYER_TESTNET` chain short name immediately before an external deployment.

The manual GitHub workflow separates simulation from broadcast. Configure the same scoped secrets
in `<network>-preflight` and `<network>-broadcast`, and require a human reviewer on every broadcast
environment. Review the preflight chain ID, deployer, immutable roles/token, exact command, and gas
estimate before approving the second job. Mainnet approval additionally requires the recorded,
source-verified Testnet workflow.

The production-shaped workflow also requires `OKLINK_API_KEY` and
`OKLINK_CHAIN_SHORT_NAME` in each protected environment. Set the chain short name only from
OKLink's current supported-chain list; it is deliberately configuration rather than a guessed
Mainnet constant. Preflight rejects a missing token runtime, malformed roles, or an invalid chain
short name. After broadcast, the workflow reads all immutable bindings back from RPC, verifies both
ScopeSettle contracts, and exports normalized deployment and broadcast records for review.
