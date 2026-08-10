import handler from "vinext/server/app-router-entry";
import type { D1Database } from "./storage";
import { json, storageRequest } from "./storage";

interface Fetcher {
  fetch(request: Request): Promise<Response>;
}

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/storage")) {
      try {
        return await storageRequest(request, env);
      } catch (error) {
        console.error(error);
        return json({ error: "Storage operation failed" }, 500);
      }
    }
    return handler.fetch(request, env, ctx);
  },
};
