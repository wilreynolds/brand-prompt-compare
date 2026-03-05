import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runs } from "@/lib/schema";
import { eq } from "drizzle-orm";

// GET /api/runs/[id] - Get full run details
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
          orderBy: (rb, { asc }) => [asc(rb.position)],
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

    return NextResponse.json(run);
  } catch (error) {
    console.error("Error fetching run:", error);
    return NextResponse.json(
      { error: "Failed to fetch run" },
      { status: 500 }
    );
  }
}
