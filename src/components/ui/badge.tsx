import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const tones = {
  green: "badge-green",
  amber: "badge-amber",
  red: "badge-red",
  blue: "badge-blue",
  slate: "badge-slate",
  violet: "badge-violet",
} as const;

export function Badge({
  tone = "slate",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof tones }) {
  return <span className={cn(tones[tone], className)} {...props} />;
}

/** Map common domain values to tones for quick reuse. */
export function statusTone(status: string): keyof typeof tones {
  switch (status.toUpperCase()) {
    case "ACTIVE":
    case "PRESENT":
    case "APPROVED":
    case "PUBLISHED":
    case "PROMOTED":
    case "PAID":
    case "VERIFIED":
    case "EE":
    case "A1":
      return "green";
    case "PENDING":
    case "LATE":
    case "CONDITIONAL":
    case "ME":
    case "B2":
    case "B3":
      return "amber";
    case "SUSPENDED":
    case "ABSENT":
    case "REJECTED":
    case "REPEAT":
    case "DROP":
    case "DROPPED":
    case "NS":
    case "F9":
    case "9":
      return "red";
    case "TRANSFERRED":
    case "EXCUSED":
    case "GRADUATED":
      return "blue";
    default:
      return "slate";
  }
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={statusTone(status)}>{status.replaceAll("_", " ")}</Badge>;
}
