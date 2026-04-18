import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  PaginationSchema,
  ResponseFormatSchema,
  ResponseFormat,
  CourseIdSchema,
} from "../../../src/schemas/common.js";

describe("PaginationSchema", () => {
  it("aceita valores válidos", () => {
    const result = PaginationSchema.parse({ per_page: 10, page: 2 });
    expect(result.per_page).toBe(10);
    expect(result.page).toBe(2);
  });

  it("usa defaults quando campos omitidos", () => {
    const result = PaginationSchema.parse({});
    expect(result.per_page).toBe(25);
    expect(result.page).toBe(1);
  });

  it("rejeita per_page > 100", () => {
    expect(() => PaginationSchema.parse({ per_page: 101 })).toThrow(z.ZodError);
  });

  it("rejeita page < 1", () => {
    expect(() => PaginationSchema.parse({ page: 0 })).toThrow(z.ZodError);
  });
});

describe("ResponseFormatSchema", () => {
  it("default é MARKDOWN", () => {
    const result = ResponseFormatSchema.parse(undefined);
    expect(result).toBe(ResponseFormat.MARKDOWN);
  });

  it("aceita JSON", () => {
    expect(ResponseFormatSchema.parse("json")).toBe(ResponseFormat.JSON);
  });

  it("rejeita valor inválido", () => {
    expect(() => ResponseFormatSchema.parse("csv")).toThrow(z.ZodError);
  });
});

describe("CourseIdSchema", () => {
  it("aceita ID positivo", () => {
    expect(CourseIdSchema.parse(101)).toBe(101);
  });

  it("rejeita zero", () => {
    expect(() => CourseIdSchema.parse(0)).toThrow(z.ZodError);
  });

  it("rejeita ID negativo", () => {
    expect(() => CourseIdSchema.parse(-1)).toThrow(z.ZodError);
  });
});
