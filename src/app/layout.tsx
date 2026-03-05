import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Brand Prompt Compare",
  description: "Compare how AI describes your brand vs competitors",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 text-gray-900`}>
        <nav className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
            <Link
              href="/"
              className="text-lg font-bold text-gray-900 hover:text-blue-600"
            >
              Brand Prompt Compare
            </Link>
            <div className="flex gap-4 text-sm">
              <Link
                href="/"
                className="text-gray-600 hover:text-gray-900"
              >
                Compare
              </Link>
              <Link
                href="/history"
                className="text-gray-600 hover:text-gray-900"
              >
                History
              </Link>
              <Link
                href="/prompts"
                className="text-gray-600 hover:text-gray-900"
              >
                Prompts
              </Link>
              <Link
                href="/settings"
                className="text-gray-600 hover:text-gray-900"
              >
                Settings
              </Link>
            </div>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
