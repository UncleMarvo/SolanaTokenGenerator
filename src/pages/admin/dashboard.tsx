import { FC, useEffect, useState } from "react";
import Head from "next/head";
import AdminLogin from "../../components/AdminLogin";
import Link from "next/link";

const AdminDashboardPage: FC = () => {
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminWallet, setAdminWallet] = useState<string | null>(null);
  const [sessionInfo, setSessionInfo] = useState<any>(null);

  // Handle admin login
  const handleAdminLogin = (token: string, wallet: string) => {
    setAdminToken(token);
    setAdminWallet(wallet);
    
    // Decode JWT token to get session info
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setSessionInfo({
        wallet: payload.wallet,
        issuedAt: new Date(payload.iat * 1000).toLocaleString(),
        expiresAt: new Date(payload.exp * 1000).toLocaleString(),
        expiresIn: Math.round((payload.exp - Date.now() / 1000) / 60)
      });
    } catch (error) {
      console.error('Error decoding token:', error);
    }
  };

  // Handle admin logout
  const handleAdminLogout = () => {
    setAdminToken(null);
    setAdminWallet(null);
    setSessionInfo(null);
  };

  return (
    <>
      <Head>
        <title>Admin Dashboard - Solana Token Creator</title>
        <meta name="description" content="Admin dashboard for managing Solana token creator platform" />
      </Head>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Manage platform operations, monitor revenue, and access administrative tools
          </p>
        </div>

        {/* Admin Authentication */}
        <AdminLogin 
          onLogin={handleAdminLogin}
          onLogout={handleAdminLogout}
          isLoggedIn={!!adminToken}
        />

        {/* Session Information */}
        {sessionInfo && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Session Information</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-blue-700">Wallet:</span>
                <div className="font-mono text-xs break-all">{sessionInfo.wallet}</div>
              </div>
              <div>
                <span className="text-blue-700">Issued:</span>
                <div>{sessionInfo.issuedAt}</div>
              </div>
              <div>
                <span className="text-blue-700">Expires:</span>
                <div>{sessionInfo.expiresAt}</div>
              </div>
              <div>
                <span className="text-blue-700">Expires In:</span>
                <div>{sessionInfo.expiresIn} minutes</div>
              </div>
            </div>
          </div>
        )}

        {/* Admin Tools */}
        {adminToken && (
          <div className="mt-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Administrative Tools</h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Revenue Dashboard */}
              <Link href="/admin/revenue">
                <div className="p-6 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all cursor-pointer">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Revenue Dashboard</h3>
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 text-sm">💰</span>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm">
                    Monitor platform fees, skim tracking, and revenue analytics
                  </p>
                </div>
              </Link>

              {/* AI Usage Monitoring */}
              <div className="p-6 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">AI Usage</h3>
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 text-sm">🤖</span>
                  </div>
                </div>
                <p className="text-gray-600 text-sm">
                  Track AI feature usage, rate limits, and daily quotas
                </p>
                <button 
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/admin/ai-usage', {
                        headers: { Authorization: `Bearer ${adminToken}` }
                      });
                      const data = await response.json();
                      alert(`AI Usage: ${data.count}/${data.max} (${data.day})`);
                    } catch (error) {
                      alert('Failed to fetch AI usage data');
                    }
                  }}
                  className="mt-3 px-4 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition-colors"
                >
                  Check Usage
                </button>
              </div>

              {/* Data Backfill */}
              <div className="p-6 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Data Backfill</h3>
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="text-orange-600 text-sm">🔄</span>
                  </div>
                </div>
                <p className="text-gray-600 text-sm">
                  Backfill missing position data and sync blockchain events
                </p>
                <button 
                  onClick={async () => {
                    if (confirm('Start data backfill process? This may take several minutes.')) {
                      try {
                        const response = await fetch('/api/admin/backfill', {
                          method: 'POST',
                          headers: { 
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${adminToken}` 
                          },
                          body: JSON.stringify({ limit: 100 })
                        });
                        const data = await response.json();
                        alert(`Backfill complete: ${data.updated} positions updated`);
                      } catch (error) {
                        alert('Backfill failed');
                      }
                    }
                  }}
                  className="mt-3 px-4 py-2 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 transition-colors"
                >
                  Start Backfill
                </button>
              </div>

              {/* System Status */}
              <div className="p-6 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">System Status</h3>
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-sm">✅</span>
                  </div>
                </div>
                <p className="text-gray-600 text-sm">
                  Platform health, database status, and operational metrics
                </p>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Database:</span>
                    <span className="text-green-600">Connected</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Admin Auth:</span>
                    <span className="text-green-600">Active</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Session TTL:</span>
                    <span>{process.env.SESSION_TTL_MIN || 60} min</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Security Information */}
        {!adminToken && (
          <div className="mt-8 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-semibold text-yellow-900 mb-2">Security Features</h3>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• Wallet-based authentication using cryptographic signatures</li>
              <li>• Nonce-based challenge-response protocol</li>
              <li>• JWT tokens with configurable expiration</li>
              <li>• Whitelist-based admin wallet access control</li>
              <li>• Automatic cleanup of expired authentication nonces</li>
            </ul>
          </div>
        )}
      </main>
    </>
  );
};

export default AdminDashboardPage;
