// Shared route-loading UI (Next.js App Router "loading.tsx" convention). Re-exported,
// unchanged, from a loading.tsx in every top-level route segment (app/loading.tsx,
// app/work/loading.tsx, app/about/loading.tsx, app/packages/loading.tsx, app/gear/loading.tsx,
// app/contact/loading.tsx, app/journal/loading.tsx) so Next shows this immediately the
// moment a navigation starts, instead of leaving the PREVIOUS page frozen on screen while
// the destination route's small static payload is fetched -- which is what made pages
// appear to "hang" on the old page for a few seconds.
//
// Deliberately minimal and NOT a new visual design: same C.BG dark background every page
// already uses (no white flash), and the same eyebrow "dash" accent element already used
// on every banner (PageBanner / InternalPageTemplate), just animated as a pulse instead of
// static. Nothing here introduces a new color, icon, spinner style, or layout.
const C = {
  P: "var(--c-p,#8B5CF6)",
  BG: "var(--c-bg,#09060E)",
};

export default function RouteLoading() {
  return (
    <div style={{ background: C.BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`@keyframes routeLoadingPulse{0%,100%{opacity:0.25;width:24px}50%{opacity:1;width:44px}}`}</style>
      <span style={{ height: 1, background: C.P, display: "inline-block", animation: "routeLoadingPulse 1.1s ease-in-out infinite" }} />
    </div>
  );
}
