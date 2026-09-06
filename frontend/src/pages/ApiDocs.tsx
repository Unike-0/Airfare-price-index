import React, { useState, useEffect } from "react";
import { Terminal, Key, ShieldCheck, Copy, Check, Download, Play, RefreshCw, Sparkles, AlertTriangle } from "lucide-react";

interface UserProfile {
  username: string;
  role: "admin" | "analyst" | "api_user" | "public";
  api_key?: string;
  api_tier?: "bronze" | "silver" | "gold";
  api_limit?: number;
  api_usage?: number;
}

interface ApiDocsProps {
  activeUser: UserProfile | null;
  onUpdateUser?: (user: UserProfile) => void;
}

export default function ApiDocs({ activeUser, onUpdateUser }: ApiDocsProps) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [apiTier, setApiTier] = useState<string>("bronze");
  const [apiLimit, setApiLimit] = useState<number>(100);
  const [apiUsage, setApiUsage] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  // Upgrade state
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState("");

  // Sandbox playground state
  const [endpoint, setEndpoint] = useState<string>("/api/v1/index");
  const [paramFreq, setParamFreq] = useState<string>("daily");
  const [paramRoute, setParamRoute] = useState<string>("1");
  const [paramOrigin, setParamOrigin] = useState<string>("DEL");
  const [paramDest, setParamDest] = useState<string>("BOM");
  const [paramDate, setParamDate] = useState<string>(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]); // T+7 days
  const [sandboxResult, setSandboxResult] = useState<string>("");
  const [sandboxLoading, setSandboxLoading] = useState(false);
  const [sandboxStatus, setSandboxStatus] = useState<number | null>(null);

  const apiUrl = (import.meta.env.VITE_API_URL || "http://localhost:8000");

  useEffect(() => {
    if (activeUser && activeUser.api_key) {
      setApiKey(activeUser.api_key);
      setApiTier(activeUser.api_tier || "bronze");
      setApiLimit(activeUser.api_limit || 100);
      setApiUsage(activeUser.api_usage || 0);
    } else {
      // Load public generated key from local storage if any
      const savedKey = localStorage.getItem("apix_public_key");
      if (savedKey) {
        setApiKey(savedKey);
        fetchPublicKeyDetails(savedKey);
      }
    }
  }, [activeUser]);

  const fetchPublicKeyDetails = async (keyString: string) => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/api-key/me?api_key=${keyString}`);
      if (res.ok) {
        const data = await res.json();
        setApiTier(data.api_tier);
        setApiLimit(data.api_limit);
        setApiUsage(data.api_usage);
      }
    } catch (e) {
      console.error("Failed to fetch public key details:", e);
    }
  };

  const requestApiKey = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/v1/api-key/request`, {
        method: "POST"
      });
      const data = await res.json();
      setApiKey(data.api_key);
      setApiTier(data.api_tier);
      setApiLimit(100);
      setApiUsage(0);
      localStorage.setItem("apix_public_key", data.api_key);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (tier: "bronze" | "silver" | "gold") => {
    if (!apiKey) return;
    setUpgrading(true);
    setUpgradeMsg("");
    try {
      const res = await fetch(`${apiUrl}/api/v1/api-key/upgrade?api_key=${apiKey}&tier=${tier}`, {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        setApiTier(data.api_tier);
        setApiLimit(data.api_limit);
        setUpgradeMsg(`Successfully upgraded to ${tier.toUpperCase()} tier!`);
        
        // Notify parent state if active logged-in user
        if (activeUser && onUpdateUser) {
          onUpdateUser({
            ...activeUser,
            api_tier: data.api_tier,
            api_limit: data.api_limit
          });
        }
      } else {
        const data = await res.json();
        setUpgradeMsg(`Upgrade failed: ${data.detail}`);
      }
    } catch (e: any) {
      setUpgradeMsg(`Upgrade error: ${e.message}`);
    } finally {
      setUpgrading(false);
    }
  };

  const runSandboxQuery = async () => {
    if (!apiKey) {
      setSandboxResult("Error: You must generate or sign in with an API key first.");
      return;
    }
    setSandboxLoading(true);
    setSandboxResult("");
    setSandboxStatus(null);

    let queryUrl = "";
    let headers: Record<string, string> = {
      "Accept": "application/json",
      "x-api-key": apiKey
    };

    // Formulate endpoint path
    if (endpoint === "/api/v1/index") {
      queryUrl = `${apiUrl}/api/v1/index?frequency=${paramFreq}`;
    } else if (endpoint === "/api/v1/index/history") {
      queryUrl = `${apiUrl}/api/v1/index/history?frequency=${paramFreq}`;
    } else if (endpoint === "/api/v1/routes") {
      queryUrl = `${apiUrl}/api/v1/routes`;
    } else if (endpoint === "/api/v1/search/live") {
      queryUrl = `${apiUrl}/api/v1/search/live?origin=${paramOrigin}&destination=${paramDest}&date_str=${paramDate}`;
      headers["Content-Type"] = "application/json";
    }

    try {
      const start = performance.now();
      const method = endpoint === "/api/v1/search/live" ? "POST" : "GET";
      const res = await fetch(queryUrl, {
        method: method,
        headers: headers
      });
      const end = performance.now();
      
      setSandboxStatus(res.status);
      const latency = (end - start).toFixed(0);

      const resText = await res.text();
      try {
        const json = JSON.parse(resText);
        setSandboxResult(`// HTTP Status: ${res.status} ${res.statusText}\n// Latency: ${latency}ms\n\n` + JSON.stringify(json, null, 2));
      } catch {
        setSandboxResult(`// HTTP Status: ${res.status} ${res.statusText}\n// Latency: ${latency}ms\n\n` + resText);
      }

      // Update local usage indicator
      if (res.ok) {
        setApiUsage(prev => prev + 1);
        if (activeUser && onUpdateUser) {
          onUpdateUser({
            ...activeUser,
            api_usage: (activeUser.api_usage || 0) + 1
          });
        }
      }
    } catch (e: any) {
      setSandboxResult(`Connection Error: ${e.message}`);
    } finally {
      setSandboxLoading(false);
    }
  };

  const copyToClipboard = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const curlExample = `curl -X GET "${apiUrl}/api/v1/index?frequency=daily" \\
  -H "Accept: application/json" \\
  -H "x-api-key: ${apiKey || "YOUR_API_KEY"}"`;

  // Compute usage percentage
  const usagePercent = Math.min(100, Math.round((apiUsage / (apiLimit || 1)) * 100));

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">API Developer Workspace</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Access Domestic Airfare Index averages and live pricing structures programmatically for NSO, RBI, and policy dashboards.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: API Key Credentials Dashboard */}
        <div className="lg:col-span-1 space-y-6">
          {/* Key Management Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border dark:border-slate-800 shadow-sm space-y-5 glass-card">
            <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-amber-500" /> Key Credentials
            </h3>

            {apiKey ? (
              <div className="space-y-4">
                {/* Active Key Details */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-450 uppercase font-bold">Your API Key</span>
                  <div className="flex items-center gap-2 border dark:border-slate-800 rounded bg-slate-50 dark:bg-slate-950 p-2.5">
                    <span className="font-mono text-xs text-slate-700 dark:text-slate-300 truncate select-all">
                      {apiKey}
                    </span>
                    <button
                      onClick={() => copyToClipboard(apiKey, setCopiedKey)}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded ml-auto text-slate-400"
                      title="Copy Key"
                    >
                      {copiedKey ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Tier details */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded border dark:border-slate-850">
                    <span className="text-[10px] text-slate-450 uppercase font-semibold">Active Tier</span>
                    <div className="text-sm font-bold text-amber-500 dark:text-amber-400 mt-0.5 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      {apiTier.toUpperCase()}
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded border dark:border-slate-850">
                    <span className="text-[10px] text-slate-450 uppercase font-semibold">Quota Speed</span>
                    <div className="text-sm font-bold mt-0.5">{apiLimit} req/hr</div>
                  </div>
                </div>

                {/* Usage meter */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-slate-500">
                    <span>Hourly Rate Quota</span>
                    <span>{apiUsage} / {apiLimit} requests</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        usagePercent > 80 ? "bg-red-500" : usagePercent > 50 ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                      style={{ width: `${usagePercent}%` }}
                    ></div>
                  </div>
                </div>

                {/* Request Upgrades */}
                <div className="border-t dark:border-slate-850 pt-4">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-2">Upgrade Subscription Tier</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleUpgrade("silver")}
                      disabled={upgrading || apiTier === "silver" || apiTier === "gold"}
                      className="px-2 py-1.5 border dark:border-slate-850 rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition disabled:opacity-40"
                    >
                      Silver (1k/hr)
                    </button>
                    <button
                      onClick={() => handleUpgrade("gold")}
                      disabled={upgrading || apiTier === "gold"}
                      className="px-2 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded text-xs font-bold transition disabled:opacity-40 flex items-center justify-center gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5 fill-current" />
                      Gold (5k/hr)
                    </button>
                  </div>
                  {upgradeMsg && (
                    <div className="text-[10px] text-center font-semibold text-amber-500 dark:text-amber-400 mt-2">
                      {upgradeMsg}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-500 leading-relaxed">
                  API endpoints are rate-limited. Generate a mock credentials key below to explore our API playground or connect to external databases.
                </p>
                <button
                  onClick={requestApiKey}
                  disabled={loading}
                  className="w-full bg-blue-600 dark:bg-amber-500 text-white dark:text-slate-950 hover:bg-blue-700 dark:hover:bg-amber-600 font-bold rounded py-2 text-sm disabled:opacity-50 transition shadow"
                >
                  {loading ? "Generating Credentials..." : "Generate Sandbox API Key"}
                </button>
              </div>
            )}
          </div>

          {/* Historical Data Bulk Downloads */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border dark:border-slate-800 shadow-sm space-y-4 glass-card">
            <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <Download className="w-5 h-5 text-emerald-500" /> Bulk Export Services
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Gold Tier subscribers can download the entire historical daily, weekly, and monthly airfare index time-series calculations in a raw CSV table structure.
            </p>

            {apiTier === "gold" && apiKey ? (
              <a
                href={`${apiUrl}/api/v1/index/bulk?api_key=${apiKey}`}
                download
                className="w-full flex items-center justify-center gap-2 bg-emerald-650 hover:bg-emerald-700 text-white rounded font-bold py-2 text-sm transition"
              >
                <Download className="w-4 h-4" /> Download Complete Index (CSV)
              </a>
            ) : (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded border border-amber-250/20 text-slate-650 dark:text-slate-400 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-600">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" /> Upgrade Required
                </div>
                <p className="text-[10px]">
                  Bulk time-series downloading is locked under your current active rate limit level. Please upgrade to the **Gold Tier** to unlock.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Columns: API Playground sandbox */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border dark:border-slate-800 shadow-sm space-y-5 glass-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b dark:border-slate-800 pb-3 gap-2">
              <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                <Terminal className="w-5 h-5 text-blue-500" /> Interactive Endpoint Sandbox
              </h3>
              <div className="text-[10px] bg-slate-550/20 text-slate-400 font-semibold px-2 py-0.5 rounded border dark:border-slate-800">
                x-api-key Authentication Injected
              </div>
            </div>

            {/* Sandbox inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Target Endpoint</label>
                <select
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  className="w-full border dark:border-slate-800 rounded bg-slate-50 dark:bg-slate-950 p-2 text-xs font-semibold focus:outline-none"
                >
                  <option value="/api/v1/index">GET /api/v1/index (Latest index summary)</option>
                  <option value="/api/v1/index/history">GET /api/v1/index/history (Time series data)</option>
                  <option value="/api/v1/routes">GET /api/v1/routes (Tracked basket pairs)</option>
                  <option value="/api/v1/search/live">POST /api/v1/search/live (Trigger Live Scrape)</option>
                </select>
              </div>

              {/* Dynamic inputs based on endpoint */}
              {(endpoint === "/api/v1/index" || endpoint === "/api/v1/index/history") && (
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Frequency</label>
                  <select
                    value={paramFreq}
                    onChange={(e) => setParamFreq(e.target.value)}
                    className="w-full border dark:border-slate-800 rounded bg-slate-50 dark:bg-slate-950 p-2 text-xs font-semibold focus:outline-none"
                  >
                    <option value="daily">Daily Index</option>
                    <option value="weekly">Weekly Rolling Index</option>
                    <option value="monthly">Monthly Rolling Index</option>
                  </select>
                </div>
              )}

              {endpoint === "/api/v1/search/live" && (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-semibold">Origin</label>
                    <input
                      type="text"
                      value={paramOrigin}
                      onChange={(e) => setParamOrigin(e.target.value.toUpperCase())}
                      className="w-full border dark:border-slate-800 rounded bg-slate-50 dark:bg-slate-950 p-1.5 text-xs text-center focus:outline-none uppercase font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-semibold">Dest</label>
                    <input
                      type="text"
                      value={paramDest}
                      onChange={(e) => setParamDest(e.target.value.toUpperCase())}
                      className="w-full border dark:border-slate-800 rounded bg-slate-50 dark:bg-slate-950 p-1.5 text-xs text-center focus:outline-none uppercase font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-semibold">Date</label>
                    <input
                      type="date"
                      value={paramDate}
                      onChange={(e) => setParamDate(e.target.value)}
                      className="w-full border dark:border-slate-800 rounded bg-slate-50 dark:bg-slate-950 p-1 text-xs focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Run query button */}
            <button
              onClick={runSandboxQuery}
              disabled={sandboxLoading || !apiKey}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 dark:bg-amber-500 text-white dark:text-slate-950 hover:bg-blue-700 dark:hover:bg-amber-600 font-bold rounded py-2 text-sm transition disabled:opacity-50 shadow"
            >
              {sandboxLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Querying API Server...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" /> Send Request Query
                </>
              )}
            </button>

            {/* Output terminal console */}
            <div className="space-y-2">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Console Output Response</span>
              <pre className="terminal-console text-[11px] text-slate-200 p-4 rounded-lg h-72 overflow-y-auto whitespace-pre-wrap select-all font-mono leading-relaxed border">
                {sandboxResult || "// Select an endpoint parameter config and send request. JSON results will render here."}
              </pre>
            </div>
          </div>

          {/* Integration specifications */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border dark:border-slate-800 shadow-sm space-y-4 glass-card">
            <h3 className="font-semibold text-slate-850 dark:text-white">cURL Integration Command</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase">
                <span>Bash / curl command</span>
                <button
                  onClick={() => copyToClipboard(curlExample, setCopiedCurl)}
                  className="flex items-center gap-1 hover:text-slate-650 dark:hover:text-slate-350 transition"
                >
                  {copiedCurl ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCurl ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <pre className="bg-slate-950 text-slate-200 p-3 rounded-lg text-[10px] font-mono whitespace-pre-wrap leading-relaxed border border-slate-850 select-all">
                {curlExample}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
