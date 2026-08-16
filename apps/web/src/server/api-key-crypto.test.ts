import { describe, expect, it } from "vitest";

import {
  apiKeyDigestMatches,
  apiKeyPrefix,
  createApiKeySecret,
} from "./api-key-crypto";

describe("API key material", () => {
  it("creates a parseable high-entropy token and stores only its digest", () => {
    const key = createApiKeySecret();
    expect(key.token).toMatch(/^ss_live_[a-f0-9]{16}_[A-Za-z0-9_-]{43}$/u);
    expect(apiKeyPrefix(key.token)).toBe(key.prefix);
    expect(key.secretHash).not.toContain(key.token);
    expect(apiKeyDigestMatches(key.token, key.secretHash)).toBe(true);
  });

  it("rejects malformed and non-matching credentials", () => {
    const key = createApiKeySecret();
    expect(apiKeyPrefix("Bearer nope")).toBeNull();
    expect(apiKeyDigestMatches(`${key.token}x`, key.secretHash)).toBe(false);
  });
});
