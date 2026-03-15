import { NextRequest, NextResponse } from "next/server";
import { db, prompts, now } from "@/lib/db";
import { eq } from "drizzle-orm";

// PUT /api/prompts/[id] - Update a prompt
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, templateText, isTemplate } = body;

    const [updated] = await db
      .update(prompts)
      .set({
        ...(name !== undefined && { name }),
        ...(templateText !== undefined && { templateText }),
        ...(isTemplate !== undefined && { isTemplate }),
        updatedAt: now(),
      })
      .where(eq(prompts.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating prompt:", error);
    return NextResponse.json(
      { error: "Failed to update prompt" },
      { status: 500 }
    );
  }
}

// DELETE /api/prompts/[id] - Delete a prompt
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await db.delete(prompts).where(eq(prompts.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting prompt:", error);
    return NextResponse.json(
      { error: "Failed to delete prompt" },
      { status: 500 }
    );
  }
}
