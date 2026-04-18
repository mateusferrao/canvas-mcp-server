import { describe, it, expect } from "vitest";
import axios from "axios";
import { mapApiError, formatError, ok, err } from "../../../src/services/errors.js";

function makeAxiosError(status: number) {
  const error = new axios.AxiosError("request failed", undefined, undefined, undefined, {
    status,
    data: {},
    headers: {},
    config: {} as never,
    statusText: "error",
  });
  return error;
}

describe("mapApiError", () => {
  it("mapeia 401 para UNAUTHORIZED", () => {
    const result = mapApiError(makeAxiosError(401));
    expect(result.code).toBe("UNAUTHORIZED");
    expect(result.status).toBe(401);
    expect(result.message).toMatch(/CANVAS_API_TOKEN/);
  });

  it("mapeia 403 para FORBIDDEN", () => {
    const result = mapApiError(makeAxiosError(403));
    expect(result.code).toBe("FORBIDDEN");
    expect(result.status).toBe(403);
  });

  it("mapeia 404 para NOT_FOUND", () => {
    const result = mapApiError(makeAxiosError(404));
    expect(result.code).toBe("NOT_FOUND");
    expect(result.status).toBe(404);
  });

  it("mapeia 429 para RATE_LIMITED", () => {
    const result = mapApiError(makeAxiosError(429));
    expect(result.code).toBe("RATE_LIMITED");
    expect(result.message).toMatch(/aguarde/i);
  });

  it("mapeia 500 para SERVER_ERROR", () => {
    const result = mapApiError(makeAxiosError(500));
    expect(result.code).toBe("SERVER_ERROR");
    expect(result.message).toMatch(/500/);
  });

  it("mapeia erro de timeout (ECONNABORTED) para TIMEOUT", () => {
    const error = new axios.AxiosError("timeout");
    error.code = "ECONNABORTED";
    const result = mapApiError(error);
    expect(result.code).toBe("TIMEOUT");
  });

  it("mapeia erro desconhecido para UNKNOWN", () => {
    const result = mapApiError(new Error("algo deu errado"));
    expect(result.code).toBe("UNKNOWN");
    expect(result.message).toMatch(/algo deu errado/);
  });
});

describe("ok / err helpers", () => {
  it("ok cria Result com ok=true e value", () => {
    const r = ok(42);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(42);
  });

  it("err cria Result com ok=false e error", () => {
    const r = err({ code: "X", message: "falhou" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("X");
  });
});

describe("formatError", () => {
  it("formata mensagem legível", () => {
    const msg = formatError({ code: "NOT_FOUND", message: "não encontrado" });
    expect(msg).toBe("Erro [NOT_FOUND]: não encontrado");
  });
});
