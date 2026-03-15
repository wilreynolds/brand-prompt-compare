import Image from "next/image";

export default function WhyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      {/* Seer logo */}
      <div className="mb-8 flex justify-center">
        <a
          href="https://www.seerinteractive.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            src="/seer-logo.png"
            alt="Seer Interactive"
            width={200}
            height={94}
            className="opacity-90 transition-opacity hover:opacity-100"
          />
        </a>
      </div>

      <h1 className="mb-6 text-3xl font-bold text-gray-900">
        Why I Built This
      </h1>

      <div className="space-y-5 text-base leading-relaxed text-gray-700">
        <p>
          In today&apos;s world of GEO and AI search, most companies are making a big mistake.
        </p>

        <p>
          They&apos;re tracking prompts like <em>&ldquo;best SEO agency&rdquo;</em> or{" "}
          <em>&ldquo;best GEO agency&rdquo;</em> &mdash; and while that has its place, it misses
          how people actually make decisions, especially in B2B.
        </p>

        <p>
          A{" "}
          <a
            href="https://www.gartner.com/en/sales/trends/b2b-buying-journey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            Gartner study
          </a>{" "}
          found that <strong>77% of B2B buyers ask people in their network for
          recommendations</strong>. That means by the time someone turns to AI, they
          probably already have names. Their friend said <em>&ldquo;check out Seer
          Interactive&rdquo;</em> &mdash; now they&apos;re typing{" "}
          <em>&ldquo;Seer Interactive vs [competitor]&rdquo;</em> into ChatGPT or Perplexity.
        </p>

        <p>
          That&apos;s a fundamentally different prompt than <em>&ldquo;best SEO agency.&rdquo;</em>{" "}
          And it&apos;s not how most GEO agencies are tracking.
        </p>

        <p>
          I thought that was a major gap. So I vibe coded this tool.
        </p>

        <h2 className="pt-2 text-xl font-bold text-gray-900">
          How to Use the Output
        </h2>

        <p>
          I know this is probabilistic and rife with issues. The goal is not to build a
          perfect tracker. The goal is to find the <strong>big gaps</strong>.
        </p>

        <p>
          When you run a comparison, look at the <strong>themes</strong> where a competitor
          might outperform you. For instance, if we at Seer consistently score low on
          &ldquo;speed&rdquo; against competitors across multiple models &mdash; and I can see
          that pattern &mdash; then maybe that&apos;s a signal to start building content
          around our speed of execution.
        </p>

        <p>
          The output shows you how AI perceives your brand head-to-head against competitors,
          given the kinds of prompts I believe real people are actually entering. Use it to
          find the gaps worth closing, not to obsess over individual scores.
        </p>

        <h2 className="pt-2 text-xl font-bold text-gray-900">
          Help Me Make This Better
        </h2>

        <p>
          This is my first ever public GitHub repo. I&apos;m putting it out there because I
          think other marketers and agencies need a tool like this, and I&apos;d rather build
          in the open than keep it to myself.
        </p>

        <p>
          If you have ideas, find bugs, or want to contribute &mdash; I&apos;d genuinely
          appreciate it.
        </p>

        <div className="pt-2">
          <a
            href="https://github.com/wilreynolds/brand-prompt-compare"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-700"
          >
            <svg
              className="h-5 w-5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            View on GitHub
          </a>
        </div>

        <p className="pt-4 text-sm text-gray-500">
          Built by{" "}
          <a
            href="https://www.seerinteractive.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            Wil Reynolds
          </a>{" "}
          at Seer Interactive
        </p>
      </div>
    </div>
  );
}
