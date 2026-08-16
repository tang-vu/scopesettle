import { describe, expect, it } from "vitest";

import { isBlockedWebhookAddress, parseWebhookUrl } from "./webhook-security";

describe("webhook SSRF policy", () => {
  it.each([
    "127.0.0.1",
    "10.0.0.1",
    "169.254.169.254",
    "172.16.1.2",
    "192.168.1.1",
    "::1",
    "fd00::1",
    "fe80::1",
    "::ffff:127.0.0.1",
    "::ffff:7f00:1",
  ])("blocks non-public address %s", (address) => {
    expect(isBlockedWebhookAddress(address)).toBe(true);
  });

  it.each(["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"])(
    "allows public address %s",
    (address) => {
      expect(isBlockedWebhookAddress(address)).toBe(false);
    },
  );

  it("requires credential-free HTTPS URLs", () => {
    expect(() => parseWebhookUrl("http://example.com/hook")).toThrow("HTTPS");
    expect(() => parseWebhookUrl("https://user:pass@example.com/hook")).toThrow(
      "credentials",
    );
    expect(() => parseWebhookUrl("https://localhost/hook")).toThrow("public");
    expect(parseWebhookUrl("https://example.com/hook").hostname).toBe(
      "example.com",
    );
  });
});
