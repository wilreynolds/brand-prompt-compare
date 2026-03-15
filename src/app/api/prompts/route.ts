import { NextRequest, NextResponse } from "next/server";
import { db, prompts } from "@/lib/db";

// GET /api/prompts - List all prompts
export async function GET() {
  try {
    const allPrompts = await db.query.prompts.findMany({
      orderBy: (prompts: any, { desc }: any) => [desc(prompts.createdAt)],
    });
    return NextResponse.json(allPrompts);
  } catch (error) {
    console.error("Error fetching prompts:", error);
    return NextResponse.json(
      { error: "Failed to fetch prompts" },
      { status: 500 }
    );
  }
}

// POST /api/prompts - Create a prompt template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, templateText, isTemplate } = body;

    if (!name || !templateText) {
      return NextResponse.json(
        { error: "name and templateText are required" },
        { status: 400 }
      );
    }

    if (name.length > 200 || templateText.length > 5000) {
      return NextResponse.json(
        { error: "name (max 200) or templateText (max 5000) too long" },
        { status: 400 }
      );
    }

    const [newPrompt] = await db
      .insert(prompts)
      .values({
        name,
        templateText,
        isTemplate: isTemplate ?? true,
      })
      .returning();

    return NextResponse.json(newPrompt, { status: 201 });
  } catch (error) {
    console.error("Error creating prompt:", error);
    return NextResponse.json(
      { error: "Failed to create prompt" },
      { status: 500 }
    );
  }
}
