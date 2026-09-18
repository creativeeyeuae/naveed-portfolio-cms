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

type GearItem = { name: string; desc: string; img: string; alt: string; features: string[] };
type GearCategory = { label: string; items: GearItem[] };
type FlatItem = GearItem & { category: string };

function GearHeroSection({ item, index, total }: { item: FlatItem; index: number; total: number }) {
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
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="gear-hero">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.img} alt={item.alt} loading="lazy" className="gear-hero-img" />
      <div className="gear-hero-overlay-1" />
      <div className="gear-hero-overlay-2" />
      <div className="gear-hero-index">
        0{index + 1} / 0{total}
      </div>
      <div className="gear-hero-content">
        <div className="gear-hero-eyebrow">
          <span className="gear-hero-eyebrow-line" />
          {item.category}
        </div>
        <h3 className="gear-hero-title">{item.name}</h3>
        <p className="gear-hero-sub">{item.desc}</p>
        {item.features.length > 0 && (
          <div className="gear-hero-chips">
            {item.features.map((f) => (
              <span key={f} className="gear-hero-chip">
                {f}
              </span>
            ))}
          </div>
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
        .gear-pill-row { max-width:1100px; margin:0 auto; padding:0 24px 44px; display:flex; gap:10px; flex-wrap:wrap; }

        .gear-hero { position:relative; width:100%; height:clamp(320px,42vw,640px); overflow:hidden; border-bottom:1px solid ${C.BORDER}; opacity:0; transform:translateY(30px); transition: opacity 0.9s cubic-bezier(0.16,0.84,0.44,1), transform 0.9s cubic-bezier(0.16,0.84,0.44,1); }
        .gear-hero.in-view { opacity:1; transform:translateY(0); }
        .gear-hero:last-child { border-bottom:none; }

        .gear-hero-img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; transform:scale(1.06); transition: transform 6s cubic-bezier(0.16,0.84,0.44,1); }
        .gear-hero.in-view .gear-hero-img { transform:scale(1); }

        .gear-hero-overlay-1 { position:absolute; inset:0; background:linear-gradient(105deg,rgba(9,6,14,0.88) 0%,rgba(9,6,14,0.45) 55%,rgba(9,6,14,0.15) 100%); }
        .gear-hero-overlay-2 { position:absolute; inset:0; background:linear-gradient(to top,rgba(9,6,14,0.85) 0%,transparent 45%); }
        .gear-hero-index { position:absolute; top:24px; right:28px; color:rgba(255,255,255,0.4); font-size:11px; letter-spacing:4px; z-index:3; }


        .gear-hero-content { position:absolute; inset:0; display:flex; flex-direction:column; justify-content:center; padding:0 6vw; z-index:3; max-width:640px; }
        .gear-hero-eyebrow { display:flex; align-items:center; gap:12px; font-size:11px; letter-spacing:6px; color:${C.PL}; text-transform:uppercase; margin-bottom:14px; }
        .gear-hero-eyebrow-line { width:28px; height:1px; background:${C.PL}; display:inline-block; }
        .gear-hero-title { font-size:clamp(26px,4vw,44px); font-weight:700; color:${C.FG}; margin:0 0 12px; line-height:1.1; }
        .gear-hero-sub { font-size:14px; line-height:1.7; color:rgba(255,255,255,0.68); max-width:460px; margin:0 0 20px; }
        .gear-hero-chips { display:flex; gap:8px; flex-wrap:wrap; max-width:560px; }
        .gear-hero-chip { font-size:11.5px; color:rgba(255,255,255,0.85); background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.16); border-radius:20px; padding:6px 14px; backdrop-filter: blur(4px); }

        @media (max-width:700px) {
          .gear-hero { height:clamp(300px,90vw,420px); }
          .gear-hero-content { padding:0 24px; max-width:100%; }
        }

        @media (prefers-reduced-motion: reduce) {
          .gear-hero, .gear-hero-img { transition:none !important; opacity:1 !important; transform:none !important; }
        }
      `}</style>

      <div className="gear-pill-row">
        {["All", ...categories.map((c) => c.label)].map((label) => {
          const active = filter === label;
          return (
            <button
              key={label}
              onClick={() => setFilter(label)}
              className="gear-pill"
              style={{
                padding: "8px 16px",
                fontSize: 12,
                borderRadius: 999,
                border: `1px solid ${active ? C.P : C.BORDER}`,
                background: active ? C.P : "transparent",
                color: active ? "#fff" : C.MID,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {shown.map((item, i) => (
        <GearHeroSection key={item.name} item={item} index={i} total={shown.length} />
      ))}
    </div>
  );
}
