const Database = require("better-sqlite3");
const path = require("path");
const http = require("http");

const dbPath = path.join(__dirname, "data", "local.db");
const db = new Database(dbPath);

const BASE_HOST = "localhost";
const BASE_PORT = 3000;

const stuck = db.prepare("UPDATE runs SET status = 'failed' WHERE status = 'running'").run();
if (stuck.changes > 0) console.log(`Cleaned up ${stuck.changes} stuck run(s)\n`);

const vaultRunIds = [
  "30de4487-32c9-4285-9c54-cb2d600a461b",
  "f99cd9d6-efa5-45d7-8064-0fd2c31904ea",
  "a63e93ba-269a-4ced-96e9-d3de77d8056f",
  "4e430868-999e-4fae-8fca-acf1d4635d48",
  "5cc1fcfa-2089-434c-a1e1-89d57880b745",
  "1da21545-83fc-44ee-a0d8-3ce2ffbe3d77",
  "13b2ab47-6465-4081-b488-d5598735f19e",
];

const activeModels = db.prepare("SELECT id FROM models WHERE is_active = 1").all();
const modelModes = {};
for (const m of activeModels) {
  modelModes[m.id] = { training: true, web: true };
}

const brand = db.prepare("SELECT name, domain FROM brands WHERE name = 'Vault Insurance'").get();
if (!brand) { console.error("Vault Insurance brand not found"); process.exit(1); }

const prompts = vaultRunIds.map(id => {
  const run = db.prepare("SELECT prompt_text FROM runs WHERE id = ?").get(id);
  return run?.prompt_text;
}).filter(Boolean);

db.close();

console.log(`Re-running ${prompts.length} Vault Insurance prompts`);
console.log(`Models: ${activeModels.length} active (training + web = ${activeModels.length * 2} calls/prompt)`);
console.log(`Brand: ${brand.name}`);
console.log("---\n");

function runPromptHttp(promptText, index) {
  return new Promise((resolve) => {
    const short = promptText.slice(0, 70) + "...";
    console.log(`[${index + 1}/${prompts.length}] "${short}"`);
    const start = Date.now();

    const payload = JSON.stringify({
      promptText,
      brandName: brand.name,
      brandDomain: brand.domain || undefined,
      modelModes,
    });

    const req = http.request({
      hostname: BASE_HOST,
      port: BASE_PORT,
      path: "/api/runs/stream",
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) },
      timeout: 10 * 60 * 1000,
    }, (res) => {
      let buffer = "";
      let runId = null;
      let currentEvent = "";
      const errors = [];
      let doneCount = 0;
      let totalJobs = 0;

      res.setTimeout(10 * 60 * 1000);
      res.setEncoding("utf8");

      res.on("data", (chunk) => {
        buffer += chunk;
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7);
          } else if (line.startsWith("data: ") && currentEvent) {
            try {
              const data = JSON.parse(line.slice(6));
              switch (currentEvent) {
                case "init":
                  totalJobs = data.totalJobs;
                  console.log(`  Jobs: ${totalJobs}`);
                  break;
                case "model_done":
                  doneCount++;
                  console.log(`  ${data.model} (${data.mode}) done (${data.elapsed}s) [${doneCount}/${totalJobs}]`);
                  break;
                case "model_error":
                  doneCount++;
                  errors.push(`${data.model} (${data.mode})`);
                  console.log(`  ${data.model} (${data.mode}) ERROR: ${data.error}`);
                  break;
                case "phase":
                  console.log(`  Phase: ${data.phase}`);
                  break;
                case "complete":
                  runId = data.runId;
                  break;
              }
            } catch {}
            currentEvent = "";
          }
        }
      });

      res.on("end", () => {
        const elapsed = ((Date.now() - start) / 1000).toFixed(0);
        if (runId) {
          console.log(`  Complete (${elapsed}s) — Run ID: ${runId}${errors.length > 0 ? ` (${errors.length} error(s))` : ""}\n`);
        } else {
          console.log(`  Finished without run ID (${elapsed}s)\n`);
        }
        resolve(runId);
      });

      res.on("error", (err) => {
        console.error(`  Response error: ${err.message}\n`);
        resolve(null);
      });
    });

    req.on("error", (err) => {
      console.error(`  Request error: ${err.message}\n`);
      resolve(null);
    });

    req.on("timeout", () => {
      console.error(`  Request timeout after 10 minutes\n`);
      req.destroy();
      resolve(null);
    });

    req.write(payload);
    req.end();
  });
}

async function main() {
  const startTime = Date.now();
  const newRunIds = [];

  for (let i = 0; i < prompts.length; i++) {
    const runId = await runPromptHttp(prompts[i], i);
    if (runId) newRunIds.push(runId);
  }

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log("===================================");
  console.log(`Done! ${newRunIds.length}/${prompts.length} completed in ${elapsed} minutes`);
  console.log("\nNew run IDs:");
  console.log(JSON.stringify(newRunIds, null, 2));
}

main().catch(console.error);
