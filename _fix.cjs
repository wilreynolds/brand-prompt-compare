const Database = require("better-sqlite3");
const path = require("path");
const db = new Database(path.join(__dirname, "data", "local.db"));

// Check if run 1 actually completed on the server
const recentRuns = db.prepare("SELECT id, status, created_at, completed_at FROM runs WHERE created_at > '2026-05-18T14:00:00' ORDER BY created_at DESC").all();
console.log("Recent runs:", JSON.stringify(recentRuns, null, 2));

// Deactivate broken Gemini 3.1 Flash Preview
const result = db.prepare("UPDATE models SET is_active = 0 WHERE openrouter_id = 'google/gemini-3.1-flash-preview'").run();
console.log("\nDeactivated gemini-3.1-flash-preview:", result.changes, "row(s)");

// Show remaining active models
const active = db.prepare("SELECT display_name, openrouter_id FROM models WHERE is_active = 1").all();
console.log("\nActive models:", active.map(m => `${m.display_name} (${m.openrouter_id})`).join(", "));

db.close();
