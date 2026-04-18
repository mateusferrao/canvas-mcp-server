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
| `canvas_get_quiz` | Details for a specific quiz. Read-only (taking quizzes requires the Canvas UI) |

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
