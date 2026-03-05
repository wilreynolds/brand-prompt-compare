import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { conceptScores, runBrands } from "@/lib/schema";
import { and, inArray } from "drizzle-orm";

export interface TrendPoint {
  runId: string;
  date: string;
  scores: Record<string, number>;
}

export interface BrandTrend {
  brandId: string;
  brandName: string;
  trends: TrendPoint[];
}

// GET /api/history?brandIds=id1,id2&concept=Trust
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const brandIdsParam = searchParams.get("brandIds");
    const conceptFilter = searchParams.get("concept");

    if (!brandIdsParam) {
      return NextResponse.json(
        { error: "brandIds parameter is required (comma-separated)" },
        { status: 400 }
      );
    }

    const brandIds = brandIdsParam.split(",").filter(Boolean);
    if (brandIds.length === 0 || brandIds.length > 5) {
      return NextResponse.json(
        { error: "Provide 1-5 brand IDs" },
        { status: 400 }
      );
    }

    // Find runs that include ANY of these brands
    const relevantRunBrands = await db.query.runBrands.findMany({
      where: inArray(runBrands.brandId, brandIds),
      with: {
        run: true,
        brand: true,
      },
    });

    const completedRunIds = [
      ...new Set(
        relevantRunBrands
          .filter((rb) => rb.run.status === "completed")
          .map((rb) => rb.run.id)
      ),
    ];

    if (completedRunIds.length === 0) {
      return NextResponse.json({ brands: [], concepts: [] });
    }

    // Fetch all concept scores for these runs and brands
    const scores = await db.query.conceptScores.findMany({
      where: and(
        inArray(conceptScores.runId, completedRunIds),
        inArray(conceptScores.brandId, brandIds)
      ),
      with: {
        brand: true,
        run: true,
      },
    });

    // Filter by concept if specified
    const filtered = conceptFilter
      ? scores.filter((s) => s.conceptName === conceptFilter)
      : scores;

    // Get unique concepts
    const concepts = [...new Set(filtered.map((s) => s.conceptName))].sort();

    // Group by brand
    const brandMap = new Map<string, BrandTrend>();
    for (const score of filtered) {
      if (!brandMap.has(score.brandId)) {
        brandMap.set(score.brandId, {
          brandId: score.brandId,
          brandName: score.brand.name,
          trends: [],
        });
      }

      const brand = brandMap.get(score.brandId)!;
      let trend = brand.trends.find((t) => t.runId === score.runId);
      if (!trend) {
        trend = {
          runId: score.runId,
          date:
            score.run.completedAt?.toISOString() ||
            score.run.createdAt.toISOString(),
          scores: {},
        };
        brand.trends.push(trend);
      }
      trend.scores[score.conceptName] = score.score;
    }

    // Sort trends chronologically
    for (const brand of brandMap.values()) {
      brand.trends.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    }

    return NextResponse.json({
      brands: Array.from(brandMap.values()),
      concepts,
    });
  } catch (error) {
    console.error("Error fetching history:", error);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}
