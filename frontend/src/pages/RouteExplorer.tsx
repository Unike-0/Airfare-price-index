import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ArrowRight, ChevronRight, BarChart2, Calendar, Plane, Layers } from "lucide-react";

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

interface FareHistory {
  date: string;
  advance_purchase_days: number;
  avg_fare: number;
  median_fare: number;
  min_fare: number;
  max_fare: number;
  sample_size: number;
  carrier_breakdown: any;
}

interface RouteExplorerProps {
  dataTheme?: string;
}

export default function RouteExplorer({ dataTheme = "classic" }: RouteExplorerProps) {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [fareHistory, setFareHistory] = useState<FareHistory[]>([]);
  const [advanceDays, setAdvanceDays] = useState<number>(15);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);

  const getThemeColors = () => {
    switch (dataTheme) {
      case "emerald":
        return {
          primary: "#10b981",
          min: "#0d9488",
          max: "#d97706",
          bgBadge: "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400"
        };
      case "amber":
        return {
          primary: "#f59e0b",
          min: "#10b981",
          max: "#e11d48",
          bgBadge: "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400"
        };
      case "rose":
        return {
          primary: "#f43f5e",
          min: "#4f46e5",
          max: "#ca8a04",
          bgBadge: "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-455"
        };
      case "classic":
      default:
        return {
          primary: "#2563eb",
          min: "#10b981",
          max: "#f59e0b",
          bgBadge: "bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400"
        };
    }
  };
  const colors = getThemeColors();

  const apiUrl = (import.meta.env.VITE_API_URL || "http://localhost:8000") + "/api/v1";

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/routes`);
      const data = await res.json();
      setRoutes(data);
      if (data.length > 0) {
        setSelectedRoute(data[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchFareHistory = async (routeId: number, adv: number) => {
    setChartLoading(true);
    try {
      const res = await fetch(`${apiUrl}/routes/${routeId}/fares?advance_purchase_days=${adv}`);
      const data = await res.json();
      setFareHistory(data);
    } catch (e) {
      console.error(e);
    } finally {
      setChartLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  useEffect(() => {
    if (selectedRoute) {
      fetchFareHistory(selectedRoute.id, advanceDays);
    }
  }, [selectedRoute, advanceDays]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Route Explorer</h1>
        <p className="text-slate-500 mt-1">Explore specific airline sectors and filter trends based on advance purchasing lead times.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Routes List Table */}
          <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-xl border dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b dark:border-slate-800">
              <h3 className="font-semibold text-slate-800 dark:text-white">Active Sectors Basket</h3>
            </div>
            <div className="divide-y dark:divide-slate-800 max-h-[500px] overflow-y-auto">
              {routes.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRoute(r)}
                  className={`w-full p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition flex items-center justify-between ${
                    selectedRoute?.id === r.id 
                      ? dataTheme === "amber"
                        ? "bg-amber-50 dark:bg-amber-950/20 border-l-2 border-amber-500 pl-3.5"
                        : dataTheme === "emerald"
                          ? "bg-emerald-50 dark:bg-emerald-950/20 border-l-2 border-emerald-500 pl-3.5"
                          : dataTheme === "rose"
                            ? "bg-rose-50 dark:bg-rose-950/20 border-l-2 border-rose-500 pl-3.5"
                            : "bg-blue-50/50 dark:bg-slate-850 border-l-2 border-blue-500 pl-3.5"
                      : ""
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                      <span>{r.origin_code}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span>{r.destination_code}</span>
                    </div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      {r.origin_city} to {r.destination_city}
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <div>
                      <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Weight: {r.dgca_traffic_weight.toFixed(2)}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Avg: ₹{r.current_avg_fare.toFixed(0)}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Detailed Route Chart & Window Filter */}
          {selectedRoute && (
            <div className="lg:col-span-2 space-y-6">
              {/* Detail Card Header */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border dark:border-slate-800 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded ${colors.bgBadge}`}>
                      Sector Analysis
                    </span>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-2 flex items-center gap-2">
                      {selectedRoute.origin_city} ({selectedRoute.origin_code})
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                      {selectedRoute.destination_city} ({selectedRoute.destination_code})
                    </h2>
                  </div>

                  {/* Advance purchase days filters */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-semibold mr-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> Lead Time:
                    </span>
                    <div className="inline-flex rounded-md border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-1 shadow-sm">
                      {[1, 7, 15, 30, 45].map((d) => (
                        <button
                          key={d}
                          onClick={() => setAdvanceDays(d)}
                          className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                            advanceDays === d
                              ? dataTheme === "amber"
                                ? "bg-amber-500 text-slate-950 shadow-sm"
                                : dataTheme === "emerald"
                                  ? "bg-emerald-600 text-white shadow-sm"
                                  : dataTheme === "rose"
                                    ? "bg-rose-600 text-white shadow-sm"
                                    : "bg-blue-600 text-white shadow-sm"
                              : "text-slate-605 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                          }`}
                        >
                          T+{d}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t dark:border-slate-800 text-center">
                  <div className="bg-slate-50 dark:bg-slate-950/20 p-3 rounded-lg">
                    <span className="text-xs text-slate-500 font-medium">Weighted DGCA Volume</span>
                    <div className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-1">
                      {(selectedRoute.dgca_traffic_weight * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950/20 p-3 rounded-lg">
                    <span className="text-xs text-slate-500 font-medium">T+{advanceDays} Median Fare</span>
                    <div className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-1">
                      {fareHistory.length > 0 
                        ? `₹${fareHistory[fareHistory.length - 1].median_fare.toFixed(0)}` 
                        : "N/A"
                      }
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950/20 p-3 rounded-lg">
                    <span className="text-xs text-slate-500 font-medium">Data Points (Daily)</span>
                    <div className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-1">
                      {fareHistory.length > 0
                        ? fareHistory[fareHistory.length - 1].sample_size
                        : "0"
                      } quotes
                    </div>
                  </div>
                </div>
              </div>

              {/* Chart Card */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-850 dark:text-white flex items-center gap-2">
                    <BarChart2 className="w-5 h-5 text-blue-600" /> Price Spread Trend (T+{advanceDays})
                  </h3>
                </div>

                {chartLoading ? (
                  <div className="flex items-center justify-center h-72">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : fareHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-72 text-slate-400">
                    <Plane className="w-12 h-12 stroke-1 mb-2 animate-bounce" />
                    <span>No historical quotes found. Trigger a scraping run in the Admin Panel.</span>
                  </div>
                ) : (
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={fareHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                        <YAxis stroke="#94a3b8" fontSize={12} />
                        <Tooltip 
                          contentStyle={{ background: "#0f172a", border: "none", borderRadius: "8px", color: "white" }}
                          labelFormatter={(label) => new Date(label).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                        />
                        <Legend verticalAlign="top" height={36} iconType="circle" />
                        <Line type="monotone" name="Median Fare" dataKey="median_fare" stroke={colors.primary} strokeWidth={2.5} dot={false} />
                        <Line type="monotone" name="Min Fare" dataKey="min_fare" stroke={colors.min} strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                        <Line type="monotone" name="Max Fare" dataKey="max_fare" stroke={colors.max} strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
