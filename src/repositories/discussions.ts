import type { ICanvasClient } from "../services/canvasClient.js";
import type {
  CanvasDiscussionTopic,
  CanvasDiscussionEntry,
  PaginatedResponse,
} from "../types.js";
import type { Result } from "../services/errors.js";

export interface ListDiscussionsParams {
  per_page?: number;
  page?: number;
  search_term?: string;
  only_announcements?: boolean;
}

export interface ListEntriesParams {
  per_page?: number;
  page?: number;
}

export interface PostEntryParams {
  message: string;
  parentEntryId?: number;
}

export class DiscussionsRepository {
  constructor(private readonly client: ICanvasClient) {}

  async list(
    courseId: number,
    params: ListDiscussionsParams = {}
  ): Promise<Result<PaginatedResponse<CanvasDiscussionTopic>>> {
    const { per_page = 25, page = 1, search_term, only_announcements } = params;
    const queryParams: Record<string, unknown> = { per_page, page };
    if (search_term) queryParams["search_term"] = search_term;
    if (only_announcements) queryParams["only_announcements"] = true;
    return this.client.getPaginated<CanvasDiscussionTopic>(
      `/courses/${courseId}/discussion_topics`,
      queryParams
    );
  }

  async get(
    courseId: number,
    topicId: number
  ): Promise<Result<CanvasDiscussionTopic>> {
    return this.client.get<CanvasDiscussionTopic>(
      `/courses/${courseId}/discussion_topics/${topicId}`
    );
  }

  async listEntries(
    courseId: number,
    topicId: number,
    params: ListEntriesParams = {}
  ): Promise<Result<PaginatedResponse<CanvasDiscussionEntry>>> {
    const { per_page = 25, page = 1 } = params;
    return this.client.getPaginated<CanvasDiscussionEntry>(
      `/courses/${courseId}/discussion_topics/${topicId}/entries`,
      { per_page, page }
    );
  }

  async postEntry(
    courseId: number,
    topicId: number,
    params: PostEntryParams
  ): Promise<Result<CanvasDiscussionEntry>> {
    const { message, parentEntryId } = params;
    if (parentEntryId != null) {
      return this.client.post<CanvasDiscussionEntry>(
        `/courses/${courseId}/discussion_topics/${topicId}/entries/${parentEntryId}/replies`,
        { message }
      );
    }
    return this.client.post<CanvasDiscussionEntry>(
      `/courses/${courseId}/discussion_topics/${topicId}/entries`,
      { message }
    );
  }
}
