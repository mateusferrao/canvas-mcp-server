import { z } from "zod";
import { AssignmentsRepository } from "../../repositories/assignments.js";
import { ConversationsRepository } from "../../repositories/conversations.js";
import { CoursesRepository } from "../../repositories/courses.js";
import { DiscussionsRepository } from "../../repositories/discussions.js";
import { GradesRepository } from "../../repositories/grades.js";
import { PagesRepository } from "../../repositories/pages.js";
import { ProfileRepository } from "../../repositories/profile.js";
import { QuizzesRepository } from "../../repositories/quizzes.js";
import { SubmissionsRepository } from "../../repositories/submissions.js";
import {
  AssignmentJsonFormatter,
  AssignmentMarkdownFormatter,
  ConversationJsonFormatter,
  ConversationMarkdownFormatter,
  CourseJsonFormatter,
  CourseMarkdownFormatter,
  DiscussionTopicJsonFormatter,
  DiscussionTopicMarkdownFormatter,
  FileJsonFormatter,
  FileMarkdownFormatter,
  GradesJsonFormatter,
  GradesMarkdownFormatter,
  PageJsonFormatter,
  PageMarkdownFormatter,
  QuizJsonFormatter,
  QuizMarkdownFormatter,
  QuizSubmissionJsonFormatter,
  QuizSubmissionMarkdownFormatter,
  QuizSubmissionQuestionJsonFormatter,
  QuizSubmissionQuestionMarkdownFormatter,
  QuizTimeLeftJsonFormatter,
  QuizTimeLeftMarkdownFormatter,
  SubmissionJsonFormatter,
  SubmissionMarkdownFormatter,
  UserJsonFormatter,
  UserMarkdownFormatter,
  selectFormatter,
} from "../../services/formatters.js";
import { formatError } from "../../services/errors.js";
import {
  CanvasGetInputSchema,
  GetAssignmentInputSchema,
  GetConversationInputSchema,
  GetCourseGradesInputSchema,
  GetCourseInputSchema,
  GetDiscussionInputSchema,
  GetFileInputSchema,
  GetPageContentInputSchema,
  GetProfileInputSchema,
  GetQuizInputSchema,
  GetQuizSubmissionInputSchema,
  GetQuizSubmissionQuestionsInputSchema,
  GetQuizTimeLeftInputSchema,
  GetSubmissionInputSchema,
} from "../../schemas/consolidated.js";
import type { ClientContext } from "../../transport/types.js";
import { executeSingleTool, type ListResult } from "../base.js";
import { buildDocumentsRepository } from "../consolidated/documentServices.js";

const getKinds = [
  "profile",
  "course",
  "assignment",
  "submission",
  "page_content",
  "discussion",
  "conversation",
  "quiz",
  "quiz_submission",
  "quiz_submission_questions",
  "quiz_time_left",
  "course_grades",
  "file",
] as const;

const GetKindSchema = z.enum(getKinds);

type GetKind = (typeof getKinds)[number];

interface GetRegistration {
  schema: z.ZodType<unknown>;
  execute: (input: unknown, context: ClientContext) => Promise<ListResult>;
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

const profileMdFmt = new UserMarkdownFormatter();
const profileJsonFmt = new UserJsonFormatter();
const courseMdFmt = new CourseMarkdownFormatter();
const courseJsonFmt = new CourseJsonFormatter();
const assignmentMdFmt = new AssignmentMarkdownFormatter();
const assignmentJsonFmt = new AssignmentJsonFormatter();
const submissionMdFmt = new SubmissionMarkdownFormatter();
const submissionJsonFmt = new SubmissionJsonFormatter();
const pageMdFmt = new PageMarkdownFormatter();
const pageJsonFmt = new PageJsonFormatter();
const discussionMdFmt = new DiscussionTopicMarkdownFormatter();
const discussionJsonFmt = new DiscussionTopicJsonFormatter();
const conversationMdFmt = new ConversationMarkdownFormatter();
const conversationJsonFmt = new ConversationJsonFormatter();
const quizMdFmt = new QuizMarkdownFormatter();
const quizJsonFmt = new QuizJsonFormatter();
const quizSubmissionMdFmt = new QuizSubmissionMarkdownFormatter();
const quizSubmissionJsonFmt = new QuizSubmissionJsonFormatter();
const quizSubmissionQuestionMdFmt = new QuizSubmissionQuestionMarkdownFormatter();
const quizSubmissionQuestionJsonFmt = new QuizSubmissionQuestionJsonFormatter();
const quizTimeLeftMdFmt = new QuizTimeLeftMarkdownFormatter();
const quizTimeLeftJsonFmt = new QuizTimeLeftJsonFormatter();
const gradesMdFmt = new GradesMarkdownFormatter();
const gradesJsonFmt = new GradesJsonFormatter();
const fileMdFmt = new FileMarkdownFormatter();
const fileJsonFmt = new FileJsonFormatter();

const getRegistry: Record<GetKind, GetRegistration> = {
  profile: {
    schema: GetProfileInputSchema,
    execute: async (input, context) => {
      const parsed = GetProfileInputSchema.parse(input);
      const repo = new ProfileRepository(context.client);
      const formatter = selectFormatter(parsed.response_format, profileMdFmt, profileJsonFmt);
      return executeSingleTool(() => repo.getSelf(), formatter);
    },
  },
  course: {
    schema: GetCourseInputSchema,
    execute: async (input, context) => {
      const parsed = GetCourseInputSchema.parse(input);
      const repo = new CoursesRepository(context.client);
      const formatter = selectFormatter(parsed.response_format, courseMdFmt, courseJsonFmt);
      return executeSingleTool(() => repo.get(parsed.course_id), formatter);
    },
  },
  assignment: {
    schema: GetAssignmentInputSchema,
    execute: async (input, context) => {
      const parsed = GetAssignmentInputSchema.parse(input);
      const repo = new AssignmentsRepository(context.client);
      const formatter = selectFormatter(parsed.response_format, assignmentMdFmt, assignmentJsonFmt);
      return executeSingleTool(() => repo.get(parsed.course_id, parsed.assignment_id), formatter);
    },
  },
  submission: {
    schema: GetSubmissionInputSchema,
    execute: async (input, context) => {
      const parsed = GetSubmissionInputSchema.parse(input);
      const repo = new SubmissionsRepository(context.client);
      const formatter = selectFormatter(parsed.response_format, submissionMdFmt, submissionJsonFmt);
      return executeSingleTool(() => repo.get(parsed.course_id, parsed.assignment_id), formatter);
    },
  },
  page_content: {
    schema: GetPageContentInputSchema,
    execute: async (input, context) => {
      const parsed = GetPageContentInputSchema.parse(input);
      const repo = new PagesRepository(context.client);
      const formatter = selectFormatter(parsed.response_format, pageMdFmt, pageJsonFmt);
      return executeSingleTool(() => repo.get(parsed.course_id, parsed.page_url_or_id), formatter);
    },
  },
  discussion: {
    schema: GetDiscussionInputSchema,
    execute: async (input, context) => {
      const parsed = GetDiscussionInputSchema.parse(input);
      const repo = new DiscussionsRepository(context.client);
      const formatter = selectFormatter(parsed.response_format, discussionMdFmt, discussionJsonFmt);
      return executeSingleTool(() => repo.get(parsed.course_id, parsed.topic_id), formatter);
    },
  },
  conversation: {
    schema: GetConversationInputSchema,
    execute: async (input, context) => {
      const parsed = GetConversationInputSchema.parse(input);
      const repo = new ConversationsRepository(context.client);
      const formatter = selectFormatter(parsed.response_format, conversationMdFmt, conversationJsonFmt);
      return executeSingleTool(() => repo.get(parsed.conversation_id), formatter);
    },
  },
  quiz: {
    schema: GetQuizInputSchema,
    execute: async (input, context) => {
      const parsed = GetQuizInputSchema.parse(input);
      const repo = new QuizzesRepository(context.client);
      const formatter = selectFormatter(parsed.response_format, quizMdFmt, quizJsonFmt);
      return executeSingleTool(() => repo.get(parsed.course_id, parsed.quiz_id), formatter);
    },
  },
  quiz_submission: {
    schema: GetQuizSubmissionInputSchema,
    execute: async (input, context) => {
      const parsed = GetQuizSubmissionInputSchema.parse(input);
      const repo = new QuizzesRepository(context.client);
      const formatter = selectFormatter(parsed.response_format, quizSubmissionMdFmt, quizSubmissionJsonFmt);
      return executeSingleTool(
        () => repo.getSubmission(parsed.course_id, parsed.quiz_id, parsed.submission_id),
        formatter
      );
    },
  },
  quiz_submission_questions: {
    schema: GetQuizSubmissionQuestionsInputSchema,
    execute: async (input, context) => {
      const parsed = GetQuizSubmissionQuestionsInputSchema.parse(input);
      const repo = new QuizzesRepository(context.client);
      const result = await repo.getSubmissionQuestions(
        parsed.quiz_submission_id,
        parsed.include_quiz_question
      );

      if (!result.ok) {
        return { content: [{ type: "text", text: formatError(result.error) }] };
      }

      const formatter = selectFormatter(
        parsed.response_format,
        quizSubmissionQuestionMdFmt,
        quizSubmissionQuestionJsonFmt
      );

      return {
        content: [{ type: "text", text: formatter.formatList(result.value, result.value.length) }],
        structuredContent: { items: result.value },
      };
    },
  },
  quiz_time_left: {
    schema: GetQuizTimeLeftInputSchema,
    execute: async (input, context) => {
      const parsed = GetQuizTimeLeftInputSchema.parse(input);
      const repo = new QuizzesRepository(context.client);
      const formatter = selectFormatter(parsed.response_format, quizTimeLeftMdFmt, quizTimeLeftJsonFmt);
      return executeSingleTool(
        () => repo.getTimeLeft(parsed.course_id, parsed.quiz_id, parsed.submission_id),
        formatter
      );
    },
  },
  course_grades: {
    schema: GetCourseGradesInputSchema,
    execute: async (input, context) => {
      const parsed = GetCourseGradesInputSchema.parse(input);
      const repo = new GradesRepository(context.client);
      const formatter = selectFormatter(parsed.response_format, gradesMdFmt, gradesJsonFmt);
      return executeSingleTool(() => repo.getCourseGrades(parsed.course_id), formatter);
    },
  },
  file: {
    schema: GetFileInputSchema,
    execute: async (input, context) => {
      const parsed = GetFileInputSchema.parse(input);
      const repo = buildDocumentsRepository(context.client);
      const formatter = selectFormatter(parsed.response_format, fileMdFmt, fileJsonFmt);
      return executeSingleTool(() => repo.getFileMetadata(parsed.file_id), formatter);
    },
  },
};

export async function dispatchCanvasGet(
  rawInput: unknown,
  context: ClientContext
): Promise<ListResult> {
  const parsedInput = CanvasGetInputSchema.safeParse(rawInput);
  if (!parsedInput.success) {
    return { content: [{ type: "text", text: zodErrorText(parsedInput.error) }] };
  }

  const kindResult = GetKindSchema.safeParse(parsedInput.data.kind);
  if (!kindResult.success) {
    return { content: [{ type: "text", text: zodErrorText(kindResult.error) }] };
  }

  const registration = getRegistry[kindResult.data];
  const typedInputResult = registration.schema.safeParse(parsedInput.data);
  if (!typedInputResult.success) {
    return { content: [{ type: "text", text: zodErrorText(typedInputResult.error) }] };
  }

  return registration.execute(typedInputResult.data, context);
}
