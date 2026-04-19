import type { ICanvasClient } from "../services/canvasClient.js";
import type {
  CanvasQuiz,
  CanvasQuizQuestion,
  CanvasQuizSubmission,
  CanvasQuizSubmissionQuestion,
  CanvasQuizSubmissionEnvelope,
  CanvasQuizSubmissionQuestionsEnvelope,
  CanvasQuizTimeLeft,
  PaginatedResponse,
} from "../types.js";
import type { Result } from "../services/errors.js";
import { ok } from "../services/errors.js";

export interface ListQuizzesParams {
  per_page?: number;
  page?: number;
  search_term?: string;
}

export interface ListQuestionsParams {
  quiz_submission_id?: number;
  quiz_submission_attempt?: number;
  per_page?: number;
  page?: number;
}

export interface AnswerQuestionParams {
  attempt: number;
  validationToken: string;
  questionId: number;
  answer: unknown;
}

export interface CompleteAttemptParams {
  attempt: number;
  validationToken: string;
  accessCode?: string;
}

export class QuizzesRepository {
  constructor(private readonly client: ICanvasClient) {}

  async list(
    courseId: number,
    params: ListQuizzesParams = {}
  ): Promise<Result<PaginatedResponse<CanvasQuiz>>> {
    const { per_page = 25, page = 1, search_term } = params;
    const queryParams: Record<string, unknown> = { per_page, page };
    if (search_term) queryParams["search_term"] = search_term;
    return this.client.getPaginated<CanvasQuiz>(
      `/courses/${courseId}/quizzes`,
      queryParams
    );
  }

  async get(courseId: number, quizId: number): Promise<Result<CanvasQuiz>> {
    return this.client.get<CanvasQuiz>(`/courses/${courseId}/quizzes/${quizId}`);
  }

  // ── Phase 3: Quiz-taking flow ─────────────────────────────────────────────

  async listQuestions(
    courseId: number,
    quizId: number,
    params: ListQuestionsParams = {}
  ): Promise<Result<PaginatedResponse<CanvasQuizQuestion>>> {
    const { quiz_submission_id, quiz_submission_attempt, per_page = 25, page = 1 } = params;
    const queryParams: Record<string, unknown> = { per_page, page };
    if (quiz_submission_id != null) queryParams["quiz_submission_id"] = quiz_submission_id;
    if (quiz_submission_attempt != null)
      queryParams["quiz_submission_attempt"] = quiz_submission_attempt;
    return this.client.getPaginated<CanvasQuizQuestion>(
      `/courses/${courseId}/quizzes/${quizId}/questions`,
      queryParams
    );
  }

  async startAttempt(
    courseId: number,
    quizId: number,
    accessCode?: string
  ): Promise<Result<CanvasQuizSubmission>> {
    const body: Record<string, unknown> = {};
    if (accessCode) body["access_code"] = accessCode;

    const result = await this.client.post<CanvasQuizSubmissionEnvelope>(
      `/courses/${courseId}/quizzes/${quizId}/submissions`,
      body
    );

    if (!result.ok) {
      // 409 = attempt already exists — recover the existing submission
      if (result.error.code === "CONFLICT") {
        const recovery = await this.client.get<CanvasQuizSubmissionEnvelope>(
          `/courses/${courseId}/quizzes/${quizId}/submission`
        );
        if (!recovery.ok) return recovery;
        const sub = recovery.value.quiz_submissions[0];
        if (!sub) return { ok: false, error: { code: "NOT_FOUND", message: "Tentativa existente não encontrada." } };
        return ok(sub);
      }
      return result;
    }

    const sub = result.value.quiz_submissions[0];
    if (!sub) return { ok: false, error: { code: "NOT_FOUND", message: "Tentativa não retornada pela API." } };
    return ok(sub);
  }

  async getSubmissionQuestions(
    submissionId: number,
    includeQuizQuestion = false
  ): Promise<Result<CanvasQuizSubmissionQuestion[]>> {
    const params: Record<string, unknown> = {};
    if (includeQuizQuestion) params["include[]"] = "quiz_question";

    const result = await this.client.get<CanvasQuizSubmissionQuestionsEnvelope>(
      `/quiz_submissions/${submissionId}/questions`,
      params
    );
    if (!result.ok) return result;
    return ok(result.value.quiz_submission_questions);
  }

  async answerQuestion(
    submissionId: number,
    params: AnswerQuestionParams
  ): Promise<Result<CanvasQuizSubmissionQuestion[]>> {
    const body = {
      attempt: params.attempt,
      validation_token: params.validationToken,
      quiz_questions: [{ id: params.questionId, answer: params.answer }],
    };

    const result = await this.client.post<CanvasQuizSubmissionQuestionsEnvelope>(
      `/quiz_submissions/${submissionId}/questions`,
      body
    );
    if (!result.ok) return result;
    return ok(result.value.quiz_submission_questions);
  }

  async completeAttempt(
    courseId: number,
    quizId: number,
    submissionId: number,
    params: CompleteAttemptParams
  ): Promise<Result<CanvasQuizSubmission>> {
    const body: Record<string, unknown> = {
      attempt: params.attempt,
      validation_token: params.validationToken,
    };
    if (params.accessCode) body["access_code"] = params.accessCode;

    const result = await this.client.post<CanvasQuizSubmissionEnvelope>(
      `/courses/${courseId}/quizzes/${quizId}/submissions/${submissionId}/complete`,
      body
    );
    if (!result.ok) return result;
    const sub = result.value.quiz_submissions[0];
    if (!sub) return { ok: false, error: { code: "NOT_FOUND", message: "Submissão não retornada após completar." } };
    return ok(sub);
  }

  async listSubmissions(
    courseId: number,
    quizId: number
  ): Promise<Result<CanvasQuizSubmission[]>> {
    const result = await this.client.get<CanvasQuizSubmissionEnvelope>(
      `/courses/${courseId}/quizzes/${quizId}/submissions`,
      { "include[]": "submission" }
    );
    if (!result.ok) return result;
    return ok(result.value.quiz_submissions);
  }

  async getSubmission(
    courseId: number,
    quizId: number,
    submissionId: number
  ): Promise<Result<CanvasQuizSubmission>> {
    const result = await this.client.get<CanvasQuizSubmissionEnvelope>(
      `/courses/${courseId}/quizzes/${quizId}/submissions/${submissionId}`
    );
    if (!result.ok) return result;
    const sub = result.value.quiz_submissions[0];
    if (!sub) return { ok: false, error: { code: "NOT_FOUND", message: "Submissão não encontrada." } };
    return ok(sub);
  }

  async getTimeLeft(
    courseId: number,
    quizId: number,
    submissionId: number
  ): Promise<Result<CanvasQuizTimeLeft>> {
    return this.client.get<CanvasQuizTimeLeft>(
      `/courses/${courseId}/quizzes/${quizId}/submissions/${submissionId}/time`
    );
  }
}
