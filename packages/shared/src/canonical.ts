import { keccak256, toBytes } from "viem";

type CanonicalValue =
  null | boolean | number | string | CanonicalValue[] | CanonicalObject;
type CanonicalObject = { readonly [key: string]: CanonicalValue };

function normalize(value: unknown): CanonicalValue {
  if (value === null || typeof value === "boolean" || typeof value === "string")
    return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value))
      throw new TypeError("Canonical JSON rejects non-finite numbers");
    return Object.is(value, -0) ? 0 : value;
  }
  if (Array.isArray(value)) return value.map((item) => normalize(item));
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const result: Record<string, CanonicalValue> = {};
    for (const key of Object.keys(record).sort()) {
      const child = record[key];
      if (child === undefined)
        throw new TypeError(`Canonical JSON rejects undefined at ${key}`);
      result[key] = normalize(child);
    }
    return result;
  }
  throw new TypeError(`Canonical JSON cannot encode ${typeof value}`);
}

export function canonicalize(value: unknown): string {
  return JSON.stringify(normalize(value));
}

export function hashCanonicalJson(value: unknown): `0x${string}` {
  return keccak256(toBytes(canonicalize(value)));
}
