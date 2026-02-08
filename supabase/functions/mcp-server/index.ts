// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { McpServer } from "npm:@modelcontextprotocol/sdk@1.25.3/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "npm:@modelcontextprotocol/sdk@1.25.3/server/webStandardStreamableHttp.js";
import { Hono } from "npm:hono@^4.9.7";
import { z } from "npm:zod@^4.1.13";
import { log, withLog } from "../_shared/logger.ts";
import { validateGameId } from "../_shared/services/games.ts";
import * as atoms from "../_shared/services/atoms.ts";
import * as externals from "../_shared/services/externals.ts";

// =============================================================================
// Port schema (reused across tools)
// =============================================================================

const portSchema = z.object({
  name: z.string(),
  type: z.enum([
    "number",
    "string",
    "boolean",
    "number[]",
    "string[]",
    "boolean[]",
    "void",
  ]),
  description: z.string().optional(),
  optional: z.boolean().optional().default(false),
});

// =============================================================================
// MCP Server factory -- creates a server scoped to a game_id
// =============================================================================

function createMcpServer(gameId: string): McpServer {
  const server = new McpServer({
    name: "atomic-coding",
    version: "2.0.0",
  });

  // ---------------------------------------------------------------------------
  // Tool 1: get_code_structure
  // ---------------------------------------------------------------------------
  server.registerTool(
    "get_code_structure",
    {
      title: "Get Code Structure",
      description:
        "Retrieve the map of all atoms: names, types, typed inputs/outputs, and direct dependencies. No source code returned. Use this to understand what exists before reading or editing.",
      inputSchema: {
        type_filter: z
          .enum(["core", "feature", "util"])
          .optional()
          .describe("Filter atoms by type"),
      },
    },
    async ({ type_filter }) => {
      return withLog("mcp:get_code_structure", { gameId, type_filter }, async () => {
        const [atomStructure, installed] = await Promise.all([
          atoms.getCodeStructure(gameId, type_filter),
          externals.getInstalledExternals(gameId),
        ]);

        const result = {
          externals: installed.map((ext) => ({
            name: ext.name,
            global_name: ext.global_name,
            version: ext.version,
            description: ext.description,
          })),
          atoms: atomStructure,
        };

        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
      });
    },
  );

  // ---------------------------------------------------------------------------
  // Tool 2: read_atoms
  // ---------------------------------------------------------------------------
  server.registerTool(
    "read_atoms",
    {
      title: "Read Atoms",
      description:
        "Read the full source code, typed interface, and dependencies of one or more atoms by name.",
      inputSchema: {
        names: z
          .array(z.string())
          .min(1)
          .describe("Array of atom names to read"),
      },
    },
    async ({ names }) => {
      return withLog("mcp:read_atoms", { gameId, names }, async () => {
        const data = await atoms.readAtoms(gameId, names);

        if (data.length === 0) {
          return {
            content: [
              { type: "text" as const, text: `No atoms found with names: ${names.join(", ")}` },
            ],
            isError: true,
          };
        }

        const formatted = data
          .map((a) => {
            const sig = atoms.formatSignature(a.inputs, a.outputs);
            return [
              `// === ${a.name} (${a.type}) v${a.version} ===`,
              `// ${a.description || "No description"}`,
              `// Signature: ${sig}`,
              `// Depends on: [${a.depends_on.join(", ")}]`,
              a.code,
            ].join("\n");
          })
          .join("\n\n");

        return { content: [{ type: "text" as const, text: formatted }] };
      });
    },
  );

  // ---------------------------------------------------------------------------
  // Tool 3: semantic_search
  // ---------------------------------------------------------------------------
  server.registerTool(
    "semantic_search",
    {
      title: "Semantic Search",
      description:
        "Find atoms by meaning using natural language. Uses vector similarity search. Use when you don't know the exact name of what you're looking for.",
      inputSchema: {
        query: z
          .string()
          .describe("Natural language query, e.g. 'jump logic' or 'how damage is calculated'"),
        limit: z
          .number()
          .min(1)
          .max(20)
          .optional()
          .default(5)
          .describe("Max results to return"),
      },
    },
    async ({ query, limit }) => {
      return withLog("mcp:semantic_search", { gameId, query, limit }, async () => {
        const data = await atoms.semanticSearch(gameId, query, limit);

        if (data.length === 0) {
          return {
            content: [{ type: "text" as const, text: `No atoms found matching: "${query}"` }],
          };
        }

        const formatted = data
          .map((a) => {
            const sig = atoms.formatSignature(a.inputs, a.outputs);
            return [
              `// ${a.name} (${a.type}) [similarity: ${a.similarity.toFixed(3)}]`,
              `// ${a.description || "No description"}`,
              `// Signature: ${sig}`,
              `// Depends on: [${a.depends_on.join(", ")}]`,
              a.code,
            ].join("\n");
          })
          .join("\n\n");

        return { content: [{ type: "text" as const, text: formatted }] };
      });
    },
  );

  // ---------------------------------------------------------------------------
  // Tool 4: read_externals
  // ---------------------------------------------------------------------------
  server.registerTool(
    "read_externals",
    {
      title: "Read Externals",
      description:
        "Read the full API surface of one or more installed external libraries. Call this BEFORE writing atom code that uses an external library (e.g. THREE.*) to verify which classes, methods, and constants are available.",
      inputSchema: {
        names: z
          .array(z.string())
          .min(1)
          .describe("Array of external names to read (e.g. [\"three_js\"])"),
      },
    },
    async ({ names }) => {
      return withLog("mcp:read_externals", { gameId, names }, async () => {
        const data = await externals.readExternals(gameId, names);

        if (data.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No installed externals found with names: ${names.join(", ")}. Check get_code_structure() to see what's installed.`,
              },
            ],
            isError: true,
          };
        }

        const formatted = data
          .map((ext) => {
            return [
              `// === ${ext.display_name} (${ext.global_name}) v${ext.version} ===`,
              `// ${ext.description || "No description"}`,
              `// CDN: ${ext.cdn_url}`,
              ``,
              ext.api_surface,
            ].join("\n");
          })
          .join("\n\n");

        return { content: [{ type: "text" as const, text: formatted }] };
      });
    },
  );

  // ---------------------------------------------------------------------------
  // Tool 5: upsert_atom
  // ---------------------------------------------------------------------------
  server.registerTool(
    "upsert_atom",
    {
      title: "Upsert Atom",
      description:
        "Create a new atom or update an existing one. Define its typed interface (inputs/outputs), code, and dependencies. Automatically recalculates embeddings and triggers a game rebuild.",
      inputSchema: {
        name: z
          .string()
          .regex(/^[a-z][a-z0-9_]*$/, "Must be snake_case")
          .describe("Unique name for the atom (snake_case)"),
        code: z
          .string()
          .describe("Complete JS source code of the function (max 2048 bytes)"),
        type: z.enum(["core", "feature", "util"]).describe("Atom category"),
        inputs: z
          .array(portSchema)
          .optional()
          .default([])
          .describe("Typed input parameters"),
        outputs: z
          .array(portSchema)
          .optional()
          .default([])
          .describe("Typed return values"),
        dependencies: z
          .array(z.string())
          .optional()
          .default([])
          .describe("Names of other atoms this code calls/depends on"),
        description: z
          .string()
          .optional()
          .describe("Brief description for search indexing"),
      },
    },
    async ({ name, code, type, inputs, outputs, dependencies, description }) => {
      return withLog("mcp:upsert_atom", { gameId, name, type }, async () => {
        try {
          const result = await atoms.upsertAtom(gameId, {
            name,
            code,
            type,
            inputs,
            outputs,
            dependencies,
            description,
          });
          return {
            content: [
              {
                type: "text" as const,
                text: `Atom "${result.name}" saved (${type}). Signature: ${result.signature}. Dependencies: [${result.dependencies.join(", ")}]. Rebuild triggered.`,
              },
            ],
          };
        } catch (err) {
          return {
            content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }],
            isError: true,
          };
        }
      });
    },
  );

  // ---------------------------------------------------------------------------
  // Tool 6: delete_atom
  // ---------------------------------------------------------------------------
  server.registerTool(
    "delete_atom",
    {
      title: "Delete Atom",
      description:
        "Delete an atom from the system. Will fail if other atoms depend on it -- update or delete those first.",
      inputSchema: {
        name: z.string().describe("Name of the atom to delete"),
      },
    },
    async ({ name }) => {
      return withLog("mcp:delete_atom", { gameId, name }, async () => {
        try {
          await atoms.deleteAtom(gameId, name);
          return {
            content: [
              { type: "text" as const, text: `Atom "${name}" deleted. Rebuild triggered.` },
            ],
          };
        } catch (err) {
          return {
            content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }],
            isError: true,
          };
        }
      });
    },
  );

  return server;
}

// =============================================================================
// HTTP Server
// =============================================================================

const app = new Hono();

// Request logging middleware
app.use("*", async (c, next) => {
  const start = performance.now();
  const method = c.req.method;
  const path = new URL(c.req.url).pathname;
  const requestId = crypto.randomUUID().slice(0, 8);

  log("info", "mcp:request:start", { requestId, method, path });

  await next();

  const durationMs = Math.round(performance.now() - start);
  const status = c.res.status;
  log("info", "mcp:request:end", { requestId, method, path, status, durationMs });
});

// Health check
app.get("/", (c) =>
  c.json({ status: "ok", server: "atomic-coding-mcp", version: "2.0.0" }),
);

// MCP endpoint -- all methods
// Reads x-game-id from header, validates it, then creates a game-scoped MCP server
app.all("*", async (c) => {
  const gameId = c.req.header("x-game-id");
  if (!gameId) {
    return c.json(
      { error: "Missing x-game-id header. Set it in your MCP client config." },
      400,
    );
  }

  // Validate the game exists
  try {
    await validateGameId(gameId);
  } catch (_err) {
    return c.json(
      { error: `Invalid x-game-id: game "${gameId}" not found.` },
      404,
    );
  }

  const server = createMcpServer(gameId);
  const transport = new WebStandardStreamableHTTPServerTransport();
  await server.connect(transport);
  return transport.handleRequest(c.req.raw);
});

log("info", "MCP server starting", { version: "2.0.0" });
Deno.serve(app.fetch);
