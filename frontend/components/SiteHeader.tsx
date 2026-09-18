"use client";
// THE single, real site header. This used to exist only as inline JSX inside the homepage's
// own Home() component (app/page.tsx's `const Nav = () => (...)`) -- unreachable by any other
// page. It has been extracted here so every route can render the exact same component:
//
//   - The homepage (app/page.tsx) renders <SiteHeader site={...} spa={...}/> in place of its
//     old inline Nav -- passing its own live state via the `spa` prop, so its rendered
//     output and behavior (fixed/scroll-hiding nav, mobile hamburger menu, language switcher
//     shared with the rest of the page, active-link highlighting) are 100% unchanged.
//   - Every other route (/work, /about, /packages, /gear, /contact, /work/[slug]) renders
//     <SiteHeader site={site}/> with no `spa` prop -- a route with no in-memory SPA state of
//     its own gets the SAME fixed/blurred/scroll-hiding chrome (own local
//     scrolled/isMobile/mobileNavOpen state + a scroll/resize listener, mirroring the
//     homepage's), just with real <a href> links instead of goTo() and the active link
//     picked from the real URL (usePathname()) instead of in-memory `page` state. Every
//     page that renders this static mode already reserves top padding for exactly this
//     fixed-nav overlay (it's the same padding PageBanner has always used), so this was
//     always the intended look -- it just wasn't wired up yet.
//
// There is exactly one nav implementation. Nothing else should define its own Header/Nav.
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { PublicSiteInfo } from "@/lib/cmsData";

export type Lang = "en" | "ar" | "fr" | "ru" | "zh" | "de" | "es" | "it" | "tr" | "hi" | "ur" | "tl";

export const LANGS: { code: Lang; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "ar", label: "العربية", flag: "🇦🇪" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "tr", label: "Türkçe", flag: "🇹🇷" },
  { code: "hi", label: "हिन्दी", flag: "🇮🇳" },
  { code: "ur", label: "اردو", flag: "🇵🇰" },
  { code: "tl", label: "Filipino", flag: "🇵🇭" },
];

// Static-route-only translations (nav labels + Book button) -- used solely when no `spa`
// prop is given. On the homepage, translation is driven by app/page.tsx's own UI_STRINGS
// (unchanged); this table exists only so a standalone route without that state still gets a
// working language switcher for its own fixed chrome, exactly like the homepage's.
const NAV_TEXT: Record<Lang, { home: string; work: string; about: string; packages: string; gear: string; journal: string; cv: string; contact: string; bookBtn: string }> = {
  en: { home: "Home", work: "Work", about: "About", packages: "Packages", gear: "Gear", journal: "Journal", cv: "CV", contact: "Contact", bookBtn: "Book a Project" },
  ar: { home: "الرئيسية", work: "أعمالنا", about: "من نحن", packages: "الباقات", gear: "المعدات", journal: "المجلة", cv: "السيرة الذاتية", contact: "تواصل معنا", bookBtn: "احجز مشروعك" },
  fr: { home: "Accueil", work: "Travaux", about: "À propos", packages: "Forfaits", gear: "Équipement", journal: "Journal", cv: "CV", contact: "Contact", bookBtn: "Réserver un projet" },
  ru: { home: "Главная", work: "Работы", about: "О нас", packages: "Пакеты", gear: "Оборудование", journal: "Журнал", cv: "Резюме", contact: "Контакты", bookBtn: "Заказать проект" },
  zh: { home: "首页", work: "作品", about: "关于", packages: "套餐", gear: "器材", journal: "期刊", cv: "简历", contact: "联系我们", bookBtn: "预约项目" },
  de: { home: "Startseite", work: "Arbeiten", about: "Über uns", packages: "Pakete", gear: "Ausrüstung", journal: "Journal", cv: "Lebenslauf", contact: "Kontakt", bookBtn: "Projekt buchen" },
  es: { home: "Inicio", work: "Trabajos", about: "Sobre nosotros", packages: "Paquetes", gear: "Equipo", journal: "Revista", cv: "CV", contact: "Contacto", bookBtn: "Reservar un proyecto" },
  it: { home: "Home", work: "Lavori", about: "Chi siamo", packages: "Pacchetti", gear: "Attrezzatura", journal: "Giornale", cv: "CV", contact: "Contatti", bookBtn: "Prenota un progetto" },
  tr: { home: "Ana Sayfa", work: "Çalışmalar", about: "Hakkımızda", packages: "Paketler", gear: "Ekipman", journal: "Dergi", cv: "Özgeçmiş", contact: "İletişim", bookBtn: "Proje Rezervasyonu Yap" },
  hi: { home: "होम", work: "कार्य", about: "परिचय", packages: "पैकेज", gear: "गियर", journal: "जर्नल", cv: "सीवी", contact: "संपर्क करें", bookBtn: "प्रोजेक्ट बुक करें" },
  ur: { home: "صفحہ اول", work: "کام", about: "ہمارے بارے میں", packages: "پیکجز", gear: "آلات", journal: "جرنل", cv: "سی وی", contact: "رابطہ کریں", bookBtn: "پراجیکٹ بک کریں" },
  tl: { home: "Home", work: "Mga Trabaho", about: "Tungkol Sa Amin", packages: "Mga Package", gear: "Kagamitan", journal: "Journal", cv: "CV", contact: "Makipag-ugnayan", bookBtn: "I-book ang Proyekto" },
};

// Static-route-only: real destinations for the nav keys. Work/About/Packages/Gear/Contact
// all have their own real pages now. CV/Journal still have no standalone index URL of their
// own (same as on the homepage -- they're in-memory-only sections there too; Journal's
// individual posts ARE real pages at /journal/[slug], but there is no /journal index) --
// those two route to /?page=cv|blog instead of a bare "/", which the homepage reads on mount
// (see app/page.tsx) to land directly on that section rather than always showing the Home
// hero. Not used at all in `spa` mode (the homepage keeps its own goTo() in-memory
// navigation, unchanged). Kept in sync with the matching PAGE_HREF map in SiteFooter.tsx.
const STATIC_HREF: Record<string, string> = { home: "/", work: "/work", about: "/about", packages: "/packages", gear: "/gear", blog: "/?page=blog", cv: "/?page=cv", contact: "/contact", booking: "/contact" };
// Nav order everywhere: Home | Work | About | Packages | Gear | Journal | CV | Contact | Book
const STATIC_NAV_ORDER: { key: keyof (typeof NAV_TEXT)["en"] | "blog"; textKey: keyof (typeof NAV_TEXT)["en"] }[] = [
  { key: "home", textKey: "home" },
  { key: "work", textKey: "work" },
  { key: "about", textKey: "about" },
  { key: "packages", textKey: "packages" },
  { key: "gear", textKey: "gear" },
  { key: "blog", textKey: "journal" },
  { key: "cv", textKey: "cv" },
  { key: "contact", textKey: "contact" },
];

// SPA-mode props -- supplied only by the homepage (app/page.tsx), which owns all of this
// state already. Nothing here is new state; it's the exact same state the old inline Nav
// closed over directly, now passed in explicitly.
export type SiteHeaderSpaProps = {
  page: string;
  lang: Lang;
  onLangChange: (l: Lang) => void;
  goTo: (p: string) => void;
  scrolled: boolean;
  isMobile: boolean;
  mobileNavOpen: boolean;
  onToggleMobileNav: () => void;
  onCloseMobileNav: () => void;
  visibleLinks: [string, string][];
  bookBtnLabel: string;
};

function NoTranslate({ children }: { children: React.ReactNode }) {
  return <span translate="no" className="notranslate">{children}</span>;
}

export default function SiteHeader({ site, spa }: { site: PublicSiteInfo; spa?: SiteHeaderSpaProps }) {
  const [staticLang, setStaticLang] = useState<Lang>("en");
  // Static-mode-only: this route has no in-memory SPA state, so it tracks the exact same
  // scroll/viewport state locally that the homepage tracks in app/page.tsx, using the exact
  // same thresholds/logic, so the fixed/collapsing nav behaves identically everywhere.
  const [staticScrolled, setStaticScrolled] = useState(false);
  const [staticIsMobile, setStaticIsMobile] = useState(false);
  const [staticMobileNavOpen, setStaticMobileNavOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (spa) return;
    function check() { setStaticIsMobile(window.innerWidth < 900); }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [spa]);

  useEffect(() => {
    if (spa) return;
    function onScroll() { setStaticScrolled(window.scrollY > 40); }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [spa]);

  const isMobile = spa ? spa.isMobile : staticIsMobile;
  const scrolled = spa ? spa.scrolled : staticScrolled;
  const mobileNavOpen = spa ? spa.mobileNavOpen : staticMobileNavOpen;
  const onCloseMobileNav = spa ? spa.onCloseMobileNav : () => setStaticMobileNavOpen(false);
  const onToggleMobileNav = spa ? spa.onToggleMobileNav : () => setStaticMobileNavOpen((v) => !v);

  const lang = spa ? spa.lang : staticLang;
  const t = NAV_TEXT[lang];
  const staticVisibleLinks = STATIC_NAV_ORDER.filter((l) => l.key === "home" || site.pageEnabled[l.key] !== false);
  const bookBtnLabel = spa ? spa.bookBtnLabel : (lang === "en" ? site.navBookBtn : t.bookBtn);

  return (
    <>
      <style>{`@keyframes pgFadeIn{from{opacity:0}to{opacity:1}}
        @keyframes clientsOrbit{
          0%{transform:rotateY(0deg) translateZ(var(--r));filter:blur(0px);opacity:1}
          12.5%{transform:rotateY(45deg) translateZ(var(--r));filter:blur(1.1px);opacity:0.9}
          25%{transform:rotateY(90deg) translateZ(var(--r));filter:blur(3.75px);opacity:0.65}
          37.5%{transform:rotateY(135deg) translateZ(var(--r));filter:blur(6.4px);opacity:0.4}
          50%{transform:rotateY(180deg) translateZ(var(--r));filter:blur(7.5px);opacity:0.3}
          62.5%{transform:rotateY(225deg) translateZ(var(--r));filter:blur(6.4px);opacity:0.4}
          75%{transform:rotateY(270deg) translateZ(var(--r));filter:blur(3.75px);opacity:0.65}
          87.5%{transform:rotateY(315deg) translateZ(var(--r));filter:blur(1.1px);opacity:0.9}
          100%{transform:rotateY(360deg) translateZ(var(--r));filter:blur(0px);opacity:1}
        }
        .client-tile{transition:transform 0.3s}
        .client-tile:hover{transform:scale(1.15)}`}</style>

      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 501, height: 32, boxSizing: "border-box", padding: isMobile ? "0 20px" : "0 40px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--c-dark,#140D21)", opacity: scrolled ? 0 : 1, transform: scrolled ? "translateY(-100%)" : "translateY(0)", pointerEvents: scrolled ? "none" : "auto", transition: "opacity 0.35s cubic-bezier(.16,.84,.44,1), transform 0.35s cubic-bezier(.16,.84,.44,1)" }}>
        <a href="/?admin=1" style={{ fontSize: 10, letterSpacing: 2, color: "var(--c-mid,#A892C6)", textTransform: "uppercase", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={(e) => (e.currentTarget.style.color = "var(--c-pl,#E2D9F3)")} onMouseLeave={(e) => (e.currentTarget.style.color = "var(--c-mid,#A892C6)")}>Admin</a>
        <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
          <select aria-label="Language" value={lang} onChange={(e) => (spa ? spa.onLangChange(e.target.value as Lang) : setStaticLang(e.target.value as Lang))} style={{ background: "transparent", border: "none", color: "var(--c-mid,#A892C6)", fontSize: 10, letterSpacing: 1, textTransform: "uppercase", cursor: "pointer", outline: "none" }}>
            {LANGS.map((l) => <option key={l.code} value={l.code} style={{ color: "#000" }}>{l.flag} {l.label}</option>)}
          </select>
          {site.instagram && <a href={site.instagram} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, letterSpacing: 2, color: "var(--c-mid,#A892C6)", textTransform: "uppercase", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={(e) => (e.currentTarget.style.color = "var(--c-pl,#E2D9F3)")} onMouseLeave={(e) => (e.currentTarget.style.color = "var(--c-mid,#A892C6)")}>Instagram</a>}
          {site.youtube && <a href={site.youtube} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, letterSpacing: 2, color: "var(--c-mid,#A892C6)", textTransform: "uppercase", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={(e) => (e.currentTarget.style.color = "var(--c-pl,#E2D9F3)")} onMouseLeave={(e) => (e.currentTarget.style.color = "var(--c-mid,#A892C6)")}>YouTube</a>}
        </div>
      </div>
      <nav role="navigation" aria-label="Main navigation" style={{ position: "fixed", top: scrolled ? 0 : 32, left: 0, right: 0, zIndex: 500, padding: isMobile ? "21px 20px" : "23px 40px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(9,6,14,0.85)", backdropFilter: "blur(16px)", borderBottom: "1px solid var(--c-border,#2D1F45)", transition: "top 0.35s cubic-bezier(.16,.84,.44,1)" }}>
        {spa ? (
          <div onClick={() => { spa.goTo("home"); onCloseMobileNav(); }} style={{ fontSize: 15, letterSpacing: 4, textTransform: "uppercase", cursor: "pointer", color: "var(--c-fg,#FFFFFF)", fontFamily: "var(--font-serif),'Plus Jakarta Sans',sans-serif" }}><NoTranslate>{site.siteName}</NoTranslate></div>
        ) : (
          <a href="/" onClick={onCloseMobileNav} style={{ fontSize: 15, letterSpacing: 4, textTransform: "uppercase", textDecoration: "none", color: "var(--c-fg,#FFFFFF)", fontFamily: "var(--font-serif),'Plus Jakarta Sans',sans-serif" }}><NoTranslate>{site.siteName}</NoTranslate></a>
        )}

        {isMobile ? (
          <button aria-label={mobileNavOpen ? "Close menu" : "Open menu"} onClick={onToggleMobileNav} style={{ background: "none", border: "1px solid var(--c-border,#2D1F45)", color: "var(--c-fg,#FFFFFF)", width: 40, height: 36, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, cursor: "pointer" }}>
            <span style={{ display: "block", width: 18, height: 1, background: "var(--c-fg,#FFFFFF)" }} />
            <span style={{ display: "block", width: 18, height: 1, background: "var(--c-fg,#FFFFFF)" }} />
            <span style={{ display: "block", width: 18, height: 1, background: "var(--c-fg,#FFFFFF)" }} />
          </button>
        ) : spa ? (
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            {spa.visibleLinks.map(([k, l]) => (
              <span key={k} onClick={() => spa.goTo(k)} style={{ fontSize: 11, letterSpacing: 3, color: spa.page === k ? "var(--c-pl,#E2D9F3)" : "var(--c-mid,#A892C6)", textTransform: "uppercase", cursor: "pointer", transition: "color 0.2s", borderBottom: spa.page === k ? "1px solid var(--c-pl,#E2D9F3)" : "1px solid transparent", paddingBottom: 2 }}>{l}</span>
            ))}
            <button onClick={() => spa.goTo("booking")} style={{ background: "var(--c-p,#8B5CF6)", border: "none", color: "var(--c-bg,#09060E)", padding: "9px 20px", fontSize: 10, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", cursor: "pointer", borderRadius: 2 }} onMouseEnter={(e) => (e.currentTarget.style.background = "var(--c-pd,#A855F7)")} onMouseLeave={(e) => (e.currentTarget.style.background = "var(--c-p,#8B5CF6)")}>{bookBtnLabel}</button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            {staticVisibleLinks.map((l) => (
              <a key={l.key} href={STATIC_HREF[l.key]} style={{ fontSize: 11, letterSpacing: 3, color: pathname === STATIC_HREF[l.key] ? "var(--c-pl,#E2D9F3)" : "var(--c-mid,#A892C6)", textTransform: "uppercase", textDecoration: "none", transition: "color 0.2s", borderBottom: pathname === STATIC_HREF[l.key] ? "1px solid var(--c-pl,#E2D9F3)" : "1px solid transparent", paddingBottom: 2 }}>{t[l.textKey]}</a>
            ))}
            <a href={STATIC_HREF.booking} style={{ background: "var(--c-p,#8B5CF6)", color: "var(--c-bg,#09060E)", padding: "9px 20px", fontSize: 10, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", cursor: "pointer", borderRadius: 2, textDecoration: "none" }}>{bookBtnLabel}</a>
          </div>
        )}

        {isMobile && mobileNavOpen && (
          <div style={{ position: "fixed", top: scrolled ? 78 : 110, left: 0, right: 0, height: `calc(100vh - ${scrolled ? 78 : 110}px)`, background: "rgba(9,6,14,0.97)", zIndex: 499, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 26, overflowY: "auto", transition: "top 0.35s cubic-bezier(.16,.84,.44,1)" }}>
            {spa ? (
              <>
                {spa.visibleLinks.map(([k, l]) => (
                  <span key={k} onClick={() => { spa.goTo(k); onCloseMobileNav(); }} style={{ fontSize: 15, letterSpacing: 3, color: spa.page === k ? "var(--c-pl,#E2D9F3)" : "var(--c-fg,#FFFFFF)", textTransform: "uppercase", cursor: "pointer" }}>{l}</span>
                ))}
                <button onClick={() => { spa.goTo("booking"); onCloseMobileNav(); }} style={{ background: "var(--c-p,#8B5CF6)", border: "none", color: "var(--c-bg,#09060E)", padding: "13px 32px", fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", cursor: "pointer", borderRadius: 2 }}>{bookBtnLabel}</button>
              </>
            ) : (
              <>
                {staticVisibleLinks.map((l) => (
                  <a key={l.key} href={STATIC_HREF[l.key]} onClick={onCloseMobileNav} style={{ fontSize: 15, letterSpacing: 3, color: pathname === STATIC_HREF[l.key] ? "var(--c-pl,#E2D9F3)" : "var(--c-fg,#FFFFFF)", textTransform: "uppercase", textDecoration: "none", cursor: "pointer" }}>{t[l.textKey]}</a>
                ))}
                <a href={STATIC_HREF.booking} onClick={onCloseMobileNav} style={{ background: "var(--c-p,#8B5CF6)", color: "var(--c-bg,#09060E)", padding: "13px 32px", fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", cursor: "pointer", borderRadius: 2, textDecoration: "none" }}>{bookBtnLabel}</a>
              </>
            )}
          </div>
        )}
      </nav>
    </>
  );
}
