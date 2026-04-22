import type { ICanvasClient } from "../../services/canvasClient.js";
import { DocumentsRepository } from "../../repositories/documents.js";
import { createDocumentExtractor } from "../../services/documentExtractor.js";
import { createOcrService } from "../../services/ocr.js";

const ocrService = createOcrService({
  enabled: process.env["OCR_ENABLED"] !== "false",
});

const extractor = createDocumentExtractor({ ocr: ocrService });

export function buildDocumentsRepository(client: ICanvasClient): DocumentsRepository {
  return new DocumentsRepository(client, extractor);
}
