import React, { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ArrowRight, TrendingUp, DollarSign } from "lucide-react";

interface Route {
  id: number;
  origin_code: string;
  origin_city: string;
  destination_code: string;
  destination_city: string;
}

interface ElasticityPoint {
  advance_days: number;
  fare: number;
}

interface ElasticityViewProps {
  dataTheme?: string;
}

export default function ElasticityView({ dataTheme = "classic" }: ElasticityViewProps) {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<number | "">("");
  const [elasticityData, setElasticityData] = useState<ElasticityPoint[]>([]);
  const [loading, setLoading] = useState(false);

  const getThemeColors = () => {
    switch (dataTheme) {
      case "emerald":
        return {
          primary: "#10b981",
          textClass: "text-emerald-600 dark:text-emerald-400"
        };
      case "amber":
        return {
          primary: "#f59e0b",
          textClass: "text-amber-600 dark:text-amber-400"
        };
      case "rose":
        return {
          primary: "#f43f5e",
          textClass: "text-rose-600 dark:text-rose-455"
        };
      case "classic":
      default:
        return {
          primary: "#3b82f6",
          textClass: "text-blue-650 dark:text-blue-400"
        };
    }
  };
  const colors = getThemeColors();

  const apiUrl = (import.meta.env.VITE_API_URL || "http://localhost:8000") + "/api/v1";

  const fetchRoutes = async () => {
    try {
      const res = await fetch(`${apiUrl}/routes`);
      const data = await res.json();
      setRoutes(data);
      if (data.length > 0) {
        setSelectedRouteId(data[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchElasticity = async (routeId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/elasticity/${routeId}`);
      const data = await res.json();
      // Reverse array so chart reads left-to-right (T+45 -> T+30 -> T+1)
      setElasticityData([...data].reverse());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  useEffect(() => {
    if (selectedRouteId) {
      fetchElasticity(Number(selectedRouteId));
    }
  }, [selectedRouteId]);

  const activeRoute = routes.find(r => r.id === selectedRouteId);

  // Compute stats
  const t45Price = elasticityData.find(d => d.advance_days === 45)?.fare || 0;
  const t1Price = elasticityData.find(d => d.advance_days === 1)?.fare || 0;
  const multiplier = t45Price > 0 ? (t1Price / t45Price).toFixed(1) : "0.0";
  const percentageIncrease = t45Price > 0 ? (((t1Price - t45Price) / t45Price) * 100).toFixed(0) : "0";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Lead-Time Elasticity</h1>
          <p className="text-slate-500 mt-1">Analyze fare escalation rates based on purchase lead-time margins.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-slate-500">Select Sector:</label>
          <select
            value={selectedRouteId}
            onChange={(e) => setSelectedRouteId(Number(e.target.value))}
            className="border rounded-md px-3 py-2 bg-white dark:bg-slate-900 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none dark:border-slate-800"
          >
            {routes.map(r => (
              <option key={r.id} value={r.id}>
                {r.origin_code} &rarr; {r.destination_code}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Statistics summary */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="font-semibold text-slate-800 dark:text-white">Elasticity Index</h3>
              
              <div className="pt-4 border-t dark:border-slate-800">
                <span className="text-xs text-slate-400 font-medium">Last-Minute Markup</span>
                <div className={`text-3xl font-extrabold mt-1 ${colors.textClass}`}>
                  {multiplier}x
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  T+1 fares are {multiplier} times higher than T+45 fares.
                </p>
              </div>

              <div className="pt-4 border-t dark:border-slate-800">
                <span className="text-xs text-slate-400 font-medium">Total Percentage Escalation</span>
                <div className="text-3xl font-extrabold text-red-500 mt-1">
                  +{percentageIncrease}%
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Average increase in fare price from T+45 booking.
                </p>
              </div>

              <div className="pt-4 border-t dark:border-slate-800">
                <span className="text-xs text-slate-400 font-medium">Early-Bird Savings Margin</span>
                <div className="text-lg font-bold text-emerald-600 mt-1 flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" /> Save ~{Math.abs(100 - (100 / parseFloat(multiplier))).toFixed(0)}%
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Average discount rate achieved when booking at T-45 days.
                </p>
              </div>
            </div>
          </div>

          {/* Elasticity Area Chart */}
          <div className="lg:col-span-3 bg-white dark:bg-slate-900 p-6 rounded-xl border dark:border-slate-800 shadow-sm space-y-6">
            <div>
              <h3 className="font-semibold text-slate-850 dark:text-white flex items-center gap-2">
                <DollarSign className={`w-5 h-5 ${colors.textClass}`} /> Fare Curve by Days Before Departure
              </h3>
              {activeRoute && (
                <p className="text-xs text-slate-400 mt-1">
                  Sector: {activeRoute.origin_city} to {activeRoute.destination_city} ({activeRoute.origin_code}-{activeRoute.destination_code})
                </p>
              )}
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={elasticityData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorFare" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={colors.primary} stopOpacity={0.4}/>
                      <stop offset="95%" stopColor={colors.primary} stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
                  <XAxis 
                    dataKey="advance_days" 
                    tickFormatter={(tick) => `T+${tick}`} 
                    stroke="#94a3b8" 
                    fontSize={12}
                    label={{ value: "Lead Time (Days Prior)", position: "insideBottom", offset: -5, fill: "#94a3b8", fontSize: 12 }}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={12}
                    label={{ value: "Median Fare (INR)", angle: -90, position: "insideLeft", fill: "#94a3b8", fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ background: "#0f172a", border: "none", borderRadius: "8px", color: "white" }}
                    labelFormatter={(label) => `Booking Lead Time: T+${label} Days`}
                    formatter={(value: any) => [`₹${parseFloat(value).toLocaleString()}`, "Average Fare"]}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="fare" 
                    stroke={colors.primary} 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorFare)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
