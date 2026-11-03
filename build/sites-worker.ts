import handler from "vinext/server/fetch-handler";
import { localeFromHosting } from "../lib/locale-policy.mjs";
import { compressedPlaceResponse } from "../lib/compressed-place-assets.mjs";
import { runWithConnectorBinding } from "../lib/connector-context";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";

export default {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>) {
    if (new URL(request.url).pathname === "/api/locale") {
      if (!["GET", "HEAD"].includes(request.method)) return new Response(null, {status: 405, headers: {Allow: "GET, HEAD"}});
      const value = localeFromHosting(request.cf);
      return new Response(request.method === "HEAD" ? null : JSON.stringify(value), {
        headers: {"Content-Type": "application/json; charset=utf-8", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"},
      });
    }
    // Only the new German city index needs a canonical document bridge.
    // Handle it before framework trailing-slash normalization and asset index redirects.
    const cityUrl = new URL(request.url);
    if (["GET", "HEAD"].includes(request.method) && /^\/de\/flensburg(?:\/|\/index(?:\.html)?)?$/.test(cityUrl.pathname)) {
      cityUrl.pathname = "/de/flensburg/map";
      return Response.redirect(cityUrl.toString(), 302);
    }
    // Locale-neutral datasets share one asset; preserve existing English URLs.
    const sharedData = new Map(Object.entries({
      "/en/vienna/places.json": "/vienna/places.json",
      "/en/research/bars-2026-10-14/bar-registry.json": "/research/bars-2026-10-14/bar-registry.json",
      "/en/research/bars-2026-10-14/bars.json": "/research/bars-2026-10-14/bars.json",
      "/en/paris/paris-data-derived.json": "/paris/paris-data-derived.json",
    }));
    const sharedPath = sharedData.get(cityUrl.pathname);
    if (["GET", "HEAD"].includes(request.method) && sharedPath) {
      cityUrl.pathname = sharedPath;
      return Response.redirect(cityUrl.toString(), 302);
    }
    let binding = ctx.props?.CONNECTORS;
    const compressedPlaces = await compressedPlaceResponse(request, env.ASSETS);
    if (compressedPlaces) return compressedPlaces;
    // Local preview emulates the same request-scoped capability. This branch and
    // the auxiliary service binding are absent from production builds.
    if (import.meta.env.DEV && !binding && env.CONNECTORS) {
      const preview = env.CONNECTORS;
      const expiresAt = Date.now() + 60_000;
      binding = {
        async getContext() {
          if (Date.now() >= expiresAt) return { status: "request_context_expired" };
          return preview.getContext?.() ?? { status: "binding_unavailable" };
        },
        async invoke(connectorId, actionName, args) {
          if (Date.now() >= expiresAt) {
            return { status: "request_context_expired", message: "This request has expired. Please try again." };
          }
          return preview.invoke(connectorId, actionName, args);
        },
      };
    }
    return runWithConnectorBinding(binding, () => handler.fetch(request, env, ctx));
  },
};
