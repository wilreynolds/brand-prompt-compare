// Proves brand-prompt-compare can import geo-platform's compiled output.
// No test framework needed — this repo has none, and this is a one-shot
// wiring check, not an ongoing suite. Run: node scripts/verify-geo-platform-import.mjs
import { extractEvidence, VISIBILITY_MATCHER_VERSION } from "@seer/geo-platform";

let failures = 0;
function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failures++;
  }
}

const evidence = extractEvidence("Seer Interactive is a great SEO agency.", "Seer Interactive");
assert(evidence.length === 1, `expected 1 evidence sentence, got ${evidence.length}`);
assert(evidence[0].includes("Seer Interactive"), "evidence should contain brand name");

const noMatch = extractEvidence("We recommend WebFX and Majux.", "Seer Interactive");
assert(noMatch.length === 0, `expected 0 evidence for a brand-free response, got ${noMatch.length}`);

assert(
  typeof VISIBILITY_MATCHER_VERSION === "string" && VISIBILITY_MATCHER_VERSION.length > 0,
  "VISIBILITY_MATCHER_VERSION must be a non-empty string",
);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log(`OK: @seer/geo-platform resolves; extractEvidence works; matcher version = "${VISIBILITY_MATCHER_VERSION}"`);
