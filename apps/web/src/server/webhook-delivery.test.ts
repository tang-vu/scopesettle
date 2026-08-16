import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { signWebhookPayload } from "./webhook-delivery";

describe("webhook signatures", () => {
  it("binds delivery id, timestamp, and exact body", () => {
    const body = '{"ok":true}';
    const expected = createHmac("sha256", "whsec_test")
      .update(`delivery-1.1723824000.${body}`)
      .digest("hex");
    expect(
      signWebhookPayload({
        body,
        deliveryId: "delivery-1",
        secret: "whsec_test",
        timestamp: 1_723_824_000,
      }),
    ).toBe(`v1,${expected}`);
  });
});
