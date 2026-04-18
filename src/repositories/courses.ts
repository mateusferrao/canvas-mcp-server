import type { ICanvasClient } from "../services/canvasClient.js";
import type { Result } from "../services/errors.js";
import type { CanvasCourse, PaginatedResponse } from "../types.js";

export interface ListCoursesParams {
  enrollment_state?: "active" | "invited_or_pending" | "completed";
  enrollment_type?: "student" | "teacher" | "ta" | "observer" | "designer";
  per_page?: number;
  page?: number;
}

export class CoursesRepository {
  constructor(private readonly client: ICanvasClient) {}

  async list(
    params: ListCoursesParams = {}
  ): Promise<Result<PaginatedResponse<CanvasCourse>>> {
    return this.client.getPaginated<CanvasCourse>("/courses", {
      enrollment_state: params.enrollment_state ?? "active",
      enrollment_type: params.enrollment_type ?? "student",
      include: ["enrollments", "term"],
      per_page: params.per_page ?? 25,
      page: params.page ?? 1,
    });
  }

  async get(courseId: number): Promise<Result<CanvasCourse>> {
    return this.client.get<CanvasCourse>(`/courses/${courseId}`, {
      include: ["enrollments", "term"],
    });
  }
}
