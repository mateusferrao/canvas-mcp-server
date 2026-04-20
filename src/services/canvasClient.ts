import axios, { type AxiosInstance } from "axios";
import { API_VERSION, CANVAS_DOMAIN_PATTERN, DEFAULT_CANVAS_DOMAIN } from "../constants.js";
import type { CanvasClientConfig, PaginatedResponse } from "../types.js";
import { mapApiError, err, ok, type Result } from "./errors.js";

/**
 * Minimal interface so tests can inject a fake client.
 */
export interface ICanvasClient {
  get<T>(path: string, params?: Record<string, unknown>): Promise<Result<T>>;
  getPaginated<T>(
    path: string,
    params?: Record<string, unknown>
  ): Promise<Result<PaginatedResponse<T>>>;
  post<T>(path: string, body: unknown): Promise<Result<T>>;
  put<T>(path: string, body: unknown): Promise<Result<T>>;
  delete<T>(path: string): Promise<Result<T>>;
}

function parseLinkHeader(header: string | undefined): string | undefined {
  if (!header) return undefined;
  const match = header.match(/<([^>]+)>;\s*rel="next"/);
  return match?.[1];
}

function buildBaseUrl(domain: string): string {
  return `https://${domain}/api/${API_VERSION}`;
}

/**
 * Factory — creates a configured Canvas HTTP client.
 * Pass a custom `axiosInstance` in tests to avoid real HTTP.
 */
export function createCanvasClient(
  config: CanvasClientConfig,
  axiosInstance?: AxiosInstance
): ICanvasClient {
  const domain = config.domain ?? DEFAULT_CANVAS_DOMAIN;

  if (!CANVAS_DOMAIN_PATTERN.test(domain)) {
    throw new Error(
      `Domínio Canvas inválido: "${domain}". Use o formato xxx.instructure.com.`
    );
  }

  const baseURL = buildBaseUrl(domain);
  const http =
    axiosInstance ??
    axios.create({
      baseURL,
      timeout: config.timeoutMs ?? 30_000,
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

  async function get<T>(
    path: string,
    params?: Record<string, unknown>
  ): Promise<Result<T>> {
    try {
      const response = await http.get<T>(path, { params });
      return ok(response.data);
    } catch (error) {
      return err(mapApiError(error));
    }
  }

  async function getPaginated<T>(
    path: string,
    params?: Record<string, unknown>
  ): Promise<Result<PaginatedResponse<T>>> {
    try {
      const response = await http.get<T[]>(path, { params });
      const nextPageUrl = parseLinkHeader(
        response.headers["link"] as string | undefined
      );
      return ok({
        items: response.data,
        hasMore: !!nextPageUrl,
        nextPageUrl,
      });
    } catch (error) {
      return err(mapApiError(error));
    }
  }

  async function post<T>(path: string, body: unknown): Promise<Result<T>> {
    try {
      const response = await http.post<T>(path, body);
      return ok(response.data);
    } catch (error) {
      return err(mapApiError(error));
    }
  }

  async function put<T>(path: string, body: unknown): Promise<Result<T>> {
    try {
      const response = await http.put<T>(path, body);
      return ok(response.data);
    } catch (error) {
      return err(mapApiError(error));
    }
  }

  async function deleteReq<T>(path: string): Promise<Result<T>> {
    try {
      const response = await http.delete<T>(path);
      return ok(response.data);
    } catch (error) {
      return err(mapApiError(error));
    }
  }

  return { get, getPaginated, post, put, delete: deleteReq };
}

/**
 * Reads env vars and creates the default production client.
 */
export function createClientFromEnv(): ICanvasClient {
  const token = process.env.CANVAS_API_TOKEN;
  if (!token) {
    throw new Error(
      "CANVAS_API_TOKEN não configurado — defina a variável de ambiente."
    );
  }
  const domain = process.env.CANVAS_DOMAIN ?? DEFAULT_CANVAS_DOMAIN;
  return createCanvasClient({ token, domain });
}

/**
 * Creates a Canvas client from an explicit token + domain.
 * Used by the HTTP transport to build per-session clients.
 */
export function createClientFromToken(
  token: string,
  domain?: string
): ICanvasClient {
  return createCanvasClient({ token, domain: domain ?? DEFAULT_CANVAS_DOMAIN });
}
