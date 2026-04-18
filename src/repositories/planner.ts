import type { ICanvasClient } from "../services/canvasClient.js";
import type { CanvasPlannerNote, PaginatedResponse } from "../types.js";
import type { Result } from "../services/errors.js";

export interface ListPlannerNotesParams {
  start_date?: string;
  end_date?: string;
  context_codes?: string[];
  per_page?: number;
  page?: number;
}

export interface CreatePlannerNoteParams {
  title: string;
  todo_date: string;
  details?: string;
  course_id?: number;
  linked_object_type?: string;
  linked_object_id?: number;
}

export type UpdatePlannerNoteParams = Partial<CreatePlannerNoteParams>;

export class PlannerRepository {
  constructor(private readonly client: ICanvasClient) {}

  async list(
    params: ListPlannerNotesParams = {}
  ): Promise<Result<PaginatedResponse<CanvasPlannerNote>>> {
    const { start_date, end_date, context_codes, per_page = 25, page = 1 } = params;
    const queryParams: Record<string, unknown> = { per_page, page };
    if (start_date) queryParams["start_date"] = start_date;
    if (end_date) queryParams["end_date"] = end_date;
    if (context_codes?.length) queryParams["context_codes[]"] = context_codes;
    return this.client.getPaginated<CanvasPlannerNote>("/planner_notes", queryParams);
  }

  async get(id: number): Promise<Result<CanvasPlannerNote>> {
    return this.client.get<CanvasPlannerNote>(`/planner_notes/${id}`);
  }

  async create(
    params: CreatePlannerNoteParams
  ): Promise<Result<CanvasPlannerNote>> {
    const body: Record<string, unknown> = {
      title: params.title,
      todo_date: params.todo_date,
    };
    if (params.details) body["details"] = params.details;
    if (params.course_id) body["course_id"] = params.course_id;
    if (params.linked_object_type)
      body["linked_object_type"] = params.linked_object_type;
    if (params.linked_object_id)
      body["linked_object_id"] = params.linked_object_id;
    return this.client.post<CanvasPlannerNote>("/planner_notes", body);
  }

  async update(
    id: number,
    params: UpdatePlannerNoteParams
  ): Promise<Result<CanvasPlannerNote>> {
    const body: Record<string, unknown> = {};
    if (params.title !== undefined) body["title"] = params.title;
    if (params.todo_date !== undefined) body["todo_date"] = params.todo_date;
    if (params.details !== undefined) body["details"] = params.details;
    if (params.course_id !== undefined) body["course_id"] = params.course_id;
    return this.client.put<CanvasPlannerNote>(`/planner_notes/${id}`, body);
  }

  async delete(id: number): Promise<Result<CanvasPlannerNote>> {
    return this.client.delete<CanvasPlannerNote>(`/planner_notes/${id}`);
  }
}
