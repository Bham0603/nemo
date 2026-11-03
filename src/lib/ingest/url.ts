/**
 * Safe Website URL Fetching & Content Ingestion Engine for RECALL.
 * Protects against SSRF, handles redirects securely, enforces size & timeout limits,
 * and extracts clean article text with Cheerio.
 */

import * as cheerio from "cheerio";
import { countWords } from "./chunker";
import { normalizeText, type ExtractionResult } from "./extract";
import { validateUrlForSsrf, SsrfSecurityError } from "./ssrf";

const MAX_HTML_BYTES = 10 * 1024 * 1024; // 10 MB limit
const FETCH_TIMEOUT_MS = 10000; // 10 seconds timeout
const MAX_REDIRECTS = 5;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 RECALL-KnowledgeBot/1.0";

export interface WebIngestResult extends ExtractionResult {
  url: string;
  finalUrl: string;
}

/**
 * Safely fetches a URL following redirects with SSRF re-validation at each hop.
 */
export async function safeFetchHtml(initialUrl: string): Promise<{ html: string; finalUrl: string }> {
  let currentUrl = (await validateUrlForSsrf(initialUrl)).toString();
  let redirectsRemaining = MAX_REDIRECTS;

  while (redirectsRemaining >= 0) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(currentUrl, {
        method: "GET",
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.5",
          "Accept-Language": "en-US,en;q=0.9",
        },
        redirect: "manual",
        signal: controller.signal,
      });

      // Handle HTTP redirects securely
      if (
        response.status === 301 ||
        response.status === 302 ||
        response.status === 303 ||
        response.status === 307 ||
        response.status === 308
      ) {
        const location = response.headers.get("location");
        if (!location) {
          throw new Error(`Received HTTP ${response.status} redirect without a Location header.`);
        }

        // Resolve destination URL (handles relative redirects like /about)
        const nextUrlObj = new URL(location, currentUrl);
        // CRITICAL: Re-validate redirect target to block redirection into private networks
        const validatedNextUrl = await validateUrlForSsrf(nextUrlObj.toString());

        currentUrl = validatedNextUrl.toString();
        redirectsRemaining--;

        if (redirectsRemaining < 0) {
          throw new Error("Too many redirects (maximum 5 permitted).");
        }
        continue;
      }

      if (!response.ok) {
        throw new Error(`Website responded with HTTP status ${response.status} (${response.statusText}).`);
      }

      // Check Content-Type
      const contentType = response.headers.get("content-type") || "";
      if (
        !contentType.includes("text/html") &&
        !contentType.includes("application/xhtml+xml") &&
        !contentType.includes("text/plain")
      ) {
        throw new Error(
          `Unsupported webpage content-type '${contentType}'. Only HTML and text pages can be ingested.`,
        );
      }

      // Check Content-Length if present
      const contentLength = response.headers.get("content-length");
      if (contentLength && parseInt(contentLength, 10) > MAX_HTML_BYTES) {
        throw new Error(`Webpage exceeds maximum allowed download size of 10 MB.`);
      }

      // Stream / read text with size ceiling
      const text = await response.text();
      if (text.length > MAX_HTML_BYTES) {
        throw new Error(`Webpage body exceeded maximum allowed download size of 10 MB.`);
      }

      return { html: text, finalUrl: currentUrl };
    } catch (err: unknown) {
      if (err instanceof SsrfSecurityError) {
        throw err;
      }
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(`Webpage fetch timed out after ${FETCH_TIMEOUT_MS / 1000} seconds.`);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error("Redirect limit exceeded.");
}

/**
 * Ingests a website URL: validates SSRF, downloads HTML, extracts text and metadata.
 */
export async function ingestWebsiteUrl(urlString: string): Promise<WebIngestResult> {
  const { html, finalUrl } = await safeFetchHtml(urlString);

  const $ = cheerio.load(html);

  // Remove scripts, styles, forms, ads, navigation, and noise elements
  $(
    "script, style, noscript, iframe, svg, canvas, nav, footer, header, aside, form, button, [role='navigation'], [role='banner'], [role='alert'], .ad, .ads, .advertisement",
  ).remove();

  // Extract page title
  const ogTitle = $('meta[property="og:title"]').attr("content");
  const metaTitle = $("title").text().trim();
  const firstH1 = $("h1").first().text().trim();
  const title = (ogTitle || metaTitle || firstH1 || new URL(finalUrl).hostname).slice(0, 200);

  // Extract description
  const description =
    $('meta[name="description"]').attr("content") ||
    $('meta[property="og:description"]').attr("content") ||
    undefined;

  // Extract main article or body content
  // Look for semantic tags first: <main>, <article>, #content, .post-content, etc.
  let contentContainer = $("article");
  if (!contentContainer.length) {
    contentContainer = $("main");
  }
  if (!contentContainer.length) {
    contentContainer = $("#content, .content, #main, .main, .post, .article");
  }
  if (!contentContainer.length) {
    contentContainer = $("body");
  }

  // Convert headings, paragraphs, and list items into structured markdown
  const textParts: string[] = [];

  contentContainer.find("h1, h2, h3, h4, h5, h6, p, ul, ol, blockquote, pre, code").each((_, elem) => {
    const el = $(elem);
    const tagName = elem.type === "tag" ? elem.tagName.toLowerCase() : "";
    const directText = el.text().trim();
    if (!directText) return;

    if (tagName === "h1") {
      textParts.push(`\n# ${directText}\n`);
    } else if (tagName === "h2") {
      textParts.push(`\n## ${directText}\n`);
    } else if (tagName === "h3") {
      textParts.push(`\n### ${directText}\n`);
    } else if (tagName.startsWith("h")) {
      textParts.push(`\n#### ${directText}\n`);
    } else if (tagName === "p") {
      textParts.push(`${directText}\n`);
    } else if (tagName === "blockquote") {
      textParts.push(`> ${directText}\n`);
    } else if (tagName === "ul" || tagName === "ol") {
      const items = el
        .find("li")
        .map((__, li) => `* ${$(li).text().trim()}`)
        .get()
        .join("\n");
      if (items) textParts.push(`${items}\n`);
    } else if (tagName === "pre") {
      textParts.push(`\`\`\`\n${directText}\n\`\`\`\n`);
    }
  });

  let extractedText = textParts.join("\n");
  if (!extractedText.trim()) {
    // Fallback to body text if selector didn't match structured elements
    extractedText = contentContainer.text();
  }

  const cleaned = normalizeText(extractedText);
  const words = countWords(cleaned);

  if (words < 10) {
    throw new Error("Webpage contained insufficient readable text content.");
  }

  return {
    title,
    text: cleaned,
    pages: [{ pageNumber: 1, text: cleaned }],
    pageCount: 1,
    wordCount: words,
    isScanned: false,
    url: urlString,
    finalUrl,
    metadata: {
      format: "website",
      url: urlString,
      finalUrl,
      description,
      hostname: new URL(finalUrl).hostname,
    },
  };
}

