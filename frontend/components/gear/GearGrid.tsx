"use client";

import { useEffect, useRef, useState } from "react";

const C = {
  P: "var(--c-p,#8B5CF6)",
  PL: "var(--c-pl,#E2D9F3)",
  BG: "var(--c-bg,#09060E)",
  FG: "var(--c-fg,#FFFFFF)",
  MID: "var(--c-mid,#A892C6)",
  DARK: "var(--c-dark,#140D21)",
  BORDER: "var(--c-border,#2D1F45)",
};

type GearItem = { name: string; desc: string; img: string; alt: string; features: string[]; isCustomImg?: boolean };
type GearCategory = { label: string; items: GearItem[] };
type FlatItem = GearItem & { category: string };

function GearFeatureRow({ item, index }: { item: FlatItem; index: number }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("in-view");
          observer.disconnect();
        }
      },
      { threshold: 0.18, rootMargin: "0px 0px -60px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`gear-feature${index % 2 === 1 ? " reverse" : ""}`}>
      <div className={`gear-feature-img${item.isCustomImg ? " custom" : ""}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.img} alt={item.alt} loading="lazy" />
      </div>
      <div className="gear-feature-text">
        <div className="gear-feature-num">{String(index + 1).padStart(2, "0")}</div>
        <div className="gear-feature-tag">
          <span className="gear-feature-tag-dot" />
          {item.category}
        </div>
        <h3 className="gear-feature-name">{item.name}</h3>
        <p className="gear-feature-desc">{item.desc}</p>
        {item.features.length > 0 && (
          <ul className="gear-feature-list">
            {item.features.map((f) => (
              <li key={f}>
                <span className="gear-feature-dot" />
                {f}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

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

        .gear-feature { display:flex; min-height: clamp(420px, 44vw, 560px); border-bottom:1px solid ${C.BORDER}; opacity:0; transform: translateY(40px); transition: opacity 0.9s cubic-bezier(0.16,0.84,0.44,1), transform 0.9s cubic-bezier(0.16,0.84,0.44,1); }
        .gear-feature.in-view { opacity:1; transform: translateY(0); }
        .gear-feature:last-child { border-bottom:none; }
        .gear-feature.reverse { flex-direction: row-reverse; }

        .gear-feature-img { flex:1 1 50%; position:relative; overflow:hidden; display:flex; align-items:center; justify-content:center; background: radial-gradient(circle at 50% 40%, rgba(139,92,246,0.16), transparent 65%), ${C.DARK}; }
        .gear-feature-img img { width:86%; height:86%; object-fit:contain; filter: drop-shadow(0 30px 54px rgba(0,0,0,0.5)); transform: scale(0.9); transition: transform 1.1s cubic-bezier(0.16,0.84,0.44,1); }
        .gear-feature.in-view .gear-feature-img img { transform: scale(1); }
        .gear-feature-img.custom { background:${C.DARK}; }
        .gear-feature-img.custom img { width:100%; height:100%; object-fit:cover; filter:none; }

        .gear-feature-text { flex:1 1 50%; display:flex; flex-direction:column; justify-content:center; padding: 56px 64px; background: ${C.BG}; }
        .gear-feature-num { font-size:60px; font-weight:800; color:rgba(255,255,255,0.06); line-height:1; margin-bottom:-24px; }
        .gear-feature-tag { font-size:11px; letter-spacing:3px; color:${C.PL}; text-transform:uppercase; margin-bottom:14px; display:flex; align-items:center; gap:10px; }
        .gear-feature-tag-dot { width:20px; height:1px; background:${C.PL}; display:inline-block; }
        .gear-feature-name { font-size: clamp(24px,3vw,34px); font-weight:700; margin:0 0 14px; color:${C.FG}; letter-spacing:-0.3px; }
        .gear-feature-desc { font-size:14.5px; line-height:1.9; color:rgba(255,255,255,0.55); max-width:420px; margin:0 0 20px; }
        .gear-feature-list { list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:10px; max-width:420px; }
        .gear-feature-list li { display:flex; align-items:flex-start; gap:10px; font-size:13px; line-height:1.55; color:rgba(255,255,255,0.72); }
        .gear-feature-dot { width:5px; height:5px; border-radius:50%; background:${C.P}; display:inline-block; margin-top:6px; flex-shrink:0; }

        @media (max-width: 860px) {
          .gear-feature, .gear-feature.reverse { flex-direction:column; min-height:auto; }
          .gear-feature-img { flex: 0 0 auto; width:100%; height:320px; }
          .gear-feature-img img { width:72%; height:72%; }
          .gear-feature-img.custom img { width:100%; height:100%; }
          .gear-feature-text { flex: 0 0 auto; width:100%; padding:40px 24px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .gear-feature, .gear-feature-img img { transition:none !important; opacity:1 !important; transform:none !important; }
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
          <GearFeatureRow key={item.name} item={item} index={i} />
        ))}
      </div>
    </div>
  );
}
