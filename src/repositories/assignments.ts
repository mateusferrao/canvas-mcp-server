import type { ICanvasClient } from "../services/canvasClient.js";
import type { Result } from "../services/errors.js";
import type { CanvasAssignment, PaginatedResponse } from "../types.js";

export type AssignmentBucket =
  | "past"
  | "overdue"
  | "undated"
  | "ungraded"
  | "unsubmitted"
  | "upcoming"
  | "future";

export interface ListAssignmentsParams {
  courseId: number;
  bucket?: AssignmentBucket;
  per_page?: number;
  page?: number;
  search_term?: string;
  order_by?: "position" | "name" | "due_at";
}

export class AssignmentsRepository {
  constructor(private readonly client: ICanvasClient) {}

  async list(
    params: ListAssignmentsParams
  ): Promise<Result<PaginatedResponse<CanvasAssignment>>> {
    const queryParams: Record<string, unknown> = {
      include: ["submission"],
      per_page: params.per_page ?? 25,
      page: params.page ?? 1,
      order_by: params.order_by ?? "due_at",
    };
    if (params.bucket) queryParams.bucket = params.bucket;
    if (params.search_term) queryParams.search_term = params.search_term;

    return this.client.getPaginated<CanvasAssignment>(
      `/courses/${params.courseId}/assignments`,
      queryParams
    );
  }

  async get(courseId: number, assignmentId: number): Promise<Result<CanvasAssignment>> {
    return this.client.get<CanvasAssignment>(
      `/courses/${courseId}/assignments/${assignmentId}`,
      { include: ["submission"] }
    );
  }
}
