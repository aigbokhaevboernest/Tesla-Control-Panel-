import { cn } from "@/lib/utils";

type StatusKind = "success" | "warning" | "danger" | "info" | "muted";

const STATUS_MAP: Record<string, StatusKind> = {
  active: "success",
  approved: "success",
  paid: "success",
  completed: "success",
  pending: "warning",
  processing: "warning",
  blocked: "danger",
  suspended: "danger",
  rejected: "danger",
  failed: "danger",
  canceled: "danger",
  cancelled: "danger",
  none: "muted",
  inactive: "muted",
};

export function StatusBadge({ status, className }: { status: string | null | undefined; className?: string }) {
  const key = (status ?? "none").toLowerCase();
  const kind = STATUS_MAP[key] ?? "muted";
  const styles: Record<StatusKind, string> = {
    success: "bg-[hsl(var(--status-success-bg))] text-[hsl(var(--status-success-fg))]",
    warning: "bg-[hsl(var(--status-warning-bg))] text-[hsl(var(--status-warning-fg))]",
    danger: "bg-[hsl(var(--status-danger-bg))] text-[hsl(var(--status-danger-fg))]",
    info: "bg-[hsl(var(--status-info-bg))] text-[hsl(var(--status-info-fg))]",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", styles[kind], className)}>
      {key}
    </span>
  );
}

const TIER_MAP: Record<string, string> = {
  basic: "bg-[hsl(var(--tier-basic-bg))] text-[hsl(var(--tier-basic-fg))]",
  veteran: "bg-[hsl(var(--tier-veteran-bg))] text-[hsl(var(--tier-veteran-fg))]",
  ultimate: "bg-[hsl(var(--tier-ultimate-bg))] text-[hsl(var(--tier-ultimate-fg))]",
  master: "bg-[hsl(var(--tier-master-bg))] text-[hsl(var(--tier-master-fg))]",
  diamond: "bg-[hsl(var(--tier-diamond-bg))] text-[hsl(var(--tier-diamond-fg))]",
};

export function TierBadge({ badge, className }: { badge: string | null | undefined; className?: string }) {
  if (!badge) return <span className="text-xs text-muted-foreground">—</span>;
  const key = badge.toLowerCase().replace(" account", "");
  const cls = TIER_MAP[key] ?? "bg-muted text-muted-foreground";
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", cls, className)}>
      {key}
    </span>
  );
}
