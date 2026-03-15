import { NextRequest, NextResponse } from "next/server";
import { db, models } from "@/lib/db";
import { eq, inArray } from "drizzle-orm";

// GET /api/models - List models
export async function GET(request: NextRequest) {
  try {
    const activeOnly = request.nextUrl.searchParams.get("active") === "true";

    const allModels = activeOnly
      ? await db.query.models.findMany({
          where: eq(models.isActive, true),
          orderBy: (models: any, { asc }: any) => [asc(models.displayName)],
        })
      : await db.query.models.findMany({
          orderBy: (models: any, { asc }: any) => [asc(models.displayName)],
        });

    return NextResponse.json(allModels);
  } catch (error) {
    console.error("Error fetching models:", error);
    return NextResponse.json(
      { error: "Failed to fetch models" },
      { status: 500 }
    );
  }
}

// PUT /api/models - Batch update active status
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { modelIds, isActive } = body;

    if (
      !modelIds ||
      !Array.isArray(modelIds) ||
      modelIds.length === 0 ||
      modelIds.length > 200 ||
      isActive === undefined
    ) {
      return NextResponse.json(
        { error: "modelIds array (max 200) and isActive boolean required" },
        { status: 400 }
      );
    }

    await db
      .update(models)
      .set({ isActive, updatedAt: new Date() })
      .where(inArray(models.id, modelIds));

    return NextResponse.json({ success: true, updated: modelIds.length });
  } catch (error) {
    console.error("Error updating models:", error);
    return NextResponse.json(
      { error: "Failed to update models" },
      { status: 500 }
    );
  }
}
