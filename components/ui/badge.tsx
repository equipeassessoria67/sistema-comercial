import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
}

export function Badge({ children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold",
        className
      )}
    >
      {children}
    </span>
  );
}

export function scoreBadgeClass(score: number): string {
  if (score >= 76) return "bg-green-100 text-green-700 border-green-200";
  if (score >= 51) return "bg-yellow-100 text-yellow-700 border-yellow-200";
  if (score >= 31) return "bg-orange-100 text-orange-700 border-orange-200";
  return "bg-red-100 text-red-700 border-red-200";
}
