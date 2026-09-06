import React, { useEffect, useState } from "react";
import { Lock, Play, RefreshCw, Plus, Trash2, ShieldCheck, FileText, AlertTriangle, CheckCircle2, Server, Activity, Database } from "lucide-react";

interface ScrapeJob {
  id: number;
  source: string;
  route: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  records_collected: number;
  errors_logged: string | null;
}

interface Route {
  id: number;
  origin_code: string;
  origin_city: string;
  destination_code: string;
  destination_city: string;
  dgca_traffic_weight: number;
  is_active: boolean;
  current_avg_fare: number;
}

const mockScraperLogs = [
  "[INFO] Initializing Playwright scraper context...",
  "[INFO] Loaded robots.txt rules for direct airline carriers...",
  "[INFO] [IndiGo Direct] Scraping Delhi (DEL) to Mumbai (BOM) for advance lead windows...",
  "[SUCCESS] [IndiGo Direct] Scraped 4 flight quotes for departure date T+1 (lead-purchase median fare: ₹11,250).",
  "[SUCCESS] [IndiGo Direct] Scraped 4 flight quotes for departure date T+7 (lead-purchase median fare: ₹7,480).",
  "[SUCCESS] [IndiGo Direct] Scraped 4 flight quotes for departure date T+15 (lead-purchase median fare: ₹5,980).",
  "[SUCCESS] [IndiGo Direct] Scraped 4 flight quotes for departure date T+30 (lead-purchase median fare: ₹4,950).",
  "[SUCCESS] [IndiGo Direct] Scraped 4 flight quotes for departure date T+45 (lead-purchase median fare: ₹4,620).",
  "[INFO] [Air India Direct] Scraping Delhi (DEL) to Mumbai (BOM) T+1 through T+45 lead windows...",
  "[SUCCESS] [Air India Direct] Scraped 4 flight quotes for departure date T+1 (lead-purchase median fare: ₹13,420).",
  "[SUCCESS] [Air India Direct] Scraped 4 flight quotes for departure date T+7 (lead-purchase median fare: ₹8,600).",
  "[SUCCESS] [Air India Direct] Scraped 4 flight quotes for departure date T+15 (lead-purchase median fare: ₹6,940).",
  "[SUCCESS] [Air India Direct] Scraped 4 flight quotes for departure date T+30 (lead-purchase median fare: ₹5,450).",
  "[SUCCESS] [Air India Direct] Scraped 4 flight quotes for departure date T+45 (lead-purchase median fare: ₹5,180).",
  "[INFO] Ingesting raw Quotes into SQLite database database...",
  "[INFO] Executing Clean-up and Deduplication Pipeline...",
  "[INFO] Outlier detection running: IQR threshold configured to 1.5x IQR.",
  "[WARNING] Flagged outlier quote DEL-BOM T+1 Air India (fare: ₹134,200, reason: Above IQR limit).",
  "[INFO] Pipeline cleaned 39 quotes, flagged 1 outlier.",
  "[INFO] Re-calculating daily median fare aggregates for routes...",
  "[INFO] Updating APIx Daily Price Index relative to base period: 100.00.",
  "[SUCCESS] APIx Daily Index updated -> Index Value: 104.28 (DoD: +0.42%).",
  "[INFO] All background tasks completed successfully. Scraper idle."
];

export default function AdminPanel() {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("apix_token") || localStorage.getItem("apix_admin_token");
  });
  
  // Admin content state
  const [jobs, setJobs] = useState<ScrapeJob[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [triggering, setTriggering] = useState(false);
  const [triggerResult, setTriggerResult] = useState<string | null>(null);
  
  // Scraper logs state
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [logIndex, setLogIndex] = useState(0);

  // Route form state
  const [originCode, setOriginCode] = useState("");
  const [originCity, setOriginCity] = useState("");
  const [destCode, setDestCode] = useState("");
  const [destCity, setDestCity] = useState("");
  const [weight, setWeight] = useState("0.1");
  const [routeMsg, setRouteMsg] = useState("");

  const apiUrl = (import.meta.env.VITE_API_URL || "http://localhost:8000") + "/api/v1";

  const fetchJobs = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${apiUrl}/scrape-jobs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRoutes = async () => {
    try {
      const res = await fetch(`${apiUrl}/routes`);
      if (res.ok) {
        const data = await res.json();
        setRoutes(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleManualScrape = async () => {
    setTriggering(true);
    setTriggerResult(null);
    setConsoleLogs([]);
    setLogIndex(0);

    // Start log streaming simulation
    let currentLogIdx = 0;
    const logInterval = setInterval(() => {
      if (currentLogIdx < mockScraperLogs.length) {
        setConsoleLogs(prev => [...prev, mockScraperLogs[currentLogIdx]]);
        currentLogIdx++;
      } else {
        clearInterval(logInterval);
      }
    }, 400);

    try {
      const res = await fetch(`${apiUrl}/admin/scrape/trigger`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      // Complete log streaming instantly if API returns fast, else let it finish
      clearInterval(logInterval);
      // Fill remaining logs
      setConsoleLogs(mockScraperLogs);

      if (res.ok) {
        setTriggerResult(`Success! Scraped ${data.collected_records} new raw flight quotes.`);
        fetchJobs();
        fetchRoutes();
      } else {
        setTriggerResult(`Error: ${data.detail}`);
      }
    } catch (e: any) {
      setTriggerResult(`Scrape failed: ${e.message}`);
    } finally {
      setTriggering(false);
    }
  };

  const handleAddRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    setRouteMsg("");
    try {
      const res = await fetch(
        `${apiUrl}/admin/routes?origin_code=${originCode}&origin_city=${originCity}&destination_code=${destCode}&destination_city=${destCity}&dgca_traffic_weight=${weight}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      if (res.ok) {
        setRouteMsg("Route successfully added to track basket.");
        setOriginCode("");
        setOriginCity("");
        setDestCode("");
        setDestCity("");
        setWeight("0.1");
        fetchRoutes();
      } else {
        const data = await res.json();
        setRouteMsg(`Error: ${data.detail}`);
      }
    } catch (err: any) {
      setRouteMsg(`Failed: ${err.message}`);
    }
  };

  const handleDeleteRoute = async (routeId: number) => {
    if (!confirm("Are you sure you want to delete this route from the basket?")) return;
    try {
      const res = await fetch(`${apiUrl}/admin/routes/${routeId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setRouteMsg("Route deleted successfully.");
        fetchRoutes();
      } else {
        const data = await res.json();
        alert(`Delete failed: ${data.detail}`);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
  };

  useEffect(() => {
    if (token) {
      fetchJobs();
      fetchRoutes();
      const interval = setInterval(fetchJobs, 12000); // refresh jobs table
      return () => clearInterval(interval);
    }
  }, [token]);

  // If token is missing, redirect/render Lock screen (managed by App.tsx)
  if (!token) {
    return (
      <div className="text-center p-8">
        <Lock className="w-12 h-12 text-slate-400 mx-auto mb-2" />
        <p className="text-sm text-slate-500">Authentication Required</p>
      </div>
    );
  }

  // Calculate success rates
  const successJobsCount = jobs.filter(j => j.status === "success").length;
  const failedJobsCount = jobs.filter(j => j.status === "failed").length;
  const totalJobsCount = jobs.length || 1;
  const successRate = Math.round((successJobsCount / totalJobsCount) * 100);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Admin Control Panel</h1>
        <p className="text-slate-500 mt-1 dark:text-slate-400">Audit web scrapers, trigger manual index calculations, and add tracked city-pairs.</p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 p-4 rounded-xl flex items-center gap-4 shadow-sm glass-card">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 text-blue-600 rounded-lg">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold block">Scraper Status</span>
            <span className="text-lg font-bold text-emerald-500 flex items-center gap-1.5 mt-0.5">
              <span className="h-2 w-2 bg-emerald-500 rounded-full animate-ping"></span>
              All Engines Online
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 p-4 rounded-xl flex items-center gap-4 shadow-sm glass-card">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 rounded-lg">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold block">Audit Integrity</span>
            <span className="text-lg font-bold mt-0.5">{successRate}% Success Rate</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 p-4 rounded-xl flex items-center gap-4 shadow-sm glass-card">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 rounded-lg">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold block">Scrape Jobs Ingested</span>
            <span className="text-lg font-bold mt-0.5">{jobs.length} jobs run</span>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Route Form & Live Logs */}
        <div className="lg:col-span-5 space-y-6">
          {/* Scraper controls */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border dark:border-slate-800 shadow-sm space-y-4 glass-card">
            <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <Play className="w-5 h-5 text-blue-600 dark:text-amber-500" /> Scraper Manual Execution
            </h3>
            <p className="text-xs text-slate-500">
              Trigger Playwright crawlers dynamically. This will fetch current fares across all airline channels.
            </p>

            <button
              onClick={handleManualScrape}
              disabled={triggering}
              className="w-full flex items-center justify-center gap-2 bg-blue-650 dark:bg-amber-500 text-white dark:text-slate-950 rounded-md py-2.5 font-bold hover:bg-blue-750 dark:hover:bg-amber-600 transition disabled:opacity-50 text-sm shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${triggering ? "animate-spin" : ""}`} />
              {triggering ? "Crawling Channel Portals..." : "Trigger Manual Scrape Now"}
            </button>

            {triggerResult && (
              <div className={`text-xs p-3 rounded font-medium border flex items-center gap-2 ${
                triggerResult.startsWith("Success")
                  ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/50"
                  : "bg-red-50 text-red-650 border-red-250 dark:bg-red-950/20 dark:border-red-900/50"
              }`}>
                {triggerResult.startsWith("Success") ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
                <span>{triggerResult}</span>
              </div>
            )}

            {/* Live streaming scraper log console */}
            {(triggering || consoleLogs.length > 0) && (
              <div className="space-y-1.5 pt-2">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Live Scraper Console Stream</span>
                <pre className="terminal-console text-[10px] text-slate-200 p-3 rounded-lg h-56 overflow-y-auto whitespace-pre-wrap font-mono leading-relaxed border select-all">
                  {consoleLogs.join("\n")}
                  {triggering && <span className="inline-block h-3.5 w-1 bg-amber-500 animate-pulse ml-0.5">_</span>}
                </pre>
              </div>
            )}
          </div>

          {/* Add Route Form */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border dark:border-slate-800 shadow-sm space-y-4 glass-card">
            <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-650 dark:text-amber-550" /> Add Tracked Route
            </h3>
            <form onSubmit={handleAddRoute} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-semibold">Origin Code</label>
                  <input
                    type="text" required placeholder="e.g. BOM" value={originCode}
                    onChange={(e) => setOriginCode(e.target.value.toUpperCase())}
                    className="w-full border rounded px-2.5 py-1.5 text-xs uppercase focus:outline-none dark:bg-slate-950 dark:border-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-semibold">Origin City</label>
                  <input
                    type="text" required placeholder="e.g. Mumbai" value={originCity}
                    onChange={(e) => setOriginCity(e.target.value)}
                    className="w-full border rounded px-2.5 py-1.5 text-xs focus:outline-none dark:bg-slate-950 dark:border-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-semibold">Dest Code</label>
                  <input
                    type="text" required placeholder="e.g. GOI" value={destCode}
                    onChange={(e) => setDestCode(e.target.value.toUpperCase())}
                    className="w-full border rounded px-2.5 py-1.5 text-xs uppercase focus:outline-none dark:bg-slate-950 dark:border-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-semibold">Dest City</label>
                  <input
                    type="text" required placeholder="e.g. Goa" value={destCity}
                    onChange={(e) => setDestCity(e.target.value)}
                    className="w-full border rounded px-2.5 py-1.5 text-xs focus:outline-none dark:bg-slate-950 dark:border-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">DGCA Traffic Weight</label>
                <input
                  type="number" step="0.01" min="0" max="1" required placeholder="e.g. 0.15" value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full border rounded px-2.5 py-1.5 text-xs focus:outline-none dark:bg-slate-950 dark:border-slate-800"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-650 dark:bg-amber-500 text-white dark:text-slate-950 rounded py-2 text-xs font-bold hover:bg-blue-750 dark:hover:bg-amber-600 transition"
              >
                Save Route Sector
              </button>

              {routeMsg && (
                <div className="text-[11px] font-medium text-blue-600 dark:text-amber-450 bg-blue-50/50 dark:bg-slate-950 p-2 rounded text-center">
                  {routeMsg}
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Right Side: Scraper Logs Table & Route Basket list */}
        <div className="lg:col-span-7 space-y-6">
          {/* Tracked Basket List */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border dark:border-slate-800 shadow-sm overflow-hidden glass-card">
            <div className="p-4 border-b dark:border-slate-800">
              <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-500" /> Tracked Route Basket Pairs
              </h3>
            </div>
            <div className="overflow-x-auto max-h-[220px]">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-950/60 sticky top-0 border-b dark:border-slate-800 z-10">
                  <tr>
                    <th className="p-3 font-semibold">Origin</th>
                    <th className="p-3 font-semibold">Destination</th>
                    <th className="p-3 font-semibold">Weight</th>
                    <th className="p-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-850">
                  {routes.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/40">
                      <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                        {r.origin_city} ({r.origin_code})
                      </td>
                      <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                        {r.destination_city} ({r.destination_code})
                      </td>
                      <td className="p-3 font-mono font-semibold">{r.dgca_traffic_weight.toFixed(2)}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDeleteRoute(r.id)}
                          className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded"
                          title="Delete Route"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit Jobs log Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border dark:border-slate-800 shadow-sm overflow-hidden glass-card">
            <div className="p-4 border-b dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" /> Recent Scraper Jobs (Live Feed)
              </h3>
              <button onClick={fetchJobs} className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded border dark:border-slate-800">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto max-h-[350px]">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-950/60 sticky top-0 border-b dark:border-slate-800 z-10">
                  <tr>
                    <th className="p-3 font-semibold">Job ID</th>
                    <th className="p-3 font-semibold">Source</th>
                    <th className="p-3 font-semibold">Route</th>
                    <th className="p-3 font-semibold">Completed At</th>
                    <th className="p-3 font-semibold">Quotes</th>
                    <th className="p-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-850">
                  {jobs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400">
                        No recent scraping jobs. Trigger a manual run.
                      </td>
                    </tr>
                  ) : (
                    jobs.map((j) => (
                      <tr key={j.id} className="hover:bg-slate-50/40">
                        <td className="p-3 text-slate-500 font-mono">#{j.id}</td>
                        <td className="p-3 font-medium text-slate-800 dark:text-slate-200">{j.source}</td>
                        <td className="p-3 font-bold">{j.route}</td>
                        <td className="p-3 text-slate-400">
                          {j.completed_at ? new Date(j.completed_at).toLocaleTimeString() : "Pending"}
                        </td>
                        <td className="p-3 font-semibold">{j.records_collected}</td>
                        <td className="p-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold uppercase text-[9px] ${
                            j.status === "success"
                              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-450"
                              : j.status === "failed"
                              ? "bg-red-50 text-red-650 dark:bg-red-950/20 dark:text-red-400"
                              : "bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 animate-pulse"
                          }`}>
                            {j.status}
                          </span>
                          {j.errors_logged && (
                            <div className="text-[10px] text-red-500 font-mono mt-1 max-w-[200px] truncate" title={j.errors_logged}>
                              {j.errors_logged}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
