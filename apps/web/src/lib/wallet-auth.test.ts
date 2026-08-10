import { SiweMessage } from "siwe";
import { afterEach, describe, expect, it, vi } from "vitest";

import { authenticateWallet } from "./wallet-auth";

describe("wallet authentication client", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("binds a nonce to the requested domain, URI, address, and chain", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            domain: "scopesettle.example",
            expiresAt: "2026-08-09T12:05:00.000Z",
            nonce: "0123456789abcdef",
            uri: "https://scopesettle.example",
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetcher);
    let signed = "";
    await authenticateWallet({
      address: "0x1111111111111111111111111111111111111111",
      chainId: 1952,
      signMessage: async (message) => {
        signed = message;
        return "0x1234";
      },
    });
    const parsed = new SiweMessage(signed);
    expect(parsed.domain).toBe("scopesettle.example");
    expect(parsed.uri).toBe("https://scopesettle.example");
    expect(parsed.chainId).toBe(1952);
    expect(parsed.nonce).toBe("0123456789abcdef");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("does not request a signature when nonce issuance fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Index unavailable" }), {
          status: 503,
        }),
      ),
    );
    const signer = vi.fn();
    await expect(
      authenticateWallet({
        address: "0x1111111111111111111111111111111111111111",
        chainId: 1952,
        signMessage: signer,
      }),
    ).rejects.toThrow("Index unavailable");
    expect(signer).not.toHaveBeenCalled();
  });
});
