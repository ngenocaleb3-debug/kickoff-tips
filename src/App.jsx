import React, { useState, useEffect, useRef } from "react";
import { Trophy, Home, BarChart3, Zap, Check, X as XIcon, TrendingUp, Bell, Plus, Lock, Trash2, Send, LogOut } from "lucide-react";
import {
  subscribeTips,
  publishTip,
  settleTip,
  deleteTip,
  adminLogin,
  adminLogout,
  watchAdminAuth,
} from "./firebase";

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------
const COLORS = {
  pitchDark: "#0A1D14",
  pitchMid: "#123322",
  card: "#16402A",
  cardLine: "#2A5A3E",
  floodlight: "#F2C230",
  floodlightDim: "#8A6B1E",
  chalk: "#EDEFE6",
  chalkDim: "#9FB3A6",
  win: "#4FB286",
  draw: "#E8B84B",
  loss: "#E4694F",
};

const LAST_SEEN_KEY = "kickofftips:last-seen-ts";

const MARKET_OPTIONS = {
  "1X2": ["Home Win", "Away Win"],
  HG: ["Home -1.5", "Home -1", "Away -1.5", "Away -1"],
  "OV2.5": ["Over 2.5 Goals", "Under 2.5 Goals"],
};

function marketColor(market) {
  if (market === "OV2.5") return COLORS.draw;
  if (market === "HG") return "#7FB8E0";
  return COLORS.floodlight;
}

function initials(name) {
  return (name || "??").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function formatKickoff(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" });
}

// ---------------------------------------------------------------------------
// Small UI pieces
// ---------------------------------------------------------------------------
function ConfidenceRing({ value }) {
  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    setAnimated(0);
    const t = setTimeout(() => setAnimated(value), 100);
    return () => clearTimeout(t);
  }, [value]);
  const r = 22;
  const c = 2 * Math.PI * r;
  const offset = c - (animated / 100) * c;
  return (
    <div className="relative flex items-center justify-center" style={{ width: 56, height: 56 }}>
      <svg width="56" height="56" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r={r} fill="none" stroke={COLORS.pitchDark} strokeWidth="5" />
        <circle cx="28" cy="28" r={r} fill="none" stroke={COLORS.floodlight} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset} transform="rotate(-90 28 28)"
          style={{ transition: "stroke-dashoffset 800ms cubic-bezier(.22,1,.36,1)" }} />
      </svg>
      <span className="absolute text-[11px] font-bold tabular-nums" style={{ color: COLORS.chalk }}>{animated}%</span>
    </div>
  );
}

function TipCard({ tip, isNew }) {
  const [flipped, setFlipped] = useState(false);
  const mColor = marketColor(tip.market);
  return (
    <div className="relative w-full">
      {isNew && (
        <span className="absolute -top-2 left-3 z-10 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
          style={{ backgroundColor: COLORS.loss, color: COLORS.chalk }}>
          New
        </span>
      )}
      {tip.result && (
        <span className="absolute -top-2 right-3 z-10 flex h-6 w-6 items-center justify-center rounded-full"
          style={{ backgroundColor: tip.result === "correct" ? COLORS.win : COLORS.loss, border: `2px solid ${COLORS.pitchDark}` }}>
          {tip.result === "correct" ? <Check size={13} style={{ color: COLORS.pitchDark }} /> : <XIcon size={13} style={{ color: COLORS.pitchDark }} />}
        </span>
      )}
      <div onClick={() => setFlipped((f) => !f)} className="cursor-pointer select-none" style={{ perspective: 1200, height: 150 }}>
        <div className="relative h-full w-full" style={{ transformStyle: "preserve-3d", transition: "transform 550ms cubic-bezier(.34,1.15,.64,1)", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}>
          <div className="absolute inset-0 flex flex-col justify-between rounded-2xl p-4"
            style={{ backfaceVisibility: "hidden", background: `linear-gradient(160deg, ${COLORS.card} 0%, ${COLORS.pitchMid} 100%)`, border: `1px solid ${COLORS.cardLine}` }}>
            <div className="flex items-center justify-between">
              <span className="truncate rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest" style={{ backgroundColor: COLORS.floodlightDim + "40", color: COLORS.floodlight, maxWidth: 150 }}>
                {tip.league}
              </span>
              <span classame="shrink-0 text-[10px] font-medium" style={{ color: COLORS.chalkDim }}>{formatKickoff(tip.kickoff)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-1 items-center gap-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold" style={{ backgroundColor: COLORS.pitchDark, color: COLORS.chalk, fontFamily: "'Space Grotesk', sans-serif" }}>{initials(tip.home)}</div>
                <span className="truncate text-xs font-semibold" style={{ color: COLORS.chalk }}>{tip.home}</span>
              </div>
              <span className="text-[10px] font-bold" style={{ color: COLORS.chalkDim, fontFamily: "'Bebas Neue', sans-serif" }}>VS</span>
              <div className="flex flex-1 flex-row-reverse items-center gap-2 text-right">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold" style={{ backgroundColor: COLORS.pitchDark, color: COLORS.chalk, fontFamily: "'Space Grotesk', sans-serif" }}>{initials(tip.away)}</div>
                <span className="truncate text-xs font-semibold" style={{ color: COLORS.chalk }}>{tip.away}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide" style={{ backgroundColor: mColor + "22", color: mColor, border: `1px solid ${mColor}55` }}>{tip.market}</span>
                <span className="text-[11px] font-bold" style={{ color: COLORS.chalk }}>{tip.pick}</span>
              </div>
              <span className="flex items-center gap-1 text-[10px]" style={{ color: COLORS.chalkDim }}><Zap size={11} style={{ color: COLORS.floodlight }} />{tip.confidence}%</span>
            </div>
          </div>

          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl p-4"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)", background: `linear-gradient(160deg, ${COLORS.pitchMid} 0%, ${COLORS.card} 100%)`, border: `1px solid ${COLORS.cardLine}` }}>
            <span className="text-[10px] uppercase tracking-widest" style={{ color: COLORS.chalkDim }}>Full-time score prediction</span>
            <span className="text-4xl font-bold tabular-nums" style={{ color: COLORS.chalk, fontFamily: "'Space Grotesk', sans-serif" }}>{tip.ftScore}</span>
            <div className="flex items-center gap-3">
              <ConfidenceRing value={flipped ? tip.confidence : 0} />
              <p className="max-w-[150px] text-[10px] leading-snug" style={{ color: COLORS.chalkDim }}>{tip.note}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrackRecord({ tips }) {
  return null;
}

function AdminPanel({ tips, adminUser, onPublish, onSettle, onDelete }) {
  const [email, setEmail] = useState("");


  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const blank = {
    league: "",
    home: "",
    away: "",
    prediction: "",
    odds: "",
    category: "Free",
  };
  const [form, setForm] = useState(blank);

  async function handleLogin() {
    setLoginError("");
    setLoggingIn(true);
    try {
      await adminLogin(email, password);
    } catch (e) {
      setLoginError(e.code || "Login failed. Check email and password.");
    } finally {
      setLoggingIn(false);
    }
  }

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function submit() {
    if (!form.home || !form.away || !form.prediction || !form.odds) return;
    onPublish({
      ...form,
      match: `${form.home} vs ${form.away}`,
      status: "pending",
    });
    setForm(blank);
  }

  if (!adminUser) {
    return (
      <div className="mx-5 mb-3 flex flex-col gap-3 p-4 bg-slate-900 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2">
          <Lock size={14} style={{ color: "GOLD" }} />
          <span className="text-xs font-semibold text-slate-200">
            Admin Login
          </span>
        </div>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg px-3 py-2 bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg px-3 py-2 bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
        />
        {loginError && (
          <span className="text-xs text-rose-400">{loginError}</span>
        )}
        <button
          onClick={handleLogin}
          disabled={loggingIn}
          className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg text-sm transition-colors"
        >
          {loggingIn ? "Signing in..." : "Sign in"}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-5 mb-3 flex flex-col gap-3">
      <div className="flex justify-between items-center bg-slate-900 p-3 rounded-xl border border-slate-800">
        <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Admin Active
        </span>
        <button
          onClick={adminLogout}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
        >
          <LogOut size={14} /> Logout
        </button>
      </div>

      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
        <h3 className="font-bold text-white text-sm flex items-center gap-2">
          <Plus size={16} className="text-emerald-400" /> Post New Tip
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            placeholder="Home Team"
            value={form.home}
            onChange={(e) => update("home", e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
          <input
            type="text"
            placeholder="Away Team"
            value={form.away}
            onChange={(e) => update("away", e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
        <input
          type="text"
          placeholder="League (e.g. Premier League)"
          value={form.league}
          onChange={(e) => update("league", e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            placeholder="Prediction (e.g. Home Win)"
            value={form.prediction}
            onChange={(e) => update("prediction", e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
          <input
            type="text"
            placeholder="Odds (e.g. 1.85)"
            value={form.odds}
            onChange={(e) => update("odds", e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
        <select
          value={form.category}
          onChange={(e) => update("category", e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
        >
          <option value="Free">Free Tip</option>
          <option value="VIP">VIP Tip</option>
        </select>
        <button
          onClick={submit}
          className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-sm flex items-center justify-center gap-1"
        >
          <Send size={16} /> Publish Tip
        </button>
      </div>

      <div className="mt-4 space-y-2">
        <h4 className="text-xs font-semibold text-slate-400 uppercase">
          Manage Tips
        </h4>
        {tips.map((tip) => (
          <div
            key={tip.id}
            className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex justify-between items-center"
          >
            <div>
              <p className="font-semibold text-xs text-white">{tip.match}</p>
              <p className="text-[10px] text-slate-400">
                {tip.prediction} @ {tip.odds} ({tip.status})
              </p>
            </div>
            <div className="flex gap-1">
              {tip.status === "pending" && (
                <>
                  <button
                    onClick={() => onSettle(tip.id, "won")}
                    className="p-1 bg-emerald-600/20 text-emerald-400 rounded text-xs"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => onSettle(tip.id, "lost")}
                    className="p-1 bg-rose-600/20 text-rose-400 rounded text-xs"
                  >
                    <XIcon size={14} />
                  </button>
                </>
              )}
              <button
                onClick={() => onDelete(tip.id)}
                className="p-1 bg-slate-800 text-slate-400 hover:text-rose-400 rounded text-xs"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

      async function handleLogin() {
    setLoginError("");
    setLoggingIn(true);
    try {
      await adminLogin(email, password);
    } catch (e) {
      setLoginError("Login failed. Check your email and password.");
    } finally {
      setLoggingIn(false);
    }
  }




  function update(field, value) {
    setForm((f) => {
      const next = { ...f, [field]: value };
      if (field === "market") next.pick = MARKET_OPTIONS[value][0];
      return next;
    });
  }

  function submit() {
    if (!form.home || !form.away || !form.kickoff || !form.ftScore) return;
    onPublish({ ...form, confidence: Number(form.confidence), result: null });
    setForm(blank);
  }

      if (!adminUser) {
    return (
      <div className="mx-5 mb-3 flex flex-col gap-3 p-4 bg-slate-900 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2">
          <Lock size={14} style={{ color: "GOLD" }} />
          <span className="text-xs font-semibold text-slate-200">Admin Login</span>
        </div>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg px-3 py-2 bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg px-3 py-2 bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
        />
        {loginError && <span className="text-xs text-rose-400">{loginError}</span>}
        <button
          onClick={handleLogin}
          disabled={loggingIn}
          className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg text-sm transition-colors"
        >
          {loggingIn ? "Signing in..." : "Sign in"}
        </button>
      </div>
    );
  }


  return (
    <div className="mx-5 mb-3 flex flex-col gap-3 rounded-2xl p-4" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.cardLine}` }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold" style={{ color: COLORS.chalk }}>Publish a new tip</span>
        <button onClick={adminLogout} className="flex items-center gap-1 text-[10px]" style={{ color: COLORS.chalkDim }}>
          <LogOut size={11} /> Sign out
        </button>
      </div>

      <input placeholder="League (e.g. Kenyan Premier League)" value={form.league} onChange={(e) => update("league", e.target.value)} className="rounded-lg px-3 py-2 text-xs outline-none" style={inputStyle} />
      <div className="flex gap-2">
        <input placeholder="Home team" value={form.home} onChange={(e) => update("home", e.target.value)} className="flex-1 rounded-lg px-3 py-2 text-xs outline-none" style={inputStyle} />
        <input placeholder="Away team" value={form.away} onChange={(e) => update("away", e.target.value)} className="flex-1 rounded-lg px-3 py-2 text-xs outline-none" style={inputStyle} />
      </div>
      <input type="datetime-local" value={form.kickoff} onChange={(e) => update("kickoff", e.target.value)} className="rounded-lg px-3 py-2 text-xs outline-none" style={inputStyle} />

      <div className="flex gap-2">
        <select value={form.market} onChange={(e) => update("market", e.target.value)} className="flex-1 rounded-lg px-3 py-2 text-xs outline-none" style={inputStyle}>
          {Object.keys(MARKET_OPTIONS).map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={form.pick} onChange={(e) => update("pick", e.target.value)} className="flex-1 rounded-lg px-3 py-2 text-xs outline-none" style={inputStyle}>
          {MARKET_OPTIONS[form.market].map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div className="flex gap-2">
        <input placeholder="FT score e.g. 2 – 1" value={form.ftScore} onChange={(e) => update("ftScore", e.target.value)} className="flex-1 rounded-lg px-3 py-2 text-xs outline-none" style={inputStyle} />
        <input type="number" min="1" max="99" value={form.confidence} onChange={(e) => update("confidence", e.target.value)} className="w-20 rounded-lg px-3 py-2 text-xs outline-none" style={inputStyle} />
      </div>

      <textarea placeholder="Note / reasoning" value={form.note} onChange={(e) => update("note", e.target.value)} rows={2} className="rounded-lg px-3 py-2 text-xs outline-none" style={inputStyle} />

              <button onClick={submit} className="flex items-c...">
          <Send size={13} /> Publish tip
              {tips.length > 0 && (
        <div className="mt-2 flex flex-col gap-2">
          <span className="text-[10px] uppercase font-semibold text-slate-400">
            Manage Tips
          </span>
          {tips.map((t) => (
            <div key={t.id} className="flex items-center justify-between bg-slate-900 border border-slate-800 p-2.5 rounded-lg">
              <span className="min-w-0 flex-1 truncate text-xs text-white font-medium">{t.match}</span>

              <div className="flex shrink-0 items-center gap-1.5 ml-2">
                <button
                  onClick={() => onSettle(t.id, "won")}
                  className="flex h-6 w-6 items-center justify-center rounded bg-emerald-600/20 text-emerald-400"
                >
                  <Check size={12} />
                </button>
                <button
                  onClick={() => onSettle(t.id, "lost")}
                  className="flex h-6 w-6 items-center justify-center rounded bg-rose-600/20 text-rose-400"
                >
                  <XIcon size={12} />
                </button>
                <button
                  onClick={() => onDelete(t.id)}
                  className="flex h-6 w-6 items-center justify-center rounded bg-slate-800 text-slate-400 hover:text-rose-400"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// App shell
// -----------------------------------------------------------------------------
export default function App() {

  const [tab, setTab] = useState("feed");
  const [tips, setTips] = useState([]);
  const [adminUser, setAdminUser] = useState(null);
  const [lastSeen, setLastSeen] = useState(() => Number(localStorage.getItem(LAST_SEEN_KEY) || 0));
  const [toast, setToast] = useState(null);
  const knownIds = useRef(new Set());
  const firstLoad = useRef(true);

  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  // Real-time admin auth state
  useEffect(() => watchAdminAuth(setAdminUser), []);

  // Real-time tips feed — no polling needed, Firestore pushes changes instantly
  useEffect(() => {
    const unsub = subscribeTips((data) => {
      if (!firstLoad.current) {
        const fresh = data.filter((t) => !knownIds.current.has(t.id));
        if (fresh.length > 0) {
          setToast(`New tip: ${fresh[0].home} vs ${fresh[0].away} — ${fresh[0].pick}`);
          setTimeout(() => setToast(null), 4000);
        }
      }
      firstLoad.current = false;
      knownIds.current = new Set(data.map((t) => t.id));
      setTips(data);
    });
    return unsub;
  }, []);

  const unseenCount = tips.filter((t) => t.createdAt > lastSeen).length;

  function markSeen() {
    const ts = Date.now();
    setLastSeen(ts);
    localStorage.setItem(LAST_SEEN_KEY, String(ts));
  }

  return (
    <div className="mx-auto flex h-screen w-full max-w-md flex-col" style={{ backgroundColor: COLORS.pitchDark, fontFamily: "'Inter', sans-serif" }}>
      <div className="flex shrink-0 items-center justify-between px-5 pb-2 pt-6">
        <div>
          <p className="text-[11px] uppercase tracking-widest" style={{ color: COLORS.chalkDim }}>{tips.length} tips live</p>
          <h1 className="text-2xl font-bold leading-none" style={{ color: COLORS.chalk, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 1 }}>Kickoff Tips</h1>
        </div>
        <div className="relative">
          <Trophy size={26} style={{ color: COLORS.floodlight }} />
          {unseenCount > 0 && (
            <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold" style={{ backgroundColor: COLORS.loss, color: COLORS.chalk }}>
              {unseenCount}
            </span>
          )}
        </div>
      </div>

      {toast && (
        <div className="mx-5 mb-2 flex items-center gap-2 rounded-xl px-3 py-2" style={{ backgroundColor: COLORS.floodlight }}>
          <Bell size={13} style={{ color: COLORS.pitchDark }} />
          <span className="text-[11px] font-semibold" style={{ color: COLORS.pitchDark }}>{toast}</span>
        </div>
      )}

      {tab === "feed" ? (
        <div className="flex-1 overflow-y-auto px-5" onClick={markSeen}>
          {tips.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <span className="text-xs" style={{ color: COLORS.chalkDim }}>No tips published yet. Check back soon.</span>
            </div>
          ) : (
            <div className="flex flex-col gap-3 pb-2 pt-1">
              {tips.map((t) => <TipCard key={t.id} tip={t} isNew={t.createdAt > lastSeen} />)}
            </div>
          )}
          {tips.length > 0 && <AdSlot />}
        </div>
      ) : tab === "record" ? (
        <div className="flex-1 overflow-y-auto pt-2"><TrackRecord tips={tips} /></div>
      ) : (
        <div className="flex-1 overflow-y-auto pt-2">
          <AdminPanel
            tips={tips}
            adminUser={adminUser}
            onPublish={publishTip}
            onDelete={deleteTip}
            onSettle={settleTip}
          />
        </div>
      )}

      <div className="flex shrink-0 justify-around border-t px-5 py-3" style={{ borderColor: COLORS.cardLine, backgroundColor: COLORS.pitchDark }}>
        <button onClick={() => setTab("feed")} className="flex flex-col items-center gap-1">
          <Home size={20} style={{ color: tab === "feed" ? COLORS.floodlight : COLORS.chalkDim }} />
          <span className="text-[10px]" style={{ color: tab === "feed" ? COLORS.floodlight : COLORS.chalkDim }}>Tips</span>
        </button>
        <button onClick={() => setTab("record")} className="flex flex-col items-center gap-1">
          <BarChart3 size={20} style={{ color: tab === "record" ? COLORS.floodlight : COLORS.chalkDim }} />
          <span className="text-[10px]" style={{ color: tab === "record" ? COLORS.floodlight : COLORS.chalkDim }}>Track Record</span>
        </button>
        <button onClick={() => setTab("admin")} className="flex flex-col items-center gap-1">
          <Plus size={20} style={{ color: tab === "admin" ? COLORS.floodlight : COLORS.chalkDim }} />
          <span className="text-[10px]" style={{ color: tab === "admin" ? COLORS.floodlight : COLORS.chalkDim }}>Publish</span>
        </button>
      </div>

      <p className="shrink-0 px-5 pb-4 text-center text-[9px] leading-snug" style={{ color: COLORS.chalkDim, backgroundColor: COLORS.pitchDark }}>
        For informational and entertainment purposes only. Does not facilitate betting or gambling.
      </p>
    </div>
  );
      }
