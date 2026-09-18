"use client";

import { useState } from "react";

const C = {
  P: "var(--c-p,#8B5CF6)",
  PL: "var(--c-pl,#E2D9F3)",
  BG: "var(--c-bg,#09060E)",
  FG: "var(--c-fg,#FFFFFF)",
  MID: "var(--c-mid,#A892C6)",
  DARK: "var(--c-dark,#140D21)",
  BORDER: "var(--c-border,#2D1F45)",
};

type GearItem = { name: string; desc: string; img: string; alt: string };
type GearCategory = { label: string; items: GearItem[] };
type FlatItem = GearItem & { category: string };

export default function GearGrid({ categories }: { categories: GearCategory[] }) {
  const flat: FlatItem[] = categories.flatMap((cat) =>
    cat.items.map((item) => ({ ...item, category: cat.label }))
  );
  const [filter, setFilter] = useState<string>("All");
  const shown = filter === "All" ? flat : flat.filter((i) => i.category === filter);

  return (
    <div>
      <style>{`
        .gear-pill { transition: background 0.2s, border-color 0.2s, color 0.2s; cursor:pointer; white-space:nowrap; }
        .gear-feature { display:flex; align-items:center; gap:64px; padding:72px 0; border-bottom:1px solid ${C.BORDER}; }
        .gear-feature:last-child { border-bottom:none; }
        .gear-feature.reverse { flex-direction:row-reverse; }
        .gear-feature-img { flex:1 1 46%; display:flex; align-items:center; justify-content:center; }
        .gear-feature-img img { transition: transform 0.5s ease; }
        .gear-feature:hover .gear-feature-img img { transform: scale(1.04); }
        .gear-feature-text { flex:1 1 54%; }
        @media (max-width: 860px) {
          .gear-feature, .gear-feature.reverse { flex-direction:column; gap:28px; padding:48px 0; }
        }
      `}</style>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 64 }}>
        {["All", ...categories.map((c) => c.label)].map((label) => {
          const count =
            label === "All"
              ? flat.length
              : categories.find((c) => c.label === label)?.items.length ?? 0;
          const active = filter === label;
          return (
            <span
              key={label}
              className="gear-pill"
              onClick={() => setFilter(label)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "9px 18px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 1,
                textTransform: "uppercase",
                border: `1px solid ${active ? C.P : C.BORDER}`,
                background: active ? C.PL : "transparent",
                color: active ? C.BG : C.MID,
              }}
            >
              {label} <span style={{ opacity: 0.7 }}>({count})</span>
            </span>
          );
        })}
      </div>

      <div>
        {shown.map((item, i) => (
          <div key={item.name} className={`gear-feature${i % 2 === 1 ? " reverse" : ""}`}>
            <div className="gear-feature-img">
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  maxWidth: 400,
                  aspectRatio: "1 / 1",
                  borderRadius: 24,
                  background:
                    "radial-gradient(circle at 50% 38%, rgba(139,92,246,0.14), transparent 70%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.img}
                  alt={item.alt}
                  loading="lazy"
                  style={{
                    width: "70%",
                    height: "70%",
                    objectFit: "contain",
                    filter: "drop-shadow(0 28px 44px rgba(0,0,0,0.45))",
                  }}
                />
              </div>
            </div>
            <div className="gear-feature-text">
              <div
                style={{
                  fontSize: 64,
                  fontWeight: 800,
                  color: "rgba(255,255,255,0.06)",
                  lineHeight: 1,
                  marginBottom: -30,
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </div>
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: 3,
                  color: C.PL,
                  textTransform: "uppercase",
                  marginBottom: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span style={{ width: 20, height: 1, background: C.PL, display: "inline-block" }} />
                {item.category}
              </div>
              <h3
                style={{
                  fontSize: "clamp(24px,3vw,34px)",
                  fontWeight: 700,
                  margin: "0 0 14px",
                  color: C.FG,
                  letterSpacing: -0.3,
                }}
              >
                {item.name}
              </h3>
              <p
                style={{
                  fontSize: 14.5,
                  lineHeight: 1.9,
                  color: "rgba(255,255,255,0.55)",
                  maxWidth: 420,
                  margin: 0,
                }}
              >
                {item.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
