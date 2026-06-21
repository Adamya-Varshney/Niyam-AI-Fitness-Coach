// Shared types mirroring the backend contracts.

export type Goal = "build_strength" | "get_lean" | "feel_better" | "move_more";
export type CurrentActivity = "rarely" | "weekend_only" | "a_few_times" | "few_times_week" | "most_days";

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  notes?: string;
}

export interface SessionPlan {
  day: string;
  focus?: string;
  type?: string;
  exercises?: Exercise[];
  duration_min: number;
  status?: "completed" | "today" | "pending";
}

export interface BaselinePlan {
  week_number: number;
  sessions: SessionPlan[];
}

export interface OnboardRequest {
  user_id: string;
  name: string;
  goal: Goal;
  current_activity: CurrentActivity;
  time_per_week_min: number;
  experience_level?: ExperienceLevel;
  workout_style?: WorkoutStyle;
  equipment?: Equipment;
  injuries?: string;
  dietary_preference?: DietaryPreference;
  channel_preference: "in_app";
}

export type Equipment =
  | "none"
  | "bodyweight"
  | "dumbbells"
  | "resistance_bands"
  | "full_gym"
  | "cardio_machine";
export type WorkoutStyle = "strength" | "cardio" | "hiit" | "yoga" | "mobility" | "sports";
export type ExperienceLevel = "beginner" | "intermediate" | "advanced" | "elite";
export type DietaryPreference = "vegetarian" | "non_vegetarian" | "vegan";

export interface ProfilePreferences {
  injuries?: string;
  equipment?: Equipment[];
  workout_styles?: WorkoutStyle[];
  experience_level: ExperienceLevel;
  dietary_preference?: DietaryPreference;
}

export interface ProfileRequest extends ProfilePreferences {
  user_id: string;
}


export interface OnboardResponse {
  baseline_plan: BaselinePlan;
  welcome_message: string;
  first_check_in_at?: string;
}

export type MessageType = "text" | "voice";

export interface ChatRequest {
  user_id: string;
  session_id: string;
  message: string;
  message_type: MessageType;
  message_id: string;
}

export interface PlanChange {
  day: string;
  old: string;
  new: string;
}

export interface UiAction {
  type: "show_options" | string;
  options?: string[];
}

export interface ChatResponse {
  reply: string;
  why?: string;
  plan_changes?: PlanChange[];
  ui_actions?: UiAction[];
}

export interface Nudge {
  id: string;
  text: string;
  style?: string;
  created_at: string;
}

export type ChatTurnRole = "user" | "agent";

export interface RecentTurn {
  role: ChatTurnRole;
  text: string;
  why?: string;
  plan_changes?: PlanChange[];
  ui_actions?: UiAction[];
  kind?: "weekly_review" | string;
  created_at?: string;
}

export interface AdherenceSummary {
  last_7d: string;
  streak_weeks: number;
}

export interface Profile {
  name: string;
  goal: Goal;
  week_number: number;
}

export interface StateResponse {
  profile?: Profile;
  current_plan?: BaselinePlan;
  today_session?: SessionPlan;
  adherence_summary?: AdherenceSummary;
  pending_nudges?: Nudge[];
  recent_turns?: RecentTurn[];
  welcome_back_message?: string | null;
}

// Local-only chat message representation rendered in the thread.
export interface ChatMessage {
  id: string;
  role: ChatTurnRole;
  text: string;
  why?: string;
  plan_changes?: PlanChange[];
  ui_actions?: UiAction[];
  kind?: "weekly_review" | "nudge" | string;
  pending?: boolean;
  failed?: boolean;
  retryPayload?: { message: string; message_type: MessageType };
  created_at?: string;
}
