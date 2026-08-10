export function shortAddress(address: string | undefined): string {
  return address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : "Not connected";
}

export function shortHash(hash: string): string {
  return `${hash.slice(0, 10)}…${hash.slice(-8)}`;
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}
