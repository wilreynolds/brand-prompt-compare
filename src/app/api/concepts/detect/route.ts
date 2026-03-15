import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const getClient = () =>
  new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

    const client = getClient();

    const brandsContext = brandNames?.length
      ? `The brands being compared are: ${brandNames.join(", ")}.`
      : "";

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `Given this brand comparison prompt, extract the key concepts/topics that should be evaluated and scored for each brand.

${brandsContext}

Prompt:
<text>
${promptText.slice(0, 2000)}
</text>

Return a JSON array of objects with:
- "name": The concept in Title Case with spaces (e.g., "Customer Service", "Content Marketing")
- "description": One-line description of what this concept measures

Include 6-12 concepts that are most relevant to comparing these brands. Think about what matters when evaluating companies in this context: things like Trust, Innovation, Pricing, Customer Service, Expertise, Technology, Reputation, Quality, etc.

Respond with ONLY valid JSON array.`,
        },
      ],
    });

    const content =
      response.content[0].type === "text" ? response.content[0].text : "";

    try {
      const cleaned = content
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      const concepts = JSON.parse(cleaned);
      return NextResponse.json({ concepts });
    } catch {
      return NextResponse.json({ concepts: [] });
    }
  } catch (error) {
    console.error("Error detecting concepts:", error);
    return NextResponse.json(
      { error: "Failed to detect concepts" },
      { status: 500 }
    );
  }
}
