import type { ICanvasClient } from "../services/canvasClient.js";
import type { CanvasConversation, PaginatedResponse } from "../types.js";
import type { Result } from "../services/errors.js";

export interface ListConversationsParams {
  scope?: "unread" | "starred" | "archived" | "sent";
  per_page?: number;
  page?: number;
  filter?: string[];
}

export interface CreateConversationParams {
  recipients: string[];
  body: string;
  subject?: string;
  groupConversation?: boolean;
  contextCode?: string;
}

export interface AddMessageParams {
  body: string;
  recipients?: string[];
  includedMessages?: number[];
}

export class ConversationsRepository {
  constructor(private readonly client: ICanvasClient) {}

  async list(
    params: ListConversationsParams = {}
  ): Promise<Result<PaginatedResponse<CanvasConversation>>> {
    const { scope, per_page = 25, page = 1, filter } = params;
    const queryParams: Record<string, unknown> = { per_page, page };
    if (scope) queryParams["scope"] = scope;
    if (filter?.length) queryParams["filter[]"] = filter;
    return this.client.getPaginated<CanvasConversation>(
      "/conversations",
      queryParams
    );
  }

  async get(id: number): Promise<Result<CanvasConversation>> {
    return this.client.get<CanvasConversation>(`/conversations/${id}`);
  }

  async create(
    params: CreateConversationParams
  ): Promise<Result<CanvasConversation[]>> {
    const body: Record<string, unknown> = {
      "recipients[]": params.recipients,
      body: params.body,
    };
    if (params.subject) body["subject"] = params.subject;
    if (params.groupConversation) body["group_conversation"] = true;
    if (params.contextCode) body["context_code"] = params.contextCode;
    return this.client.post<CanvasConversation[]>("/conversations", body);
  }

  async addMessage(
    id: number,
    params: AddMessageParams
  ): Promise<Result<CanvasConversation>> {
    const body: Record<string, unknown> = { body: params.body };
    if (params.recipients?.length) body["recipients[]"] = params.recipients;
    if (params.includedMessages?.length)
      body["included_messages[]"] = params.includedMessages;
    return this.client.post<CanvasConversation>(
      `/conversations/${id}/add_message`,
      body
    );
  }
}
