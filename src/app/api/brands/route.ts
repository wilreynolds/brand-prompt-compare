import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { brands } from "@/lib/schema";
import { eq } from "drizzle-orm";

// GET /api/brands - List all brands
export async function GET() {
  try {
    const allBrands = await db.query.brands.findMany({
      orderBy: (brands, { asc }) => [asc(brands.name)],
    });
    return NextResponse.json(allBrands);
  } catch (error) {
    console.error("Error fetching brands:", error);
    return NextResponse.json(
      { error: "Failed to fetch brands" },
      { status: 500 }
    );
  }
}

// POST /api/brands - Create or find a brand
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, domain } = body;

    if (!name || typeof name !== "string" || name.length > 200) {
      return NextResponse.json(
        { error: "Valid brand name is required (max 200 chars)" },
        { status: 400 }
      );
    }

    // Check if brand already exists (case-insensitive)
    const existing = await db.query.brands.findFirst({
      where: eq(brands.name, name),
    });

    if (existing) {
      return NextResponse.json(existing);
    }

    const [newBrand] = await db
      .insert(brands)
      .values({ name, domain: domain || null })
      .returning();

    return NextResponse.json(newBrand, { status: 201 });
  } catch (error) {
    console.error("Error creating brand:", error);
    return NextResponse.json(
      { error: "Failed to create brand" },
      { status: 500 }
    );
  }
}
