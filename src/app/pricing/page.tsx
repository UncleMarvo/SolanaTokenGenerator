"use client";

import { feeSummaryText } from "@/lib/feeCopy";

export default function PricingPage() {
  const { flat, skimPct } = feeSummaryText();
  const tiers = [
    {
      name: "Free",
      price: "€0",
      blurb: "Everything you need to launch and trade.",
      cta: { label: "Start Free", href: "/create" },
      features: [
        "Token creator (Solana)",
        "Honest Launch (revoke mint & freeze)",
        "Liquidity Wizard (Orca + Raydium)",
        "Share Page (OG images, live chips)",
        "Basic Meme Kit (fallback logo, 1 header, simple copy)",
        "Analytics: price/liquidity/holders",
      ],
    },
    {
      name: "Pro",
      price: "0.25 SOL",
      blurb: "Premium branding that converts and spreads.",
      cta: { label: "Upgrade to Pro", href: "/kit#upgrade" },
      features: [
        "AI Logo generation (premium prompts)",
        "Premium headers & themes (OG/Twitter/Telegram)",
        "Extended hashtag packs & posting schedules",
        "Bigger sticker pack (PNG/SVG)",
        "ZIP export with social-ready assets",
        "Priority support (best-effort)",
      ],
      highlight: true,
    },
  ];

  const fees = [
    { label: "Launch flat fee", value: `${flat} SOL` },
    { label: "Liquidity skim", value: `${skimPct}% of both sides at pool commit` },
    { label: "DEX trading fees", value: "Standard Orca/Raydium swap fees (we do not change these)" },
    { label: "We do not take supply", value: "No token allocation is taken by the platform" },
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-10 text-center">
        <h1 className="text-3xl md:text-4xl font-bold">Pricing</h1>
        <p className="mt-3 text-neutral-500">Launch free. Upgrade when you want premium branding.</p>
      </header>

      <section className="grid md:grid-cols-2 gap-6">
        {tiers.map((t) => (
          <div key={t.name} className={`rounded-2xl border p-6 shadow-sm ${t.highlight ? "border-indigo-500" : "border-neutral-200"}`}>
            <div className="flex items-baseline justify-between">
              <h2 className="text-xl font-semibold">{t.name}</h2>
              {t.highlight && <span className="text-xs rounded-full bg-indigo-50 text-indigo-700 px-2 py-1">Popular</span>}
            </div>
            <p className="mt-2 text-neutral-300">{t.blurb}</p>
            <div className="mt-4">
              <div className="text-3xl font-bold">{t.price}</div>
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              {t.features.map((f) => (
                <li key={f} className="flex gap-2"><span>✔</span><span>{f}</span></li>
              ))}
            </ul>
            {t.cta.label === "Upgrade to Pro" ? (
              <a href={t.cta.href} className="mt-6 inline-block w-full text-center btn btn-primary animate-[pulse_2.5s_ease-in-out_infinite] px-4 py-2">
                {t.cta.label}
              </a>
            ) : (
              <a href={t.cta.href} className="mt-6 inline-block w-full text-center rounded-xl border px-4 py-2 hover:shadow-sm">
                {t.cta.label}
              </a>
            )}
          </div>
        ))}
      </section>

      <section className="mt-12">
        <h3 className="text-lg font-semibold">Transparent launch fees</h3>
        <div className="mt-4 grid md:grid-cols-2 gap-4">
          {fees.map((f) => (
            <div key={f.label} className="rounded-xl border p-4 text-sm">
              <div className="font-medium">{f.label}</div>
              <div className="text-neutral-300 mt-1">{f.value}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-neutral-500 mt-4">
          Pro upgrade is optional and independent of launch fees. Launch fees are charged at liquidity commit and disclosed in-app.
        </p>
      </section>
    </main>
  );
}
