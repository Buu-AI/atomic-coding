import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { Hono } from "npm:hono@^4.9.7";
import { log } from "../_shared/logger.ts";
import * as games from "../_shared/services/games.ts";
import * as atoms from "../_shared/services/atoms.ts";
import * as builds from "../_shared/services/builds.ts";
import * as externals from "../_shared/services/externals.ts";
import * as chat from "../_shared/services/chat.ts";

// =============================================================================
// App
// =============================================================================

const app = new Hono();

// =============================================================================
// Middleware: request logging
// =============================================================================

app.use("*", async (c, next) => {
  const start = performance.now();
  const method = c.req.method;
  const path = new URL(c.req.url).pathname;
  const requestId = crypto.randomUUID().slice(0, 8);

  log("info", "api:request:start", { requestId, method, path });

  await next();

  const durationMs = Math.round(performance.now() - start);
  const status = c.res.status;
  log("info", "api:request:end", { requestId, method, path, status, durationMs });
});

// =============================================================================
// Middleware: CORS
// =============================================================================

app.use("*", async (c, next) => {
  c.header("Access-Control-Allow-Origin", "*");
  c.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  c.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (c.req.method === "OPTIONS") {
    return c.body(null, 204);
  }
  await next();
});

// =============================================================================
// Health check
// =============================================================================

app.get("/", (c) =>
  c.json({ status: "ok", server: "atomic-coding-api", version: "2.0.0" }),
);

// =============================================================================
// Games
// =============================================================================

/** POST /games -- create a game */
app.post("/games", async (c) => {
  try {
    const body = await c.req.json();
    const game = await games.createGame(body.name, body.description);
    return c.json(game, 201);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400);
  }
});

/** GET /games -- list all games */
app.get("/games", async (c) => {
  try {
    const list = await games.listGames();
    return c.json(list);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

/** GET /games/:name -- get single game */
app.get("/games/:name", async (c) => {
  try {
    const game = await games.getGame(c.req.param("name"));
    if (!game) return c.json({ error: "Game not found" }, 404);
    return c.json(game);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

// =============================================================================
// External Registry (global, not game-scoped)
// =============================================================================

/** GET /registry/externals -- list all available external libraries */
app.get("/registry/externals", async (c) => {
  try {
    const list = await externals.listRegistry();
    return c.json(list);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

// =============================================================================
// Middleware: resolve game_id from :name for all /games/:name/* routes
// =============================================================================

app.use("/games/:name/*", async (c, next) => {
  try {
    const gameId = await games.resolveGameId(c.req.param("name"));
    c.set("gameId", gameId);
    await next();
  } catch (_err) {
    return c.json({ error: `Game not found: "${c.req.param("name")}"` }, 404);
  }
});

// =============================================================================
// Atoms (scoped to game)
// =============================================================================

/** GET /games/:name/structure -- atom map */
app.get("/games/:name/structure", async (c) => {
  try {
    const gameId = c.get("gameId") as string;
    const typeFilter = c.req.query("type") || undefined;
    const structure = await atoms.getCodeStructure(gameId, typeFilter);
    return c.json(structure);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

/** POST /games/:name/atoms/read -- read atoms by names */
app.post("/games/:name/atoms/read", async (c) => {
  try {
    const gameId = c.get("gameId") as string;
    const body = await c.req.json();
    if (!body.names || !Array.isArray(body.names) || body.names.length === 0) {
      return c.json({ error: "names must be a non-empty array" }, 400);
    }
    const result = await atoms.readAtoms(gameId, body.names);
    if (result.length === 0) {
      return c.json({ error: `No atoms found: ${body.names.join(", ")}` }, 404);
    }
    return c.json(result);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

/** POST /games/:name/atoms/search -- semantic search */
app.post("/games/:name/atoms/search", async (c) => {
  try {
    const gameId = c.get("gameId") as string;
    const body = await c.req.json();
    if (!body.query) return c.json({ error: "query is required" }, 400);
    const result = await atoms.semanticSearch(gameId, body.query, body.limit);
    return c.json(result);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

/** PUT /games/:name/atoms/:atom_name -- upsert atom */
app.put("/games/:name/atoms/:atom_name", async (c) => {
  try {
    const gameId = c.get("gameId") as string;
    const atomName = c.req.param("atom_name");
    const body = await c.req.json();
    const result = await atoms.upsertAtom(gameId, {
      name: atomName,
      code: body.code,
      type: body.type,
      inputs: body.inputs,
      outputs: body.outputs,
      dependencies: body.dependencies,
      description: body.description,
    });
    return c.json(result);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400);
  }
});

/** DELETE /games/:name/atoms/:atom_name -- delete atom */
app.delete("/games/:name/atoms/:atom_name", async (c) => {
  try {
    const gameId = c.get("gameId") as string;
    await atoms.deleteAtom(gameId, c.req.param("atom_name"));
    return c.json({ deleted: c.req.param("atom_name") });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400);
  }
});

// =============================================================================
// Externals (scoped to game)
// =============================================================================

/** GET /games/:name/externals -- list installed externals */
app.get("/games/:name/externals", async (c) => {
  try {
    const gameId = c.get("gameId") as string;
    const list = await externals.getInstalledExternals(gameId);
    return c.json(list);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

/** POST /games/:name/externals -- install an external */
app.post("/games/:name/externals", async (c) => {
  try {
    const gameId = c.get("gameId") as string;
    const body = await c.req.json();
    if (!body.name) {
      return c.json({ error: "name is required (e.g. \"three_js\")" }, 400);
    }
    const result = await externals.installExternal(gameId, body.name);
    return c.json(result, 201);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400);
  }
});

/** DELETE /games/:name/externals/:ext_name -- uninstall an external */
app.delete("/games/:name/externals/:ext_name", async (c) => {
  try {
    const gameId = c.get("gameId") as string;
    const extName = c.req.param("ext_name");
    await externals.uninstallExternal(gameId, extName);
    return c.json({ uninstalled: extName });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400);
  }
});

// =============================================================================
// Builds
// =============================================================================

/** GET /games/:name/builds -- list builds */
app.get("/games/:name/builds", async (c) => {
  try {
    const gameId = c.get("gameId") as string;
    const limit = parseInt(c.req.query("limit") || "20", 10);
    const list = await builds.listBuilds(gameId, limit);
    return c.json(list);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

/** POST /games/:name/builds -- trigger rebuild */
app.post("/games/:name/builds", async (c) => {
  try {
    const gameId = c.get("gameId") as string;
    atoms.triggerRebuild(gameId);
    return c.json({ status: "rebuild triggered", game_id: gameId });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

/** POST /games/:name/builds/:id/rollback -- rollback to build */
app.post("/games/:name/builds/:id/rollback", async (c) => {
  try {
    const gameId = c.get("gameId") as string;
    const buildId = c.req.param("id");
    const result = await builds.rollbackBuild(gameId, buildId);
    return c.json(result);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400);
  }
});

// =============================================================================
// Chat Sessions (scoped to game)
// =============================================================================

/** GET /games/:name/chat/sessions -- list sessions */
app.get("/games/:name/chat/sessions", async (c) => {
  try {
    const gameId = c.get("gameId") as string;
    const limit = parseInt(c.req.query("limit") || "20", 10);
    const sessions = await chat.listSessions(gameId, limit);
    return c.json(sessions);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

/** POST /games/:name/chat/sessions -- create session */
app.post("/games/:name/chat/sessions", async (c) => {
  try {
    const gameId = c.get("gameId") as string;
    const body = await c.req.json();
    const session = await chat.createSession(gameId, body.model, body.title);
    return c.json(session, 201);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400);
  }
});

/** DELETE /games/:name/chat/sessions/:sessionId -- delete session */
app.delete("/games/:name/chat/sessions/:sessionId", async (c) => {
  try {
    await chat.deleteSession(c.req.param("sessionId"));
    return c.json({ deleted: c.req.param("sessionId") });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400);
  }
});

/** GET /games/:name/chat/sessions/:sessionId/messages -- get messages */
app.get("/games/:name/chat/sessions/:sessionId/messages", async (c) => {
  try {
    const messages = await chat.getMessages(c.req.param("sessionId"));
    return c.json(messages);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

/** POST /games/:name/chat/sessions/:sessionId/messages -- save messages */
app.post("/games/:name/chat/sessions/:sessionId/messages", async (c) => {
  try {
    const body = await c.req.json();
    if (!body.messages || !Array.isArray(body.messages)) {
      return c.json({ error: "messages must be an array" }, 400);
    }
    await chat.saveMessages(c.req.param("sessionId"), body.messages);

    // Auto-set title from first user message if not set
    const session = await chat.getSession(c.req.param("sessionId"));
    if (!session.title) {
      const userMsg = body.messages.find((m: { role: string }) => m.role === "user");
      if (userMsg?.parts?.[0]?.text) {
        const title = userMsg.parts[0].text.slice(0, 100);
        await chat.updateSessionTitle(c.req.param("sessionId"), title);
      }
    }

    return c.json({ saved: body.messages.length });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400);
  }
});

// =============================================================================
// Start server
// =============================================================================

log("info", "API server starting", { version: "2.0.0" });
Deno.serve((req) => {
  const url = new URL(req.url);
  const stripped = url.pathname.replace(/^\/api/, "") || "/";
  const newUrl = new URL(stripped + url.search, url.origin);
  return app.fetch(new Request(newUrl.toString(), req));
});
