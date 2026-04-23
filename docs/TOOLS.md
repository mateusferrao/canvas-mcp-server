# Tools Reference (Consolidated)

This server exposes exactly **10 tools**.

Hard cut is in effect:

- Legacy tool names were removed
- No compatibility aliases are available

## Tool Surface

| Tool | Type | Purpose |
|---|---|---|
| `canvas_list` | Read (polymorphic) | List resources by `kind` |
| `canvas_get` | Read (polymorphic) | Get a single resource by `kind` |
| `canvas_document` | Read/workflow (polymorphic) | Download/extract/resolve task files |
| `canvas_quiz_attempt` | Write/workflow (polymorphic) | Start/answer/complete quiz attempt |
| `canvas_submit_assignment` | Write | Submit assignment |
| `canvas_mark_module_item_done` | Write (idempotent) | Mark module item done |
| `canvas_post_discussion_entry` | Write | Post discussion entry or reply |
| `canvas_send_message` | Write | Create/reply inbox conversation |
| `canvas_manage_planner_note` | Write | Create/update/delete planner note |
| `canvas_upload_file` | Write | Upload user file |

## Shared conventions

- `response_format`: `markdown` or `json` (default from schema)
- List-style variants support pagination fields from schema (`per_page`, `page`)
- IDs are numeric unless explicitly documented otherwise

## 1) `canvas_list`

`canvas_list` routes by discriminant `kind`.

### Supported kinds

| kind | Required fields | Notes |
|---|---|---|
| `courses` | none | optional `enrollment_state` |
| `assignments` | `course_id` | supports `bucket`, `search_term`, `order_by` |
| `todo` | none | global to-do |
| `modules` | `course_id` | optional `include_items` |
| `module_items` | `course_id`, `module_id` | module item listing |
| `pages` | `course_id` | optional `search_term` |
| `discussions` | `course_id` | optional `search_term` |
| `conversations` | none | optional `scope` |
| `planner_notes` | none | optional `start_date`, `end_date` |
| `quizzes` | `course_id` | optional `search_term` |
| `quiz_questions` | `course_id`, `quiz_id` | optional `quiz_submission_id`, `attempt` |
| `quiz_submissions` | `course_id`, `quiz_id` | paginated in consolidated flow |
| `submissions` | `course_id` | optional `include_assignment` |
| `announcements` | `context_codes` | optional `start_date`, `end_date`, `active_only` |
| `calendar_events` | `context_codes` | optional `type`, date range |
| `upcoming_events` | none | global upcoming |
| `missing_submissions` | none | optional `course_ids` |
| `files` | `course_id` | optional MIME/search/sort/order filters |

### Example

```json
{
  "name": "canvas_list",
  "arguments": {
    "kind": "assignments",
    "course_id": 101,
    "bucket": "upcoming",
    "per_page": 25,
    "page": 1,
    "response_format": "markdown"
  }
}
```

## 2) `canvas_get`

`canvas_get` routes by discriminant `kind`.

### Supported kinds

| kind | Required fields | Notes |
|---|---|---|
| `profile` | none | authenticated user profile |
| `course` | `course_id` | course details |
| `assignment` | `course_id`, `assignment_id` | assignment details |
| `submission` | `course_id`, `assignment_id` | assignment submission |
| `page_content` | `course_id`, `page_url_or_id` | page content |
| `discussion` | `course_id`, `topic_id` | discussion topic |
| `conversation` | `conversation_id` | inbox conversation |
| `quiz` | `course_id`, `quiz_id` | quiz metadata |
| `quiz_submission` | `course_id`, `quiz_id`, `submission_id` | specific attempt |
| `quiz_submission_questions` | `quiz_submission_id` | optional `include_quiz_question` |
| `quiz_time_left` | `course_id`, `quiz_id`, `submission_id` | attempt timer |
| `course_grades` | `course_id` | grades summary |
| `file` | `file_id` | file metadata |

### Example

```json
{
  "name": "canvas_get",
  "arguments": {
    "kind": "page_content",
    "course_id": 101,
    "page_url_or_id": "introducao-ao-curso",
    "response_format": "markdown"
  }
}
```

## 3) `canvas_document`

`canvas_document` routes by discriminant `action`.

| action | Required fields | Notes |
|---|---|---|
| `download` | `file_id` | returns base64 bytes |
| `extract` | `file_id` | text extraction + metadata |
| `resolve_task_files` | `kind`, `course_id`, `id` | `kind`: `assignment`, `page`, `discussion` |

### Example

```json
{
  "name": "canvas_document",
  "arguments": {
    "action": "resolve_task_files",
    "kind": "assignment",
    "course_id": 101,
    "id": 201,
    "response_format": "markdown"
  }
}
```

## 4) `canvas_quiz_attempt`

`canvas_quiz_attempt` routes by discriminant `action`.

| action | Required fields | Notes |
|---|---|---|
| `start` | `course_id`, `quiz_id` | returns attempt + validation token |
| `answer` | `quiz_submission_id`, `attempt`, `validation_token`, `question_id`, `question_type` | `answer` shape depends on `question_type` |
| `complete` | `course_id`, `quiz_id`, `submission_id`, `attempt`, `validation_token` | irreversible submit |

### Example

```json
{
  "name": "canvas_quiz_attempt",
  "arguments": {
    "action": "answer",
    "quiz_submission_id": 2001,
    "attempt": 1,
    "validation_token": "TOKEN_ABC123",
    "question_id": 3001,
    "question_type": "multiple_choice_question",
    "answer": 2
  }
}
```

## 5) Standalone write tools

### `canvas_submit_assignment`

- Required: `course_id`, `assignment_id`, `submission_type`
- Optional by mode:
  - `online_text_entry`: `body`
  - `online_url`: `url`
  - `online_upload`: `file_ids`

### `canvas_mark_module_item_done`

- Required: `course_id`, `module_id`, `item_id`

### `canvas_post_discussion_entry`

- Required: `course_id`, `topic_id`, `message`
- Optional: `parent_entry_id` (reply)

### `canvas_send_message`

- `mode: "new"`: `recipients`, `body`, optional `subject`, `context_code`
- `mode: "reply"`: `conversation_id`, `body`

### `canvas_manage_planner_note`

- `action: "create"`: `title`, `todo_date`, optional details/link fields
- `action: "update"`: `id` + fields to modify
- `action: "delete"`: `id`

### `canvas_upload_file`

- Required:
  - `file_name`
  - one of: `file_path` or `file_content_base64`
- Optional: `content_type`, `parent_folder_path`, `on_duplicate`

## Legacy Migration Map (43 -> 10)

Use this map when updating prompts, clients, or tests.

| Legacy tool | New call |
|---|---|
| `canvas_get_profile` | `canvas_get` with `kind: "profile"` |
| `canvas_list_courses` | `canvas_list` with `kind: "courses"` |
| `canvas_get_course` | `canvas_get` with `kind: "course"` |
| `canvas_list_assignments` | `canvas_list` with `kind: "assignments"` |
| `canvas_get_assignment` | `canvas_get` with `kind: "assignment"` |
| `canvas_list_submissions` | `canvas_list` with `kind: "submissions"` |
| `canvas_get_submission` | `canvas_get` with `kind: "submission"` |
| `canvas_submit_assignment` | unchanged |
| `canvas_list_todo` | `canvas_list` with `kind: "todo"` |
| `canvas_list_upcoming_events` | `canvas_list` with `kind: "upcoming_events"` |
| `canvas_list_missing_submissions` | `canvas_list` with `kind: "missing_submissions"` |
| `canvas_list_calendar_events` | `canvas_list` with `kind: "calendar_events"` |
| `canvas_list_announcements` | `canvas_list` with `kind: "announcements"` |
| `canvas_list_modules` | `canvas_list` with `kind: "modules"` |
| `canvas_list_module_items` | `canvas_list` with `kind: "module_items"` |
| `canvas_mark_module_item_done` | unchanged |
| `canvas_list_pages` | `canvas_list` with `kind: "pages"` |
| `canvas_get_page_content` | `canvas_get` with `kind: "page_content"` |
| `canvas_list_discussions` | `canvas_list` with `kind: "discussions"` |
| `canvas_get_discussion` | `canvas_get` with `kind: "discussion"` |
| `canvas_post_discussion_entry` | unchanged |
| `canvas_list_conversations` | `canvas_list` with `kind: "conversations"` |
| `canvas_get_conversation` | `canvas_get` with `kind: "conversation"` |
| `canvas_send_message` | unchanged |
| `canvas_list_planner_notes` | `canvas_list` with `kind: "planner_notes"` |
| `canvas_manage_planner_note` | unchanged |
| `canvas_get_course_grades` | `canvas_get` with `kind: "course_grades"` |
| `canvas_list_quizzes` | `canvas_list` with `kind: "quizzes"` |
| `canvas_get_quiz` | `canvas_get` with `kind: "quiz"` |
| `canvas_list_quiz_questions` | `canvas_list` with `kind: "quiz_questions"` |
| `canvas_start_quiz_attempt` | `canvas_quiz_attempt` with `action: "start"` |
| `canvas_get_quiz_submission_questions` | `canvas_get` with `kind: "quiz_submission_questions"` |
| `canvas_answer_quiz_question` | `canvas_quiz_attempt` with `action: "answer"` |
| `canvas_complete_quiz_attempt` | `canvas_quiz_attempt` with `action: "complete"` |
| `canvas_list_quiz_submissions` | `canvas_list` with `kind: "quiz_submissions"` |
| `canvas_get_quiz_submission` | `canvas_get` with `kind: "quiz_submission"` |
| `canvas_get_quiz_time_left` | `canvas_get` with `kind: "quiz_time_left"` |
| `canvas_upload_file` | unchanged |
| `canvas_list_files` | `canvas_list` with `kind: "files"` |
| `canvas_get_file` | `canvas_get` with `kind: "file"` |
| `canvas_download_file` | `canvas_document` with `action: "download"` |
| `canvas_extract_document_text` | `canvas_document` with `action: "extract"` |
| `canvas_resolve_task_files` | `canvas_document` with `action: "resolve_task_files"` |

## Compatibility note

If a caller still sends any removed legacy tool name, MCP will return tool-not-found.
No alias fallback is implemented by design.
