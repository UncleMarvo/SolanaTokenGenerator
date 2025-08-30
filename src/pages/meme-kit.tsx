import { FC, useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";

interface MemeKitForm {
  name: string;
  ticker: string;
  vibe: "funny" | "serious" | "degen";
}

interface MemeKitResult {
  logoUrl: string;
  twitterThreads: string[];
  copypastas: string[];
  roadmap: string[];
}

const MemeKitPage: FC = () => {
  const router = useRouter();
  const [form, setForm] = useState<MemeKitForm>({
    name: "",
    ticker: "",
    vibe: "degen"
  });
  const [result, setResult] = useState<MemeKitResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Update form when URL parameters are available
  useEffect(() => {
    if (router.isReady) {
      const name = router.query.name as string;
      const ticker = router.query.ticker as string;
      
      if (name || ticker) {
        setForm(prev => ({
          ...prev,
          name: name || prev.name,
          ticker: ticker || prev.ticker
        }));
      }
    }
  }, [router.isReady, router.query.name, router.query.ticker]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/meme/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("Error generating meme kit:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;

    const dataStr = JSON.stringify(result, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${form.ticker}-meme-kit.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Head>
        <title>AI Meme Kit Generator - Solana Token Creator</title>
      </Head>
      
      <div className="min-h-screen bg-bg text-fg">
        <div className="container mx-auto px-6 py-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold text-center mb-8">AI Meme Kit Generator</h1>
            
            {/* Pre-filled indicator */}
            {router.query.name && router.query.ticker && (
              <div className="bg-success/20 border border-success/30 rounded-lg p-4 mb-6 text-center">
                <p className="text-success text-sm">
                  ✅ Pre-filled with token details: <strong>{router.query.name}</strong> (${router.query.ticker})
                </p>
              </div>
            )}
            
            {!result ? (
              <div className="bg-bg/40 backdrop-blur-2xl rounded-2xl p-8 border border-muted/10">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-muted mb-2 font-semibold">
                      Token Name
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full p-3 rounded-lg border border-muted/10 bg-transparent text-fg focus:border-muted/25 focus:ring-transparent"
                      placeholder="Enter token name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-muted mb-2 font-semibold">
                      Ticker Symbol
                    </label>
                    <input
                      type="text"
                      value={form.ticker}
                      onChange={(e) => setForm({ ...form, ticker: e.target.value.toUpperCase() })}
                      className="w-full p-3 rounded-lg border border-muted/10 bg-transparent text-fg focus:border-muted/25 focus:ring-transparent"
                      placeholder="Enter ticker (e.g., MOON)"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-muted mb-2 font-semibold">
                      Vibe
                    </label>
                    <select
                      value={form.vibe}
                      onChange={(e) => setForm({ ...form, vibe: e.target.value as any })}
                      className="w-full p-3 rounded-lg border border-muted/10 bg-transparent text-fg focus:border-muted/25 focus:ring-transparent"
                    >
                      <option value="funny">Funny</option>
                      <option value="serious">Serious</option>
                      <option value="degen">Degen</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-primary hover:bg-primary-600 text-bg font-bold py-3 px-6 rounded-lg transition-all duration-300 disabled:opacity-50"
                  >
                    {isLoading ? "Generating..." : "Generate Meme Kit"}
                  </button>
                </form>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Logo Section */}
                <div className="bg-bg/40 backdrop-blur-2xl rounded-2xl p-8 border border-muted/10 text-center">
                  <h2 className="text-2xl font-bold mb-4">Generated Logo</h2>
                  <img
                    src={result.logoUrl}
                    alt={`${form.ticker} logo`}
                    className="mx-auto w-32 h-32 rounded-xl object-cover"
                  />
                </div>

                {/* Twitter Threads */}
                <div className="bg-bg/40 backdrop-blur-2xl rounded-2xl p-8 border border-muted/10">
                  <h2 className="text-2xl font-bold mb-4">Twitter Threads</h2>
                  <div className="space-y-4">
                    {result.twitterThreads.map((thread, index) => (
                      <div key={index} className="p-4 bg-muted/10 rounded-lg">
                        <p className="text-fg">{thread}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Copypastas */}
                <div className="bg-bg/40 backdrop-blur-2xl rounded-2xl p-8 border border-muted/10">
                  <h2 className="text-2xl font-bold mb-4">Copypastas</h2>
                  <div className="space-y-4">
                    {result.copypastas.map((copypasta, index) => (
                      <div key={index} className="p-4 bg-muted/10 rounded-lg">
                        <p className="text-fg">{copypasta}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Roadmap */}
                <div className="bg-bg/40 backdrop-blur-2xl rounded-2xl p-8 border border-muted/10">
                  <h2 className="text-2xl font-bold mb-4">Roadmap</h2>
                  <div className="space-y-2">
                    {result.roadmap.map((step, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <span className="bg-primary text-bg w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </span>
                        <p className="text-fg">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Download Button */}
                <div className="text-center">
                  <button
                    onClick={handleDownload}
                    className="bg-secondary hover:bg-secondary-600 text-bg font-bold py-3 px-8 rounded-lg transition-all duration-300"
                  >
                    Download Kit
                  </button>
                </div>

                {/* Generate New Kit */}
                <div className="text-center">
                  <button
                    onClick={() => setResult(null)}
                    className="bg-muted/20 hover:bg-muted/30 text-fg font-bold py-3 px-8 rounded-lg transition-all duration-300"
                  >
                    Generate New Kit
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default MemeKitPage;
