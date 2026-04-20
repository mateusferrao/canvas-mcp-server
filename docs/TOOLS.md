# Available Tools

All tools are prefixed with `canvas_` to avoid conflicts with other MCP servers.

## Common Parameters

All list tools accept:

| Parameter | Type | Default | Description |
|---|---|---|---|
| `per_page` | int 1–100 | 25 | Results per page |
| `page` | int | 1 | Page number |
| `response_format` | `"markdown"` \| `"json"` | `"markdown"` | Output format |

---

## Account & Courses

| Tool | Description |
|---|---|
| `canvas_get_profile` | Returns the authenticated user's name, email, login ID, and Canvas user ID |
| `canvas_list_courses` | Lists enrolled courses. Filterable by `enrollment_state` (`active`, `invited_or_pending`, `completed`) |
| `canvas_get_course` | Full details for a single course including current grade |

## Assignments

| Tool | Description |
|---|---|
| `canvas_list_assignments` | Lists assignments for a course. Supports `bucket` filter (`overdue`, `upcoming`, `unsubmitted`, etc.), `search_term`, and `order_by` |
| `canvas_get_assignment` | Full details for one assignment: due date, points, submission types, grading status |

## Submissions

| Tool | Description |
|---|---|
| `canvas_list_submissions` | Lists the student's own submissions in a course |
| `canvas_get_submission` | Details for a specific submission: grade, score, submission date, lateness |
| `canvas_submit_assignment` | Submits an assignment. Supports `online_text_entry` (HTML), `online_url` (http/https link), and `online_upload` (file IDs from `canvas_upload_file`) |

## To-Do & Deadlines

| Tool | Description |
|---|---|
| `canvas_list_todo` | Global to-do list — all pending assignments and quizzes across courses |
| `canvas_list_upcoming_events` | Upcoming assignments and calendar events sorted by date |
| `canvas_list_missing_submissions` | Past-due assignments with no submission. Optionally filtered by `course_ids` |

## Calendar & Announcements

| Tool | Description |
|---|---|
| `canvas_list_calendar_events` | Calendar events and assignments for given courses (`context_codes`). Supports date range filters |
| `canvas_list_announcements` | Announcements from given courses. Filterable by date range |

## Modules

| Tool | Description |
|---|---|
| `canvas_list_modules` | Lists all modules in a course. Optional `include_items` to embed items in the response |
| `canvas_list_module_items` | Lists items (pages, assignments, quizzes, external URLs) inside a specific module |
| `canvas_mark_module_item_done` | Marks a module item as complete. Idempotent. |

## Pages

| Tool | Description |
|---|---|
| `canvas_list_pages` | Lists Wiki pages in a course. Filterable by `search_term` |
| `canvas_get_page_content` | Fetches a page and converts its HTML body to clean Markdown. In `json` mode, returns the raw HTML |

## Discussions

| Tool | Description |
|---|---|
| `canvas_list_discussions` | Lists discussion topics in a course |
| `canvas_get_discussion` | Gets a topic's details and HTML message (converted to Markdown) |
| `canvas_post_discussion_entry` | Posts a top-level entry or a reply (`parent_entry_id`) to a discussion topic |

## Conversations / Inbox

| Tool | Description |
|---|---|
| `canvas_list_conversations` | Lists Inbox conversations. Filterable by `scope` (unread, starred, archived, sent) |
| `canvas_get_conversation` | Gets a conversation including full message history |
| `canvas_send_message` | Dual-mode: `mode="new"` creates a conversation; `mode="reply"` adds a message to an existing one |

## Files

| Tool | Description |
|---|---|
| `canvas_upload_file` | Uploads a file to Canvas (user's Files). Accepts `file_path` (local) or `file_content_base64`. Returns metadata including download URL |

## Documents & Files (Phase 4)

Text extraction from Canvas files — supports TXT, PDF, DOCX, and images (OCR via Google Cloud Vision).

| Tool | Description |
|---|---|
| `canvas_list_files` | Lists files in a Canvas course. Filterable by `content_types`, `search_term`, sort order. |
| `canvas_get_file` | Metadata for a single file: name, MIME type, size, download URL. |
| `canvas_download_file` | Downloads file bytes as Base64. Use when raw binary is needed. For text extraction use `canvas_extract_document_text`. |
| `canvas_extract_document_text` | Downloads and extracts text. TXT → UTF-8 decode. PDF → pdf-parse. DOCX → mammoth. Images → Google Cloud Vision OCR. Returns text + method + page count (PDF) + truncation flag. |
| `canvas_resolve_task_files` | **Main use case.** Parses HTML description of an assignment, page, or discussion; finds all embedded Canvas file links; downloads + extracts text from each concurrently. Returns consolidated text per file. |

### `canvas_resolve_task_files` parameters

| Parameter | Type | Description |
|---|---|---|
| `kind` | `"assignment"` \| `"page"` \| `"discussion"` | Entity type |
| `course_id` | number | Course ID |
| `id` | number | ID of the assignment / page / discussion topic |
| `response_format` | `"markdown"` \| `"json"` | Output format |

### End-to-end example

> "Read the files attached to assignment 501 in course 101."

1. `canvas_resolve_task_files` with `kind: "assignment", course_id: 101, id: 501`
   → finds Canvas file links in assignment description, extracts text from each

Or individually:
1. `canvas_get_assignment` to see the description
2. `canvas_list_files` if needed to find file IDs
3. `canvas_extract_document_text` per file

## Planner

| Tool | Description |
|---|---|
| `canvas_list_planner_notes` | Lists personal Planner Notes. Filterable by date range |
| `canvas_manage_planner_note` | CRUD for Planner Notes via `action`: `"create"`, `"update"`, or `"delete"` |

## Grades

| Tool | Description |
|---|---|
| `canvas_get_course_grades` | Returns the student's current and final grade (letter + percentage) for a course |

## Quizzes

| Tool | Description |
|---|---|
| `canvas_list_quizzes` | Lists quizzes in a course with type, questions, points and due date |
| `canvas_get_quiz` | Details for a specific quiz (metadata) |

## Quiz-Taking Flow (Phase 3)

Complete end-to-end flow: list questions → start attempt → answer → submit → review score.

| Tool | Description |
|---|---|
| `canvas_list_quiz_questions` | Lists quiz questions with type, points, and answer options. Optional `quiz_submission_id` + `attempt` to get the exact versioned question set for an attempt |
| `canvas_start_quiz_attempt` | Creates a new attempt (timer starts). If an attempt is already in progress (409), recovers it automatically. Returns `submission_id`, `attempt`, `validation_token`, and `end_at` — **save these values** for subsequent calls |
| `canvas_get_quiz_submission_questions` | Gets question states for an attempt in progress (current answers, flagged status). Optional `include_quiz_question` for full question text |
| `canvas_answer_quiz_question` | Submits an answer for one question. Validates answer shape client-side by `question_type` before calling the API. Re-posting replaces the previous answer |
| `canvas_complete_quiz_attempt` | **Irreversible.** Finalizes and submits the attempt. Requires `attempt` + `validation_token` from `canvas_start_quiz_attempt`. Returns final score |
| `canvas_list_quiz_submissions` | Lists all past attempts for a quiz with scores and states |
| `canvas_get_quiz_submission` | Gets details for a specific attempt (score, time spent, state) |
| `canvas_get_quiz_time_left` | Returns seconds remaining and expiry time for an in-progress attempt |

### Answer format by `question_type`

| question_type | `answer` |
|---|---|
| `multiple_choice_question` / `true_false_question` | `number` — answer option ID |
| `short_answer_question` / `essay_question` | `string` (essay accepts HTML) |
| `multiple_answers_question` / `file_upload_question` | `number[]` — array of IDs |
| `multiple_dropdowns_question` | `{ blank_name: answer_id }` |
| `fill_in_multiple_blanks_question` | `{ blank_name: "text" }` |
| `matching_question` | `[{ answer_id, match_id }]` |
| `numerical_question` / `calculated_question` | `string` (e.g. `"13.4"`) |
| `text_only_question` | no answer needed — tool returns informational message |

### stateless `validation_token` flow

Canvas issues `validation_token` **once** when the attempt is created. It is required by `canvas_answer_quiz_question` and `canvas_complete_quiz_attempt`. The MCP server does not cache it — the AI agent is responsible for reading it from the `canvas_start_quiz_attempt` response and passing it in subsequent calls.

### End-to-end example

> "Take quiz 1001 in course 101 and answer the multiple choice question."

1. `canvas_list_quiz_questions` → inspect questions and answer IDs
2. `canvas_start_quiz_attempt` → get `submission_id`, `attempt`, `validation_token`
3. `canvas_answer_quiz_question` → submit answer (multiple_choice: `answer: 2`)
4. `canvas_complete_quiz_attempt` → finalize
5. `canvas_get_quiz_submission` → review final score

---

## Usage Examples

Natural-language prompts you can use with Claude once the server is connected.

**Check pending work:**
> "What assignments do I have due this week?"

Claude will call `canvas_list_upcoming_events` and/or `canvas_list_todo`.

---

**Find missing submissions:**
> "Which assignments have I missed or not submitted yet?"

Claude will call `canvas_list_missing_submissions`.

---

**Submit an assignment:**
> "Submit assignment 201 in course 101 with the text 'My analysis of the software requirements: ...'"

Claude will call `canvas_submit_assignment` with `submission_type: "online_text_entry"`.

---

**Check grades:**
> "What's my current grade in Cálculo II?"

Claude will call `canvas_list_courses` to find the course ID, then `canvas_get_course_grades`.

---

**Read course content:**
> "Summarize the introduction page for Engenharia de Software."

Claude will call `canvas_list_pages` then `canvas_get_page_content` — HTML is converted to Markdown automatically.

---

**Browse discussions:**
> "What questions have students asked in the Trabalho 1 forum? Draft a reply to the question about the deadline."

Claude will call `canvas_list_discussions`, `canvas_get_discussion`, then `canvas_post_discussion_entry`.

---

**Check module progress:**
> "Which modules have I completed in course 101? What's left in Module 2?"

Claude will call `canvas_list_modules` then `canvas_list_module_items`.

---

**Upload and submit a file:**
> "Upload my PDF report and submit it for assignment 201 in course 101."

Claude will call `canvas_upload_file` (returns a file ID), then `canvas_submit_assignment` with `submission_type: "online_upload"` and `file_ids: [<id>]`.

---

**Message a professor:**
> "Send a message to professor ID 1 asking about the exam schedule."

Claude will call `canvas_send_message` with `mode: "new"`.

---

**Manage planner notes:**
> "Add a planner note to study for P2 on June 10th."

Claude will call `canvas_manage_planner_note` with `action: "create"`.

---

**Plan the week:**
> "Give me a summary of everything I need to do before Sunday."

Claude will combine `canvas_list_todo`, `canvas_list_upcoming_events`, and `canvas_list_missing_submissions`.

---

**Read announcements:**
> "Are there any new announcements in my courses?"

Claude will call `canvas_list_courses` to get IDs, then `canvas_list_announcements` with the context codes.

---

**Read files attached to an assignment:**
> "What does the PDF attached to the Trabalho 1 assignment say?"

Claude calls `canvas_resolve_task_files` with `kind: "assignment"` — it parses the assignment description, finds all embedded Canvas file links, and extracts text from each concurrently.

---

**Extract text from a specific file:**
> "Extract text from file ID 1234 in course 101."

Claude calls `canvas_extract_document_text`.
