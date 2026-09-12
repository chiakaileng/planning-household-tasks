import type { IHtmlTextExtractor } from "@/ingestion/IHtmlTextExtractor";

/**
 * Cheap readable text for the LLM fallback.
 * We do not write per-site scrapers — this only strips markup.
 */
export class HtmlTextExtractor implements IHtmlTextExtractor {
  toPlainText(html: string): string {
    const withoutNoise = html
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?>[\s\S]*?<\/noscript>/gi, " ");

    const withoutTags = withoutNoise.replace(/<[^>]+>/g, " ");
    return decodeBasicEntities(withoutTags).replace(/\s+/g, " ").trim();
  }
}

function decodeBasicEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}
