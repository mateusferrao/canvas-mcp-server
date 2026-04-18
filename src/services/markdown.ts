import TurndownService from "turndown";

const td = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
});

/**
 * Converts Canvas HTML content to clean Markdown.
 * Used by Pages and Discussions formatters.
 */
export function htmlToMarkdown(html: string): string {
  if (!html || html.trim() === "") return "";
  return td.turndown(html);
}
