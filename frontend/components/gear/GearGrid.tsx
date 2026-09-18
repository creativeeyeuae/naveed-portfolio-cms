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
        .gear-grid-v2 { display:grid; grid-template-columns:repeat(4,1fr); gap:22px; }
        @media (max-width: 1080px) { .gear-grid-v2 { grid-template-columns:repeat(3,1fr); } }
        @media (max-width: 780px) { .gear-grid-v2 { grid-template-columns:repeat(2,1fr); } }
        @media (max-width: 480px) { .gear-grid-v2 { grid-template-columns:1fr; } }
        .gear-pill { transition: background 0.2s, border-color 0.2s, color 0.2s; cursor:pointer; white-space:nowrap; }
        .gear-card { transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease; }
        .gear-card-img img { transition: transform 0.35s ease; }
      `}</style>

      {/* Filter pills */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 40 }}>
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

      <div className="gear-grid-v2">
        {shown.map((item) => (
          <div
            key={item.name}
            className="gear-card"
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-6px)";
              e.currentTarget.style.borderColor = C.P;
              e.currentTarget.style.boxShadow =
                "0 20px 48px -12px rgba(139,92,246,0.45)";
              const img = e.currentTarget.querySelector("img") as HTMLElement;
              if (img) img.style.transform = "scale(1.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.borderColor = C.BORDER;
              e.currentTarget.style.boxShadow = "none";
              const img = e.currentTarget.querySelector("img") as HTMLElement;
              if (img) img.style.transform = "scale(1)";
            }}
            style={{
              background: "rgba(255,255,255,0.035)",
              border: `1px solid ${C.BORDER}`,
              borderRadius: 16,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              className="gear-card-img"
              style={{
                position: "relative",
                aspectRatio: "1 / 1",
                background: `radial-gradient(circle at 50% 40%, rgba(139,92,246,0.16), transparent 70%), ${C.DARK}`,
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
                style={{ width: "78%", height: "78%", objectFit: "contain" }}
              />
            </div>
            <div
              style={{
                padding: "18px 20px 22px",
                display: "flex",
                flexDirection: "column",
                gap: 6,
                flex: 1,
              }}
            >
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: 2,
                  color: C.PL,
                  textTransform: "uppercase",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: C.P,
                    display: "inline-block",
                    flexShrink: 0,
                  }}
                />
                {item.category}
              </div>
              <div style={{ fontSize: 15.5, fontWeight: 700, color: C.FG, lineHeight: 1.3 }}>
                {item.name}
              </div>
              <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.55)", letterSpacing: 0.2 }}>
                {item.desc}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
