import type { LeadStatus, LeadPriority, CallOutcome, TaskPriority, TaskStatus, FollowUpStatus, NotificationType, ActivityType } from "./constants";

export interface Profile {
  id: string;
  full_name: string;
  role: "owner" | "salesperson" | "admin";
  avatar_url: string | null;
  created_at: string;
}

export interface Lead {
  id: string;
  user_id: string;
  full_name: string;
  company: string | null;
  job_title: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  country: string | null;
  city: string | null;
  industry: string | null;
  source: string | null;
  status: LeadStatus;
  priority: LeadPriority;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
  notes: string | null;
}

export interface Call {
  id: string;
  lead_id: string;
  user_id: string;
  called_at: string;
  duration_seconds: number | null;
  outcome: CallOutcome;
  notes: string | null;
  follow_up_required: boolean;
  next_follow_up_at: string | null;
  created_at: string;
}

export interface Activity {
  id: string;
  lead_id: string | null;
  user_id: string;
  type: ActivityType;
  title: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Note {
  id: string;
  lead_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface FollowUp {
  id: string;
  lead_id: string;
  user_id: string;
  title: string;
  due_at: string;
  status: FollowUpStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface Task {
  id: string;
  user_id: string;
  lead_id: string | null;
  title: string;
  description: string | null;
  due_at: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  created_at: string;
  completed_at: string | null;
}

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  lead_id: string | null;
  read: boolean;
  created_at: string;
}

export interface LeadRow {
  lead: Lead;
  last_call: Call | null;
  open_follow_up: FollowUp | null;
  note_count: number;
  call_count: number;
}

export interface ActivityWithLead extends Activity {
  lead: Pick<Lead, "id" | "full_name" | "company" | "phone"> | null;
}