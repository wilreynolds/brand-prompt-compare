import { NextRequest, NextResponse } from "next/server";
import { queryOpenRouterRaw } from "@/lib/openrouter";

// POST /api/concepts/detect - Detect comparison concepts from prompt text
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { promptText, brandNames } = body;

    if (!promptText || typeof promptText !== "string") {
      return NextResponse.json(
        { error: "promptText is required" },
        { status: 400 }
      );
    }

    const brandsContext = brandNames?.length
      ? `The brands being compared are: ${brandNames.join(", ")}.`
      : "";

    const prompt = `Given this brand comparison prompt, extract the key concepts/topics that should be evaluated and scored for each brand.

${brandsContext}

Prompt:
<text>
${promptText.slice(0, 2000)}
</text>

Return a JSON array of objects with:
- "name": The concept in Title Case with spaces (e.g., "Customer Service", "Content Marketing")
- "description": One-line description of what this concept measures

Include 6-12 concepts that are most relevant to comparing these brands. Think about what matters when evaluating companies in this context: things like Trust, Innovation, Pricing, Customer Service, Expertise, Technology, Reputation, Quality, etc.

Respond with ONLY valid JSON array.`;

    const content = await queryOpenRouterRaw(prompt, "anthropic/claude-haiku-4-5-20251001", 2000);

    const cleaned = content
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    let concepts: unknown = null;
    try {
      concepts = JSON.parse(cleaned);
    } catch {
      const start = cleaned.indexOf("[");
      const end = cleaned.lastIndexOf("]");
      if (start !== -1 && end > start) {
        try {
          concepts = JSON.parse(cleaned.slice(start, end + 1));
        } catch (err) {
          console.error("concepts/detect: fallback JSON parse failed", err, "raw:", content);
        }
      } else {
        console.error("concepts/detect: no JSON array found in response. raw:", content);
      }
    }

    if (Array.isArray(concepts)) {
      return NextResponse.json({ concepts });
    }
    return NextResponse.json({ concepts: [] });
  } catch (error) {
    console.error("Error detecting concepts:", error);
    return NextResponse.json(
      { error: "Failed to detect concepts" },
      { status: 500 }
    );
  }
}
