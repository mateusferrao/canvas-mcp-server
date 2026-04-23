import { z } from "zod";
import { AnnouncementsRepository } from "../../repositories/announcements.js";
import { AssignmentsRepository } from "../../repositories/assignments.js";
import { CalendarRepository } from "../../repositories/calendar.js";
import { ConversationsRepository } from "../../repositories/conversations.js";
import { CoursesRepository } from "../../repositories/courses.js";
import { DiscussionsRepository } from "../../repositories/discussions.js";
import { ModulesRepository } from "../../repositories/modules.js";
import { PagesRepository } from "../../repositories/pages.js";
import { PlannerRepository } from "../../repositories/planner.js";
import { QuizzesRepository } from "../../repositories/quizzes.js";
import { SubmissionsRepository } from "../../repositories/submissions.js";
import { TodoRepository } from "../../repositories/todo.js";
import {
  AnnouncementJsonFormatter,
  AnnouncementMarkdownFormatter,
  AssignmentJsonFormatter,
  AssignmentMarkdownFormatter,
  CalendarJsonFormatter,
  CalendarMarkdownFormatter,
  ConversationJsonFormatter,
  ConversationMarkdownFormatter,
  CourseJsonFormatter,
  CourseMarkdownFormatter,
  DiscussionTopicJsonFormatter,
  DiscussionTopicMarkdownFormatter,
  FileJsonFormatter,
  FileMarkdownFormatter,
  ModuleItemJsonFormatter,
  ModuleItemMarkdownFormatter,
  ModuleJsonFormatter,
  ModuleMarkdownFormatter,
  PageJsonFormatter,
  PageMarkdownFormatter,
  PlannerNoteJsonFormatter,
  PlannerNoteMarkdownFormatter,
  QuizJsonFormatter,
  QuizMarkdownFormatter,
  QuizQuestionJsonFormatter,
  QuizQuestionMarkdownFormatter,
  QuizSubmissionJsonFormatter,
  QuizSubmissionMarkdownFormatter,
  ResponseFormat,
  SubmissionJsonFormatter,
  SubmissionMarkdownFormatter,
  TodoJsonFormatter,
  TodoMarkdownFormatter,
  selectFormatter,
  type Formatter,
} from "../../services/formatters.js";
import { ok, type CanvasError, type Result } from "../../services/errors.js";
import {
  CanvasListInputSchema,
  ListAnnouncementsInputSchema,
  ListAssignmentsInputSchema,
  ListCalendarEventsInputSchema,
  ListConversationsInputSchema,
  ListCoursesInputSchema,
  ListDiscussionsInputSchema,
  ListFilesInputSchema,
  ListMissingSubmissionsInputSchema,
  ListModuleItemsInputSchema,
  ListModulesInputSchema,
  ListPagesInputSchema,
  ListPlannerNotesInputSchema,
  ListQuizQuestionsInputSchema,
  ListQuizSubmissionsInputSchema,
  ListQuizzesInputSchema,
  ListSubmissionsInputSchema,
  ListTodoInputSchema,
  ListUpcomingEventsInputSchema,
} from "../../schemas/consolidated.js";
import { ResponseFormatSchema } from "../../schemas/common.js";
import type { ClientContext } from "../../transport/types.js";
import type { PaginatedResponse } from "../../types.js";
import { executeListTool, type ListResult } from "../base.js";
import { buildDocumentsRepository } from "../consolidated/documentServices.js";

const listKinds = [
  "courses",
  "assignments",
  "todo",
  "modules",
  "module_items",
  "pages",
  "discussions",
  "conversations",
  "planner_notes",
  "quizzes",
  "quiz_questions",
  "quiz_submissions",
  "submissions",
  "announcements",
  "calendar_events",
  "upcoming_events",
  "missing_submissions",
  "files",
] as const;

const ListKindSchema = z.enum(listKinds);

type ListKind = (typeof listKinds)[number];

interface ListRegistration {
  schema: z.ZodType<unknown>;
  fetch: (
    input: unknown,
    context: ClientContext
  ) => Promise<Result<PaginatedResponse<unknown>, CanvasError>>;
  markdownFormatter: Formatter<unknown>;
  jsonFormatter: Formatter<unknown>;
}

function zodErrorText(error: z.ZodError): string {
  const details = error.issues
    .map((issue) => {
      const path = issue.path.length ? issue.path.join(".") : "input";
      return `${path}: ${issue.message}`;
    })
    .join("; ");
  return `Erro [INVALID_PARAMS]: ${details}`;
}

const courseMdFmt = new CourseMarkdownFormatter();
const courseJsonFmt = new CourseJsonFormatter();
const assignmentMdFmt = new AssignmentMarkdownFormatter();
const assignmentJsonFmt = new AssignmentJsonFormatter();
const todoMdFmt = new TodoMarkdownFormatter();
const todoJsonFmt = new TodoJsonFormatter();
const moduleMdFmt = new ModuleMarkdownFormatter();
const moduleJsonFmt = new ModuleJsonFormatter();
const moduleItemMdFmt = new ModuleItemMarkdownFormatter();
const moduleItemJsonFmt = new ModuleItemJsonFormatter();
const pageMdFmt = new PageMarkdownFormatter();
const pageJsonFmt = new PageJsonFormatter();
const discussionMdFmt = new DiscussionTopicMarkdownFormatter();
const discussionJsonFmt = new DiscussionTopicJsonFormatter();
const conversationMdFmt = new ConversationMarkdownFormatter();
const conversationJsonFmt = new ConversationJsonFormatter();
const plannerMdFmt = new PlannerNoteMarkdownFormatter();
const plannerJsonFmt = new PlannerNoteJsonFormatter();
const quizMdFmt = new QuizMarkdownFormatter();
const quizJsonFmt = new QuizJsonFormatter();
const quizQuestionMdFmt = new QuizQuestionMarkdownFormatter();
const quizQuestionJsonFmt = new QuizQuestionJsonFormatter();
const quizSubmissionMdFmt = new QuizSubmissionMarkdownFormatter();
const quizSubmissionJsonFmt = new QuizSubmissionJsonFormatter();
const submissionMdFmt = new SubmissionMarkdownFormatter();
const submissionJsonFmt = new SubmissionJsonFormatter();
const announcementMdFmt = new AnnouncementMarkdownFormatter();
const announcementJsonFmt = new AnnouncementJsonFormatter();
const calendarMdFmt = new CalendarMarkdownFormatter();
const calendarJsonFmt = new CalendarJsonFormatter();
const fileMdFmt = new FileMarkdownFormatter();
const fileJsonFmt = new FileJsonFormatter();

const listRegistry: Record<ListKind, ListRegistration> = {
  courses: {
    schema: ListCoursesInputSchema,
    fetch: async (input, context) => {
      const parsed = ListCoursesInputSchema.parse(input);
      const repo = new CoursesRepository(context.client);
      return repo.list({
        enrollment_state: parsed.enrollment_state,
        per_page: parsed.per_page,
        page: parsed.page,
      });
    },
    markdownFormatter: courseMdFmt as Formatter<unknown>,
    jsonFormatter: courseJsonFmt as Formatter<unknown>,
  },
  assignments: {
    schema: ListAssignmentsInputSchema,
    fetch: async (input, context) => {
      const parsed = ListAssignmentsInputSchema.parse(input);
      const repo = new AssignmentsRepository(context.client);
      return repo.list({
        courseId: parsed.course_id,
        bucket: parsed.bucket,
        search_term: parsed.search_term,
        order_by: parsed.order_by,
        per_page: parsed.per_page,
        page: parsed.page,
      });
    },
    markdownFormatter: assignmentMdFmt as Formatter<unknown>,
    jsonFormatter: assignmentJsonFmt as Formatter<unknown>,
  },
  todo: {
    schema: ListTodoInputSchema,
    fetch: async (input, context) => {
      const parsed = ListTodoInputSchema.parse(input);
      const repo = new TodoRepository(context.client);
      return repo.listTodo({ per_page: parsed.per_page, page: parsed.page });
    },
    markdownFormatter: todoMdFmt as Formatter<unknown>,
    jsonFormatter: todoJsonFmt as Formatter<unknown>,
  },
  modules: {
    schema: ListModulesInputSchema,
    fetch: async (input, context) => {
      const parsed = ListModulesInputSchema.parse(input);
      const repo = new ModulesRepository(context.client);
      return repo.list(parsed.course_id, {
        includeItems: parsed.include_items,
        per_page: parsed.per_page,
        page: parsed.page,
      });
    },
    markdownFormatter: moduleMdFmt as Formatter<unknown>,
    jsonFormatter: moduleJsonFmt as Formatter<unknown>,
  },
  module_items: {
    schema: ListModuleItemsInputSchema,
    fetch: async (input, context) => {
      const parsed = ListModuleItemsInputSchema.parse(input);
      const repo = new ModulesRepository(context.client);
      return repo.listItems(parsed.course_id, parsed.module_id, {
        per_page: parsed.per_page,
        page: parsed.page,
      });
    },
    markdownFormatter: moduleItemMdFmt as Formatter<unknown>,
    jsonFormatter: moduleItemJsonFmt as Formatter<unknown>,
  },
  pages: {
    schema: ListPagesInputSchema,
    fetch: async (input, context) => {
      const parsed = ListPagesInputSchema.parse(input);
      const repo = new PagesRepository(context.client);
      return repo.list(parsed.course_id, {
        search_term: parsed.search_term,
        per_page: parsed.per_page,
        page: parsed.page,
      });
    },
    markdownFormatter: pageMdFmt as Formatter<unknown>,
    jsonFormatter: pageJsonFmt as Formatter<unknown>,
  },
  discussions: {
    schema: ListDiscussionsInputSchema,
    fetch: async (input, context) => {
      const parsed = ListDiscussionsInputSchema.parse(input);
      const repo = new DiscussionsRepository(context.client);
      return repo.list(parsed.course_id, {
        search_term: parsed.search_term,
        per_page: parsed.per_page,
        page: parsed.page,
      });
    },
    markdownFormatter: discussionMdFmt as Formatter<unknown>,
    jsonFormatter: discussionJsonFmt as Formatter<unknown>,
  },
  conversations: {
    schema: ListConversationsInputSchema,
    fetch: async (input, context) => {
      const parsed = ListConversationsInputSchema.parse(input);
      const repo = new ConversationsRepository(context.client);
      return repo.list({
        scope: parsed.scope,
        per_page: parsed.per_page,
        page: parsed.page,
      });
    },
    markdownFormatter: conversationMdFmt as Formatter<unknown>,
    jsonFormatter: conversationJsonFmt as Formatter<unknown>,
  },
  planner_notes: {
    schema: ListPlannerNotesInputSchema,
    fetch: async (input, context) => {
      const parsed = ListPlannerNotesInputSchema.parse(input);
      const repo = new PlannerRepository(context.client);
      return repo.list({
        start_date: parsed.start_date,
        end_date: parsed.end_date,
        per_page: parsed.per_page,
        page: parsed.page,
      });
    },
    markdownFormatter: plannerMdFmt as Formatter<unknown>,
    jsonFormatter: plannerJsonFmt as Formatter<unknown>,
  },
  quizzes: {
    schema: ListQuizzesInputSchema,
    fetch: async (input, context) => {
      const parsed = ListQuizzesInputSchema.parse(input);
      const repo = new QuizzesRepository(context.client);
      return repo.list(parsed.course_id, {
        search_term: parsed.search_term,
        per_page: parsed.per_page,
        page: parsed.page,
      });
    },
    markdownFormatter: quizMdFmt as Formatter<unknown>,
    jsonFormatter: quizJsonFmt as Formatter<unknown>,
  },
  quiz_questions: {
    schema: ListQuizQuestionsInputSchema,
    fetch: async (input, context) => {
      const parsed = ListQuizQuestionsInputSchema.parse(input);
      const repo = new QuizzesRepository(context.client);
      return repo.listQuestions(parsed.course_id, parsed.quiz_id, {
        quiz_submission_id: parsed.quiz_submission_id,
        quiz_submission_attempt: parsed.attempt,
        per_page: parsed.per_page,
        page: parsed.page,
      });
    },
    markdownFormatter: quizQuestionMdFmt as Formatter<unknown>,
    jsonFormatter: quizQuestionJsonFmt as Formatter<unknown>,
  },
  quiz_submissions: {
    schema: ListQuizSubmissionsInputSchema,
    fetch: async (input, context) => {
      const parsed = ListQuizSubmissionsInputSchema.parse(input);
      const repo = new QuizzesRepository(context.client);
      const result = await repo.listSubmissions(parsed.course_id, parsed.quiz_id, {
        per_page: parsed.per_page,
        page: parsed.page,
      });
      if (!result.ok) {
        return result;
      }
      return ok({ items: result.value, hasMore: false });
    },
    markdownFormatter: quizSubmissionMdFmt as Formatter<unknown>,
    jsonFormatter: quizSubmissionJsonFmt as Formatter<unknown>,
  },
  submissions: {
    schema: ListSubmissionsInputSchema,
    fetch: async (input, context) => {
      const parsed = ListSubmissionsInputSchema.parse(input);
      const repo = new SubmissionsRepository(context.client);
      return repo.list({
        courseId: parsed.course_id,
        include_assignment: parsed.include_assignment,
        per_page: parsed.per_page,
        page: parsed.page,
      });
    },
    markdownFormatter: submissionMdFmt as Formatter<unknown>,
    jsonFormatter: submissionJsonFmt as Formatter<unknown>,
  },
  announcements: {
    schema: ListAnnouncementsInputSchema,
    fetch: async (input, context) => {
      const parsed = ListAnnouncementsInputSchema.parse(input);
      const repo = new AnnouncementsRepository(context.client);
      return repo.list({
        contextCodes: parsed.context_codes,
        startDate: parsed.start_date,
        endDate: parsed.end_date,
        activeOnly: parsed.active_only,
        per_page: parsed.per_page,
        page: parsed.page,
      });
    },
    markdownFormatter: announcementMdFmt as Formatter<unknown>,
    jsonFormatter: announcementJsonFmt as Formatter<unknown>,
  },
  calendar_events: {
    schema: ListCalendarEventsInputSchema,
    fetch: async (input, context) => {
      const parsed = ListCalendarEventsInputSchema.parse(input);
      const repo = new CalendarRepository(context.client);
      return repo.listEvents({
        contextCodes: parsed.context_codes,
        type: parsed.type,
        startDate: parsed.start_date,
        endDate: parsed.end_date,
        per_page: parsed.per_page,
        page: parsed.page,
      });
    },
    markdownFormatter: calendarMdFmt as Formatter<unknown>,
    jsonFormatter: calendarJsonFmt as Formatter<unknown>,
  },
  upcoming_events: {
    schema: ListUpcomingEventsInputSchema,
    fetch: async (input, context) => {
      const parsed = ListUpcomingEventsInputSchema.parse(input);
      const repo = new TodoRepository(context.client);
      return repo.listUpcoming({ per_page: parsed.per_page, page: parsed.page });
    },
    markdownFormatter: assignmentMdFmt as Formatter<unknown>,
    jsonFormatter: assignmentJsonFmt as Formatter<unknown>,
  },
  missing_submissions: {
    schema: ListMissingSubmissionsInputSchema,
    fetch: async (input, context) => {
      const parsed = ListMissingSubmissionsInputSchema.parse(input);
      const repo = new TodoRepository(context.client);
      return repo.listMissing({
        per_page: parsed.per_page,
        page: parsed.page,
        course_ids: parsed.course_ids,
      });
    },
    markdownFormatter: assignmentMdFmt as Formatter<unknown>,
    jsonFormatter: assignmentJsonFmt as Formatter<unknown>,
  },
  files: {
    schema: ListFilesInputSchema,
    fetch: async (input, context) => {
      const parsed = ListFilesInputSchema.parse(input);
      const repo = buildDocumentsRepository(context.client);
      return repo.listCourseFiles(parsed.course_id, {
        per_page: parsed.per_page,
        page: parsed.page,
        content_types: parsed.content_types,
        search_term: parsed.search_term,
        sort: parsed.sort,
        order: parsed.order,
      });
    },
    markdownFormatter: fileMdFmt as Formatter<unknown>,
    jsonFormatter: fileJsonFmt as Formatter<unknown>,
  },
};

export async function dispatchCanvasList(
  rawInput: unknown,
  context: ClientContext
): Promise<ListResult> {
  const parsedInput = CanvasListInputSchema.safeParse(rawInput);
  if (!parsedInput.success) {
    return { content: [{ type: "text", text: zodErrorText(parsedInput.error) }] };
  }

  const kindResult = ListKindSchema.safeParse(parsedInput.data.kind);
  if (!kindResult.success) {
    return { content: [{ type: "text", text: zodErrorText(kindResult.error) }] };
  }

  const registration = listRegistry[kindResult.data];

  const typedInputResult = registration.schema.safeParse(parsedInput.data);
  if (!typedInputResult.success) {
    return { content: [{ type: "text", text: zodErrorText(typedInputResult.error) }] };
  }

  const responseFormat = ResponseFormatSchema.safeParse(
    (typedInputResult.data as Record<string, unknown>)["response_format"]
  );
  if (!responseFormat.success) {
    return { content: [{ type: "text", text: zodErrorText(responseFormat.error) }] };
  }

  const formatter = selectFormatter(
    responseFormat.data as ResponseFormat,
    registration.markdownFormatter,
    registration.jsonFormatter
  );

  return executeListTool(
    () => registration.fetch(typedInputResult.data, context),
    formatter,
    responseFormat.data
  );
}
