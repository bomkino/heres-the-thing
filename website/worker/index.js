const HTML_REQUEST = /\btext\/html\b/i;
const DOCUMENT_METHODS = new Set(["GET", "HEAD"]);

function withSecurityHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "SAMEORIGIN");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

const worker = {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return withSecurityHeaders(response);

    const acceptsHTML = HTML_REQUEST.test(request.headers.get("accept") ?? "");
    if (!DOCUMENT_METHODS.has(request.method) || !acceptsHTML) {
      return withSecurityHeaders(response);
    }

    const indexURL = new URL("/index.html", request.url);
    const indexRequest = new Request(indexURL, {
      method: request.method,
      headers: request.headers,
    });
    return withSecurityHeaders(await env.ASSETS.fetch(indexRequest));
  },
};

export default worker;
