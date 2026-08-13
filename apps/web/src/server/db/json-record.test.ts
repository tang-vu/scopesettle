import { describe, expect, it } from "vitest";

import { serializeJobRecord } from "./json-record";

describe("serializeJobRecord", () => {
  it("converts database bigint job IDs at the JSON boundary", () => {
    const record = serializeJobRecord({ chainId: 1952, jobId: 3n });

    expect(record).toEqual({ chainId: 1952, jobId: "3" });
    expect(() => JSON.stringify(record)).not.toThrow();
  });
});
