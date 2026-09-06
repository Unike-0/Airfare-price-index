import React, { useEffect, useState } from "react";
import { ArrowRight, Info, Compass, HelpCircle } from "lucide-react";

interface Route {
  id: number;
  origin_code: string;
  origin_city: string;
  destination_code: string;
  destination_city: string;
}

interface HeatmapCell {
  carrier: string;
  advance_days: number;
  avg_fare: number;
}

interface HeatmapViewProps {
  dataTheme?: string;
}

export default function HeatmapView({ dataTheme = "classic" }: HeatmapViewProps) {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<number | "">("");
  const [heatmapData, setHeatmapData] = useState<HeatmapCell[]>([]);
  const [loading, setLoading] = useState(false);
  
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
      console.error("Failed to load routes:", e);
    }
  };

  const fetchHeatmap = async (routeId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/routes/${routeId}/heatmap`);
      const data = await res.json();
      setHeatmapData(data);
    } catch (e) {
      console.error("Failed to load heatmap:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  useEffect(() => {
    if (selectedRouteId) {
      fetchHeatmap(Number(selectedRouteId));
    }
  }, [selectedRouteId]);

  // Extract unique carriers and advance days
  const carriers = Array.from(new Set(heatmapData.map(d => d.carrier))).sort();
  const advanceWindows = [1, 7, 15, 30, 45];

  // Helper to find fare for cell
  const getCellFare = (carrier: string, adv: number): number | null => {
    const item = heatmapData.find(d => d.carrier === carrier && d.advance_days === adv);
    return item ? item.avg_fare : null;
  };

  // Determine heatmap background color intensity based on relative value on Indian fares scale and active theme
  const getHeatmapColor = (fare: number | null) => {
    if (fare === null) return "bg-slate-100 text-slate-400 dark:bg-slate-900";
    
    // Normalize color between 3000 (green) and 15000 (red)
    const minF = 3000;
    const maxF = 15000;
    const pct = Math.min(Math.max((fare - minF) / (maxF - minF), 0), 1);
    
    if (dataTheme === "emerald") {
      const h = 150; // green/teal
      return {
        backgroundColor: `hsla(${h}, 75%, 40%, ${0.08 + pct * 0.35})`,
        color: `hsla(${h}, 100%, ${25 - pct * 5}%, 1)`,
        border: `1px solid hsla(${h}, 75%, 40%, ${0.15 + pct * 0.3})`
      };
    } else if (dataTheme === "amber") {
      const h = 40; // amber/orange
      return {
        backgroundColor: `hsla(${h}, 85%, 45%, ${0.08 + pct * 0.35})`,
        color: `hsla(${h - 10}, 100%, ${25 - pct * 5}%, 1)`,
        border: `1px solid hsla(${h}, 85%, 45%, ${0.15 + pct * 0.3})`
      };
    } else if (dataTheme === "rose") {
      const h = 345; // rose/crimson
      return {
        backgroundColor: `hsla(${h}, 80%, 45%, ${0.08 + pct * 0.35})`,
        color: `hsla(${h}, 100%, ${25 - pct * 5}%, 1)`,
        border: `1px solid hsla(${h}, 80%, 45%, ${0.15 + pct * 0.3})`
      };
    } else {
      // Classic: standard green to red hue shift
      const hue = (1 - pct) * 120; // 120 green, 0 red
      return {
        backgroundColor: `hsla(${hue}, 80%, 40%, 0.15)`,
        color: `hsla(${hue}, 100%, 25%, 1)`,
        border: `1px solid hsla(${hue}, 80%, 40%, 0.3)`
      };
    }
  };

  const getLegendGradient = () => {
    switch (dataTheme) {
      case "emerald":
        return "from-emerald-50 to-emerald-600";
      case "amber":
        return "from-amber-50 to-amber-600";
      case "rose":
        return "from-rose-50 to-rose-600";
      case "classic":
      default:
        return "from-emerald-500 via-yellow-400 to-red-500";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Sector Fare Heatmap</h1>
          <p className="text-slate-500 mt-1">Cross-sectional analysis comparing pricing across carriers and advance purchase windows.</p>
        </div>
        
        {/* Route Select Selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-slate-500">Select Sector:</label>
          <select
            value={selectedRouteId}
            onChange={(e) => setSelectedRouteId(Number(e.target.value))}
            className="border rounded-md px-3 py-2 bg-white dark:bg-slate-900 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none dark:border-slate-800"
          >
            {routes.map(r => (
              <option key={r.id} value={r.id}>
                {r.origin_code} &rarr; {r.destination_code} ({r.origin_city} - {r.destination_city})
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : heatmapData.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 p-8 rounded-xl text-center text-slate-400">
          <Compass className="w-12 h-12 stroke-1 mx-auto mb-2 animate-spin" />
          <span>No flight matrix data found. Try triggering a manual scrape or seeding the database.</span>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center gap-2 text-xs bg-blue-50/50 dark:bg-slate-950/20 text-slate-600 dark:text-slate-400 p-4 rounded-lg">
            <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span>
              <strong>Methodology Detail:</strong> Fares displayed represent the average of non-outlier quotes collected during the last 10 days. Grid colors automatically scale from green (budget fares &lt; ₹3,000) to red (last-minute premiums &gt; ₹15,000).
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-4 text-left font-semibold text-slate-500 border-b border-r dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/10">Carrier</th>
                  {advanceWindows.map(adv => (
                    <th key={adv} className="p-4 text-center font-semibold text-slate-500 border-b dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/10">
                      T+{adv} Lead Time
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {carriers.map(carrier => (
                  <tr key={carrier} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                    <td className="p-4 font-bold text-slate-800 dark:text-slate-200 border-r border-b dark:border-slate-800">
                      {carrier}
                    </td>
                    {advanceWindows.map(adv => {
                      const fare = getCellFare(carrier, adv);
                      const style = getHeatmapColor(fare);
                      return (
                        <td key={adv} className="p-4 text-center border-b dark:border-slate-800">
                          <div
                            style={typeof style === 'object' ? style : undefined}
                            className={`py-3 rounded-md font-bold text-sm select-none ${typeof style === 'string' ? style : ''}`}
                          >
                            {fare ? `₹${fare.toLocaleString()}` : "N/A"}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Color bar legend */}
          <div className="pt-6 border-t dark:border-slate-800 flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
            <span>Low Fare (Budget / Advance)</span>
            <div className={`h-3 w-48 rounded-full bg-gradient-to-r ${getLegendGradient()}`}></div>
            <span>High Fare (Premium / Last-Minute)</span>
          </div>
        </div>
      )}
    </div>
  );
}
