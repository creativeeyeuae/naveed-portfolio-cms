import type { Metadata } from "next";
import Link from "next/link";
import { getPublicSiteInfo } from "@/lib/cmsData";
import { buildMetadata } from "@/lib/seo";
import InternalPageTemplate from "@/components/InternalPageTemplate";

// Booking Terms & Conditions. Version/date are shown on the page and recorded on every
// booking when the client ticks the box (see /api/bookings/create -> "terms v1").
const TERMS_VERSION = "v1";
const UPDATED = "10 October 2026";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    path: "/terms/",
    title: "Booking Terms & Conditions | Naveed Anjum",
    description: "Booking, payment, cancellation, delivery, copyright and liability terms for photography and videography services by Naveed Anjum in Dubai, UAE.",
    ogType: "website",
  });
}

type Sec = { id: string; t: string; p: (string | string[])[] };
const SECTIONS: Sec[] = [
  { id: "agreement", t: "1. Agreement", p: [
    "These Terms & Conditions (\"Terms\") apply to every photography, videography, content-creation and post-production service (\"Services\") booked with Naveed Anjum (\"the Photographer\", \"we\", \"us\") through bynaveedanjum.com, WhatsApp, email or in person, by the person or company making the booking (\"the Client\", \"you\").",
    "By ticking \"I agree\" on the booking form, confirming a booking in writing, or paying any amount, you confirm that you have read, understood and accepted these Terms in full, and that you are at least 18 years old and authorised to book on behalf of any company or other people named in the booking. The date, time and version of the Terms you accepted are recorded with your booking.",
    "If anything in a written quotation or proposal signed by both parties differs from these Terms, the signed document takes priority for that point only.",
  ]},
  { id: "booking", t: "2. Bookings & Confirmation", p: [
    "A booking is only confirmed once we have confirmed it to you in writing (email or WhatsApp) and the required payment has been received or a cash arrangement has been agreed. Dates and time slots are not reserved until then.",
    "You must provide accurate contact details. We verify your email and WhatsApp number before accepting a booking and may decline or cancel bookings made with false or incomplete information.",
    "The package, duration, location and deliverables are those shown on the booking or agreed in writing. Any extra time, locations, people, edits or deliverables requested on the day or later are charged separately at our current rates.",
  ]},
  { id: "payment", t: "3. Prices & Payment", p: [
    "All prices are in UAE Dirhams (AED). A 4% transaction/processing fee is added to the package price as shown at checkout. Online card/PayPal payments may be charged in US Dollars at the fixed rate of 1 USD = 3.6725 AED; any bank or card conversion fees charged by your own bank are your responsibility.",
    ["Bank transfer: payment must be made and the receipt uploaded before the booking is confirmed.",
     "PayPal / card: the booking is confirmed automatically once the payment is successfully completed.",
     "Cash: the full amount must be paid before the event or shoot starts. We may refuse to begin work until payment is received, and the session time lost is not extended or refunded."],
    "Discount or coupon codes are valid only as stated, cannot be exchanged for cash, cannot be combined unless stated, and may be withdrawn at any time before they are used.",
    "Final files are only delivered after the full amount, including any agreed extras, has been paid. Unpaid balances may be pursued through legal channels in the UAE.",
  ]},
  { id: "cancellation", t: "4. Cancellation by the Client", p: [
    "Cancellations must be sent in writing (email or WhatsApp). The time of cancellation is the time we receive your message, measured against the booked start time (UAE time):",
    ["More than 72 hours before: free cancellation — full refund of the amount paid, excluding any non-refundable payment-provider fees.",
     "Between 72 and 24 hours before: 50% of the total booking value is charged; any amount paid above this is refunded.",
     "Less than 24 hours before, or no-show: 100% of the total booking value is charged — no refund."],
    "Refunds are made to the original payment method within 14 working days. Cash refunds are made by bank transfer.",
  ]},
  { id: "reschedule", t: "5. Rescheduling", p: [
    "You may ask to move your booking once, free of charge, if requested more than 72 hours before the start time and subject to availability. Requests made later are treated as a cancellation under section 4, unless we agree otherwise in writing.",
    "If you arrive late or the session cannot start on time for reasons outside our control (venue access, guests, permits, etc.), the session still ends at the booked time and the full fee applies. Extra time is charged at our current rates if available.",
  ]},
  { id: "our-cancellation", t: "6. Cancellation or Changes by Us", p: [
    "In the unlikely event that we cannot attend due to illness, injury, family emergency, accident, equipment failure, or any event outside our reasonable control, we will (at our choice) arrange a suitably qualified replacement photographer/videographer, offer a new date, or refund all amounts you have paid for the affected Services.",
    "This refund is the full extent of our responsibility. We are not liable for any other costs, such as venue hire, travel, models, catering or other suppliers.",
  ]},
  { id: "delivery", t: "7. Delivery Times", p: [
    "Standard delivery is approximately 7 (seven) working days after the shoot AND after full payment has been received — whichever is later. Delivery time depends on the payment status, the amount of post-production work (editing, retouching, colour grading, video editing, music licensing, revisions), and our current workload.",
    "Larger projects (events, multi-day shoots, video productions, high-volume retouching) may take longer; any specific deadline must be agreed in writing at the time of booking to be binding.",
    "Delivery times are good-faith estimates, not guarantees. Reasonable delays caused by post-production complexity, client feedback rounds, late information or materials from the Client, technical issues, illness, public holidays or events outside our control do not entitle the Client to a refund, discount or compensation. We will keep you informed if a delay is expected.",
    "Files are delivered by online link and kept available for 30 days. We recommend you download and back them up promptly; we are not obliged to keep copies after that period.",
  ]},
  { id: "editing", t: "8. Creative Style, Editing & Revisions", p: [
    "You are booking the Photographer for their creative style and judgement. The selection of images, number of final images, composition, editing and colour grading are at the Photographer's artistic discretion, within what was agreed.",
    "RAW / unedited files are not supplied unless agreed in writing and paid for. One round of reasonable minor revisions is included for edited deliverables where stated in the package; further changes are charged separately.",
    "Dissatisfaction with the creative style, or changes of mind after delivery, are not grounds for a refund.",
  ]},
  { id: "client", t: "9. Client Responsibilities & Safety", p: [
    ["Obtain all permissions, permits and venue/location approvals needed for the shoot, including drone and filming permits where required, unless we have agreed in writing to arrange them.",
     "Make sure everyone being photographed or filmed has agreed to it, and that minors are accompanied by a parent or guardian.",
     "Provide a safe working environment. We may stop or refuse work, without refund, if conditions are unsafe, or if anyone is abusive, threatening or acting unlawfully.",
     "You are responsible for the conduct of your guests and for any damage they cause to our equipment."],
    "We follow UAE laws and the customs of the UAE, including on privacy and public photography, and may decline requests that would breach them.",
  ]},
  { id: "weather", t: "10. Weather & Outdoor Shoots", p: [
    "For outdoor shoots affected by severe weather (rain, sandstorm, extreme heat warnings), we will offer one free reschedule to the next available date. Light weather changes are not a reason for cancellation, and section 4 applies to cancellations for other reasons.",
  ]},
  { id: "copyright", t: "11. Copyright & Usage", p: [
    "The Photographer owns the copyright in all photographs, videos and materials created, as permitted under UAE Federal Decree-Law No. 38 of 2021 on Copyright and Neighbouring Rights.",
    "On full payment, the Client receives a non-exclusive licence to use the delivered files for personal use, or for the commercial use stated in the booking/quotation. Resale, licensing to third parties, use in paid advertising beyond what was agreed, or editing that changes the work's character (including filters that alter it significantly) requires our written permission.",
    "Please credit \"Naveed Anjum\" or @bynaveedanjum where reasonably possible when sharing online.",
    "We may use selected images and clips in our portfolio, website and social media. If you prefer they are not used, tell us in writing before the shoot and we will respect it. We will never sell your images to third parties.",
  ]},
  { id: "liability", t: "12. Limitation of Liability", p: [
    "We use professional equipment, backup memory cards and take great care with your files. However, in the rare event of equipment malfunction, file corruption, loss or damage of files, or any other failure, our total liability to you for any claim of any kind is limited to the total amount you paid for the affected Services.",
    "We are not liable for indirect or consequential losses (including loss of business, profit, opportunity, or emotional distress), for images that could not be taken because of venue rules, timings, lighting or guest behaviour, or for missed moments outside our control.",
    "Nothing in these Terms limits liability that cannot legally be limited under UAE law.",
  ]},
  { id: "force-majeure", t: "13. Events Outside Our Control", p: [
    "Neither party is responsible for failing to perform its obligations because of events outside its reasonable control, including natural events, extreme weather, government restrictions, public health measures, civil unrest, power or internet failures, or transport disruption. In that case we will offer a new date or a refund of the amount paid for Services not yet provided.",
  ]},
  { id: "privacy", t: "14. Privacy", p: [
    "We collect your name, email, WhatsApp number and booking details only to manage your booking, payments and communication. We send booking-related messages by email and WhatsApp. We do not sell your personal data. You may ask us to update or delete your personal data, subject to records we must keep for legal, tax and accounting purposes.",
  ]},
  { id: "law", t: "15. Governing Law & Disputes", p: [
    "These Terms are governed by the laws of the United Arab Emirates as applied in the Emirate of Dubai. We will always try to resolve any concern amicably first — please contact us directly. Any dispute that cannot be resolved amicably is subject to the exclusive jurisdiction of the courts of Dubai.",
    "If any part of these Terms is found to be invalid, the rest remain in force. We may update these Terms from time to time; the version you accepted when booking applies to that booking.",
  ]},
];

export default async function TermsPage() {
  const site = await getPublicSiteInfo();
  const box: React.CSSProperties = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 14, padding: "20px 22px" };
  return (
    <InternalPageTemplate site={site} eyebrow="Legal" title="Terms & Conditions" image="">
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px clamp(18px,5vw,32px) 80px", color: "rgba(255,255,255,0.78)", fontSize: 15, lineHeight: 1.8 }}>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", margin: "0 0 24px" }}>Version {TERMS_VERSION} · Last updated {UPDATED}</p>

        <div style={{ ...box, marginBottom: 32, borderColor: "rgba(139,92,246,0.45)" }}>
          <div style={{ fontWeight: 700, color: "#fff", marginBottom: 10, fontSize: 16 }}>Summary (the full terms below apply)</div>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li><b style={{ color: "#4ade80" }}>72+ hours</b> before: free cancellation · <b style={{ color: "#fbbf24" }}>72–24 hours</b>: 50% charged · <b style={{ color: "#f87171" }}>under 24 hours</b>: no refund</li>
            <li>Delivery: about <b style={{ color: "#fff" }}>7 working days</b> after the shoot and full payment — depends on payment and post-production</li>
            <li>Cash bookings: pay in full <b style={{ color: "#fff" }}>before the event starts</b></li>
            <li>We keep the copyright; you get a licence to use your photos/videos once paid</li>
            <li>Our liability is limited to the amount you paid · UAE law, Dubai courts</li>
          </ul>
        </div>

        <nav style={{ ...box, marginBottom: 36, fontSize: 14 }}>
          <div style={{ fontWeight: 700, color: "#fff", marginBottom: 8 }}>Contents</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: "4px 18px" }}>
            {SECTIONS.map((s) => <a key={s.id} href={`#${s.id}`} style={{ color: "#c4b5fd", textDecoration: "none" }}>{s.t}</a>)}
          </div>
        </nav>

        {SECTIONS.map((s) => (
          <section key={s.id} id={s.id} style={{ marginBottom: 32, scrollMarginTop: 100 }}>
            <h2 style={{ fontSize: 20, color: "#fff", margin: "0 0 10px" }}>{s.t}</h2>
            {s.p.map((x, i) => Array.isArray(x)
              ? <ul key={i} style={{ margin: "0 0 12px", paddingLeft: 22 }}>{x.map((li, j) => <li key={j} style={{ marginBottom: 6 }}>{li}</li>)}</ul>
              : <p key={i} style={{ margin: "0 0 12px" }}>{x}</p>)}
          </section>
        ))}

        <div style={{ ...box, marginTop: 40 }}>
          <div style={{ fontWeight: 700, color: "#fff", marginBottom: 6 }}>Questions about these terms?</div>
          <p style={{ margin: "0 0 14px" }}>Contact us before booking — we&apos;re happy to explain anything.</p>
          <Link href="/contact" style={{ color: "#c4b5fd", fontWeight: 600 }}>Contact Naveed →</Link>
        </div>
      </div>
    </InternalPageTemplate>
  );
}
