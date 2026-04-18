import type { ICanvasClient } from "../services/canvasClient.js";
import type { CanvasPage, PaginatedResponse } from "../types.js";
import type { Result } from "../services/errors.js";

export interface ListPagesParams {
  per_page?: number;
  page?: number;
  search_term?: string;
}

export class PagesRepository {
  constructor(private readonly client: ICanvasClient) {}

  async list(
    courseId: number,
    params: ListPagesParams = {}
  ): Promise<Result<PaginatedResponse<CanvasPage>>> {
    const { per_page = 25, page = 1, search_term } = params;
    const queryParams: Record<string, unknown> = { per_page, page };
    if (search_term) queryParams["search_term"] = search_term;
    return this.client.getPaginated<CanvasPage>(
      `/courses/${courseId}/pages`,
      queryParams
    );
  }

  async get(courseId: number, urlOrId: string): Promise<Result<CanvasPage>> {
    return this.client.get<CanvasPage>(`/courses/${courseId}/pages/${urlOrId}`);
  }
}
