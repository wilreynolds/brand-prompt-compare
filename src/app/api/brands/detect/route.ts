import { NextRequest, NextResponse } from "next/server";
import { detectBrands } from "@/lib/brand-detection";

// POST /api/brands/detect - Detect brands in prompt text
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { promptText } = body;

    if (!promptText || typeof promptText !== "string") {
      return NextResponse.json(
        { error: "promptText is required" },
        { status: 400 }
      );
    }

    const detected = await detectBrands(promptText);
    return NextResponse.json({ brands: detected });
  } catch (error) {
    console.error("Error detecting brands:", error);
    return NextResponse.json(
      { error: "Failed to detect brands" },
      { status: 500 }
    );
  }
}
