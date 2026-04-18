import type {
  CanvasAnnouncement,
  CanvasAssignment,
  CanvasCalendarEvent,
  CanvasCourse,
  CanvasSubmission,
  CanvasTodoItem,
  CanvasUser,
} from "../types.js";

export enum ResponseFormat {
  MARKDOWN = "markdown",
  JSON = "json",
}

/**
 * Strategy interface — all formatters implement this.
 */
export interface Formatter<T> {
  format(data: T): string;
  formatList(items: T[], total?: number): string;
}

// ─── Date helpers ────────────────────────────────────────────────────────────

export function formatDate(iso?: string): string {
  if (!iso) return "sem data";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

export function formatDateOnly(iso?: string): string {
  if (!iso) return "sem data";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  });
}

// ─── Course formatters ───────────────────────────────────────────────────────

export class CourseMarkdownFormatter implements Formatter<CanvasCourse> {
  format(c: CanvasCourse): string {
    const grade = c.enrollments?.[0]?.computed_current_grade ?? "N/A";
    const score = c.enrollments?.[0]?.computed_current_score;
    const scoreStr = score != null ? ` (${score}%)` : "";
    return [
      `## ${c.name} (ID: ${c.id})`,
      `- **Código**: ${c.course_code}`,
      `- **Estado**: ${c.workflow_state}`,
      `- **Nota atual**: ${grade}${scoreStr}`,
      c.start_at ? `- **Início**: ${formatDateOnly(c.start_at)}` : "",
      c.end_at ? `- **Fim**: ${formatDateOnly(c.end_at)}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  formatList(items: CanvasCourse[], total?: number): string {
    if (!items.length) return "Nenhum curso encontrado.";
    const header = `# Cursos (${total ?? items.length})\n\n`;
    return header + items.map((c) => this.format(c)).join("\n\n---\n\n");
  }
}

export class CourseJsonFormatter implements Formatter<CanvasCourse> {
  format(c: CanvasCourse): string {
    return JSON.stringify(c, null, 2);
  }

  formatList(items: CanvasCourse[], total?: number): string {
    return JSON.stringify({ total: total ?? items.length, items }, null, 2);
  }
}

// ─── Assignment formatters ───────────────────────────────────────────────────

export class AssignmentMarkdownFormatter implements Formatter<CanvasAssignment> {
  format(a: CanvasAssignment): string {
    return [
      `## ${a.name} (ID: ${a.id})`,
      `- **Prazo**: ${formatDate(a.due_at)}`,
      `- **Pontos**: ${a.points_possible ?? "N/A"}`,
      `- **Tipos de entrega**: ${a.submission_types.join(", ")}`,
      `- **Estado**: ${a.workflow_state}`,
      `- **Link**: ${a.html_url}`,
    ].join("\n");
  }

  formatList(items: CanvasAssignment[], total?: number): string {
    if (!items.length) return "Nenhuma tarefa encontrada.";
    const header = `# Tarefas (${total ?? items.length})\n\n`;
    return header + items.map((a) => this.format(a)).join("\n\n---\n\n");
  }
}

export class AssignmentJsonFormatter implements Formatter<CanvasAssignment> {
  format(a: CanvasAssignment): string {
    return JSON.stringify(a, null, 2);
  }

  formatList(items: CanvasAssignment[], total?: number): string {
    return JSON.stringify({ total: total ?? items.length, items }, null, 2);
  }
}

// ─── Submission formatters ───────────────────────────────────────────────────

export class SubmissionMarkdownFormatter implements Formatter<CanvasSubmission> {
  format(s: CanvasSubmission): string {
    return [
      `## Entrega — Tarefa ID ${s.assignment_id} (Submissão ID: ${s.id})`,
      `- **Estado**: ${s.workflow_state}`,
      `- **Enviado em**: ${formatDate(s.submitted_at)}`,
      `- **Nota**: ${s.grade ?? "Não avaliado"}`,
      s.score != null ? `- **Pontuação**: ${s.score}` : "",
      `- **Atrasado**: ${s.late ? "Sim" : "Não"}`,
      `- **Faltando**: ${s.missing ? "Sim" : "Não"}`,
      s.submission_type ? `- **Tipo**: ${s.submission_type}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  formatList(items: CanvasSubmission[], total?: number): string {
    if (!items.length) return "Nenhuma entrega encontrada.";
    const header = `# Entregas (${total ?? items.length})\n\n`;
    return header + items.map((s) => this.format(s)).join("\n\n---\n\n");
  }
}

export class SubmissionJsonFormatter implements Formatter<CanvasSubmission> {
  format(s: CanvasSubmission): string {
    return JSON.stringify(s, null, 2);
  }

  formatList(items: CanvasSubmission[], total?: number): string {
    return JSON.stringify({ total: total ?? items.length, items }, null, 2);
  }
}

// ─── Todo formatters ─────────────────────────────────────────────────────────

export class TodoMarkdownFormatter implements Formatter<CanvasTodoItem> {
  format(t: CanvasTodoItem): string {
    const assignment = t.assignment;
    return [
      `## ${assignment?.name ?? "Item pendente"} (${t.context_name ?? t.context_type})`,
      `- **Tipo**: ${t.type}`,
      assignment?.due_at ? `- **Prazo**: ${formatDate(assignment.due_at)}` : "",
      `- **Link**: ${t.html_url}`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  formatList(items: CanvasTodoItem[], total?: number): string {
    if (!items.length) return "Nenhuma tarefa pendente.";
    const header = `# Pendências (${total ?? items.length})\n\n`;
    return header + items.map((t) => this.format(t)).join("\n\n---\n\n");
  }
}

export class TodoJsonFormatter implements Formatter<CanvasTodoItem> {
  format(t: CanvasTodoItem): string {
    return JSON.stringify(t, null, 2);
  }

  formatList(items: CanvasTodoItem[], total?: number): string {
    return JSON.stringify({ total: total ?? items.length, items }, null, 2);
  }
}

// ─── Calendar formatters ─────────────────────────────────────────────────────

export class CalendarMarkdownFormatter implements Formatter<CanvasCalendarEvent> {
  format(e: CanvasCalendarEvent): string {
    return [
      `## ${e.title} (ID: ${e.id})`,
      `- **Início**: ${formatDate(e.start_at)}`,
      e.end_at ? `- **Fim**: ${formatDate(e.end_at)}` : "",
      `- **Contexto**: ${e.context_code}`,
      `- **Link**: ${e.html_url}`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  formatList(items: CanvasCalendarEvent[], total?: number): string {
    if (!items.length) return "Nenhum evento encontrado.";
    const header = `# Eventos (${total ?? items.length})\n\n`;
    return header + items.map((e) => this.format(e)).join("\n\n---\n\n");
  }
}

export class CalendarJsonFormatter implements Formatter<CanvasCalendarEvent> {
  format(e: CanvasCalendarEvent): string {
    return JSON.stringify(e, null, 2);
  }

  formatList(items: CanvasCalendarEvent[], total?: number): string {
    return JSON.stringify({ total: total ?? items.length, items }, null, 2);
  }
}

// ─── Announcement formatters ─────────────────────────────────────────────────

export class AnnouncementMarkdownFormatter
  implements Formatter<CanvasAnnouncement>
{
  format(a: CanvasAnnouncement): string {
    return [
      `## ${a.title} (ID: ${a.id})`,
      `- **Postado em**: ${formatDate(a.posted_at)}`,
      a.author ? `- **Autor**: ${a.author.display_name}` : "",
      `- **Contexto**: ${a.context_code}`,
      `- **Link**: ${a.html_url}`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  formatList(items: CanvasAnnouncement[], total?: number): string {
    if (!items.length) return "Nenhum anúncio encontrado.";
    const header = `# Anúncios (${total ?? items.length})\n\n`;
    return header + items.map((a) => this.format(a)).join("\n\n---\n\n");
  }
}

export class AnnouncementJsonFormatter implements Formatter<CanvasAnnouncement> {
  format(a: CanvasAnnouncement): string {
    return JSON.stringify(a, null, 2);
  }

  formatList(items: CanvasAnnouncement[], total?: number): string {
    return JSON.stringify({ total: total ?? items.length, items }, null, 2);
  }
}

// ─── User / profile ──────────────────────────────────────────────────────────

export class UserMarkdownFormatter implements Formatter<CanvasUser> {
  format(u: CanvasUser): string {
    return [
      `# ${u.name}`,
      `- **Login**: ${u.login_id}`,
      u.email ? `- **Email**: ${u.email}` : "",
      `- **ID**: ${u.id}`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  formatList(items: CanvasUser[], total?: number): string {
    return items.map((u) => this.format(u)).join("\n\n---\n\n");
  }
}

export class UserJsonFormatter implements Formatter<CanvasUser> {
  format(u: CanvasUser): string {
    return JSON.stringify(u, null, 2);
  }

  formatList(items: CanvasUser[], total?: number): string {
    return JSON.stringify({ total: total ?? items.length, items }, null, 2);
  }
}

// ─── Factory helpers ─────────────────────────────────────────────────────────

export function selectFormatter<T>(
  format: ResponseFormat,
  markdown: Formatter<T>,
  json: Formatter<T>
): Formatter<T> {
  return format === ResponseFormat.JSON ? json : markdown;
}
