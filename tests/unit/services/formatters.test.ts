import { describe, it, expect } from "vitest";
import {
  CourseMarkdownFormatter,
  CourseJsonFormatter,
  AssignmentMarkdownFormatter,
  SubmissionMarkdownFormatter,
  UserMarkdownFormatter,
  formatDate,
  ResponseFormat,
  selectFormatter,
} from "../../../src/services/formatters.js";
import type { CanvasCourse, CanvasAssignment, CanvasSubmission, CanvasUser } from "../../../src/types.js";

const mockCourse: CanvasCourse = {
  id: 101,
  name: "Engenharia de Software",
  course_code: "ES-2024",
  workflow_state: "available",
  start_at: "2024-02-01T00:00:00Z",
  enrollments: [{ type: "student", enrollment_state: "active", computed_current_grade: "A", computed_current_score: 90 }],
};

const mockAssignment: CanvasAssignment = {
  id: 201,
  name: "Trabalho 1",
  due_at: "2024-06-15T23:59:00Z",
  points_possible: 10,
  submission_types: ["online_text_entry"],
  workflow_state: "published",
  course_id: 101,
  html_url: "https://pucminas.instructure.com/courses/101/assignments/201",
};

const mockSubmission: CanvasSubmission = {
  id: 301,
  assignment_id: 201,
  user_id: 999,
  submitted_at: "2024-06-14T20:30:00Z",
  score: 9.5,
  grade: "9,50",
  workflow_state: "graded",
  submission_type: "online_text_entry",
  late: false,
  missing: false,
};

const mockUser: CanvasUser = {
  id: 999,
  name: "João da Silva",
  short_name: "João",
  login_id: "joao@pucminas.br",
  email: "joao@pucminas.br",
};

describe("formatDate", () => {
  it("retorna 'sem data' quando undefined", () => {
    expect(formatDate(undefined)).toBe("sem data");
  });

  it("formata data ISO em formato legível pt-BR", () => {
    const result = formatDate("2024-06-15T23:59:00Z");
    expect(result).toMatch(/15\/06\/2024/);
  });
});

describe("CourseMarkdownFormatter", () => {
  const fmt = new CourseMarkdownFormatter();

  it("inclui nome e ID do curso", () => {
    const result = fmt.format(mockCourse);
    expect(result).toContain("Engenharia de Software");
    expect(result).toContain("101");
  });

  it("inclui nota atual do aluno", () => {
    const result = fmt.format(mockCourse);
    expect(result).toContain("A");
    expect(result).toContain("90%");
  });

  it("formatList retorna cabeçalho com total", () => {
    const result = fmt.formatList([mockCourse], 5);
    expect(result).toContain("# Cursos (5)");
  });

  it("formatList retorna mensagem quando lista vazia", () => {
    expect(fmt.formatList([])).toBe("Nenhum curso encontrado.");
  });
});

describe("CourseJsonFormatter", () => {
  const fmt = new CourseJsonFormatter();

  it("retorna JSON válido", () => {
    const result = fmt.format(mockCourse);
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it("formatList retorna objeto com campo items", () => {
    const result = JSON.parse(fmt.formatList([mockCourse]));
    expect(result).toHaveProperty("items");
    expect(result.items).toHaveLength(1);
  });
});

describe("AssignmentMarkdownFormatter", () => {
  const fmt = new AssignmentMarkdownFormatter();

  it("inclui nome e prazo", () => {
    const result = fmt.format(mockAssignment);
    expect(result).toContain("Trabalho 1");
    expect(result).toContain("15/06/2024");
  });

  it("inclui link da tarefa", () => {
    const result = fmt.format(mockAssignment);
    expect(result).toContain("pucminas.instructure.com");
  });
});

describe("SubmissionMarkdownFormatter", () => {
  const fmt = new SubmissionMarkdownFormatter();

  it("inclui estado e nota", () => {
    const result = fmt.format(mockSubmission);
    expect(result).toContain("graded");
    expect(result).toContain("9,50");
  });

  it("indica se entrega está atrasada", () => {
    const result = fmt.format({ ...mockSubmission, late: true });
    expect(result).toContain("Sim");
  });
});

describe("UserMarkdownFormatter", () => {
  const fmt = new UserMarkdownFormatter();

  it("inclui nome e email", () => {
    const result = fmt.format(mockUser);
    expect(result).toContain("João da Silva");
    expect(result).toContain("joao@pucminas.br");
  });
});

describe("selectFormatter", () => {
  it("retorna JSON formatter quando format=JSON", () => {
    const md = new CourseMarkdownFormatter();
    const json = new CourseJsonFormatter();
    const selected = selectFormatter(ResponseFormat.JSON, md, json);
    expect(selected).toBe(json);
  });

  it("retorna Markdown formatter quando format=MARKDOWN", () => {
    const md = new CourseMarkdownFormatter();
    const json = new CourseJsonFormatter();
    const selected = selectFormatter(ResponseFormat.MARKDOWN, md, json);
    expect(selected).toBe(md);
  });
});
