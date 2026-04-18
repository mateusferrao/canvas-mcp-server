import axios from "axios";

export type Result<T, E = CanvasError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function err<T>(error: CanvasError): Result<T> {
  return { ok: false, error };
}

export interface CanvasError {
  code: string;
  message: string;
  status?: number;
}

export function mapApiError(error: unknown): CanvasError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;

    switch (status) {
      case 401:
        return {
          code: "UNAUTHORIZED",
          message:
            "Token inválido ou expirado — verifique CANVAS_API_TOKEN.",
          status,
        };
      case 403:
        return {
          code: "FORBIDDEN",
          message:
            "Sem permissão para acessar este recurso no Canvas.",
          status,
        };
      case 404:
        return {
          code: "NOT_FOUND",
          message:
            "Recurso não encontrado — verifique o ID informado.",
          status,
        };
      case 422:
        return {
          code: "UNPROCESSABLE",
          message:
            "Dados inválidos na requisição — verifique os parâmetros.",
          status,
        };
      case 429:
        return {
          code: "RATE_LIMITED",
          message:
            "Limite de requisições atingido — aguarde alguns segundos.",
          status,
        };
      default:
        if (status && status >= 500) {
          return {
            code: "SERVER_ERROR",
            message: `Erro interno do Canvas (${status}) — tente novamente.`,
            status,
          };
        }
    }

    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      return {
        code: "TIMEOUT",
        message: "Tempo limite atingido — tente novamente.",
      };
    }

    return {
      code: "NETWORK_ERROR",
      message: `Erro de rede: ${error.message}`,
    };
  }

  return {
    code: "UNKNOWN",
    message: `Erro inesperado: ${error instanceof Error ? error.message : String(error)}`,
  };
}

export function formatError(error: CanvasError): string {
  return `Erro [${error.code}]: ${error.message}`;
}
