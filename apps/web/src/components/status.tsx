import { clsx } from "clsx";

export type StatusTone = "green" | "amber" | "red" | "neutral" | "blue";

export function Status({
  children,
  tone = "neutral",
}: {
  readonly children: React.ReactNode;
  readonly tone?: StatusTone;
}) {
  return <span className={clsx("status", `status-${tone}`)}>{children}</span>;
}
