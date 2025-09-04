import { FC, useEffect, useState } from "react";
import Head from "next/head";

const AdminRevenuePage: FC = () => {
  const [data, setData] = useState<any>(null);
  const [days, setDays] = useState(7);
  const [auth, setAuth] = useState("");

  async function load() {
    const r = await fetch(`/api/admin/revenue?days=${days}`, {
      headers: auth ? { Authorization: `Bearer ${auth}` } : {},
      cache: "no-store",
    });
    const j = await r.json();
    setData(j);
  }

  useEffect(() => { /* no auto-load without auth */ }, []);

  return (
    <>
      <Head>
        <title>Admin Revenue - Solana Token Creator</title>
        <meta name="description" content="Admin revenue dashboard for fee tracking and analytics" />
      </Head>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Admin · Revenue</h1>

        <div className="flex items-center gap-3 mb-6">
          <input 
            placeholder="ADMIN_SECRET" 
            value={auth} 
            onChange={e=>setAuth(e.target.value)} 
            className="border px-3 py-2 rounded w-64 text-sm" 
          />
          <select 
            value={days} 
            onChange={e=>setDays(Number(e.target.value))} 
            className="border px-3 py-2 rounded text-sm"
          >
            <option value={1}>1 day</option>
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
          </select>
          <button 
            onClick={load} 
            className="border rounded px-3 py-2 text-sm hover:bg-gray-50"
          >
            Load
          </button>
        </div>

        {!data ? (
          <div className="text-sm text-neutral-500">Enter ADMIN_SECRET and click Load.</div>
        ) : (
          <>
            <section className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="border rounded-xl p-4">
                <div className="text-xs text-neutral-500">Since</div>
                <div className="text-sm">{new Date(data.since).toLocaleString()}</div>
              </div>
              <div className="border rounded-xl p-4">
                <div className="text-xs text-neutral-500">Flat fees (SOL)</div>
                <div className="text-xl font-semibold">{Number(data.flatSol || 0).toFixed(3)}</div>
              </div>
              <div className="border rounded-xl p-4">
                <div className="text-xs text-neutral-500">Skim records</div>
                <div className="text-xl font-semibold">{Array.isArray(data.skims) ? data.skims.length : 0}</div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="font-semibold mb-2">Skim totals by mint</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-4">Mint</th>
                      <th className="py-2 pr-4">Skim A (raw)</th>
                      <th className="py-2 pr-4">Skim B (raw)</th>
                      <th className="py-2 pr-4">Launches</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.skims?.map((row:any)=>(
                      <tr key={row.mint} className="border-b">
                        <td className="py-2 pr-4 font-mono text-xs">{row.mint}</td>
                        <td className="py-2 pr-4">{row.skimA}</td>
                        <td className="py-2 pr-4">{row.skimB}</td>
                        <td className="py-2 pr-4">{row.launches}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-neutral-500 mt-2">Raw amounts shown; convert using token decimals where needed.</p>
            </section>

            <section>
              <h2 className="font-semibold mb-2">Recent fee events</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-4">Time</th>
                      <th className="py-2 pr-4">Action</th>
                      <th className="py-2 pr-4">Wallet</th>
                      <th className="py-2 pr-4">Mint</th>
                      <th className="py-2 pr-4">Pool</th>
                      <th className="py-2 pr-4">AmountA</th>
                      <th className="py-2 pr-4">AmountB</th>
                      <th className="py-2 pr-4">Tx</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent?.map((e:any)=>(
                      <tr key={e.txSig} className="border-b">
                        <td className="py-2 pr-4">{new Date(e.ts).toLocaleString()}</td>
                        <td className="py-2 pr-4">{e.action}</td>
                        <td className="py-2 pr-4 font-mono">{e.wallet?.slice(0,4)}…{e.wallet?.slice(-4)}</td>
                        <td className="py-2 pr-4 font-mono">{e.mint?.slice(0,4)}…{e.mint?.slice(-4)}</td>
                        <td className="py-2 pr-4 font-mono">{e.poolId?.slice(0,4)}…{e.poolId?.slice(-4)}</td>
                        <td className="py-2 pr-4">{e.amountA ?? "-"}</td>
                        <td className="py-2 pr-4">{e.amountB ?? "-"}</td>
                        <td className="py-2 pr-4">
                          <a 
                            className="underline hover:text-blue-600" 
                            href={`https://solscan.io/tx/${e.txSig}`} 
                            target="_blank" 
                            rel="noreferrer"
                          >
                            view
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </>
  );
};

export default AdminRevenuePage;
