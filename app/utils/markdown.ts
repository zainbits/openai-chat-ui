import DOMPurify from "dompurify";
import { marked } from "marked";

marked.use({
  gfm: true,
  breaks: true,
});

export function renderMarkdown(md: string): string {
  // Parse markdown and sanitize to prevent XSS attacks
  const rawHtml = marked.parse(md) as string;
  return DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "u", "s", "code", "pre",
      "h1", "h2", "h3", "h4", "h5", "h6",
      "ul", "ol", "li", "blockquote", "a", "img",
      "table", "thead", "tbody", "tr", "th", "td",
      "hr", "div", "span",
    ],
    ALLOWED_ATTR: ["href", "src", "alt", "title", "class", "target", "rel"],
  });
}
