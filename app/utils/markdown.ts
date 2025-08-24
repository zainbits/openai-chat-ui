import { marked } from "marked";

marked.use({
  gfm: true,
  breaks: true,
});

export function renderMarkdown(md: string): string {
  // NOTE: marked does not sanitize HTML by default. Avoid rendering untrusted HTML.
  return marked.parse(md) as string;
}
