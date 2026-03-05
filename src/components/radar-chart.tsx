"use client";

import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

interface BrandScores {
  brandName: string;
  scores: Record<string, number>;
}

interface RadarChartProps {
  brands: BrandScores[];
  concepts: string[];
}

const BRAND_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
];

export function RadarChart({ brands, concepts }: RadarChartProps) {
  if (concepts.length === 0 || brands.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-400">
        No data to display
      </div>
    );
  }

  // Transform data for Recharts
  const data = concepts.map((concept) => {
    const point: Record<string, string | number> = { concept };
    for (const brand of brands) {
      point[brand.brandName] = Math.round((brand.scores[concept] || 0) * 100) / 100;
    }
    return point;
  });

  return (
    <ResponsiveContainer width="100%" height={400}>
      <RechartsRadarChart data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="concept" tick={{ fontSize: 12 }} />
        <PolarRadiusAxis domain={[0, 1]} tick={{ fontSize: 10 }} />
        {brands.map((brand, i) => (
          <Radar
            key={brand.brandName}
            name={brand.brandName}
            dataKey={brand.brandName}
            stroke={BRAND_COLORS[i % BRAND_COLORS.length]}
            fill={BRAND_COLORS[i % BRAND_COLORS.length]}
            fillOpacity={0.15}
            strokeWidth={2}
          />
        ))}
        <Legend />
        <Tooltip />
      </RechartsRadarChart>
    </ResponsiveContainer>
  );
}
