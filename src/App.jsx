import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, BarChart, Bar, LineChart, Line,
} from "recharts";

/* ─── CONSTANTS ─── */
const C = {
  bg: "#06090f", card: "#0d1117", cardAlt: "#111820", cardHover: "#161d27",
  border: "#1b2332", borderLight: "#283347",
  text: "#e6edf3", textMuted: "#8b949e", textDim: "#484f58",
  stocks: "#58a6ff", stocksBg: "rgba(88,166,255,0.07)",
  gold: "#d29922", goldBg: "rgba(210,153,34,0.07)",
  crypto: "#bc8cff", cryptoBg: "rgba(188,140,255,0.07)",
  green: "#3fb950", greenBg: "rgba(63,185,80,0.1)",
  red: "#f85149", redBg: "rgba(248,81,73,0.1)",
  accent: "#1f6feb", accentBg: "rgba(31,111,235,0.12)",
  orange: "#d18616",
};

const CATS = [
  { key: "stocks", label: "Stocks", color: C.stocks, bg: C.stocksBg, icon: "📈" },
  { key: "gold", label: "Gold", color: C.gold, bg: C.goldBg, icon: "🥇" },
  { key: "crypto", label: "Crypto", color: C.crypto, bg: C.cryptoBg, icon: "₿" },
];

const DEFAULT_TAGS = ["long-term", "swing-trade", "DCA", "speculative", "hedge", "dividend"];

const SAMPLE = {
  stocks: [
    { id: 1, name: "AAPL", type: "buy", qty: 10, price: 178.5, date: "2025-01-15", notes: "Long-term hold", tags: ["long-term"] },
    { id: 2, name: "NVDA", type: "buy", qty: 5, price: 480, date: "2025-02-10", notes: "", tags: ["long-term"] },
    { id: 3, name: "TSLA", type: "buy", qty: 8, price: 245, date: "2025-03-01", notes: "Swing trade", tags: ["swing-trade"] },
    { id: 4, name: "MSFT", type: "buy", qty: 3, price: 410, date: "2024-12-20", notes: "", tags: ["DCA"] },
  ],
  gold: [
    { id: 5, name: "Gold Bar 1oz", type: "buy", qty: 2, price: 2050, date: "2025-01-20", notes: "Physical gold", tags: ["hedge"] },
    { id: 6, name: "Gold ETF", type: "buy", qty: 15, price: 190, date: "2025-02-15", notes: "", tags: ["long-term"] },
  ],
  crypto: [
    { id: 7, name: "BTC", type: "buy", qty: 0.5, price: 42500, date: "2025-01-05", notes: "DCA", tags: ["DCA"] },
    { id: 8, name: "ETH", type: "buy", qty: 5, price: 2250, date: "2025-02-01", notes: "", tags: ["long-term"] },
    { id: 9, name: "SOL", type: "buy", qty: 50, price: 98, date: "2025-03-05", notes: "Speculative", tags: ["speculative"] },
  ],
};

const SAMPLE_PRICES = { AAPL: 192.5, NVDA: 520, TSLA: 230, MSFT: 430, "Gold Bar 1oz": 2120, "Gold ETF": 198, BTC: 48500, ETH: 2480, SOL: 112 };
const SAMPLE_WATCHLIST = [
  { id: 101, name: "AMD", category: "stocks", targetPrice: 150, notes: "Wait for dip" },
  { id: 102, name: "DOGE", category: "crypto", targetPrice: 0.08, notes: "Meme potential" },
];

const EXCHANGE_RATE = 1.34;

/* ─── HELPERS ─── */
const uid = () => Date.now() + Math.floor(Math.random() * 99999);
const fmt = (v, cur = "USD") => {
  const rate = cur === "SGD" ? EXCHANGE_RATE : 1;
  const val = v * rate;
  const sym = cur === "SGD" ? "S$" : "$";
  if (Math.abs(val) >= 1e6) return sym + (val / 1e6).toFixed(2) + "M";
  if (Math.abs(val) >= 1e3) return sym + (val / 1e3).toFixed(2) + "K";
  return sym + val.toFixed(2);
};
const fmtPct = v => (v >= 0 ? "+" : "") + v.toFixed(2) + "%";
const fmtDate = d => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const fmtMonth = d => new Date(d).toLocaleDateString("en-US", { month: "short", year: "numeric" });

/* ─── STORAGE ─── */
async function loadData(key, fallback) {
  try {
    // Attempt window.storage (for local desktop environment) or fallback to localStorage
    const r = window.storage ? await window.storage.get(key) : { value: localStorage.getItem(key) };
    return r?.value ? JSON.parse(r.value) : fallback;
  } catch { return fallback; }
}
async function saveData(key, val) {
  try {
    const stringified = JSON.stringify(val);
    if (window.storage) {
      await window.storage.set(key, stringified);
    } else {
      localStorage.setItem(key, stringified);
    }
  } catch {}
}

/* ─── TOAST SYSTEM ─── */
function ToastContainer({ toasts }) {
  return (
    <div style={{ position: "fixed", top: 20, right: 20, zIndex: 999, display: "flex", flexDirection: "column", gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.type === "success" ? C.green + "22" : t.type === "error" ? C.red + "22" : C.accent + "22",
          border: `1px solid ${t.type === "success" ? C.green + "44" : t.type === "error" ? C.red + "44" : C.accent + "44"}`,
          color: t.type === "success" ? C.green : t.type === "error" ? C.red : C.accent,
          padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600,
          fontFamily: "'DM Sans', sans-serif",
          backdropFilter: "blur(12px)",
          animation: "toastIn 0.3s ease",
          boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
        }}>
          {t.type === "success" ? "✓ " : t.type === "error" ? "✗ " : "ℹ "}{t.message}
        </div>
      ))}
    </div>
  );
}

/* ─── SPARKLINE ─── */
function Sparkline({ data, color, width = 80, height = 28 }) {
  if (!data || data.length < 2) return <div style={{ width, height }} />;
  return (
    <ResponsiveContainer width={width} height={height}>
      <LineChart data={data}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

/* ─── CUSTOM TOOLTIPS ─── */
function ChartTooltip({ active, payload, label, currency }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
      <p style={{ color: C.textDim, fontSize: 10, margin: "0 0 4px" }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontSize: 12, margin: 0, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
          {p.name}: {fmt(p.value, currency)}
        </p>
      ))}
    </div>
  );
}

/* ─── MAIN COMPONENT ─── */
export default function PortfolioTracker() {
  const [holdings, setHoldings] = useState(SAMPLE);
  const [currentPrices, setCurrentPrices] = useState(SAMPLE_PRICES);
  const [watchlist, setWatchlist] = useState(SAMPLE_WATCHLIST);
  const [goal, setGoal] = useState({ target: 50000, label: "Portfolio Goal" });
  const [currency, setCurrency] = useState("USD");
  const [activeTab, setActiveTab] = useState("overview");
  const [chartType, setChartType] = useState("area");
  const [timeRange, setTimeRange] = useState("all");
  const [showModal, setShowModal] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "date", dir: "desc" });
  const [filterTag, setFilterTag] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [toasts, setToasts] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [animIn, setAnimIn] = useState(false);
  const [formData, setFormData] = useState({ name: "", type: "buy", qty: "", price: "", date: new Date().toISOString().split("T")[0], notes: "", tags: [], category: "stocks" });
  const [watchForm, setWatchForm] = useState({ name: "", category: "stocks", targetPrice: "", notes: "" });
  const [priceEditAsset, setPriceEditAsset] = useState(null);
  const [priceEditVal, setPriceEditVal] = useState("");
  const [goalEdit, setGoalEdit] = useState(false);
  const [goalForm, setGoalForm] = useState({ target: "", label: "" });
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Load from storage
  useEffect(() => {
    (async () => {
      const [h, p, w, g, cur] = await Promise.all([
        loadData("portfolio-holdings", null),
        loadData("portfolio-prices", null),
        loadData("portfolio-watchlist", null),
        loadData("portfolio-goal", null),
        loadData("portfolio-currency", null),
      ]);
      if (h) setHoldings(h);
      if (p) setCurrentPrices(p);
      if (w) setWatchlist(w);
      if (g) setGoal(g);
      if (cur) setCurrency(cur);
      setLoaded(true);
      setTimeout(() => setAnimIn(true), 80);
    })();
  }, []);

  // Save on change
  useEffect(() => { if (loaded) saveData("portfolio-holdings", holdings); }, [holdings, loaded]);
  useEffect(() => { if (loaded) saveData("portfolio-prices", currentPrices); }, [currentPrices, loaded]);
  useEffect(() => { if (loaded) saveData("portfolio-watchlist", watchlist); }, [watchlist, loaded]);
  useEffect(() => { if (loaded) saveData("portfolio-goal", goal); }, [goal, loaded]);
  useEffect(() => { if (loaded) saveData("portfolio-currency", currency); }, [currency, loaded]);

  const toast = useCallback((message, type = "success") => {
    const id = uid();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 2800);
  }, []);

  /* ─── COMPUTED DATA ─── */
  // Net positions per asset per category
  const netPositions = useMemo(() => {
    const result = {};
    CATS.forEach(({ key }) => {
      const assetMap = {};
      holdings[key].forEach(h => {
        if (!assetMap[h.name]) assetMap[h.name] = { name: h.name, totalQty: 0, totalCost: 0, tags: new Set() };
        const mult = h.type === "buy" ? 1 : -1;
        assetMap[h.name].totalQty += mult * h.qty;
        assetMap[h.name].totalCost += mult * h.qty * h.price;
        h.tags?.forEach(t => assetMap[h.name].tags.add(t));
      });
      result[key] = Object.values(assetMap).filter(a => a.totalQty > 0).map(a => ({
        ...a,
        avgCost: a.totalCost / a.totalQty,
        currentPrice: currentPrices[a.name] || a.totalCost / a.totalQty,
        currentValue: (currentPrices[a.name] || a.totalCost / a.totalQty) * a.totalQty,
        pnl: ((currentPrices[a.name] || a.totalCost / a.totalQty) - a.totalCost / a.totalQty) * a.totalQty,
        pnlPct: currentPrices[a.name] ? ((currentPrices[a.name] - a.totalCost / a.totalQty) / (a.totalCost / a.totalQty)) * 100 : 0,
        tags: [...a.tags],
      }));
    });
    return result;
  }, [holdings, currentPrices]);

  const totals = useMemo(() => {
    const r = {};
    let total = 0, totalCost = 0;
    CATS.forEach(({ key }) => {
      const cv = netPositions[key].reduce((s, a) => s + a.currentValue, 0);
      const cc = netPositions[key].reduce((s, a) => s + a.totalCost, 0);
      r[key] = { value: cv, cost: cc, pnl: cv - cc, pnlPct: cc > 0 ? ((cv - cc) / cc) * 100 : 0 };
      total += cv;
      totalCost += cc;
    });
    r.total = total;
    r.totalCost = totalCost;
    r.totalPnl = total - totalCost;
    r.totalPnlPct = totalCost > 0 ? ((total - totalCost) / totalCost) * 100 : 0;
    return r;
  }, [netPositions]);

  // Pie data
  const pieData = useMemo(() =>
    CATS.map(({ key, label, color }) => ({
      name: label, value: totals[key].value, fill: color,
      pct: totals.total > 0 ? ((totals[key].value / totals.total) * 100).toFixed(1) : "0",
    })).filter(d => d.value > 0), [totals]);

  // Timeline data for area chart
  const timelineData = useMemo(() => {
    const all = [];
    CATS.forEach(({ key }) => holdings[key].forEach(h => all.push({ ...h, category: key })));
    all.sort((a, b) => new Date(a.date) - new Date(b.date));
    const run = { stocks: 0, gold: 0, crypto: 0 };
    const pts = [];
    all.forEach(e => {
      const m = e.type === "buy" ? 1 : -1;
      run[e.category] += m * e.qty * e.price;
      pts.push({
        date: fmtDate(e.date), rawDate: e.date,
        stocks: Math.max(0, run.stocks), gold: Math.max(0, run.gold), crypto: Math.max(0, run.crypto),
        total: Math.max(0, run.stocks) + Math.max(0, run.gold) + Math.max(0, run.crypto),
      });
    });
    // Apply time range filter
    if (timeRange === "all") return pts;
    const now = new Date();
    const cutoffs = { "1m": 30, "3m": 90, "6m": 180, "1y": 365 };
    const days = cutoffs[timeRange] || 9999;
    const cutoff = new Date(now.getTime() - days * 86400000);
    return pts.filter(p => new Date(p.rawDate) >= cutoff);
  }, [holdings, timeRange]);

  // Bar chart: cost vs current per asset
  const barData = useMemo(() => {
    const catKey = CATS.find(c => c.key === activeTab)?.key;
    const data = catKey ? netPositions[catKey] : [...netPositions.stocks, ...netPositions.gold, ...netPositions.crypto];
    return data.map(a => ({ name: a.name, Cost: a.totalCost, Current: a.currentValue }));
  }, [netPositions, activeTab]);

  // Sparkline data per category
  const sparkData = useMemo(() => {
    const result = {};
    CATS.forEach(({ key }) => {
      const entries = holdings[key].slice().sort((a, b) => new Date(a.date) - new Date(b.date));
      let run = 0;
      result[key] = entries.map(e => { run += (e.type === "buy" ? 1 : -1) * e.qty * e.price; return { v: Math.max(0, run) }; });
    });
    return result;
  }, [holdings]);

  // Monthly summary
  const monthlySummary = useMemo(() => {
    const months = {};
    CATS.forEach(({ key }) => {
      holdings[key].forEach(h => {
        const mk = h.date.substring(0, 7);
        if (!months[mk]) months[mk] = { month: mk, invested: 0, sold: 0, stocks: 0, gold: 0, crypto: 0, count: 0 };
        const val = h.qty * h.price;
        if (h.type === "buy") { months[mk].invested += val; months[mk][key] += val; }
        else { months[mk].sold += val; months[mk][key] -= val; }
        months[mk].count++;
      });
    });
    return Object.values(months).sort((a, b) => b.month.localeCompare(a.month));
  }, [holdings]);

  // Filtered + sorted transactions for detail views
  const getFilteredTx = useCallback((catKey) => {
    let list = [...holdings[catKey]];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(h => h.name.toLowerCase().includes(q) || h.notes?.toLowerCase().includes(q));
    }
    if (filterTag !== "all") list = list.filter(h => h.tags?.includes(filterTag));
    if (filterType !== "all") list = list.filter(h => h.type === filterType);
    list.sort((a, b) => {
      let va = a[sortConfig.key], vb = b[sortConfig.key];
      if (sortConfig.key === "total") { va = a.qty * a.price; vb = b.qty * b.price; }
      if (sortConfig.key === "date") { va = new Date(va); vb = new Date(vb); }
      if (typeof va === "string") { va = va.toLowerCase(); vb = vb.toLowerCase(); }
      if (va < vb) return sortConfig.dir === "asc" ? -1 : 1;
      if (va > vb) return sortConfig.dir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [holdings, searchQuery, filterTag, filterType, sortConfig]);

  /* ─── ACTIONS ─── */
  function handleAddTx() {
    if (!formData.name || !formData.qty || !formData.price) return;
    const entry = { id: uid(), name: formData.name.toUpperCase(), type: formData.type, qty: parseFloat(formData.qty), price: parseFloat(formData.price), date: formData.date, notes: formData.notes, tags: formData.tags };
    setHoldings(p => ({ ...p, [formData.category]: [...p[formData.category], entry] }));
    toast(`${formData.type === "buy" ? "Bought" : "Sold"} ${formData.name.toUpperCase()} added`);
    resetForm();
  }

  function handleEditTx() {
    if (!formData.name || !formData.qty || !formData.price) return;
    const updated = { ...editItem, name: formData.name.toUpperCase(), type: formData.type, qty: parseFloat(formData.qty), price: parseFloat(formData.price), date: formData.date, notes: formData.notes, tags: formData.tags };
    setHoldings(p => ({ ...p, [formData.category]: p[formData.category].map(h => h.id === editItem.id ? updated : h) }));
    toast("Transaction updated");
    resetForm();
  }

  function handleDeleteTx(cat, id) {
    setHoldings(p => ({ ...p, [cat]: p[cat].filter(h => h.id !== id) }));
    setDeleteConfirm(null);
    toast("Transaction deleted", "error");
  }

  function handleAddWatch() {
    if (!watchForm.name) return;
    setWatchlist(p => [...p, { id: uid(), ...watchForm, targetPrice: parseFloat(watchForm.targetPrice) || 0 }]);
    toast("Added to watchlist");
    setWatchForm({ name: "", category: "stocks", targetPrice: "", notes: "" });
    setShowModal(null);
  }

  function handleDeleteWatch(id) {
    setWatchlist(p => p.filter(w => w.id !== id));
    toast("Removed from watchlist", "error");
  }

  function handleUpdatePrice(asset, val) {
    const p = parseFloat(val);
    if (isNaN(p)) return;
    setCurrentPrices(prev => ({ ...prev, [asset]: p }));
    setPriceEditAsset(null);
    toast(`${asset} price updated to $${p}`);
  }

  function handleExportCSV() {
    let csv = "Category,Asset,Type,Quantity,Price,Total,Date,Notes,Tags\n";
    CATS.forEach(({ key, label }) => {
      holdings[key].forEach(h => {
        csv += `${label},${h.name},${h.type},${h.qty},${h.price},${(h.qty * h.price).toFixed(2)},${h.date},"${h.notes || ""}","${(h.tags || []).join(",")}"\n`;
      });
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `portfolio-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    toast("CSV exported");
  }

  function resetForm() {
    setFormData({ name: "", type: "buy", qty: "", price: "", date: new Date().toISOString().split("T")[0], notes: "", tags: [], category: formData.category });
    setEditItem(null);
    setShowModal(null);
  }

  function openEdit(cat, item) {
    setEditItem(item);
    setFormData({ name: item.name, type: item.type, qty: item.qty.toString(), price: item.price.toString(), date: item.date, notes: item.notes || "", tags: item.tags || [], category: cat });
    setShowModal("edit");
  }

  function toggleTag(tag) {
    setFormData(p => ({ ...p, tags: p.tags.includes(tag) ? p.tags.filter(t => t !== tag) : [...p.tags, tag] }));
  }

  function handleSort(key) {
    setSortConfig(p => ({ key, dir: p.key === key && p.dir === "desc" ? "asc" : "desc" }));
  }

  const goalPct = Math.min(100, totals.total > 0 ? (totals.total / goal.target) * 100 : 0);
  const catForTab = CATS.find(c => c.key === activeTab);

  /* ─── INPUT STYLE ─── */
  const inputStyle = {
    width: "100%", padding: "10px 12px", background: C.bg, border: `1px solid ${C.border}`,
    borderRadius: 8, color: C.text, fontSize: 13, fontFamily: "'DM Sans', sans-serif",
    outline: "none", boxSizing: "border-box", transition: "border-color 0.15s",
  };
  const btnSm = (color) => ({
    background: color + "18", color, border: `1px solid ${color}33`, borderRadius: 6,
    padding: "5px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
  });

  const TABS = [
    { key: "overview", label: "Overview", icon: "◎" },
    ...CATS.map(c => ({ key: c.key, label: c.label, icon: c.icon })),
    { key: "watchlist", label: "Watchlist", icon: "👁" },
    { key: "summary", label: "Summary", icon: "📊" },
  ];

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: C.bg, color: C.text, minHeight: "100vh" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <ToastContainer toasts={toasts} />

      {/* Dot grid bg */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, backgroundImage: `radial-gradient(${C.border}55 1px, transparent 1px)`, backgroundSize: "32px 32px", pointerEvents: "none" }} />

      <div className="main-container" style={{ position: "relative", zIndex: 1, maxWidth: 1600, margin: "0 auto", padding: "20px 32px" }}>

        {/* ═══ HEADER ═══ */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12,
          opacity: animIn ? 1 : 0, transform: animIn ? "none" : "translateY(-10px)", transition: "all 0.5s cubic-bezier(.16,1,.3,1)",
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.green, boxShadow: `0 0 8px ${C.green}88`, animation: "pulse 2s infinite" }} />
              <span style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: 2, fontWeight: 600 }}>Portfolio Live</span>
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, background: `linear-gradient(135deg, ${C.text}, ${C.textMuted})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Investment Tracker
            </h1>
          </div>
          <div className="header-actions" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {/* Currency Toggle */}
            <div style={{ display: "flex", background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
              {["USD", "SGD"].map(c => (
                <button key={c} onClick={() => setCurrency(c)} style={{
                  padding: "7px 14px", fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer",
                  fontFamily: "inherit", transition: "all 0.15s",
                  background: currency === c ? C.accent + "22" : "transparent",
                  color: currency === c ? C.accent : C.textDim,
                }}>{c === "USD" ? "$ USD" : "S$ SGD"}</button>
              ))}
            </div>
            <button onClick={handleExportCSV} style={{ ...btnSm(C.textMuted), padding: "7px 14px" }}>↓ CSV</button>
            <button onClick={() => { setShowModal("add"); setFormData(p => ({ ...p, category: catForTab?.key || "stocks" })); }}
              style={{
                background: `linear-gradient(135deg, ${C.accent}, #7c3aed)`, color: "#fff", border: "none", borderRadius: 9,
                padding: "9px 20px", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                boxShadow: `0 4px 14px ${C.accent}44`, fontFamily: "inherit",
              }}>
              <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add Transaction
            </button>
          </div>
        </div>

        {/* ═══ GOAL BAR ═══ */}
        <div className="goal-bar" style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 20px", marginBottom: 16,
          display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
          opacity: animIn ? 1 : 0, transition: "all 0.5s cubic-bezier(.16,1,.3,1) 0.05s",
        }}>
          <span style={{ fontSize: 12, color: C.textDim, fontWeight: 500, whiteSpace: "nowrap" }}>🎯 {goal.label}</span>
          <div style={{ flex: 1, minWidth: 120, height: 8, background: C.border, borderRadius: 4, overflow: "hidden", position: "relative" }}>
            <div style={{
              height: "100%", borderRadius: 4, transition: "width 0.8s cubic-bezier(.16,1,.3,1)",
              width: goalPct + "%",
              background: goalPct >= 100 ? `linear-gradient(90deg, ${C.green}, #10b981)` : `linear-gradient(90deg, ${C.accent}, #7c3aed)`,
              boxShadow: goalPct >= 100 ? `0 0 12px ${C.green}44` : `0 0 12px ${C.accent}44`,
            }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: goalPct >= 100 ? C.green : C.accent }}>
            {fmt(totals.total, currency)} / {fmt(goal.target, currency)} ({goalPct.toFixed(1)}%)
          </span>
          <button onClick={() => { setGoalEdit(true); setGoalForm({ target: goal.target.toString(), label: goal.label }); }}
            style={{ background: "none", border: "none", color: C.textDim, cursor: "pointer", fontSize: 13, padding: "2px 6px" }}>✎</button>
          {goalEdit && (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input value={goalForm.label} onChange={e => setGoalForm(p => ({ ...p, label: e.target.value }))} placeholder="Label" style={{ ...inputStyle, width: 120, padding: "6px 8px", fontSize: 11 }} />
              <input type="number" value={goalForm.target} onChange={e => setGoalForm(p => ({ ...p, target: e.target.value }))} placeholder="Target" style={{ ...inputStyle, width: 90, padding: "6px 8px", fontSize: 11 }} />
              <button onClick={() => { setGoal({ target: parseFloat(goalForm.target) || 50000, label: goalForm.label || "Goal" }); setGoalEdit(false); toast("Goal updated"); }} style={btnSm(C.green)}>Save</button>
              <button onClick={() => setGoalEdit(false)} style={btnSm(C.textDim)}>✕</button>
            </div>
          )}
        </div>

        {/* ═══ TOTALS CARD ═══ */}
        <div className="totals-card" style={{
          background: `linear-gradient(135deg, ${C.card}, #0c1220)`, border: `1px solid ${C.border}`,
          borderRadius: 16, padding: "20px 24px", marginBottom: 16,
          opacity: animIn ? 1 : 0, transition: "all 0.5s cubic-bezier(.16,1,.3,1) 0.1s",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div>
              <span style={{ fontSize: 11, color: C.textDim, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 500 }}>Total Portfolio Value</span>
              <div className="portfolio-value" style={{ fontSize: 36, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", marginTop: 2, letterSpacing: -1 }}>
                {fmt(totals.total, currency)}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 4, alignItems: "center" }}>
                <span style={{
                  fontSize: 13, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace",
                  color: totals.totalPnl >= 0 ? C.green : C.red,
                }}>
                  {totals.totalPnl >= 0 ? "▲" : "▼"} {fmt(Math.abs(totals.totalPnl), currency)} ({fmtPct(totals.totalPnlPct)})
                </span>
                <span style={{ fontSize: 10, color: C.textDim }}>Total P&L</span>
              </div>
            </div>
          </div>
          {/* Category Breakdown */}
          <div className="category-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginTop: 18 }}>
            {CATS.map(({ key, label, color, bg, icon }) => (
              <div key={key} style={{ background: bg, borderRadius: 10, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 11, color: C.textDim, marginBottom: 2 }}>{icon} {label}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color }}>{fmt(totals[key].value, currency)}</div>
                  <div style={{
                    fontSize: 11, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace",
                    color: totals[key].pnl >= 0 ? C.green : C.red, marginTop: 2,
                  }}>
                    {totals[key].pnl >= 0 ? "+" : ""}{fmt(totals[key].pnl, currency)} ({fmtPct(totals[key].pnlPct)})
                  </div>
                </div>
                <Sparkline data={sparkData[key]} color={color} />
              </div>
            ))}
          </div>
        </div>

        {/* ═══ CHARTS ROW ═══ */}
        <div className="charts-row" style={{
          display: "grid", gridTemplateColumns: "1fr 320px", gap: 14, marginBottom: 16,
          opacity: animIn ? 1 : 0, transition: "all 0.5s cubic-bezier(.16,1,.3,1) 0.15s",
        }}>
          {/* Main Chart */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 16px 10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", gap: 4 }}>
                {[{ k: "area", l: "Growth" }, { k: "bar", l: "Cost vs Value" }].map(ct => (
                  <button key={ct.k} onClick={() => setChartType(ct.k)} style={{
                    padding: "5px 12px", fontSize: 10, fontWeight: 600, border: `1px solid ${chartType === ct.k ? C.accent + "44" : C.border}`,
                    borderRadius: 6, background: chartType === ct.k ? C.accentBg : "transparent",
                    color: chartType === ct.k ? C.accent : C.textDim, cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase", letterSpacing: 0.5,
                  }}>{ct.l}</button>
                ))}
              </div>
              {chartType === "area" && (
                <div style={{ display: "flex", gap: 3 }}>
                  {[{ k: "1m", l: "1M" }, { k: "3m", l: "3M" }, { k: "6m", l: "6M" }, { k: "1y", l: "1Y" }, { k: "all", l: "All" }].map(tr => (
                    <button key={tr.k} onClick={() => setTimeRange(tr.k)} style={{
                      padding: "4px 10px", fontSize: 10, fontWeight: 600, border: "none", borderRadius: 5,
                      background: timeRange === tr.k ? C.borderLight : "transparent",
                      color: timeRange === tr.k ? C.text : C.textDim, cursor: "pointer", fontFamily: "inherit",
                    }}>{tr.l}</button>
                  ))}
                </div>
              )}
            </div>
            <ResponsiveContainer width="100%" height={200}>
              {chartType === "area" ? (
                <AreaChart data={timelineData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    {CATS.map(({ key, color }) => (
                      <linearGradient key={key} id={`g${key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                        <stop offset="100%" stopColor={color} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: C.textDim }} axisLine={{ stroke: C.border }} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: C.textDim }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v, currency)} width={55} />
                  <Tooltip content={<ChartTooltip currency={currency} />} />
                  {CATS.map(({ key, label, color }) => (
                    <Area key={key} type="monotone" dataKey={key} name={label} stroke={color} fill={`url(#g${key})`} strokeWidth={2} />
                  ))}
                </AreaChart>
              ) : (
                <BarChart data={barData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: C.textDim }} axisLine={{ stroke: C.border }} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: C.textDim }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v, currency)} width={55} />
                  <Tooltip content={<ChartTooltip currency={currency} />} />
                  <Bar dataKey="Cost" fill={C.textDim} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Current" fill={C.green} radius={[3, 3, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Pie */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px", display: "flex", flexDirection: "column" }}>
            <h3 style={{ fontSize: 11, fontWeight: 600, color: C.textDim, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 1 }}>Distribution</h3>
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={3} dataKey="value" stroke="none">
                    {pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0];
                    return (<div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", boxShadow: "0 4px 16px rgba(0,0,0,0.5)" }}>
                      <p style={{ color: d.payload.fill, fontSize: 12, margin: 0, fontWeight: 600 }}>{d.name}: {fmt(d.value, currency)} ({d.payload.pct}%)</p>
                    </div>);
                  }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {pieData.map(d => (
                <div key={d.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: d.fill }} />
                    <span style={{ fontSize: 11, color: C.textMuted }}>{d.name}</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: d.fill, fontFamily: "'JetBrains Mono', monospace" }}>{d.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ TAB NAV ═══ */}
        <div className="tab-nav" style={{
          display: "flex", gap: 3, marginBottom: 14, background: C.card, borderRadius: 10, padding: 3,
          border: `1px solid ${C.border}`, overflowX: "auto",
          opacity: animIn ? 1 : 0, transition: "all 0.5s cubic-bezier(.16,1,.3,1) 0.2s",
        }}>
          {TABS.map(t => {
            const isActive = activeTab === t.key;
            const catColor = CATS.find(c => c.key === t.key)?.color || C.accent;
            return (
              <button key={t.key} className="tab-btn" onClick={() => { setActiveTab(t.key); setSearchQuery(""); setFilterTag("all"); setFilterType("all"); }}
                style={{
                  flex: 1, padding: "9px 12px", border: "none", borderRadius: 7, minWidth: 70,
                  background: isActive ? catColor + "18" : "transparent",
                  color: isActive ? catColor : C.textDim,
                  fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", whiteSpace: "nowrap",
                }}>{t.icon} {t.label}</button>
            );
          })}
        </div>

        {/* ═══ TAB CONTENT ═══ */}
        <div style={{ opacity: animIn ? 1 : 0, transition: "all 0.5s cubic-bezier(.16,1,.3,1) 0.25s" }}>

          {/* OVERVIEW */}
          {activeTab === "overview" && (
            <div className="overview-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
              {CATS.map(({ key, label, color, bg, icon }) => (
                <div key={key} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18, position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color}, transparent)` }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color, display: "flex", alignItems: "center", gap: 6 }}>{icon} {label}</h3>
                    <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color, background: bg, padding: "4px 10px", borderRadius: 6 }}>
                      {fmt(totals[key].value, currency)}
                    </span>
                  </div>
                  {netPositions[key].length === 0 ? (
                    <div style={{ textAlign: "center", padding: "24px 0" }}>
                      <div style={{ fontSize: 36, opacity: 0.15, marginBottom: 8 }}>{icon}</div>
                      <p style={{ color: C.textDim, fontSize: 12, margin: 0 }}>No holdings yet</p>
                      <button onClick={() => { setShowModal("add"); setFormData(p => ({ ...p, category: key })); }}
                        style={{ ...btnSm(color), marginTop: 10, padding: "6px 16px" }}>+ Add first entry</button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      {netPositions[key].map(a => (
                        <div key={a.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: bg, borderRadius: 8 }}>
                          <div>
                            <span style={{ fontWeight: 600, fontSize: 12 }}>{a.name}</span>
                            <span style={{ marginLeft: 6, fontSize: 10, color: C.textDim }}>{a.totalQty} units</span>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 12, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(a.currentValue, currency)}</div>
                            <div style={{ fontSize: 10, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: a.pnl >= 0 ? C.green : C.red }}>
                              {a.pnl >= 0 ? "+" : ""}{fmt(a.pnl, currency)} ({fmtPct(a.pnlPct)})
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* CATEGORY DETAIL VIEW */}
          {catForTab && (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
              {/* Toolbar */}
              <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: catForTab.color }}>{catForTab.icon} {catForTab.label}</h3>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  {/* Search */}
                  <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search assets..."
                    style={{ ...inputStyle, width: 140, padding: "6px 10px", fontSize: 11, borderRadius: 6 }} />
                  {/* Type filter */}
                  <select value={filterType} onChange={e => setFilterType(e.target.value)}
                    style={{ ...inputStyle, width: "auto", padding: "6px 10px", fontSize: 11, borderRadius: 6, cursor: "pointer" }}>
                    <option value="all">All Types</option>
                    <option value="buy">Buy</option>
                    <option value="sell">Sell</option>
                  </select>
                  {/* Tag filter */}
                  <select value={filterTag} onChange={e => setFilterTag(e.target.value)}
                    style={{ ...inputStyle, width: "auto", padding: "6px 10px", fontSize: 11, borderRadius: 6, cursor: "pointer" }}>
                    <option value="all">All Tags</option>
                    {DEFAULT_TAGS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <button onClick={() => { setShowModal("add"); setFormData(p => ({ ...p, category: activeTab })); }}
                    style={btnSm(catForTab.color)}>+ Add</button>
                </div>
              </div>

              {/* Asset P&L Summary */}
              {netPositions[activeTab].length > 0 && (
                <div className="asset-summary" style={{ padding: "10px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {netPositions[activeTab].map(a => (
                    <div key={a.name} style={{
                      background: catForTab.bg, borderRadius: 8, padding: "8px 12px", flex: "1 1 auto", minWidth: 130, cursor: "pointer", position: "relative",
                      border: `1px solid ${priceEditAsset === a.name ? catForTab.color + "44" : "transparent"}`, transition: "border-color 0.15s",
                    }} onClick={() => { setPriceEditAsset(a.name); setPriceEditVal(currentPrices[a.name]?.toString() || ""); }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{a.name}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: a.pnl >= 0 ? C.green : C.red }}>
                          {fmtPct(a.pnlPct)}
                        </span>
                      </div>
                      <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>
                        Avg: {fmt(a.avgCost)} → Now: {fmt(a.currentPrice)}
                      </div>
                      {priceEditAsset === a.name && (
                        <div style={{ marginTop: 6, display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}>
                          <input type="number" value={priceEditVal} onChange={e => setPriceEditVal(e.target.value)} autoFocus
                            placeholder="Current price" style={{ ...inputStyle, padding: "4px 8px", fontSize: 11, flex: 1 }}
                            onKeyDown={e => e.key === "Enter" && handleUpdatePrice(a.name, priceEditVal)} />
                          <button onClick={() => handleUpdatePrice(a.name, priceEditVal)} style={btnSm(C.green)}>✓</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Transactions Table */}
              {getFilteredTx(activeTab).length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px" }}>
                  <div style={{ fontSize: 44, opacity: 0.12, marginBottom: 10 }}>{catForTab.icon}</div>
                  <p style={{ color: C.textDim, fontSize: 13, margin: 0 }}>
                    {searchQuery || filterTag !== "all" || filterType !== "all" ? "No transactions match your filters" : `No ${catForTab.label.toLowerCase()} transactions yet`}
                  </p>
                  {!searchQuery && filterTag === "all" && filterType === "all" && (
                    <button onClick={() => { setShowModal("add"); setFormData(p => ({ ...p, category: activeTab })); }}
                      style={{ ...btnSm(catForTab.color), marginTop: 12, padding: "8px 20px" }}>Add first entry</button>
                  )}
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className="tx-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                        {[
                          { k: "name", l: "Asset" }, { k: "type", l: "Type" }, { k: "qty", l: "Qty" },
                          { k: "price", l: "Price/Unit" }, { k: "total", l: "Total" }, { k: "date", l: "Date" },
                          { k: null, l: "Tags" }, { k: null, l: "Notes" }, { k: null, l: "" },
                        ].map((h, i) => (
                          <th key={i} onClick={() => h.k && handleSort(h.k)} style={{
                            textAlign: "left", padding: "9px 12px", fontSize: 10, color: C.textDim, fontWeight: 600,
                            textTransform: "uppercase", letterSpacing: 0.8, cursor: h.k ? "pointer" : "default",
                            userSelect: "none", whiteSpace: "nowrap",
                          }}>
                            {h.l} {sortConfig.key === h.k && (sortConfig.dir === "desc" ? "↓" : "↑")}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {getFilteredTx(activeTab).map(h => (
                        <tr key={h.id} style={{ borderBottom: `1px solid ${C.border}08`, transition: "background 0.1s" }}
                          onMouseEnter={e => e.currentTarget.style.background = C.cardHover}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          <td style={{ padding: "10px 12px", fontWeight: 600 }}>{h.name}</td>
                          <td style={{ padding: "10px 12px" }}>
                            <span style={{
                              fontSize: 9, fontWeight: 700, textTransform: "uppercase",
                              color: h.type === "buy" ? C.green : C.red,
                              background: h.type === "buy" ? C.greenBg : C.redBg,
                              padding: "2px 7px", borderRadius: 4,
                            }}>{h.type}</span>
                          </td>
                          <td style={{ padding: "10px 12px", fontFamily: "'JetBrains Mono', monospace" }}>{h.qty}</td>
                          <td style={{ padding: "10px 12px", fontFamily: "'JetBrains Mono', monospace" }}>{fmt(h.price, currency)}</td>
                          <td style={{ padding: "10px 12px", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: catForTab.color }}>{fmt(h.qty * h.price, currency)}</td>
                          <td style={{ padding: "10px 12px", color: C.textMuted, whiteSpace: "nowrap" }}>{fmtDate(h.date)}</td>
                          <td style={{ padding: "10px 12px" }}>
                            <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                              {(h.tags || []).map(t => (
                                <span key={t} style={{ fontSize: 9, background: C.border, color: C.textMuted, padding: "1px 6px", borderRadius: 3, whiteSpace: "nowrap" }}>{t}</span>
                              ))}
                            </div>
                          </td>
                          <td style={{ padding: "10px 12px", color: C.textDim, maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.notes || "—"}</td>
                          <td style={{ padding: "10px 12px" }}>
                            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                              <button onClick={() => openEdit(activeTab, h)} title="Edit"
                                style={{ background: "none", border: "none", color: C.textDim, cursor: "pointer", fontSize: 12, padding: "2px 5px", borderRadius: 4 }}
                                onMouseEnter={e => { e.target.style.color = C.accent; e.target.style.background = C.accentBg; }}
                                onMouseLeave={e => { e.target.style.color = C.textDim; e.target.style.background = "none"; }}>✎</button>
                              {deleteConfirm === h.id ? (
                                <div style={{ display: "flex", gap: 3 }}>
                                  <button onClick={() => handleDeleteTx(activeTab, h.id)} style={{ ...btnSm(C.red), padding: "3px 7px", fontSize: 9 }}>Delete</button>
                                  <button onClick={() => setDeleteConfirm(null)} style={{ ...btnSm(C.textDim), padding: "3px 7px", fontSize: 9 }}>No</button>
                                </div>
                              ) : (
                                <button onClick={() => setDeleteConfirm(h.id)} title="Delete"
                                  style={{ background: "none", border: "none", color: C.textDim, cursor: "pointer", fontSize: 14, padding: "2px 5px", borderRadius: 4 }}
                                  onMouseEnter={e => { e.target.style.color = C.red; e.target.style.background = C.redBg; }}
                                  onMouseLeave={e => { e.target.style.color = C.textDim; e.target.style.background = "none"; }}>×</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {/* Summary Row */}
                      <tr style={{ borderTop: `2px solid ${C.border}`, background: catForTab.bg }}>
                        <td style={{ padding: "10px 12px", fontWeight: 700, fontSize: 11, color: catForTab.color }} colSpan={2}>TOTAL</td>
                        <td style={{ padding: "10px 12px", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                          {getFilteredTx(activeTab).reduce((s, h) => s + (h.type === "buy" ? h.qty : -h.qty), 0).toFixed(4)}
                        </td>
                        <td style={{ padding: "10px 12px" }}>—</td>
                        <td style={{ padding: "10px 12px", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: catForTab.color }}>
                          {fmt(getFilteredTx(activeTab).reduce((s, h) => s + (h.type === "buy" ? 1 : -1) * h.qty * h.price, 0), currency)}
                        </td>
                        <td colSpan={4} />
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* WATCHLIST */}
          {activeTab === "watchlist" && (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>👁 Watchlist</h3>
                <button onClick={() => setShowModal("watchlist")} style={btnSm(C.accent)}>+ Add to Watchlist</button>
              </div>
              {watchlist.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px" }}>
                  <div style={{ fontSize: 44, opacity: 0.12, marginBottom: 10 }}>👁</div>
                  <p style={{ color: C.textDim, fontSize: 13 }}>Your watchlist is empty</p>
                  <button onClick={() => setShowModal("watchlist")} style={{ ...btnSm(C.accent), marginTop: 8, padding: "8px 20px" }}>Add your first asset</button>
                </div>
              ) : (
                <div className="watchlist-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10, padding: 14 }}>
                  {watchlist.map(w => {
                    const cat = CATS.find(c => c.key === w.category);
                    return (
                      <div key={w.id} style={{ background: cat?.bg || C.accentBg, borderRadius: 10, padding: "12px 14px", border: `1px solid ${C.border}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 14 }}>{cat?.icon}</span>
                            <span style={{ fontWeight: 600, fontSize: 14 }}>{w.name}</span>
                          </div>
                          <button onClick={() => handleDeleteWatch(w.id)}
                            style={{ background: "none", border: "none", color: C.textDim, cursor: "pointer", fontSize: 14, padding: "0 4px" }}
                            onMouseEnter={e => e.target.style.color = C.red} onMouseLeave={e => e.target.style.color = C.textDim}>×</button>
                        </div>
                        <div style={{ fontSize: 11, color: C.textDim, marginTop: 6 }}>
                          Target: <span style={{ color: cat?.color, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(w.targetPrice, currency)}</span>
                        </div>
                        {w.notes && <div style={{ fontSize: 10, color: C.textDim, marginTop: 4, fontStyle: "italic" }}>{w.notes}</div>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* MONTHLY SUMMARY */}
          {activeTab === "summary" && (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}` }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>📊 Monthly Summary</h3>
              </div>
              {monthlySummary.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", color: C.textDim }}>No data yet</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className="summary-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                        {["Month", "Invested", "Sold", "Net", "Stocks", "Gold", "Crypto", "Txns"].map((h, i) => (
                          <th key={i} style={{ textAlign: "left", padding: "9px 12px", fontSize: 10, color: C.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {monthlySummary.map(m => (
                        <tr key={m.month} style={{ borderBottom: `1px solid ${C.border}08` }}
                          onMouseEnter={e => e.currentTarget.style.background = C.cardHover}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          <td style={{ padding: "10px 12px", fontWeight: 600 }}>{fmtMonth(m.month + "-01")}</td>
                          <td style={{ padding: "10px 12px", fontFamily: "'JetBrains Mono', monospace", color: C.green }}>{fmt(m.invested, currency)}</td>
                          <td style={{ padding: "10px 12px", fontFamily: "'JetBrains Mono', monospace", color: m.sold > 0 ? C.red : C.textDim }}>{fmt(m.sold, currency)}</td>
                          <td style={{ padding: "10px 12px", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: (m.invested - m.sold) >= 0 ? C.green : C.red }}>
                            {fmt(m.invested - m.sold, currency)}
                          </td>
                          <td style={{ padding: "10px 12px", fontFamily: "'JetBrains Mono', monospace", color: C.stocks }}>{fmt(Math.abs(m.stocks), currency)}</td>
                          <td style={{ padding: "10px 12px", fontFamily: "'JetBrains Mono', monospace", color: C.gold }}>{fmt(Math.abs(m.gold), currency)}</td>
                          <td style={{ padding: "10px 12px", fontFamily: "'JetBrains Mono', monospace", color: C.crypto }}>{fmt(Math.abs(m.crypto), currency)}</td>
                          <td style={{ padding: "10px 12px", color: C.textMuted }}>{m.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══ MODAL ═══ */}
      {(showModal === "add" || showModal === "edit") && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={resetForm}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 24, width: "100%", maxWidth: 420,
            boxShadow: "0 24px 48px rgba(0,0,0,0.6)", maxHeight: "90vh", overflowY: "auto",
          }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 18px" }}>{showModal === "edit" ? "Edit Transaction" : "Add Transaction"}</h3>

            {/* Category */}
            <div style={{ display: "flex", gap: 5, marginBottom: 16 }}>
              {CATS.map(({ key, label, color, icon }) => (
                <button key={key} onClick={() => setFormData(p => ({ ...p, category: key }))}
                  style={{
                    flex: 1, padding: "7px 10px", border: `1px solid ${formData.category === key ? color : C.border}`,
                    borderRadius: 7, background: formData.category === key ? color + "18" : "transparent",
                    color: formData.category === key ? color : C.textDim,
                    fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  }}>{icon} {label}</button>
              ))}
            </div>

            {/* Buy/Sell */}
            <div style={{ display: "flex", gap: 5, marginBottom: 14 }}>
              {["buy", "sell"].map(t => (
                <button key={t} onClick={() => setFormData(p => ({ ...p, type: t }))}
                  style={{
                    flex: 1, padding: "8px", border: `1px solid ${formData.type === t ? (t === "buy" ? C.green : C.red) : C.border}`,
                    borderRadius: 7, background: formData.type === t ? (t === "buy" ? C.greenBg : C.redBg) : "transparent",
                    color: formData.type === t ? (t === "buy" ? C.green : C.red) : C.textDim,
                    fontSize: 12, fontWeight: 600, cursor: "pointer", textTransform: "uppercase", fontFamily: "inherit",
                  }}>{t === "buy" ? "↗ Buy" : "↘ Sell"}</button>
              ))}
            </div>

            {/* Fields */}
            {[
              { k: "name", l: "Asset Name", ph: "e.g. AAPL, BTC, Gold Bar", t: "text" },
              { k: "qty", l: "Quantity", ph: "0.00", t: "number" },
              { k: "price", l: "Price per Unit (USD)", ph: "0.00", t: "number" },
              { k: "date", l: "Date", t: "date" },
              { k: "notes", l: "Notes (optional)", ph: "Any notes...", t: "text" },
            ].map(f => (
              <div key={f.k} style={{ marginBottom: 10 }}>
                <label style={{ display: "block", fontSize: 10, color: C.textDim, marginBottom: 3, fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.5 }}>{f.l}</label>
                <input type={f.t} value={formData[f.k]} onChange={e => setFormData(p => ({ ...p, [f.k]: e.target.value }))} placeholder={f.ph}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = C.accent}
                  onBlur={e => e.target.style.borderColor = C.border} />
              </div>
            ))}

            {/* Tags */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 10, color: C.textDim, marginBottom: 5, fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.5 }}>Tags</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {DEFAULT_TAGS.map(t => (
                  <button key={t} onClick={() => toggleTag(t)}
                    style={{
                      padding: "4px 10px", borderRadius: 5, fontSize: 10, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
                      border: `1px solid ${formData.tags.includes(t) ? C.accent + "55" : C.border}`,
                      background: formData.tags.includes(t) ? C.accentBg : "transparent",
                      color: formData.tags.includes(t) ? C.accent : C.textDim,
                    }}>{t}</button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={resetForm} style={{
                flex: 1, padding: "10px", background: C.border, color: C.textMuted, border: "none",
                borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              }}>Cancel</button>
              <button onClick={showModal === "edit" ? handleEditTx : handleAddTx}
                style={{
                  flex: 2, padding: "10px",
                  background: `linear-gradient(135deg, ${C.accent}, #7c3aed)`, color: "#fff", border: "none",
                  borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  boxShadow: `0 4px 14px ${C.accent}44`,
                  opacity: (!formData.name || !formData.qty || !formData.price) ? 0.5 : 1,
                }}>{showModal === "edit" ? "Save Changes" : "Add Transaction"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Watchlist Modal */}
      {showModal === "watchlist" && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={() => setShowModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 24, width: "100%", maxWidth: 380,
            boxShadow: "0 24px 48px rgba(0,0,0,0.6)",
          }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 18px" }}>Add to Watchlist</h3>
            <div style={{ display: "flex", gap: 5, marginBottom: 14 }}>
              {CATS.map(({ key, label, color, icon }) => (
                <button key={key} onClick={() => setWatchForm(p => ({ ...p, category: key }))}
                  style={{
                    flex: 1, padding: "7px", border: `1px solid ${watchForm.category === key ? color : C.border}`,
                    borderRadius: 7, background: watchForm.category === key ? color + "18" : "transparent",
                    color: watchForm.category === key ? color : C.textDim,
                    fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  }}>{icon} {label}</button>
              ))}
            </div>
            {[
              { k: "name", l: "Asset Name", ph: "e.g. AMD, DOGE" },
              { k: "targetPrice", l: "Target Price (USD)", ph: "0.00", t: "number" },
              { k: "notes", l: "Notes", ph: "Why are you watching this?" },
            ].map(f => (
              <div key={f.k} style={{ marginBottom: 10 }}>
                <label style={{ display: "block", fontSize: 10, color: C.textDim, marginBottom: 3, fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.5 }}>{f.l}</label>
                <input type={f.t || "text"} value={watchForm[f.k]} onChange={e => setWatchForm(p => ({ ...p, [f.k]: e.target.value }))} placeholder={f.ph}
                  style={inputStyle} onFocus={e => e.target.style.borderColor = C.accent} onBlur={e => e.target.style.borderColor = C.border} />
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button onClick={() => setShowModal(null)} style={{ flex: 1, padding: "10px", background: C.border, color: C.textMuted, border: "none", borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              <button onClick={handleAddWatch} style={{
                flex: 2, padding: "10px", background: `linear-gradient(135deg, ${C.accent}, #7c3aed)`, color: "#fff", border: "none",
                borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                opacity: !watchForm.name ? 0.5 : 1,
              }}>Add to Watchlist</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes toastIn { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
        input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none}
        input[type=number]{-moz-appearance:textfield}
        select{-webkit-appearance:none;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23666' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 8px center;padding-right:24px!important}
        select option{background:${C.card};color:${C.text}}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px}

        /* ═══ RESPONSIVE ═══ */
        @media (max-width: 1023px) {
          .main-container { padding: 16px !important; }
          .charts-row { grid-template-columns: 1fr !important; }
          .portfolio-value { font-size: 28px !important; }
          .totals-card { padding: 16px !important; }
        }

        @media (max-width: 639px) {
          .main-container { padding: 12px 8px !important; }
          .header-actions { width: 100% !important; }
          .goal-bar { padding: 12px 14px !important; gap: 10px !important; }
          .portfolio-value { font-size: 22px !important; }
          .category-grid { grid-template-columns: 1fr !important; }
          .charts-row { grid-template-columns: 1fr !important; }
          .tab-nav { flex-wrap: wrap !important; overflow-x: visible !important; }
          .tab-btn { min-width: 0 !important; flex: 1 1 calc(33.33% - 4px) !important; padding: 7px 6px !important; font-size: 10px !important; }
          .overview-grid { grid-template-columns: 1fr !important; }
          .asset-summary > div { min-width: 100% !important; }
          .tx-table th:nth-child(7), .tx-table td:nth-child(7),
          .tx-table th:nth-child(8), .tx-table td:nth-child(8) { display: none !important; }
          .tx-table th, .tx-table td { padding: 8px 6px !important; font-size: 11px !important; }
          .watchlist-grid { grid-template-columns: 1fr !important; }
          .summary-table th:nth-child(n+5):nth-child(-n+7),
          .summary-table td:nth-child(n+5):nth-child(-n+7) { display: none !important; }
          .summary-table th, .summary-table td { padding: 8px 6px !important; }
          .modal-content { padding: 16px !important; border-radius: 14px !important; }
        }
      `}</style>
    </div>
  );
}
