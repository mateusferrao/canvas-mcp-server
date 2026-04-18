import type { ICanvasClient } from "../services/canvasClient.js";
import type { Result } from "../services/errors.js";
import type { CanvasAnnouncement, PaginatedResponse } from "../types.js";

export interface ListAnnouncementsParams {
  contextCodes: string[];
  startDate?: string;
  endDate?: string;
  activeOnly?: boolean;
  per_page?: number;
  page?: number;
}

export class AnnouncementsRepository {
  constructor(private readonly client: ICanvasClient) {}

  async list(
    params: ListAnnouncementsParams
  ): Promise<Result<PaginatedResponse<CanvasAnnouncement>>> {
    const queryParams: Record<string, unknown> = {
      "context_codes[]": params.contextCodes,
      active_only: params.activeOnly ?? true,
      per_page: params.per_page ?? 25,
      page: params.page ?? 1,
    };
    if (params.startDate) queryParams.start_date = params.startDate;
    if (params.endDate) queryParams.end_date = params.endDate;

    return this.client.getPaginated<CanvasAnnouncement>(
      "/announcements",
      queryParams
    );
  }
}
