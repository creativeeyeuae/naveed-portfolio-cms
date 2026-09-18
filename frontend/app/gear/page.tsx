import type { Metadata } from "next";
import { getPublicSiteInfo } from "@/lib/cmsData";
import { buildMetadata } from "@/lib/seo";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import GearGrid from "@/components/gear/GearGrid";

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

// Naveed's real, current photography/videography/editing gear -- exactly as supplied.
// No specs or model numbers are invented; the two softboxes intentionally use
// representative studio-softbox photography rather than a made-up model number.
const GEAR: GearCategory[] = [
  {
    label: "Camera",
    items: [
      {
        name: "Sony α7R V",
        desc: "Professional Full-Frame Camera",
        img: "/gear/sony-a7r-v.jpg",
        alt: "Sony Alpha a7R V full-frame mirrorless camera",
        features: [
          "61MP full-frame BSI sensor",
          "8-stop, 5-axis image stabilization",
          "AI-based subject-recognition autofocus",
          "Oversampled 4K video, up to 60p",
        ],
      },
    ],
  },
  {
    label: "Lenses",
    items: [
      {
        name: "Sony FE 24–70mm F2.8 GM II",
        desc: "Professional Standard Zoom Lens",
        img: "/gear/sony-fe-24-70mm-gm2.jpg",
        alt: "Sony FE 24-70mm F2.8 GM II standard zoom lens",
        features: [
          "Constant f/2.8 aperture across the zoom range",
          "About 190g lighter than the original GM",
          "11-blade aperture for smooth background blur",
          "Dual XD linear motors for fast, silent AF",
        ],
      },
      {
        name: "Sony FE 70–200mm F2.8 GM II",
        desc: "Professional Telephoto Zoom Lens",
        img: "/gear/sony-fe-70-200mm-gm2.jpg",
        alt: "Sony FE 70-200mm F2.8 GM II telephoto zoom lens",
        features: [
          "Constant f/2.8 aperture at every focal length",
          "Nearly 30% lighter than the original GM",
          "Closer minimum focus distance for tighter shots",
          "Four XD linear motors for fast, quiet AF",
        ],
      },
    ],
  },
  {
    label: "Lighting",
    items: [
      {
        name: "Godox V1",
        desc: "On-Camera Round Head Flash",
        img: "/gear/godox-v1.jpg",
        alt: "Godox V1 round head on-camera flash",
        features: [
          "Round flash head for natural, soft catchlights",
          "Built-in 2.4GHz wireless triggering system",
          "Li-ion battery, rated for ~480 full-power flashes",
          "Fast recycle time, ready shot after shot",
        ],
      },
      {
        name: "4× Godox Receivers",
        desc: "Wireless Flash Receivers",
        img: "/gear/godox-receiver.jpg",
        alt: "Godox wireless flash trigger receiver",
        features: [
          "2.4GHz wireless triggering across multiple lights",
          "16-channel support for interference-free shoots",
          "Reliable range for on-location setups",
        ],
      },
      {
        name: "Amaran 300c",
        desc: "RGB LED Continuous Light",
        img: "/gear/amaran-300c.png",
        alt: "Amaran 300c RGB LED continuous light",
        features: [
          "300W full-color RGBWW output",
          "Wide CCT range plus full RGB control",
          "Bowens mount for interchangeable modifiers",
          "App-based control for on-set adjustments",
        ],
      },
      {
        name: "2× GVM RGB LED Panels",
        desc: "RGB LED Video Light Panels",
        img: "/gear/gvm-rgb-panel.png",
        alt: "GVM RGB LED video light panel",
        features: [
          "Full-color RGB output for creative lighting",
          "Battery-powered for flexible, on-location use",
          "App-controlled brightness and color presets",
        ],
      },
      {
        name: "105 cm Softbox",
        desc: "Studio Light Modifier",
        img: "/gear/softbox-105cm.jpg",
        alt: "Professional 105cm studio softbox light modifier",
        features: [
          "Large diffusion surface for soft, even light",
          "Fits standard studio light mounts",
          "Foldable frame for quick setup and storage",
        ],
      },
      {
        name: "80 cm Softbox / Light Box",
        desc: "Studio Light Modifier",
        img: "/gear/softbox-80cm.jpg",
        alt: "Professional 80cm studio softbox light box modifier",
        features: [
          "Compact size, ideal for portraits and product shots",
          "Double diffusion for gentle, controlled light falloff",
          "Lightweight and easy to transport on location",
        ],
      },
    ],
  },
  {
    label: "Stabilization",
    items: [
      {
        name: "DJI RS 3",
        desc: "Camera Gimbal Stabilizer",
        img: "/gear/dji-rs3.png",
        alt: "DJI RS 3 camera gimbal stabilizer",
        features: [
          "3kg payload for mirrorless and DSLR cameras",
          "Automated axis locks for fast setup and storage",
          "RavenEye-compatible image transmission",
          "All-day battery life on a single charge",
        ],
      },
      {
        name: "DJI Osmo Mobile",
        desc: "Smartphone Gimbal Stabilizer",
        img: "/gear/dji-osmo-mobile.png",
        alt: "DJI Osmo Mobile smartphone gimbal stabilizer",
        features: [
          "3-axis stabilization for smooth handheld footage",
          "Foldable, pocketable design for travel",
          "Automatic subject tracking",
        ],
      },
    ],
  },
  {
    label: "Action & 360 Cameras",
    items: [
      {
        name: "DJI Osmo Action 4",
        desc: "Waterproof Action Camera",
        img: "/gear/dji-osmo-action-4.jpg",
        alt: "DJI Osmo Action 4 waterproof action camera",
        features: [
          "1/1.3-inch sensor for stronger low-light footage",
          "Waterproof to 18m without a housing",
          "RockSteady + HorizonSteady stabilization",
          "Up to 4K at 120fps slow motion",
        ],
      },
      {
        name: "Insta360 X4",
        desc: "360° Action Camera",
        img: "/gear/insta360-x4.jpg",
        alt: "Insta360 X4 360-degree action camera",
        features: [
          "8K30 360-degree video capture",
          "Invisible Selfie Stick effect in 360 mode",
          "Active HDR for high-motion dynamic range",
        ],
      },
    ],
  },
  {
    label: "Computer / Editing",
    items: [
      {
        name: "Alienware m15 R5",
        desc: "Mobile Editing Workstation",
        img: "/gear/alienware-m15-r5.jpg",
        alt: "Alienware m15 R5 laptop used as a mobile editing workstation",
        features: [
          "High-performance CPU paired with a dedicated GPU",
          "High refresh-rate QHD display option",
          "Dual SSD support for fast editing workflows",
        ],
      },
    ],
  },
];

export async function generateMetadata(): Promise<Metadata> {
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
  const totalItems = GEAR.reduce((n, c) => n + c.items.length, 0);
  const totalCats = GEAR.length;
  const stats = [
    { n: `${totalItems}`, l: "Pieces of Gear" },
    { n: `${totalCats}`, l: "Categories" },
    { n: "100%", l: "Personally Used" },
  ];

  return (
    <main style={{ background: C.BG, color: C.FG, minHeight: "100vh" }}>
      <SiteHeader site={site} />

      {/* HERO -- same visual language as the shared PageBanner (app/page.tsx / about page) */}
      <div
        style={{
          background: C.DARK,
          padding: "clamp(96px,20vw,120px) clamp(20px,6vw,40px) clamp(32px,6vw,44px)",
          minHeight: "clamp(252px,39.6vh,432px)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontSize: 11,
            letterSpacing: 6,
            color: C.PL,
            textTransform: "uppercase",
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ display: "inline-block", width: 24, height: 1, background: C.PL }} />
          Equipment
        </div>
        <h1 style={{ fontSize: "clamp(32px,5.2vw,64px)", fontWeight: 700, margin: "0 0 18px", maxWidth: 800 }}>
          Photography &amp; Videography Gear
        </h1>
        <p style={{ fontSize: 15, lineHeight: 1.8, color: "rgba(255,255,255,0.62)", maxWidth: 640, margin: "0 0 28px" }}>
          The equipment behind every shoot -- cameras, lenses, lighting, stabilization and post-production tools used for photography, videography and editing on location and in the studio.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {stats.map((s) => (
            <div
              key={s.l}
              style={{
                border: `1px solid ${C.BORDER}`,
                borderRadius: 10,
                padding: "10px 18px",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <div style={{ fontSize: "clamp(17px,2.2vw,20px)", fontWeight: 700, color: C.PL }}>{s.n}</div>
              <div
                style={{
                  fontSize: "clamp(9.5px,1.1vw,10.5px)",
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.5)",
                }}
              >
                {s.l}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "72px 24px 40px" }}>
        <GearGrid categories={GEAR} />

        {/* CTA -- same pattern as /about */}
        <div style={{ textAlign: "center", padding: "64px 0 24px", marginTop: 16, borderTop: `1px solid ${C.BORDER}` }}>
          <div style={{ fontSize: 11, letterSpacing: 6, color: C.PL, textTransform: "uppercase", marginBottom: 14 }}>
            Let&apos;s Talk
          </div>
          <h3 style={{ fontSize: "clamp(22px,3vw,32px)", fontWeight: 700, margin: "0 0 24px" }}>
            Have a Project In Mind?
          </h3>
          <a
            href="/contact"
            style={{
              background: C.P,
              color: C.BG,
              padding: "13px 36px",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 3,
              textTransform: "uppercase",
              textDecoration: "none",
              borderRadius: 2,
            }}
          >
            Get In Touch
          </a>
        </div>
      </div>

      <SiteFooter site={site} />
    </main>
  );
}
