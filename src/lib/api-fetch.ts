/**
 * Wrapper around fetch that redirects to /login on 401 responses.
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(input, init);

  if (res.status === 401 && typeof window !== "undefined") {
    window.location.href = "/login";
    // Return a never-resolving promise so calling code doesn't continue
    return new Promise(() => {});
  }

  return res;
}
