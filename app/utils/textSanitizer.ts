/**
 * Utility for sanitizing text by replacing non-ASCII characters with ASCII equivalents.
 * Useful for cleaning up LLM outputs that contain "smart" punctuation, invisible
 * Unicode watermarks, and other non-ASCII artifacts that might break code
 * compilers/interpreters or leave AI fingerprints.
 *
 * Comprehensive map sourced from detectgpt unicode-map.
 */

export const NON_ASCII_REPLACEMENTS: Record<string, string> = {
  // ── Smart / Curly Quotes ──────────────────────────────────
  "\u2018": "'", // Left Single Quotation Mark
  "\u2019": "'", // Right Single Quotation Mark / Apostrophe
  "\u201A": "'", // Single Low-9 Quotation Mark
  "\u201C": '"', // Left Double Quotation Mark
  "\u201D": '"', // Right Double Quotation Mark
  "\u201E": '"', // Double Low-9 Quotation Mark
  "\u2039": "<", // Single Left-Pointing Angle Quotation
  "\u203A": ">", // Single Right-Pointing Angle Quotation
  "\u00AB": "<<", // Left-Pointing Double Angle Quotation (guillemet)
  "\u00BB": ">>", // Right-Pointing Double Angle Quotation (guillemet)

  // ── Dashes ────────────────────────────────────────────────
  "\u2014": "-", // Em Dash
  "\u2013": "-", // En Dash
  "\u2012": "-", // Figure Dash
  "\u2015": "-", // Horizontal Bar
  "\u2010": "-", // Hyphen
  "\u2011": "-", // Non-Breaking Hyphen
  "\u00AD": "", // Soft Hyphen (removed)

  // ── Spaces & Whitespace ───────────────────────────────────
  "\u00A0": " ", // Non-Breaking Space
  "\u2002": " ", // En Space
  "\u2003": " ", // Em Space
  "\u2009": " ", // Thin Space
  "\u200A": " ", // Hair Space
  "\u202F": " ", // Narrow No-Break Space
  "\u205F": " ", // Medium Mathematical Space

  // ── Invisible Characters ──────────────────────────────────
  "\u200B": "", // Zero-Width Space
  "\u200C": "", // Zero-Width Non-Joiner
  "\u200D": "", // Zero-Width Joiner
  "\uFEFF": "", // Zero-Width No-Break Space (BOM)
  "\u200E": "", // Left-to-Right Mark
  "\u200F": "", // Right-to-Left Mark
  "\u2060": "", // Word Joiner
  "\u2061": "", // Function Application
  "\u2062": "", // Invisible Times
  "\u2063": "", // Invisible Separator
  "\u2064": "", // Invisible Plus

  // ── Punctuation ───────────────────────────────────────────
  "\u2026": "...", // Horizontal Ellipsis
  "\u2022": "*", // Bullet
  "\u2023": ">", // Triangular Bullet
  "\u2043": "-", // Hyphen Bullet
  "\u00B7": ".", // Middle Dot
  "\u2027": ".", // Hyphenation Point
  "\u2032": "'", // Prime (feet/minutes)
  "\u2033": '"', // Double Prime (inches/seconds)
  "\u00D7": "x", // Multiplication Sign
  "\u2212": "-", // Minus Sign (mathematical)
  "\u2248": "~=", // Almost Equal To
  "\u2260": "!=", // Not Equal To
  "\u2264": "<=", // Less-Than or Equal To
  "\u2265": ">=", // Greater-Than or Equal To
  "\u2192": "->", // Rightwards Arrow
  "\u2190": "<-", // Leftwards Arrow
  "\u00A9": "(c)", // Copyright Sign
  "\u00AE": "(R)", // Registered Sign
  "\u2122": "(TM)", // Trade Mark Sign
  "\u3010": "[", // Left Black Lenticular Bracket
  "\u3011": "]", // Right Black Lenticular Bracket
  "\uFF5B": "{", // Fullwidth Left Curly Bracket
  "\uFF5D": "}", // Fullwidth Right Curly Bracket
};

/** Pre-built lookup map for O(1) per-character checking */
const charMap = new Map<string, string>(Object.entries(NON_ASCII_REPLACEMENTS));

/**
 * Count how many non-ASCII characters from the known map exist in the text.
 * @param text The text to scan
 * @returns The number of known non-ASCII characters found
 */
export function countNonAscii(text: string): number {
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    if (charMap.has(text[i])) count++;
  }
  return count;
}

/**
 * Replaces non-ASCII characters in a string with their ASCII equivalents.
 * Uses a single-pass character scan for performance on large texts.
 * @param text The text to sanitize
 * @returns The sanitized text with all known non-ASCII characters replaced
 */
export function sanitizeText(text: string): string {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const replacement = charMap.get(text[i]);
    result += replacement !== undefined ? replacement : text[i];
  }
  return result;
}
