export interface VerificationResult {
  url: string;
  isVerified: boolean;
  statusCode?: number;
}

// Verify a single URL with a HEAD request
async function verifyUrl(url: string): Promise<VerificationResult> {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { url, isVerified: false };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "BrandPromptCompare/1.0 (source-verification)",
      },
    });

    clearTimeout(timeout);

    return {
      url,
      isVerified: response.ok,
      statusCode: response.status,
    };
  } catch {
    return { url, isVerified: false };
  }
}

// Verify multiple URLs in parallel with concurrency limit
export async function verifyUrls(
  urls: string[],
  concurrency: number = 10
): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];
  const unique = [...new Set(urls)];

  for (let i = 0; i < unique.length; i += concurrency) {
    const batch = unique.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(verifyUrl));
    results.push(...batchResults);
  }

  return results;
}
