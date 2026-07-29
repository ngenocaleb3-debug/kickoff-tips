import React, { useState, useEffect, useRef } from "react";
import { Trophy, Home, BarChart3, Zap, Check, X as XIcon, TrendingUp, Bell, Plus, Lock, Trash2, Send, LogOut, Flame, PlayCircle, Save } from "lucide-react";
import {
  subscribeTips,
  publishTip,
  settleTip,
  deleteTip,
  updateFinalScore,
  adminLogin,
  adminLogout,
  watchAdminAuth,
} from "./firebase";
import { initAdMob, showBannerAd, watchRewardedAd } from "./admob";

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
const UNLOCKED_KEY = "kickofftips:unlocked-tips";
const HIGH_CONFIDENCE_THRESHOLD = 75;

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

// Kickoff times are stored as ISO timestamps (UTC). This formats them in
// whatever timezone the viewer's own device is set to, automatically.
function formatKickoff(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function loadUnlocked() {
  try {
    return new Set(JSON.parse(localStorage.getItem(UNLOCKED_KEY) || "[]"));
  } catch {
    return new Set();
  }
}
function saveUnlocked(set) {
  localStorage.setItem(UNLOCKED_KEY, JSON.stringify([...set]));
}

function ConfidenceRing({ value }) {
  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    setAnimated(0);
    const t = setTimeout(() => setAnimated(value), 100);
    return () => clearTimeout(t);
  }, [value]);
  const r = 26;
  const c = 2 * Math.PI * r;
  const offset = c - (animated / 100) * c;
  return (
    <div className="relative flex items-center justify-center" style={{ width: 64, height: 64 }}>
      <svg width="64" height="64" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} fill="none" stroke={COLORS.pitchDark} strokeWidth="6" />
        <circle cx="32" cy="32" r={r} fill="none" stroke={COLORS.floodlight} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset} transform="rotate(-90 32 32)"
          style={{ transition: "stroke-dashoffset 800ms cubic-bezier(.22,1,.36,1)" }} />
      </svg>
      <span className="absolute text-sm font-bold tabular-nums" style={{ color: COLORS.chalk }}>{animated}%</span>
    </div>
  );
}

function TipCard({ tip, isNew, unlocked, onUnlock }) {
  const [flipped, setFlipped] = useState(false);
  const [watching, setWatching] = useState(false);
  const mColor = marketColor(tip.market);
  const isHighConfidence = tip.confidence >= HIGH_CONFIDENCE_THRESHOLD;
  const isLocked = isHighConfidence && !unlocked;

  async function handleWatchAd(e) {
    e.stopPropagation();
    setWatching(true);
    const earned = await watchRewardedAd();
    setWatching(false);
    if (earned) onUnlock(tip.id);
  }

  return (
    <div className="relative w-full">
      {isNew && (
        <span className="absolute -top-2 left-3 z-10 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
          style={{ backgroundColor: COLORS.loss, color: COLORS.chalk }}>
          New
        </span>
      )}
      {tip.result && (
        <span className="absolute -top-2 right-3 z-10 flex h-7 w-7 items-center justify-center rounded-full"
          style={{ backgroundColor: tip.result === "correct" ? COLORS.win : COLORS.loss, border: `2px solid ${COLORS.pitchDark}` }}>
          {tip.result === "correct" ? <Check size={15} style={{ color: COLORS.pitchDark }} /> : <XIcon size={15} style={{ color: COLORS.pitchDark }} />}
        </span>
      )}
      {isHighConfidence && !tip.result && (
        <span className="absolute -top-2 right-3 z-10 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
          style={{ backgroundColor: COLORS.floodlight, color: COLORS.pitchDark }}>
          <Flame size={11} /> Hot
        </span>
      )}

      <div onClick={() => !isLocked && setFlipped((f) => !f)} className={isLocked ? "" : "cursor-pointer select-none"} style={{ perspective: 1200, height: 180 }}>
        <div className="relative h-full w-full" style={{ transformStyle: "preserve-3d", transition: "transform 550ms cubic-bezier(.34,1.15,.64,1)", transform: flipped && !isLocked ? "rotateY(180deg)" : "rotateY(0deg)" }}>
          {/* FRONT */}
          <div className="absolute inset-0 flex flex-col justify-between rounded-2xl p-4"
            style={{ backfaceVisibility: "hidden", background: `linear-gradient(160deg, ${COLORS.card} 0%, ${COLORS.pitchMid} 100%)`, border: `1px solid ${isHighConfidence ? COLORS.floodlight + "88" : COLORS.cardLine}` }}>
            <div className="flex items-center justify-between">
              <span className="truncate rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest" style={{ backgroundColor: COLORS.floodlightDim + "40", color: COLORS.floodlight, maxWidth: 160 }}>
                {tip.league}
              </span>
              <span className="shrink-0 text-xs font-semibold" style={{ color: COLORS.chalkDim }}>{formatKickoff(tip.kickoff)}</span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-1 items-center gap-2.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold" style={{ backgroundColor: COLORS.pitchDark, color: COLORS.chalk, fontFamily: "'Space Grotesk', sans-serif" }}>{initials(tip.home)}</div>
                <span className="truncate text-base font-bold" style={{ color: COLORS.chalk }}>{tip.home}</span>
              </div>
              <span className="text-xs font-bold" style={{ color: COLORS.chalkDim, fontFamily: "'Bebas Neue', sans-serif" }}>VS</span>
              <div className="flex flex-1 flex-row-reverse items-center gap-2.5 text-right">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold" style={{ backgroundColor: COLORS.pitchDark, color: COLORS.chalk, fontFamily: "'Space Grotesk', sans-serif" }}>{initials(tip.away)}</div>
                <span className="truncate text-base font-bold" style={{ color: COLORS.chalk }}>{tip.away}</span>
              </div>
            </div>

            {isLocked ? (
              <button
                onClick={handleWatchAd}
                disabled={watching}
                className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold"
                style={{ backgroundColor: COLORS.floodlight, color: COLORS.pitchDark, opacity: watching ? 0.7 : 1 }}
              >
                {watching ? "Loading ad…" : <><PlayCircle size={16} /> Watch ad to unlock tip</>}
              </button>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide" style={{ backgroundColor: mColor + "22", color: mColor, border: `1px solid ${mColor}55` }}>{tip.market}</span>
                  <span className="text-base font-bold" style={{ color: COLORS.chalk }}>{tip.pick}</span>
                </div>
                <span className="flex items-center gap-1 text-sm font-bold" style={{ color: COLORS.chalkDim }}><Zap size={13} style={{ color: COLORS.floodlight }} />{tip.confidence}%</span>
              </div>
            )}
          </div>

          {/* BACK */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl p-4"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)", background: `linear-gradient(160deg, ${COLORS.pitchMid} 0%, ${COLORS.card} 100%)`, border: `1px solid ${COLORS.cardLine}` }}>
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: COLORS.chalkDim }}>
              {tip.played ? "Full-time score" : "Score prediction"}
            </span>
            <span className="text-5xl font-bold tabular-nums" style={{ color: COLORS.chalk, fontFamily: "'Space Grotesk', sans-serif" }}>{tip.ftScore}</span>
            <div className="flex items-center gap-3">
              <ConfidenceRing value={flipped ? tip.confidence : 0} />
              <p className="max-w-[160px] text-xs leading-snug" style={{ color: COLORS.chalkDim }}>{tip.note}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrackRecord({ tips }) {
  const settled = tips.filter((t) => t.result === "correct" || t.result === "wrong");
  const hits = settled.filter((r) => r.result === "correct").length;
  const accuracy = settled.length ? Math.round((hits / settled.length) * 100) : 0;
  return (
    <div className="flex flex-col gap-4 px-5 pb-6">
      <div className="flex items-center justify-between rounded-2xl p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.cardLine}` }}>
        <div>
          <p className="text-xs uppercase tracking-widest" style={{ color: COLORS.chalkDim }}>Season accuracy</p>
          <p className="text-4xl font-bold" style={{ color: COLORS.floodlight, fontFamily: "'Space Grotesk', sans-serif" }}>{accuracy}%</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <TrendingUp size={24} style={{ color: COLORS.win }} />
          <span className="text-xs font-semibold" style={{ color: COLORS.chalkDim }}>{hits}/{settled.length} tips landed</span>
        </div>
      </div>
      {settled.length === 0 ? (
        <span className="py-8 text-center text-sm" style={{ color: COLORS.chalkDim }}>No settled tips yet — mark results in the Publish tab once matches finish.</span>
      ) : (
        <div className="flex flex-col gap-2">
          {settled.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-xl px-4 py-3" style={{ backgroundColor: COLORS.pitchMid, border: `1px solid ${COLORS.cardLine}` }}>
              <div>
                <p className="text-sm font-bold" style={{ color: COLORS.chalk }}>{r.home} vs {r.away}</p>
                <p className="text-xs" style={{ color: COLORS.chalkDim }}>Tip: {r.pick} · FT {r.ftScore}</p>
              </div>
              <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: r.result === "correct" ? COLORS.win + "26" : COLORS.loss + "26", color: r.result === "correct" ? COLORS.win : COLORS.loss }}>
                {r.result === "correct" ? <Check size={16} /> : <XIcon size={16} />}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Real AdMob banner is triggered natively via showBannerAd() (see App below).
// This placeholder only shows in web preview, where the native banner can't render.
function AdSlot() {
  return (
    <div className="mx-5 my-3 flex items-center justify-center rounded-xl py-3 text-xs" style={{ backgroundColor: COLORS.pitchMid, border: `1px dashed ${COLORS.cardLine}`, color: COLORS.chalkDim }}>
      AdMob banner (shows on device)
    </div>
  );
}

function AdminPanel({ tips, adminUser, onPublish, onDelete, onSettle, onUpdateScore }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [scoreEdits, setScoreEdits] = useState({});

  const blank = { league: "", home: "", away: "", kickoff: "", market: "1X2", pick: "Home Win", ftScore: "", confidence: 65, note: "" };
  const [form, setForm] = useState(blank);

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
    const kickoffISO = new Date(form.kickoff).toISOString();
    onPublish({ ...form, kickoff: kickoffISO, confidence: Number(form.confidence), result: null, played: false });
    setForm(blank);
  }

  function saveScore(id) {
    const value = scoreEdits[id];
    if (!value) return;
    onUpdateScore(id, value);
    setScoreEdits((s) => ({ ...s, [id]: "" }));
  }

  if (!adminUser) {
    return (
      <div className="mx-5 mb-3 flex flex-col gap-2 rounded-2xl p-4" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.cardLine}` }}>
        <div className="flex items-center gap-2">
          <Lock size={16} style={{ color: COLORS.floodlight }} />
          <span className="text-sm font-bold" style={{ color: COLORS.chalk }}>Admin login</span>
        </div>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email"
          className="rounded-lg px-3 py-2.5 text-sm outline-none" style={{ backgroundColor: COLORS.pitchDark, color: COLORS.chalk, border: `1px solid ${COLORS.cardLine}` }} />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password"
          className="rounded-lg px-3 py-2.5 text-sm outline-none" style={{ backgroundColor: COLORS.pitchDark, color: COLORS.chalk, border: `1px solid ${loginError ? COLORS.loss : COLORS.cardLine}` }} />
        {loginError && <span className="text-xs" style={{ color: COLORS.loss }}>{loginError}</span>}
        <button onClick={handleLogin} disabled={loggingIn} className="rounded-lg py-2.5 text-sm font-bold" style={{ backgroundColor: COLORS.floodlight, color: COLORS.pitchDark, opacity: loggingIn ? 0.6 : 1 }}>
          {loggingIn ? "Signing in…" : "Sign in"}
        </button>
      </div>
    );
  }

  const inputStyle = { backgroundColor: COLORS.pitchDark, color: COLORS.chalk, border: `1px solid ${COLORS.cardLine}` };

  return (
    <div className="mx-5 mb-3 flex flex-col gap-3 rounded-2xl p-4" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.cardLine}` }}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold" style={{ color: COLORS.chalk }}>Publish a new tip</span>
        <button onClick={adminLogout} className="flex items-center gap-1 text-xs" style={{ color: COLORS.chalkDim }}>
          <LogOut size={12} /> Sign out
        </button>
      </div>

      <input placeholder="League (e.g. Kenyan Premier League)" value={form.league} onChange={(e) => update("league", e.target.value)} className="rounded-lg px-3 py-2.5 text-sm outline-none" style={inputStyle} />
      <div className="flex gap-2">
        <input placeholder="Home team" value={form.home} onChange={(e) => update("home", e.target.value)} className="flex-1 rounded-lg px-3 py-2.5 text-sm outline-none" style={inputStyle} />
        <input placeholder="Away team" value={form.away} onChange={(e) => update("away", e.target.value)} className="flex-1 rounded-lg px-3 py-2.5 text-sm outline-none" style={inputStyle} />
      </div>
      <input type="datetime-local" value={form.kickoff} onChange={(e) => update("kickoff", e.target.value)} className="rounded-lg px-3 py-2.5 text-sm outline-none" style={inputStyle} />

      <div className="flex gap-2">
        <select value={form.market} onChange={(e) => update("market", e.target.value)} className="flex-1 rounded-lg px-3 py-2.5 text-sm outline-none" style={inputStyle}>
          {Object.keys(MARKET_OPTIONS).map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={form.pick} onChange={(e) => update("pick", e.target.value)} className="flex-1 rounded-lg px-3 py-2.5 text-sm outline-none" style={inputStyle}>
          {MARKET_OPTIONS[form.market].map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div className="flex gap-2">
        <input placeholder="Predicted score e.g. 2 – 1" value={form.ftScore} onChange={(e) => update("ftScore", e.target.value)} className="flex-1 rounded-lg px-3 py-2.5 text-sm outline-none" style={inputStyle} />
        <input type="number" min="1" max="99" value={form.confidence} onChange={(e) => update("confidence", e.target.value)} className="w-24 rounded-lg px-3 py-2.5 text-sm outline-none" style={inputStyle} />
      </div>
      <span className="text-[11px] leading-snug" style={{ color: COLORS.chalkDim }}>Confidence ≥ {HIGH_CONFIDENCE_THRESHOLD}% marks a tip "Hot" — users must watch a rewarded ad to reveal it.</span>

      <textarea placeholder="Note / reasoning" value={form.note} onChange={(e) => update("note", e.target.value)} rows={2} className="rounded-lg px-3 py-2.5 text-sm outline-none" style={inputStyle} />

      <button onClick={submit} className="flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold" style={{ backgroundColor: COLORS.floodlight, color: COLORS.pitchDark }}>
        <Send size={14} /> Publish tip
      </button>

      {tips.length > 0 && (
        <div className="mt-2 flex flex-col gap-2">
          <span className="text-xs uppercase tracking-widest" style={{ color: COLORS.chalkDim }}>Your published tips</span>
          {tips.map((t) => (
            <div key={t.id} className="flex flex-col gap-2 rounded-lg px-3 py-2.5" style={{ backgroundColor: COLORS.pitchMid }}>
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 flex-1 truncate text-sm font-semibold" style={{ color: COLORS.chalk }}>{t.home} vs {t.away} — {t.pick}</span>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button onClick={() => onSettle(t.id, t.result === "correct" ? null : "correct")}
                    className="flex h-7 w-7 items-center justify-center rounded-full"
                    style={{ backgroundColor: t.result === "correct" ? COLORS.win : COLORS.win + "22", border: `1px solid ${COLORS.win}` }} title="Mark correct">
                    <Check size={13} style={{ color: t.result === "correct" ? COLORS.pitchDark : COLORS.win }} />
                  </button>
                  <button onClick={() => onSettle(t.id, t.result === "wrong" ? null : "wrong")}
                    className="flex h-7 w-7 items-center justify-center rounded-full"
                    style={{ backgroundColor: t.result === "wrong" ? COLORS.loss : COLORS.loss + "22", border: `1px solid ${COLORS.loss}` }} title="Mark wrong">
                    <XIcon size={13} style={{ color: t.result === "wrong" ? COLORS.pitchDark : COLORS.loss }} />
                  </button>
                  <button onClick={() => onDelete(t.id)}><Trash2 size={14} style={{ color: COLORS.chalkDim }} /></button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  placeholder={t.played ? `FT: ${t.ftScore}` : "Enter full-time score"}
                  value={scoreEdits[t.id] || ""}
                  onChange={(e) => setScoreEdits((s) => ({ ...s, [t.id]: e.target.value }))}
                  className="flex-1 rounded-md px-2.5 py-1.5 text-xs outline-none"
                  style={{ backgroundColor: COLORS.pitchDark, color: COLORS.chalk, border: `1px solid ${COLORS.cardLine}` }}
                />
                <button onClick={() => saveScore(t.id)} className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-bold" style={{ backgroundColor: COLORS.floodlight, color: COLORS.pitchDark }}>
                  <Save size={12} /> Save
                </button>
                {t.played && <span className="text-[10px] font-semibold" style={{ color: COLORS.win }}>Played</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("feed");
  const [tips, setTips] = useState([]);
  const [adminUser, setAdminUser] = useState(null);
  const [lastSeen, setLastSeen] = useState(() => Number(localStorage.getItem(LAST_SEEN_KEY) || 0));
  const [unlocked, setUnlocked] = useState(loadUnlocked);
  const [toast, setToast] = useState(null);
  const knownIds = useRef(new Set());
  const firstLoad = useRef(true);

  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600;700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  // Real AdMob banner — only renders on an actual Android build, silently
  // no-ops in a browser preview.
  useEffect(() => {
    initAdMob();
    showBannerAd();
  }, []);

  useEffect(() => watchAdminAuth(setAdminUser), []);

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

  function handleUnlock(tipId) {
    setUnlocked((prev) => {
      const next = new Set(prev);
      next.add(tipId);
      saveUnlocked(next);
      return next;
    });
  }

  return (
    <div className="mx-auto flex h-screen w-full max-w-md flex-col" style={{ backgroundColor: COLORS.pitchDark, fontFamily: "'Inter', sans-serif" }}>
      <div className="flex shrink-0 items-center justify-between px-5 pb-2 pt-6">
        <div>
          <p className="text-xs uppercase tracking-widest" style={{ color: COLORS.chalkDim }}>{tips.length} tips live</p>
          <h1 className="text-3xl font-bold leading-none" style={{ color: COLORS.chalk, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 1 }}>Kickoff Tips</h1>
        </div>
        <div className="relative">
          <Trophy size={28} style={{ color: COLORS.floodlight }} />
          {unseenCount > 0 && (
            <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold" style={{ backgroundColor: COLORS.loss, color: COLORS.chalk }}>
              {unseenCount}
            </span>
          )}
        </div>
      </div>

      {toast && (
        <div className="mx-5 mb-2 flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ backgroundColor: COLORS.floodlight }}>
          <Bell size={14} style={{ color: COLORS.pitchDark }} />
          <span className="text-sm font-bold" style={{ color: COLORS.pitchDark }}>{toast}</span>
        </div>
      )}

      {tab === "feed" ? (
        <div className="flex-1 overflow-y-auto px-5" onClick={markSeen}>
          {tips.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <span className="text-sm" style={{ color: COLORS.chalkDim }}>No tips published yet. Check back soon.</span>
            </div
          ) : (
            <div className="flex flex-col gap-3 pb-2 pt-1">
              {tips.map((t) => (
                <TipCard key={t.id} tip={t} isNew={t.createdAt > lastSeen} unlocked={unlocked.has(t.id)} onUnlock={handleUnlock} />
              ))}
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
            onUpdateScore={updateFinalScore}
          />
        </div>
      )}

      <div className="flex shrink-0 justify-around border-t px-5 py-3" style={{ borderColor: COLORS.cardLine, backgroundColor: COLORS.pitchDark }}>
        <button onClick={() => setTab("feed")} className="flex flex-col items-center gap-1">
          <Home size={22} style={{ color: tab === "feed" ? COLORS.floodlight : COLORS.chalkDim }} />
          <span className="text-[11px] font-semibold" style={{ color: tab === "feed" ? COLORS.floodlight : COLORS.chalkDim }}>Tips</span>
        </button>
        <button onClick={() => setTab("record")} className="flex flex-col items-center gap-1">
          <BarChart3 size={22} style={{ color: tab === "record" ? COLORS.floodlight : COLORS.chalkDim }} />
          <span className="text-[11px] font-semibold" style={{ color: tab === "record" ? COLORS.floodlight : COLORS.chalkDim }}>Track Record</span>
        </button>
        <button onClick={() => setTab("admin")} className="flex flex-col items-center gap-1">
          <Plus size={22} style={{ color: tab === "admin" ? COLORS.floodlight : COLORS.chalkDim }} />
          <span className="text-[11px] font-semibold" style={{ color: tab === "admin" ? COLORS.floodlight : COLORS.chalkDim }}>Publish</span>
        </button>
      </div>

      <p className="shrink-0 px-5 pb-4 text-center text-[10px] leading-snug" style={{ color: COLORS.chalkDim, backgroundColor: COLORS.pitchDark }}>
        For informational and entertainment purposes only. Does not facilitate betting or gambling.
      </p>
    </div>
  );
      }
