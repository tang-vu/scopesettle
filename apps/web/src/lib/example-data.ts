import {
  hashCanonicalJson,
  type EvaluationReport,
  type EvaluationReportContent,
} from "@scopesettle/shared";

const reportContent: EvaluationReportContent = {
  schemaVersion: "1.0.0",
  promptVersion: "github-pr-v1",
  model: "illustrative-output",
  generatedAt: "2026-08-09T09:24:00.000Z",
  jobId: "42",
  chainId: 1952,
  contractAddress: "0x1111111111111111111111111111111111111111",
  repository: {
    owner: "scopesettle-labs",
    name: "agent-api",
    pullNumber: 184,
    baseSha: "28f198cb2c302655a71b423c805a038759f045b0",
    headSha: "c02ce0c81f0659c0e3970ba6840d54eb87f8fb14",
  },
  deterministicChecks: [
    {
      id: "identity",
      label: "Repository and PR identity",
      status: "pass",
      evidence:
        "Public PR #184 matches scopesettle-labs/agent-api at the pinned head SHA.",
    },
    {
      id: "commit",
      label: "Immutable head commit",
      status: "pass",
      evidence: "GitHub returned c02ce0c…f8fb14 as the submitted PR head.",
    },
    {
      id: "ci",
      label: "Required CI checks",
      status: "pass",
      evidence: "3 required checks reported success for the exact head commit.",
    },
    {
      id: "bounds",
      label: "Evaluation bounds",
      status: "pass",
      evidence:
        "8 files, 286 changed lines, no binary patches; all within policy limits.",
    },
  ],
  criteria: [
    {
      id: "idempotency",
      title: "Idempotent settlement endpoint",
      weight: 40,
      score: 94,
      status: "pass",
      reason:
        "The route persists and reuses an idempotency key before dispatching settlement, with an explicit conflict response for changed payloads.",
      evidence: [
        {
          file: "src/api/settlements.ts",
          startLine: 48,
          endLine: 77,
          excerpt:
            "const existing = await store.findByKey(idempotencyKey);\nif (existing) return samePayload(existing, body)\n  ? replay(existing) : conflict();",
        },
      ],
    },
    {
      id: "validation",
      title: "Runtime request validation",
      weight: 30,
      score: 88,
      status: "pass",
      reason:
        "The public handler validates amount, recipient, chain, and request key before entering the service layer. Error responses are bounded and do not echo secrets.",
      evidence: [
        {
          file: "src/schemas/settlement.ts",
          startLine: 9,
          endLine: 31,
          excerpt:
            "export const settlementRequest = z.object({\n  recipient: addressSchema,\n  amount: positiveBaseUnits,\n  chainId: supportedChain\n});",
        },
      ],
    },
    {
      id: "tests",
      title: "Regression coverage",
      weight: 30,
      score: 91,
      status: "pass",
      reason:
        "Tests cover first request, safe replay, conflicting replay, malformed input, and service failure. The pinned CI run reports success.",
      evidence: [
        {
          file: "test/settlements.test.ts",
          startLine: 22,
          endLine: 118,
          excerpt:
            'it.each(["first request", "safe replay", "conflict"])(\n  "handles %s", async (scenario) => { /* assertions */ }\n);',
        },
      ],
    },
  ],
  weightedScore: 91.3,
  confidence: 87,
  verdict: "pass",
  limitations: [
    "This bundled report is an illustrative local fixture, not a live AI run or Testnet transaction.",
    "GitHub CI status proves only what the repository's own workflow reported for the pinned commit.",
    "No untrusted pull-request code was executed by ScopeSettle.",
  ],
};

export const exampleReport: EvaluationReport = {
  ...reportContent,
  reportHash: hashCanonicalJson(reportContent),
};

export const exampleJob = {
  title: "Add idempotent settlement API",
  scope:
    "Implement a public POST /settlements endpoint that safely retries identical requests, rejects key reuse with a different payload, validates all external input, and includes regression tests. The implementation must use the existing service boundary and must not log bearer tokens or wallet signatures.",
  status: "Completed",
  budget: "500.00 mUSDG",
  client: "0x1111111111111111111111111111111111111111",
  provider: "0x2222222222222222222222222222222222222222",
  evaluator: "0x3333333333333333333333333333333333333333",
  expiresAt: "2026-08-12T12:00:00.000Z",
  completedAt: "2026-08-09T10:04:00.000Z",
  repository: "scopesettle-labs/agent-api",
  pullNumber: 184,
  challenge: "Closed without challenge",
  isFixture: true,
  criteria: [
    {
      title: "Idempotent settlement endpoint",
      description:
        "Same key and payload replays safely; changed payload conflicts without dispatch.",
      weight: 40,
    },
    {
      title: "Runtime request validation",
      description:
        "Validate the external request before any service or persistence side effect.",
      weight: 30,
    },
    {
      title: "Regression coverage",
      description:
        "Tests cover first request, safe replay, conflict, invalid input, and failure.",
      weight: 30,
    },
  ],
  timeline: [
    ["Job created", "Aug 08 · 14:02 UTC"],
    ["Budget funded", "Aug 08 · 14:06 UTC"],
    ["PR commitment submitted", "Aug 09 · 08:58 UTC"],
    ["Evidence report proposed", "Aug 09 · 09:24 UTC"],
    ["Challenge window elapsed", "Aug 09 · 10:04 UTC"],
    ["Escrow released", "Aug 09 · 10:04 UTC"],
  ],
} as const;
