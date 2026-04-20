import type { ICanvasClient } from "../services/canvasClient.js";
import { ok, err, type Result } from "../services/errors.js";
import type { CanvasError } from "../services/errors.js";
import { downloadCanvasFile } from "../services/canvasDownload.js";
import type { DocumentExtractor } from "../services/documentExtractor.js";
import type { ExtractedText } from "../services/documentExtractor.js";
import { extractFileLinks } from "../services/canvasLinks.js";
import type { CanvasFile, ResolvedTaskFiles } from "../types.js";
import type { PaginatedResponse } from "../types.js";

export interface ListFilesOptions {
  per_page?: number;
  page?: number;
  content_types?: string[];
  search_term?: string;
  sort?: "name" | "created_at" | "updated_at" | "content_type" | "user";
  order?: "asc" | "desc";
}

export interface ResolveTaskFilesOptions {
  kind: "assignment" | "page" | "discussion";
  courseId: number;
  id: number;
}

const DOCUMENT_DOWNLOAD_MAX_BYTES =
  parseInt(process.env["DOCUMENT_DOWNLOAD_MAX_BYTES"] ?? "0") || 25 * 1024 * 1024;

const OCR_MAX_BYTES =
  parseInt(process.env["OCR_MAX_BYTES"] ?? "0") || 10 * 1024 * 1024;

/**
 * DocumentsRepository — orchestrates Canvas file metadata + download + extraction.
 *
 * Follows Repository pattern: constructor DI, methods return Result<T, CanvasError>.
 * No formatting, no HTTP transport concerns.
 */
export class DocumentsRepository {
  constructor(
    private readonly client: ICanvasClient,
    private readonly extractor: DocumentExtractor
  ) {}

  /**
   * Lists files in a course folder.
   */
  async listCourseFiles(
    courseId: number,
    opts: ListFilesOptions = {}
  ): Promise<Result<PaginatedResponse<CanvasFile>>> {
    const params: Record<string, unknown> = {
      per_page: opts.per_page ?? 25,
      page: opts.page ?? 1,
    };
    if (opts.content_types?.length) params["content_types[]"] = opts.content_types;
    if (opts.search_term) params["search_term"] = opts.search_term;
    if (opts.sort) params["sort"] = opts.sort;
    if (opts.order) params["order"] = opts.order;

    return this.client.getPaginated<CanvasFile>(`/courses/${courseId}/files`, params);
  }

  /**
   * Gets file metadata by ID.
   */
  async getFileMetadata(fileId: number): Promise<Result<CanvasFile>> {
    return this.client.get<CanvasFile>(`/files/${fileId}`);
  }

  /**
   * Downloads file bytes. Returns base64-encoded content + metadata.
   */
  async downloadFileBytes(fileId: number): Promise<Result<{
    bytes: Buffer;
    contentType: string;
    filename: string | undefined;
    size: number;
    base64: string;
  }, CanvasError>> {
    // Step 1: get metadata to obtain signed download URL
    const metaResult = await this.getFileMetadata(fileId);
    if (!metaResult.ok) return metaResult;

    const meta = metaResult.value;
    const downloadUrl = meta.url;

    if (!downloadUrl) {
      return err({
        code: "NOT_FOUND",
        message: `Arquivo ${fileId} não possui URL de download disponível.`,
      });
    }

    // Step 2: SSRF-hardened download
    const downloadResult = await downloadCanvasFile(downloadUrl, {
      maxBytes: DOCUMENT_DOWNLOAD_MAX_BYTES,
    });
    if (!downloadResult.ok) return downloadResult;

    const { bytes, contentType, filename, size } = downloadResult.value;
    return ok({
      bytes,
      contentType,
      filename: filename ?? meta.filename,
      size,
      base64: bytes.toString("base64"),
    });
  }

  /**
   * Downloads and extracts text from a Canvas file.
   */
  async extractDocumentText(fileId: number): Promise<Result<{
    fileId: number;
    filename: string | undefined;
    contentType: string;
    size: number;
    extraction: ExtractedText;
  }, CanvasError>> {
    const downloadResult = await this.downloadFileBytes(fileId);
    if (!downloadResult.ok) return downloadResult;

    const { bytes, contentType, filename, size } = downloadResult.value;

    // Enforce OCR size limit separately
    if (contentType.startsWith("image/") && size > OCR_MAX_BYTES) {
      return err({
        code: "UNPROCESSABLE",
        message: `Imagem excede o limite de OCR (${(OCR_MAX_BYTES / 1024 / 1024).toFixed(0)}MB). Reduza o arquivo ou ajuste OCR_MAX_BYTES.`,
      });
    }

    const extractResult = await this.extractor.extract(bytes, contentType, filename);
    if (!extractResult.ok) {
      return err({
        code: "UNPROCESSABLE",
        message: extractResult.error.message,
      });
    }

    return ok({ fileId, filename, contentType, size, extraction: extractResult.value });
  }

  /**
   * Resolves all file attachments from a task entity (assignment, page, discussion).
   * Parses HTML description/body, extracts Canvas file links, downloads + extracts text.
   * Concurrent: processes up to 3 files in parallel.
   */
  async resolveTaskFiles(opts: ResolveTaskFilesOptions): Promise<Result<ResolvedTaskFiles, CanvasError>> {
    const htmlResult = await this.fetchEntityHtml(opts);
    if (!htmlResult.ok) return htmlResult;

    const { html, sourceId } = htmlResult.value;
    const fileLinks = extractFileLinks(html, { defaultCourseId: opts.courseId });

    if (fileLinks.length === 0) {
      return ok({
        sourceKind: opts.kind,
        sourceId,
        courseId: opts.courseId,
        files: [],
        totalFiles: 0,
      });
    }

    // Process up to 3 files in parallel (concurrency = 3)
    const CONCURRENCY = 3;
    const results: ResolvedTaskFiles["files"] = [];

    for (let i = 0; i < fileLinks.length; i += CONCURRENCY) {
      const batch = fileLinks.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.all(
        batch.map(async (link) => {
          const extractResult = await this.extractDocumentText(link.fileId);
          if (!extractResult.ok) {
            return {
              fileId: link.fileId,
              filename: undefined,
              contentType: "unknown",
              extraction: { error: extractResult.error.message } as { error: string },
            };
          }
          const { filename, contentType, extraction } = extractResult.value;
          return { fileId: link.fileId, filename, contentType, extraction };
        })
      );
      results.push(...batchResults);
    }

    return ok({
      sourceKind: opts.kind,
      sourceId,
      courseId: opts.courseId,
      files: results,
      totalFiles: fileLinks.length,
    });
  }

  private async fetchEntityHtml(
    opts: ResolveTaskFilesOptions
  ): Promise<Result<{ html: string; sourceId: number }, CanvasError>> {
    const { kind, courseId, id } = opts;

    if (kind === "assignment") {
      const result = await this.client.get<{ id: number; description?: string }>(
        `/courses/${courseId}/assignments/${id}`
      );
      if (!result.ok) return result;
      return ok({ html: result.value.description ?? "", sourceId: result.value.id });
    }

    if (kind === "page") {
      const result = await this.client.get<{ page_id: number; body?: string }>(
        `/courses/${courseId}/pages/${id}`
      );
      if (!result.ok) return result;
      return ok({ html: result.value.body ?? "", sourceId: result.value.page_id });
    }

    // kind === "discussion"
    const result = await this.client.get<{ id: number; message?: string }>(
      `/courses/${courseId}/discussion_topics/${id}`
    );
    if (!result.ok) return result;
    return ok({ html: result.value.message ?? "", sourceId: result.value.id });
  }
}
