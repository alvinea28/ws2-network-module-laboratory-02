import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
const graph = JSON.parse(await readFile(".opencode/memory/graph.json", "utf8"));
const ids = new Set(graph.nodes.map((node) => node.id));
for (const node of graph.nodes) await access(node.id);
for (const edge of graph.edges) assert.ok(ids.has(edge.from) && ids.has(edge.to));
console.log(`Graph valid: ${ids.size} files`);
