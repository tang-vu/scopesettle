export default function JobLoading() {
  return (
    <div className="shell section" aria-busy="true" aria-label="Loading job">
      <div className="panel empty-state">
        <p>Reconciling job, events, and report commitment…</p>
      </div>
    </div>
  );
}
