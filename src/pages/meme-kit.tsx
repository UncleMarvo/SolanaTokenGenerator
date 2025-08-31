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
  hashtags: string[];
  schedule: {
    t: string;
    channel: string;
    type: string;
    ref: string;
  }[];
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
  const [copyStates, setCopyStates] = useState<{ [key: string]: boolean }>({});
  const [error, setError] = useState<string | null>(null);

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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/meme/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || "Failed to generate meme kit");
        return;
      }
      
      setResult(data);
    } catch (error) {
      console.error("Error generating meme kit:", error);
      setError("Network error. Please try again.");
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

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStates(prev => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setCopyStates(prev => ({ ...prev, [key]: false }));
      }, 2000);
    } catch (error) {
      console.error("Failed to copy text:", error);
    }
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

             {/* Error display */}
             {error && (
               <div className="bg-danger/20 border border-danger/30 rounded-lg p-4 mb-6 text-center">
                 <p className="text-danger text-sm">
                   ❌ {error}
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
                        <div className="flex justify-between items-start space-x-4">
                          <p className="text-fg flex-1 whitespace-pre-line">{thread}</p>
                          <button
                            onClick={() => handleCopy(thread, `thread-${index}`)}
                            className={`flex-shrink-0 px-3 py-1 rounded text-sm font-medium transition-all duration-300 ${
                              copyStates[`thread-${index}`]
                                ? "bg-success text-bg"
                                : "bg-muted/20 hover:bg-muted/30 text-fg"
                            }`}
                          >
                            {copyStates[`thread-${index}`] ? "Copied!" : "Copy"}
                          </button>
                        </div>
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
                        <div className="flex justify-between items-start space-x-4">
                          <p className="text-fg flex-1">{copypasta}</p>
                          <button
                            onClick={() => handleCopy(copypasta, `copypasta-${index}`)}
                            className={`flex-shrink-0 px-3 py-1 rounded text-sm font-medium transition-all duration-300 ${
                              copyStates[`copypasta-${index}`]
                                ? "bg-success text-bg"
                                : "bg-muted/20 hover:bg-muted/30 text-fg"
                            }`}
                          >
                            {copyStates[`copypasta-${index}`] ? "Copied!" : "Copy"}
                          </button>
                        </div>
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

                {/* Hashtags */}
                <div className="bg-bg/40 backdrop-blur-2xl rounded-2xl p-8 border border-muted/10">
                  <h2 className="text-2xl font-bold mb-4">Hashtag Pack</h2>
                  <div className="flex flex-wrap gap-2">
                    {result.hashtags?.map((hashtag, index) => (
                      <span
                        key={index}
                        className="bg-muted/20 hover:bg-muted/30 text-fg px-3 py-1 rounded-full text-sm font-medium cursor-pointer transition-all duration-300"
                        onClick={() => handleCopy(hashtag, `hashtag-${index}`)}
                      >
                        {hashtag}
                      </span>
                    ))}
                  </div>
                  <p className="text-muted text-sm mt-3">
                    Click hashtags to copy them individually
                  </p>
                </div>

                {/* Posting Schedule */}
                <div className="bg-bg/40 backdrop-blur-2xl rounded-2xl p-8 border border-muted/10">
                  <h2 className="text-2xl font-bold mb-4">Posting Schedule</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-muted/20">
                          <th className="text-left py-2 px-3 text-muted">Time</th>
                          <th className="text-left py-2 px-3 text-muted">Channel</th>
                          <th className="text-left py-2 px-3 text-muted">Type</th>
                          <th className="text-left py-2 px-3 text-muted">Content</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.schedule?.map((item, index) => (
                          <tr key={index} className="border-b border-muted/10 hover:bg-muted/5">
                            <td className="py-2 px-3 text-fg font-mono">{item.t}</td>
                            <td className="py-2 px-3 text-fg capitalize">{item.channel}</td>
                            <td className="py-2 px-3 text-fg capitalize">{item.type}</td>
                            <td className="py-2 px-3 text-muted text-xs">{item.ref}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-muted text-sm mt-3">
                    Schedule starts from kit generation time. Times are relative (+0h, +4h, etc.)
                  </p>
                </div>

                {/* Download Buttons */}
                <div className="text-center space-y-3">
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={handleDownload}
                      className="bg-secondary hover:bg-secondary-600 text-bg font-bold py-3 px-8 rounded-lg transition-all duration-300"
                    >
                      Download Kit (JSON)
                    </button>
                    
                    <a
                      href={`/api/meme/kit.zip?name=${encodeURIComponent(form.name)}&ticker=${encodeURIComponent(form.ticker)}&vibe=${encodeURIComponent(form.vibe)}&preset=degen&shareUrl=${encodeURIComponent(`${window.location.origin}/token/example`)}`}
                      className="bg-accent hover:bg-accent/80 text-bg font-bold py-3 px-8 rounded-lg transition-all duration-300 text-center"
                    >
                      Download Kit (ZIP)
                    </a>
                  </div>
                  
                  <button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="bg-primary hover:bg-primary-600 text-bg font-bold py-3 px-8 rounded-lg transition-all duration-300 disabled:opacity-50"
                  >
                    {isLoading ? "Regenerating..." : "Regenerate"}
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
