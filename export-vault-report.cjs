const Database = require("better-sqlite3");
const { readFileSync, writeFileSync } = require("fs");
const { join } = require("path");

const dbPath = join(__dirname, "data", "local.db");
const db = new Database(dbPath, { readonly: true });

const runIds = [
  "30de4487-32c9-4285-9c54-cb2d600a461b",
  "f99cd9d6-efa5-45d7-8064-0fd2c31904ea",
  "a63e93ba-269a-4ced-96e9-d3de77d8056f",
  "4e430868-999e-4fae-8fca-acf1d4635d48",
  "5cc1fcfa-2089-434c-a1e1-89d57880b745",
  "1da21545-83fc-44ee-a0d8-3ce2ffbe3d77",
  "13b2ab47-6465-4081-b488-d5598735f19e",
];

let logoBase64 = "";
try {
  const buf = readFileSync(join(__dirname, "public", "seer-logo.png"));
  logoBase64 = "data:image/png;base64," + buf.toString("base64");
} catch {}

function esc(s) {
  if (!s) return "";
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function urlMatchesDomain(url, domain) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    const d = domain.toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    return hostname === d || hostname.endsWith("." + d);
  } catch { return false; }
}

function loadRun(id) {
  const run = db.prepare("SELECT * FROM runs WHERE id = ?").get(id);
  if (!run) return null;
  run.modelsUsed = run.models_used ? JSON.parse(run.models_used) : [];

  run.runBrands = db.prepare(
    "SELECT rb.*, b.name as brand_name, b.domain as brand_domain FROM run_brands rb JOIN brands b ON b.id = rb.brand_id WHERE rb.run_id = ? ORDER BY rb.position"
  ).all(id).map(rb => ({ position: rb.position, brand: { id: rb.brand_id, name: rb.brand_name, domain: rb.brand_domain } }));

  const responses = db.prepare(
    "SELECT r.*, m.display_name as model_name, m.provider as model_provider FROM responses r JOIN models m ON m.id = r.model_id WHERE r.run_id = ?"
  ).all(id);

  run.responses = responses.map(resp => {
    const pcs = db.prepare(
      "SELECT pc.*, b.name as brand_name FROM parsed_comparisons pc LEFT JOIN brands b ON b.id = pc.brand_id WHERE pc.response_id = ?"
    ).all(resp.id).map(pc => ({
      brand: { name: pc.brand_name },
      pros: JSON.parse(pc.pros || "[]"),
      cons: JSON.parse(pc.cons || "[]"),
      strengths: JSON.parse(pc.strengths || "[]"),
      weaknesses: JSON.parse(pc.weaknesses || "[]"),
      conceptEvidence: JSON.parse(pc.concept_evidence || "{}"),
    }));

    const sources = db.prepare(
      "SELECT s.*, b.name as brand_name FROM sources s LEFT JOIN brands b ON b.id = s.brand_id WHERE s.response_id = ?"
    ).all(resp.id).map(s => ({
      url: s.url,
      title: s.title,
      isVerified: s.is_verified === 1 ? true : s.is_verified === 0 ? false : null,
      brand: s.brand_name ? { name: s.brand_name } : null,
    }));

    return {
      id: resp.id,
      rawText: resp.raw_text,
      mode: resp.mode,
      model: { displayName: resp.model_name },
      parsedComparisons: pcs,
      sources,
    };
  });

  run.conceptScores = db.prepare(
    "SELECT cs.*, b.name as brand_name FROM concept_scores cs LEFT JOIN brands b ON b.id = cs.brand_id WHERE cs.run_id = ?"
  ).all(id).map(cs => ({
    conceptName: cs.concept_name,
    score: cs.score,
    mode: cs.mode,
    brand: { name: cs.brand_name },
  }));

  return run;
}

function getVisibility(response) {
  const pc = response.parsedComparisons?.[0];
  if (!pc) return null;
  const visible = pc.conceptEvidence?._visible;
  const evidence = pc.conceptEvidence?._evidence;
  if (visible === undefined) return null;
  return { visible: visible === "true", evidence: evidence || "" };
}

function renderVisibilitySummary(responses, trackedBrand) {
  if (!trackedBrand || responses.length === 0) return "";
  const pills = responses.map(r => {
    const vis = getVisibility(r);
    const bg = vis === null ? "#f3f4f6" : vis.visible ? "#dcfce7" : "#fee2e2";
    const color = vis === null ? "#6b7280" : vis.visible ? "#166534" : "#991b1b";
    const icon = vis === null ? "?" : vis.visible ? "&#10003;" : "&#10007;";
    return `<span style="display:inline-flex;align-items:center;gap:6px;background:${bg};color:${color};border-radius:9999px;padding:4px 12px;font-size:13px;font-weight:500">${icon} ${esc(r.model.displayName)}</span>`;
  }).join(" ");
  return `<div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:20px">
    <h4 style="font-size:13px;font-weight:600;color:#374151;margin:0 0 10px 0">Brand Visibility</h4>
    <div style="display:flex;flex-wrap:wrap;gap:8px">${pills}</div>
  </div>`;
}

function renderResponses(responses, trackedBrand) {
  if (responses.length === 0) return '<p style="color:#9ca3af;text-align:center;padding:24px 0">No responses for this mode.</p>';
  return responses.map(r => {
    const vis = getVisibility(r);
    let visBadge = "";
    if (vis !== null) {
      const bg = vis.visible ? "#dcfce7" : "#fee2e2";
      const color = vis.visible ? "#166534" : "#991b1b";
      const label = vis.visible ? `&#10003; ${esc(trackedBrand?.name || "")} mentioned` : `&#10007; ${esc(trackedBrand?.name || "")} not mentioned`;
      visBadge = `<span style="background:${bg};color:${color};border-radius:9999px;padding:2px 10px;font-size:12px;font-weight:500">${label}</span>`;
    }
    let evidenceBlock = "";
    if (vis !== null && vis.visible && vis.evidence) {
      evidenceBlock = `<div style="background:#f0fdf4;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:13px"><strong style="color:#166534">Evidence:</strong> <em style="color:#15803d">&ldquo;${esc(vis.evidence)}&rdquo;</em></div>`;
    }
    if (vis !== null && !vis.visible) {
      evidenceBlock = `<div style="background:#fef2f2;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:13px;color:#991b1b">${esc(trackedBrand?.name || "")} was not mentioned in this response.</div>`;
    }
    return `<details style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:10px">
      <summary style="display:flex;align-items:center;gap:10px;padding:14px 18px;cursor:pointer;list-style:none;font-weight:600;color:#111827;font-size:14px">
        ${esc(r.model.displayName)}
        <span style="background:#f3f4f6;border-radius:4px;padding:2px 8px;font-size:11px;font-weight:400;color:#6b7280">${esc(r.mode)}</span>
        ${visBadge}
      </summary>
      <div style="border-top:1px solid #e5e7eb;padding:14px 18px">
        ${evidenceBlock}
        <div style="white-space:pre-wrap;font-size:13px;color:#374151;line-height:1.6">${esc(r.rawText)}</div>
      </div>
    </details>`;
  }).join("\n");
}

function renderSources(responses, trackedBrand) {
  const allSources = responses.flatMap(r =>
    (r.sources || []).map(s => ({
      url: s.url, title: s.title,
      brandName: s.brand?.name || null,
      brandDomain: trackedBrand?.domain || null,
      modelName: r.model.displayName,
      isVerified: s.isVerified,
    }))
  );
  if (allSources.length === 0) return '<p style="color:#9ca3af;text-align:center;padding:24px 0">No sources found.</p>';
  const rows = allSources.map(s => {
    const icon = s.isVerified === true ? "&#9989;" : s.isVerified === false ? "&#10060;" : "&#9203;";
    let domainCell = '<span style="color:#9ca3af;font-size:11px">No domain</span>';
    if (s.brandDomain) {
      const matches = urlMatchesDomain(s.url, s.brandDomain);
      domainCell = matches
        ? `<span style="background:#dcfce7;color:#166534;border-radius:9999px;padding:2px 8px;font-size:11px;font-weight:500">&#9989; ${esc(s.brandDomain)}</span>`
        : `<span style="background:#fee2e2;color:#991b1b;border-radius:9999px;padding:2px 8px;font-size:11px;font-weight:500">&#10060; Not ${esc(s.brandDomain)}</span>`;
    }
    return `<tr style="border-bottom:1px solid #f3f4f6">
      <td style="padding:8px 12px;text-align:center;font-size:14px">${icon}</td>
      <td style="padding:8px 12px"><a href="${esc(s.url)}" target="_blank" rel="noopener" style="color:#2563eb;text-decoration:none;font-weight:500;font-size:13px">${esc(s.title || s.url)}</a>${s.title ? `<div style="font-size:10px;color:#9ca3af;margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:350px">${esc(s.url)}</div>` : ""}</td>
      <td style="padding:8px 12px;color:#4b5563;font-size:13px">${esc(s.brandName || "General")}</td>
      <td style="padding:8px 12px;text-align:center">${domainCell}</td>
      <td style="padding:8px 12px;color:#4b5563;font-size:13px">${esc(s.modelName)}</td>
    </tr>`;
  }).join("\n");
  return `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">
    <thead><tr style="border-bottom:1px solid #e5e7eb;background:#f9fafb">
      <th style="padding:8px 12px;text-align:left;font-weight:600;color:#4b5563;font-size:12px">Status</th>
      <th style="padding:8px 12px;text-align:left;font-weight:600;color:#4b5563;font-size:12px">Source</th>
      <th style="padding:8px 12px;text-align:left;font-weight:600;color:#4b5563;font-size:12px">Brand</th>
      <th style="padding:8px 12px;text-align:left;font-weight:600;color:#4b5563;font-size:12px">Domain</th>
      <th style="padding:8px 12px;text-align:left;font-weight:600;color:#4b5563;font-size:12px">Model</th>
    </tr></thead><tbody>${rows}</tbody></table></div>`;
}

function renderRunSection(run, index) {
  const trackedBrand = run.runBrands[0]?.brand;
  const runDate = new Date(run.completed_at || run.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const modelNames = (run.modelsUsed || []).map(m => m.displayName).join(", ");
  const trainingResponses = run.responses.filter(r => r.mode === "training");
  const webResponses = run.responses.filter(r => r.mode === "web");

  const promptShort = run.prompt_text.length > 120 ? run.prompt_text.slice(0, 120) + "..." : run.prompt_text;

  let html = `
    <section id="run-${index + 1}" style="margin-bottom:48px;page-break-before:${index > 0 ? "always" : "auto"}">
      <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);border-radius:12px;padding:20px 24px;margin-bottom:20px;color:#fff">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
          <span style="background:rgba(255,255,255,0.2);border-radius:9999px;padding:4px 14px;font-size:13px;font-weight:600">Scenario ${index + 1} of 7</span>
          <span style="font-size:13px;opacity:0.8">${runDate}</span>
        </div>
        <div style="font-size:14px;opacity:0.9;line-height:1.5;font-style:italic">&ldquo;${esc(promptShort)}&rdquo;</div>
        <div style="font-size:12px;opacity:0.7;margin-top:8px">Models: ${esc(modelNames)}</div>
      </div>

      <details style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:16px;font-size:13px;color:#374151">
        <summary style="padding:12px 16px;cursor:pointer;list-style:none;font-weight:600;color:#6b7280;font-size:12px">Full Prompt Text</summary>
        <div style="padding:12px 16px;border-top:1px solid #e5e7eb;white-space:pre-wrap;line-height:1.6">${esc(run.prompt_text)}</div>
      </details>`;

  if (trainingResponses.length > 0) {
    html += `
      <div style="margin-bottom:24px">
        <h3 style="font-size:15px;font-weight:700;color:#111827;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #e5e7eb">Training Data</h3>
        ${renderVisibilitySummary(trainingResponses, trackedBrand)}
        ${renderResponses(trainingResponses, trackedBrand)}
        <div style="margin-top:16px">
          <h4 style="font-size:13px;font-weight:600;color:#374151;margin-bottom:8px">Sources</h4>
          <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:12px">${renderSources(trainingResponses, trackedBrand)}</div>
        </div>
      </div>`;
  }

  if (webResponses.length > 0) {
    html += `
      <div style="margin-bottom:24px">
        <h3 style="font-size:15px;font-weight:700;color:#111827;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #2563eb">Web Search</h3>
        ${renderVisibilitySummary(webResponses, trackedBrand)}
        ${renderResponses(webResponses, trackedBrand)}
        <div style="margin-top:16px">
          <h4 style="font-size:13px;font-weight:600;color:#374151;margin-bottom:8px">Sources</h4>
          <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:12px">${renderSources(webResponses, trackedBrand)}</div>
        </div>
      </div>`;
  }

  html += `</section>`;
  return html;
}

// --- Main ---
const allRuns = runIds.map(id => loadRun(id)).filter(Boolean);

const tocItems = allRuns.map((run, i) => {
  const short = run.prompt_text.length > 80 ? run.prompt_text.slice(0, 80) + "..." : run.prompt_text;
  const trainingCount = run.responses.filter(r => r.mode === "training").length;
  const webCount = run.responses.filter(r => r.mode === "web").length;
  return `<tr style="border-bottom:1px solid #f3f4f6">
    <td style="padding:10px 16px;font-weight:600;color:#2563eb"><a href="#run-${i + 1}" style="text-decoration:none">${i + 1}</a></td>
    <td style="padding:10px 16px;font-size:13px;color:#374151">${esc(short)}</td>
    <td style="padding:10px 16px;text-align:center;font-size:13px;color:#6b7280">${trainingCount}</td>
    <td style="padding:10px 16px;text-align:center;font-size:13px;color:#6b7280">${webCount}</td>
  </tr>`;
}).join("\n");

const runSections = allRuns.map((run, i) => renderRunSection(run, i)).join("\n");
const exportDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Vault Insurance — AI Brand Visibility Report</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f9fafb; color: #111827; line-height: 1.5; }
  a { color: #2563eb; }
  a:hover { text-decoration: underline; }
  details > summary { list-style: none; }
  details > summary::-webkit-details-marker { display: none; }
  @media print {
    body { background: #fff; font-size: 11px; }
    details { break-inside: avoid; }
    section { break-before: page; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>
  <nav style="background:#fff;border-bottom:1px solid #e5e7eb;padding:12px 24px;display:flex;align-items:center;gap:16px;position:sticky;top:0;z-index:100">
    ${logoBase64 ? `<img src="${logoBase64}" alt="Seer Interactive" style="height:36px;opacity:0.9">` : ""}
    <span style="font-size:18px;font-weight:700;color:#111827">Brand Prompt Compare</span>
    <span style="margin-left:auto;font-size:13px;color:#9ca3af">Exported ${exportDate}</span>
  </nav>

  <div style="max-width:960px;margin:0 auto;padding:32px 16px">

    <!-- Title -->
    <div style="text-align:center;margin-bottom:40px">
      <h1 style="font-size:28px;font-weight:800;color:#111827;margin-bottom:8px">Vault Insurance</h1>
      <p style="font-size:16px;color:#6b7280">AI Brand Visibility Report &mdash; 7 High-Net-Worth Insurance Scenarios</p>
      <p style="font-size:14px;color:#9ca3af;margin-top:4px">Generated May 15, 2026 &bull; Exported ${exportDate}</p>
    </div>

    <!-- Table of Contents -->
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:40px">
      <h2 style="font-size:16px;font-weight:700;color:#111827;margin-bottom:12px">Scenarios</h2>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="border-bottom:1px solid #e5e7eb;background:#f9fafb">
          <th style="padding:8px 16px;text-align:left;font-weight:600;color:#4b5563;font-size:12px">#</th>
          <th style="padding:8px 16px;text-align:left;font-weight:600;color:#4b5563;font-size:12px">Prompt</th>
          <th style="padding:8px 16px;text-align:center;font-weight:600;color:#4b5563;font-size:12px">Training</th>
          <th style="padding:8px 16px;text-align:center;font-weight:600;color:#4b5563;font-size:12px">Web</th>
        </tr></thead>
        <tbody>${tocItems}</tbody>
      </table>
    </div>

    <!-- Run Sections -->
    ${runSections}

    <footer style="margin-top:48px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;text-align:center">
      Generated by Brand Prompt Compare &mdash; Seer Interactive
    </footer>
  </div>
</body>
</html>`;

const outPath = join(__dirname, "vault-insurance-report.html");
writeFileSync(outPath, html, "utf-8");
console.log("Written to:", outPath);
console.log("Size:", (Buffer.byteLength(html) / 1024).toFixed(0) + " KB");
console.log("Runs included:", allRuns.length);
