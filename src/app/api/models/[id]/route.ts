import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { models } from "@/lib/schema";
import { eq } from "drizzle-orm";

// PATCH /api/models/[id] - Update a single model's fields (e.g. apiType)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { apiType } = body;

    if (apiType && !["openrouter", "google"].includes(apiType)) {
      return NextResponse.json(
        { error: 'apiType must be "openrouter" or "google"' },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (apiType) updates.apiType = apiType;

    const [updated] = await db
      .update(models)
      .set(updates)
      .where(eq(models.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating model:", error);
    return NextResponse.json(
      { error: "Failed to update model" },
      { status: 500 }
    );
  }
}
