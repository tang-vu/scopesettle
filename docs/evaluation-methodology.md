# Evaluation methodology

ScopeSettle evaluates one narrow artifact: a pull request in a public GitHub repository. The
provider first commits a canonical document containing owner, repository, PR number, base SHA,
and exact head SHA. A later force-push cannot silently change the evaluated deliverable.

## Gates before the model

The server verifies the onchain job and deliverable hash, repository/PR identity, pinned head,
PR state, file and line counts, patch byte limit, binary/unavailable patches, required paths,
deleted tests, and GitHub check runs for that exact head. Oversized, stale, unsupported, or
ambiguous inputs go to manual review. ScopeSettle never checks out or executes submitted code.
CI is metadata from GitHub for the pinned SHA and may itself be malicious or misconfigured.

## Structured AI review

The model receives the immutable scope/rubric separately from explicitly delimited, hostile
repository data. It scores each criterion from 0–100 and must cite changed-file or GitHub evidence.
Repository instructions cannot modify the rubric, weights, schema, or policy. The server rejects
unknown/missing criteria and citations that do not match the pinned changed-file patch. It never
requests or displays hidden chain-of-thought.

Application code—not the model—recalculates `sum(score × weight) / 100`. Confidence is capped by
the percentage of criteria with verified citations. Failed deterministic requirements affect the
verdict; missing evidence and provider/schema failures fail closed to manual review. A pass requires
both the immutable score and confidence thresholds. Reports always state limitations.

Before a paid model request, the database atomically acquires a ten-minute lease for the chain/job
and one of three wallet quota slots in the current UTC-aligned hour. Concurrent requests receive
409, exhausted wallets receive 429 with `Retry-After`, and a persisted report is returned without a
second model call. If only its verdict deadline expired, ScopeSettle signs the same report hash again.

## Commitment and settlement

Canonical JSON recursively sorts object keys, preserves array order, encodes UTF-8, and is hashed
with `keccak256`. The report is hashed before its `reportHash` field is added. The server signs an
EIP-712 verdict binding chain, evaluator contract, job, deliverable, report, score, confidence,
outcome, random nonce, and deadline. The contract validates the immutable policy and opens the
challenge window. This is a transparent trusted-evaluator design, not a trustless AI oracle.

Prompt version `github-pr-v1` and report schema `1.0.0` are the beta compatibility boundary.
