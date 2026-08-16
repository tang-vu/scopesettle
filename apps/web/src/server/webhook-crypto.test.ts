import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createWebhookSecret,
  decryptWebhookSecret,
  encryptWebhookSecret,
} from "./webhook-crypto";

describe("webhook secret encryption", () => {
  const original = process.env.SESSION_SECRET;

  beforeEach(() => {
    process.env.SESSION_SECRET =
      "test-session-secret-with-more-than-32-characters";
  });

  afterEach(() => {
    if (original === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = original;
  });

  it("round-trips a generated secret without storing plaintext", () => {
    const secret = createWebhookSecret();
    const encrypted = encryptWebhookSecret(secret);
    expect(secret).toMatch(/^whsec_[A-Za-z0-9_-]{43}$/u);
    expect(encrypted.ciphertext).not.toContain(secret);
    expect(decryptWebhookSecret(encrypted)).toBe(secret);
  });

  it("rejects authenticated-ciphertext tampering", () => {
    const encrypted = encryptWebhookSecret(createWebhookSecret());
    const replacement = encrypted.tag.startsWith("A") ? "B" : "A";
    expect(() =>
      decryptWebhookSecret({
        ...encrypted,
        tag: `${replacement}${encrypted.tag.slice(1)}`,
      }),
    ).toThrow();
  });
});
