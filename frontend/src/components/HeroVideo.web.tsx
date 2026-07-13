import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "expo-router";

import { COLORS, LOGO_URL, SITE_VIDEO, SITE_BG } from "@/src/theme";

/**
 * Full-screen, scroll-scrubbed video hero (web).
 * The scroll position drives the video timeline. Synced text states fade in/out
 * with the progression. On mobile / reduced-motion it falls back to a muted,
 * looping autoplay so it always feels intentional and smooth.
 */
export default function HeroVideo() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [p, setP] = useState(0);
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const mqNarrow = window.matchMedia("(max-width: 820px)");
    const onResize = () => setNarrow(mqNarrow.matches);
    onResize();
    mqNarrow.addEventListener?.("change", onResize);

    const video = videoRef.current;
    const stage = stageRef.current;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isTouch = window.matchMedia("(pointer: coarse)").matches || mqNarrow.matches;
    const scrub = !reduced && !isTouch;

    if (video && !scrub) {
      // Safe fallback: gentle autoplay loop
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      const play = () => video.play().catch(() => {});
      if (video.readyState >= 2) play();
      else video.addEventListener("loadeddata", play, { once: true });
    }

    let raf = 0;
    const pRef = { v: 0 };
    const tick = () => {
      if (stage) {
        const rect = stage.getBoundingClientRect();
        const total = stage.offsetHeight - window.innerHeight;
        const scrolled = Math.min(Math.max(-rect.top, 0), Math.max(total, 1));
        const prog = total > 0 ? scrolled / total : 0;
        if (scrub && video && video.duration && !Number.isNaN(video.duration)) {
          const target = prog * (video.duration - 0.05);
          const cur = video.currentTime;
          const diff = target - cur;
          if (Math.abs(diff) > 0.008) video.currentTime = cur + diff * 0.18;
        }
        if (Math.abs(prog - pRef.v) > 0.003) {
          pRef.v = prog;
          setP(prog);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      mqNarrow.removeEventListener?.("change", onResize);
    };
  }, []);

  // opacity for a state active within [start, end]
  const band = (start: number, end: number) => {
    if (p < start || p > end) return 0;
    const f = 0.09;
    return Math.max(0, Math.min(1, Math.min((p - start) / f, (end - p) / f)));
  };
  const o0 = band(-0.01, 0.42);
  const o1 = band(0.34, 0.72);
  const o2 = band(0.64, 1.02);

  const pad = narrow ? 24 : 72;

  const navBtn = (bg: string, color: string, border?: string): CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "10px 18px",
    borderRadius: 999,
    background: bg,
    color,
    border: border ? `1.5px solid ${border}` : "none",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    textDecoration: "none",
  });

  const stateWrap: React.CSSProperties = {
    position: "absolute",
    left: pad,
    right: pad,
    top: "50%",
    transform: "translateY(-50%)",
    maxWidth: 860,
  };

  const badge: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: "rgba(255,255,255,0.15)",
    padding: "7px 14px",
    borderRadius: 999,
    color: "#fff",
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 18,
    backdropFilter: "blur(4px)",
  };
  const title: React.CSSProperties = {
    color: "#fff",
    fontWeight: 900,
    fontSize: narrow ? 34 : 58,
    lineHeight: 1.02,
    margin: 0,
    marginBottom: 16,
    textShadow: "0 2px 24px rgba(0,0,0,0.45)",
  };
  const sub: React.CSSProperties = {
    color: "rgba(255,255,255,0.9)",
    fontSize: narrow ? 15 : 18,
    lineHeight: 1.5,
    maxWidth: 560,
    marginBottom: 26,
    textShadow: "0 1px 12px rgba(0,0,0,0.4)",
  };

  return (
    <div ref={stageRef} style={{ position: "relative", height: "260vh", background: COLORS.navy }}>
      <div style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden" }}>
        {/* Video */}
        <video
          ref={videoRef}
          src={SITE_VIDEO}
          poster={SITE_BG}
          muted
          playsInline
          preload="auto"
          // @ts-ignore - webkit attr for iOS inline playback
          webkit-playsinline="true"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
        {/* Overlays */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(10,16,26,0.55) 0%, rgba(10,16,26,0.15) 32%, rgba(10,16,26,0.35) 62%, rgba(10,16,26,0.85) 100%)",
          }}
        />

        {/* Top bar (overlaid on the video) */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: `0 ${pad}px`,
            zIndex: 5,
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <img src={LOGO_URL} alt="La Provvidenza ODV" style={{ width: 42, height: 42, objectFit: "contain" }} />
            <div>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: 16 }}>La Provvidenza ODV</div>
              <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 11 }}>Pubblica Assistenza · Marsala</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {!narrow && (
              <>
                <span onClick={() => router.push("/(tabs)/volontari")} style={{ color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
                  Volontari
                </span>
                <span onClick={() => router.push("/(tabs)/servizio-civile")} style={{ color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
                  Servizio Civile
                </span>
              </>
            )}
            <span onClick={() => router.push("/(tabs)/prenota")} style={navBtn("transparent", "#fff", "rgba(255,255,255,0.8)")}>
              Prenota
            </span>
            <span onClick={() => router.push("/(tabs)/account")} style={navBtn(COLORS.brand, "#fff")}>
              Accedi
            </span>
          </div>
        </div>

        {/* State 0 */}
        <div style={{ ...stateWrap, opacity: o0, pointerEvents: o0 > 0.5 ? "auto" : "none" }}>
          <div style={badge}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: COLORS.brand, display: "inline-block" }} />
            Emergenza sanitaria · 24 ore su 24
          </div>
          <h1 style={title}>
            Al servizio della
            <br />
            <span style={{ color: COLORS.brand }}>nostra comunità</span>
          </h1>
          <p style={sub}>Soccorso, trasporto sanitario e trasporto disabili a Marsala. Volontari sempre pronti, con professionalità e cuore.</p>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <span onClick={() => router.push("/(tabs)/prenota")} style={{ ...navBtn(COLORS.brand, "#fff"), padding: "14px 26px", fontSize: 15 }}>
              Prenota un servizio
            </span>
            <span
              onClick={() => window.scrollTo({ top: window.innerHeight * 1.6, behavior: "smooth" })}
              style={{ ...navBtn("rgba(255,255,255,0.12)", "#fff", "rgba(255,255,255,0.6)"), padding: "14px 22px", fontSize: 15 }}
            >
              Scopri di più
            </span>
          </div>
        </div>

        {/* State 1 */}
        <div style={{ ...stateWrap, opacity: o1, pointerEvents: "none" }}>
          <div style={badge}>La nostra flotta</div>
          <h1 style={title}>
            Sempre in movimento,
            <br />
            <span style={{ color: COLORS.brand }}>ogni giorno per te</span>
          </h1>
          <p style={sub}>Mezzi attrezzati e personale formato per il soccorso, il trasporto sanitario e il trasporto di persone in carrozzina.</p>
        </div>

        {/* State 2 - app promo */}
        <div style={{ ...stateWrap, opacity: o2, pointerEvents: o2 > 0.5 ? "auto" : "none" }}>
          <div style={badge}>Presto su iOS e Android</div>
          <h1 style={title}>
            È arrivata la <span style={{ color: COLORS.brand }}>nostra App</span>
          </h1>
          <p style={sub}>Prenota ambulanze e trasporto disabili dal telefono, consulta i turni e resta aggiornato sulle attività dell&apos;associazione.</p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", padding: "10px 16px", borderRadius: 12, color: "#fff" }}>
              <span style={{ fontSize: 20 }}></span>
              <div>
                <div style={{ fontSize: 10, opacity: 0.75 }}>Presto disponibile su</div>
                <div style={{ fontSize: 15, fontWeight: 800 }}>App Store</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", padding: "10px 16px", borderRadius: 12, color: "#fff" }}>
              <span style={{ fontSize: 18 }}>▶</span>
              <div>
                <div style={{ fontSize: 10, opacity: 0.75 }}>Presto disponibile su</div>
                <div style={{ fontSize: 15, fontWeight: 800 }}>Google Play</div>
              </div>
            </div>
          </div>
          <span onClick={() => router.push("/(tabs)")} style={{ ...navBtn("#fff", COLORS.brand), padding: "12px 20px", fontSize: 14 }}>
            Usa subito l&apos;app web
          </span>
        </div>

        {/* Scroll hint */}
        <div
          style={{
            position: "absolute",
            bottom: 22,
            left: 0,
            right: 0,
            textAlign: "center",
            color: "rgba(255,255,255,0.85)",
            fontSize: 12,
            opacity: Math.max(0, 1 - p * 6),
            transition: "opacity 0.2s",
          }}
        >
          <div style={{ fontSize: 22, lineHeight: 1 }}>⌄</div>
          Scorri per scoprire
        </div>
      </div>
    </div>
  );
}
