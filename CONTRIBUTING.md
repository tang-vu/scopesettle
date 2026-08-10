# Contributing

Use Node 22+, pnpm 11.20, and Foundry stable. Create focused changes, add tests at the relevant
trust boundary, and run `pnpm check` before opening a pull request. Solidity changes must preserve
the invariants in `AGENTS.md` and include adversarial tests. UI and documentation must not claim
deployments, metrics, audits, or AI results that do not exist.

Never commit `.env` files, keys, database URLs, paid API output, or private repository data. By
contributing, you agree that your work is licensed under MIT.
