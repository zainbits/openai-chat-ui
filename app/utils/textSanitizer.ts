/**
 * Utility for sanitizing text by replacing non-ASCII characters with ASCII equivalents.
 * Useful for cleaning up LLM outputs that contain "smart" punctuation which might break code compilers/interpreters.
 */

export const NON_ASCII_REPLACEMENTS: Record<string, string> = {
  // Quotes
  "‘": "'", // Left single quote
  "’": "'", // Right single quote
  "“": '"', // Left double quote
  "”": '"', // Right double quote
  "«": '"', // Left guillemet
  "»": '"', // Right guillemet

  // Dashes and Hyphens
  "—": "-", // Em dash
  "–": "-", // En dash
  "−": "-", // Minus sign (mathematical)

  // Other common symbols
  "…": "...", // Ellipsis
  "•": "*", // Bullet
};

/**
 * Replaces non-ASCII characters in a string with their ASCII equivalents based on the defined map.
 * @param text The text to sanitize
 * @returns The sanitized text
 */
export function sanitizeText(text: string): string {
  let sanitized = text;
  Object.entries(NON_ASCII_REPLACEMENTS).forEach(([nonAscii, ascii]) => {
    sanitized = sanitized.split(nonAscii).join(ascii);
  });
  return sanitized;
}
