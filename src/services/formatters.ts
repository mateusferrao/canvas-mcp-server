import type {
  CanvasAnnouncement,
  CanvasAssignment,
  CanvasCalendarEvent,
  CanvasCourse,
  CanvasDiscussionEntry,
  CanvasDiscussionTopic,
  CanvasConversation,
  CanvasFile,
  CanvasModule,
  CanvasModuleItem,
  CanvasPage,
  CanvasPlannerNote,
  CanvasQuiz,
  CanvasQuizQuestion,
  CanvasQuizSubmission,
  CanvasQuizSubmissionQuestion,
  CanvasQuizTimeLeft,
  CanvasEnrollment,
  CanvasSubmission,
  CanvasTodoItem,
  CanvasUser,
} from "../types.js";
import { htmlToMarkdown } from "./markdown.js";

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

// ─── Module formatters ───────────────────────────────────────────────────────

export class ModuleMarkdownFormatter implements Formatter<CanvasModule> {
  format(m: CanvasModule): string {
    const state = m.state ? ` — ${m.state}` : "";
    const lines = [
      `## ${m.name} (ID: ${m.id})`,
      `- **Posição**: ${m.position}`,
      `- **Estado**: ${m.workflow_state}${state}`,
      `- **Itens**: ${m.items_count}`,
      m.unlock_at ? `- **Disponível a partir de**: ${formatDate(m.unlock_at)}` : "",
      m.completed_at ? `- **Concluído em**: ${formatDate(m.completed_at)}` : "",
    ].filter(Boolean);
    if (m.items?.length) {
      lines.push("", "**Itens:**");
      for (const item of m.items) {
        lines.push(`  - [${item.title}](${item.html_url}) — ${item.type}`);
      }
    }
    return lines.join("\n");
  }

  formatList(items: CanvasModule[], total?: number): string {
    if (!items.length) return "Nenhum módulo encontrado.";
    const header = `# Módulos (${total ?? items.length})\n\n`;
    return header + items.map((m) => this.format(m)).join("\n\n---\n\n");
  }
}

export class ModuleJsonFormatter implements Formatter<CanvasModule> {
  format(m: CanvasModule): string {
    return JSON.stringify(m, null, 2);
  }

  formatList(items: CanvasModule[], total?: number): string {
    return JSON.stringify({ total: total ?? items.length, items }, null, 2);
  }
}

export class ModuleItemMarkdownFormatter implements Formatter<CanvasModuleItem> {
  format(item: CanvasModuleItem): string {
    const req = item.completion_requirement;
    const done = req?.completed ? "✓" : "○";
    return [
      `## ${done} ${item.title} (ID: ${item.id})`,
      `- **Tipo**: ${item.type}`,
      `- **Link**: ${item.html_url}`,
      req ? `- **Requisito**: ${req.type}${req.completed ? " (concluído)" : " (pendente)"}` : "",
      item.content_details?.due_at
        ? `- **Prazo**: ${formatDate(item.content_details.due_at)}`
        : "",
      item.content_details?.points_possible != null
        ? `- **Pontos**: ${item.content_details.points_possible}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  formatList(items: CanvasModuleItem[], total?: number): string {
    if (!items.length) return "Nenhum item de módulo encontrado.";
    const header = `# Itens do Módulo (${total ?? items.length})\n\n`;
    return header + items.map((i) => this.format(i)).join("\n\n---\n\n");
  }
}

export class ModuleItemJsonFormatter implements Formatter<CanvasModuleItem> {
  format(item: CanvasModuleItem): string {
    return JSON.stringify(item, null, 2);
  }

  formatList(items: CanvasModuleItem[], total?: number): string {
    return JSON.stringify({ total: total ?? items.length, items }, null, 2);
  }
}

// ─── Page formatters ─────────────────────────────────────────────────────────

export class PageMarkdownFormatter implements Formatter<CanvasPage> {
  format(p: CanvasPage): string {
    const bodyMd = p.body ? "\n\n" + htmlToMarkdown(p.body) : "";
    return [
      `## ${p.title} (ID: ${p.page_id})`,
      `- **URL**: ${p.url}`,
      `- **Publicada**: ${p.published ? "Sim" : "Não"}`,
      `- **Atualizada em**: ${formatDate(p.updated_at)}`,
    ].join("\n") + bodyMd;
  }

  formatList(items: CanvasPage[], total?: number): string {
    if (!items.length) return "Nenhuma página encontrada.";
    const header = `# Páginas (${total ?? items.length})\n\n`;
    return header + items.map((p) => this.format(p)).join("\n\n---\n\n");
  }
}

export class PageJsonFormatter implements Formatter<CanvasPage> {
  format(p: CanvasPage): string {
    return JSON.stringify(p, null, 2);
  }

  formatList(items: CanvasPage[], total?: number): string {
    return JSON.stringify({ total: total ?? items.length, items }, null, 2);
  }
}

// ─── Discussion formatters ───────────────────────────────────────────────────

export class DiscussionTopicMarkdownFormatter
  implements Formatter<CanvasDiscussionTopic>
{
  format(t: CanvasDiscussionTopic): string {
    const bodyMd = t.message ? "\n\n" + htmlToMarkdown(t.message) : "";
    return [
      `## ${t.title} (ID: ${t.id})`,
      `- **Tipo**: ${t.discussion_type}`,
      t.author ? `- **Autor**: ${t.author.display_name}` : "",
      `- **Publicada**: ${t.published ? "Sim" : "Não"}`,
      `- **Bloqueada**: ${t.locked ? "Sim" : "Não"}`,
      t.posted_at ? `- **Postado em**: ${formatDate(t.posted_at)}` : "",
      t.last_reply_at ? `- **Última resposta**: ${formatDate(t.last_reply_at)}` : "",
      `- **Link**: ${t.html_url}`,
    ]
      .filter(Boolean)
      .join("\n") + bodyMd;
  }

  formatList(items: CanvasDiscussionTopic[], total?: number): string {
    if (!items.length) return "Nenhuma discussão encontrada.";
    const header = `# Discussões (${total ?? items.length})\n\n`;
    return header + items.map((t) => this.format(t)).join("\n\n---\n\n");
  }
}

export class DiscussionTopicJsonFormatter
  implements Formatter<CanvasDiscussionTopic>
{
  format(t: CanvasDiscussionTopic): string {
    return JSON.stringify(t, null, 2);
  }

  formatList(items: CanvasDiscussionTopic[], total?: number): string {
    return JSON.stringify({ total: total ?? items.length, items }, null, 2);
  }
}

export class DiscussionEntryMarkdownFormatter
  implements Formatter<CanvasDiscussionEntry>
{
  format(e: CanvasDiscussionEntry): string {
    const bodyMd = htmlToMarkdown(e.message);
    return [
      `## Entrada ID ${e.id} — ${e.user_name ?? `Usuário ${e.user_id}`}`,
      `- **Postada em**: ${formatDate(e.created_at)}`,
      `- **Lida**: ${e.read_state === "read" ? "Sim" : "Não"}`,
      "",
      bodyMd,
    ]
      .filter((l) => l !== undefined)
      .join("\n");
  }

  formatList(items: CanvasDiscussionEntry[], total?: number): string {
    if (!items.length) return "Nenhuma entrada de discussão encontrada.";
    const header = `# Entradas (${total ?? items.length})\n\n`;
    return header + items.map((e) => this.format(e)).join("\n\n---\n\n");
  }
}

export class DiscussionEntryJsonFormatter
  implements Formatter<CanvasDiscussionEntry>
{
  format(e: CanvasDiscussionEntry): string {
    return JSON.stringify(e, null, 2);
  }

  formatList(items: CanvasDiscussionEntry[], total?: number): string {
    return JSON.stringify({ total: total ?? items.length, items }, null, 2);
  }
}

// ─── Conversation formatters ─────────────────────────────────────────────────

export class ConversationMarkdownFormatter
  implements Formatter<CanvasConversation>
{
  format(c: CanvasConversation): string {
    const participants =
      c.participants?.map((p) => p.name).join(", ") ?? "N/A";
    const lines = [
      `## ${c.subject || "(sem assunto)"} (ID: ${c.id})`,
      `- **Estado**: ${c.workflow_state}`,
      `- **Mensagens**: ${c.message_count}`,
      `- **Participantes**: ${participants}`,
      c.last_message_at ? `- **Última mensagem**: ${formatDate(c.last_message_at)}` : "",
      c.last_message ? `- **Prévia**: ${c.last_message.slice(0, 100)}${c.last_message.length > 100 ? "…" : ""}` : "",
    ].filter(Boolean);
    if (c.messages?.length) {
      lines.push("", "**Mensagens:**");
      for (const msg of c.messages) {
        lines.push(`  - [${formatDate(msg.created_at)}] ${msg.body.slice(0, 80)}${msg.body.length > 80 ? "…" : ""}`);
      }
    }
    return lines.join("\n");
  }

  formatList(items: CanvasConversation[], total?: number): string {
    if (!items.length) return "Nenhuma conversa encontrada.";
    const header = `# Conversas (${total ?? items.length})\n\n`;
    return header + items.map((c) => this.format(c)).join("\n\n---\n\n");
  }
}

export class ConversationJsonFormatter implements Formatter<CanvasConversation> {
  format(c: CanvasConversation): string {
    return JSON.stringify(c, null, 2);
  }

  formatList(items: CanvasConversation[], total?: number): string {
    return JSON.stringify({ total: total ?? items.length, items }, null, 2);
  }
}

// ─── File formatters ─────────────────────────────────────────────────────────

export class FileMarkdownFormatter implements Formatter<CanvasFile> {
  format(f: CanvasFile): string {
    return [
      `## ${f.display_name} (ID: ${f.id})`,
      `- **Arquivo**: ${f.filename}`,
      `- **Tipo**: ${f["content-type"]}`,
      `- **Tamanho**: ${(f.size / 1024).toFixed(1)} KB`,
      `- **URL**: ${f.url}`,
      `- **Criado em**: ${formatDate(f.created_at)}`,
    ].join("\n");
  }

  formatList(items: CanvasFile[], total?: number): string {
    if (!items.length) return "Nenhum arquivo encontrado.";
    const header = `# Arquivos (${total ?? items.length})\n\n`;
    return header + items.map((f) => this.format(f)).join("\n\n---\n\n");
  }
}

export class FileJsonFormatter implements Formatter<CanvasFile> {
  format(f: CanvasFile): string {
    return JSON.stringify(f, null, 2);
  }

  formatList(items: CanvasFile[], total?: number): string {
    return JSON.stringify({ total: total ?? items.length, items }, null, 2);
  }
}

// ─── Planner Note formatters ─────────────────────────────────────────────────

export class PlannerNoteMarkdownFormatter implements Formatter<CanvasPlannerNote> {
  format(n: CanvasPlannerNote): string {
    return [
      `## ${n.title} (ID: ${n.id})`,
      `- **Data**: ${formatDateOnly(n.todo_date)}`,
      n.course_id ? `- **Curso ID**: ${n.course_id}` : "",
      n.description ? `- **Detalhes**: ${n.description}` : "",
      n.linked_object_type
        ? `- **Vinculado a**: ${n.linked_object_type} ID ${n.linked_object_id}`
        : "",
      `- **Estado**: ${n.workflow_state}`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  formatList(items: CanvasPlannerNote[], total?: number): string {
    if (!items.length) return "Nenhuma nota do planejador encontrada.";
    const header = `# Notas do Planejador (${total ?? items.length})\n\n`;
    return header + items.map((n) => this.format(n)).join("\n\n---\n\n");
  }
}

export class PlannerNoteJsonFormatter implements Formatter<CanvasPlannerNote> {
  format(n: CanvasPlannerNote): string {
    return JSON.stringify(n, null, 2);
  }

  formatList(items: CanvasPlannerNote[], total?: number): string {
    return JSON.stringify({ total: total ?? items.length, items }, null, 2);
  }
}

// ─── Grades formatters ───────────────────────────────────────────────────────

export class GradesMarkdownFormatter implements Formatter<CanvasEnrollment> {
  format(e: CanvasEnrollment): string {
    const g = e.grades;
    return [
      `## Notas do Curso (ID: ${e.course_id ?? "N/A"})`,
      `- **Nota atual**: ${g?.current_grade ?? "N/A"}${g?.current_score != null ? ` (${g.current_score}%)` : ""}`,
      `- **Nota final**: ${g?.final_grade ?? "N/A"}${g?.final_score != null ? ` (${g.final_score}%)` : ""}`,
      `- **Tipo de matrícula**: ${e.type}`,
    ].join("\n");
  }

  formatList(items: CanvasEnrollment[], total?: number): string {
    return items.map((e) => this.format(e)).join("\n\n---\n\n");
  }
}

export class GradesJsonFormatter implements Formatter<CanvasEnrollment> {
  format(e: CanvasEnrollment): string {
    return JSON.stringify(e, null, 2);
  }

  formatList(items: CanvasEnrollment[], total?: number): string {
    return JSON.stringify({ total: total ?? items.length, items }, null, 2);
  }
}

// ─── Quiz formatters ─────────────────────────────────────────────────────────

export class QuizMarkdownFormatter implements Formatter<CanvasQuiz> {
  format(q: CanvasQuiz): string {
    return [
      `## ${q.title} (ID: ${q.id})`,
      `- **Tipo**: ${q.quiz_type}`,
      `- **Questões**: ${q.question_count}`,
      q.points_possible != null ? `- **Pontos**: ${q.points_possible}` : "",
      q.time_limit != null ? `- **Tempo**: ${q.time_limit} minutos` : "",
      `- **Tentativas permitidas**: ${q.allowed_attempts === -1 ? "ilimitadas" : q.allowed_attempts}`,
      q.due_at ? `- **Prazo**: ${formatDate(q.due_at)}` : "",
      q.unlock_at ? `- **Disponível a partir de**: ${formatDate(q.unlock_at)}` : "",
      `- **Publicado**: ${q.published ? "Sim" : "Não"}`,
      `- **Link**: ${q.html_url}`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  formatList(items: CanvasQuiz[], total?: number): string {
    if (!items.length) return "Nenhum quiz encontrado.";
    const header = `# Quizzes (${total ?? items.length})\n\n`;
    return header + items.map((q) => this.format(q)).join("\n\n---\n\n");
  }
}

export class QuizJsonFormatter implements Formatter<CanvasQuiz> {
  format(q: CanvasQuiz): string {
    return JSON.stringify(q, null, 2);
  }

  formatList(items: CanvasQuiz[], total?: number): string {
    return JSON.stringify({ total: total ?? items.length, items }, null, 2);
  }
}

// ─── Quiz Question formatters ────────────────────────────────────────────────

export class QuizQuestionMarkdownFormatter implements Formatter<CanvasQuizQuestion> {
  format(q: CanvasQuizQuestion): string {
    const lines = [
      `## Questão ${q.position}: ${q.question_name} (ID: ${q.id})`,
      `- **Tipo**: ${q.question_type}`,
      `- **Pontos**: ${q.points_possible}`,
      `- **Enunciado**: ${q.question_text.replace(/<[^>]*>/g, " ").trim()}`,
    ];
    if (q.answers && q.answers.length > 0) {
      lines.push("- **Opções**:");
      for (const a of q.answers) {
        lines.push(`  - [${a.id}] ${a.text}`);
      }
    }
    return lines.filter(Boolean).join("\n");
  }

  formatList(items: CanvasQuizQuestion[], total?: number): string {
    if (!items.length) return "Nenhuma questão encontrada.";
    const header = `# Questões (${total ?? items.length})\n\n`;
    return header + items.map((q) => this.format(q)).join("\n\n---\n\n");
  }
}

export class QuizQuestionJsonFormatter implements Formatter<CanvasQuizQuestion> {
  format(q: CanvasQuizQuestion): string {
    return JSON.stringify(q, null, 2);
  }

  formatList(items: CanvasQuizQuestion[], total?: number): string {
    return JSON.stringify({ total: total ?? items.length, items }, null, 2);
  }
}

// ─── Quiz Submission formatters ──────────────────────────────────────────────

export class QuizSubmissionMarkdownFormatter implements Formatter<CanvasQuizSubmission> {
  format(s: CanvasQuizSubmission): string {
    return [
      `## Tentativa #${s.attempt} (ID: ${s.id})`,
      `- **Estado**: ${s.workflow_state}`,
      s.score != null ? `- **Nota**: ${s.score}` : "",
      s.kept_score != null ? `- **Nota mantida**: ${s.kept_score}` : "",
      s.started_at ? `- **Iniciada em**: ${formatDate(s.started_at)}` : "",
      s.finished_at ? `- **Concluída em**: ${formatDate(s.finished_at)}` : "",
      s.end_at ? `- **Expira em**: ${formatDate(s.end_at)}` : "",
      s.time_spent != null ? `- **Tempo gasto**: ${s.time_spent}s` : "",
      s.validation_token
        ? `- **validation_token**: ${s.validation_token}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  formatList(items: CanvasQuizSubmission[], total?: number): string {
    if (!items.length) return "Nenhuma tentativa encontrada.";
    const header = `# Tentativas (${total ?? items.length})\n\n`;
    return header + items.map((s) => this.format(s)).join("\n\n---\n\n");
  }
}

export class QuizSubmissionJsonFormatter implements Formatter<CanvasQuizSubmission> {
  format(s: CanvasQuizSubmission): string {
    return JSON.stringify(s, null, 2);
  }

  formatList(items: CanvasQuizSubmission[], total?: number): string {
    return JSON.stringify({ total: total ?? items.length, items }, null, 2);
  }
}

// ─── Quiz Submission Question formatters ─────────────────────────────────────

export class QuizSubmissionQuestionMarkdownFormatter
  implements Formatter<CanvasQuizSubmissionQuestion>
{
  format(q: CanvasQuizSubmissionQuestion): string {
    return [
      `## Questão ID: ${q.id}`,
      `- **Marcada para revisão**: ${q.flagged ? "Sim" : "Não"}`,
      q.answer != null ? `- **Resposta atual**: ${JSON.stringify(q.answer)}` : "- **Resposta atual**: (sem resposta)",
    ]
      .filter(Boolean)
      .join("\n");
  }

  formatList(items: CanvasQuizSubmissionQuestion[], total?: number): string {
    if (!items.length) return "Nenhuma questão encontrada.";
    const header = `# Questões da Tentativa (${total ?? items.length})\n\n`;
    return header + items.map((q) => this.format(q)).join("\n\n---\n\n");
  }
}

export class QuizSubmissionQuestionJsonFormatter
  implements Formatter<CanvasQuizSubmissionQuestion>
{
  format(q: CanvasQuizSubmissionQuestion): string {
    return JSON.stringify(q, null, 2);
  }

  formatList(items: CanvasQuizSubmissionQuestion[], total?: number): string {
    return JSON.stringify({ total: total ?? items.length, items }, null, 2);
  }
}

// ─── Quiz Time Left formatter ─────────────────────────────────────────────────

export class QuizTimeLeftMarkdownFormatter implements Formatter<CanvasQuizTimeLeft> {
  format(t: CanvasQuizTimeLeft): string {
    const minutes = Math.floor(t.time_left / 60);
    const seconds = t.time_left % 60;
    return [
      `## Tempo Restante`,
      `- **Segundos restantes**: ${t.time_left}`,
      `- **Tempo restante**: ${minutes}min ${seconds}s`,
      `- **Expira em**: ${formatDate(t.end_at)}`,
    ].join("\n");
  }

  formatList(items: CanvasQuizTimeLeft[]): string {
    return items.map((t) => this.format(t)).join("\n");
  }
}

export class QuizTimeLeftJsonFormatter implements Formatter<CanvasQuizTimeLeft> {
  format(t: CanvasQuizTimeLeft): string {
    return JSON.stringify(t, null, 2);
  }

  formatList(items: CanvasQuizTimeLeft[]): string {
    return JSON.stringify(items, null, 2);
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
