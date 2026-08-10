import type { EvaluationReport } from "@scopesettle/shared";
import {
  CheckCircle2,
  CircleAlert,
  CircleX,
  GitCompareArrows,
} from "lucide-react";

import { Status, type StatusTone } from "./status";

type Gate = {
  label: string;
  detail: string;
  state: "pass" | "fail" | "review";
};

function gateTone(state: Gate["state"]): StatusTone {
  if (state === "pass") return "green";
  if (state === "fail") return "red";
  return "amber";
}

function GateIcon({ state }: { readonly state: Gate["state"] }) {
  if (state === "pass") {
    return <CheckCircle2 aria-hidden="true" size={17} />;
  }
  if (state === "fail") return <CircleX aria-hidden="true" size={17} />;
  return <CircleAlert aria-hidden="true" size={17} />;
}

export function DecisionProof({
  minimumConfidence,
  minimumPassingScore,
  report,
}: {
  readonly minimumConfidence: number;
  readonly minimumPassingScore: number;
  readonly report: EvaluationReport;
}) {
  const unavailable = report.deterministicChecks.some(
    (check) => check.status === "unavailable",
  );
  const hardFailure = report.deterministicChecks.some(
    (check) => check.status === "fail",
  );
  const scorePassed = report.weightedScore >= minimumPassingScore;
  const confidencePassed = report.confidence >= minimumConfidence;
  const gates: Gate[] = [
    {
      label: "Evidence availability",
      detail: unavailable
        ? "At least one required deterministic source was unavailable."
        : "Every required deterministic source returned a usable result.",
      state: unavailable ? "review" : "pass",
    },
    {
      label: "Deterministic policy",
      detail: hardFailure
        ? "At least one hard policy check failed."
        : "No deterministic check returned a hard failure.",
      state: hardFailure ? "fail" : "pass",
    },
    {
      label: "Weighted score",
      detail:
        String(report.weightedScore) +
        (scorePassed ? " meets" : " is below") +
        " the locked " +
        String(minimumPassingScore) +
        "-point threshold.",
      state: scorePassed ? "pass" : "fail",
    },
    {
      label: "Evidence confidence",
      detail:
        String(report.confidence) +
        "% " +
        (confidencePassed ? "meets" : "is below") +
        " the locked " +
        String(minimumConfidence) +
        "% threshold.",
      state: confidencePassed ? "pass" : "review",
    },
  ];
  const verdictTone: StatusTone =
    report.verdict === "pass"
      ? "green"
      : report.verdict === "fail"
        ? "red"
        : "amber";

  return (
    <section
      className="panel content-block decision-proof"
      aria-labelledby="decision-proof-title"
    >
      <div className="decision-proof-heading">
        <div>
          <p className="eyebrow">Deterministic decision trace</p>
          <h2 id="decision-proof-title">Why this verdict was reached</h2>
        </div>
        <Status tone={verdictTone}>{report.verdict.replace("_", " ")}</Status>
      </div>

      <div className="decision-formula" aria-label="Weighted score formula">
        <GitCompareArrows aria-hidden="true" size={17} />
        <code>
          {report.criteria
            .map(
              (criterion) =>
                String(criterion.score) +
                " × " +
                String(criterion.weight) +
                "%",
            )
            .join(" + ")}{" "}
          = {report.weightedScore}
        </code>
      </div>

      <ol className="decision-gates">
        {gates.map((gate, index) => (
          <li
            className={"decision-gate decision-gate-" + gate.state}
            key={gate.label}
          >
            <span className="decision-gate-index">
              {String(index + 1).padStart(2, "0")}
            </span>
            <GateIcon state={gate.state} />
            <div>
              <h3>{gate.label}</h3>
              <p>{gate.detail}</p>
            </div>
            <Status tone={gateTone(gate.state)}>
              {gate.state === "review" ? "manual route" : gate.state}
            </Status>
          </li>
        ))}
      </ol>

      <p className="decision-policy-note">
        Unavailable evidence or low confidence routes to manual review before
        score-based pass/fail. Otherwise, any hard deterministic failure or
        score below threshold fails; only the remaining path passes.
      </p>
    </section>
  );
}
