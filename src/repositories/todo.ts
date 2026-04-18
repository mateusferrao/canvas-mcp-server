import type { ICanvasClient } from "../services/canvasClient.js";
import type { Result } from "../services/errors.js";
import type {
  CanvasAssignment,
  CanvasTodoItem,
  PaginatedResponse,
} from "../types.js";

export class TodoRepository {
  constructor(private readonly client: ICanvasClient) {}

  async listTodo(
    per_page = 25
  ): Promise<Result<PaginatedResponse<CanvasTodoItem>>> {
    return this.client.getPaginated<CanvasTodoItem>("/users/self/todo", {
      per_page,
    });
  }

  async listUpcoming(
    per_page = 25
  ): Promise<Result<PaginatedResponse<CanvasAssignment>>> {
    return this.client.getPaginated<CanvasAssignment>(
      "/users/self/upcoming_events",
      { per_page }
    );
  }

  async listMissing(params: {
    per_page?: number;
    course_ids?: number[];
  } = {}): Promise<Result<PaginatedResponse<CanvasAssignment>>> {
    const queryParams: Record<string, unknown> = {
      per_page: params.per_page ?? 25,
    };
    if (params.course_ids?.length) {
      queryParams["course_ids[]"] = params.course_ids;
    }
    return this.client.getPaginated<CanvasAssignment>(
      "/users/self/missing_submissions",
      queryParams
    );
  }
}
