"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface Brand {
  id: string;
  name: string;
}

interface BrandTrend {
  brandId: string;
  brandName: string;
  trends: Array<{
    runId: string;
    date: string;
    scores: Record<string, number>;
  }>;
}

const BRAND_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
];

export default function HistoryPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandIds, setSelectedBrandIds] = useState<string[]>([]);
  const [concepts, setConcepts] = useState<string[]>([]);
  const [selectedConcept, setSelectedConcept] = useState<string>("");
  const [brandTrends, setBrandTrends] = useState<BrandTrend[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchBrands = useCallback(async () => {
    try {
      const res = await fetch("/api/brands");
      if (res.ok) setBrands(await res.json());
    } catch {
      console.error("Failed to fetch brands");
    }
  }, []);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  const fetchHistory = useCallback(async () => {
    if (selectedBrandIds.length === 0) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        brandIds: selectedBrandIds.join(","),
      });
      if (selectedConcept) params.set("concept", selectedConcept);

      const res = await fetch(`/api/history?${params}`);
      if (res.ok) {
        const data = await res.json();
        setBrandTrends(data.brands || []);
        if (!selectedConcept) {
          setConcepts(data.concepts || []);
        }
      }
    } catch {
      console.error("Failed to fetch history");
    } finally {
      setLoading(false);
    }
  }, [selectedBrandIds, selectedConcept]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const toggleBrand = (id: string) => {
    setSelectedBrandIds((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  };

  // Build chart data: one point per date, one line per brand
  const chartData = (() => {
    const dateMap = new Map<string, Record<string, number>>();

    for (const brand of brandTrends) {
      for (const trend of brand.trends) {
        const dateKey = new Date(trend.date).toLocaleDateString();
        if (!dateMap.has(dateKey)) dateMap.set(dateKey, {});
        const point = dateMap.get(dateKey)!;

        // Average all concept scores for this brand at this point
        const scores = Object.values(trend.scores);
        if (scores.length > 0) {
          point[brand.brandName] =
            scores.reduce((a, b) => a + b, 0) / scores.length;
        }
      }
    }

    return Array.from(dateMap.entries())
      .map(([date, scores]) => ({ date, ...scores }))
      .sort(
        (a, b) =>
          new Date(a.date).getTime() - new Date(b.date).getTime()
      );
  })();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">History &amp; Trends</h1>

      {/* Brand selector */}
      <div className="mb-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Select brands to compare
        </h2>
        <div className="flex flex-wrap gap-2">
          {brands.map((brand) => (
            <button
              key={brand.id}
              onClick={() => toggleBrand(brand.id)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                selectedBrandIds.includes(brand.id)
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {brand.name}
            </button>
          ))}
        </div>
      </div>

      {/* Concept filter */}
      {concepts.length > 0 && (
        <div className="mb-6">
          <select
            value={selectedConcept}
            onChange={(e) => setSelectedConcept(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All concepts (averaged)</option>
            {concepts.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Chart */}
      {loading ? (
        <div className="flex h-64 items-center justify-center text-gray-400">
          Loading trends...
        </div>
      ) : chartData.length > 0 ? (
        <div className="rounded-lg border bg-white p-6">
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 1]} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              {brandTrends.map((brand, i) => (
                <Line
                  key={brand.brandId}
                  type="monotone"
                  dataKey={brand.brandName}
                  stroke={BRAND_COLORS[i % BRAND_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : selectedBrandIds.length > 0 ? (
        <div className="flex h-64 items-center justify-center text-gray-400">
          No trend data yet. Run some comparisons first.
        </div>
      ) : (
        <div className="flex h-64 items-center justify-center text-gray-400">
          Select brands above to see trends
        </div>
      )}
    </div>
  );
}
