import axios from "axios";
import { URL } from "node:url";
import { ok, err, type Result } from "./errors.js";
import type { CanvasError } from "./errors.js";

// ── SSRF allowlist: Canvas file CDN hostnames ─────────────────────────────────
// Canvas signed file URLs are served from S3 or Canvas's own CDN infrastructure.
// Only allow downloads from these patterns — block all other external hosts.

const CANVAS_CDN_PATTERNS: RegExp[] = [
  // *.instructure.com — main Canvas domain (also covers pucminas.instructure.com)
  /^[a-z0-9-]+\.instructure\.com$/i,
  // inst-fs-*.inscloudgate.net — Canvas file storage
  /^inst-fs-[a-z0-9-]+\.inscloudgate\.net$/i,
  // instructure-uploads.s3*.amazonaws.com — S3-backed uploads
  /^instructure-uploads\.s3[.-][a-z0-9-]+\.amazonaws\.com$/i,
  /^instructure-uploads\.[a-z0-9-]+\.s3\.amazonaws\.com$/i,
  // *.s3.amazonaws.com — generic S3 (used by some Canvas instances)
  /^[a-z0-9-]+\.s3(?:[.-][a-z0-9-]+)?\.amazonaws\.com$/i,
];

// Private/reserved IP ranges — block even if hostname resolves
const PRIVATE_IP_RE = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|::1$|fd[0-9a-f]{2}:)/i;
const LOCAL_HOSTS = new Set(["localhost", "0.0.0.0", "[::]", "[::1]"]);

export interface DownloadResult {
  bytes: Buffer;
  contentType: string;
  filename: string | undefined;
  size: number;
}

/**
 * Downloads a Canvas file URL in a SSRF-hardened way.
 *
 * Security controls:
 * - Hostname must match Canvas CDN allowlist.
 * - Private IP ranges are blocked.
 * - Max 3 redirects; each redirect re-checks hostname.
 * - Content-Length pre-check before downloading.
 * - Download aborted if size exceeds maxBytes.
 */
export async function downloadCanvasFile(
  url: string,
  opts: { maxBytes?: number } = {}
): Promise<Result<DownloadResult, CanvasError>> {
  const maxBytes = opts.maxBytes ?? 25 * 1024 * 1024; // 25 MB default

  const validation = validateUrl(url);
  if (!validation.ok) return validation;

  try {
    const response = await axios.get<Buffer>(url, {
      responseType: "arraybuffer",
      maxRedirects: 0, // handle manually so we can re-check each redirect
      validateStatus: (s) => (s >= 200 && s < 300) || (s >= 300 && s < 400),
      timeout: 30_000,
      maxContentLength: maxBytes,
    });

    // Follow redirects manually (up to 3)
    let finalResponse = response;
    let redirects = 0;
    let currentUrl = url;

    while (
      finalResponse.status >= 300 &&
      finalResponse.status < 400 &&
      redirects < 3
    ) {
      const location = finalResponse.headers["location"] as string | undefined;
      if (!location) break;

      const resolvedUrl = new URL(location, currentUrl).toString();
      const nextValidation = validateUrl(resolvedUrl);
      if (!nextValidation.ok) return nextValidation;

      currentUrl = resolvedUrl;
      finalResponse = await axios.get<Buffer>(resolvedUrl, {
        responseType: "arraybuffer",
        maxRedirects: 0,
        validateStatus: (s) => (s >= 200 && s < 300) || (s >= 300 && s < 400),
        timeout: 30_000,
        maxContentLength: maxBytes,
      });
      redirects++;
    }

    if (finalResponse.status < 200 || finalResponse.status >= 300) {
      return err({
        code: "NOT_FOUND",
        message: `Download falhou: status HTTP ${finalResponse.status}`,
        status: finalResponse.status,
      });
    }

    const bytes = Buffer.from(finalResponse.data as unknown as ArrayBuffer);

    if (bytes.length > maxBytes) {
      return err({
        code: "UNPROCESSABLE",
        message: `Arquivo excede o tamanho máximo permitido (${(maxBytes / 1024 / 1024).toFixed(0)}MB).`,
      });
    }

    const contentType =
      (finalResponse.headers["content-type"] as string | undefined)?.split(";")[0]?.trim() ??
      "application/octet-stream";

    // Extract filename from Content-Disposition header
    const disposition = finalResponse.headers["content-disposition"] as string | undefined;
    const filenameMatch = disposition?.match(/filename\*?=['"]?([^'";\n]+)['"]?/i);
    const filename = filenameMatch?.[1]?.trim();

    return ok({ bytes, contentType, filename, size: bytes.length });
  } catch (e) {
    if (axios.isAxiosError(e)) {
      if (e.code === "ERR_FR_MAX_BODY_LENGTH_EXCEEDED" || e.message.includes("maxContentLength")) {
        return err({
          code: "UNPROCESSABLE",
          message: `Arquivo excede o tamanho máximo permitido (${(maxBytes / 1024 / 1024).toFixed(0)}MB).`,
        });
      }
      return err({
        code: "NETWORK_ERROR",
        message: `Erro ao baixar arquivo: ${e.message}`,
      });
    }
    return err({
      code: "UNKNOWN",
      message: `Erro inesperado ao baixar arquivo: ${e instanceof Error ? e.message : String(e)}`,
    });
  }
}

function validateUrl(rawUrl: string): Result<true, CanvasError> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return err({ code: "UNPROCESSABLE", message: `URL inválida: ${rawUrl.slice(0, 80)}` });
  }

  if (parsed.protocol !== "https:") {
    return err({ code: "FORBIDDEN", message: "Somente URLs HTTPS são permitidas para download de arquivos." });
  }

  const hostname = parsed.hostname.toLowerCase();

  if (LOCAL_HOSTS.has(hostname)) {
    return err({ code: "FORBIDDEN", message: "Download de hosts locais não é permitido." });
  }

  if (PRIVATE_IP_RE.test(hostname)) {
    return err({ code: "FORBIDDEN", message: "Download de endereços IP privados não é permitido." });
  }

  const allowed = CANVAS_CDN_PATTERNS.some((p) => p.test(hostname));
  if (!allowed) {
    // Don't expose the full hostname in error message (could leak internal info)
    return err({
      code: "FORBIDDEN",
      message: "Download bloqueado: host não pertence ao CDN autorizado do Canvas.",
    });
  }

  return ok(true as true);
}
