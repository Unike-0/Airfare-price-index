import React, { useEffect, useState } from "react";
import { ShieldCheck, Eye, EyeOff, Check, X, RefreshCw, BarChart2, AlertCircle, FileSpreadsheet, Percent, HelpCircle } from "lucide-react";

interface OutlierQuote {
  id: number;
  route: string;
  carrier: string;
  source: string;
  departure_date: string;
  advance_days: number;
  total_fare: number;
  reason: string;
  override: boolean;
}

interface IndexReviewValue {
  id: number;
  date: string;
  index_value: number;
  is_published: boolean;
  approved_by: string | null;
}

interface BacktestSummary {
  mape: number;
  mae: number;
  correlation: number | string;
  total_records_compared: number;
}

interface BacktestDetail {
  route_id: number;
  route_code: string;
  month: string;
  computed_avg_fare: number;
  reported_avg_fare: number;
  absolute_error: number;
  percentage_error: number;
}

interface BacktestReport {
  summary: BacktestSummary;
  details: BacktestDetail[];
}

interface AnalystPanelProps {
  activeUser: {
    username: string;
    role: string;
  } | null;
}

export default function AnalystPanel({ activeUser }: AnalystPanelProps) {
  const [outliers, setOutliers] = useState<OutlierQuote[]>([]);
  const [indexReviews, setIndexReviews] = useState<IndexReviewValue[]>([]);
  const [backtest, setBacktest] = useState<BacktestReport | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [outlierLoadingId, setOutlierLoadingId] = useState<number | null>(null);
  const [publishLoadingId, setPublishLoadingId] = useState<number | null>(null);

  const apiUrl = (import.meta.env.VITE_API_URL || "http://localhost:8000") + "/api/v1";

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch flagged outliers
      const outliersRes = await fetch(`${apiUrl}/analyst/outliers`);
      if (outliersRes.ok) {
        const outliersData = await outliersRes.json();
        setOutliers(outliersData);
      }

      // 2. Fetch index values for review
      const reviewRes = await fetch(`${apiUrl}/analyst/index-review`);
      if (reviewRes.ok) {
        const reviewData = await reviewRes.json();
        setIndexReviews(reviewData);
      }

      // 3. Fetch backtest benchmarks
      const backtestRes = await fetch(`${apiUrl}/benchmark/backtest`);
      if (backtestRes.ok) {
        const backtestData = await backtestRes.json();
        setBacktest(backtestData);
      }
    } catch (e) {
      console.error("Failed to load analyst panel data:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveOutlier = async (quoteId: number, approve: boolean) => {
    setOutlierLoadingId(quoteId);
    try {
      const res = await fetch(`${apiUrl}/analyst/outliers/${quoteId}/resolve?approve=${approve}`, {
        method: "POST"
      });
      if (res.ok) {
        // Remove from list or update locally
        setOutliers(prev => prev.filter(o => o.id !== quoteId));
        // Refresh index values in queue, since aggregates changed
        const reviewRes = await fetch(`${apiUrl}/analyst/index-review`);
        if (reviewRes.ok) {
          const reviewData = await reviewRes.json();
          setIndexReviews(reviewData);
        }
      } else {
        const data = await res.json();
        alert(`Failed: ${data.detail}`);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setOutlierLoadingId(null);
    }
  };

  const handlePublishIndex = async (indexId: number, publish: boolean) => {
    setPublishLoadingId(indexId);
    const username = activeUser?.username || "analyst";
    try {
      const res = await fetch(`${apiUrl}/analyst/index-review/${indexId}/publish?publish=${publish}&username=${username}`, {
        method: "POST"
      });
      if (res.ok) {
        setIndexReviews(prev =>
          prev.map(item =>
            item.id === indexId
              ? { ...item, is_published: publish, approved_by: publish ? username : null }
              : item
          )
        );
      } else {
        const data = await res.json();
        alert(`Failed: ${data.detail}`);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setPublishLoadingId(null);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-emerald-500" />
            Data Quality Audit & Reviewer Workspace
          </h1>
          <p className="text-slate-500 mt-1 dark:text-slate-400">
            Verify flagged statistical fare outliers, approve daily drafts, and validate benchmarks.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-1.5 border rounded-lg text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 dark:border-slate-800 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Audit
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Outliers verification section */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl shadow-sm overflow-hidden glass-card">
            <div className="p-4 border-b dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" /> Statistical Outliers Queue
              </h3>
              <span className="text-[10px] bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 font-bold px-2 py-0.5 rounded border border-amber-200/20">
                {outliers.length} flagged quotes
              </span>
            </div>
            
            <div className="overflow-x-auto max-h-[300px]">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-950/60 sticky top-0 border-b dark:border-slate-800 z-10">
                  <tr>
                    <th className="p-3 font-semibold">Sector</th>
                    <th className="p-3 font-semibold">Carrier</th>
                    <th className="p-3 font-semibold text-right">Fare</th>
                    <th className="p-3 font-semibold">Reason</th>
                    <th className="p-3 font-semibold text-right">Audit Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-850">
                  {outliers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">
                        No flagged outliers found. All quotes are within normal distribution.
                      </td>
                    </tr>
                  ) : (
                    outliers.map((q) => (
                      <tr key={q.id} className="hover:bg-slate-50/40">
                        <td className="p-3 font-semibold">
                          {q.route} <span className="text-[10px] text-slate-400 font-normal">T+{q.advance_days}</span>
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-350">{q.carrier}</td>
                        <td className="p-3 font-semibold text-right text-slate-850 dark:text-slate-200">₹{q.total_fare.toLocaleString()}</td>
                        <td className="p-3 text-[10px] text-slate-500 max-w-[150px] truncate" title={q.reason}>
                          {q.reason}
                        </td>
                        <td className="p-3 text-right flex gap-1 justify-end">
                          <button
                            onClick={() => handleResolveOutlier(q.id, true)}
                            disabled={outlierLoadingId === q.id}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 rounded text-[10px] font-bold flex items-center gap-0.5"
                            title="Restore quote to average aggregates"
                          >
                            <Check className="w-3 h-3" /> Approve
                          </button>
                          <button
                            onClick={() => handleResolveOutlier(q.id, false)}
                            disabled={outlierLoadingId === q.id}
                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-650 dark:bg-rose-950/20 dark:text-rose-400 rounded text-[10px] font-bold flex items-center gap-0.5"
                            title="Discard quote from indices"
                          >
                            <X className="w-3 h-3" /> Discard
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Daily Index Publication Queue */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl shadow-sm overflow-hidden glass-card">
            <div className="p-4 border-b dark:border-slate-800">
              <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-blue-500" /> Index Publication Queue
              </h3>
            </div>
            
            <div className="overflow-x-auto max-h-[300px]">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-950/60 sticky top-0 border-b dark:border-slate-800 z-10">
                  <tr>
                    <th className="p-3 font-semibold">Date</th>
                    <th className="p-3 font-semibold text-right">Index Value</th>
                    <th className="p-3 font-semibold">Status</th>
                    <th className="p-3 font-semibold text-right">Publish Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-850">
                  {indexReviews.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/40">
                      <td className="p-3 font-medium">
                        {new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="p-3 font-bold text-right text-slate-850 dark:text-slate-200">
                        {item.index_value.toFixed(2)}
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold uppercase text-[9px] ${
                          item.is_published
                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400"
                            : "bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400"
                        }`}>
                          {item.is_published ? "Published" : "Draft"}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {item.is_published ? (
                          <button
                            onClick={() => handlePublishIndex(item.id, false)}
                            disabled={publishLoadingId === item.id}
                            className="px-2 py-1 border dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded text-[10px] font-bold text-slate-650 dark:text-slate-350"
                          >
                            Revert
                          </button>
                        ) : (
                          <button
                            onClick={() => handlePublishIndex(item.id, true)}
                            disabled={publishLoadingId === item.id}
                            className="px-2 py-1 bg-blue-650 dark:bg-amber-500 text-white dark:text-slate-950 hover:bg-blue-700 rounded text-[10px] font-extrabold shadow-sm"
                          >
                            Publish
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Validation Benchmarks section */}
          {backtest && (
            <div className="lg:col-span-12 space-y-6">
              {/* Backtest summary statistics cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 p-5 rounded-xl shadow-sm glass-card">
                  <span className="text-xs text-slate-400 font-semibold uppercase block">Pearson Correlation</span>
                  <div className="text-2xl font-black mt-2 text-emerald-500 dark:text-emerald-400 premium-glow-text">
                    {typeof backtest.summary.correlation === "number" 
                      ? `${(backtest.summary.correlation * 100).toFixed(2)}%` 
                      : backtest.summary.correlation
                    }
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">Correlation against DGCA averages</span>
                </div>

                <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 p-5 rounded-xl shadow-sm glass-card">
                  <span className="text-xs text-slate-400 font-semibold uppercase block">MAPE Verification</span>
                  <div className="text-2xl font-black mt-2 text-blue-500 dark:text-blue-400">
                    {backtest.summary.mape.toFixed(2)}%
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">Mean Absolute Percentage Error</span>
                </div>

                <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 p-5 rounded-xl shadow-sm glass-card">
                  <span className="text-xs text-slate-400 font-semibold uppercase block">MAE deviation</span>
                  <div className="text-2xl font-black mt-2">
                    ₹{backtest.summary.mae.toFixed(0)}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">Mean Absolute Error spread</span>
                </div>

                <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 p-5 rounded-xl shadow-sm glass-card">
                  <span className="text-xs text-slate-400 font-semibold uppercase block">Validation Points</span>
                  <div className="text-2xl font-black mt-2">
                    {backtest.summary.total_records_compared} sectors
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">Aggregated monthly comparisons</span>
                </div>
              </div>

              {/* Backtesting details table */}
              <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl shadow-sm overflow-hidden glass-card">
                <div className="p-4 border-b dark:border-slate-800">
                  <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                    <BarChart2 className="w-5 h-5 text-indigo-500" /> DGCA Benchmark Sector Backtest comparisons
                  </h3>
                </div>
                <div className="overflow-x-auto max-h-[300px]">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-950/60 sticky top-0 border-b dark:border-slate-800 z-10">
                      <tr>
                        <th className="p-3 font-semibold">Sector Route</th>
                        <th className="p-3 font-semibold">Reporting Month</th>
                        <th className="p-3 font-semibold text-right">Computed Average Fare</th>
                        <th className="p-3 font-semibold text-right">DGCA Reported Average</th>
                        <th className="p-3 font-semibold text-right">Absolute Deviation</th>
                        <th className="p-3 font-semibold text-right">Percentage Error (PE)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-slate-850">
                      {backtest.details.map((d, index) => (
                        <tr key={index} className="hover:bg-slate-50/40">
                          <td className="p-3 font-bold">{d.route_code}</td>
                          <td className="p-3 text-slate-500">{d.month}</td>
                          <td className="p-3 text-right font-medium">₹{d.computed_avg_fare.toLocaleString()}</td>
                          <td className="p-3 text-right font-medium text-slate-700 dark:text-slate-350">₹{d.reported_avg_fare.toLocaleString()}</td>
                          <td className="p-3 text-right font-mono">₹{d.absolute_error.toLocaleString()}</td>
                          <td className="p-3 text-right font-mono font-bold text-slate-800 dark:text-slate-300">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded font-bold ${
                              d.percentage_error < 5 
                                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400" 
                                : d.percentage_error < 10 
                                ? "bg-blue-50 text-blue-650 dark:bg-blue-950/20" 
                                : "bg-amber-50 text-amber-600 dark:bg-amber-950/20"
                            }`}>
                              {d.percentage_error.toFixed(2)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
