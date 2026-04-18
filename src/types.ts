export interface CanvasUser {
  id: number;
  name: string;
  short_name: string;
  login_id: string;
  email?: string;
  avatar_url?: string;
}

export interface CanvasCourse {
  id: number;
  name: string;
  course_code: string;
  workflow_state: string;
  start_at?: string;
  end_at?: string;
  enrollment_term_id?: number;
  enrollments?: CanvasEnrollment[];
}

export interface CanvasEnrollment {
  type: string;
  enrollment_state: string;
  computed_current_grade?: string;
  computed_current_score?: number;
}

export interface CanvasAssignment {
  id: number;
  name: string;
  description?: string;
  due_at?: string;
  points_possible?: number;
  submission_types: string[];
  workflow_state: string;
  course_id: number;
  html_url: string;
  has_submitted_submissions?: boolean;
}

export interface CanvasSubmission {
  id: number;
  assignment_id: number;
  user_id: number;
  submitted_at?: string;
  score?: number;
  grade?: string;
  workflow_state: string;
  submission_type?: string;
  body?: string;
  url?: string;
  late: boolean;
  missing: boolean;
  assignment?: CanvasAssignment;
}

export interface CanvasTodoItem {
  type: string;
  assignment?: CanvasAssignment;
  quiz?: unknown;
  context_type: string;
  course_id?: number;
  context_name?: string;
  html_url: string;
  ignore?: string;
  ignore_permanently?: string;
}

export interface CanvasCalendarEvent {
  id: number;
  title: string;
  start_at?: string;
  end_at?: string;
  description?: string;
  context_code: string;
  type: "event" | "assignment";
  html_url: string;
  assignment?: CanvasAssignment;
  all_day: boolean;
}

export interface CanvasAnnouncement {
  id: number;
  title: string;
  message?: string;
  posted_at?: string;
  context_code: string;
  html_url: string;
  author?: { display_name: string };
}

export interface CanvasModule {
  id: number;
  name: string;
  position: number;
  workflow_state: string;
  items_count: number;
  items_url: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  hasMore: boolean;
  nextPageUrl?: string;
}

export interface CanvasClientConfig {
  token: string;
  domain: string;
  timeoutMs?: number;
}
