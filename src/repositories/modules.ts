import type { ICanvasClient } from "../services/canvasClient.js";
import type { CanvasModule, CanvasModuleItem, PaginatedResponse } from "../types.js";
import type { Result } from "../services/errors.js";

export interface ListModulesParams {
  includeItems?: boolean;
  per_page?: number;
  page?: number;
}

export interface ListModuleItemsParams {
  per_page?: number;
  page?: number;
}

export class ModulesRepository {
  constructor(private readonly client: ICanvasClient) {}

  async list(
    courseId: number,
    params: ListModulesParams = {}
  ): Promise<Result<PaginatedResponse<CanvasModule>>> {
    const { includeItems, per_page = 25, page = 1 } = params;
    const queryParams: Record<string, unknown> = { per_page, page };
    if (includeItems) {
      queryParams["include[]"] = "items";
    }
    return this.client.getPaginated<CanvasModule>(
      `/courses/${courseId}/modules`,
      queryParams
    );
  }

  async listItems(
    courseId: number,
    moduleId: number,
    params: ListModuleItemsParams = {}
  ): Promise<Result<PaginatedResponse<CanvasModuleItem>>> {
    const { per_page = 25, page = 1 } = params;
    return this.client.getPaginated<CanvasModuleItem>(
      `/courses/${courseId}/modules/${moduleId}/items`,
      { per_page, page }
    );
  }

  async markItemDone(
    courseId: number,
    moduleId: number,
    itemId: number
  ): Promise<Result<Record<string, never>>> {
    return this.client.put<Record<string, never>>(
      `/courses/${courseId}/modules/${moduleId}/items/${itemId}/done`,
      {}
    );
  }
}
