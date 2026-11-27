import { STATUS_LABEL, STATUS_STYLE } from "@/lib/format";
import type { BookingStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}
