import { describe, expect, it } from "vitest";

import {
  calculateWeightedScore,
  canonicalize,
  determineVerdict,
  hashCanonicalJson,
} from "../src";

describe("canonical JSON", () => {
  it("sorts nested object keys and keeps array order", () => {
    expect(canonicalize({ z: 1, a: { y: 2, x: [3, 1] } })).toBe(
      '{"a":{"x":[3,1],"y":2},"z":1}',
    );
  });

  it("produces the same hash regardless of insertion order", () => {
    expect(hashCanonicalJson({ a: 1, b: 2 })).toBe(
      hashCanonicalJson({ b: 2, a: 1 }),
    );
  });

  it("rejects undefined and non-finite values", () => {
    expect(() => canonicalize({ unsafe: undefined })).toThrow(/undefined/u);
    expect(() => canonicalize(Number.NaN)).toThrow(/non-finite/u);
  });
});

describe("deterministic scoring", () => {
  it("calculates a weighted score outside the model", () => {
    expect(
      calculateWeightedScore([
        { score: 90, weight: 60 },
        { score: 50, weight: 40 },
      ]),
    ).toBe(74);
  });

  it("routes unavailable evidence and low confidence to manual review", () => {
    const specification = { minimumConfidence: 75, minimumPassingScore: 80 };
    expect(
      determineVerdict(
        {
          confidence: 90,
          weightedScore: 90,
          deterministicChecks: [
            { id: "diff", label: "Diff", status: "unavailable" },
          ],
        },
        specification,
      ),
    ).toBe("manual_review");
    expect(
      determineVerdict(
        { confidence: 50, weightedScore: 90, deterministicChecks: [] },
        specification,
      ),
    ).toBe("manual_review");
  });
});
