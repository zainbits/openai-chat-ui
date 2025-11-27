/**
 * Markdown rendering utilities with XSS protection
 * @module markdown
 */
import DOMPurify from "dompurify";
import { marked } from "marked";

// Configure marked for GitHub-Flavored Markdown
marked.use({
  gfm: true,
  breaks: true,
});

/** Allowed HTML tags for sanitization */
const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "u",
  "s",
  "code",
  "pre",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "blockquote",
  "a",
  "img",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "hr",
  "div",
  "span",
];

/** Allowed HTML attributes for sanitization */
const ALLOWED_ATTR = ["href", "src", "alt", "title", "class", "target", "rel"];

/**
 * Renders markdown content to sanitized HTML
 * Uses DOMPurify to prevent XSS attacks
 *
 * @param md - The markdown string to render
 * @returns Sanitized HTML string safe for dangerouslySetInnerHTML
 *
 * @example
 * ```tsx
 * <div dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }} />
 * ```
 */
export function renderMarkdown(md: string): string {
  const rawHtml = marked.parse(md) as string;
  return DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  });
}
