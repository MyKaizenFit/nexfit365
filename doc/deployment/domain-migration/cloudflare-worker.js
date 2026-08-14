/**
 * TEMPLATE / NO APLICADO
 *
 * Cloudflare Worker de referencia para NexFit bajo metodosk.com/nexfit.
 *
 * Route (exacta, no metodosk.com/* ni metodosk.com/nexfit*):
 *   metodosk.com/nexfit
 *   metodosk.com/nexfit/*
 *
 * Origin: https://origin-nexfit.metodosk.com  (mismo path /nexfit/...)
 *
 * Secret: env.NEXFIT_ORIGIN_TOKEN (Cloudflare Worker Secret, no en Git).
 * Nginx del origin exige el mismo valor en X-Nexfit-Origin-Token.
 *
 * No intercepta la landing. No intercepta uploads.metodosk.com.
 * No cachea API ni SW.
 */

const ORIGIN = "https://origin-nexfit.metodosk.com";
const ORIGIN_HOST = new URL(ORIGIN).hostname;

export default {
  async fetch(request, env, _ctx) {
    const inbound = new URL(request.url);

    if (inbound.hostname === ORIGIN_HOST) {
      return new Response("Not found", { status: 403 });
    }

    if (inbound.pathname !== "/nexfit" && !inbound.pathname.startsWith("/nexfit/")) {
      return new Response("Not found", { status: 404 });
    }

    const token = env && env.NEXFIT_ORIGIN_TOKEN;
    if (!token) {
      return new Response("Origin token is not configured", { status: 500 });
    }

    const outbound = new URL(inbound.pathname + inbound.search, ORIGIN);
    if (outbound.origin !== new URL(ORIGIN).origin) {
      return new Response("Bad origin", { status: 500 });
    }

    const headers = new Headers(request.headers);
    // Host must come from the origin URL (origin-nexfit.metodosk.com).
    // Copying the inbound Host (metodosk.com) would miss the origin server_name.
    headers.delete("Host");
    headers.set("X-Forwarded-Host", inbound.host);
    headers.set("X-Forwarded-Proto", inbound.protocol.replace(":", ""));
    headers.set("X-Nexfit-Origin-Token", token);

    const init = {
      method: request.method,
      headers,
      redirect: "manual",
    };

    if (inbound.pathname.startsWith("/nexfit/api/") || inbound.pathname === "/nexfit/sw.js") {
      init.cache = "no-store";
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = request.body;
    }

    const response = await fetch(new Request(outbound.toString(), init));
    const outHeaders = new Headers(response.headers);
    outHeaders.delete("X-Nexfit-Origin-Token");
    const cache = cacheControlFor(inbound.pathname);
    if (cache) {
      outHeaders.set("Cache-Control", cache);
    }
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: outHeaders,
    });
  },
};

function cacheControlFor(pathname) {
  if (pathname.startsWith("/nexfit/api/") || pathname === "/nexfit/sw.js") {
    return "private, no-store";
  }
  return null;
}
