/**
 * Anti-SSRF (Server-Side Request Forgery) Validation Engine for RECALL.
 * Validates URLs and resolved IP addresses against private, loopback,
 * link-local, carrier-grade NAT, and cloud metadata endpoints.
 */

import dns from "node:dns/promises";
import net from "node:net";

export class SsrfSecurityError extends Error {
  constructor(message: string) {
    super(`SSRF Protection Blocked Request: ${message}`);
    this.name = "SsrfSecurityError";
  }
}

/**
 * Checks if an IPv4 address is in a private, loopback, link-local, or reserved range.
 */
export function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map((n) => parseInt(n, 10));
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true; // Malformed IP is treated as unsafe
  }

  const [b0, b1] = parts;

  // 0.0.0.0/8 (Broadcast/Current network)
  if (b0 === 0) return true;

  // 127.0.0.0/8 (Loopback)
  if (b0 === 127) return true;

  // 10.0.0.0/8 (Private RFC 1918)
  if (b0 === 10) return true;

  // 172.16.0.0/12 (Private RFC 1918: 172.16.0.0 – 172.31.255.255)
  if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;

  // 192.168.0.0/16 (Private RFC 1918)
  if (b0 === 192 && b1 === 168) return true;

  // 169.254.0.0/16 (Link-local, including 169.254.169.254 AWS/GCP/Azure metadata)
  if (b0 === 169 && b1 === 254) return true;

  // 100.64.0.0/10 (Carrier-grade NAT, including 100.100.100.200 Alibaba metadata)
  if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;

  // 198.18.0.0/15 (Benchmarking)
  if (b0 === 198 && (b1 === 18 || b1 === 19)) return true;

  // 224.0.0.0/4 (Multicast: 224.0.0.0 - 239.255.255.255)
  if (b0 >= 224 && b0 <= 239) return true;

  // 240.0.0.0/4 (Reserved / Future use: 240.0.0.0 - 255.255.255.255)
  if (b0 >= 240) return true;

  return false;
}

/**
 * Checks if an IPv6 address is in a private, loopback, link-local, or mapped range.
 */
export function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase().trim();

  // ::1 (Loopback) or :: (Unspecified)
  if (normalized === "::1" || normalized === "::") return true;

  // fe80::/10 (Link-local)
  if (normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb")) {
    return true;
  }

  // fc00::/7 (Unique local address: fc00:: - fdff::)
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) {
    return true;
  }

  // IPv4-mapped IPv6 (::ffff:x.x.x.x or ::ffff:xxxx:xxxx)
  if (normalized.includes("::ffff:")) {
    const rawIpv4 = normalized.split("::ffff:").pop();
    if (rawIpv4) {
      if (net.isIPv4(rawIpv4)) {
        return isPrivateIPv4(rawIpv4);
      }
    }
    return true;
  }

  return false;
}

/**
 * Validates a single IP address against private/internal ranges.
 */
export function isPrivateIP(ip: string): boolean {
  if (net.isIPv4(ip)) {
    return isPrivateIPv4(ip);
  }
  if (net.isIPv6(ip)) {
    return isPrivateIPv6(ip);
  }
  return true; // Non-standard or unparseable is rejected
}

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "local",
  "metadata.google.internal",
  "metadata.internal",
  "instance-data",
]);

/**
 * Performs strict validation on a user-provided URL and its DNS resolutions.
 * Rejects internal hostnames, metadata endpoints, non-HTTP schemes, and private IPs.
 */
export async function validateUrlForSsrf(urlString: string): Promise<URL> {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(urlString.trim());
  } catch {
    throw new SsrfSecurityError("Invalid URL format");
  }

  // Enforce protocol: HTTP or HTTPS only
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new SsrfSecurityError(
      `Unsupported protocol '${parsedUrl.protocol}'. Only http: and https: are permitted.`,
    );
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  // Block obvious dangerous hostnames
  if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    throw new SsrfSecurityError(`Access to host '${hostname}' is strictly prohibited.`);
  }

  // If hostname is directly an IP address
  if (net.isIP(hostname)) {
    if (isPrivateIP(hostname)) {
      throw new SsrfSecurityError(
        `Direct access to internal IP address '${hostname}' is prohibited.`,
      );
    }
    return parsedUrl;
  }

  // Perform DNS resolution for all A and AAAA records
  try {
    const records = await dns.lookup(hostname, { all: true });

    if (!records || records.length === 0) {
      throw new SsrfSecurityError(`Could not resolve hostname '${hostname}'.`);
    }

    // Verify EVERY resolved IP address
    for (const record of records) {
      if (isPrivateIP(record.address)) {
        throw new SsrfSecurityError(
          `Hostname '${hostname}' resolved to prohibited internal address '${record.address}'.`,
        );
      }
    }
  } catch (err: unknown) {
    if (err instanceof SsrfSecurityError) {
      throw err;
    }
    const msg = err instanceof Error ? err.message : "DNS lookup failed";
    throw new SsrfSecurityError(`DNS resolution failed for '${hostname}': ${msg}`);
  }

  return parsedUrl;
}

