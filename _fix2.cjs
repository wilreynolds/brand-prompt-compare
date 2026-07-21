const Database = require("better-sqlite3");
const path = require("path");
const db = new Database(path.join(__dirname, "data", "local.db"));

// Check responses for the stuck run
const runId = "ffe392a4-4ee8-4c17-9720-e7daee16a488";
const responses = db.prepare("SELECT r.mode, m.display_name, LENGTH(r.raw_text) as len FROM responses r JOIN models m ON m.id = r.model_id WHERE r.run_id = ?").all(runId);
console.log("Responses for stuck run:", JSON.stringify(responses, null, 2));

// If it has responses, mark it completed
if (responses.length > 0) {
  db.prepare("UPDATE runs SET status = 'completed', completed_at = ? WHERE id = ?").run(new Date().toISOString(), runId);
  console.log("Marked as completed with", responses.length, "responses");
}

db.close();
