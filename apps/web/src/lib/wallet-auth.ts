import { SiweMessage } from "siwe";

export async function authenticateWallet(input: {
  address: `0x${string}`;
  chainId: number;
  signMessage: (message: string) => Promise<`0x${string}`>;
}): Promise<void> {
  const challengeResponse = await fetch("/api/auth/nonce", {
    body: JSON.stringify({ address: input.address, chainId: input.chainId }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  const challenge = (await challengeResponse.json()) as {
    nonce?: string;
    domain?: string;
    uri?: string;
    expiresAt?: string;
    error?: string;
  };
  if (
    !challengeResponse.ok ||
    !challenge.nonce ||
    !challenge.domain ||
    !challenge.uri
  ) {
    throw new Error(
      challenge.error ?? "Could not start wallet authentication.",
    );
  }
  const message = new SiweMessage({
    address: input.address,
    chainId: input.chainId,
    domain: challenge.domain,
    ...(challenge.expiresAt ? { expirationTime: challenge.expiresAt } : {}),
    issuedAt: new Date().toISOString(),
    nonce: challenge.nonce,
    statement: "Authenticate an immutable ScopeSettle job operation.",
    uri: challenge.uri,
    version: "1",
  }).prepareMessage();
  const signature = await input.signMessage(message);
  const verifyResponse = await fetch("/api/auth/verify", {
    body: JSON.stringify({ message, signature }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  if (!verifyResponse.ok) {
    const result = (await verifyResponse.json()) as { error?: string };
    throw new Error(result.error ?? "Wallet authentication failed.");
  }
}
