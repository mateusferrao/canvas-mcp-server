import { z } from "zod";
import {
  AssignmentIdSchema,
  ConversationIdSchema,
  CourseIdSchema,
  ModuleIdSchema,
  ModuleItemIdSchema,
  PageIdOrUrlSchema,
  PaginationSchema,
  PlannerNoteIdSchema,
  QuizIdSchema,
  QuizQuestionIdSchema,
  QuizSubmissionIdSchema,
  ResponseFormatSchema,
  TopicIdSchema,
  EntryIdSchema,
} from "./common.js";

const AssignmentBucketSchema = z
  .enum(["past", "overdue", "undated", "ungraded", "unsubmitted", "upcoming", "future"])
  .describe("Filtro por status da tarefa");

const FileIdSchema = z
  .number()
  .int()
  .positive()
  .describe("ID numérico do arquivo no Canvas");

// ── canvas_list ──────────────────────────────────────────────────────────────

export const ListCoursesInputSchema = z
  .object({
    kind: z.literal("courses"),
    enrollment_state: z
      .enum(["active", "invited_or_pending", "completed"])
      .default("active")
      .describe("Estado da matrícula"),
    response_format: ResponseFormatSchema,
  })
  .merge(PaginationSchema)
  .strict();

export const ListAssignmentsInputSchema = z
  .object({
    kind: z.literal("assignments"),
    course_id: CourseIdSchema,
    bucket: AssignmentBucketSchema.optional(),
    search_term: z.string().max(200).optional().describe("Busca por nome parcial"),
    order_by: z
      .enum(["position", "name", "due_at"])
      .default("due_at")
      .describe("Ordenação"),
    response_format: ResponseFormatSchema,
  })
  .merge(PaginationSchema)
  .strict();

export const ListTodoInputSchema = z
  .object({
    kind: z.literal("todo"),
    response_format: ResponseFormatSchema,
  })
  .merge(PaginationSchema)
  .strict();

export const ListModulesInputSchema = z
  .object({
    kind: z.literal("modules"),
    course_id: CourseIdSchema,
    include_items: z.boolean().default(false).describe("Incluir itens de cada módulo"),
    response_format: ResponseFormatSchema,
  })
  .merge(PaginationSchema)
  .strict();

export const ListModuleItemsInputSchema = z
  .object({
    kind: z.literal("module_items"),
    course_id: CourseIdSchema,
    module_id: ModuleIdSchema,
    response_format: ResponseFormatSchema,
  })
  .merge(PaginationSchema)
  .strict();

export const ListPagesInputSchema = z
  .object({
    kind: z.literal("pages"),
    course_id: CourseIdSchema,
    search_term: z.string().optional().describe("Filtrar páginas por título"),
    response_format: ResponseFormatSchema,
  })
  .merge(PaginationSchema)
  .strict();

export const ListDiscussionsInputSchema = z
  .object({
    kind: z.literal("discussions"),
    course_id: CourseIdSchema,
    search_term: z.string().optional().describe("Filtrar por título"),
    response_format: ResponseFormatSchema,
  })
  .merge(PaginationSchema)
  .strict();

export const ListConversationsInputSchema = z
  .object({
    kind: z.literal("conversations"),
    scope: z
      .enum(["unread", "starred", "archived", "sent"])
      .optional()
      .describe("Filtrar por escopo"),
    response_format: ResponseFormatSchema,
  })
  .merge(PaginationSchema)
  .strict();

export const ListPlannerNotesInputSchema = z
  .object({
    kind: z.literal("planner_notes"),
    start_date: z.string().optional().describe("Data inicial YYYY-MM-DD"),
    end_date: z.string().optional().describe("Data final YYYY-MM-DD"),
    response_format: ResponseFormatSchema,
  })
  .merge(PaginationSchema)
  .strict();

export const ListQuizzesInputSchema = z
  .object({
    kind: z.literal("quizzes"),
    course_id: CourseIdSchema,
    search_term: z.string().optional().describe("Filtrar por título"),
    response_format: ResponseFormatSchema,
  })
  .merge(PaginationSchema)
  .strict();

export const ListQuizQuestionsInputSchema = z
  .object({
    kind: z.literal("quiz_questions"),
    course_id: CourseIdSchema,
    quiz_id: QuizIdSchema,
    quiz_submission_id: QuizSubmissionIdSchema.optional().describe(
      "ID da tentativa (opcional)"
    ),
    attempt: z.coerce.number().int().positive().optional().describe("Número da tentativa"),
    response_format: ResponseFormatSchema,
  })
  .merge(PaginationSchema)
  .strict();

export const ListQuizSubmissionsInputSchema = z
  .object({
    kind: z.literal("quiz_submissions"),
    course_id: CourseIdSchema,
    quiz_id: QuizIdSchema,
    response_format: ResponseFormatSchema,
  })
  .merge(PaginationSchema)
  .strict();

export const ListSubmissionsInputSchema = z
  .object({
    kind: z.literal("submissions"),
    course_id: CourseIdSchema,
    include_assignment: z.boolean().default(false).describe("Incluir dados da tarefa"),
    response_format: ResponseFormatSchema,
  })
  .merge(PaginationSchema)
  .strict();

export const ListAnnouncementsInputSchema = z
  .object({
    kind: z.literal("announcements"),
    context_codes: z
      .array(z.string())
      .min(1)
      .max(10)
      .describe('Códigos de contexto (ex: ["course_101"])'),
    start_date: z.string().optional().describe("Data início ISO 8601"),
    end_date: z.string().optional().describe("Data fim ISO 8601"),
    active_only: z.boolean().default(true).describe("Somente anúncios publicados"),
    response_format: ResponseFormatSchema,
  })
  .merge(PaginationSchema)
  .strict();

export const ListCalendarEventsInputSchema = z
  .object({
    kind: z.literal("calendar_events"),
    context_codes: z
      .array(z.string())
      .min(1)
      .max(10)
      .describe('Códigos de contexto (ex: ["course_101"])'),
    type: z.enum(["event", "assignment"]).default("assignment").describe("Tipo de evento"),
    start_date: z.string().optional().describe("Data início ISO 8601"),
    end_date: z.string().optional().describe("Data fim ISO 8601"),
    response_format: ResponseFormatSchema,
  })
  .merge(PaginationSchema)
  .strict();

export const ListUpcomingEventsInputSchema = z
  .object({
    kind: z.literal("upcoming_events"),
    response_format: ResponseFormatSchema,
  })
  .merge(PaginationSchema)
  .strict();

export const ListMissingSubmissionsInputSchema = z
  .object({
    kind: z.literal("missing_submissions"),
    course_ids: z.array(CourseIdSchema).optional().describe("Filtrar por cursos específicos"),
    response_format: ResponseFormatSchema,
  })
  .merge(PaginationSchema)
  .strict();

export const ListFilesInputSchema = z
  .object({
    kind: z.literal("files"),
    course_id: CourseIdSchema,
    content_types: z
      .array(z.string())
      .optional()
      .describe("Filtrar por MIME type (ex: ['application/pdf'])"),
    search_term: z.string().max(200).optional().describe("Busca por nome parcial"),
    sort: z
      .enum(["name", "created_at", "updated_at", "content_type", "user"])
      .optional()
      .describe("Campo de ordenação"),
    order: z.enum(["asc", "desc"]).optional().describe("Direção da ordenação"),
    response_format: ResponseFormatSchema,
  })
  .merge(PaginationSchema)
  .strict();

export const CanvasListInputSchema = z.discriminatedUnion("kind", [
  ListCoursesInputSchema,
  ListAssignmentsInputSchema,
  ListTodoInputSchema,
  ListModulesInputSchema,
  ListModuleItemsInputSchema,
  ListPagesInputSchema,
  ListDiscussionsInputSchema,
  ListConversationsInputSchema,
  ListPlannerNotesInputSchema,
  ListQuizzesInputSchema,
  ListQuizQuestionsInputSchema,
  ListQuizSubmissionsInputSchema,
  ListSubmissionsInputSchema,
  ListAnnouncementsInputSchema,
  ListCalendarEventsInputSchema,
  ListUpcomingEventsInputSchema,
  ListMissingSubmissionsInputSchema,
  ListFilesInputSchema,
]);

export type CanvasListInput = z.infer<typeof CanvasListInputSchema>;

// ── canvas_get ───────────────────────────────────────────────────────────────

export const GetProfileInputSchema = z
  .object({
    kind: z.literal("profile"),
    response_format: ResponseFormatSchema,
  })
  .strict();

export const GetCourseInputSchema = z
  .object({
    kind: z.literal("course"),
    course_id: CourseIdSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

export const GetAssignmentInputSchema = z
  .object({
    kind: z.literal("assignment"),
    course_id: CourseIdSchema,
    assignment_id: AssignmentIdSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

export const GetSubmissionInputSchema = z
  .object({
    kind: z.literal("submission"),
    course_id: CourseIdSchema,
    assignment_id: AssignmentIdSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

export const GetPageContentInputSchema = z
  .object({
    kind: z.literal("page_content"),
    course_id: CourseIdSchema,
    page_url_or_id: PageIdOrUrlSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

export const GetDiscussionInputSchema = z
  .object({
    kind: z.literal("discussion"),
    course_id: CourseIdSchema,
    topic_id: TopicIdSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

export const GetConversationInputSchema = z
  .object({
    kind: z.literal("conversation"),
    conversation_id: ConversationIdSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

export const GetQuizInputSchema = z
  .object({
    kind: z.literal("quiz"),
    course_id: CourseIdSchema,
    quiz_id: QuizIdSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

export const GetQuizSubmissionInputSchema = z
  .object({
    kind: z.literal("quiz_submission"),
    course_id: CourseIdSchema,
    quiz_id: QuizIdSchema,
    submission_id: QuizSubmissionIdSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

export const GetQuizSubmissionQuestionsInputSchema = z
  .object({
    kind: z.literal("quiz_submission_questions"),
    quiz_submission_id: QuizSubmissionIdSchema,
    include_quiz_question: z
      .boolean()
      .optional()
      .default(false)
      .describe("Incluir dados completos da questão"),
    response_format: ResponseFormatSchema,
  })
  .strict();

export const GetQuizTimeLeftInputSchema = z
  .object({
    kind: z.literal("quiz_time_left"),
    course_id: CourseIdSchema,
    quiz_id: QuizIdSchema,
    submission_id: QuizSubmissionIdSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

export const GetCourseGradesInputSchema = z
  .object({
    kind: z.literal("course_grades"),
    course_id: CourseIdSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

export const GetFileInputSchema = z
  .object({
    kind: z.literal("file"),
    file_id: FileIdSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

export const CanvasGetInputSchema = z.discriminatedUnion("kind", [
  GetProfileInputSchema,
  GetCourseInputSchema,
  GetAssignmentInputSchema,
  GetSubmissionInputSchema,
  GetPageContentInputSchema,
  GetDiscussionInputSchema,
  GetConversationInputSchema,
  GetQuizInputSchema,
  GetQuizSubmissionInputSchema,
  GetQuizSubmissionQuestionsInputSchema,
  GetQuizTimeLeftInputSchema,
  GetCourseGradesInputSchema,
  GetFileInputSchema,
]);

export type CanvasGetInput = z.infer<typeof CanvasGetInputSchema>;

// ── canvas_document ──────────────────────────────────────────────────────────

export const DocumentDownloadInputSchema = z
  .object({
    action: z.literal("download"),
    file_id: FileIdSchema,
  })
  .strict();

export const DocumentExtractInputSchema = z
  .object({
    action: z.literal("extract"),
    file_id: FileIdSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

export const DocumentResolveTaskFilesInputSchema = z
  .object({
    action: z.literal("resolve_task_files"),
    kind: z.enum(["assignment", "page", "discussion"]),
    course_id: CourseIdSchema,
    id: z.number().int().positive().describe("ID da entidade"),
    response_format: ResponseFormatSchema,
  })
  .strict();

export const CanvasDocumentInputSchema = z.discriminatedUnion("action", [
  DocumentDownloadInputSchema,
  DocumentExtractInputSchema,
  DocumentResolveTaskFilesInputSchema,
]);

export type CanvasDocumentInput = z.infer<typeof CanvasDocumentInputSchema>;

// ── canvas_quiz_attempt ──────────────────────────────────────────────────────

export const QuizAttemptStartInputSchema = z
  .object({
    action: z.literal("start"),
    course_id: CourseIdSchema,
    quiz_id: QuizIdSchema,
    access_code: z.string().optional().describe("Código de acesso, se exigido"),
  })
  .strict();

const answerBaseFields = {
  action: z.literal("answer"),
  quiz_submission_id: QuizSubmissionIdSchema,
  attempt: z.coerce.number().int().positive().describe("Número da tentativa"),
  validation_token: z.string().min(1).describe("Token de validação da tentativa"),
  question_id: QuizQuestionIdSchema,
};

export const QuizAttemptAnswerInputSchema = z.discriminatedUnion("question_type", [
  z
    .object({
      ...answerBaseFields,
      question_type: z.literal("multiple_choice_question"),
      answer: z.coerce.number(),
    })
    .strict(),
  z
    .object({
      ...answerBaseFields,
      question_type: z.literal("true_false_question"),
      answer: z.coerce.number(),
    })
    .strict(),
  z
    .object({
      ...answerBaseFields,
      question_type: z.literal("short_answer_question"),
      answer: z.string(),
    })
    .strict(),
  z
    .object({
      ...answerBaseFields,
      question_type: z.literal("essay_question"),
      answer: z.string(),
    })
    .strict(),
  z
    .object({
      ...answerBaseFields,
      question_type: z.literal("multiple_answers_question"),
      answer: z.array(z.coerce.number()),
    })
    .strict(),
  z
    .object({
      ...answerBaseFields,
      question_type: z.literal("multiple_dropdowns_question"),
      answer: z.record(z.string(), z.coerce.number()),
    })
    .strict(),
  z
    .object({
      ...answerBaseFields,
      question_type: z.literal("fill_in_multiple_blanks_question"),
      answer: z.record(z.string(), z.string()),
    })
    .strict(),
  z
    .object({
      ...answerBaseFields,
      question_type: z.literal("matching_question"),
      answer: z.array(
        z
          .object({
            answer_id: z.coerce.number(),
            match_id: z.coerce.number(),
          })
          .strict()
      ),
    })
    .strict(),
  z
    .object({
      ...answerBaseFields,
      question_type: z.literal("numerical_question"),
      answer: z.string(),
    })
    .strict(),
  z
    .object({
      ...answerBaseFields,
      question_type: z.literal("calculated_question"),
      answer: z.string(),
    })
    .strict(),
  z
    .object({
      ...answerBaseFields,
      question_type: z.literal("file_upload_question"),
      answer: z.array(z.coerce.number()),
    })
    .strict(),
  z
    .object({
      ...answerBaseFields,
      question_type: z.literal("text_only_question"),
      answer: z.undefined().optional(),
    })
    .strict(),
]);

export const QuizAttemptCompleteInputSchema = z
  .object({
    action: z.literal("complete"),
    course_id: CourseIdSchema,
    quiz_id: QuizIdSchema,
    submission_id: QuizSubmissionIdSchema,
    attempt: z.coerce.number().int().positive().describe("Número da tentativa"),
    validation_token: z.string().min(1).describe("Token de validação da tentativa"),
    access_code: z.string().optional().describe("Código de acesso, se exigido"),
  })
  .strict();

export const CanvasQuizAttemptInputSchema = z.union([
  QuizAttemptStartInputSchema,
  ...QuizAttemptAnswerInputSchema.options,
  QuizAttemptCompleteInputSchema,
]);

export type CanvasQuizAttemptInput = z.infer<typeof CanvasQuizAttemptInputSchema>;

// ── Standalone write schemas ────────────────────────────────────────────────

export const SubmitAssignmentInputSchema = z
  .object({
    course_id: CourseIdSchema,
    assignment_id: AssignmentIdSchema,
    submission_type: z
      .enum(["online_text_entry", "online_url", "online_upload"])
      .describe("Tipo de entrega"),
    body: z.string().optional().describe("Conteúdo HTML para online_text_entry"),
    url: z.string().url().optional().describe("URL para online_url"),
    file_ids: z
      .array(z.number().int().positive())
      .optional()
      .describe("IDs de arquivos para online_upload"),
  })
  .strict();

export const MarkModuleItemDoneInputSchema = z
  .object({
    course_id: CourseIdSchema,
    module_id: ModuleIdSchema,
    item_id: ModuleItemIdSchema,
  })
  .strict();

export const PostDiscussionEntryInputSchema = z
  .object({
    course_id: CourseIdSchema,
    topic_id: TopicIdSchema,
    message: z.string().min(1).describe("Conteúdo da entrada"),
    parent_entry_id: EntryIdSchema.optional(),
  })
  .strict();

export const SendMessageInputSchema = z.discriminatedUnion("mode", [
  z
    .object({
      mode: z.literal("new"),
      recipients: z.array(z.string()).min(1),
      body: z.string().min(1),
      subject: z.string().optional(),
      context_code: z.string().optional(),
    })
    .strict(),
  z
    .object({
      mode: z.literal("reply"),
      conversation_id: ConversationIdSchema,
      body: z.string().min(1),
    })
    .strict(),
]);

export const ManagePlannerNoteInputSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("create"),
      title: z.string().min(1),
      todo_date: z.string(),
      details: z.string().optional(),
      course_id: CourseIdSchema.optional(),
      linked_object_type: z.string().optional(),
      linked_object_id: z.number().int().positive().optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal("update"),
      id: PlannerNoteIdSchema,
      title: z.string().min(1).optional(),
      todo_date: z.string().optional(),
      details: z.string().optional(),
      course_id: z.number().int().positive().optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal("delete"),
      id: PlannerNoteIdSchema,
    })
    .strict(),
]);
