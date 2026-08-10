export default function DashboardLoading() {
  return (
    <div className="shell section" aria-busy="true" aria-label="Loading jobs">
      <div className="panel empty-state">
        <p>Reconciling jobs with X Layer…</p>
      </div>
    </div>
  );
}
