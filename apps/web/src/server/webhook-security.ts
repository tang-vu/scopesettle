import { isIP } from "node:net";
import { lookup } from "node:dns/promises";

export class InvalidWebhookUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidRequestError";
  }
}

function blockedIpv4(address: string): boolean {
  const octets = address.split(".").map(Number);
  const [first = -1, second = -1] = octets;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 0) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    (first === 198 && second === 51) ||
    (first === 203 && second === 0) ||
    first >= 224
  );
}

function mappedIpv4(address: string): string | null {
  const sections = address.split("::ffff:");
  if (sections.length !== 2 || sections[0] !== "") return null;
  const suffix = sections[1] ?? "";
  if (isIP(suffix) === 4) return suffix;
  const words = suffix.split(":");
  if (words.length !== 2) return null;
  const high = Number.parseInt(words[0] ?? "", 16);
  const low = Number.parseInt(words[1] ?? "", 16);
  if (!Number.isInteger(high) || !Number.isInteger(low)) return null;
  return `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
}

export function isBlockedWebhookAddress(address: string): boolean {
  const normalized = address.toLowerCase().split("%")[0] ?? "";
  if (isIP(normalized) === 4) return blockedIpv4(normalized);
  if (isIP(normalized) !== 6) return true;
  if (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb") ||
    normalized.startsWith("ff")
  ) {
    return true;
  }
  const mapped = mappedIpv4(normalized);
  return mapped ? blockedIpv4(mapped) : false;
}

export function parseWebhookUrl(input: string): URL {
  const url = new URL(input);
  if (url.protocol !== "https:") {
    throw new InvalidWebhookUrlError("Webhook URLs must use HTTPS.");
  }
  if (url.username || url.password) {
    throw new InvalidWebhookUrlError(
      "Webhook URLs cannot contain credentials.",
    );
  }
  if (url.href.length > 2_000) {
    throw new InvalidWebhookUrlError("Webhook URL is too long.");
  }
  if (!url.hostname || url.hostname.toLowerCase() === "localhost") {
    throw new InvalidWebhookUrlError("Webhook hostname is not public.");
  }
  return url;
}

export async function resolvePublicWebhookTarget(url: URL) {
  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  const target = addresses[0];
  if (
    !target ||
    addresses.some(({ address }) => isBlockedWebhookAddress(address))
  ) {
    throw new InvalidWebhookUrlError(
      "Webhook hostname resolves to a non-public address.",
    );
  }
  return target;
}
