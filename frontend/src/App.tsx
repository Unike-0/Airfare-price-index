import React, { useState, useEffect } from "react";
import { 
  Plane, 
  LayoutDashboard, 
  Compass, 
  LineChart, 
  ShieldCheck, 
  Settings, 
  Key, 
  Moon, 
  Sparkles, 
  Lock, 
  LogIn, 
  LogOut, 
  User as UserIcon,
  HelpCircle,
  Database,
  Palette,
  SlidersHorizontal,
  Eye,
  Activity,
  Menu,
  X
} from "lucide-react";

// Page imports
import PublicView from "./pages/PublicView";
import ConsumerRouteExplorer from "./pages/ConsumerRouteExplorer";
import ConsumerHeatmap from "./pages/ConsumerHeatmap";
import Dashboard from "./pages/Dashboard";
import RouteExplorer from "./pages/RouteExplorer";
import HeatmapView from "./pages/HeatmapView";
import ElasticityView from "./pages/ElasticityView";
import Methodology from "./pages/Methodology";
import AdminPanel from "./pages/AdminPanel";
import ApiDocs from "./pages/ApiDocs";
import AnalystPanel from "./pages/AnalystPanel";
import ChatbotWidget from "./components/ChatbotWidget";

type ViewMode = "public" | "advanced";
type PublicTab = "home" | "explorer" | "heatmap";
type AdvancedTab = "dashboard" | "explorer" | "heatmap" | "elasticity" | "methodology" | "api" | "analyst" | "admin";

interface UserProfile {
  username: string;
  role: "admin" | "analyst" | "api_user" | "public";
  api_key?: string;
  api_tier?: "bronze" | "silver" | "gold";
  api_limit?: number;
  api_usage?: number;
}

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>("public"); // Default: Public View
  const [publicTab, setPublicTab] = useState<PublicTab>("home");
  const [activeTab, setActiveTab] = useState<AdvancedTab>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "premium">(() => {
    const saved = localStorage.getItem("theme");
    return (saved === "dark" || saved === "premium") ? saved : "dark";
  });

  const [dataTheme, setDataTheme] = useState<string>(() => {
    return localStorage.getItem("dataTheme") || "classic";
  });

  const [liveLogs, setLiveLogs] = useState<any[]>([]);
  const [lastLiveQuote, setLastLiveQuote] = useState<any>(null);

  // User auth state
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem("apix_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("apix_token");
  });

  // Login Modal state
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const apiUrl = (import.meta.env.VITE_API_URL || "http://localhost:8000") + "/api/v1";

  useEffect(() => {
    document.documentElement.classList.remove("light", "dark", "premium");
    document.documentElement.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("dataTheme", dataTheme);
  }, [dataTheme]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const wsScheme = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsHost = host.includes("5173") ? "localhost:8000" : host;
    const wsUrl = `${wsScheme}//${wsHost}/api/v1/live/ws`;

    let ws: WebSocket;
    let reconnectTimeout: any;

    function connect() {
      console.log("Connecting to live fare WebSocket...", wsUrl);
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "live_quote") {
            setLastLiveQuote(data);
            setLiveLogs((prev) => {
              const updated = [data, ...prev];
              return updated.slice(0, 10);
            });
          }
        } catch (e) {
          console.error("Error parsing WebSocket message:", e);
        }
      };

      ws.onclose = () => {
        reconnectTimeout = setTimeout(connect, 5000);
      };

      ws.onerror = (err) => {
        ws.close();
      };
    }

    connect();

    return () => {
      if (ws) ws.close();
      clearTimeout(reconnectTimeout);
    };
  }, []);

  const publicNavItems = [
    { id: "home", label: "Today's Score & Tools", icon: <Plane className="w-4 h-4" /> },
    { id: "explorer", label: "Route Inspector", icon: <Compass className="w-4 h-4" /> },
    { id: "heatmap", label: "Sector Price Heatmap", icon: <LineChart className="w-4 h-4" /> },
  ] as const;

  const advancedNavItems = [
    { id: "dashboard", label: "Overview", icon: <LayoutDashboard className="w-4 h-4" />, minRole: "public" },
    { id: "explorer", label: "Route Explorer", icon: <Compass className="w-4 h-4" />, minRole: "public" },
    { id: "heatmap", label: "Sector Heatmap", icon: <LineChart className="w-4 h-4" />, minRole: "public" },
    { id: "elasticity", label: "Elasticity Curve", icon: <Plane className="w-4 h-4 rotate-45" />, minRole: "public" },
    { id: "methodology", label: "Methodology & Audit", icon: <ShieldCheck className="w-4 h-4" />, minRole: "public" },
    { id: "api", label: "API Playground", icon: <Key className="w-4 h-4" />, minRole: "public" },
    { id: "analyst", label: "Reviewer Panel", icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />, minRole: "analyst" },
    { id: "admin", label: "Admin Panel", icon: <Settings className="w-4 h-4 text-rose-500" />, minRole: "admin" },
  ] as const;

  const handleLogout = () => {
    localStorage.removeItem("apix_token");
    localStorage.removeItem("apix_user");
    localStorage.removeItem("apix_admin_token");
    setToken(null);
    setUser(null);
    setViewMode("public");
    setPublicTab("home");
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");

    try {
      const formData = new URLSearchParams();
      formData.append("username", loginUsername);
      formData.append("password", loginPassword);

      const res = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData
      });

      if (!res.ok) {
        throw new Error("Invalid username or password");
      }

      const data = await res.json();
      
      localStorage.setItem("apix_token", data.access_token);
      localStorage.setItem("apix_user", JSON.stringify(data.user));
      if (data.user.role === "admin") {
        localStorage.setItem("apix_admin_token", data.access_token);
      }

      setToken(data.access_token);
      setUser(data.user);
      setShowLoginModal(false);
      
      if (data.user.role === "admin" || data.user.role === "analyst") {
        setViewMode("advanced");
        if (data.user.role === "admin") setActiveTab("admin");
        else setActiveTab("analyst");
      }
    } catch (err: any) {
      setLoginError(err.message || "Failed to log in.");
    } finally {
      setLoginLoading(false);
    }
  };

  const triggerQuickDemoLogin = (profile: string) => {
    const creds: Record<string, [string, string]> = {
      api: ["rbi_user", "rbi123"],
      analyst: ["analyst", "analyst123"],
      admin: ["admin", "admin123"]
    };

    if (profile === "public") {
      handleLogout();
      setShowLoginModal(false);
      return;
    }

    const [u, p] = creds[profile];
    setLoginUsername(u);
    setLoginPassword(p);
    
    setTimeout(() => {
      const btn = document.getElementById("submit-login-btn");
      if (btn) btn.click();
    }, 100);
  };

  const renderAccessGate = (requiredRole: "admin" | "analyst" | "api_user", component: React.ReactNode) => {
    const currentRole = user?.role || "public";
    if (currentRole === "admin") return component;
    if (requiredRole === "admin") return renderLockedScreen("Admin / System Operator");
    if (requiredRole === "analyst" && currentRole !== "analyst") return renderLockedScreen("Data Analyst / Reviewer");
    return component;
  };

  const renderLockedScreen = (roleName: string) => {
    return (
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-lg max-w-xl mx-auto text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-950/20 text-amber-400 border border-amber-500/30">
          <Lock className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Analyst Workspace Locked</h2>
          <p className="text-slate-400 text-sm mt-2">
            This panel is reserved for **{roleName}** roles. Log in with analyst or admin credentials to inspect outlier logs or trigger scraping runs.
          </p>
        </div>
        <button
          onClick={() => setShowLoginModal(true)}
          className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-6 py-3 min-h-[44px] rounded-xl text-sm transition"
        >
          Sign In as {roleName}
        </button>
      </div>
    );
  };

  const renderAdvancedContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard dataTheme={dataTheme} liveLogs={liveLogs} lastLiveQuote={lastLiveQuote} />;
      case "explorer":
        return <RouteExplorer dataTheme={dataTheme} />;
      case "heatmap":
        return <HeatmapView dataTheme={dataTheme} />;
      case "elasticity":
        return <ElasticityView dataTheme={dataTheme} />;
      case "methodology":
        return <Methodology />;
      case "api":
        return <ApiDocs activeUser={user} onUpdateUser={(updated) => {
          setUser(updated);
          localStorage.setItem("apix_user", JSON.stringify(updated));
        }} />;
      case "analyst":
        return renderAccessGate("analyst", <AnalystPanel activeUser={user} />);
      case "admin":
        return renderAccessGate("admin", <AdminPanel />);
      default:
        return <Dashboard dataTheme={dataTheme} liveLogs={liveLogs} lastLiveQuote={lastLiveQuote} />;
    }
  };

  const renderPublicContent = () => {
    switch (publicTab) {
      case "home":
        return <PublicView />;
      case "explorer":
        return <ConsumerRouteExplorer />;
      case "heatmap":
        return <ConsumerHeatmap />;
      default:
        return <PublicView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-40 border-b bg-slate-900/95 backdrop-blur-md border-slate-800">
        <div className="w-full flex h-16 items-center justify-between px-4 sm:px-6">
          
          {/* Logo & Brand Title */}
          <div
            className="flex items-center gap-3 cursor-pointer select-none py-1 min-h-[44px]"
            onClick={() => {
              setViewMode("public");
              setPublicTab("home");
              setMobileMenuOpen(false);
            }}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 font-black shadow-lg shadow-amber-500/20">
              ✈️
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                APIx <span className="text-xs px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold rounded-full whitespace-nowrap">Airfare Index</span>
              </span>
            </div>
          </div>

          {/* Center Navigation for Public Mode (Desktop) */}
          {viewMode === "public" && (
            <nav className="hidden md:flex items-center space-x-1.5 lg:space-x-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
              {publicNavItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setPublicTab(item.id as PublicTab)}
                  className={`flex items-center space-x-2 px-3.5 lg:px-4 py-2 min-h-[40px] rounded-xl text-xs font-bold transition-all ${
                    publicTab === item.id
                      ? "bg-amber-500 text-slate-950 shadow-md"
                      : "text-slate-400 hover:text-white hover:bg-slate-900"
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          )}

          {/* Top Right Controls (Desktop) */}
          <div className="hidden md:flex items-center gap-3">
            {/* Pulsing Live Badge */}
            <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-xs font-bold text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span>LIVE</span>
            </div>

            {/* View Mode Toggle */}
            <button
              onClick={() => setViewMode(viewMode === "public" ? "advanced" : "public")}
              className={`flex items-center space-x-2 px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-bold transition-all border ${
                viewMode === "advanced"
                  ? "bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20"
                  : "bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white"
              }`}
            >
              {viewMode === "advanced" ? (
                <>
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Advanced Analyst View</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                  <span>Switch to Advanced View</span>
                </>
              )}
            </button>

            {/* Login / Profile */}
            {user ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] border border-rose-500/30 text-rose-400 text-xs font-bold rounded-xl hover:bg-rose-950/20 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white text-xs font-bold rounded-xl transition-all"
              >
                <LogIn className="w-3.5 h-3.5 text-amber-400" />
                <span>Sign In</span>
              </button>
            )}
          </div>

          {/* Mobile Right Controls: Hamburger Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 hover:text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-amber-400" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Slide-down Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800 bg-slate-900/98 backdrop-blur-xl px-4 py-4 space-y-4 shadow-2xl transition-all duration-200">
            {/* Top Status & Mode Row */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-xs font-bold text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span>LIVE FEED</span>
              </div>
              <span className="text-xs font-semibold text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                {viewMode === "public" ? "Consumer View" : "Analyst View"}
              </span>
            </div>

            {/* Navigation Links */}
            <div className="space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                {viewMode === "public" ? "Consumer Pages" : "Analyst Pages"}
              </div>
              {viewMode === "public" ? (
                <div className="flex flex-col space-y-1.5">
                  {publicNavItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setPublicTab(item.id as PublicTab);
                        setMobileMenuOpen(false);
                      }}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-bold min-h-[44px] transition-all text-left w-full ${
                        publicTab === item.id
                          ? "bg-amber-500 text-slate-950 shadow-md font-extrabold"
                          : "text-slate-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-slate-800/80"
                      }`}
                    >
                      <span className={publicTab === item.id ? "text-slate-950" : "text-amber-400"}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
                  {advancedNavItems.map((item) => {
                    const isLocked = item.minRole !== "public" && user?.role !== "admin" && user?.role !== item.minRole;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id as AdvancedTab);
                          setMobileMenuOpen(false);
                        }}
                        className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold min-h-[44px] transition-all text-left w-full ${
                          activeTab === item.id
                            ? "bg-amber-500 text-slate-950 shadow-md font-extrabold"
                            : "text-slate-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-slate-800/80"
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <span className={activeTab === item.id ? "text-slate-950" : "text-amber-400"}>
                            {item.icon}
                          </span>
                          <span>{item.label}</span>
                        </div>
                        {isLocked && <Lock className="w-4 h-4 text-slate-500 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Actions & View Switcher */}
            <div className="pt-3 border-t border-slate-800 space-y-2.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                Workspace & Account
              </div>

              {/* View Mode Toggle */}
              <button
                onClick={() => {
                  setViewMode(viewMode === "public" ? "advanced" : "public");
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl text-sm font-bold min-h-[44px] transition-all border ${
                  viewMode === "advanced"
                    ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md"
                    : "bg-slate-950 text-slate-200 border-slate-700 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {viewMode === "advanced" ? (
                  <>
                    <SlidersHorizontal className="w-4 h-4" />
                    <span>Switch to Consumer View</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 text-amber-400" />
                    <span>Switch to Advanced Analyst View</span>
                  </>
                )}
              </button>

              {/* Login / Profile */}
              {user ? (
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 border border-rose-500/40 bg-rose-950/20 text-rose-300 text-sm font-bold rounded-xl hover:bg-rose-950/40 min-h-[44px] transition-all"
                >
                  <LogOut className="w-4 h-4 text-rose-400" />
                  <span>Sign Out ({user.username})</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setShowLoginModal(true);
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-slate-950 hover:bg-slate-800 border border-slate-700 text-white text-sm font-bold rounded-xl min-h-[44px] transition-all shadow-sm"
                >
                  <LogIn className="w-4 h-4 text-amber-400" />
                  <span>Sign In to Advanced Panel</span>
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content Body */}
      {viewMode === "public" ? (
        <main className="w-full">
          {renderPublicContent()}
          {/* Floating Chatbot Assistant ONLY on Public View */}
          <ChatbotWidget />
        </main>
      ) : (
        /* Advanced Analyst View Layout */
        <div className="w-full px-4 sm:px-6 py-6 md:py-8">
          <div className="mb-6 p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Technical Analyst & Regulator Workspace</h3>
                <p className="text-xs text-slate-400">Full APIx index formulas, audit logs, scraper monitoring, and reviewer panels.</p>
              </div>
            </div>
            <button
              onClick={() => setViewMode("public")}
              className="text-xs text-amber-400 hover:underline font-bold min-h-[36px] flex items-center"
            >
              ← Back to Consumer Public View
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* Advanced Navigation Sidebar */}
            <nav className="md:col-span-3 lg:col-span-3 xl:col-span-2 flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible gap-1.5 border border-slate-800 rounded-2xl bg-slate-900 p-2 shadow-sm shrink-0 no-scrollbar">
              {advancedNavItems.map((item) => {
                const isLocked = item.minRole !== "public" && user?.role !== "admin" && user?.role !== item.minRole;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as AdvancedTab)}
                    className={`flex items-center gap-3 px-4 py-3 min-h-[44px] text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                      activeTab === item.id
                        ? "bg-amber-500 text-slate-950 font-extrabold shadow-md"
                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                    {isLocked && <Lock className="w-3.5 h-3.5 ml-auto text-slate-500" />}
                  </button>
                );
              })}
            </nav>

            {/* Advanced Panel Content */}
            <main className="md:col-span-9 lg:col-span-9 xl:col-span-10 space-y-6">
              {renderAdvancedContent()}
            </main>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-850 bg-slate-900/50 py-6 mt-16 text-center text-xs text-slate-400 font-semibold tracking-wide">
        <div className="w-full px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            APIx Airfare Price Index Platform v2.0 | Real-Time Scraped & Simulated Data Engine
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-slate-950 px-3 py-1.5 rounded-full border border-slate-800">
            <Database className="w-3 h-3 text-emerald-400" />
            FastAPI + PostgreSQL / SQLite Connected
          </div>
        </div>
      </footer>

      {/* LOGIN MODAL DIALOG */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="relative bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl w-full max-w-lg space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/30">
                <UserIcon className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-white">Sign In to Advanced Panel</h2>
              <p className="text-xs text-slate-400">Log in as an analyst or administrator to review index submissions or manage scrapers.</p>
            </div>

            {/* Quick Sandbox Profiles */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Quick Sandbox Login Roles
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => triggerQuickDemoLogin("public")}
                  className="p-2 border border-slate-800 rounded-xl bg-slate-900 hover:bg-slate-800 text-[10px] font-bold text-slate-300 transition"
                >
                  Public User
                </button>
                <button
                  type="button"
                  onClick={() => triggerQuickDemoLogin("api")}
                  className="p-2 border border-slate-800 rounded-xl bg-slate-900 hover:bg-slate-800 text-[10px] font-bold text-amber-400 transition"
                >
                  API User
                </button>
                <button
                  type="button"
                  onClick={() => triggerQuickDemoLogin("analyst")}
                  className="p-2 border border-slate-800 rounded-xl bg-slate-900 hover:bg-slate-800 text-[10px] font-bold text-emerald-400 transition"
                >
                  Data Analyst
                </button>
                <button
                  type="button"
                  onClick={() => triggerQuickDemoLogin("admin")}
                  className="p-2 border border-slate-800 rounded-xl bg-slate-900 hover:bg-slate-800 text-[10px] font-bold text-rose-400 transition"
                >
                  System Admin
                </button>
              </div>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Username</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. analyst"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 bg-slate-950"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 bg-slate-950"
                />
              </div>

              {loginError && (
                <div className="text-xs text-rose-400 font-medium bg-rose-950/20 p-2.5 rounded-xl border border-rose-500/30">
                  {loginError}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="w-1/2 border border-slate-800 rounded-xl py-2.5 font-bold hover:bg-slate-800 text-xs transition text-slate-300"
                >
                  Cancel
                </button>
                <button
                  id="submit-login-btn"
                  type="submit"
                  disabled={loginLoading}
                  className="w-1/2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl py-2.5 font-bold transition text-xs disabled:opacity-50"
                >
                  {loginLoading ? "Authenticating..." : "Sign In"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
