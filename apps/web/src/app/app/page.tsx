import type { Metadata } from "next";
import Link from "next/link";

import { DashboardClient } from "@/components/dashboard-client";

export const metadata: Metadata = { title: "Jobs" };

export default function DashboardPage() {
  return (
    <>
      <header className="page-header">
        <div className="shell page-header-row">
          <div>
            <p className="eyebrow">Settlement workspace</p>
            <h1>Jobs</h1>
            <p>
              Track scoped work, inspect evidence, and take only the actions
              your role allows.
            </p>
          </div>
          <Link className="button button-primary" href="/jobs/new">
            Create a job
          </Link>
        </div>
      </header>
      <DashboardClient />
    </>
  );
}
