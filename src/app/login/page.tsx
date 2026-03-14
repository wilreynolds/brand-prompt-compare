"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Set the cookie and test it against the API
    document.cookie = `api_secret=${encodeURIComponent(secret)}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Strict`;

    const res = await fetch("/api/brands");
    if (res.ok) {
      router.push("/");
    } else {
      document.cookie = "api_secret=; path=/; max-age=0";
      setError("Invalid secret. Check your API_SECRET env variable.");
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-xl font-bold">Brand Prompt Compare</h1>
        <p className="text-sm text-gray-600">
          Enter your API secret to continue.
        </p>
        <input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="API secret"
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          autoFocus
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Sign In
        </button>
      </form>
    </div>
  );
}
