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
  id?: number;
  type: string;
  enrollment_state: string;
  course_id?: number;
  computed_current_grade?: string;
  computed_current_score?: number;
  computed_final_grade?: string;
  computed_final_score?: number;
  grades?: {
    current_grade?: string;
    current_score?: number;
    final_grade?: string;
    final_score?: number;
  };
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
  unlock_at?: string;
  state?: string;
  completed_at?: string;
  items?: CanvasModuleItem[];
}

export interface CanvasModuleItem {
  id: number;
  module_id: number;
  position: number;
  title: string;
  type: string;
  content_id?: number;
  html_url: string;
  url?: string;
  page_url?: string;
  external_url?: string;
  completion_requirement?: {
    type: string;
    min_score?: number;
    completed?: boolean;
  };
  content_details?: {
    points_possible?: number;
    due_at?: string;
    unlock_at?: string;
    lock_at?: string;
  };
}

export interface CanvasPage {
  page_id: number;
  url: string;
  title: string;
  body?: string;
  published: boolean;
  front_page: boolean;
  created_at: string;
  updated_at: string;
  locked_for_user?: boolean;
}

export interface CanvasDiscussionTopic {
  id: number;
  title: string;
  message?: string;
  html_url: string;
  posted_at?: string;
  last_reply_at?: string;
  published: boolean;
  locked: boolean;
  discussion_type: string;
  author?: { id: number; display_name: string; avatar_image_url?: string };
  permissions?: { reply?: boolean; attach?: boolean };
  attachments?: unknown[];
}

export interface CanvasDiscussionEntry {
  id: number;
  user_id: number;
  user_name?: string;
  message: string;
  read_state: string;
  created_at: string;
  updated_at: string;
  attachment?: unknown;
  replies?: CanvasDiscussionEntry[];
}

export interface CanvasConversation {
  id: number;
  subject: string;
  workflow_state: string;
  last_message?: string;
  last_message_at?: string;
  message_count: number;
  subscribed: boolean;
  private: boolean;
  starred: boolean;
  properties?: string[];
  audience?: number[];
  participants?: CanvasConversationParticipant[];
  messages?: CanvasConversationMessage[];
}

export interface CanvasConversationParticipant {
  id: number;
  name: string;
  avatar_url?: string;
}

export interface CanvasConversationMessage {
  id: number;
  author_id: number;
  body: string;
  created_at: string;
  attachments?: unknown[];
}

export interface CanvasFile {
  id: number;
  display_name: string;
  filename: string;
  url: string;
  "content-type": string;
  size: number;
  folder_id: number;
  created_at: string;
}

export interface CanvasPlannerNote {
  id: number;
  title: string;
  description?: string;
  user_id: number;
  workflow_state: string;
  course_id?: number;
  todo_date: string;
  linked_object_type?: string;
  linked_object_id?: number;
  created_at: string;
  updated_at: string;
}

export interface CanvasQuiz {
  id: number;
  title: string;
  html_url: string;
  description?: string;
  quiz_type: string;
  time_limit?: number;
  allowed_attempts: number;
  points_possible?: number;
  due_at?: string;
  lock_at?: string;
  unlock_at?: string;
  published: boolean;
  question_count: number;
}

export interface CanvasQuizAnswer {
  id: number;
  text: string;
  weight: number;
  match_id?: number;
  blank_id?: string;
}

export interface CanvasQuizQuestion {
  id: number;
  quiz_id: number;
  position: number;
  question_name: string;
  question_type: string;
  question_text: string;
  points_possible: number;
  answers?: CanvasQuizAnswer[];
}

export interface CanvasQuizSubmission {
  id: number;
  quiz_id: number;
  user_id: number;
  submission_id?: number;
  attempt: number;
  started_at?: string;
  finished_at?: string;
  end_at?: string;
  time_spent?: number;
  score?: number;
  kept_score?: number;
  workflow_state: string;
  overdue_and_needs_submission?: boolean;
  validation_token?: string | null;
}

export interface CanvasQuizSubmissionQuestion {
  id: number;
  flagged: boolean;
  answer?: unknown;
  answers?: unknown;
}

export interface CanvasQuizSubmissionEnvelope {
  quiz_submissions: CanvasQuizSubmission[];
}

export interface CanvasQuizSubmissionQuestionsEnvelope {
  quiz_submission_questions: CanvasQuizSubmissionQuestion[];
}

export interface CanvasQuizTimeLeft {
  end_at: string;
  time_left: number;
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
