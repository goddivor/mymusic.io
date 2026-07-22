export type TextSegment = {
  text: string;
  link: boolean;
};

function decodeEntities(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

/**
 * Splits an HTML snippet (YouTube comment text) into plain-text segments,
 * marking anchor contents (timestamps, links) so the UI can tint them.
 * All other tags are stripped.
 */
export function parseHtmlText(html: string): TextSegment[] {
  if (!html) return [];
  const segments: TextSegment[] = [];
  const anchor = /<a\b[^>]*>([\s\S]*?)<\/a>/gi;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = anchor.exec(html)) !== null) {
    if (m.index > last) {
      const plain = decodeEntities(html.slice(last, m.index).replace(/<[^>]+>/g, ''));
      if (plain) segments.push({ text: plain, link: false });
    }
    const linkText = decodeEntities(m[1].replace(/<[^>]+>/g, ''));
    if (linkText) segments.push({ text: linkText, link: true });
    last = m.index + m[0].length;
  }
  if (last < html.length) {
    const plain = decodeEntities(html.slice(last).replace(/<[^>]+>/g, ''));
    if (plain) segments.push({ text: plain, link: false });
  }
  return segments;
}
