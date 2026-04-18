import { CHARACTER_LIMIT } from "../constants.js";
import type { PaginatedResponse } from "../types.js";
import type { Formatter } from "../services/formatters.js";
import { formatError } from "../services/errors.js";
import type { Result } from "../services/errors.js";

export interface ListResult {
  [key: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: Record<string, unknown>;
}

/**
 * Template Method — shared flow for all list tools:
 * fetch → error-check → format → truncate → return.
 */
export async function executeListTool<T>(
  fetchFn: () => Promise<Result<PaginatedResponse<T>>>,
  formatter: Formatter<T>,
  format: string
): Promise<ListResult> {
  const result = await fetchFn();

  if (!result.ok) {
    return {
      content: [{ type: "text", text: formatError(result.error) }],
    };
  }

  const { items, hasMore, nextPageUrl } = result.value;
  let text = formatter.formatList(items, items.length);

  if (hasMore) {
    text += `\n\n> Há mais resultados. nextPageUrl: ${nextPageUrl}`;
  }

  if (text.length > CHARACTER_LIMIT) {
    text =
      text.slice(0, CHARACTER_LIMIT) +
      "\n\n[TRUNCADO — use filtros ou paginação para ver mais]";
  }

  const structured = {
    count: items.length,
    hasMore,
    nextPageUrl,
    format,
    items,
  };

  return {
    content: [{ type: "text", text }],
    structuredContent: structured,
  };
}

export async function executeSingleTool<T>(
  fetchFn: () => Promise<Result<T>>,
  formatter: Formatter<T>
): Promise<ListResult> {
  const result = await fetchFn();

  if (!result.ok) {
    return {
      content: [{ type: "text", text: formatError(result.error) }],
    };
  }

  const text = formatter.format(result.value);

  return {
    content: [{ type: "text", text }],
    structuredContent: result.value as unknown as Record<string, unknown>,
  };
}
