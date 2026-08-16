import type { ReportVerification } from "@scopesettle/shared";
import {
  CircleAlert,
  CircleCheck,
  CircleX,
  Download,
  Fingerprint,
} from "lucide-react";

import { Status } from "./status";

export function VerificationCertificate({
  chainId,
  jobId,
  verification,
}: {
  readonly chainId: number;
  readonly jobId: string;
  readonly verification: ReportVerification;
}) {
  const tone =
    verification.status === "verified"
      ? "green"
      : verification.status === "failed"
        ? "red"
        : "amber";
  return (
    <section className="panel content-block verification-certificate">
      <div className="verification-heading">
        <div>
          <p className="eyebrow">Deterministic integrity certificate</p>
          <h2>Independently verified evidence</h2>
          <p>
            ScopeSettle recomputes the report without trusting the model output
            or database record, then compares the result with the funded policy
            and evaluator proposal.
          </p>
        </div>
        <Status tone={tone}>{verification.status}</Status>
      </div>
      <div className="verification-grid">
        {verification.checks.map((item) => (
          <article className="verification-check" key={item.id}>
            {item.status === "pass" ? (
              <CircleCheck
                aria-hidden="true"
                className="verification-pass"
                size={18}
              />
            ) : item.status === "fail" ? (
              <CircleX
                aria-hidden="true"
                className="verification-fail"
                size={18}
              />
            ) : (
              <CircleAlert
                aria-hidden="true"
                className="verification-unavailable"
                size={18}
              />
            )}
            <div>
              <h3>{item.label}</h3>
              <p>{item.detail}</p>
            </div>
          </article>
        ))}
      </div>
      <div className="verification-footer">
        <span>
          <Fingerprint aria-hidden="true" size={15} /> Schema 1.0.0 /{" "}
          {verification.checks.length} reproducible checks
        </span>
        <a
          className="button button-secondary"
          download
          href={"/api/jobs/" + chainId + "/" + jobId + "/verification"}
        >
          <Download aria-hidden="true" size={15} /> Download certificate
        </a>
      </div>
    </section>
  );
}
