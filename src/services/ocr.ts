import type { Result } from "./errors.js";
import { ok, err } from "./errors.js";

// ── Error types ───────────────────────────────────────────────────────────────

export interface OcrError {
  code: "OCR_DISABLED" | "OCR_ERROR" | "OCR_UNSUPPORTED_MIME";
  message: string;
}

// ── Interface ─────────────────────────────────────────────────────────────────

/**
 * Strategy interface — all OCR providers implement this.
 * Adapter pattern: hides provider-specific SDK behind stable interface.
 */
export interface OcrService {
  extractText(bytes: Buffer, mime: string): Promise<Result<{ text: string }, OcrError>>;
}

// ── NullOcrService ────────────────────────────────────────────────────────────

/**
 * No-op implementation used when OCR_ENABLED=false.
 * Returns a clear error message so callers can inform the user.
 */
export class NullOcrService implements OcrService {
  async extractText(_bytes: Buffer, _mime: string): Promise<Result<{ text: string }, OcrError>> {
    return err({
      code: "OCR_DISABLED",
      message: "OCR está desabilitado (OCR_ENABLED=false). Para habilitar, configure GOOGLE_APPLICATION_CREDENTIALS ou GOOGLE_VISION_API_KEY e defina OCR_ENABLED=true.",
    });
  }
}

// ── GoogleVisionOcrService ────────────────────────────────────────────────────

const SUPPORTED_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/bmp",
  "image/webp",
  "image/tiff",
  "image/x-tiff",
]);

/**
 * Google Cloud Vision OCR implementation.
 * Uses documentTextDetection (better than textDetection for dense text).
 *
 * Lazy-imports @google-cloud/vision so startup doesn't fail without GCP creds.
 * Auth: service-account via GOOGLE_APPLICATION_CREDENTIALS env (standard SDK pattern)
 *       or API key via GOOGLE_VISION_API_KEY.
 */
export class GoogleVisionOcrService implements OcrService {
  private clientPromise: Promise<import("@google-cloud/vision").ImageAnnotatorClient> | null = null;

  private getClient(): Promise<import("@google-cloud/vision").ImageAnnotatorClient> {
    if (!this.clientPromise) {
      this.clientPromise = (async () => {
        // Lazy import — avoids breaking startup without GCP credentials
        const vision = await import("@google-cloud/vision");
        const apiKey = process.env["GOOGLE_VISION_API_KEY"];

        if (apiKey) {
          return new vision.ImageAnnotatorClient({ apiKey });
        }
        // Falls back to GOOGLE_APPLICATION_CREDENTIALS (standard Google ADC)
        return new vision.ImageAnnotatorClient();
      })();
    }
    return this.clientPromise;
  }

  async extractText(bytes: Buffer, mime: string): Promise<Result<{ text: string }, OcrError>> {
    if (!SUPPORTED_IMAGE_MIMES.has(mime)) {
      return err({
        code: "OCR_UNSUPPORTED_MIME",
        message: `MIME type '${mime}' não suportado pelo OCR. Suportados: ${[...SUPPORTED_IMAGE_MIMES].join(", ")}`,
      });
    }

    try {
      const client = await this.getClient();
      const [result] = await client.documentTextDetection({
        image: { content: bytes.toString("base64") },
      });

      const text = result.fullTextAnnotation?.text ?? "";
      return ok({ text });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      // Redact any credentials that might appear in error messages
      const safe = message.replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]");
      return err({ code: "OCR_ERROR", message: `Erro ao chamar Google Vision: ${safe}` });
    }
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────

export interface OcrServiceConfig {
  enabled: boolean;
}

/**
 * Factory — picks the right OcrService implementation based on config + env.
 */
export function createOcrService(config: OcrServiceConfig): OcrService {
  if (!config.enabled) {
    return new NullOcrService();
  }
  return new GoogleVisionOcrService();
}
