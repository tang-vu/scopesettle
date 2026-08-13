export function serializeJobRecord<T extends { jobId: bigint }>(
  record: T,
): Omit<T, "jobId"> & { jobId: string } {
  return { ...record, jobId: record.jobId.toString() };
}
