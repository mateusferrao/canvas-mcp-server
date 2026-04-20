import { parse } from "node-html-parser";

/**
 * Represents a Canvas file link extracted from HTML.
 */
export interface FileLink {
  fileId: number;
  courseId: number | undefined;
  linkText: string;
  href: string;
}

// Canvas file URL patterns:
// /courses/:courseId/files/:fileId
// /courses/:courseId/files/:fileId/download
// /files/:fileId
// /files/:fileId/download
const CANVAS_FILE_HREF_RE = /(?:\/courses\/(\d+))?\/files\/(\d+)(?:\/\w+)?/;

/**
 * Extracts Canvas file links from an HTML string.
 *
 * Handles:
 * - Standard <a href="/courses/:c/files/:f"> links
 * - <a href="/files/:f"> links (no course context)
 * - data-api-endpoint attributes with File returntype
 * - Deduplicates by fileId (first occurrence wins)
 */
export function extractFileLinks(
  html: string,
  opts: { defaultCourseId?: number } = {}
): FileLink[] {
  if (!html || !html.trim()) return [];

  const root = parse(html);
  const seen = new Set<number>();
  const links: FileLink[] = [];

  for (const el of root.querySelectorAll("a")) {
    const href = el.getAttribute("href") ?? "";
    const apiEndpoint = el.getAttribute("data-api-endpoint") ?? "";
    const apiReturnType = el.getAttribute("data-api-returntype") ?? "";

    // Prefer data-api-endpoint when marked as File
    const target = apiReturnType === "File" && apiEndpoint ? apiEndpoint : href;

    const match = CANVAS_FILE_HREF_RE.exec(target);
    if (!match) continue;

    const courseId = match[1] ? parseInt(match[1], 10) : opts.defaultCourseId;
    const fileId = parseInt(match[2]!, 10);

    if (isNaN(fileId)) continue;
    if (seen.has(fileId)) continue;
    seen.add(fileId);

    links.push({
      fileId,
      courseId,
      linkText: el.text.trim(),
      href: href || target,
    });
  }

  return links;
}
