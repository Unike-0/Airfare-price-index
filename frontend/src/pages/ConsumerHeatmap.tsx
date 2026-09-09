import React, { useState, useEffect } from "react";
import { Plane, Compass, Sparkles, AlertCircle } from "lucide-react";

interface SectorFare {
  route_id: number;
  sector: string;
  origin_city: string;
  destination_city: string;
  distance_km: number;
  avg_fare_inr: number;
  fare_per_km_inr: number;
  verdict: string;
  badge: string;
}

export default function ConsumerHeatmap() {
  const [sectors, setSectors] = useState<SectorFare[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeHover, setActiveHover] = useState<SectorFare | null>(null);

  const apiUrl = (import.meta.env.VITE_API_URL || "http://localhost:8000") + "/api/v1";

  useEffect(() => {
    fetchSectors();
  }, []);

  const fetchSectors = async () => {
    try {
      const res = await fetch(`${apiUrl}/innovations/fare-per-km`);
      const data = await res.json();
      setSectors(data);
    } catch (e) {
      console.error("Failed to load heatmap data", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 w-full px-4 sm:px-6 py-6 md:py-8">
      {/* Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 md:p-8 backdrop-blur-md">
        <div className="inline-flex items-center space-x-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-xs font-semibold text-amber-400 mb-3">
          <Compass className="w-3.5 h-3.5" />
          <span>Sector Price Map</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white">Domestic Flight Price Heatmap</h1>
        <p className="text-slate-400 text-sm mt-1">
          Green sectors are currently cheap and great value; red sectors have high surges or peak holiday pricing.
        </p>
      </div>

      {/* Grid Heatmap */}
      {loading ? (
        <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
          Loading sector heat levels...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {sectors.map((s) => {
            const isCheap = s.fare_per_km_inr < 3.2;
            const isNormal = s.fare_per_km_inr >= 3.2 && s.fare_per_km_inr <= 4.2;

            return (
              <div
                key={s.route_id}
                onMouseEnter={() => setActiveHover(s)}
                onMouseLeave={() => setActiveHover(null)}
                className={`p-6 rounded-3xl border transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden group ${
                  isCheap
                    ? "bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500"
                    : isNormal
                    ? "bg-amber-950/20 border-amber-500/30 hover:border-amber-500"
                    : "bg-rose-950/20 border-rose-500/30 hover:border-rose-500"
                }`}
              >
                {/* Sector Header */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xl">{s.badge}</span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                      isCheap
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : isNormal
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                        : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                    }`}
                  >
                    {s.verdict}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white mb-1">
                  {s.origin_city} → {s.destination_city}
                </h3>
                <span className="text-xs text-slate-400 block mb-4">{s.sector} ({s.distance_km} km)</span>

                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Average Fare</span>
                    <span className="text-2xl font-black text-amber-400">
                      ₹{s.avg_fare_inr.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase">Cost / KM</span>
                    <span className="text-sm font-bold text-white">₹{s.fare_per_km_inr}/km</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
