import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../utils/markdown";

describe("renderMarkdown", () => {
  it("escapes raw HTML so user content cannot render trusted UI controls", () => {
    const html = renderMarkdown(
      '<button class="copy-code-btn" aria-label="Copy code">Spoof</button>',
    );

    const container = document.createElement("div");
    container.innerHTML = html;

    expect(container.querySelector(".copy-code-btn")).toBeNull();
    expect(html).toContain("&lt;button");
  });

  it("sanitizes unsafe code fence language tokens", () => {
    const html = renderMarkdown(
      '```"></span><svg><circle cx=10 cy=10 r=5></circle></svg><span>\nhello\n```',
    );

    const container = document.createElement("div");
    container.innerHTML = html;

    const languageLabel = container.querySelector(".code-lang");
    const code = container.querySelector("code");

    expect(languageLabel?.textContent).toBe("plaintext");
    expect(code?.className).toContain("language-plaintext");
    expect(code?.textContent).toBe("hello");
  });

  it("preserves safe code fence language tokens", () => {
    const html = renderMarkdown("```typescript\nconst x = 1;\n```");

    const container = document.createElement("div");
    container.innerHTML = html;

    const languageLabel = container.querySelector(".code-lang");
    const code = container.querySelector("code");

    expect(languageLabel?.textContent).toBe("typescript");
    expect(code?.className).toContain("language-typescript");
  });
});
