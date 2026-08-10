import type { Metadata } from "next";

import { JobCreateForm } from "@/components/job-create-form";

export const metadata: Metadata = { title: "Create job" };

export default function CreateJobPage() {
  return (
    <>
      <header className="page-header">
        <div className="shell">
          <p className="eyebrow">Client workflow</p>
          <h1>Create a scoped job.</h1>
          <p>
            Define what “done” means before funding. ScopeSettle commits the
            specification and weighted rubric so neither party can move the
            goalposts later.
          </p>
        </div>
      </header>
      <JobCreateForm />
    </>
  );
}
