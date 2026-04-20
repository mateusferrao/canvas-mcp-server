import type { Result } from "./errors.js";
import { ok, err } from "./errors.js";
import type { OcrService, OcrError } from "./ocr.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ExtractedText {
  text: string;
  method: "utf8" | "pdf" | "docx" | "ocr";
  pages?: number;
  truncated?: boolean;
}

export interface DocumentError {
  code:
    | "UNSUPPORTED_FORMAT"
    | "EXTRACT_ERROR"
    | "OCR_DISABLED"
    | "OCR_ERROR"
    | "OCR_UNSUPPORTED_MIME";
  message: string;
}

// ── Interface ─────────────────────────────────────────────────────────────────

/**
 * Strategy interface for text extraction from documents.
 * Adapter pattern: each format has its own impl; dispatcher picks by MIME/ext.
 */
export interface DocumentExtractor {
  extract(
    bytes: Buffer,
    contentType: string,
    filename?: string
  ): Promise<Result<ExtractedText, DocumentError>>;
}

// ── Max text size (to avoid flooding context) ─────────────────────────────────
const MAX_TEXT_CHARS = 100_000;

function truncate(text: string): { text: string; truncated: boolean } {
  if (text.length <= MAX_TEXT_CHARS) return { text, truncated: false };
  return {
    text: text.slice(0, MAX_TEXT_CHARS) + "\n\n[TEXTO TRUNCADO — arquivo muito longo]",
    truncated: true,
  };
}

// ── DefaultDocumentExtractor ──────────────────────────────────────────────────

/**
 * Dispatches to the right extraction strategy by MIME type + filename extension.
 *
 * Supported formats:
 *   text/*                   → UTF-8 decode
 *   application/pdf          → pdf-parse
 *   .docx / vnd.openxml...   → mammoth
 *   image/*                  → OcrService (Google Vision)
 *   unknown                  → err(UNSUPPORTED_FORMAT)
 */
export class DefaultDocumentExtractor implements DocumentExtractor {
  constructor(private readonly ocr: OcrService) {}

  async extract(
    bytes: Buffer,
    contentType: string,
    filename?: string
  ): Promise<Result<ExtractedText, DocumentError>> {
    const mime = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
    const ext = filename ? filename.split(".").pop()?.toLowerCase() : undefined;

    // Plain text
    if (mime.startsWith("text/") || mime === "application/json") {
      const raw = bytes.toString("utf-8");
      const { text, truncated } = truncate(raw);
      return ok({ text, method: "utf8", truncated });
    }

    // PDF
    if (mime === "application/pdf" || ext === "pdf") {
      return this.extractPdf(bytes);
    }

    // DOCX
    const docxMimes = [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];
    if (docxMimes.includes(mime) || ext === "docx" || ext === "doc") {
      return this.extractDocx(bytes);
    }

    // Images — delegate to OCR
    if (mime.startsWith("image/")) {
      return this.extractImage(bytes, mime);
    }

    return err({
      code: "UNSUPPORTED_FORMAT",
      message: `Formato não suportado: '${contentType}'. Suportados: texto, PDF, DOCX, imagens (JPEG, PNG, etc.).`,
    });
  }

  private async extractPdf(bytes: Buffer): Promise<Result<ExtractedText, DocumentError>> {
    try {
      // Lazy import to avoid bundling issues
      const pdfParse = (await import("pdf-parse")).default;
      const result = await pdfParse(bytes);
      const { text, truncated } = truncate(result.text ?? "");
      return ok({ text, method: "pdf", pages: result.numpages, truncated });
    } catch (e) {
      return err({
        code: "EXTRACT_ERROR",
        message: `Erro ao extrair texto do PDF: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }

  private async extractDocx(bytes: Buffer): Promise<Result<ExtractedText, DocumentError>> {
    try {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer: bytes });
      const { text, truncated } = truncate(result.value ?? "");
      return ok({ text, method: "docx", truncated });
    } catch (e) {
      return err({
        code: "EXTRACT_ERROR",
        message: `Erro ao extrair texto do DOCX: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }

  private async extractImage(
    bytes: Buffer,
    mime: string
  ): Promise<Result<ExtractedText, DocumentError>> {
    const ocrResult = await this.ocr.extractText(bytes, mime);
    if (!ocrResult.ok) {
      const ocrErr = ocrResult.error as OcrError;
      return err({ code: ocrErr.code as DocumentError["code"], message: ocrErr.message });
    }
    const { text, truncated } = truncate(ocrResult.value.text);
    return ok({ text, method: "ocr", truncated });
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function createDocumentExtractor(deps: { ocr: OcrService }): DocumentExtractor {
  return new DefaultDocumentExtractor(deps.ocr);
}
