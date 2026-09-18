import type { Metadata } from "next";
import { getPublicSiteInfo } from "@/lib/cmsData";
import { buildMetadata } from "@/lib/seo";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

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

// Naveed's real, current photography/videography/editing gear -- exactly as supplied.
// No specs or model numbers are invented; the two softboxes intentionally use
// representative studio-softbox photography rather than a made-up model number.
const GEAR: GearCategory[] = [
  {
    label: "Camera",
    items: [
      { name: "Sony α7R V", desc: "Professional Full-Frame Camera", img: "/gear/sony-a7r-v.jpg", alt: "Sony Alpha a7R V full-frame mirrorless camera" },
    ],
  },
  {
    label: "Lenses",
    items: [
      { name: "Sony FE 24–70mm F2.8 GM II", desc: "Professional Standard Zoom Lens", img: "/gear/sony-fe-24-70mm-gm2.jpg", alt: "Sony FE 24-70mm F2.8 GM II standard zoom lens" },
      { name: "Sony FE 70–200mm F2.8 GM II", desc: "Professional Telephoto Zoom Lens", img: "/gear/sony-fe-70-200mm-gm2.jpg", alt: "Sony FE 70-200mm F2.8 GM II telephoto zoom lens" },
    ],
  },
  {
    label: "Lighting",
    items: [
      { name: "Godox V1", desc: "On-Camera Round Head Flash", img: "/gear/godox-v1.jpg", alt: "Godox V1 round head on-camera flash" },
      { name: "4× Godox Receivers", desc: "Wireless Flash Receivers", img: "/gear/godox-receiver.jpg", alt: "Godox wireless flash trigger receiver" },
      { name: "Amaran 300c", desc: "RGB LED Continuous Light", img: "/gear/amaran-300c.png", alt: "Amaran 300c RGB LED continuous light" },
      { name: "2× GVM RGB LED Panels", desc: "RGB LED Video Light Panels", img: "/gear/gvm-rgb-panel.png", alt: "GVM RGB LED video light panel" },
      { name: "105 cm Softbox", desc: "Studio Light Modifier", img: "/gear/softbox-105cm.jpg", alt: "Professional 105cm studio softbox light modifier" },
      { name: "80 cm Softbox / Light Box", desc: "Studio Light Modifier", img: "/gear/softbox-80cm.jpg", alt: "Professional 80cm studio softbox light box modifier" },
    ],
  },
  {
    label: "Stabilization",
    items: [
      { name: "DJI RS 3", desc: "Camera Gimbal Stabilizer", img: "/gear/dji-rs3.png", alt: "DJI RS 3 camera gimbal stabilizer" },
      { name: "DJI Osmo Mobile", desc: "Smartphone Gimbal Stabilizer", img: "/gear/dji-osmo-mobile.png", alt: "DJI Osmo Mobile smartphone gimbal stabilizer" },
    ],
  },
  {
    label: "Action & 360 Cameras",
    items: [
      { name: "DJI Osmo Action 4", desc: "Waterproof Action Camera", img: "/gear/dji-osmo-action-4.jpg", alt: "DJI Osmo Action 4 waterproof action camera" },
      { name: "Insta360 X4", desc: "360° Action Camera", img: "/gear/insta360-x4.jpg", alt: "Insta360 X4 360-degree action camera" },
    ],
  },
  {
    label: "Computer / Editing",
    items: [
      { name: "Alienware m15 R5", desc: "Mobile Editing Workstation", img: "/gear/alienware-m15-r5.jpg", alt: "Alienware m15 R5 laptop used as a mobile editing workstation" },
    ],
  },
];

export async function generateMetadata(): Promise<Metadata> {
  const site = await getPublicSiteInfo();
  return buildMetadata({
    path: "/gear/",
    title: "Photography & Videography Gear | Naveed Anjum",
    description:
      "Explore the professional photography, videography, lighting, stabilization, and editing gear used by Naveed Anjum in the UAE.",
    ogType: "website",
  });
}

export default async function GearPage() {
  const site = await getPublicSiteInfo();
  return (
    <main style={{ background: C.BG, color: C.FG, minHeight: "100vh" }}>
      <style>{`
        .gear-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; }
        @media (max-width: 900px) { .gear-grid { grid-template-columns:repeat(2,1fr); } }
        @media (max-width: 560px) { .gear-grid { grid-template-columns:1fr; } }
      `}</style>
      <SiteHeader site={site} />

      {/* HERO -- same visual language as the shared PageBanner (app/page.tsx / about page) */}
      <div style={{ background: C.DARK, padding: "120px 40px 36px", minHeight: "clamp(252px,39.6vh,432px)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ fontSize: 11, letterSpacing: 6, color: C.PL, textTransform: "uppercase", marginBottom: 14, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ display: "inline-block", width: 24, height: 1, background: C.PL }} />
          Equipment
        </div>
        <h1 style={{ fontSize: "clamp(32px,5.2vw,64px)", fontWeight: 700, margin: "0 0 18px", maxWidth: 800 }}>Photography &amp; Videography Gear</h1>
        <p style={{ fontSize: 15, lineHeight: 1.8, color: "rgba(255,255,255,0.62)", maxWidth: 640, margin: 0 }}>
          The equipment behind every shoot -- cameras, lenses, lighting, stabilization and post-production tools used for photography, videography and editing on location and in the studio.
        </p>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "64px 24px 40px" }}>
        {GEAR.map((cat) => (
          <div key={cat.label} style={{ marginBottom: 56 }}>
            <h2 style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: 3, color: C.PL, textTransform: "uppercase", margin: "0 0 20px", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.P, display: "inline-block", flexShrink: 0 }} />
              {cat.label}
            </h2>
            <div className="gear-grid">
              {cat.items.map((item) => (
                <div
                  key={item.name}
                  style={{
                    background: "rgba(255,255,255,0.035)",
                    border: `1px solid ${C.BORDER}`,
                    borderRadius: 10,
                    padding: 18,
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                  }}
                >
                  <div
                    style={{
                      width: 76,
                      height: 76,
                      flexShrink: 0,
                      borderRadius: 8,
                      background: "rgba(255,255,255,0.07)",
                      border: `1px solid ${C.BORDER}`,
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
                      style={{ width: "100%", height: "100%", objectFit: "contain", padding: 8 }}
                    />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.FG, marginBottom: 4, lineHeight: 1.3 }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", letterSpacing: 0.3 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* CTA -- same pattern as /about */}
        <div style={{ textAlign: "center", padding: "64px 0 24px", marginTop: 16, borderTop: `1px solid ${C.BORDER}` }}>
          <div style={{ fontSize: 11, letterSpacing: 6, color: C.PL, textTransform: "uppercase", marginBottom: 14 }}>Let&apos;s Talk</div>
          <h3 style={{ fontSize: "clamp(22px,3vw,32px)", fontWeight: 700, margin: "0 0 24px" }}>Have a Project In Mind?</h3>
          <a href="/contact" style={{ background: C.P, color: C.BG, padding: "13px 36px", fontSize: 13, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", textDecoration: "none", borderRadius: 2 }}>Get In Touch</a>
        </div>
      </div>

      <SiteFooter site={site} />
    </main>
  );
}
