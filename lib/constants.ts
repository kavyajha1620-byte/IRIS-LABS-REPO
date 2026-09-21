export const APP_NAME = "IrisLabs CRM";
export const APP_SUBTITLE = "Cold Calling & Lead Management";

export const LEAD_STATUSES = [
  "New",
  "Not Called",
  "Called",
  "No Answer",
  "Interested",
  "Qualified",
  "Follow-up",
  "Meeting Booked",
  "Proposal Sent",
  "Negotiation",
  "Won",
  "Lost",
  "Not Interested",
  "Wrong Number",
  "Do Not Contact",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_PRIORITIES = ["Low", "Medium", "High"] as const;
export type LeadPriority = (typeof LEAD_PRIORITIES)[number];

export const LEAD_SOURCES = [
  "Cold List",
  "Referral",
  "Website",
  "LinkedIn",
  "Google",
  "Apify",
  "OpenStreetMap",
  "Google Maps",
  "AI Research",
  "Import",
  "Imported",
  "Social Media",
  "Event",
  "Purchased List",
  "Other",
] as const;

export const INDUSTRIES = [
  "Software",
  "IT Services",
  "Finance",
  "Financial Services",
  "Healthcare",
  "Retail",
  "Food & Beverage",
  "Hospitality",
  "Manufacturing",
  "Real Estate",
  "Logistics",
  "Education",
  "Media",
  "Energy",
  "Telecom",
  "Consulting",
  "Legal Services",
  "Agriculture",
  "Construction",
  "Home Services",
  "Automotive",
  "Cleaning & Landscaping",
  "Beauty & Personal Care",
  "Wellness & Fitness",
  "Travel & Tourism",
  "Pet Services",
  "Other",
] as const;

export const COUNTRIES = [
  "United States",
  "Canada",
  "United Kingdom",
  "Mexico",
  "Brazil",
  "Spain",
  "Germany",
  "France",
  "Australia",
  "India",
  "United Arab Emirates",
  "Singapore",
  "Nigeria",
  "South Africa",
  "Other",
] as const;

export const CALL_OUTCOMES = [
  "Interested",
  "Not Interested",
  "No Answer",
  "Busy",
  "Call Back Later",
  "Wrong Number",
  "Meeting Booked",
  "Other",
] as const;
export type CallOutcome = (typeof CALL_OUTCOMES)[number];

export const TASK_PRIORITIES = ["Low", "Medium", "High"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_STATUSES = ["Pending", "Completed"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const FOLLOWUP_STATUSES = ["Pending", "Completed", "Cancelled"] as const;
export type FollowUpStatus = (typeof FOLLOWUP_STATUSES)[number];

export const NOTIFICATION_TYPES = [
  "followup_due",
  "followup_overdue",
  "meeting",
  "task_due",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface PipelineColumnDef {
  id: string;
  title: string;
  /** The lead status used when a card is dropped in this column */
  status: LeadStatus;
  /** Statuses that naturally live in this column */
  accepts: LeadStatus[];
  color: string;
}

export const PIPELINE_COLUMNS: PipelineColumnDef[] = [
  {
    id: "new",
    title: "New",
    status: "New",
    accepts: ["New", "Not Called"],
    color: "#64748b",
  },
  {
    id: "contacted",
    title: "Contacted",
    status: "Called",
    accepts: ["Called", "No Answer"],
    color: "#0ea5e9",
  },
  {
    id: "interested",
    title: "Interested",
    status: "Interested",
    accepts: ["Interested", "Qualified"],
    color: "#8b5cf6",
  },
  {
    id: "followup",
    title: "Follow-up",
    status: "Follow-up",
    accepts: ["Follow-up"],
    color: "#f59e0b",
  },
  {
    id: "meeting",
    title: "Meeting",
    status: "Meeting Booked",
    accepts: ["Meeting Booked"],
    color: "#10b981",
  },
  {
    id: "proposal",
    title: "Proposal",
    status: "Proposal Sent",
    accepts: ["Proposal Sent"],
    color: "#06b6d4",
  },
  {
    id: "negotiation",
    title: "Negotiation",
    status: "Negotiation",
    accepts: ["Negotiation"],
    color: "#f97316",
  },
  {
    id: "won",
    title: "Won",
    status: "Won",
    accepts: ["Won"],
    color: "#22c55e",
  },
  {
    id: "lost",
    title: "Lost",
    status: "Lost",
    accepts: ["Lost", "Not Interested", "Wrong Number", "Do Not Contact"],
    color: "#ef4444",
  },
];

export const statusToColumn = (status: LeadStatus): PipelineColumnDef => {
  return (
    PIPELINE_COLUMNS.find((c) => c.accepts.includes(status)) ??
    PIPELINE_COLUMNS[0]
  );
};

export const OUTCOME_TO_STATUS: Record<
  CallOutcome,
  LeadStatus | null
> = {
  Interested: "Interested",
  "Not Interested": "Not Interested",
  "No Answer": "No Answer",
  Busy: "No Answer",
  "Call Back Later": "Follow-up",
  "Wrong Number": "Wrong Number",
  "Meeting Booked": "Meeting Booked",
  Other: "Called",
};

export const CALL_OUTCOME_COLORS: Record<CallOutcome, string> = {
  Interested: "#8b5cf6",
  "Not Interested": "#ef4444",
  "No Answer": "#64748b",
  Busy: "#f59e0b",
  "Call Back Later": "#0ea5e9",
  "Wrong Number": "#f43f5e",
  "Meeting Booked": "#10b981",
  Other: "#6b7280",
};

export const STATUS_COLORS: Record<LeadStatus, string> = {
  New: "#64748b",
  "Not Called": "#94a3b8",
  Called: "#0ea5e9",
  "No Answer": "#94a3b8",
  Interested: "#8b5cf6",
  Qualified: "#0d9488",
  "Follow-up": "#f59e0b",
  "Meeting Booked": "#10b981",
  "Proposal Sent": "#06b6d4",
  Negotiation: "#f97316",
  Won: "#22c55e",
  Lost: "#ef4444",
  "Not Interested": "#f43f5e",
  "Wrong Number": "#f43f5e",
  "Do Not Contact": "#64748b",
};

export const PRIORITY_COLORS: Record<LeadPriority, string> = {
  Low: "#64748b",
  Medium: "#f59e0b",
  High: "#ef4444",
};

export const ACTIVITY_TYPES = [
  "lead_created",
  "call",
  "status",
  "followup",
  "note",
  "email",
  "imported",
  "task",
  "meeting",
  "assigned",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  /** Only show this nav entry to these roles; everyone sees it when undefined. */
  roles?: Array<"owner" | "admin" | "salesperson">;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/leads", label: "Leads", icon: "Users" },
  { href: "/pipeline", label: "Pipeline", icon: "KanbanSquare" },
  { href: "/calls", label: "Calls", icon: "PhoneCall" },
  { href: "/follow-ups", label: "Follow-ups", icon: "CalendarClock" },
  { href: "/tasks", label: "Tasks", icon: "CheckSquare" },
  { href: "/analytics", label: "Analytics", icon: "BarChart3" },
  { href: "/research", label: "AI Research", icon: "Bot" },
  { href: "/settings", label: "Settings", icon: "Settings" },
  { href: "/admin", label: "Admin", icon: "ShieldCheck", roles: ["owner", "admin"] },
];

export const DATE_RANGE_PRESETS = ["Today", "7d", "30d", "90d", "12m"] as const;
export type DateRangePreset = (typeof DATE_RANGE_PRESETS)[number];