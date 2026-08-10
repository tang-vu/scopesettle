"use client";

import { CircleAlert, RotateCcw } from "lucide-react";

export default function DashboardError({
  reset,
}: {
  readonly reset: () => void;
}) {
  return (
    <div className="shell section">
      <div className="panel empty-state" role="alert">
        <div>
          <CircleAlert aria-hidden="true" size={28} />
          <h3>Jobs could not be reconciled</h3>
          <p>
            The RPC or indexer may be unavailable. No cached state is being
            presented as final.
          </p>
          <button
            className="button button-secondary button-small"
            onClick={reset}
            type="button"
          >
            <RotateCcw aria-hidden="true" size={14} /> Retry
          </button>
        </div>
      </div>
    </div>
  );
}
