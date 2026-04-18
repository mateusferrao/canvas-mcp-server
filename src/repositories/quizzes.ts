import type { ICanvasClient } from "../services/canvasClient.js";
import type { CanvasQuiz, PaginatedResponse } from "../types.js";
import type { Result } from "../services/errors.js";

export interface ListQuizzesParams {
  per_page?: number;
  page?: number;
  search_term?: string;
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
}
