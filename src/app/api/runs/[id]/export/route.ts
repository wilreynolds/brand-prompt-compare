import { NextRequest, NextResponse } from "next/server";
import { db, runs } from "@/lib/db";
import { eq } from "drizzle-orm";
import { readFileSync } from "fs";
import { join } from "path";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const run = await db.query.runs.findFirst({
      where: eq(runs.id, id),
      with: {
        runBrands: {
          with: { brand: true },
          orderBy: (rb: any, { asc }: any) => [asc(rb.position)],
        },
        responses: {
          with: {
            model: true,
            parsedComparisons: {
              with: { brand: true },
            },
            sources: {
              with: { brand: true },
            },
          },
        },
        conceptScores: {
          with: { brand: true },
        },
      },
    });

    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    let logoBase64 = "";
    try {
      const logoPath = join(process.cwd(), "public", "seer-logo.png");
      const logoBuffer = readFileSync(logoPath);
      logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`;
    } catch {
      // Logo not found — skip it
    }

    const html = renderStaticHTML(run, logoBase64);
    const trackedBrand = run.runBrands[0]?.brand?.name || "report";
    const dateStr = new Date(run.completedAt || run.createdAt).toISOString().slice(0, 10);
    const filename = `brand-report-${trackedBrand.toLowerCase().replace(/\s+/g, "-")}-${dateStr}.html`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error exporting run:", error);
    return NextResponse.json({ error: "Failed to export run" }, { status: 500 });
  }
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function urlMatchesDomain(url: string, domain: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    const d = domain.toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    return hostname === d || hostname.endsWith("." + d);
  } catch {
    return false;
  }
}

function renderStaticHTML(run: any, logoBase64: string): string {
  const trackedBrand = run.runBrands[0]?.brand;
  const runDate = new Date(run.completedAt || run.createdAt).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
  const modelNames = (run.modelsUsed || []).map((m: any) => m.displayName).join(", ");

  const trainingResponses = run.responses.filter((r: any) => r.mode === "training");
  const webResponses = run.responses.filter((r: any) => r.mode === "web");

  function getVisibility(response: any) {
    const pc = response.parsedComparisons?.[0];
    if (!pc) return null;
    const visible = pc.conceptEvidence?._visible;
    const evidence = pc.conceptEvidence?._evidence;
    if (visible === undefined) return null;
    return { visible: visible === "true", evidence: evidence || "" };
  }

  function renderVisibilitySummary(responses: any[]): string {
    if (!trackedBrand || responses.length === 0) return "";
    const pills = responses.map((r: any) => {
      const vis = getVisibility(r);
      const bg = vis === null ? "#f3f4f6" : vis.visible ? "#dcfce7" : "#fee2e2";
      const color = vis === null ? "#6b7280" : vis.visible ? "#166534" : "#991b1b";
      const icon = vis === null ? "?" : vis.visible ? "&#10003;" : "&#10007;";
      return `<span style="display:inline-flex;align-items:center;gap:6px;background:${bg};color:${color};border-radius:9999px;padding:4px 12px;font-size:13px;font-weight:500">${icon} ${esc(r.model.displayName)}</span>`;
    }).join("\n            ");
    return `
        <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:24px">
          <h3 style="font-size:14px;font-weight:600;color:#374151;margin:0 0 12px 0">Brand Visibility Summary</h3>
          <div style="display:flex;flex-wrap:wrap;gap:8px">
            ${pills}
          </div>
        </div>`;
  }

  function renderResponses(responses: any[]): string {
    if (responses.length === 0) return '<p style="color:#9ca3af;text-align:center;padding:32px 0">No responses for this mode.</p>';
    return responses.map((r: any) => {
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
        evidenceBlock = `<div style="background:#f0fdf4;border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:14px"><strong style="color:#166534">Evidence:</strong> <em style="color:#15803d">&ldquo;${esc(vis.evidence)}&rdquo;</em></div>`;
      }
      if (vis !== null && !vis.visible) {
        evidenceBlock = `<div style="background:#fef2f2;border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:14px;color:#991b1b">${esc(trackedBrand?.name || "")} was not mentioned in this response.</div>`;
      }

      return `
          <details style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:12px" open>
            <summary style="display:flex;align-items:center;gap:10px;padding:16px 20px;cursor:pointer;list-style:none;font-weight:600;color:#111827">
              ${esc(r.model.displayName)}
              <span style="background:#f3f4f6;border-radius:4px;padding:2px 8px;font-size:12px;font-weight:400;color:#6b7280">${esc(r.mode)}</span>
              ${visBadge}
            </summary>
            <div style="border-top:1px solid #e5e7eb;padding:16px 20px">
              ${evidenceBlock}
              <div style="white-space:pre-wrap;font-size:14px;color:#374151;line-height:1.6">${esc(r.rawText)}</div>
            </div>
          </details>`;
    }).join("\n");
  }

  function renderSources(responses: any[]): string {
    const allSources = responses.flatMap((r: any) =>
      (r.sources || []).map((s: any) => ({
        url: s.url,
        title: s.title,
        brandName: s.brand?.name || null,
        brandDomain: trackedBrand?.domain || null,
        modelName: r.model.displayName,
        isVerified: s.isVerified,
      }))
    );
    if (allSources.length === 0) return '<p style="color:#9ca3af;text-align:center;padding:32px 0">No sources found.</p>';

    const rows = allSources.map((s: any) => {
      const icon = s.isVerified === true ? "&#9989;" : s.isVerified === false ? "&#10060;" : "&#9203;";
      let domainCell = '<span style="color:#9ca3af;font-size:12px">No domain set</span>';
      if (s.brandDomain) {
        const matches = urlMatchesDomain(s.url, s.brandDomain);
        domainCell = matches
          ? `<span style="background:#dcfce7;color:#166534;border-radius:9999px;padding:2px 8px;font-size:12px;font-weight:500">&#9989; ${esc(s.brandDomain)}</span>`
          : `<span style="background:#fee2e2;color:#991b1b;border-radius:9999px;padding:2px 8px;font-size:12px;font-weight:500">&#10060; Not ${esc(s.brandDomain)}</span>`;
      }
      return `
            <tr style="border-bottom:1px solid #f3f4f6">
              <td style="padding:10px 16px;text-align:center;font-size:16px">${icon}</td>
              <td style="padding:10px 16px">
                <a href="${esc(s.url)}" target="_blank" rel="noopener" style="color:#2563eb;text-decoration:none;font-weight:500">${esc(s.title || s.url)}</a>
                ${s.title ? `<div style="font-size:11px;color:#9ca3af;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:400px">${esc(s.url)}</div>` : ""}
              </td>
              <td style="padding:10px 16px;color:#4b5563">${esc(s.brandName || "General")}</td>
              <td style="padding:10px 16px;text-align:center">${domainCell}</td>
              <td style="padding:10px 16px;color:#4b5563">${esc(s.modelName)}</td>
            </tr>`;
    }).join("\n");

    return `
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <thead>
              <tr style="border-bottom:1px solid #e5e7eb;background:#f9fafb">
                <th style="padding:10px 16px;text-align:left;font-weight:600;color:#4b5563">Status</th>
                <th style="padding:10px 16px;text-align:left;font-weight:600;color:#4b5563">Source</th>
                <th style="padding:10px 16px;text-align:left;font-weight:600;color:#4b5563">Brand</th>
                <th style="padding:10px 16px;text-align:left;font-weight:600;color:#4b5563">Domain</th>
                <th style="padding:10px 16px;text-align:left;font-weight:600;color:#4b5563">Model</th>
              </tr>
            </thead>
            <tbody>${rows}
            </tbody>
          </table>
        </div>`;
  }

  function renderConceptScores(): string {
    if (!run.conceptScores || run.conceptScores.length === 0) return "";
    const byMode: Record<string, any[]> = {};
    for (const cs of run.conceptScores) {
      (byMode[cs.mode] ||= []).push(cs);
    }
    const sections: string[] = [];
    for (const [mode, scores] of Object.entries(byMode)) {
      const concepts = [...new Set(scores.map((s: any) => s.conceptName))];
      const brands = [...new Set(scores.map((s: any) => s.brand?.name))].filter(Boolean);
      if (concepts.length === 0 || brands.length === 0) continue;

      const scoreMap: Record<string, Record<string, number>> = {};
      for (const s of scores) {
        const bn = s.brand?.name;
        if (!bn) continue;
        (scoreMap[bn] ||= {})[s.conceptName] = s.score;
      }

      const headerCells = brands.map((b: string) =>
        `<th style="padding:10px 16px;text-align:center;font-weight:600;color:#111827">${esc(b)}</th>`
      ).join("");

      const bodyRows = concepts.map((c: string) => {
        const cells = brands.map((b: string) => {
          const score = scoreMap[b]?.[c] || 0;
          const bg = score >= 0.7 ? "#dcfce7" : score >= 0.4 ? "#fef9c3" : "#fee2e2";
          const color = score >= 0.7 ? "#166534" : score >= 0.4 ? "#854d0e" : "#991b1b";
          const barColor = score >= 0.7 ? "#22c55e" : score >= 0.4 ? "#eab308" : "#ef4444";
          return `<td style="padding:10px 16px;text-align:center">
              <span style="display:inline-block;background:${bg};color:${color};border-radius:4px;padding:2px 8px;font-size:12px;font-weight:700">${(score * 10).toFixed(1)}</span>
              <div style="width:64px;height:6px;background:#e5e7eb;border-radius:9999px;margin:4px auto 0;overflow:hidden"><div style="width:${score * 100}%;height:100%;background:${barColor};border-radius:9999px"></div></div>
            </td>`;
        }).join("");
        return `<tr style="border-bottom:1px solid #f3f4f6"><td style="padding:10px 16px;font-weight:500;color:#374151">${esc(c)}</td>${cells}</tr>`;
      }).join("\n");

      sections.push(`
        <div style="margin-bottom:24px">
          <h3 style="font-size:14px;font-weight:600;color:#374151;margin:0 0 8px 0">Concept Scores &mdash; ${mode === "training" ? "Training Data" : "Web Search"}</h3>
          <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <thead><tr style="border-bottom:1px solid #e5e7eb"><th style="padding:10px 16px;text-align:left;font-weight:600;color:#4b5563">Concept</th>${headerCells}</tr></thead>
              <tbody>${bodyRows}</tbody>
            </table>
          </div>
        </div>`);
    }
    if (sections.length === 0) return "";
    return `<div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-bottom:24px">${sections.join("")}</div>`;
  }

  const hasTraining = trainingResponses.length > 0;
  const hasWeb = webResponses.length > 0;

  const trainingSourcesHTML = renderSources(trainingResponses);
  const webSourcesHTML = renderSources(webResponses);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Brand Report: ${esc(trackedBrand?.name || "Results")} — ${runDate}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f9fafb; color: #111827; line-height: 1.5; }
  a { color: #2563eb; }
  a:hover { text-decoration: underline; }
  details > summary { list-style: none; }
  details > summary::-webkit-details-marker { display: none; }
  @media print {
    body { background: #fff; }
    details[open] > div { page-break-inside: avoid; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>
  <nav style="background:#fff;border-bottom:1px solid #e5e7eb;padding:12px 24px;display:flex;align-items:center;gap:16px">
    ${logoBase64 ? `<img src="${logoBase64}" alt="Seer Interactive" style="height:36px;opacity:0.9">` : ""}
    <span style="font-size:18px;font-weight:700;color:#111827">Brand Prompt Compare</span>
    <span style="margin-left:auto;font-size:13px;color:#9ca3af">Exported ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
  </nav>

  <div style="max-width:900px;margin:0 auto;padding:32px 16px">

    <!-- Header -->
    <div style="margin-bottom:24px">
      <h1 style="font-size:24px;font-weight:700;color:#111827;margin-bottom:4px">
        ${trackedBrand ? `Tracking: ${esc(trackedBrand.name)}` : "Results"}
        ${trackedBrand?.domain ? `<span style="font-size:16px;font-weight:400;color:#9ca3af;margin-left:8px">(${esc(trackedBrand.domain)})</span>` : ""}
      </h1>
      <div style="background:#f9fafb;border-radius:8px;padding:12px 16px;margin:12px 0;font-size:14px;color:#374151;font-style:italic">
        &ldquo;${esc(run.promptText)}&rdquo;
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:16px;font-size:14px;color:#6b7280">
        <span>${runDate}</span>
        <span>${esc(modelNames)}</span>
      </div>
    </div>

    <!-- Concept Scores -->
    ${renderConceptScores()}

    ${hasTraining ? `
    <!-- Training Data Section -->
    <div style="margin-bottom:32px">
      <h2 style="font-size:18px;font-weight:700;color:#111827;margin-bottom:16px;padding-bottom:8px;border-bottom:2px solid #e5e7eb">
        Training Data Responses
      </h2>
      ${renderVisibilitySummary(trainingResponses)}
      ${renderResponses(trainingResponses)}
      <div style="margin-top:20px">
        <h3 style="font-size:15px;font-weight:600;color:#374151;margin-bottom:12px">Sources — Training Data</h3>
        <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:16px">
          ${trainingSourcesHTML}
        </div>
      </div>
    </div>` : ""}

    ${hasWeb ? `
    <!-- Web Search Section -->
    <div style="margin-bottom:32px">
      <h2 style="font-size:18px;font-weight:700;color:#111827;margin-bottom:16px;padding-bottom:8px;border-bottom:2px solid #2563eb">
        Web Search Responses
      </h2>
      ${renderVisibilitySummary(webResponses)}
      ${renderResponses(webResponses)}
      <div style="margin-top:20px">
        <h3 style="font-size:15px;font-weight:600;color:#374151;margin-bottom:12px">Sources — Web Search</h3>
        <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:16px">
          ${webSourcesHTML}
        </div>
      </div>
    </div>` : ""}

    <footer style="margin-top:48px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;text-align:center">
      Generated by Brand Prompt Compare &mdash; Seer Interactive &mdash; ${runDate}
    </footer>
  </div>
</body>
</html>`;
}
