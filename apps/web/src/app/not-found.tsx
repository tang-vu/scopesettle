import { FileQuestion } from "lucide-react";
import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="shell section">
      <div className="panel empty-state">
        <div>
          <FileQuestion aria-hidden="true" size={30} />
          <h1 style={{ fontSize: "2.5rem" }}>Job not found</h1>
          <p>
            No indexed report or readable onchain job matched this chain and ID.
            The RPC may also be unavailable.
          </p>
          <Link className="button button-secondary" href="/app">
            Return to jobs
          </Link>
        </div>
      </div>
    </div>
  );
}
