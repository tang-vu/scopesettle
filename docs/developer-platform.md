# Developer platform

The developer console at `/developers` is a wallet-owned control plane for organizations, scoped
API keys, signed webhooks, delivery evidence, and audit events. Management calls use the same
short-lived SIWE session as job operations. No email identity or custodial wallet is introduced.

## API keys

An owner can issue, rotate, and revoke a key. The plaintext token is returned exactly once. The
database stores only its public prefix and a server-peppered scrypt digest; a lost token must be
rotated, not recovered.

Available scopes are:

- `jobs:read`: reserved for job-read integrations.
- `reports:read`: permits the versioned verification API.
- `webhooks:manage`: reserved for machine-managed webhook operations.

The first versioned machine endpoint is:

```text
GET /api/v1/jobs/{chainId}/{jobId}/verification
Authorization: Bearer ss_live_...
```

It requires `reports:read`, returns canonical JSON, updates the key's `lastUsedAt`, and records a
non-secret audit event. Rotation invalidates the previous token immediately. Revoked and expired
keys fail closed.

## Webhook subscriptions

A subscription belongs to one organization and one exact `(chainId, jobId)` pair. It can receive:

- `job.created`
- `deliverable.submitted`
- `evaluation.completed`

The signing secret is displayed once and encrypted at rest with AES-256-GCM under a key derived
from `SESSION_SECRET`. API key digests are also bound to this secret. Changing `SESSION_SECRET`
therefore invalidates API keys and requires rotating all webhook signing secrets. Endpoint creation
and URL updates resolve DNS and reject non-HTTPS, credential-bearing,
loopback, private, link-local, multicast, and IPv4-mapped private targets. Delivery resolves again
and pins the validated address for the TLS request; redirects are not followed.

Each request contains canonical JSON and these headers:

```text
webhook-id: <delivery UUID>
webhook-timestamp: <Unix seconds>
webhook-signature: v1,<lowercase HMAC-SHA256 hex>
```

The signed bytes are:

```text
<webhook-id>.<webhook-timestamp>.<exact raw request body>
```

Receiver example:

```ts
import { createHmac, timingSafeEqual } from "node:crypto";

function verifyWebhook(input: {
  body: string;
  id: string;
  timestamp: string;
  signature: string;
  secret: string;
}) {
  const age = Math.abs(Date.now() / 1_000 - Number(input.timestamp));
  if (!Number.isFinite(age) || age > 300) return false;
  const expected = `v1,${createHmac("sha256", input.secret)
    .update(`${input.id}.${input.timestamp}.${input.body}`)
    .digest("hex")}`;
  const actualBytes = Buffer.from(input.signature);
  const expectedBytes = Buffer.from(expected);
  return (
    actualBytes.length === expectedBytes.length &&
    timingSafeEqual(actualBytes, expectedBytes)
  );
}
```

Verify the raw body before JSON parsing, enforce a short timestamp tolerance, and persist processed
`webhook-id` values to reject replay. A `2xx` response acknowledges delivery. Other statuses,
network errors, oversized responses, and timeouts enter exponential retry with jitter. After eight
failed attempts the delivery becomes `dead`; an owner can explicitly requeue it from the API.

## Durability and operations

Domain mutations and their outbox event are committed in the same PostgreSQL transaction. A
post-response worker attempts immediate delivery. Delivery records use leases to recover interrupted
workers, endpoint/event uniqueness prevents fan-out duplication, and event deduplication keys
prevent repeated domain requests from creating new logical events. Receivers must still be
idempotent because any durable webhook system is at-least-once.

`GET /api/internal/webhooks/process` is protected by a random `CRON_SECRET` of at least 32
characters. The checked-in Vercel cron runs daily so it is valid on every Vercel plan; production
operators on Pro or Enterprise should increase the schedule to every minute for faster unattended
retry recovery. Normal domain requests still schedule an immediate post-response attempt. Vercel
documents the current plan intervals in its
[Cron usage and pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing) guide and recommends
protecting invocations with `CRON_SECRET` in its
[Cron management](https://vercel.com/docs/cron-jobs/manage-cron-jobs) guide.

Audit metadata never contains API tokens, webhook signing secrets, encrypted secret material, RPC
credentials, or response bodies. Delivery errors are length-bounded and URLs are redacted before
storage.
