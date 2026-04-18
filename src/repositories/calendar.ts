import type { ICanvasClient } from "../services/canvasClient.js";
import type { Result } from "../services/errors.js";
import type { CanvasCalendarEvent, PaginatedResponse } from "../types.js";

export interface ListCalendarEventsParams {
  contextCodes: string[];
  type?: "event" | "assignment";
  startDate?: string;
  endDate?: string;
  per_page?: number;
  page?: number;
}

export class CalendarRepository {
  constructor(private readonly client: ICanvasClient) {}

  async listEvents(
    params: ListCalendarEventsParams
  ): Promise<Result<PaginatedResponse<CanvasCalendarEvent>>> {
    const queryParams: Record<string, unknown> = {
      "context_codes[]": params.contextCodes,
      type: params.type ?? "assignment",
      per_page: params.per_page ?? 25,
      page: params.page ?? 1,
    };
    if (params.startDate) queryParams.start_date = params.startDate;
    if (params.endDate) queryParams.end_date = params.endDate;

    return this.client.getPaginated<CanvasCalendarEvent>(
      "/calendar_events",
      queryParams
    );
  }
}
