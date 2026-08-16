# Verification protocol

ScopeSettle reports are not authoritative merely because the web application serves them. A
verification certificate is a reproducible, read-only comparison between the report, the immutable
job document, and current X Layer state.

## Endpoint

`GET /api/jobs/{chainId}/{jobId}/verification`

The endpoint returns canonical JSON and is safe to call without a wallet session. It reads the
public evaluator proposal and the indexed job/report records, then runs the same pure verification
function exported by `@scopesettle/shared`. The response includes a generation timestamp, subject
identity, aggregate status, and individual checks.

Aggregate status has exact semantics:

- `verified`: every applicable check passed.
- `partial`: no check failed, but required public context is not available yet, such as a verdict
  proposal that has not been posted.
- `failed`: at least one deterministic comparison failed. Consumers must not treat the report as
  matching the requested job.

## Reproducible checks

1. **Canonical report schema** validates every trust-boundary field with the public Zod schema.
2. **Canonical report hash** removes `reportHash`, recursively sorts object keys, encodes UTF-8,
   and recomputes Keccak-256.
3. **Deterministic score arithmetic** recomputes the weighted score outside the model.
4. **Funded specification commitment** recomputes the complete specification and rubric hashes
   against the commerce contract.
5. **Report rubric alignment** compares criterion IDs, titles, order, and weights with the funded
   specification.
6. **Locked settlement policy** reruns fail/manual-review/pass precedence using the committed score
   and confidence thresholds.
7. **Chain, contract, and job binding** rejects evidence for another chain, commerce contract, or
   job.
8. **Pinned deliverable binding** recomputes the exact repository, PR, base SHA, and head SHA
   commitment and compares it with the commerce contract.
9. **Onchain verdict commitment** compares report hash, deliverable hash, basis-point score,
   confidence, and outcome with the evaluator proposal.

Each check returns `pass`, `fail`, or `unavailable` plus an explicit detail. A failed check
always dominates the aggregate status.

## Security boundary

The certificate proves integrity and binding; it does not prove that the AI judgment is correct,
that GitHub or its CI is honest, that the evaluator signer is uncompromised, or that the contracts
are audited. It is not signed or stored as a new source of truth. Its timestamp changes on each
request, while every substantive check is reproducible from the report and public context.

Consumers should independently fetch X Layer state when making high-value decisions. A database or
RPC outage returns an error or a partial certificate rather than silently accepting cached state.
