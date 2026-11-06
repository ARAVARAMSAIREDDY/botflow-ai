import dns from 'dns';
import * as cheerio from 'cheerio';
import { logger } from '../utils/logger.js';

/**
 * Validates whether an IP address is private, loopback, or cloud metadata (SSRF Guard)
 */
export function isPrivateOrReservedIP(ip) {
  // IPv4 checks
  if (ip.includes('.')) {
    const parts = ip.split('.').map(p => parseInt(p, 10));
    if (parts.length !== 4 || parts.some(isNaN)) return true;

    // 0.0.0.0/8
    if (parts[0] === 0) return true;
    // 10.0.0.0/8 (Private)
    if (parts[0] === 10) return true;
    // 127.0.0.0/8 (Loopback)
    if (parts[0] === 127) return true;
    // 169.254.0.0/16 (Link-local, AWS/GCP metadata service 169.254.169.254)
    if (parts[0] === 169 && parts[1] === 254) return true;
    // 172.16.0.0/12 (Private)
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16 (Private)
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 100.64.0.0/10 (Carrier-grade NAT)
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;
    // 224.0.0.0/4 (Multicast)
    if (parts[0] >= 224) return true;
    return false;
  }

  // IPv6 checks
  if (ip.includes(':')) {
    const lower = ip.toLowerCase();
    // Loopback ::1
    if (lower === '::1' || lower === '::' || lower.startsWith('fe80:') || lower.startsWith('fc00:') || lower.startsWith('fd00:')) {
      return true;
    }
    return false;
  }

  return true;
}

/**
 * Validates a URL for SSRF vulnerabilities before fetching
 */
export async function validateUrlForSSRF(targetUrl) {
  let parsed;
  try {
    parsed = new URL(targetUrl);
  } catch (err) {
    throw new Error('Invalid URL format.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only HTTP and HTTPS URLs are allowed.');
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block localhost and standard aliases
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '0.0.0.0'
  ) {
    throw new Error('Access to local hostnames and private loopback addresses is forbidden.');
  }

  // Resolve hostname via DNS to verify IP isn't private/cloud-metadata
  try {
    const lookupResult = await dns.promises.lookup(hostname, { all: true });
    for (const record of lookupResult) {
      if (isPrivateOrReservedIP(record.address)) {
        throw new Error(`Hostname resolves to restricted/private IP address (${record.address}). Access denied.`);
      }
    }
  } catch (dnsErr) {
    if (dnsErr.message.includes('restricted/private')) throw dnsErr;
    throw new Error(`Could not resolve hostname "${hostname}": ${dnsErr.message}`);
  }

  return parsed;
}

/**
 * Scrapes readable content from a validated website URL
 */
export async function scrapeWebsite(targetUrl) {
  const parsed = await validateUrlForSSRF(targetUrl);

  logger.info(`Scraping website: ${parsed.href}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000); // 12-second timeout

  try {
    const response = await fetch(parsed.href, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'BotFlow-AI-Bot/1.0 (+https://botflow.ai/bot-crawler)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Website responded with HTTP status ${response.status} (${response.statusText})`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain') && !contentType.includes('application/xhtml')) {
      throw new Error(`Unsupported content type "${contentType}". Only HTML or text web pages can be scraped.`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove boilerplate, ads, cookie banners, navigation, scripts
    $(
      'script, style, noscript, nav, footer, header, aside, iframe, svg, form, ' +
      '.advertisement, .ad, .ads, #cookie-banner, #consent-modal, .cookie-notice, ' +
      '[role="banner"], [role="navigation"], [aria-hidden="true"]'
    ).remove();

    // Extract title & description
    const title = $('title').text().trim() || 
                  $('meta[property="og:title"]').attr('content') || 
                  parsed.hostname;

    const description = $('meta[name="description"]').attr('content') || 
                        $('meta[property="og:description"]').attr('content') || '';

    // Prefer main or article if present, otherwise body
    let container = $('main, article');
    if (container.length === 0) {
      container = $('body');
    }

    // Clean whitespace and extract clean readable text
    const rawText = container.text();
    const cleanText = rawText
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n+/g, '\n\n')
      .trim();

    if (cleanText.length < 50) {
      throw new Error('Extracted text is too short or page appears to be empty/JavaScript-rendered.');
    }

    return {
      title,
      description,
      url: parsed.href,
      text: cleanText,
      charCount: cleanText.length
    };
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      throw new Error('Request timed out while trying to fetch the website.');
    }
    throw err;
  }
}

export const webScraperService = {
  isPrivateOrReservedIP,
  validateUrlForSSRF,
  scrapeWebsite
};
