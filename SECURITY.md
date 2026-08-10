# Security policy

ScopeSettle is unaudited beta software. Do not use meaningful Mainnet funds until the
contracts and evaluator operations have received an independent audit.

Report a vulnerability privately through GitHub Security Advisories for this repository.
Include affected commit/contract, reproduction steps, impact, and a safe contact method. Do
not publish exploitable details before a fix or mitigation is available. We will acknowledge
a complete report within three business days and coordinate disclosure in good faith.

The trusted evaluator signer, trusted manual reviewer, fallible model, public GitHub/CI data,
and immutable non-upgradeable deployments are explicit beta limitations. A compromised signer
cannot be rotated in place; the response is to stop new jobs, disclose the affected deployment,
preserve evidence, and deploy a new contract pair. See [the threat model](docs/threat-model.md).
