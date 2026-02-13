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

// Configure custom renderer for code blocks
const renderer = {
  code({ text, lang }: { text: string; lang?: string }) {
    const language = (lang || "").split(/\s+/)[0];
    // Simple HTML escape for the code content
    const escapedText = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

    const copyButton = `
<button class="copy-code-btn" aria-label="Copy code">
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>
</button>`;

    const sanitizeButton = `
<button class="sanitize-copy-btn" aria-label="Sanitize and copy">
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
  <span class="btn-label">ASCII</span>
</button>`;

    return `
<div class="code-block-wrapper">
  <div class="code-block-header">
    <span class="code-lang">${language}</span>
    <div class="code-block-actions">
      <span class="ascii-badge"></span>
      ${sanitizeButton}
      ${copyButton}
    </div>
  </div>
  <pre><code class="language-${language}">${escapedText}</code></pre>
</div>`;
  },
};

// @ts-ignore - marked types might differ slightly across versions but this structure is supported
marked.use({ renderer });

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
  // Additional tags for code block and copy button
  "button",
  "svg",
  "path",
  "rect",
  "polyline",
  "line",
  "circle",
  "defs",
  "linearGradient",
  "stop",
  "g",
];

/** Allowed HTML attributes for sanitization */
const ALLOWED_ATTR = [
  "href",
  "src",
  "alt",
  "title",
  "class",
  "target",
  "rel",
  // SVG attributes
  "viewBox",
  "fill",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "d",
  "x",
  "y",
  "width",
  "height",
  "rx",
  "ry",
  "cx",
  "cy",
  "r",
  "aria-label",
];

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
  // @ts-ignore - marked types issue
  const rawHtml = marked.parse(md) as string;
  return DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  });
}
