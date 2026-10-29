interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = status.toLowerCase();

  let className = "bb-badge ";
  let label = status;

  switch (normalized) {
    case "pending":
      className += "bb-badge-pending";
      label = "Pending Approval";
      break;
    case "approved":
      className += "bb-badge-approved";
      label = "Approved";
      break;
    case "accepted":
      className += "bb-badge-accepted";
      label = "Accepted";
      break;
    case "active":
      className += "bb-badge-active";
      label = "Active Rental";
      break;
    case "completed":
      className += "bb-badge-completed";
      label = "Completed";
      break;
    case "declined":
      className += "bb-badge-declined";
      label = "Declined";
      break;
    case "rejected":
      className += "bb-badge-declined";
      label = "Rejected";
      break;
    case "cancelled":
      className += "bb-badge-cancelled";
      label = "Cancelled";
      break;
    case "suspended":
      className += "bb-badge-suspended";
      label = "Suspended";
      break;
    case "open":
      className += "bb-badge-open";
      label = "Open Request";
      break;
    case "assigned":
      className += "bb-badge-accepted";
      label = "Helper Assigned";
      break;
    default:
      className += "bb-badge-pending";
      label = status;
  }

  return <span className={className}>{label}</span>;
}
