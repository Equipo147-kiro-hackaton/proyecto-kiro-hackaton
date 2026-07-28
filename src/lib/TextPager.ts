/**
 * TextPager — Pure utility that splits text into pages of limited lines and line length.
 *
 * No import of 'phaser'.
 */

/**
 * Split text into pages of at most `maxLines` lines, each at most `maxLineLength` chars.
 * Words are never broken mid-word; long words that exceed maxLineLength are placed alone.
 * The concatenation of all lines across all pages preserves the original word sequence.
 */
export function paginate(text: string, maxLineLength: number, maxLines: number): string[] {
  if (!text || maxLineLength <= 0 || maxLines <= 0) return [];

  const words = text.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return [];

  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (currentLine.length === 0) {
      currentLine = word;
    } else if (currentLine.length + 1 + word.length <= maxLineLength) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  const pages: string[] = [];
  for (let i = 0; i < lines.length; i += maxLines) {
    const pageLines = lines.slice(i, i + maxLines);
    pages.push(pageLines.join('\n'));
  }

  return pages;
}
