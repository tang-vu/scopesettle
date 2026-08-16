import "server-only";

import { createHmac } from "node:crypto";
import { request as httpsRequest } from "node:https";

import { canonicalize } from "@scopesettle/shared";

import {
  parseWebhookUrl,
  resolvePublicWebhookTarget,
} from "./webhook-security";

const MAX_RESPONSE_BYTES = 64 * 1024;
const REQUEST_TIMEOUT_MS = 8_000;

export type WebhookEnvelope = {
  id: string;
  type: string;
  createdAt: string;
  data: Record<string, unknown>;
};

export function signWebhookPayload(input: {
  body: string;
  deliveryId: string;
  secret: string;
  timestamp: number;
}): string {
  const content = `${input.deliveryId}.${input.timestamp}.${input.body}`;
  return `v1,${createHmac("sha256", input.secret).update(content).digest("hex")}`;
}

export async function deliverWebhook(input: {
  deliveryId: string;
  secret: string;
  url: string;
  envelope: WebhookEnvelope;
}): Promise<{ status: number }> {
  const url = parseWebhookUrl(input.url);
  const target = await resolvePublicWebhookTarget(url);
  const body = canonicalize(input.envelope);
  const timestamp = Math.floor(Date.now() / 1_000);
  const signature = signWebhookPayload({
    body,
    deliveryId: input.deliveryId,
    secret: input.secret,
    timestamp,
  });

  return new Promise((resolve, reject) => {
    const request = httpsRequest(
      {
        family: target.family,
        headers: {
          "content-length": Buffer.byteLength(body).toString(),
          "content-type": "application/json; charset=utf-8",
          host: url.host,
          "user-agent": "ScopeSettle-Webhooks/1.0",
          "webhook-id": input.deliveryId,
          "webhook-signature": signature,
          "webhook-timestamp": timestamp.toString(),
        },
        hostname: target.address,
        method: "POST",
        path: `${url.pathname}${url.search}`,
        port: url.port ? Number(url.port) : 443,
        servername: url.hostname,
        timeout: REQUEST_TIMEOUT_MS,
      },
      (response) => {
        let bytes = 0;
        response.on("data", (chunk: Buffer) => {
          bytes += chunk.length;
          if (bytes > MAX_RESPONSE_BYTES) response.destroy();
        });
        response.on("end", () => {
          const status = response.statusCode ?? 0;
          if (status >= 200 && status < 300) resolve({ status });
          else reject(new Error(`Webhook returned HTTP ${status}.`));
        });
        response.on("error", reject);
      },
    );
    request.on("timeout", () =>
      request.destroy(new Error("Webhook request timed out.")),
    );
    request.on("error", reject);
    request.end(body);
  });
}
