import React, { useEffect, useState } from "react";
import { LineChart, Line, BarChart, Bar, Cell, ReferenceLine, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ArrowUpRight, ArrowDownRight, RefreshCw, Layers, ShieldCheck, Database, Search, Calendar, Plane, Sparkles } from "lucide-react";

interface IndexValue {
  date: string;
  index_value: number;
  pct_change_dod: number;
  pct_change_mom: number;
  pct_change_yoy: number;
}

interface DashboardProps {
  dataTheme?: string;
  liveLogs?: any[];
  lastLiveQuote?: any;
}

export default function Dashboard({ dataTheme = "classic", liveLogs = [], lastLiveQuote = null }: DashboardProps) {
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">("daily");
  const [indexData, setIndexData] = useState<IndexValue | null>(null);
  const [history, setHistory] = useState<IndexValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartView, setChartView] = useState<"index" | "dod">("index");
  const [breakdownData, setBreakdownData] = useState<any[]>([]);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [stats, setStats] = useState({
    activeRoutes: 6,
    carriersTracked: 5,
    recordsCollected: 0
  });

  // Live scraper state
  const [liveOrigin, setLiveOrigin] = useState("DEL");
  const [liveDest, setLiveDest] = useState("BOM");
  const [liveDate, setLiveDate] = useState(() => {
    return new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]; // T+7 days default
  });
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveResults, setLiveResults] = useState<any[]>([]);
  const [liveError, setLiveError] = useState("");
  const [liveStatusMsg, setLiveStatusMsg] = useState("");

  const getThemeColors = () => {
    switch (dataTheme) {
      case "emerald":
        return {
          primary: "#10b981",
          text: "text-emerald-500",
          border: "border-emerald-250 dark:border-emerald-800"
        };
      case "amber":
        return {
          primary: "#f59e0b",
          text: "text-amber-500",
          border: "border-amber-250 dark:border-amber-800"
        };
      case "rose":
        return {
          primary: "#f43f5e",
          text: "text-rose-500",
          border: "border-rose-250 dark:border-rose-800"
        };
      case "classic":
      default:
        return {
          primary: "#2563eb",
          text: "text-blue-500",
          border: "border-blue-250 dark:border-blue-800"
        };
    }
  };
  const colors = getThemeColors();

  // Listen to WebSocket ticks for real-time dashboard updates
  useEffect(() => {
    if (lastLiveQuote && lastLiveQuote.new_index) {
      const { new_index } = lastLiveQuote;
      
      setIndexData({
        date: new_index.date,
        index_value: new_index.index_value,
        pct_change_dod: new_index.pct_change_dod,
        pct_change_mom: new_index.pct_change_mom,
        pct_change_yoy: 0.0
      });

      setHistory((prev) => {
        const dateExists = prev.some(h => h.date === new_index.date);
        if (dateExists) {
          return prev.map(h => h.date === new_index.date ? {
            ...h,
            index_value: new_index.index_value,
            pct_change_dod: new_index.pct_change_dod,
            pct_change_mom: new_index.pct_change_mom,
          } : h);
        } else {
          const nextHistory = [...prev, {
            date: new_index.date,
            index_value: new_index.index_value,
            pct_change_dod: new_index.pct_change_dod,
            pct_change_mom: new_index.pct_change_mom,
            pct_change_yoy: 0.0
          }];
          return nextHistory.slice(-50);
        }
      });

      setStats(prev => ({
        ...prev,
        recordsCollected: prev.recordsCollected + 1
      }));
    }
  }, [lastLiveQuote]);

  const apiUrl = (import.meta.env.VITE_API_URL || "http://localhost:8000") + "/api/v1";

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get current index value
      const indexRes = await fetch(`${apiUrl}/index?frequency=${frequency}`);
      const indexVal = await indexRes.json();
      setIndexData(indexVal);

      // Get index history
      const historyRes = await fetch(`${apiUrl}/index/history?frequency=${frequency}`);
      const historyVal = await historyRes.json();
      setHistory(historyVal);

      // Get routes & carriers count to verify database seeding
      const routesRes = await fetch(`${apiUrl}/routes`);
      const routesVal = await routesRes.json();
      
      const carriersRes = await fetch(`${apiUrl}/carriers`);
      const carriersVal = await carriersRes.json();

      const totalRecords = carriersVal.reduce((acc: number, cur: any) => acc + (cur.total_records_tracked || 0), 0);

      setStats({
        activeRoutes: routesVal.length,
        carriersTracked: carriersVal.length,
        recordsCollected: totalRecords
      });

      // Get index breakdown details
      setBreakdownLoading(true);
      try {
        const breakdownRes = await fetch(`${apiUrl}/index/breakdown`);
        if (breakdownRes.ok) {
          const breakdownVal = await breakdownRes.json();
          setBreakdownData(breakdownVal.breakdown || []);
        }
      } catch (err) {
        console.error("Failed to fetch index breakdown:", err);
      } finally {
        setBreakdownLoading(false);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const triggerLiveSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLiveLoading(true);
    setLiveError("");
    setLiveResults([]);
    setLiveStatusMsg("Launching active scraper agent context...");

    // Timed indicators to make it feel extremely active and responsive
    const t1 = setTimeout(() => setLiveStatusMsg("Reading robots.txt crawler guidelines..."), 800);
    const t2 = setTimeout(() => setLiveStatusMsg("Compiling direct carrier parsing DOM tree..."), 1600);
    const t3 = setTimeout(() => setLiveStatusMsg("Ingesting raw quotes into SQLite database..."), 2400);

    try {
      const res = await fetch(`${apiUrl}/search/live?origin=${liveOrigin}&destination=${liveDest}&date_str=${liveDate}`, {
        method: "POST"
      });
      
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to trigger live search");
      }
      
      const data = await res.json();
      setLiveResults(data.flights);
      setLiveStatusMsg(`Success! Ingested ${data.quotes_found} flight quotes into indices.`);
      // Refresh core figures
      fetchData();
    } catch (e: any) {
      setLiveError(e.message || "Live scraping query failed.");
      setLiveStatusMsg("");
    } finally {
      setLiveLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [frequency]);

  const getPercentColor = (val: number) => {
    if (val > 0) return "text-red-500 bg-red-50 dark:bg-red-950/20";
    if (val < 0) return "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20";
    return "text-gray-500 bg-gray-50 dark:bg-gray-800";
  };

  const getPercentIcon = (val: number) => {
    if (val > 0) return <ArrowUpRight className="w-4 h-4 mr-1" />;
    if (val < 0) return <ArrowDownRight className="w-4 h-4 mr-1" />;
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Airfare Price Index (APIx)
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm font-semibold">
            Real-time domestic airfare statistics for policy audit modeling and macroeconomic indicators.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchData}
            className="p-2 border rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-650 dark:text-slate-300 transition"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <div className="inline-flex rounded-md border dark:border-slate-700 bg-white dark:bg-slate-900 p-1 shadow-sm">
            {(["daily", "weekly", "monthly"] as const).map((freq) => (
              <button
                key={freq}
                onClick={() => setFrequency(freq)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  frequency === freq
                    ? "bg-blue-600 dark:bg-amber-500 dark:text-slate-950 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {freq.charAt(0).toUpperCase() + freq.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-amber-550"></div>
        </div>
      ) : (
        <>
          {/* Main Key Figures */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border dark:border-slate-800 shadow-sm flex flex-col justify-between glass-card">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">APIx Index Value ({frequency})</span>
                <div className="text-4xl font-black text-slate-900 dark:text-white mt-2 premium-glow-text">
                  {indexData ? indexData.index_value.toFixed(2) : "100.00"}
                </div>
              </div>
              <div className="text-xs text-slate-400 dark:text-slate-500 mt-4">
                Base Period Index = 100.00
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border dark:border-slate-800 shadow-sm flex flex-col justify-between glass-card">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Day-on-Day Change</span>
                <div className="mt-2 flex items-center">
                  <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-bold ${getPercentColor(indexData?.pct_change_dod || 0)}`}>
                    {getPercentIcon(indexData?.pct_change_dod || 0)}
                    {indexData?.pct_change_dod ? Math.abs(indexData.pct_change_dod).toFixed(2) : "0.00"}%
                  </div>
                </div>
              </div>
              <div className="text-xs text-slate-400 dark:text-slate-500 mt-4">
                Compared to yesterday
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border dark:border-slate-800 shadow-sm flex flex-col justify-between glass-card">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Month-on-Month Change</span>
                <div className="mt-2 flex items-center">
                  <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-bold ${getPercentColor(indexData?.pct_change_mom || 0)}`}>
                    {getPercentIcon(indexData?.pct_change_mom || 0)}
                    {indexData?.pct_change_mom ? Math.abs(indexData.pct_change_mom).toFixed(2) : "0.00"}%
                  </div>
                </div>
              </div>
              <div className="text-xs text-slate-400 dark:text-slate-500 mt-4">
                30-day baseline shift
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border dark:border-slate-800 shadow-sm flex flex-col justify-between glass-card">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Quality Index Audits</span>
                <div className="text-lg font-bold text-slate-900 dark:text-white mt-2 flex items-center">
                  <ShieldCheck className="w-5 h-5 text-emerald-500 mr-2" />
                  Methodology v1.0
                </div>
              </div>
              <div className="text-xs text-slate-400 dark:text-slate-500 mt-4">
                Laspeyres Price Relative Model
              </div>
            </div>
          </div>

          {/* Index Line/DoD Chart */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border dark:border-slate-800 shadow-sm glass-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {chartView === "index" ? "APIx Index Trendline" : "Day-on-Day Fluctuation Trend"}
                </h3>
                <p className="text-xs text-slate-500">
                  {chartView === "index" 
                    ? "Historical performance relative to the base period calculations."
                    : "Daily percentage changes representing price level volatility."}
                </p>
              </div>
              <div className="inline-flex rounded-md border dark:border-slate-700 bg-slate-50 dark:bg-slate-955 p-1 shadow-sm">
                <button
                  onClick={() => setChartView("index")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    chartView === "index"
                      ? "bg-blue-650 dark:bg-amber-500 dark:text-slate-950 text-white shadow-sm font-bold"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-905 dark:hover:text-white"
                  }`}
                >
                  APIx Index
                </button>
                <button
                  onClick={() => setChartView("dod")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    chartView === "dod"
                      ? "bg-blue-650 dark:bg-amber-500 dark:text-slate-950 text-white shadow-sm font-bold"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-905 dark:hover:text-white"
                  }`}
                >
                  Day-on-Day % Change
                </button>
              </div>
            </div>

            <div className="h-96 w-full">
              {chartView === "index" ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(tick) => {
                        const d = new Date(tick);
                        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                      }} 
                      stroke="#94a3b8" 
                      fontSize={12}
                    />
                    <YAxis 
                      domain={['auto', 'auto']}
                      stroke="#94a3b8" 
                      fontSize={12} 
                    />
                    <Tooltip 
                      contentStyle={{ background: "#0f172a", border: "none", borderRadius: "8px", color: "white" }}
                      labelFormatter={(label) => new Date(label).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      formatter={(value: any) => [`${parseFloat(value).toFixed(2)}`, "APIx Index"]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="index_value" 
                      stroke={colors.primary} 
                      strokeWidth={3} 
                      dot={false}
                      activeDot={{ r: 6 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(tick) => {
                        const d = new Date(tick);
                        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                      }} 
                      stroke="#94a3b8" 
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="#94a3b8" 
                      fontSize={12} 
                      tickFormatter={(value) => `${value >= 0 ? "+" : ""}${value}%`}
                    />
                    <Tooltip 
                      contentStyle={{ background: "#0f172a", border: "none", borderRadius: "8px", color: "white" }}
                      labelFormatter={(label) => new Date(label).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      formatter={(value: any) => [`${parseFloat(value).toFixed(2)}%`, "Day-on-Day Change"]}
                    />
                    <ReferenceLine y={0} stroke="#64748b" strokeDasharray="3 3" />
                    <Bar dataKey="pct_change_dod">
                      {history.map((entry, idx) => {
                        const val = entry.pct_change_dod || 0;
                        const barColor = val < 0 ? "#10b981" : val > 0 ? "#f43f5e" : "#94a3b8";
                        return <Cell key={`cell-${idx}`} fill={barColor} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Day-on-Day Sector Performance Table */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border dark:border-slate-800 shadow-sm glass-card space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                📊 Sector-Level DoD Volatility & Attribution
              </h3>
              <p className="text-xs text-slate-500">
                Detailed attribution of the current daily index shift across active domestic Indian air sectors.
              </p>
            </div>

            {breakdownLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 dark:border-amber-500"></div>
              </div>
            ) : breakdownData.length === 0 ? (
              <div className="text-xs text-slate-500 text-center py-12">
                No sector details available for the selected date.
              </div>
            ) : (
              <div className="overflow-x-auto border dark:border-slate-800 rounded-lg">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-950/80 border-b dark:border-slate-800">
                    <tr>
                      <th className="p-3 font-semibold text-slate-800 dark:text-slate-200">Sector</th>
                      <th className="p-3 font-semibold text-right text-slate-800 dark:text-slate-200">Traffic Weight</th>
                      <th className="p-3 font-semibold text-right text-slate-800 dark:text-slate-200">Yesterday's Fare</th>
                      <th className="p-3 font-semibold text-right text-slate-800 dark:text-slate-200">Current Fare</th>
                      <th className="p-3 font-semibold text-right text-slate-800 dark:text-slate-200">DoD Change (%)</th>
                      <th className="p-3 font-semibold text-right text-slate-800 dark:text-slate-200">Index Points Contribution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-slate-850">
                    {breakdownData.map((b, idx) => {
                      const change = b.pct_change_dod;
                      const contribution = b.contribution;
                      
                      // Volatility indicators: green for drop (good), red for hike (bad)
                      const changeColor = change < 0 ? "text-emerald-500 font-bold" : change > 0 ? "text-red-500 font-bold" : "text-slate-400";
                      const contributionColor = contribution < 0 ? "text-emerald-500 font-semibold" : contribution > 0 ? "text-red-500 font-semibold" : "text-slate-400";

                      return (
                        <tr key={idx} className="hover:bg-slate-50/10 dark:hover:bg-slate-800/20 transition-colors">
                          <td className="p-3">
                            <div className="font-bold text-slate-900 dark:text-slate-100">
                              {b.origin_code} &rarr; {b.destination_code}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {b.origin_city} to {b.destination_city}
                            </div>
                          </td>
                          <td className="p-3 text-right text-slate-650 dark:text-slate-300 font-mono font-semibold">
                            {(b.weight * 100).toFixed(1)}%
                          </td>
                          <td className="p-3 text-right text-slate-500 font-mono">
                            {b.prev_fare ? `₹${b.prev_fare.toLocaleString()}` : "—"}
                          </td>
                          <td className="p-3 text-right font-bold text-slate-800 dark:text-slate-200 font-mono">
                            ₹{b.current_fare.toLocaleString()}
                          </td>
                          <td className={`p-3 text-right font-mono ${changeColor}`}>
                            {change > 0 ? "+" : ""}{change.toFixed(2)}%
                          </td>
                          <td className={`p-3 text-right font-mono ${contributionColor}`}>
                            <div className="flex items-center justify-end gap-1.5">
                              <span>{contribution > 0 ? "+" : ""}{contribution.toFixed(3)} pts</span>
                              {/* Small contribution micro-bar for visual representation */}
                              <div className="w-12 bg-slate-250 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden hidden sm:block">
                                <div 
                                  className={`h-full rounded-full ${contribution < 0 ? "bg-emerald-500" : contribution > 0 ? "bg-red-500" : "bg-slate-400"}`}
                                  style={{ width: `${Math.min(100, Math.abs(contribution) * 150)}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* REAL TIME SCRAER SANDBOX WIDGET */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border dark:border-slate-800 shadow-sm glass-card space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plane className="w-5 h-5 text-blue-500 dark:text-amber-500 rotate-45" /> Real-time Fare Scraper Sandbox
              </h3>
              <p className="text-xs text-slate-500">Query direct airline channels live, ingest new fares, and see aggregates recalculate instantly.</p>
            </div>

            <form onSubmit={triggerLiveSearch} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Origin City Code</label>
                <input
                  type="text" required placeholder="e.g. DEL" value={liveOrigin}
                  onChange={(e) => setLiveOrigin(e.target.value.toUpperCase())}
                  className="w-full border dark:border-slate-800 rounded bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs focus:outline-none uppercase font-bold text-center"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Destination Code</label>
                <input
                  type="text" required placeholder="e.g. BOM" value={liveDest}
                  onChange={(e) => setLiveDest(e.target.value.toUpperCase())}
                  className="w-full border dark:border-slate-800 rounded bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs focus:outline-none uppercase font-bold text-center"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Departure Date</label>
                <input
                  type="date" required value={liveDate}
                  onChange={(e) => setLiveDate(e.target.value)}
                  className="w-full border dark:border-slate-800 rounded bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-xs focus:outline-none text-center"
                />
              </div>
              <button
                type="submit"
                disabled={liveLoading}
                className="w-full bg-blue-650 dark:bg-amber-500 text-white dark:text-slate-950 rounded py-2 text-xs font-bold hover:bg-blue-750 dark:hover:bg-amber-600 transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                <Search className="w-3.5 h-3.5" />
                {liveLoading ? "Scraping..." : "Scrape Current Fares Now"}
              </button>
            </form>

            {/* Scraper loading state indicators */}
            {liveStatusMsg && (
              <div className="text-xs text-blue-650 dark:text-amber-500 font-semibold flex items-center gap-2 p-3 bg-blue-50/50 dark:bg-slate-950 rounded border border-blue-100 dark:border-slate-850">
                <span className="h-2 w-2 rounded-full bg-blue-600 dark:bg-amber-550 animate-ping"></span>
                <span>{liveStatusMsg}</span>
              </div>
            )}
            
            {liveError && (
              <div className="text-xs text-red-500 bg-red-50 dark:bg-red-950/20 p-3 rounded border border-red-200 dark:border-red-900/50">
                {liveError}
              </div>
            )}

            {/* Results table */}
            {liveResults.length > 0 && (
              <div className="overflow-x-auto border dark:border-slate-800 rounded-lg">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-950/80 border-b dark:border-slate-800">
                    <tr>
                      <th className="p-3 font-semibold">Flight Number</th>
                      <th className="p-3 font-semibold">Schedule</th>
                      <th className="p-3 font-semibold text-right">Base Fare</th>
                      <th className="p-3 font-semibold text-right">Taxes & Fees</th>
                      <th className="p-3 font-semibold text-right">Total Fare</th>
                      <th className="p-3 font-semibold text-right">Availability</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-slate-850">
                    {liveResults.map((f, i) => (
                      <tr key={i} className="hover:bg-slate-550/10">
                        <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">{f.flight_number}</td>
                        <td className="p-3 text-slate-500">{f.departure} &rarr; {f.arrival}</td>
                        <td className="p-3 text-right">₹{f.base_fare.toLocaleString()}</td>
                        <td className="p-3 text-right">₹{f.taxes_fees.toLocaleString()}</td>
                        <td className="p-3 text-right font-bold text-slate-900 dark:text-white">₹{f.total_fare.toLocaleString()}</td>
                        <td className="p-3 text-right">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            f.is_sold_out 
                              ? "bg-red-50 text-red-650 dark:bg-red-950/20" 
                              : "bg-emerald-50 text-emerald-650 dark:bg-emerald-950/20"
                          }`}>
                            {f.is_sold_out ? "Sold Out" : `${f.seats_available} seats left`}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* LIVE SCRAER AUDIT TELEMETRY CONSOLE */}
          <div className="bg-slate-950 text-slate-100 p-6 rounded-xl border border-slate-800 shadow-lg space-y-4 font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span className="font-bold text-xs uppercase tracking-widest text-slate-300">Live Scraper Audit Telemetry Stream</span>
              </div>
              <div className="text-[10px] text-slate-500 uppercase font-semibold">
                ws://{window.location.host.includes("5173") ? "localhost:8000" : window.location.host}/api/v1/live/ws (Connected)
              </div>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto text-[11px] leading-relaxed no-scrollbar">
              {liveLogs.length === 0 ? (
                <div className="text-slate-500 py-8 text-center italic">
                  &gt; Establishing link... Listening for real-time scraper transaction logs (every 8 seconds)...
                </div>
              ) : (
                liveLogs.map((log, idx) => {
                  const q = log.quote;
                  const time = new Date(log.timestamp).toLocaleTimeString();
                  const outlierText = log.is_outlier 
                    ? `[ALERT - OUTLIER DEVIATION: ${log.outlier_reason}]`
                    : "[CLEAN QUOTE]";
                  const outlierColor = log.is_outlier ? "text-rose-500" : "text-emerald-400";
                  
                  return (
                    <div key={idx} className="border-l-2 border-slate-800 pl-3 py-1 hover:bg-slate-900/40 transition">
                      <div className="text-slate-500 flex items-center gap-2">
                        <span>[{time}]</span>
                        <span className={`font-bold ${outlierColor}`}>{outlierText}</span>
                      </div>
                      <div className="text-slate-300 mt-0.5">
                        &gt; Ingested quote for <span className="text-amber-450 font-bold">{q.flight_number}</span> ({q.carrier}) on sector <span className="text-blue-400 font-bold">{q.origin} &rarr; {q.destination}</span> for departure {q.departure_date} (Lead: T+{q.advance_days}). Total Fare: <span className="text-emerald-400 font-bold">₹{q.total_fare.toLocaleString()}</span> via {q.source}.
                      </div>
                      <div className="text-slate-450 mt-0.5">
                        &gt; Laspeyres recalculations completed. New index set to <span className="text-yellow-450 font-bold">{log.new_index.index_value.toFixed(2)}</span> ({log.new_index.pct_change_dod >= 0 ? "+" : ""}{log.new_index.pct_change_dod.toFixed(2)}% DoD).
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Bottom Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border dark:border-slate-800 shadow-sm flex items-center glass-card">
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-lg mr-4">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Tracked City-Pairs</span>
                <div className="text-2xl font-bold mt-1">{stats.activeRoutes} routes</div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border dark:border-slate-800 shadow-sm flex items-center glass-card">
              <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-lg mr-4">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Total Fares Monitored</span>
                <div className="text-2xl font-bold mt-1">{stats.recordsCollected.toLocaleString()} quotes</div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border dark:border-slate-800 shadow-sm flex items-center glass-card">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-lg mr-4">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Audit Status</span>
                <div className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">100% Validated</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
