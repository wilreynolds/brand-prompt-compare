import { NextResponse } from "next/server";
import { seedDatabase } from "@/lib/seed";

// POST /api/seed - Seed default models and starter prompts
export async function POST() {
  try {
    const result = await seedDatabase();
    return NextResponse.json({ success: true, seeded: result });
  } catch (error) {
    console.error("Error seeding database:", error);
    return NextResponse.json(
      { error: "Failed to seed database" },
      { status: 500 }
    );
  }
}
