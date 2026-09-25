"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient as _createSupabaseClient } from "@supabase/supabase-js";
import { SERVICE_PAGES } from "@/lib/servicePagesData";
import type { PublicSiteInfo } from "@/lib/cmsData";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { protectedImgProps, PROTECTED_IMG_CLASS } from "@/lib/imageProtection";

// ─── TYPES ──────────────────────────────────────────────────────────────────
type Img = { url: string; orientation: string; caption?: string };
type Project = { id:string;title:string;slug:string;categories:string[];description:string;fullDescription:string;clientName:string;location:string;projectDate:string;tags:string[];featured:boolean;coverImage:string;images:Img[];videos:string[];reels:string[];youtubeUrl:string;
  // Additive fields (spec: "extend the existing project detail page, never rebuild") for the
  // canonical /work/[slug] page -- all optional so every existing project (which has none of
  // these set) renders identically to before until an admin fills one in.
  projectName?:string;   // Prominent display name shown on the /work/[slug] page body, separate
                          // from `title` (which stays the banner heading + nav/listing label).
  bannerTitle?:string;   // Optional override for the banner heading on /work/[slug]; supports
                          // literal newlines (rendered as <br/>) so it isn't crammed into `title`'s
                          // single-line usage elsewhere (Featured Work cards, Work grid, nav-adjacent
                          // listings). Falls back to `title` when blank -- zero visual change until set.
  bannerImage?:string;   // Optional banner-only image, distinct from `coverImage` (used for grid/
                          // card thumbnails everywhere else). Falls back to `coverImage` when blank.
  previousSlugs?:string[]; // Every slug this project has ever had (oldest first), tracked
                          // automatically when the title/slug changes so old shared links keep
                          // working -- /work/[slug] renders a soft redirect to the current slug
                          // for any of these instead of a hard 404.
};
type Testimonial = { id:string;name:string;role:string;company:string;quote:string;featured:boolean; };
type BlogPost = { id:string;title:string;slug:string;excerpt:string;date:string;category:string;coverImage:string;content:string; };
type Service = { id:string;icon:string;title:string;desc:string;detail:string;deliverables:string[]; };
// CMS-editable "WordPress Customizer"-style theme: every brand color (ThemeColors) and every
// small hardcoded UI string (UiText) that isn't already covered by settings/services/testimonials/
// blog/projects/CV. Defaults below mirror the current hardcoded copy/colors exactly, so shipping
// this makes zero visual change until Naveed actually edits something in CMS > Settings > Colors/Text.
type ThemeColors = { P:string;PL:string;PD:string;GOLD:string;GOLDL:string;BG:string;FG:string;MID:string;DARK:string;BORDER:string;LT:string;LTCARD:string;LTBORDER:string;INKMID:string; };
type UiText = {
  navBookBtn:string; footerWhatsappBtn:string;
  homeServicesEyebrow:string; homeServicesTitle:string; homeServicesIntro:string;
  homeWorkEyebrow:string; homeWorkTitle:string; homeWorkViewAll:string;
  homeClientsEyebrow:string; homeClientsTitle:string;
  homeTestimonialsEyebrow:string;
  homeJournalEyebrow:string; homeJournalTitle:string; homeJournalViewAll:string;
  homeCtaEyebrow:string; homeCtaTitle:string; homeCtaBookBtn:string; homeCtaWaBtn:string;
  workBannerEyebrow:string; workBannerTitle:string;
  aboutBannerEyebrow:string; aboutBannerTitle:string;
  packagesBannerEyebrow:string; packagesBannerTitle:string;
  blogBannerEyebrow:string; blogBannerTitle:string;
  cvBannerEyebrow:string; cvBannerTitle:string;
  bookingBannerEyebrow:string; bookingBannerTitle:string;
  contactBannerEyebrow:string; contactBannerTitle:string;
  gearBannerEyebrow:string; gearBannerTitle:string;
};
// Optional per-page banner background image (CMS > Settings > Colors & Banners). Empty string
// (the default for every page) means "no image" -- the banner renders as a plain solid-color
// band using theme.DARK, identical to how these pages look today. Adding a URL overlays a dark
// scrim automatically so the banner title stays readable over any photo.
type SectionBg = { work:string;about:string;packages:string;blog:string;cv:string;booking:string;contact:string;gear:string; };
// Per-page visibility switch (CMS > Settings > Pages). Home always stays on -- these are the
// other public pages, each independently turn-off-able without touching any content or code.
// A disabled page is simply skipped from nav/footer links and goTo() bounces back to Home if
// something still points at it, so nothing 404s and no content is deleted.
type PageEnabled = { work:boolean;about:boolean;packages:boolean;blog:boolean;cv:boolean;booking:boolean;contact:boolean;gear:boolean; };
// Per-SECTION visibility switch for the home page itself (CMS > Settings > Pages, second
// group below). Different from PageEnabled above (which hides/shows whole other pages) --
// this toggles individual blocks of the home page on/off without touching their content.
// "clients" isn't listed here on purpose: Our Clients already had its own toggle
// (clientsEnabled, CMS > Settings > Clients) before this existed, so it stays there rather
// than getting a second, redundant flag -- the Pages tab UI still surfaces it in the same
// list for a single "everything homepage" control panel. Missing/older saved data reads as
// all-on (every check below is `!==false`), so shipping this changes nothing until a section
// is actually switched off.
type HomeSections = { hero:boolean;intro:boolean;about:boolean;services:boolean;work:boolean;testimonials:boolean;journal:boolean;cta:boolean; };
// Pricing package cards (CMS > Settings > Packages), rendered on the Packages page under
// "Your Investment" -- add/remove/edit freely, each with its own image. Separate from
// `services` (the deliverables-list cards further down that page), which stay untouched.
// `features` populates the card-back "Includes" checklist (hover-flip -- see .pflip in
// globals.css); safe to be missing/empty on older saved data, the back face just shows nothing.
type PricingPackage = { id:string; icon:string; label:string; price:string; priceNote:string; desc:string; image:string; ctaLabel:string; ctaLink?:string; features:string[]; };
// Shared style controls for ALL pricing cards (CMS > Settings > Packages > Card Style) --
// one set of padding/typography/overlay settings applied uniformly across every card, rather
// than per-card, so the section stays visually consistent. Font keys look up HERO_FONTS (the
// same curated Google Fonts already used by Hero Typography). Empty color strings mean
// "inherit the site's existing theme colors" (same sentinel pattern as HeroTypography), so
// shipping this makes zero visual change until Naveed picks something different in CMS.
type PricingCardStyle = {
  padTop:number; padRight:number; padBottom:number; padLeft:number;
  titleFont:string; titleSize:number; titleWeight:number; titleColor:string; titleColorOnPhoto:string;
  priceSize:number; priceColor:string; priceColorOnPhoto:string;
  descFont:string; descSize:number; descColor:string; descColorOnPhoto:string;
  overlayColor:string; overlayOpacity:number;
};
// Builds the dark gradient overlay used behind a pricing card's background photo, from the
// CMS-controlled tint color + strength (Settings > Packages > Card Style). Kept as a small
// pure helper so the card JSX below stays readable.
function pricingOverlayGradient(pcs:PricingCardStyle){
  const rgb=(pcs.overlayColor||"20,13,33").trim();
  const op=Math.max(0,Math.min(1,pcs.overlayOpacity??0.6));
  const top=Math.min(1,op*0.42).toFixed(2), mid=op.toFixed(2), bot=Math.min(1,op*1.53).toFixed(2);
  return `linear-gradient(180deg, rgba(${rgb},${top}) 0%, rgba(${rgb},${mid}) 55%, rgba(${rgb},${bot}) 100%)`;
}
// Hero headline/sub-text typography (CMS > Settings > Hero Slides). Font keys are looked up in
// HERO_FONTS (a curated set of properly-licensed Google Fonts loaded once via next/font in
// layout.tsx -- no runtime font-CDN calls). "default" and an empty color mean "inherit the
// site's existing look", so shipping this makes zero visual change until Naveed picks
// something different in CMS.
type HeroTypography = {
  headlineFont:string; headlineWeight:number; headlineSize:number; headlineSpacing:number; headlineItalic:boolean; headlineColor:string;
  subFont:string; subWeight:number; subSize:number; subColor:string;
};
type SiteSettings = {
  pin:string; siteName:string; siteTagline:string; siteDescription:string;
  heroSlides:HeroSlide[]; aboutName:string; aboutTitle:string; aboutBio:string; aboutPhoto:string;
  statsYears:string; statsProjects:string; statsClients:string;
  phone:string; email:string; waNumber:string; waMsg:string; location:string; address:string;
  instagram:string; youtube:string; linkedin:string; tiktok:string;
  footerCopyright:string; footerLinks:{label:string;page:string}[];
  seoTitle:string; seoDesc:string; googlePlaceId:string; googleReviewsEnabled:boolean;
  videoSectionEnabled:boolean; videoSectionUrl:string; videoSectionTitle:string; videoSectionSubtitle:string; // Full-width video section, between About and Services
  popupEnabled:boolean; popupDelaySec:number; popupTitle:string; popupText:string; popupCtaLabel:string;
  imagePermissionEnabled:boolean; // CMS on/off switch for the whole Image Permission Request
                                   // feature (spec point 22) -- when off, /work/[slug] hides
                                   // every "Request Image Permission" control.
  emailjsServiceId:string; emailjsTemplateId:string; emailjsPublicKey:string;
  theme:ThemeColors; uiText:UiText; sectionBg:SectionBg; pageEnabled:PageEnabled; homeSections:HomeSections; heroTypography:HeroTypography;
  pricingPackages:PricingPackage[]; pricingCardStyle:PricingCardStyle;
  services:Service[]; servicesImage:string;
  clients:{id:string;name:string;logo:string}[]; clientsEnabled:boolean;
  cvSections:{title:string;content:string}[];
  skills:{dept:string;items:string[]}[];
  // Per-item override photo for the /gear page -- keyed by the gear item's exact name
  // (matching frontend/app/gear/page.tsx's hardcoded GEAR list). Empty/missing entries fall
  // back to the code's own default product photo, so nothing breaks until Naveed uploads his
  // own designed image for a given item.
  gearImages:{name:string;img:string}[];
  bankTransferInstructions:string;
  // Generic hosted "Pay Online" link (Mamo / Tap / Stripe Payment Link / anything similar)
  // Naveed pastes in once he sets up a merchant account -- when empty, the "Pay Online"
  // booking option stays disabled ("Available soon") exactly as before, so nothing changes
  // for anyone until this is actually configured. Reuses the existing "paypal" method value
  // already wired into the appointments/payments tables (bkPayMethod, createAppointment) --
  // no schema/DB change, just makes that long-planned slot real instead of a placeholder.
  paymentLinkUrl:string;
};
// btn1Link/btn2Link (both optional): a custom destination for each Hero CTA button, pasted by
// the admin -- a full URL (https://...) opens in a new tab, anything else (e.g. /contact or
// /packages) is treated as an internal page path and navigated to directly. Blank/undefined
// keeps the existing behavior exactly as before (btn1 -> the slide's own `page`, btn2 -> the
// booking flow), so shipping this makes zero visual/behavioral change until an admin sets one.
type HeroSlide = { label:string;headline:string;sub:string;btn1:string;btn2:string;img:string;page:string;btn1Link?:string;btn2Link?:string; };

// ─── LANGUAGE SWITCHER ────────────────────────────────────────────────────────
// Translates the fixed site chrome only -- nav labels, the book/WhatsApp buttons, and the
// contact form. CMS-authored long-form content (hero headlines, about bio, services, CV,
// blog posts, package descriptions) stays in whichever language Naveed wrote it in; adding
// real per-field translations for that content is a separate, larger step once he has
// translated text to paste in, rather than machine-translating his bio/CV on the fly.
type Lang = "en"|"ar"|"fr"|"ru"|"zh"|"de"|"es"|"it"|"tr"|"hi"|"ur"|"tl";
// Chosen for who actually visits/exhibits in the UAE: Germany, Spain, Italy and Turkey are
// among the most frequent European/exhibition-visitor nationalities at Dubai trade shows;
// Hindi and Urdu cover the two largest expat communities in the UAE; Filipino covers the
// next-largest. Arabic/French/Russian/Chinese were added earlier for the same reason.
const LANGS: {code:Lang;label:string;flag:string;rtl?:boolean}[] = [
  {code:"en",label:"English",flag:"🇬🇧"},
  {code:"ar",label:"العربية",flag:"🇦🇪",rtl:true},
  {code:"fr",label:"Français",flag:"🇫🇷"},
  {code:"ru",label:"Русский",flag:"🇷🇺"},
  {code:"zh",label:"中文",flag:"🇨🇳"},
  {code:"de",label:"Deutsch",flag:"🇩🇪"},
  {code:"es",label:"Español",flag:"🇪🇸"},
  {code:"it",label:"Italiano",flag:"🇮🇹"},
  {code:"tr",label:"Türkçe",flag:"🇹🇷"},
  {code:"hi",label:"हिन्दी",flag:"🇮🇳"},
  {code:"ur",label:"اردو",flag:"🇵🇰",rtl:true},
  {code:"tl",label:"Filipino",flag:"🇵🇭"},
];
const UI_STRINGS: Record<Lang,{
  home:string;work:string;about:string;packages:string;journal:string;cv:string;booking:string;contact:string;
  bookBtn:string;whatsappBtn:string;
  reachingOut:string;chipGeneral:string;chipCollab:string;chipMedia:string;chipPress:string;
  formName:string;formEmail:string;formPhone:string;formSubject:string;formMessage:string;
  formSend:string;formSending:string;formThanks:string;
}> = {
  en:{home:"Home",work:"Work",about:"About",packages:"Packages",journal:"Journal",cv:"CV",booking:"Booking",contact:"Contact",
    bookBtn:"Book a Project",whatsappBtn:"WhatsApp Us",
    reachingOut:"I'm reaching out about",chipGeneral:"General Inquiry",chipCollab:"Collaboration",chipMedia:"Media Partnership",chipPress:"Press",
    formName:"Your name *",formEmail:"Your email *",formPhone:"Phone / WhatsApp",formSubject:"Subject / Company or brand name",formMessage:"Tell us about your project, collaboration idea or partnership proposal *",
    formSend:"Send Message",formSending:"Sending…",formThanks:"Thanks -- your message has been received. Naveed will get back to you shortly."},
  ar:{home:"الرئيسية",work:"أعمالنا",about:"من نحن",packages:"الباقات",journal:"المجلة",cv:"السيرة الذاتية",booking:"الحجز",contact:"تواصل معنا",
    bookBtn:"احجز مشروعك",whatsappBtn:"واتساب",
    reachingOut:"سبب التواصل",chipGeneral:"استفسار عام",chipCollab:"تعاون",chipMedia:"شراكة إعلامية",chipPress:"صحافة",
    formName:"الاسم *",formEmail:"البريد الإلكتروني *",formPhone:"الهاتف / واتساب",formSubject:"الموضوع / اسم الشركة",formMessage:"أخبرنا عن مشروعك أو فكرة التعاون *",
    formSend:"إرسال",formSending:"جاري الإرسال…",formThanks:"شكرًا -- تم استلام رسالتك وسيتواصل نافيد معك قريبًا."},
  fr:{home:"Accueil",work:"Travaux",about:"À propos",packages:"Forfaits",journal:"Journal",cv:"CV",booking:"Réservation",contact:"Contact",
    bookBtn:"Réserver un projet",whatsappBtn:"WhatsApp",
    reachingOut:"Je vous contacte au sujet de",chipGeneral:"Demande générale",chipCollab:"Collaboration",chipMedia:"Partenariat média",chipPress:"Presse",
    formName:"Votre nom *",formEmail:"Votre e-mail *",formPhone:"Téléphone / WhatsApp",formSubject:"Sujet / Nom de l'entreprise",formMessage:"Parlez-nous de votre projet ou idée de collaboration *",
    formSend:"Envoyer",formSending:"Envoi…",formThanks:"Merci -- votre message a été reçu. Naveed vous répondra bientôt."},
  ru:{home:"Главная",work:"Работы",about:"О нас",packages:"Пакеты",journal:"Журнал",cv:"Резюме",booking:"Бронирование",contact:"Контакты",
    bookBtn:"Заказать проект",whatsappBtn:"WhatsApp",
    reachingOut:"Причина обращения",chipGeneral:"Общий вопрос",chipCollab:"Сотрудничество",chipMedia:"Медиапартнёрство",chipPress:"Пресса",
    formName:"Ваше имя *",formEmail:"Ваш email *",formPhone:"Телефон / WhatsApp",formSubject:"Тема / Название компании",formMessage:"Расскажите о своём проекте или идее сотрудничества *",
    formSend:"Отправить",formSending:"Отправка…",formThanks:"Спасибо -- ваше сообщение получено. Навид свяжется с вами в ближайшее время."},
  zh:{home:"首页",work:"作品",about:"关于",packages:"套餐",journal:"期刊",cv:"简历",booking:"预约",contact:"联系我们",
    bookBtn:"预约项目",whatsappBtn:"WhatsApp",
    reachingOut:"联系原因",chipGeneral:"一般咨询",chipCollab:"合作",chipMedia:"媒体合作",chipPress:"新闻媒体",
    formName:"您的姓名 *",formEmail:"您的邮箱 *",formPhone:"电话 / WhatsApp",formSubject:"主题 / 公司或品牌名称",formMessage:"请告诉我们您的项目或合作想法 *",
    formSend:"发送信息",formSending:"发送中…",formThanks:"谢谢——我们已收到您的信息，Naveed 会尽快与您联系。"},
  de:{home:"Startseite",work:"Arbeiten",about:"Über uns",packages:"Pakete",journal:"Journal",cv:"Lebenslauf",booking:"Buchung",contact:"Kontakt",
    bookBtn:"Projekt buchen",whatsappBtn:"WhatsApp uns",
    reachingOut:"Ich kontaktiere Sie bezüglich",chipGeneral:"Allgemeine Anfrage",chipCollab:"Zusammenarbeit",chipMedia:"Medienpartnerschaft",chipPress:"Presse",
    formName:"Ihr Name *",formEmail:"Ihre E-Mail *",formPhone:"Telefon / WhatsApp",formSubject:"Betreff / Firmenname",formMessage:"Erzählen Sie uns von Ihrem Projekt, Ihrer Kollaborationsidee oder Partnerschaftsanfrage *",
    formSend:"Nachricht senden",formSending:"Wird gesendet…",formThanks:"Danke -- Ihre Nachricht wurde empfangen. Naveed wird sich in Kürze bei Ihnen melden."},
  es:{home:"Inicio",work:"Trabajos",about:"Sobre nosotros",packages:"Paquetes",journal:"Revista",cv:"CV",booking:"Reserva",contact:"Contacto",
    bookBtn:"Reservar un proyecto",whatsappBtn:"Escríbenos por WhatsApp",
    reachingOut:"Me pongo en contacto sobre",chipGeneral:"Consulta general",chipCollab:"Colaboración",chipMedia:"Asociación de medios",chipPress:"Prensa",
    formName:"Tu nombre *",formEmail:"Tu correo electrónico *",formPhone:"Teléfono / WhatsApp",formSubject:"Asunto / Nombre de la empresa",formMessage:"Cuéntanos sobre tu proyecto, idea de colaboración o propuesta de asociación *",
    formSend:"Enviar mensaje",formSending:"Enviando…",formThanks:"Gracias -- tu mensaje ha sido recibido. Naveed se pondrá en contacto contigo pronto."},
  it:{home:"Home",work:"Lavori",about:"Chi siamo",packages:"Pacchetti",journal:"Giornale",cv:"CV",booking:"Prenotazione",contact:"Contatti",
    bookBtn:"Prenota un progetto",whatsappBtn:"Scrivici su WhatsApp",
    reachingOut:"Ti scrivo riguardo a",chipGeneral:"Richiesta generale",chipCollab:"Collaborazione",chipMedia:"Partnership media",chipPress:"Stampa",
    formName:"Il tuo nome *",formEmail:"La tua email *",formPhone:"Telefono / WhatsApp",formSubject:"Oggetto / Nome dell'azienda",formMessage:"Raccontaci del tuo progetto, idea di collaborazione o proposta di partnership *",
    formSend:"Invia messaggio",formSending:"Invio…",formThanks:"Grazie -- il tuo messaggio è stato ricevuto. Naveed ti risponderà a breve."},
  tr:{home:"Ana Sayfa",work:"Çalışmalar",about:"Hakkımızda",packages:"Paketler",journal:"Dergi",cv:"Özgeçmiş",booking:"Rezervasyon",contact:"İletişim",
    bookBtn:"Proje Rezervasyonu Yap",whatsappBtn:"WhatsApp'tan Yazın",
    reachingOut:"Şu konuda iletişime geçiyorum",chipGeneral:"Genel Soru",chipCollab:"İş Birliği",chipMedia:"Medya Ortaklığı",chipPress:"Basın",
    formName:"Adınız *",formEmail:"E-posta adresiniz *",formPhone:"Telefon / WhatsApp",formSubject:"Konu / Şirket veya marka adı",formMessage:"Projeniz, iş birliği fikriniz veya ortaklık teklifiniz hakkında bize bilgi verin *",
    formSend:"Mesaj Gönder",formSending:"Gönderiliyor…",formThanks:"Teşekkürler -- mesajınız alındı. Naveed en kısa sürede size dönüş yapacak."},
  hi:{home:"होम",work:"कार्य",about:"परिचय",packages:"पैकेज",journal:"जर्नल",cv:"सीवी",booking:"बुकिंग",contact:"संपर्क करें",
    bookBtn:"प्रोजेक्ट बुक करें",whatsappBtn:"व्हाट्सएप करें",
    reachingOut:"मैं इस बारे में संपर्क कर रहा/रही हूँ",chipGeneral:"सामान्य पूछताछ",chipCollab:"सहयोग",chipMedia:"मीडिया साझेदारी",chipPress:"प्रेस",
    formName:"आपका नाम *",formEmail:"आपका ईमेल *",formPhone:"फ़ोन / व्हाट्सएप",formSubject:"विषय / कंपनी या ब्रांड का नाम",formMessage:"अपने प्रोजेक्ट, सहयोग विचार या साझेदारी प्रस्ताव के बारे में बताएं *",
    formSend:"संदेश भेजें",formSending:"भेजा जा रहा है…",formThanks:"धन्यवाद -- आपका संदेश प्राप्त हो गया है। नावीद शीघ्र ही आपसे संपर्क करेंगे।"},
  ur:{home:"صفحہ اول",work:"کام",about:"ہمارے بارے میں",packages:"پیکجز",journal:"جرنل",cv:"سی وی",booking:"بکنگ",contact:"رابطہ کریں",
    bookBtn:"پراجیکٹ بک کریں",whatsappBtn:"واٹس ایپ کریں",
    reachingOut:"میں اس بارے میں رابطہ کر رہا/رہی ہوں",chipGeneral:"عام استفسار",chipCollab:"تعاون",chipMedia:"میڈیا شراکت",chipPress:"پریس",
    formName:"آپ کا نام *",formEmail:"آپ کا ای میل *",formPhone:"فون / واٹس ایپ",formSubject:"موضوع / کمپنی یا برانڈ کا نام",formMessage:"اپنے پراجیکٹ، تعاون کے آئیڈیا یا شراکت کی تجویز کے بارے میں بتائیں *",
    formSend:"پیغام بھیجیں",formSending:"بھیجا جا رہا ہے…",formThanks:"شکریہ -- آپ کا پیغام موصول ہو گیا ہے۔ نوید جلد آپ سے رابطہ کریں گے۔"},
  tl:{home:"Home",work:"Mga Trabaho",about:"Tungkol Sa Amin",packages:"Mga Package",journal:"Journal",cv:"CV",booking:"Booking",contact:"Makipag-ugnayan",
    bookBtn:"I-book ang Proyekto",whatsappBtn:"Mag-WhatsApp sa Amin",
    reachingOut:"Nakikipag-ugnayan ako tungkol sa",chipGeneral:"Pangkalahatang Tanong",chipCollab:"Collaboration",chipMedia:"Media Partnership",chipPress:"Press",
    formName:"Ang iyong pangalan *",formEmail:"Ang iyong email *",formPhone:"Telepono / WhatsApp",formSubject:"Paksa / Pangalan ng kompanya o brand",formMessage:"Sabihin sa amin ang tungkol sa iyong proyekto, ideya sa collaboration, o panukalang partnership *",
    formSend:"Ipadala ang Mensahe",formSending:"Ipinapadala…",formThanks:"Salamat -- natanggap na ang iyong mensahe. Makikipag-ugnayan sa iyo si Naveed sa lalong madaling panahon."},
};
// Maps a footerLinks/NAV_LINKS page key to its UI_STRINGS translation key (a few names differ,
// e.g. "blog" the page vs "journal" the label).
const PAGE_LABEL_KEY: Record<string,keyof typeof UI_STRINGS["en"]> = {work:"work",about:"about",packages:"packages",blog:"journal",cv:"cv",booking:"booking",contact:"contact"};

// Google Translate translates whatever text it finds, including proper nouns -- a person's
// or brand's NAME has no "meaning" to preserve, so machine translation can turn "Naveed
// Anjum" into an unrelated string of characters that happens to translate the individual
// words. translate="no" (and the matching notranslate class, which is the attribute Google's
// widget actually looks for) tells it to leave this exact text alone in every language,
// same as it already leaves "WhatsApp"/"Instagram" alone as recognized brand terms.
const NoTranslate=({children}:{children:React.ReactNode})=><span translate="no" className="notranslate">{children}</span>;

// ─── DEFAULTS ───────────────────────────────────────────────────────────────
const DEF_SETTINGS: SiteSettings = {
  pin:"1913", siteName:"Naveed Anjum", siteTagline:"Photography & Cinematography",
  siteDescription:"Dubai-based photographer and cinematographer specializing in portrait, landscape, commercial and cinematography.",
  heroSlides:[
    {label:"Photography",headline:"Capturing\nImages With\nPurpose.",sub:"Professional photography for brands, businesses, people and memorable moments.",btn1:"View Photography",btn2:"Start a Project",img:"https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1600&q=90",page:"work"},
    {label:"Videography",headline:"Stories\nTold Through\nMotion.",sub:"Professional video production for corporate, commercial, events and social media.",btn1:"View Videography",btn2:"Book a Session",img:"https://images.unsplash.com/photo-1632187981988-40f3cbaeef5e?w=1600&q=90",page:"work"},
    {label:"Commercial",headline:"Visuals\nDesigned to Elevate\nYour Brand.",sub:"Creative photography and video content for modern businesses and campaigns.",btn1:"Explore Projects",btn2:"",img:"https://images.unsplash.com/photo-1705412238984-8bb35d443964?w=1600&q=90",page:"work"},
    {label:"Events",headline:"Professional\nCoverage. Powerful\nVisuals.",sub:"Photography and videography for corporate events, exhibitions and conferences.",btn1:"View Events",btn2:"",img:"https://images.unsplash.com/photo-1583012802443-efc6e8b00f5f?w=1600&q=90",page:"work"},
  ],
  aboutName:"Naveed Anjum", aboutTitle:"Photographer · Cinematographer · Creative Director",
  aboutBio:"A Dubai-based photographer and cinematographer with over 20 years of experience -- including 10 years based in the UAE -- crafting luxury visual content for high-end clients. Founder of Creative Fusion, specializing in interior, real estate, product, lifestyle and campaign photography, plus short-form video content for Instagram and TikTok, with a refined eye for composition and brand-consistent visual storytelling across luxury residential and hospitality spaces.",
  aboutPhoto:"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80",
  statsYears:"20+", statsProjects:"500+", statsClients:"200+",
  phone:"+971 581 174 911", email:"creativeeyeuae@gmail.com", waNumber:"971581174911",
  waMsg:"Hello Naveed, I visited your portfolio and would like to discuss a project.",
  location:"Dubai, UAE", address:"Downtown Dubai, UAE",
  instagram:"https://www.instagram.com/bynaveedanjum/", youtube:"https://youtube.com/@creativeeyeuae", linkedin:"https://linkedin.com/in/naveedanjumch", tiktok:"",
  footerCopyright:"© 2026 Naveed Anjum · Creative Fusion · Dubai, UAE",
  footerLinks:[{label:"Work",page:"work"},{label:"About",page:"about"},{label:"Packages",page:"packages"},{label:"CV",page:"cv"},{label:"Booking",page:"booking"},{label:"Contact",page:"contact"}],
  seoTitle:"Naveed Anjum — Professional Photographer & Videographer Dubai",
  seoDesc:"Professional photographer and videographer in Dubai, UAE. 20+ years experience in portrait, commercial, real estate, events and cinematography.",
  googlePlaceId:"", googleReviewsEnabled:false,
  videoSectionEnabled:false, videoSectionUrl:"", videoSectionTitle:"Luxury Villa Shoot", videoSectionSubtitle:"Featured Project",
  imagePermissionEnabled:true,
  popupEnabled:true, popupDelaySec:20,
  popupTitle:"Let's Talk About Your Project",
  popupText:"Leave your number and Naveed will personally get back to you to discuss your photography or videography needs -- no obligation.",
  popupCtaLabel:"Request a Callback",
  emailjsServiceId:"", emailjsTemplateId:"", emailjsPublicKey:"",
  theme:{P:"#8B5CF6",PL:"#E2D9F3",PD:"#A855F7",GOLD:"#8B5CF6",GOLDL:"#A855F7",BG:"#09060E",FG:"#FFFFFF",MID:"#A892C6",DARK:"#140D21",BORDER:"#2D1F45",LT:"#F8F6FC",LTCARD:"#FFFFFF",LTBORDER:"rgba(139,92,246,0.14)",INKMID:"#6E6480"},
  uiText:{
    navBookBtn:"Book a Project", footerWhatsappBtn:"WhatsApp Us",
    homeServicesEyebrow:"What We Offer", homeServicesTitle:"Services", homeServicesIntro:"Every project is shaped around the brand or story behind it -- from first concept to final delivery.",
    homeWorkEyebrow:"Selected Work", homeWorkTitle:"Featured Projects", homeWorkViewAll:"View All →",
    homeClientsEyebrow:"Our Clients", homeClientsTitle:"Brands We've Worked With",
    homeTestimonialsEyebrow:"Client Testimonials",
    homeJournalEyebrow:"Journal", homeJournalTitle:"Photography Journal", homeJournalViewAll:"All Posts →",
    homeCtaEyebrow:"Ready to create?", homeCtaTitle:"Book Your Session", homeCtaBookBtn:"Book Now", homeCtaWaBtn:"WhatsApp",
    workBannerEyebrow:"Portfolio", workBannerTitle:"Selected Work",
    aboutBannerEyebrow:"About", aboutBannerTitle:"About",
    packagesBannerEyebrow:"Packages", packagesBannerTitle:"Your Investment",
    blogBannerEyebrow:"Journal", blogBannerTitle:"Photography Journal",
    cvBannerEyebrow:"Curriculum Vitae", cvBannerTitle:"CV",
    bookingBannerEyebrow:"Book a Session", bookingBannerTitle:"Let's Create Together",
    contactBannerEyebrow:"Get In Touch", contactBannerTitle:"Let's Work Together",
    gearBannerEyebrow:"Equipment", gearBannerTitle:"Photography & Videography Gear",
  },
  // Unsplash photos as default banner backgrounds for the pages that were blank -- editable/
  // replaceable any time via CMS > Settings > Text & Banners. About and Contact are left blank
  // on purpose (those two routes are off-limits for changes), and Photography/Cinematography
  // don't use sectionBg at all (separate routes, also off-limits). Gear defaults to a real
  // gear photo already used on the page itself so its banner matches Journal/Work/Packages
  // out of the box, same as every other page here.
  sectionBg:{work:"https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=1600&q=80",about:"",packages:"https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1600&q=80",blog:"https://images.unsplash.com/photo-1495707902641-75cac588d2e9?w=1600&q=80",cv:"https://images.unsplash.com/photo-1516387938699-a93567ec168e?w=1600&q=80",booking:"https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=1600&q=80",contact:"",gear:"/gear/sony-a7r-v.jpg"},
  pageEnabled:{work:true,about:true,packages:true,blog:true,cv:true,booking:true,contact:true,gear:true},
  homeSections:{hero:true,intro:true,about:true,services:true,work:true,testimonials:true,journal:true,cta:true},
  heroTypography:{headlineFont:"default",headlineWeight:700,headlineSize:86,headlineSpacing:0.5,headlineItalic:false,headlineColor:"#ffffff",subFont:"default",subWeight:400,subSize:22,subColor:""},
  // Matches the padding/sizes/colors already hardcoded in the card markup, so shipping this
  // makes zero visual change until Naveed adjusts something in CMS > Settings > Packages >
  // Card Style. overlayColor/overlayOpacity control the dark gradient used for legibility when
  // a package has a background photo.
  pricingCardStyle:{
    padTop:28,padRight:28,padBottom:28,padLeft:28,
    titleFont:"default",titleSize:11,titleWeight:700,titleColor:"",titleColorOnPhoto:"#ffffff",
    priceSize:44,priceColor:"",priceColorOnPhoto:"#ffffff",
    descFont:"default",descSize:13,descColor:"",descColorOnPhoto:"rgba(255,255,255,0.92)",
    overlayColor:"20,13,33",overlayOpacity:0.6,
  },
  // Starter examples only -- placeholder names/prices for Naveed to replace with real ones in
  // CMS > Settings > Packages. Not real published pricing.
  pricingPackages:[
    {id:"pp1",icon:"📸",label:"Essential Package",price:"1,500",priceNote:"Starting price · half-day session",desc:"Perfect for individuals and small businesses needing high-quality photography for portraits, products or short social content shoots.",image:"",ctaLabel:"Enquire Now",
      features:["Half-day shoot (up to 4 hours)","20 professionally edited images","High-resolution digital gallery","Commercial usage license","5-day turnaround"]},
    {id:"pp2",icon:"🎬",label:"Premium Package",price:"3,500",priceNote:"Starting price · full-day production",desc:"Ideal for brands and creators who need a complete mix of photography and videography for campaigns, events or content libraries.",image:"",ctaLabel:"Enquire Now",
      features:["Full-day shoot (up to 8 hours)","40 professionally edited images","1 edited highlight video (60–90s)","High-resolution digital gallery","Commercial usage license","3-day turnaround"]},
    {id:"pp3",icon:"✨",label:"Signature Package",price:"7,500",priceNote:"Starting price · multi-day production",desc:"A full creative production for weddings, luxury brands and major campaigns -- photography, cinematography and post-production, end to end.",image:"",ctaLabel:"Enquire Now",
      features:["Multi-day production","80+ professionally edited images","Full cinematic video edit","Dedicated creative direction","Commercial usage license","Priority 48-hour turnaround"]},
  ],
  services:[
    {id:"s1",icon:"📷",title:"Photography",desc:"Commercial, corporate, real estate, product, events and lifestyle photography.",detail:"From concept to final delivery, every shoot is approached with precision, creativity and an eye for storytelling.",deliverables:["High-resolution edited images","Color graded gallery","Commercial license","Fast turnaround"]},
    {id:"s2",icon:"🎬",title:"Videography",desc:"Corporate films, commercial videos, events, social media and promotional content.",detail:"Professional video production with cinematic quality for corporate and commercial clients.",deliverables:["4K video footage","Professional editing","Color grading","Music licensing"]},
    {id:"s3",icon:"✨",title:"Content Creation",desc:"Professional photography and video content for brands and social media.",detail:"Consistent, high-quality content packages designed to elevate your brand across all platforms.",deliverables:["Monthly content packages","Social media formats","Brand guidelines adherence","Quick turnaround"]},
    {id:"s4",icon:"🎨",title:"Creative Production",desc:"Complete visual content from concept and shooting to editing and delivery.",detail:"End-to-end creative production from initial concept development through to final delivery.",deliverables:["Concept development","Full production","Post-production","Multiple formats"]},
  ],
  // Placeholder for the tall photo beside the Services list -- replace via CMS > Settings >
  // Services (upload or paste a URL). Defaults to the About photo just so the section isn't
  // ever a blank box; the two are independent fields, changing one doesn't affect the other.
  servicesImage:"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80",
  // DUMMY data for testing/review only -- clearly-labeled "Client One..Four" placeholders with
  // generated placeholder-wordmark logos (not real logos, not any real brand). Naveed replaces
  // every name/logo via CMS > Settings > Clients (add/edit/remove/reorder/upload, toggle the
  // whole section on or off with clientsEnabled) once he has real clients cleared to display.
  clientsEnabled:true,
  clients:[
    {id:"cl1",name:"Client One",logo:"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='48'%3E%3Crect width='160' height='48' rx='6' fill='%231a1a2e' stroke='%238B5CF6'/%3E%3Ctext x='80' y='29' font-family='Arial,sans-serif' font-size='13' font-weight='700' letter-spacing='1' fill='%23E2D9F3' text-anchor='middle'%3ECLIENT ONE%3C/text%3E%3C/svg%3E"},
    {id:"cl2",name:"Client Two",logo:"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='48'%3E%3Crect width='160' height='48' rx='6' fill='%231a1a2e' stroke='%23A855F7'/%3E%3Ctext x='80' y='29' font-family='Arial,sans-serif' font-size='13' font-weight='700' letter-spacing='1' fill='%23E2D9F3' text-anchor='middle'%3ECLIENT TWO%3C/text%3E%3C/svg%3E"},
    {id:"cl3",name:"Client Three",logo:"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='48'%3E%3Crect width='160' height='48' rx='6' fill='%231a1a2e' stroke='%238B5CF6'/%3E%3Ctext x='80' y='29' font-family='Arial,sans-serif' font-size='12' font-weight='700' letter-spacing='1' fill='%23E2D9F3' text-anchor='middle'%3ECLIENT THREE%3C/text%3E%3C/svg%3E"},
    {id:"cl4",name:"Client Four",logo:"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='48'%3E%3Crect width='160' height='48' rx='6' fill='%231a1a2e' stroke='%23A855F7'/%3E%3Ctext x='80' y='29' font-family='Arial,sans-serif' font-size='13' font-weight='700' letter-spacing='1' fill='%23E2D9F3' text-anchor='middle'%3ECLIENT FOUR%3C/text%3E%3C/svg%3E"},
  ] as {id:string;name:string;logo:string}[],
  cvSections:[
    {title:"Profile",content:"Dubai-based photographer and cinematographer with over 20 years of experience crafting luxury visual content for high-end clients, including 10 years of UAE-based experience. Founder of Creative Fusion, a premium photography and cinematography brand. Skilled in interior, real estate, product, lifestyle and campaign photography, and short-form video content for Instagram and TikTok, with a refined eye for composition and brand-consistent visual storytelling across luxury residential and hospitality spaces."},
    {title:"Creative Expertise",content:"Trained graphic artist with a strong grounding in brand development, typography, imaging and grid-based design systems, built through years of designing across print, digital and social platforms. Applies this design foundation to content that drives measurable results using consistent visual identity, strategic composition and platform-native storytelling to increase engagement, build audience trust and generate qualified leads through organic and campaign content."},
    {title:"Media Manager (Contract) — Earthlink Real Estate, Dubai · Jun 2026 – Present",content:"Overseeing media production management and photography, supporting the sales team and real estate agents with marketing content. Creates tailored content for individual agents, conducts on-site photo and video shoots at properties and development offices, and produces visuals for listings, campaigns and client presentations."},
    {title:"Photographer, Videographer & Brand/Social Media Specialist — Creative Fusion LLC, Dubai · Jan 2024 – Present",content:"Founder and creative lead delivering end-to-end visual and brand solutions: interior, architectural, real estate, event, lifestyle, portrait, product and corporate photography/videography with cinematic storytelling, including luxury residential interiors and hospitality spaces. Directs full production workflows from concept through delivery, designs logos and branding kits, and manages social media strategy and campaigns across Instagram, LinkedIn and Facebook."},
    {title:"Creative Director (Freelance, Part-Time) — Robus Shelters, Canada (Hybrid) · May 2020 – Present",content:"Providing creative direction on a freelance, part-time basis alongside his primary role, working hybrid with a Canada-based team."},
    {title:"Head of Design Department — Bait Al Nokhada Tents & Fabric Shade LLC, Dubai · May 2016 – May 2024",content:"Led photography, videography, graphic design and visual branding for the company. Supported the sales team by designing proposals, marketing materials and presentations; managed teams and coordinated projects."},
    {title:"Web & Graphic Designer — DigitalSofts, Faisalabad, Pakistan · Jan 2007 – Jun 2016",content:"Delivered web and graphic design work using Adobe Photoshop, Adobe Illustrator and related tools."},
    {title:"Education",content:"2-Year Diploma in Video Production — IMedia University, Pakistan  ·  Bachelor of Fine Arts — Government College University, Faisalabad, Pakistan  ·  Diploma in Graphic Design — Mac Computer College, Pakistan"},
    {title:"Recognition",content:"Sony Alpha Approved Content Creator"},
    {title:"Beyond the Work",content:"Music · Traveling · Fine Arts · Fashion · Cinema"},
  ],
  skills:[
    {dept:"Creative Skills",items:["Cinematic Storytelling","Brand & Visual Identity Design","Typography & Grid-Based Design Systems","Creative Direction","Social Media Strategy"]},
    {dept:"Technical Skills",items:["Drone Piloting","Interior & Architectural Photography","Product Photography","Short-Form Video (Reels/TikTok/Instagram/YouTube)"]},
    {dept:"Equipment",items:["Sony Alpha Series","Canon EOS R","DJI Drone Systems","Profoto Studio Lighting","Godox Location Lighting","Gimbals","Aputure LED"]},
    {dept:"Software",items:["Adobe Photoshop","Adobe Lightroom","Adobe Premiere Pro","Final Cut Pro","Sony Vegas","DaVinci Resolve","CorelDRAW"]},
    {dept:"AI & Creative Tools",items:["ChatGPT","Google AI Studio","Versal AI Tools","CapCut","CapCut Template Creator","Adobe Template Designer"]},
    {dept:"Languages",items:["English","Urdu","Punjabi","Hindi","Arabic (Basic)"]},
  ],
  gearImages:[],
  bankTransferInstructions:"",
  paymentLinkUrl:"",
};

// Exact item names from frontend/app/gear/page.tsx's own hardcoded GEAR list (name/desc/
// features/category stay code-controlled -- only the photo is CMS-editable here), grouped
// the same way that page groups them, purely so this settings screen reads in a sensible
// order. Editing this list does not change the live /gear page; it only has to match those
// names exactly for an uploaded photo to be picked up.
const GEAR_PHOTO_SECTIONS: {label:string;items:string[]}[] = [
  {label:"Camera",items:["Sony α7R V"]},
  {label:"Lenses",items:["Sony FE 24–70mm F2.8 GM II","Sony FE 70–200mm F2.8 GM II"]},
  {label:"Lighting",items:["Godox V1","4× Godox Receivers","Amaran 300c","2× GVM RGB LED Panels","105 cm Softbox","80 cm Softbox / Light Box"]},
  {label:"Stabilization",items:["DJI RS 3","DJI Osmo Mobile"]},
  {label:"Action & 360 Cameras",items:["DJI Osmo Action 4","Insta360 X4"]},
  {label:"Computer / Editing",items:["Alienware m15 R5"]},
];

const DEF_PROJECTS: Project[] = [
  // DUMMY placeholder projects/testimonials for design review -- deliberately generic
  // "Client One".."Client Six" names (never a real company) per the standing no-invented-
  // content rule. A couple of earlier entries here used real UAE company names (Emaar
  // Properties, Visit Dubai) by mistake; replaced with generic placeholders. Replace freely
  // via CMS > Projects / Testimonials once Naveed has real case studies.
  {id:"p1",title:"Sample Project One",slug:"sample-project-one",categories:["Landscape Photography"],description:"Aerial and ground-level landscape captures -- placeholder project for design review.",fullDescription:"",clientName:"Client One",location:"Dubai, UAE",projectDate:"2026-01-15",tags:["landscape"],featured:true,coverImage:"https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&q=80",images:[{url:"https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&q=80",orientation:"landscape"},{url:"https://images.unsplash.com/photo-1582672060674-bc2bd808a8b5?w=800&q=80",orientation:"portrait"},{url:"https://images.unsplash.com/photo-1582672060674-bc2bd808a8b5?w=1200&q=80",orientation:"landscape"}],videos:[],reels:[],youtubeUrl:""},
  {id:"p2",title:"Sample Project Two",slug:"sample-project-two",categories:["Wedding","Portrait Photography"],description:"Intimate portraits in natural light -- placeholder project for design review.",fullDescription:"",clientName:"Client Two",location:"Abu Dhabi",projectDate:"2026-02-20",tags:["wedding","portrait"],featured:true,coverImage:"https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=80",images:[{url:"https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=80",orientation:"landscape"}],videos:[],reels:[],youtubeUrl:""},
  {id:"p3",title:"Sample Project Three",slug:"sample-project-three",categories:["Commercial","Editorial"],description:"Premium commercial photography -- placeholder project for design review.",fullDescription:"",clientName:"Client Three",location:"DIFC, Dubai",projectDate:"2026-03-10",tags:["commercial"],featured:true,coverImage:"https://images.unsplash.com/photo-1705412238984-8bb35d443964?w=1200&q=80",images:[{url:"https://images.unsplash.com/photo-1705412238984-8bb35d443964?w=1200&q=80",orientation:"landscape"}],videos:[],reels:[],youtubeUrl:""},
  {id:"p4",title:"Sample Project Four",slug:"sample-project-four",categories:["Real Estate Photography","Architecture & Interior"],description:"Interior/architecture photography -- placeholder project for design review.",fullDescription:"",clientName:"Client Four",location:"Dubai, UAE",projectDate:"2026-04-05",tags:["real-estate","interior"],featured:true,coverImage:"https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80",images:[{url:"https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80",orientation:"landscape"},{url:"https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80",orientation:"landscape"}],videos:[],reels:[],youtubeUrl:""},
  {id:"p5",title:"Sample Project Five",slug:"sample-project-five",categories:["Fashion","Editorial"],description:"Editorial fashion shoot -- placeholder project for design review.",fullDescription:"",clientName:"Client Five",location:"Dubai, UAE",projectDate:"2026-05-12",tags:["fashion","editorial"],featured:true,coverImage:"https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200&q=80",images:[{url:"https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200&q=80",orientation:"portrait"}],videos:[],reels:[],youtubeUrl:""},
  {id:"p6",title:"Sample Project Six",slug:"sample-project-six",categories:["Product Photography","Commercial"],description:"Studio product photography -- placeholder project for design review.",fullDescription:"",clientName:"Client Six",location:"Dubai, UAE",projectDate:"2026-06-18",tags:["product","studio"],featured:false,coverImage:"https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1200&q=80",images:[{url:"https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1200&q=80",orientation:"landscape"}],videos:[],reels:[],youtubeUrl:""},
];

const DEF_TESTIMONIALS: Testimonial[] = [
  {id:"t1",name:"Client Name One",role:"Marketing Director",company:"Client One",quote:"Naveed's work exceeded our expectations. His ability to capture the essence of our brand through photography is truly exceptional.",featured:true},
  {id:"t2",name:"Client Name Two",role:"CEO",company:"Client Two",quote:"Professional, creative, and always delivers on time. Our corporate event coverage was absolutely stunning.",featured:true},
  {id:"t3",name:"Client Name Three",role:"Brand Manager",company:"Client Three",quote:"Working with Naveed transformed our product photography. The quality speaks for itself.",featured:true},
];

const DEF_BLOG: BlogPost[] = [
  {id:"b1",title:"Best Photography Locations in Dubai 2026",slug:"best-photography-locations-dubai",excerpt:"A professional photographer's guide to the most stunning and photogenic locations across Dubai.",date:"2026-08-01",category:"Tips & Tricks",coverImage:"https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80",content:""},
  {id:"b2",title:"How to Choose a Professional Photographer in Dubai",slug:"choose-photographer-dubai",excerpt:"Everything you need to know before hiring a professional photographer in Dubai.",date:"2026-07-15",category:"Client Guides",coverImage:"https://images.unsplash.com/photo-1705412238984-8bb35d443964?w=800&q=80",content:""},
];
// Journal category taxonomy -- CMS-editable (same reusable list pattern as project DEF_CATS),
// so these are a sensible starting structure, not a hardcoded enum Naveed is locked into.
const DEF_BLOG_CATS = ["Tips & Tricks","Camera Settings & Gear","Behind the Scenes & Video","Client Guides"];

const DEF_CATS = ["Portrait Photography","Landscape Photography","Fashion","Commercial","Real Estate","Architecture & Interior","Events","Wedding","Editorial","Product Photography","Food Photography","Automotive","Travel","Cinematography","Social Media Reels"];
const BOOKING_SERVICES = ["Photography","Videography","Photography + Videography","Cinematography","Social Media Content","Event Coverage","Real Estate Photography","Product Photography","Fashion Photography","Corporate Photography"];
const TIMES = ["9:00 AM","10:00 AM","11:00 AM","12:00 PM","1:00 PM","2:00 PM","3:00 PM","4:00 PM","5:00 PM","6:00 PM"];

// ─── HELPERS ────────────────────────────────────────────────────────────────
const getYTId = (url:string) => { if(!url) return null; const m=url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([^&\n?#]+)/); return m?.[1]??null; };
const slugify = (s:string) => s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
const detectOrientation = (url:string):Promise<string> => new Promise(res=>{ const i=new Image(); i.onload=()=>res(i.width>=i.height?"landscape":"portrait"); i.onerror=()=>res("landscape"); i.src=url; });
// Bump this whenever a code-level content fix (corrected image, copy, etc.) needs to reach
// browsers that already cached the old data in localStorage. On mismatch we clear the cached
// CMS keys once so the browser re-reads the shipped defaults below -- any admin edits made
// through the CMS since the last bump are what gets reset, so bump only when a real content
// fix needs to override stale caches, not on every deploy.
const DATA_VERSION = 6;
let _dataVersionChecked = false;
function ensureFreshData() {
  if (_dataVersionChecked || typeof window === "undefined") return;
  _dataVersionChecked = true;
  try {
    if (localStorage.getItem("nap_data_v") !== String(DATA_VERSION)) {
      ["nap_settings","nap_projects","nap_cats","nap_testimonials","nap_blog","nap_blogcats"].forEach(k=>localStorage.removeItem(k));
      localStorage.setItem("nap_data_v", String(DATA_VERSION));
    }
  } catch {}
}
const ls = <T,>(k:string,d:T):T => { if(typeof window==="undefined") return d; ensureFreshData(); try{ const s=localStorage.getItem(k); return s?JSON.parse(s):d; }catch{ return d; } };

// ─── CLOUD SYNC (Supabase) ──────────────────────────────────────────────────
// The CMS panel is edited from whatever browser/device the person happens to be
// using, but its data previously lived only in that browser's localStorage --
// invisible to every other visitor and even to the same person on another
// device. This mirrors the CMS's five data blobs into the site's own existing
// `site_settings` key/value table (the same live Supabase project/table the
// separate admin dashboard already uses) under their own dedicated keys, so a
// save/upload here becomes visible to everyone, everywhere, immediately --
// while localStorage and the code defaults above remain as instant-paint /
// offline fallbacks if Supabase is ever unreachable.
const _sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const _sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const sb = (_sbUrl && _sbKey) ? _createSupabaseClient(_sbUrl,_sbKey) : null;
// Real role check (migration 0005's user_roles table) for the CMS gate below -- a valid
// Supabase session used to be enough to flip `authed` true regardless of who it belonged
// to; now it only counts as admin access when that account actually holds one of these
// roles. Reads via `sb` (the session-carrying client) so RLS's "read your own roles only"
// policy resolves against the signed-in user -- never leaks anyone else's roles.
async function hasAdminAccess(): Promise<boolean> {
  if(!sb) return false;
  try {
    const { data, error } = await sb.from("user_roles").select("role");
    if(error || !data) return false;
    return data.some((r:{role:string})=>["admin","staff","super_admin"].includes(r.role));
  } catch { return false; }
}
// Dedicated client for the CMS's own content saves (the six nap_* keys below), kept
// completely separate from `sb` on purpose. `sb` picks up the real admin's Supabase Auth
// session once they sign in (see adminSignIn/onAuthStateChange) and from that point sends
// every request as that authenticated user rather than the site's public anon key --
// which is what was silently breaking every CMS save after the move to real admin logins
// (an authenticated user is a different Postgres role than anon, and this table's access
// was granted to anon, not to authenticated). `sbData` never holds a session
// (persistSession:false), so it always talks to Supabase the same proven way the public
// booking form, contact form and like counter already do successfully -- no RLS change
// needed, nothing about who can write this table changes, this only fixes which key the
// CMS's own save calls actually send.
const sbData = (_sbUrl && _sbKey) ? _createSupabaseClient(_sbUrl,_sbKey,{auth:{persistSession:false,autoRefreshToken:false}}) : null;
const CLOUD_KEYS = ["nap_settings","nap_projects","nap_cats","nap_testimonials","nap_blog","nap_blogcats"] as const;
async function fetchCloudData(): Promise<Partial<Record<typeof CLOUD_KEYS[number],any>>|null> {
  if(!sbData) return null;
  try {
    const {data,error} = await sbData.from("site_settings").select("key,value").in("key",CLOUD_KEYS as unknown as string[]);
    if(error||!data) return null;
    const out:Partial<Record<typeof CLOUD_KEYS[number],any>> = {};
    data.forEach((row:any)=>{ try{ (out as any)[row.key] = JSON.parse(row.value); }catch{} });
    return out;
  } catch { return null; }
}
// Returns whether the save actually reached the server -- callers MUST check this rather than
// assume success, so the CMS never tells the admin "saved" when the change never left this
// browser (that mismatch is exactly what makes one browser show new content and another show
// stale content). Retries once after a short pause before giving up -- a brief network blip on
// the admin's side (a dropped wifi packet, a momentary connection hiccup) shouldn't surface as
// a save failure if the very next attempt would have gone through fine.
async function pushCloudDataOnce(key:typeof CLOUD_KEYS[number], value:any): Promise<boolean> {
  if(!sbData) return false;
  try {
    const {error} = await sbData.from("site_settings").upsert({key,value:JSON.stringify(value)},{onConflict:"key"});
    return !error;
  } catch { return false; }
}
async function pushCloudData(key:typeof CLOUD_KEYS[number], value:any): Promise<boolean> {
  if(await pushCloudDataOnce(key,value)) return true;
  await new Promise(r=>setTimeout(r,1500));
  return pushCloudDataOnce(key,value);
}

// ─── PROJECT LIKES (shared, cross-visitor) ──────────────────────────────────
// Same site_settings key/value table and anon-key upsert pattern as the contact form
// above -- any visitor can write here, not just an authed CMS session -- just under its
// own dedicated key ("nap_project_likes") holding {[projectId]: totalLikes}. This makes
// the like count a real, shared total across everyone who visits, not just this browser.
// No new table/schema change, so it doesn't need a separate DB-migration approval.
async function fetchProjectLikeCounts(): Promise<Record<string,number>> {
  if(!sb) return {};
  try {
    const {data,error} = await sb.from("site_settings").select("value").eq("key","nap_project_likes").maybeSingle();
    if(error||!data) return {};
    try { return JSON.parse(data.value)||{}; } catch { return {}; }
  } catch { return {}; }
}
async function pushProjectLikeCounts(counts:Record<string,number>) {
  if(!sb) return;
  try { await sb.from("site_settings").upsert({key:"nap_project_likes",value:JSON.stringify(counts)},{onConflict:"key"}); } catch {}
}

// ─── BOOKING / APPOINTMENTS (real, paid, shared cross-visitor) ──────────────────────
// Prices always come from the live CMS package (settings.pricingPackages) at the moment of
// booking -- never hard-coded here -- and are snapshotted onto the appointment row so a later
// CMS price change never rewrites a past booking's price. find_or_create_customer and
// is_slot_taken are Postgres RPC functions (security definer) so the public site key can look
// up-or-create a customer by email and check slot availability WITHOUT being able to read
// anyone else's customer/appointment/payment rows -- there is deliberately no anon SELECT
// policy on customers/appointments/payments. Marking a payment PAID/REJECTED/VERIFIED never
// happens from this file -- only the backend admin action (Phase 1 continuation) can do that.
function moneyRound(n:number){ return Math.round((n+Number.EPSILON)*100)/100; }
function parsePackagePrice(p:string): number { const n=parseFloat(String(p||"0").replace(/[^0-9.]/g,"")); return isNaN(n)?0:n; }
function genAppointmentRef(): string { return "CF-"+Math.random().toString(36).slice(2,8).toUpperCase(); }
const TX_FEE_RATE = 0.04;
function calcFee(base:number){ return moneyRound(base*TX_FEE_RATE); }
function calcTotal(base:number){ return moneyRound(base+calcFee(base)); }
async function findOrCreateCustomerId(info:{full_name:string;email:string;phone?:string;whatsapp?:string;company?:string}): Promise<string|null> {
  if(!sb) return null;
  try {
    const {data,error} = await sb.rpc("find_or_create_customer",{
      p_full_name:info.full_name, p_email:info.email, p_phone:info.phone||null, p_whatsapp:info.whatsapp||null, p_company:info.company||null,
    });
    if(error||!data) return null;
    return data as string;
  } catch { return null; }
}
async function isSlotTaken(dateStr:string, timeStr:string): Promise<boolean> {
  if(!sb) return false;
  try {
    const {data,error} = await sb.rpc("is_slot_taken",{p_date:dateStr,p_time:to24h(timeStr)});
    if(error) return false;
    return !!data;
  } catch { return false; }
}
function to24h(t:string): string {
  // "9:00 AM" -> "09:00:00" (TIMES uses 12h labels; DB column is a plain time)
  const m = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if(!m) return t.length===5?`${t}:00`:t;
  let h = parseInt(m[1],10); const min=m[2]; const ap=m[3].toUpperCase();
  if(ap==="PM"&&h!==12) h+=12; if(ap==="AM"&&h===12) h=0;
  return `${String(h).padStart(2,"0")}:${min}:00`;
}
type NewAppointmentInput = {
  customer_id:string; service_key:string; service_name:string; package_id:string; package_name:string;
  price_base:number; booking_date:string; booking_time:string; notes:string; method:"paypal"|"bank_transfer";
};
// Fire-and-forget: tells the server "something just happened, check if it's worth a push
// notification". Never awaited by the caller and never blocks/fails the real action (booking,
// receipt upload, contact form) -- the server re-verifies everything from the database before
// sending anything, so this call can't be used to fake a notification.
function notifyServer(type:"new_booking"|"receipt_uploaded"|"new_lead", id:string) {
  try { fetch("/api/notify/trigger",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type,id})}).catch(()=>{}); } catch {}
}
async function createAppointment(input:NewAppointmentInput): Promise<{id:string;ref:string}|null> {
  if(!sb) return null;
  try {
    const id = crypto.randomUUID();
    const ref = genAppointmentRef();
    const fee = calcFee(input.price_base); const total = calcTotal(input.price_base);
    const status = input.method==="bank_transfer" ? "pending_verification" : "pending_payment";
    const {error:apptErr} = await sb.from("appointments").insert({
      id, appointment_ref:ref, customer_id:input.customer_id, service_key:input.service_key, service_name:input.service_name,
      package_id:input.package_id, package_name:input.package_name, price_base:input.price_base, currency:"AED",
      transaction_fee:fee, total, booking_date:input.booking_date, booking_time:to24h(input.booking_time), notes:input.notes, status,
    });
    if(apptErr){ console.error("[booking] appointment insert failed:",apptErr); return null; }
    const payStatus = input.method==="bank_transfer" ? "under_review" : "pending";
    const {error:payErr} = await sb.from("payments").insert({
      appointment_id:id, method:input.method, base_amount:input.price_base, transaction_fee:fee, total,
      currency:"AED", status:payStatus, provider:input.method==="bank_transfer"?"bank":null,
    });
    if(payErr){ console.error("[booking] payment insert failed:",payErr); return null; }
    return {id,ref};
  } catch(e) { console.error("[booking] createAppointment threw:",e); return null; }
}
async function uploadReceiptFile(file:File, appointmentId:string): Promise<string|null> {
  if(!sb) return null;
  try {
    const ext=(file.name.split(".").pop()||"pdf").toLowerCase().replace(/[^a-z0-9]/g,"")||"pdf";
    const path=`${appointmentId}/${Date.now()}.${ext}`;
    const {error} = await sb.storage.from("receipts").upload(path,file,{contentType:file.type});
    if(error) return null;
    const {error:updErr} = await sb.from("payments").update({receipt_path:path,receipt_status:"submitted",uploaded_at:new Date().toISOString()}).eq("appointment_id",appointmentId);
    if(updErr) return null;
    return path;
  } catch { return null; }
}
function validateReceiptFile(file:File): string|null {
  const ok=["image/jpeg","image/jpg","image/png","application/pdf"];
  if(file.type && !ok.includes(file.type)) return "Please upload a valid payment receipt (JPG, PNG or PDF).";
  if(file.size > 10*1024*1024) return "Receipt file is too large (max 10MB).";
  return null;
}

// ─── CONTACT SUBMISSIONS ────────────────────────────────────────────────────
// Deliberately separate from the CLOUD_KEYS bundle above: those only push when an
// authed CMS session edits site content. A contact-form submission is the opposite --
// any visitor must be able to add one, the same way a real contact-form backend would
// accept an insert from anyone. Stored as its own growing JSON array under a dedicated
// site_settings key, and only ever read back inside the CMS (never loaded into an
// ordinary visitor's browser), so other visitors' names/numbers stay out of localStorage.
type ContactLead = { id:string; date:string; name:string; email:string; phone:string; subject:string; message:string; };
async function fetchContactLeads(): Promise<ContactLead[]> {
  if(!sb) return [];
  try{
    const {data,error}=await sb.from("site_settings").select("value").eq("key","nap_contact_submissions").maybeSingle();
    if(error||!data?.value) return [];
    return JSON.parse(data.value)||[];
  }catch{ return []; }
}
async function addContactLead(entry:ContactLead): Promise<boolean> {
  if(!sb) return false;
  try{
    const existing=await fetchContactLeads();
    const next=[entry,...existing].slice(0,500);
    await sb.from("site_settings").upsert({key:"nap_contact_submissions",value:JSON.stringify(next)},{onConflict:"key"});
    return true;
  }catch{ return false; }
}
async function deleteContactLead(id:string): Promise<boolean> {
  if(!sb) return false;
  try{
    const existing=await fetchContactLeads();
    await sb.from("site_settings").upsert({key:"nap_contact_submissions",value:JSON.stringify(existing.filter(l=>l.id!==id))},{onConflict:"key"});
    return true;
  }catch{ return false; }
}
// Optional: only fires once Naveed has created a free EmailJS account and pasted his own
// Service ID / Template ID / Public Key into CMS > Settings > Contact. Until then this is a
// silent no-op -- the submission is still safely saved above regardless of email.
async function sendEmailNotification(settings:SiteSettings, entry:ContactLead) {
  if(!settings.emailjsServiceId||!settings.emailjsTemplateId||!settings.emailjsPublicKey) return;
  try{
    await fetch("https://api.emailjs.com/api/v1.0/email/send",{
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        service_id:settings.emailjsServiceId, template_id:settings.emailjsTemplateId, user_id:settings.emailjsPublicKey,
        template_params:{ from_name:entry.name, from_email:entry.email, phone:entry.phone, subject:entry.subject||"Website Contact Form", message:entry.message, to_email:settings.email },
      }),
    });
  }catch{}
}
// Validation + size caps: rejects unsupported files up front (human-readable message, no
// broken/partial upload) and stops the offline/misconfigured fallback below from ever
// embedding a truly huge base64 blob into the CMS's saved data.
const MAX_IMAGE_MB = 12;
const FALLBACK_MAX_MB = 4;
function validateImageFile(file:File): string|null {
  const okTypes = ["image/jpeg","image/png","image/webp","image/avif","image/gif"];
  if(file.type && !okTypes.includes(file.type)) return `"${file.name}" isn't a supported image type -- use JPG, PNG, WebP, AVIF or GIF.`;
  if(file.size > MAX_IMAGE_MB*1024*1024) return `"${file.name}" is too large (max ${MAX_IMAGE_MB}MB).`;
  return null;
}
async function uploadToStorage(file:File): Promise<string> {
  const invalid = validateImageFile(file);
  if(invalid) throw new Error(invalid);
  // Uses sbData (the always-anon client, same fix as the CMS's other saves further up this
  // file) rather than `sb` -- once a real admin session was added, `sb` started sending every
  // request as that signed-in user instead of the site's public key, and Storage's upload
  // policy grants the public key, not a signed-in one. That's what was silently failing every
  // CMS image upload here: it fell through to the base64-embed fallback below every time
  // (or, past FALLBACK_MAX_MB, straight to a hard error), which is why photos looked like they
  // "wouldn't upload" -- the real cloud upload never actually happened.
  if (sbData) {
    try {
      const ext = (file.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"")||"jpg";
      const key = `cms-uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await sbData.storage.from("portfolio").upload(key,file,{contentType:file.type});
      if(!error){
        const { data } = sbData.storage.from("portfolio").getPublicUrl(key);
        if(data?.publicUrl) return data.publicUrl;
      } else {
        console.warn("[uploadToStorage] Supabase Storage upload failed, falling back to local embed:",error.message);
      }
    } catch (e:any) {
      console.warn("[uploadToStorage] Supabase Storage upload threw, falling back to local embed:",e?.message||e);
    }
  }
  // Fallback (Storage unreachable/misconfigured): embed as base64 so the CMS still works in
  // this browser. Capped in size -- past this, silently embedding is worse than a clear error.
  if(file.size > FALLBACK_MAX_MB*1024*1024){
    throw new Error(`Cloud storage is temporarily unavailable and "${file.name}" is too large to use as a local fallback (max ${FALLBACK_MAX_MB}MB). Try a smaller file, or try again once storage is fixed.`);
  }
  return await new Promise<string>((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result as string); r.onerror=rej; r.readAsDataURL(file); });
}

// ─── STORAGE CLEANUP (auto-delete replaced/removed pictures) ────────────────
// Removing or replacing a CMS-uploaded photo used to only ever drop its URL from that one
// record -- the actual file stayed behind in Supabase Storage forever. This deletes the old
// file too, but only once it's (a) one of our own uploads (matches the cms-uploads/ storage
// path -- an externally pasted URL is never touched) and (b) not still referenced anywhere
// else in the CMS's current data (another project, blog post, or settings field could
// legitimately be reusing the same photo). Best-effort and silent: cleanup can never block or
// break an actual save, so failures are just logged.
const STORAGE_KEY_RE = /\/storage\/v1\/object\/public\/portfolio\/(cms-uploads\/[^?]+)/;
function storageKeyOf(url?: string | null): string | null {
  if (!url) return null;
  const m = STORAGE_KEY_RE.exec(url);
  return m ? m[1] : null;
}
async function deleteStorageFiles(urls: Iterable<string>) {
  if (!sbData) return;
  const keys = Array.from(new Set(Array.from(urls).map(storageKeyOf).filter((k): k is string => !!k)));
  if (!keys.length) return;
  try {
    const { error } = await sbData.storage.from("portfolio").remove(keys);
    if (error) console.warn("[deleteStorageFiles] cleanup failed:", error.message);
  } catch (e: any) {
    console.warn("[deleteStorageFiles] cleanup threw:", e?.message || e);
  }
}
// Every photo URL a single project can hold -- cover, banner, and the whole gallery.
function projectImageUrls(p: { coverImage?: string; bannerImage?: string; images?: Img[] }): Set<string> {
  const set = new Set<string>();
  if (p.coverImage) set.add(p.coverImage);
  if (p.bannerImage) set.add(p.bannerImage);
  (p.images || []).forEach(im => set.add(im.url));
  return set;
}
// Every photo URL Settings can hold, across every single-image / per-item photo field.
function settingsImageUrls(s: SiteSettings): Set<string> {
  const set = new Set<string>();
  const add = (u?: string | null) => { if (u) set.add(u); };
  add(s.aboutPhoto); add(s.servicesImage);
  (s.heroSlides || []).forEach(h => add(h.img));
  Object.values(s.sectionBg || {}).forEach(u => add(u as string));
  (s.pricingPackages || []).forEach(pk => add(pk.image));
  (s.clients || []).forEach(c => add(c.logo));
  (s.gearImages || []).forEach(g => add(g.img));
  return set;
}
// Every photo URL currently referenced ANYWHERE in the CMS -- the safety check that decides
// whether a dropped URL is truly orphaned before it's ever deleted from storage.
function collectAllImageUrls(data: { projects: Project[]; blog: BlogPost[]; settings: SiteSettings }): Set<string> {
  const urls = new Set<string>();
  data.projects.forEach(p => projectImageUrls(p).forEach(u => urls.add(u)));
  data.blog.forEach(b => { if (b.coverImage) urls.add(b.coverImage); });
  settingsImageUrls(data.settings).forEach(u => urls.add(u));
  return urls;
}

// ─── COLORS ─────────────────────────────────────────────────────────────────
// Royal Obsidian + Electric Violet master brand system: violet-black surfaces, white/lavender
// text, and a restrained violet accent reserved for CTAs and focus moments (kept to ~5-10% of
// the page -- photography remains the strongest visual element). P/PD/GOLD/GOLDL all carry the
// violet accent (kept as separate keys for a minimal diff); PL is the secondary lavender-white
// text used for active/hover states and structural labels.
// CSS-custom-property bridge: each value is a var() reference (falling back to the brand
// default) instead of a literal hex, so a CMS color change (Settings > Colors) can repaint
// every C.xxx usage across the whole file -- including standalone components outside Home()
// like FloatingWA/ConsultPopup/Hero/Lightbox/SmartGrid/CropModal -- just by setting the
// variable on :root, with zero JS re-render needed anywhere.
const C = { P:"var(--c-p,#8B5CF6)",PL:"var(--c-pl,#E2D9F3)",PD:"var(--c-pd,#A855F7)",GOLD:"var(--c-gold,#8B5CF6)",GOLDL:"var(--c-goldl,#A855F7)",BG:"var(--c-bg,#09060E)",FG:"var(--c-fg,#FFFFFF)",MID:"var(--c-mid,#A892C6)",DARK:"var(--c-dark,#140D21)",BORDER:"var(--c-border,#2D1F45)",
  LT:"var(--c-lt,#F8F6FC)",LTCARD:"var(--c-ltcard,#FFFFFF)",LTBORDER:"var(--c-ltborder,rgba(139,92,246,0.14))",INKMID:"var(--c-inkmid,#6E6480)" };

const S = {
  base:{background:C.BG,color:C.FG,minHeight:"100vh"} as React.CSSProperties,
  inp:{background:"#1C1330",border:"1px solid rgba(255,255,255,0.08)",color:C.FG,padding:"12px 16px",fontSize:13,width:"100%",outline:"none",boxSizing:"border-box"} as React.CSSProperties,
  btnP:{background:C.P,border:"none",color:C.BG,padding:"13px 36px",fontSize:13,fontWeight:700,letterSpacing:3,textTransform:"uppercase" as const,cursor:"pointer",borderRadius:2},
  btnO:{background:"none",border:"1px solid rgba(255,255,255,0.18)",color:C.FG,padding:"13px 36px",fontSize:13,fontWeight:700,letterSpacing:3,textTransform:"uppercase" as const,cursor:"pointer",borderRadius:2},
  btnSm:{background:C.P,border:"none",color:C.BG,padding:"8px 18px",fontSize:10,letterSpacing:2,textTransform:"uppercase" as const,cursor:"pointer",borderRadius:2},
  lbl:{fontSize:11,letterSpacing:3,color:C.MID,textTransform:"uppercase" as const,display:"block" as const,marginBottom:6},
  tag:(center=false)=>({fontSize:11,letterSpacing:6,color:C.MID,textTransform:"uppercase" as const,display:"flex",alignItems:"center",gap:12,marginBottom:12,justifyContent:center?"center":"flex-start"} as React.CSSProperties),
};

// ─── UPLOAD HELPER ───────────────────────────────────────────────────────────
function useUploader(onDone:(imgs:Img[])=>void) {
  const ref = useRef<HTMLInputElement>(null);
  const [prog, setProg] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function upload(files:FileList|null) {
    if(!files?.length) return;
    setBusy(true); setError(""); const out:Img[]=[]; const errs:string[]=[];
    for(let i=0;i<files.length;i++){
      setProg(Math.round(i/files.length*100));
      const f=files[i];
      try {
        const url = await uploadToStorage(f);
        const o = await detectOrientation(url);
        out.push({url,orientation:o});
      } catch(e:any) { errs.push(e?.message||`Couldn't upload "${f.name}".`); }
    }
    setProg(100); if(out.length) onDone(out); if(errs.length) setError(errs.join(" ")); setTimeout(()=>{setBusy(false);setProg(0);},500);
  }
  const Btn = ({label="📁 Upload Photos"}:{label?:string}) => (
    <div>
      <input ref={ref} type="file" accept="image/*" multiple style={{display:"none"}} onChange={e=>upload(e.target.files)} />
      <button onClick={()=>ref.current?.click()} style={{...S.btnP,opacity:busy?0.7:1,marginBottom:busy?8:0}}>{busy?`Uploading ${prog}%`:label}</button>
      {busy&&<div style={{height:3,background:"#1a1a2e",borderRadius:2}}><div style={{height:"100%",background:C.P,width:`${prog}%`,transition:"width 0.3s"}} /></div>}
      {!busy&&error&&<div style={{fontSize:11,color:"#ff6b6b",marginTop:6,maxWidth:340}}>{error}</div>}
    </div>
  );
  return {Btn,busy};
}

// ─── SINGLE IMAGE UPLOAD ──────────────────────────────────────────────────────
function SingleImageUpload({value,onChange,label="Photo"}:{value:string;onChange:(url:string)=>void;label?:string}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  async function upload(f:File|null){
    if(!f) return; setBusy(true); setError("");
    try { const url = await uploadToStorage(f); onChange(url); }
    catch(e:any) { setError(e?.message||`Couldn't upload "${f.name}".`); }
    setBusy(false);
  }
  return (
    <div style={{marginBottom:16}}>
      <label style={S.lbl}>{label}</label>
      <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
        {value&&<img src={value} alt="" style={{width:80,height:60,objectFit:"cover",border:`1px solid ${C.BORDER}`}} />}
        <div style={{flex:1}}>
          <input ref={ref} type="file" accept="image/*" style={{display:"none"}} onChange={e=>upload(e.target.files?.[0]||null)} />
          <button onClick={()=>ref.current?.click()} style={{...S.btnSm,display:"block",marginBottom:6}}>{busy?"Uploading...":"📁 Upload"}</button>
          <input style={{...S.inp,fontSize:11}} value={value} onChange={e=>onChange(e.target.value)} placeholder="or paste URL..." />
          {error&&<div style={{fontSize:11,color:"#ff6b6b",marginTop:6}}>{error}</div>}
        </div>
      </div>
    </div>
  );
}

// ─── COVER IMAGE CROPPER ─────────────────────────────────────────────────────
// The same project cover image shows in three different-shaped slots on the live
// site: the single large "Featured Projects" highlight (16:9) and every other
// grid / related-projects card (4:3). This lets the person pick exactly what
// part of the photo shows for whichever slot they're framing for, instead of
// leaving it to a blind CSS crop that can cut off the subject.
function CropModal({src,onCancel,onConfirm}:{src:string;onCancel:()=>void;onConfirm:(file:File)=>void}) {
  const [ratio,setRatio] = useState<"4:3"|"16:9">("4:3");
  const [zoom,setZoom] = useState(1);
  const [pos,setPos] = useState({x:0,y:0});
  const [ready,setReady] = useState(false);
  const [err,setErr] = useState(false);
  const [busy,setBusy] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{sx:number;sy:number;ox:number;oy:number}|null>(null);
  const BOX_W = 360;
  const BOX_H = ratio==="4:3" ? 270 : 203;

  useEffect(()=>{ setPos({x:0,y:0}); setZoom(1); },[ratio]);

  function geometry(){
    const img = imgRef.current;
    const natW = img?.naturalWidth||1, natH = img?.naturalHeight||1;
    const cover = Math.max(BOX_W/natW, BOX_H/natH);
    const scale = cover*zoom;
    const dispW = natW*scale, dispH = natH*scale;
    const minX = BOX_W-dispW, minY = BOX_H-dispH; // both <=0 once image covers the box
    const left = Math.min(0,Math.max(minX,(BOX_W-dispW)/2+pos.x));
    const top = Math.min(0,Math.max(minY,(BOX_H-dispH)/2+pos.y));
    return {scale,dispW,dispH,left,top};
  }

  function onDown(e:React.MouseEvent){ dragRef.current={sx:e.clientX,sy:e.clientY,ox:pos.x,oy:pos.y}; }
  function onMove(e:React.MouseEvent){ if(!dragRef.current) return; const dx=e.clientX-dragRef.current.sx,dy=e.clientY-dragRef.current.sy; setPos({x:dragRef.current.ox+dx,y:dragRef.current.oy+dy}); }
  function onUp(){ dragRef.current=null; }

  async function confirm(){
    const img = imgRef.current; if(!img) return;
    setBusy(true);
    try {
      const {scale,left,top} = geometry();
      const outW = ratio==="4:3"?1200:1600, outH = 900;
      const canvas = document.createElement("canvas"); canvas.width=outW; canvas.height=outH;
      const ctx = canvas.getContext("2d")!;
      const srcX = -left/scale, srcY = -top/scale, srcW = BOX_W/scale, srcH = BOX_H/scale;
      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outW, outH);
      const blob:Blob|null = await new Promise(res=>canvas.toBlob(res,"image/jpeg",0.92));
      if(!blob) throw new Error("no blob");
      onConfirm(new File([blob],"cover-crop.jpg",{type:"image/jpeg"}));
    } catch {
      setErr(true); setBusy(false);
    }
  }

  const g = ready?geometry():null;

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.82)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onMouseMove={onMove} onMouseUp={onUp}>
      <div style={{background:"#140D21",padding:24,border:`1px solid ${C.BORDER}`,maxWidth:420,width:"100%"}}>
        <div style={{...S.tag(),marginBottom:14}}>Crop Cover Image</div>
        <div style={{display:"flex",gap:8,marginBottom:14}}>
          <button onClick={()=>setRatio("4:3")} style={{...S.btnSm,background:ratio==="4:3"?C.P:"transparent",border:`1px solid ${C.P}`,color:ratio==="4:3"?C.BG:C.PL}}>4:3 — Grid / Related</button>
          <button onClick={()=>setRatio("16:9")} style={{...S.btnSm,background:ratio==="16:9"?C.P:"transparent",border:`1px solid ${C.P}`,color:ratio==="16:9"?C.BG:C.PL}}>16:9 — Featured Highlight</button>
        </div>
        {err ? (
          <div style={{color:C.MID,fontSize:12,lineHeight:1.6,padding:"24px 0"}}>This image can't be cropped here (usually only happens with certain external photo links). Try re-uploading the file directly from your computer, or use it uncropped.</div>
        ) : (
          <div onMouseDown={onDown} style={{width:BOX_W,height:BOX_H,overflow:"hidden",position:"relative",background:"#000",cursor:"grab",userSelect:"none",margin:"0 auto"}}>
            <img ref={imgRef} src={src} draggable={false} crossOrigin="anonymous" onLoad={()=>setReady(true)}
              style={g?{position:"absolute",left:g.left,top:g.top,width:g.dispW,height:g.dispH,maxWidth:"none"}:{opacity:0}} />
          </div>
        )}
        {!err&&<div style={{marginTop:14}}>
          <label style={S.lbl}>Zoom</label>
          <input type="range" min="1" max="3" step="0.02" value={zoom} onChange={e=>setZoom(parseFloat(e.target.value))} style={{width:"100%"}} />
        </div>}
        <div style={{display:"flex",gap:8,marginTop:18,justifyContent:"flex-end"}}>
          <button onClick={onCancel} style={S.btnO}>Cancel</button>
          {!err&&<button onClick={confirm} disabled={busy||!ready} style={{...S.btnP,opacity:busy||!ready?0.6:1}}>{busy?"Cropping...":"Use This Crop"}</button>}
        </div>
      </div>
    </div>
  );
}

// ─── SMART GRID (editorial masonry / bento gallery) ─────────────────────────
// Dynamically detects each image's real aspect ratio on load (no manual per-project
// layout, no orientation tagging required beyond what the CMS already stores) and
// gives it a column span: 1 (portrait/square), 2 (landscape) or 4/full-width
// (panoramic). Images never crop or distort -- width:100%/height:auto always keeps
// the photo's own intrinsic ratio; grid-auto-flow:dense fills the gaps around
// shorter tiles automatically, producing the collage effect with zero manual work
// per project, for any mix or count of images.
function SmartGrid({images,onClick}:{images:Img[];onClick:(i:number)=>void}) {
  if(!images?.length) return null;
  return (
    <div className="egallery">
      {images.map((img,i)=>(<GalleryTile key={i} img={img} index={i} onClick={()=>onClick(i)} />))}
    </div>
  );
}

function GalleryTile({img,index,onClick}:{img:Img;index:number;onClick:()=>void}) {
  // Seed a span + placeholder ratio from the CMS-stored orientation so the tile has a
  // sensible size before the real image loads (avoids a big layout jump), then refine
  // both from the image's actual measured dimensions once it decodes.
  const guess = img.orientation==="landscape" ? 2 : 1;
  const [span,setSpan] = useState(index===0 && guess===2 ? 3 : guess);
  const [ratio,setRatio] = useState(img.orientation==="landscape" ? 3/2 : 3/4);
  const [loaded,setLoaded] = useState(false);
  function handleLoad(e:React.SyntheticEvent<HTMLImageElement>) {
    const el=e.currentTarget; const r=el.naturalWidth/el.naturalHeight;
    let s = r>=2.1?4 : r>=1.2?2 : 1;
    if(index===0 && s<2 && r>=0.9) s=2; // give the hero/first image a touch more presence
    setRatio(r); setSpan(s); setLoaded(true);
  }
  return (
    <div className={`egallery-item eg-span-${span}`} onClick={onClick} style={{aspectRatio:loaded?"auto":ratio,background:C.DARK}}>
      <img src={img.url} alt={img.caption||""} loading={index<2?"eager":"lazy"} decoding="async" onLoad={handleLoad}
        style={{width:"100%",height:loaded?"auto":"100%",objectFit:loaded?undefined:"cover",display:"block"}} />
      {img.caption&&<div className="egallery-caption">{img.caption}</div>}
    </div>
  );
}

// ─── LIGHTBOX ────────────────────────────────────────────────────────────────
function Lightbox({images,index,onClose,onPrev,onNext}:{images:Img[];index:number;onClose:()=>void;onPrev:()=>void;onNext:()=>void}) {
  const touchX = useRef<number|null>(null);
  useEffect(()=>{ const h=(e:KeyboardEvent)=>{if(e.key==="Escape")onClose();if(e.key==="ArrowLeft")onPrev();if(e.key==="ArrowRight")onNext();}; window.addEventListener("keydown",h); return()=>window.removeEventListener("keydown",h); },[]);
  useEffect(()=>{ const prev=document.body.style.overflow; document.body.style.overflow="hidden"; return()=>{document.body.style.overflow=prev;}; },[]);
  function onTouchStart(e:React.TouchEvent){ touchX.current=e.touches[0].clientX; }
  function onTouchEnd(e:React.TouchEvent){
    if(touchX.current==null) return;
    const dx=e.changedTouches[0].clientX-touchX.current;
    if(Math.abs(dx)>50){ dx>0?onPrev():onNext(); }
    touchX.current=null;
  }
  const cur=images[index];
  return(
    <div onClick={onClose} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.98)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <button aria-label="Previous image" onClick={e=>{e.stopPropagation();onPrev();}} style={{position:"absolute",left:16,color:"#fff",background:"none",border:"none",fontSize:48,cursor:"pointer",opacity:0.5}}>‹</button>
      <figure onClick={e=>e.stopPropagation()} style={{margin:0,display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
        <img src={cur?.url} alt={cur?.caption||""} style={{maxWidth:"92vw",maxHeight:"84vh",objectFit:"contain"}} />
        {cur?.caption&&<figcaption style={{color:"rgba(255,255,255,0.6)",fontSize:13,letterSpacing:0.5,textAlign:"center",maxWidth:"80vw"}}>{cur.caption}</figcaption>}
      </figure>
      <button aria-label="Next image" onClick={e=>{e.stopPropagation();onNext();}} style={{position:"absolute",right:16,color:"#fff",background:"none",border:"none",fontSize:48,cursor:"pointer",opacity:0.5}}>›</button>
      <button aria-label="Close" onClick={onClose} style={{position:"absolute",top:16,right:16,color:"#fff",background:"none",border:"none",fontSize:24,cursor:"pointer"}}>✕</button>
      <div style={{position:"absolute",bottom:16,color:"#777",fontSize:12,letterSpacing:3}}>{String(index+1).padStart(2,"0")} / {String(images.length).padStart(2,"0")}</div>
    </div>
  );
}

// ─── FLOATING WA ─────────────────────────────────────────────────────────────
function FloatingWA({num,msg}:{num:string;msg:string}) {
  return(
    <a href={`https://wa.me/${num}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp"
      style={{position:"fixed",bottom:28,right:28,zIndex:999,background:"#25D366",borderRadius:"50%",width:56,height:56,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 24px rgba(37,211,102,0.3)",textDecoration:"none",transition:"transform 0.2s"}}
      onMouseEnter={e=>(e.currentTarget as HTMLElement).style.transform="scale(1.1)"} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.transform="scale(1)"}>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
    </a>
  );
}

// ─── PHOTO COUNT BADGE ───────────────────────────────────────────────────────
// Small "camera icon + total photos" pill in the bottom-right corner of a project cover,
// same convention real-estate listing sites (Property Finder, Bayut, Zillow) use to show a
// gallery has more photos than the one cover shot. Only rendered when there's more than one.
function PhotoCountBadge({count}:{count:number}) {
  if(count<=1) return null;
  return (
    <div style={{position:"absolute",bottom:10,right:10,zIndex:2,display:"flex",alignItems:"center",gap:5,background:"rgba(9,6,14,0.72)",backdropFilter:"blur(2px)",color:"#fff",fontSize:11,fontWeight:600,letterSpacing:0.3,padding:"5px 10px",borderRadius:20}}>
      <span aria-hidden="true">📷</span>{count}
    </div>
  );
}

// ─── PROJECT REACTIONS (Like + Star Rating) ─────────────────────────────────
// A real, functioning like button and 5-star rating per project -- not decorative/fabricated
// numbers. The like COUNT is a genuine shared/cross-visitor total: it lives in the existing
// site_settings key/value table under the "nap_project_likes" key (fetchProjectLikeCounts /
// pushProjectLikeCounts above), the same anon-writable table+pattern already used for contact
// form submissions -- so no new table/schema migration was needed. Whether *this visitor*
// has liked it, and their own star rating, are inherently per-browser facts and stay in
// localStorage. If Supabase is unreachable, the count falls back to this browser's last-known
// local mirror rather than showing nothing.
function ProjectReaction({projectId}:{projectId:string}) {
  const [liked,setLiked] = useState(false);
  const [likeCount,setLikeCount] = useState(0);
  const [rating,setRating] = useState(0);
  const [hoverStar,setHoverStar] = useState(0);
  useEffect(()=>{
    let cancelled=false;
    // "did *I* like this" is inherently per-visitor -- stays in localStorage.
    // The count itself is shared: try the cloud total first (nap_project_likes in
    // site_settings), and only fall back to the local mirror if Supabase is unreachable
    // (offline, or sb client not configured), so the number always reflects everyone,
    // not just this browser, per Naveed's request.
    try {
      const likes = JSON.parse(localStorage.getItem("nap_likes")||"{}");
      const ratings = JSON.parse(localStorage.getItem("nap_ratings")||"{}");
      setLiked(!!likes[projectId]);
      setRating(ratings[projectId]||0);
    } catch {}
    (async()=>{
      const cloud = await fetchProjectLikeCounts();
      if(cancelled) return;
      if(Object.keys(cloud).length>0 || sb){
        setLikeCount(cloud[projectId]||0);
      } else {
        try {
          const localCounts = JSON.parse(localStorage.getItem("nap_like_counts")||"{}");
          setLikeCount(localCounts[projectId]||0);
        } catch {}
      }
    })();
    return ()=>{cancelled=true;};
  },[projectId]);
  async function toggleLike(){
    let likes:Record<string,boolean> = {};
    try { likes = JSON.parse(localStorage.getItem("nap_likes")||"{}"); } catch {}
    const now = !likes[projectId];
    likes[projectId] = now;
    try { localStorage.setItem("nap_likes",JSON.stringify(likes)); } catch {}
    setLiked(now);
    // Optimistic UI, then reconcile against the latest shared cloud total (not a
    // locally-cached one) so two visitors liking around the same time both land
    // correctly instead of one overwriting the other.
    setLikeCount(c=>Math.max(0,c+(now?1:-1)));
    const cloud = await fetchProjectLikeCounts();
    const newTotal = Math.max(0,(cloud[projectId]||0)+(now?1:-1));
    cloud[projectId] = newTotal;
    await pushProjectLikeCounts(cloud);
    setLikeCount(newTotal);
    try {
      const localCounts = JSON.parse(localStorage.getItem("nap_like_counts")||"{}");
      localCounts[projectId] = newTotal;
      localStorage.setItem("nap_like_counts",JSON.stringify(localCounts));
    } catch {}
  }
  function rate(n:number){
    try {
      const ratings = JSON.parse(localStorage.getItem("nap_ratings")||"{}");
      ratings[projectId] = n;
      localStorage.setItem("nap_ratings",JSON.stringify(ratings));
      setRating(n);
    } catch {}
  }
  return (
    <div style={{display:"flex",alignItems:"center",gap:24,flexWrap:"wrap",marginBottom:32}}>
      <button onClick={toggleLike} aria-label={liked?"Unlike this project":"Like this project"} style={{display:"flex",alignItems:"center",gap:8,background:"none",border:"none",cursor:"pointer",padding:0}}>
        <span style={{fontSize:22,lineHeight:1,color:liked?"#FF3B5C":C.MID,transform:liked?"scale(1.18)":"scale(1)",transition:"color 0.2s, transform 0.2s"}}>{liked?"♥":"♡"}</span>
        <span style={{fontSize:13,color:C.MID}}>{likeCount>0?`${likeCount} like${likeCount===1?"":"s"}`:"Like"}</span>
      </button>
      <div style={{display:"flex",alignItems:"center",gap:4}} onMouseLeave={()=>setHoverStar(0)}>
        {[1,2,3,4,5].map(n=>(
          <span key={n} onClick={()=>rate(n)} onMouseEnter={()=>setHoverStar(n)} role="button" aria-label={`Rate ${n} star${n===1?"":"s"}`} style={{fontSize:17,lineHeight:1,cursor:"pointer",color:(hoverStar||rating)>=n?"#F5B301":C.BORDER,transition:"color 0.15s"}}>★</span>
        ))}
        {rating>0&&<span style={{fontSize:12,color:C.MID,marginLeft:4}}>Your rating: {rating}/5</span>}
      </div>
    </div>
  );
}

// ─── CONSULTATION POPUP ─────────────────────────────────────────────────────
// Simple contact-capture: title/body text and the delay are CMS-editable (Settings > Popup),
// defaulting to a plain "leave your number, get a callback" offer -- no discount or promo is
// invented since none was specified. Naveed can swap the copy to a real seasonal offer later
// without any code change.
function ConsultPopup({open,onClose,title,text,ctaLabel,waNumber}:{open:boolean;onClose:()=>void;title:string;text:string;ctaLabel:string;waNumber:string}) {
  const [name,setName]=useState(""); const [phone,setPhone]=useState(""); const [sent,setSent]=useState(false);
  if(!open) return null;
  function submit(){
    if(!phone.trim()) return;
    const msg=`Hello Naveed, I'd like a callback to discuss a project.\nName: ${name.trim()||"-"}\nPhone: ${phone.trim()}`;
    window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`,"_blank");
    setSent(true);
  }
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(9,6,14,0.72)",zIndex:998,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div onClick={e=>e.stopPropagation()} style={{position:"relative",width:"100%",maxWidth:420,background:C.DARK,border:`1px solid ${C.BORDER}`,borderRadius:8,padding:"40px 32px",boxShadow:"0 30px 90px rgba(0,0,0,0.5)"}}>
        <button onClick={onClose} aria-label="Close" style={{position:"absolute",top:14,right:14,background:"none",border:"none",color:C.MID,fontSize:20,cursor:"pointer"}}>✕</button>
        {sent?(
          <div style={{textAlign:"center",padding:"12px 0"}}>
            <div style={{width:44,height:44,borderRadius:"50%",background:C.P,color:"#fff",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 18px"}}>✓</div>
            <div style={{fontSize:15,color:"#fff",lineHeight:1.6}}>Thanks -- Naveed will be in touch personally.</div>
          </div>
        ):(
          <>
            <div style={{...S.tag(true),marginBottom:14}}><span style={{width:24,height:1,background:C.PL,display:"inline-block"}} />Let's Connect</div>
            <h3 style={{fontSize:22,fontWeight:700,letterSpacing:0.3,color:"#fff",margin:"0 0 10px"}}>{title}</h3>
            <p style={{fontSize:13,color:C.MID,lineHeight:1.7,margin:"0 0 22px"}}>{text}</p>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" style={{...S.inp,marginBottom:10}} />
            <input value={phone} onChange={e=>setPhone(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")submit();}} type="tel" placeholder="Your phone / WhatsApp number" required style={{...S.inp,marginBottom:16}} />
            <button onClick={submit} style={{...S.btnP,width:"100%"}}>{ctaLabel}</button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── REVEAL ───────────────────────────────────────────────────────────────────
// Lightweight scroll-reveal: fades + rises its children into place the first time they enter
// the viewport (IntersectionObserver, disconnects after triggering once -- no work done again
// on subsequent scrolls). Purely additive polish: content is fully visible either way, this
// only changes how it arrives, so it's safe to wrap around any existing block with zero markup
// or layout changes to what's inside. `delay` (seconds) staggers items in a grid/list.
function Reveal({children,delay=0,className,style}:{children:React.ReactNode;delay?:number;className?:string;style?:React.CSSProperties}) {
  const ref=useRef<HTMLDivElement>(null);
  const [shown,setShown]=useState(false);
  useEffect(()=>{
    const el=ref.current; if(!el) return;
    if(typeof IntersectionObserver==="undefined"){ setShown(true); return; }
    const io=new IntersectionObserver((entries)=>{
      if(entries[0]?.isIntersecting){ setShown(true); io.disconnect(); }
    },{threshold:0.12,rootMargin:"0px 0px -40px 0px"});
    io.observe(el);
    return ()=>io.disconnect();
  },[]);
  return (
    <div ref={ref} className={className} style={{...style,opacity:shown?1:0,transform:shown?"translateY(0)":"translateY(26px)",transition:`opacity 0.7s cubic-bezier(.16,.84,.44,1) ${delay}s, transform 0.7s cubic-bezier(.16,.84,.44,1) ${delay}s`}}>
      {children}
    </div>
  );
}

// ─── FULL-WIDTH VIDEO (between About and Services) ───────────────────────────
// A full-bleed, autoplaying, looping YouTube background section. Shown only when both
// settings.videoSectionEnabled and a valid settings.videoSectionUrl are set (CMS > Settings
// > Pages) -- off by default so shipping this makes zero visual change until Naveed turns
// it on and pastes a link. Browsers only allow autoplay when a video starts muted, so it
// always starts muted and offers a small mute/unmute button; toggling it uses the YouTube
// IFrame postMessage API (enablejsapi=1) since the query-string mute param only sets the
// *initial* state, not a live toggle. The iframe itself is pointer-events:none (no native
// YouTube controls are shown anyway -- controls=0) so it reads as ambient background video,
// not something visitors can accidentally pause/click into.
function getYouTubeId(url: string): string {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : "";
}
function FullVideoSection({ url, title, subtitle }: { url: string; title?: string; subtitle?: string }) {
  const id = getYouTubeId(url);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(80); // 0-100, only meaningful while unmuted
  const iframeRef = useRef<HTMLIFrameElement>(null);
  if (!id) return null;
  const sendCmd = (func: string, args: any[] = []) => {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args }), "*");
  };
  const toggleMute = () => {
    const next = !muted;
    sendCmd(next ? "mute" : "unMute");
    // Unmuting from a volume that was dragged down to 0 would otherwise unmute into silence --
    // jump back to a sensible audible level instead.
    if (!next && volume === 0) { setVolume(50); sendCmd("setVolume", [50]); }
    setMuted(next);
  };
  // Single slider drives both mute state and level -- dragging to 0 mutes, dragging up from 0
  // (while muted) unmutes, matching how a normal media player's volume control behaves.
  const onVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setVolume(v);
    sendCmd("setVolume", [v]);
    if (v === 0 && !muted) { sendCmd("mute"); setMuted(true); }
    else if (v > 0 && muted) { sendCmd("unMute"); setMuted(false); }
  };
  const src = `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&modestbranding=1&playsinline=1&rel=0&iv_load_policy=3&enablejsapi=1`;
  return (
    <div style={{position:"relative",width:"100%",height:"78vh",minHeight:420,overflow:"hidden",background:"#000"}}>
      <div style={{position:"absolute",top:"50%",left:"50%",width:"177.78vh",height:"100%",minWidth:"100%",minHeight:"56.25vw",transform:"translate(-50%,-50%)",pointerEvents:"none"}}>
        <iframe
          ref={iframeRef}
          src={src}
          title="Featured video"
          allow="autoplay; encrypted-media; picture-in-picture"
          style={{width:"100%",height:"100%",border:0}}
        />
      </div>
      <div aria-hidden style={{position:"absolute",inset:0,background:"linear-gradient(180deg, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.55) 100%)",pointerEvents:"none"}} />
      {/* Optional caption -- both fields are blank by default (CMS > Settings > Pages, right
          under the video link), so shipping this makes no visual change until Naveed types
          something. pointer-events:none + sitting above the mute/volume pill's height keeps
          it from ever blocking that control. */}
      {(title || subtitle) && (
        <div style={{position:"absolute",left:0,right:0,bottom:0,padding:"0 40px 96px",zIndex:1,pointerEvents:"none"}}>
          <div style={{maxWidth:1160,margin:"0 auto"}}>
            {subtitle && <div style={{fontSize:12,letterSpacing:4,textTransform:"uppercase",color:"rgba(255,255,255,0.8)",marginBottom:14,fontWeight:600,textShadow:"0 2px 12px rgba(0,0,0,0.6)"}}>{subtitle}</div>}
            {title && <h2 style={{fontSize:"clamp(28px,4.5vw,52px)",fontWeight:700,color:"#fff",margin:0,lineHeight:1.15,maxWidth:720,textShadow:"0 4px 24px rgba(0,0,0,0.55)"}}>{title}</h2>}
          </div>
        </div>
      )}
      <div style={{position:"absolute",bottom:24,right:24,display:"flex",alignItems:"center",gap:10,background:"rgba(9,6,14,0.55)",border:"1px solid rgba(255,255,255,0.35)",borderRadius:26,padding:"0 18px 0 6px",height:44,backdropFilter:"blur(6px)",zIndex:2}}>
        <button
          onClick={toggleMute}
          aria-label={muted ? "Unmute video" : "Mute video"}
          style={{width:36,height:36,borderRadius:"50%",background:"transparent",border:"none",color:"#fff",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}
        >
          {muted || volume===0 ? "🔇" : "🔊"}
        </button>
        <input
          type="range"
          min={0}
          max={100}
          value={muted ? 0 : volume}
          onChange={onVolumeChange}
          aria-label="Video volume"
          style={{width:84,accentColor:"#8B5CF6",cursor:"pointer"}}
        />
      </div>
    </div>
  );
}

// ─── GOOGLE REVIEWS (home Testimonials section) ──────────────────────────────
// Pulls real, live Google reviews for the business via the /api/google-reviews Pages
// Function (keeps the Places API key server-side -- see functions/api/google-reviews.ts).
// Renders in the same bordered pull-quote panel as the manual testimonial spotlight, so
// switching the CMS toggle on doesn't jar the page's look, and auto-rotates the same way.
// Fails silently to `null` (never a broken-looking empty box) if the Place ID isn't set,
// the key isn't configured yet, or Google returns nothing. The Place ID field already
// exists in CMS > Settings > SEO; the on/off switch for showing it here lives in
// CMS > Settings > Pages > Show/Hide Homepage Sections, next to the manual Testimonials one.
function GoogleReviewsSection({placeId,eyebrow}:{placeId:string;eyebrow:string}) {
  const [data,setData] = useState<{rating:number|null;total:number;reviews:{author:string;photo:string;rating:number;text:string;relativeTime:string}[]}|null>(null);
  useEffect(()=>{
    if(!placeId) return;
    let cancelled=false;
    fetch(`/api/google-reviews?placeId=${encodeURIComponent(placeId)}`).then(r=>r.json()).then(d=>{ if(!cancelled) setData(d); }).catch(()=>{});
    return ()=>{ cancelled=true; };
  },[placeId]);
  const reviews = data?.reviews||[];
  if(!placeId || reviews.length===0) return null;
  // Every review Google returned scrolls continuously in one right-to-left marquee (instead
  // of the old one-at-a-time fade), so all of them are visible rather than only whichever one
  // was currently rotated in. The track is the review list rendered twice back-to-back --
  // that's what lets the CSS animation (translateX 0 -> -50%) loop with no visible seam.
  const track = [...reviews, ...reviews];
  const mapsUrl = `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(placeId)}`;
  // Small abstract mark in Google's four brand colors -- not a reproduction of the Google "G"
  // logo, just a colored ring used the way review-widget badges commonly signal "this is a
  // real, verified Google review" at a glance.
  const GDot = ({size=18}:{size?:number}) => (
    <span aria-hidden style={{width:size,height:size,borderRadius:"50%",display:"inline-block",flexShrink:0,background:"conic-gradient(from -45deg, #4285F4 0deg 90deg, #34A853 90deg 180deg, #FBBC05 180deg 270deg, #EA4335 270deg 360deg)",boxShadow:"0 0 0 3px #fff"}} />
  );
  return (
    <div style={{background:C.LT,padding:"96px 0 118px",position:"relative",overflow:"hidden"}}>
      {/* Soft brand-color glow blobs behind the cards -- purely decorative atmosphere, sits
          under everything (zIndex 0) so it never interferes with click targets. */}
      <div aria-hidden style={{position:"absolute",top:-60,left:"6%",width:280,height:280,borderRadius:"50%",background:"radial-gradient(circle,rgba(139,92,246,0.32),transparent 70%)",filter:"blur(50px)",zIndex:0}} />
      <div aria-hidden style={{position:"absolute",bottom:-90,right:"8%",width:340,height:340,borderRadius:"50%",background:"radial-gradient(circle,rgba(236,72,153,0.24),transparent 70%)",filter:"blur(60px)",zIndex:0}} />
      <Reveal style={{maxWidth:1400,margin:"0 auto 48px",padding:"0 40px",textAlign:"center",position:"relative",zIndex:1}}>
        <div style={{...S.tag(true),marginBottom:20,color:C.P,justifyContent:"center"}}><span style={{width:24,height:1,background:C.P,display:"inline-block"}} />{eyebrow}<span style={{width:24,height:1,background:C.P,display:"inline-block"}} /></div>
        {data?.rating!=null&&(
          <div style={{display:"inline-flex",alignItems:"center",gap:10,background:"rgba(255,255,255,0.85)",backdropFilter:"blur(8px)",border:`1px solid ${C.LTBORDER}`,borderRadius:50,padding:"11px 24px 11px 14px",boxShadow:"0 14px 34px rgba(139,92,246,0.16)"}}>
            <GDot />
            <span style={{fontSize:15,fontWeight:800,color:C.DARK}}>{data.rating.toFixed(1)}</span>
            <span style={{color:"#FBBC05",fontSize:14,letterSpacing:1}}>★★★★★</span>
            {data.total>0&&<span style={{fontSize:12,color:C.INKMID}}>{data.total} reviews</span>}
            <span style={{width:1,height:14,background:C.LTBORDER,display:"inline-block"}} />
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:C.P,fontWeight:700,textDecoration:"none",whiteSpace:"nowrap"}}>See all ↗</a>
          </div>
        )}
      </Reveal>
      <div className="gr-fade" style={{position:"relative",zIndex:1}}>
        <div className="gr-track" style={{display:"flex",gap:28,width:"max-content",animationDuration:`${reviews.length*10}s`}}>
          {track.map((r,i)=>{
            const filled = Math.max(0,Math.min(5,Math.round(r.rating)));
            const stars = "★".repeat(filled) + "☆".repeat(5-filled);
            const short = r.text.length>300 ? r.text.slice(0,300).trimEnd()+"…" : r.text;
            return (
              <div key={i} className="gr-card" style={{flex:"0 0 335px",position:"relative",overflow:"hidden",background:"rgba(255,255,255,0.78)",backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",border:"1px solid rgba(255,255,255,0.9)",borderRadius:20,padding:"32px 26px 26px",boxShadow:"0 22px 48px rgba(139,92,246,0.14), 0 3px 12px rgba(20,13,33,0.05), inset 0 1px 0 rgba(255,255,255,0.7)",display:"flex",flexDirection:"column",height:302}}>
                <span aria-hidden style={{position:"absolute",top:0,left:0,right:0,height:4,background:"linear-gradient(90deg,#8b5cf6,#ec4899)"}} />
                <span aria-hidden style={{position:"absolute",top:-10,right:10,fontSize:96,fontFamily:"Georgia, serif",fontWeight:700,background:"linear-gradient(160deg,rgba(139,92,246,0.16),rgba(236,72,153,0.1))",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",lineHeight:1,userSelect:"none"}}>"</span>
                <div style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                  <div style={{color:"#FBBC05",fontSize:14,letterSpacing:2}}>{stars}</div>
                  <GDot size={16} />
                </div>
                <p style={{position:"relative",fontSize:13,fontWeight:400,color:C.DARK,lineHeight:1.7,margin:"0 0 6px",flex:1,overflow:"hidden"}}>
                  {short}
                  {r.text.length>300&&<a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{marginLeft:6,color:C.P,fontWeight:700,textDecoration:"none",whiteSpace:"nowrap"}}>Read more ↗</a>}
                </p>
                <div style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,paddingTop:16,marginTop:12,borderTop:`1px solid ${C.LTBORDER}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}>
                    {r.photo&&<span style={{width:38,height:38,borderRadius:"50%",background:"linear-gradient(135deg,#8b5cf6,#ec4899)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><img src={r.photo} alt="" style={{width:33,height:33,borderRadius:"50%",objectFit:"cover"}} referrerPolicy="no-referrer" /></span>}
                    <div style={{textAlign:"left",minWidth:0}}>
                      <div style={{fontSize:12.5,color:C.DARK,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.author}</div>
                      {r.relativeTime&&<div style={{fontSize:10,color:C.INKMID,marginTop:2,letterSpacing:0.5,textTransform:"uppercase"}}>{r.relativeTime}</div>}
                    </div>
                  </div>
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer" aria-label="Read on Google" style={{flexShrink:0,fontSize:11,color:C.P,fontWeight:700,textDecoration:"none",whiteSpace:"nowrap"}}>Google ↗</a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── INTRO SPLASH (home only, once per browser session) ──────────────────────
// A brief branded loading screen shown the first time someone lands on the homepage in a
// given browser session, then fades/slides away to reveal the real page underneath. Uses
// the site's own existing CMS text (siteName/siteTagline) rather than inventing new copy.
// Auto-finishes at 100%; clicking anywhere skips straight to the end. sessionStorage (see
// Home()) makes sure it only plays once per visit, not on every internal navigation back
// to "/".
function IntroSplash({siteName,tagline,onDone}:{siteName:string;tagline:string;onDone:()=>void}) {
  const [pct,setPct]=useState(0);
  const [leaving,setLeaving]=useState(false);
  useEffect(()=>{
    const prevOverflow=document.body.style.overflow;
    document.body.style.overflow="hidden";
    const start=Date.now();
    const DUR=1900;
    const id=setInterval(()=>{
      const p=Math.min(100,Math.round(((Date.now()-start)/DUR)*100));
      setPct(p);
      if(p>=100){
        clearInterval(id);
        setLeaving(true);
        setTimeout(()=>{ document.body.style.overflow=prevOverflow; onDone(); },700);
      }
    },30);
    return ()=>{ clearInterval(id); document.body.style.overflow=prevOverflow; };
  },[]);
  function skip(){
    if(leaving) return;
    setLeaving(true);
    document.body.style.overflow="";
    setTimeout(onDone,700);
  }
  return (
    <div onClick={skip} role="button" aria-label="Skip intro" style={{position:"fixed",inset:0,zIndex:9999,background:C.DARK,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",overflow:"hidden",transition:"opacity 0.65s ease, transform 0.7s cubic-bezier(.7,0,.3,1)",opacity:leaving?0:1,transform:leaving?"translateY(-6%)":"translateY(0)"}}>
      <div aria-hidden style={{position:"absolute",top:"-20%",left:"-10%",width:420,height:420,borderRadius:"50%",background:"radial-gradient(circle,rgba(139,92,246,0.28),transparent 70%)",filter:"blur(60px)"}} />
      <div aria-hidden style={{position:"absolute",bottom:"-25%",right:"-10%",width:460,height:460,borderRadius:"50%",background:"radial-gradient(circle,rgba(168,85,247,0.22),transparent 70%)",filter:"blur(70px)"}} />
      <div style={{position:"relative",textAlign:"center",padding:"0 24px"}}>
        <div style={{fontSize:11,letterSpacing:6,color:C.PL,textTransform:"uppercase",marginBottom:22,opacity:0.85}}>{tagline}</div>
        <div style={{fontSize:"clamp(30px,6vw,54px)",fontWeight:700,color:C.FG,letterSpacing:0.5,marginBottom:36}}><NoTranslate>{siteName}</NoTranslate></div>
        <div style={{width:220,height:2,background:"rgba(255,255,255,0.12)",position:"relative",overflow:"hidden",margin:"0 auto"}}>
          <div style={{position:"absolute",inset:0,width:`${pct}%`,background:C.P,transition:"width 0.1s linear"}} />
        </div>
        <div style={{marginTop:16,fontSize:11,color:C.MID,letterSpacing:3}}>{pct}%</div>
      </div>
    </div>
  );
}

// ─── PAGE BANNER ──────────────────────────────────────────────────────────────
// Reusable banner rendered at the top of every inner page (Work, About, Packages, Journal,
// CV, Booking, Contact, plus individual Project/Post pages using their own title+cover image).
// CMS-editable eyebrow/title text (Settings > Colors & Banners) with an optional background
// image; no image set (the default everywhere) renders as a plain solid-color band using
// theme.DARK, so shipping this changes nothing visually until an image is actually added.
function PageBanner({eyebrow,title,description,image}:{eyebrow:string;title:string;description?:string;image?:string}) {
  // Height reduced 40% (was clamp(420px,66vh,720px)) per feedback that the banner felt too
  // tall on every inner page. Top padding kept close to before so the title still clears the
  // fixed nav bar; only the extra empty space below it was trimmed.
  return (
    <div style={{position:"relative",overflow:"hidden",background:C.DARK,minHeight:"clamp(252px,39.6vh,432px)",display:"flex",alignItems:"center",padding:"120px 40px 36px"}}>
      {image&&<img src={image} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:0.6}} />}
      {image&&<div style={{position:"absolute",inset:0,background:"linear-gradient(105deg,rgba(9,6,14,0.85) 0%,rgba(9,6,14,0.45) 100%)"}} />}
      <div style={{position:"relative",zIndex:1,maxWidth:1400,margin:"0 auto",width:"100%"}}>
        <div style={{fontSize:11,letterSpacing:6,color:C.PL,textTransform:"uppercase",display:"flex",alignItems:"center",gap:12,marginBottom:14}}><span style={{width:24,height:1,background:C.PL,display:"inline-block"}} />{eyebrow}</div>
        <h1 style={{fontSize:"clamp(32px,5.2vw,64px)",fontWeight:700,letterSpacing:0.5,margin:0,color:"#fff"}}>{title}</h1>
        {/* Short (~3-line) intro shown only when a description is passed -- Work, Journal, CV
            and Booking use one below; Packages/About/Contact keep their own existing intro
            copy in the page body instead, so it isn't duplicated here. */}
        {description&&<p style={{maxWidth:560,fontSize:14,lineHeight:1.7,color:"rgba(255,255,255,0.75)",margin:"16px 0 0"}}>{description}</p>}
      </div>
    </div>
  );
}

// ─── HERO ────────────────────────────────────────────────────────────────────
// Curated, properly-licensed font choices for CMS > Settings > Hero Slides > Typography.
// Each key maps to a CSS variable next/font/google generates once at build time in layout.tsx
// (see the fontVar comment there) -- no runtime Google Fonts request, same licensing approach
// already used for the site's base typeface. "default" omits fontFamily so text keeps
// inheriting the site's existing font exactly as before.
const HERO_FONTS: Record<string,string|undefined> = {
  default: undefined,
  playfair: "var(--font-playfair), Georgia, serif",
  cormorant: "var(--font-cormorant), Georgia, serif",
  montserrat: "var(--font-montserrat), sans-serif",
  oswald: "var(--font-oswald), sans-serif",
  spacegrotesk: "var(--font-spacegrotesk), sans-serif",
};
const HERO_FONT_LABELS: [string,string][] = [
  ["default","Default (Site Font)"], ["playfair","Playfair Display"], ["cormorant","Cormorant Garamond"],
  ["montserrat","Montserrat"], ["oswald","Oswald"], ["spacegrotesk","Space Grotesk"],
];
function Hero({slides,onNav,waNumber,typography,ready}:{slides:HeroSlide[];onNav:(p:string)=>void;waNumber:string;typography:HeroTypography;ready:boolean}) {
  const ht=typography;
  const [slide,setSlide]=useState(0); const [prog,setProg]=useState(0);
  // Real React state (not imperative DOM style mutation) for the hover-to-color toggle --
  // this component re-renders every ~60ms while the progress bar animates, and any style set
  // directly via onMouseEnter would just get overwritten by the very next of those renders.
  const [heroHover,setHeroHover]=useState(false);
  const [cbStep,setCbStep]=useState<"phone"|"name"|"email"|"done">("phone");
  const [cbPhone,setCbPhone]=useState(""); const [cbName,setCbName]=useState(""); const [cbEmail,setCbEmail]=useState("");
  function cbNext(){
    if(cbStep==="phone"){ if(!cbPhone.trim())return; setCbStep("name"); return; }
    if(cbStep==="name"){ if(!cbName.trim())return; setCbStep("email"); return; }
    if(cbStep==="email"){
      if(!cbEmail.trim())return;
      const msg=`Hello Naveed, please call me back regarding a project.\nName: ${cbName.trim()}\nPhone: ${cbPhone.trim()}\nEmail: ${cbEmail.trim()}`;
      window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`,"_blank");
      setCbStep("done");
    }
  }
  const cbField = cbStep==="phone" ? {value:cbPhone,set:setCbPhone,type:"tel",placeholder:"+971 xx xxx xxxx"}
    : cbStep==="name" ? {value:cbName,set:setCbName,type:"text",placeholder:"Your full name"}
    : {value:cbEmail,set:setCbEmail,type:"email",placeholder:"Your email address"};
  const tRef=useRef<ReturnType<typeof setInterval>|null>(null); const pRef=useRef<ReturnType<typeof setInterval>|null>(null);
  const DUR=5500;
  function startTimers(){ if(tRef.current)clearInterval(tRef.current); if(pRef.current)clearInterval(pRef.current); setProg(0); let p=0; pRef.current=setInterval(()=>{p+=100/(DUR/60);setProg(Math.min(p,100));},60); tRef.current=setInterval(()=>{setSlide(s=>(s+1)%slides.length);p=0;setProg(0);},DUR); }
  useEffect(()=>{startTimers();return()=>{if(tRef.current)clearInterval(tRef.current);if(pRef.current)clearInterval(pRef.current);};},[slides.length]);
  function go(i:number){setSlide(i);startTimers();}
  if(!slides.length) return null;
  const sl=slides[slide]||slides[0];
  return(
    <div style={{position:"relative",height:"100vh",overflow:"hidden",background:C.BG}}
      onMouseEnter={()=>setHeroHover(true)}
      onMouseLeave={()=>setHeroHover(false)}>
      {/* Same B&W-to-color hover treatment as the Featured Work / project grids -- the hero
          photo reads black & white until the visitor's mouse is anywhere over the hero, then
          eases into full color, and back to grayscale on mouse-leave. */}
      {/* Gated on `ready` (see cmsPhotosReady in Home()) so the very first paint -- server-rendered
          static HTML included -- never shows a photo at all rather than briefly showing the
          hardcoded default/stale-cached one before the real current CMS photo replaces it.
          Same dark background (C.BG on the wrapper above) is visible underneath in the
          meantime, so this reads as a normal instant load, not a blank flash. */}
      {ready && slides.map((s,i)=>(
        <div key={i} style={{position:"absolute",inset:0,opacity:i===slide?1:0,transition:"opacity 1.4s ease",zIndex:i===slide?1:0}}>
          <img src={s.img} alt={s.label} style={{width:"100%",height:"100%",objectFit:"cover",transform:i===slide?"scale(1.06)":"scale(1)",filter:heroHover?"grayscale(0)":"grayscale(1)",transition:"transform 7s ease, filter 0.6s ease"}} />
        </div>
      ))}
      <div style={{position:"absolute",inset:0,background:"linear-gradient(105deg,rgba(9,6,14,0.88) 0%,rgba(9,6,14,0.45) 60%,rgba(9,6,14,0.2) 100%)",zIndex:2}} />
      <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(9,6,14,0.95) 0%,transparent 35%)",zIndex:2}} />
      <div style={{position:"absolute",top:122,right:48,color:"rgba(255,255,255,0.3)",fontSize:11,letterSpacing:4,zIndex:3}}>0{slide+1} / 0{slides.length}</div>
      {/* top:110 (instead of inset:0's top:0) permanently reserves the fixed header's
          unscrolled height so this vertically-centered block can never sit under/behind the
          nav; the font-size and spacing clamps below add a vh-based cap alongside the
          existing vw-based one so the same content also shrinks gracefully on short-height
          "laptop" viewports (same width as a desktop monitor but much less vertical room)
          instead of overflowing upward into the header, while looking identical to before on
          tall viewports where the vh cap never becomes the binding constraint. */}
      <div style={{position:"absolute",top:110,left:0,right:0,bottom:0,display:"flex",flexDirection:"column",justifyContent:"center",padding:"0 6vw",zIndex:3}}>
        <div style={{maxWidth:680}}>
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:"clamp(14px,3vh,28px)"}}><div style={{width:36,height:1,background:C.PL}} /><span style={{fontSize:11,letterSpacing:6,color:C.PL,textTransform:"uppercase"}}>{sl.label}</span></div>
          <h1 style={{fontSize:`clamp(30px,min(5.4vw,7.5vh),${ht.headlineSize}px)`,fontFamily:HERO_FONTS[ht.headlineFont],fontWeight:ht.headlineWeight,fontStyle:ht.headlineItalic?"italic":"normal",letterSpacing:ht.headlineSpacing,color:ht.headlineColor||"#fff",margin:"0 0 clamp(12px,2.5vh,20px)",lineHeight:1.1,whiteSpace:"pre-line"}}>{sl.headline.replace(/\\n/g,"\n")}</h1>
          <p style={{fontSize:`clamp(14px,min(1.5vw,2.1vh),${ht.subSize}px)`,fontFamily:HERO_FONTS[ht.subFont],fontWeight:ht.subWeight,color:ht.subColor||"rgba(255,255,255,0.6)",lineHeight:1.7,maxWidth:460,marginBottom:"clamp(18px,3.5vh,40px)"}}>{sl.sub}</p>
          <div style={{display:"flex",gap:14,flexWrap:"wrap",marginBottom:"clamp(16px,3vh,36px)"}}>
            {/* A custom Button Link (CMS > Hero Slides > Button 1/2 Link) wins when set --
                an absolute URL opens in a new tab, anything else is treated as an internal
                page path -- and falls back to the original page-key navigation (onNav) when
                left blank, exactly as before. */}
            <button onClick={()=>{const l=sl.btn1Link&&sl.btn1Link.trim();if(l){if(/^https?:\/\//i.test(l))window.open(l,"_blank","noopener,noreferrer");else window.location.href=l;}else onNav(sl.page);}} style={{...S.btnP}} onMouseEnter={e=>(e.currentTarget.style.background=C.PD)} onMouseLeave={e=>(e.currentTarget.style.background=C.P)}>{sl.btn1}</button>
            {sl.btn2&&<button onClick={()=>{const l=sl.btn2Link&&sl.btn2Link.trim();if(l){if(/^https?:\/\//i.test(l))window.open(l,"_blank","noopener,noreferrer");else window.location.href=l;}else onNav("booking");}} style={{background:"none",border:"1px solid rgba(255,255,255,0.25)",color:"rgba(255,255,255,0.75)",padding:"13px 36px",fontSize:11,letterSpacing:3,textTransform:"uppercase",cursor:"pointer"}}>{sl.btn2}</button>}
          </div>
          <div style={{maxWidth:420}}>
            {cbStep==="done"?(
              <div style={{display:"flex",alignItems:"center",gap:12,background:"#fff",borderRadius:50,padding:"14px 22px",boxShadow:"0 8px 30px rgba(0,0,0,0.35)"}}>
                <span style={{width:24,height:24,borderRadius:"50%",background:C.P,color:"#fff",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>✓</span>
                <span style={{fontSize:13,color:"#1a1a1a",lineHeight:1.4}}>We've received your request — Naveed will be in touch personally.</span>
              </div>
            ):(
              <>
                <div style={{display:"flex",background:"#fff",borderRadius:50,padding:5,gap:4,boxShadow:"0 8px 30px rgba(0,0,0,0.35)"}}>
                  <input value={cbField.value} onChange={e=>cbField.set(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")cbNext();}} type={cbField.type} placeholder={cbField.placeholder} required aria-label={cbField.placeholder} style={{flex:1,border:"none",outline:"none",background:"transparent",padding:"11px 18px",fontSize:14,color:"#1a1a1a"}} />
                  <button onClick={cbNext} aria-label="Next" style={{width:42,height:42,borderRadius:"50%",border:"none",background:C.P,color:"#fff",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}} onMouseEnter={e=>(e.currentTarget.style.background=C.PD)} onMouseLeave={e=>(e.currentTarget.style.background=C.P)}>→</button>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8,marginTop:12}}>
                  {["phone","name","email"].map(s=>(<span key={s} style={{width:s===cbStep?18:6,height:2,borderRadius:1,background:s===cbStep?C.PL:"rgba(255,255,255,0.25)",transition:"all 0.25s"}} />))}
                  <span style={{fontSize:12,color:"rgba(255,255,255,0.55)",marginLeft:6}}>
                    {cbStep==="phone"&&"Prefer a call? Leave your number to get started."}
                    {cbStep==="name"&&"And your name, please."}
                    {cbStep==="email"&&"Last step — your email address."}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <div style={{position:"absolute",bottom:44,left:"6vw",display:"flex",gap:8,zIndex:3}}>
        {slides.map((_,i)=><button key={i} onClick={()=>go(i)} aria-label={`Slide ${i+1}`} style={{width:i===slide?28:7,height:2,background:i===slide?C.PL:"rgba(255,255,255,0.25)",border:"none",cursor:"pointer",transition:"all 0.35s",padding:0}} />)}
      </div>
      <div style={{position:"absolute",bottom:0,left:0,right:0,height:2,background:"rgba(255,255,255,0.06)",zIndex:3}}>
        <div style={{height:"100%",background:C.P,width:`${prog}%`,transition:"width 0.06s linear"}} />
      </div>
      <button onClick={()=>go((slide-1+slides.length)%slides.length)} aria-label="Previous" style={{position:"absolute",left:20,top:"50%",transform:"translateY(-50%)",color:"rgba(255,255,255,0.3)",background:"none",border:"none",fontSize:36,cursor:"pointer",zIndex:3}} onMouseEnter={e=>(e.currentTarget.style.color=C.PL)} onMouseLeave={e=>(e.currentTarget.style.color="rgba(255,255,255,0.3)")}>‹</button>
      <button onClick={()=>go((slide+1)%slides.length)} aria-label="Next" style={{position:"absolute",right:20,top:"50%",transform:"translateY(-50%)",color:"rgba(255,255,255,0.3)",background:"none",border:"none",fontSize:36,cursor:"pointer",zIndex:3}} onMouseEnter={e=>(e.currentTarget.style.color=C.PL)} onMouseLeave={e=>(e.currentTarget.style.color="rgba(255,255,255,0.3)")}>›</button>
    </div>
  );
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
export default function Home() {
  const router = useRouter();
  // Seeded with the plain code defaults -- byte-for-byte what the static export's own
  // pre-rendered HTML used -- not read from localStorage here. Reading ls() directly inside
  // these initializers made the very first CLIENT render differ from that static HTML
  // whenever this specific browser already had non-empty cached CMS data (e.g. after using
  // the admin panel here), which is a hydration mismatch (React error #418): React then
  // discards and re-renders the whole tree, and a click landing in that split-second window
  // gets silently dropped -- intermittent, hard to reproduce, and exactly this kind of "nav
  // sometimes doesn't respond" report. The locally-cached values are now applied in the
  // effect just below instead, right after mount (same pattern already used for showSplash/
  // isMobile/cms above) -- fetchCloudData() overwrites all of this moments later with the
  // live Supabase values regardless, so nothing about the eventual content changes.
  const [settings,setSettings]=useState<SiteSettings>(DEF_SETTINGS);
  // CMS photo <img>s (Hero, homepage About section) stay unrendered -- same dark background,
  // no photo -- until this flips true, see the "locally-cached CMS data" effect below.
  // Without this, every page load/refresh painted whatever photo was baked into the plain
  // code defaults (or, right after updating a photo in the admin panel on this same device,
  // this browser's still-previous localStorage copy) for a moment before the real current
  // photo replaced it, which read as "the old photo flashes then the new one loads". Gated
  // on the SAME effect that already runs local-cache hydration (one React tick, not a network
  // wait), so this adds no perceptible delay when the cache is already correct.
  const [cmsPhotosReady,setCmsPhotosReady]=useState(false);
  const [projects,setProjects]=useState<Project[]>(DEF_PROJECTS);
  const [cats,setCats]=useState<string[]>(DEF_CATS);
  const [testimonials,setTestimonials]=useState<Testimonial[]>(DEF_TESTIMONIALS);
  const [blog,setBlog]=useState<BlogPost[]>(DEF_BLOG);
  const [blogCats,setBlogCats]=useState<string[]>(DEF_BLOG_CATS);
  const [page,setPage]=useState("home");
  const [selProj,setSelProj]=useState<Project|null>(null);
  const [selBlog,setSelBlog]=useState<BlogPost|null>(null);
  const [filterCat,setFilterCat]=useState("All");
  const [blogFilterCat,setBlogFilterCat]=useState("All");
  const [testiIdx,setTestiIdx]=useState(0);
  const [lb,setLb]=useState({open:false,index:0});
  const [cms,setCms]=useState(false);
  // "authed" tracks whether there's a real, signed-in admin session (see adminSession below --
  // this used to be a client-side PIN check, replaced per Naveed's request for one real login
  // shared by the whole CMS, not a PIN plus a separate sign-in just for Bookings).
  const [authed,setAuthed]=useState(false);
  const [mobileNavOpen,setMobileNavOpen]=useState(false);
  const [isMobile,setIsMobile]=useState(false);
  const [scrolled,setScrolled]=useState(false);
  const [lang,setLang]=useState<Lang>("en");
  const [popupOpen,setPopupOpen]=useState(false);
  const [contactForm,setContactForm]=useState({name:"",email:"",phone:"",subject:"",message:""});
  const [contactSending,setContactSending]=useState(false);
  const [contactSent,setContactSent]=useState(false);
  const [leads,setLeads]=useState<ContactLead[]>([]);
  const [leadsLoading,setLeadsLoading]=useState(false);
  // Branded loading screen on first landing on the homepage. Starts true so the very first
  // paint (server-rendered static HTML included) already shows it -- no flash of the real
  // page underneath before this effect runs. sessionStorage below then instantly turns it
  // back off on any later visit within the same browser session (back button, re-opening the
  // home tab, etc.) so it only ever plays once per visit, not every time.
  const [showSplash,setShowSplash]=useState(true);
  useEffect(()=>{
    try{
      if(sessionStorage.getItem("nap_introSeen")) setShowSplash(false);
      else sessionStorage.setItem("nap_introSeen","1");
    }catch{ setShowSplash(false); }
  },[]);

  // Applies this browser's locally-cached CMS data (see the state initializers above) right
  // after mount, once the static HTML has already hydrated cleanly against the plain code
  // defaults -- avoids the React error #418 hydration mismatch that reading localStorage
  // directly in those initializers used to cause.
  useEffect(()=>{
    setSettings(s=>({...DEF_SETTINGS,...ls("nap_settings",DEF_SETTINGS)}));
    // Projects/Categories/Testimonials/Blog/BlogCats ARE hydrated from localStorage here, same
    // as before -- this is a required safety net, not just a display nicety. The push effects
    // below save whatever is currently in these arrays to Supabase as soon as cloudLoaded goes
    // true, including on a failed/offline cloud fetch (cloudLoaded still flips true then, so an
    // offline first load can still save eventually). Without this local hydration, a failed
    // fetch would leave these arrays on the plain code defaults (dummy placeholder projects/
    // testimonials/posts), and that placeholder data would then get pushed over -- and
    // overwrite -- the real live content. Local hydration guarantees the worst case on a
    // failed fetch is "re-save this browser's last known real data", never "wipe real data
    // with dummy placeholders". (An earlier version of this effect removed this hydration to
    // avoid a stale-photo flash on first paint; that traded a cosmetic issue for a real
    // data-loss risk and was reverted. The photo-flash fix now lives entirely in the
    // cmsPhotosReady-gated <img> tags below instead.)
    setProjects(ls("nap_projects",DEF_PROJECTS));
    setCats(ls("nap_cats",DEF_CATS));
    setTestimonials(ls("nap_testimonials",DEF_TESTIMONIALS));
    setBlog(ls("nap_blog",DEF_BLOG));
    setBlogCats(ls("nap_blogcats",DEF_BLOG_CATS));
  },[]);

  // Admin is reached only via a private link (?admin=1) — never shown in the public nav.
  // Packages/CV/Journal have no standalone URL of their own (same as this SPA's other
  // in-memory-only sections), so the static routes' own nav/footer (SiteHeader.tsx's
  // STATIC_HREF, SiteFooter.tsx's PAGE_HREF) link to them as /?page=packages etc. instead of
  // just falling back to a bare "/" that always shows the Home hero -- this lands the visitor
  // on the actual section they clicked, centralizing on one real, working destination per link.
  useEffect(()=>{
    try{
      const params=new URLSearchParams(window.location.search);
      if(params.get("admin")==="1") setCms(true);
      const p=params.get("page");
      if(p==="packages"||p==="cv"||p==="blog") goTo(p);
    }catch{}
  },[]);

  // Track viewport width so the nav can switch to a mobile menu instead of overflowing.
  useEffect(()=>{
    function check(){ setIsMobile(window.innerWidth<900); }
    check();
    window.addEventListener("resize",check);
    return ()=>window.removeEventListener("resize",check);
  },[]);

  // Collapsing header on scroll (same pattern as creativefusion.llc): once the page scrolls
  // past a small threshold, the top admin/social strip slides/fades away and the main nav
  // rises to fill its place, freeing up viewport space. Passive listener, no layout thrash.
  useEffect(()=>{
    function onScroll(){ setScrolled(window.scrollY>40); }
    onScroll();
    window.addEventListener("scroll",onScroll,{passive:true});
    return ()=>window.removeEventListener("scroll",onScroll);
  },[]);

  // Language switcher: restores the visitor's last choice (falls back to their browser
  // language on a first visit, then to English), and keeps <html lang/dir> in sync so
  // Arabic gets correct right-to-left text direction. Only the fixed site chrome (nav,
  // buttons, contact form -- see UI_STRINGS) is translated; CMS content is unaffected.
  useEffect(()=>{
    try{
      const saved=localStorage.getItem("nap_lang") as Lang|null;
      if(saved&&UI_STRINGS[saved]){ setLang(saved); return; }
      const browser=(navigator.language||"en").slice(0,2).toLowerCase();
      if(LANGS.some(l=>l.code===browser)) setLang(browser as Lang);
    }catch{}
  },[]);
  useEffect(()=>{
    try{ localStorage.setItem("nap_lang",lang); }catch{}
    const meta=LANGS.find(l=>l.code===lang);
    document.documentElement.lang=lang;
    document.documentElement.dir=meta?.rtl?"rtl":"ltr";

    // Drive the hidden Google Website Translator (layout.tsx) so switching languages here
    // translates the WHOLE rendered page -- every CMS section (hero, about, services, CV,
    // journal, packages), not just this component's own UI_STRINGS chrome. The widget loads
    // asynchronously and re-injects its <select> on each full page load, so this polls
    // briefly for it rather than assuming it's already there.
    const googleCode=lang==="zh"?"zh-CN":lang;
    let cancelled=false;
    const isApplied=()=>document.cookie.includes(`googtrans=/en/${googleCode}`);
    const waitForCombo=()=>new Promise<HTMLSelectElement|null>(resolve=>{
      let tries=0;
      const iv=setInterval(()=>{
        if(cancelled){ clearInterval(iv); resolve(null); return; }
        tries++;
        const combo=document.querySelector("select.goog-te-combo") as HTMLSelectElement|null;
        if(combo||tries>25){ clearInterval(iv); resolve(combo); }
      },200);
    });
    (async()=>{
      const combo=await waitForCombo();
      if(!combo||cancelled) return;
      // Google's own change listener isn't always wired up the instant its hidden
      // <select> lands in the DOM, so the very first dispatch can be a silent no-op
      // right after a fresh page load -- our own chrome (nav labels, dir/rtl) would
      // flip correctly while the actual page content stayed English. Confirm via the
      // googtrans cookie Google sets once it has actually translated, and retry a
      // few times if it hasn't, instead of firing once and hoping.
      for(let attempt=0; attempt<6 && !cancelled; attempt++){
        if(isApplied()) return;
        combo.value=googleCode;
        combo.dispatchEvent(new Event("change",{bubbles:true}));
        await new Promise(r=>setTimeout(r,600));
      }
    })();
    return ()=>{ cancelled=true; };
  },[lang]);
  const T=UI_STRINGS[lang];

  // Consultation popup -- shows once per browser session after a short delay, never on
  // the CMS/admin screens (those return before this code path renders). Swappable to a
  // real seasonal offer later just by editing the CMS Popup tab; no discount is invented.
  useEffect(()=>{
    if(!settings.popupEnabled) return;
    try{ if(sessionStorage.getItem("nap_popup_seen")==="1") return; }catch{}
    const t=setTimeout(()=>setPopupOpen(true),Math.max(3,settings.popupDelaySec||20)*1000);
    return ()=>clearTimeout(t);
  },[settings.popupEnabled,settings.popupDelaySec]);
  function closePopup(){ setPopupOpen(false); try{ sessionStorage.setItem("nap_popup_seen","1"); }catch{} }

  // Auto-advance the homepage testimonial spotlight (matches the Hero slideshow's cadence).
  const featuredTesti = testimonials.filter(t=>t.featured);
  useEffect(()=>{
    if(featuredTesti.length<2) return;
    const id=setInterval(()=>setTestiIdx(i=>(i+1)%featuredTesti.length),6000);
    return ()=>clearInterval(id);
  },[featuredTesti.length]);

  // Auto sign-out of the CMS after 30 minutes of inactivity, so an unlocked admin
  // session doesn't stay open indefinitely on a shared or public computer.
  useEffect(()=>{
    if(!authed) return;
    let timer:ReturnType<typeof setTimeout>;
    const TIMEOUT_MS=30*60*1000;
    function reset(){ if(timer) clearTimeout(timer); timer=setTimeout(()=>{ adminSignOut(); },TIMEOUT_MS); }
    reset();
    window.addEventListener("click",reset);
    window.addEventListener("keydown",reset);
    return ()=>{ if(timer) clearTimeout(timer); window.removeEventListener("click",reset); window.removeEventListener("keydown",reset); };
  },[authed]);

  const [editId,setEditId]=useState<string|null>(null);
  const [cmsTab,setCmsTab]=useState("projects");

  // Lazy-load contact-form submissions only when the CMS Leads tab is actually opened --
  // never on a normal public page load (see the note above addContactLead/fetchContactLeads).
  useEffect(()=>{
    if(cmsTab!=="leads"||!authed) return;
    setLeadsLoading(true);
    fetchContactLeads().then(l=>{ setLeads(l); setLeadsLoading(false); });
  },[cmsTab,authed]);

  // ─── ADMIN SESSION -- the ONE real login for the whole CMS ────────────────────────────
  // Replaces the old client-side PIN check entirely (per explicit request: one login, not
  // a PIN plus a separate sign-in just for Bookings). The PIN was fetched by every visitor
  // as part of the public CMS sync, so it could never be trusted as real security anyway.
  // This is a real Supabase Auth email+password session; the same access token is what the
  // /api/admin/* Pages Functions check server-side before touching the database with the
  // service-role key. See functions/_shared/adminAuth.ts.
  const [adminSession,setAdminSession]=useState<any>(null);
  const [adminSessionChecked,setAdminSessionChecked]=useState(false);
  const [pushStatus,setPushStatus]=useState<"unknown"|"unsupported"|"off"|"on"|"denied">("unknown");
  const [pushBusy,setPushBusy]=useState(false);
  const [pushErr,setPushErr]=useState("");
  // SEO Agent (CMS > SEO Agent) -- real crawl+audit data from /api/admin/seo/*, never
  // fabricated. See functions/api/admin/seo/run.ts for what actually gets checked.
  const [seoAudit,setSeoAudit]=useState<any>(null);
  const [seoLoading,setSeoLoading]=useState(false);
  const [seoRunning,setSeoRunning]=useState(false);
  const [seoErr,setSeoErr]=useState("");
  const [seoFilter,setSeoFilter]=useState<"all"|"critical"|"high"|"medium"|"low"|"opportunity">("all");
  // Image alt-text automation (Cloudflare Workers AI) -- see functions/api/admin/seo/alt-text.ts.
  const [altTextRunning,setAltTextRunning]=useState(false);
  const [altTextResult,setAltTextResult]=useState<any>(null);
  const [altTextErr,setAltTextErr]=useState("");
  // "Add to Home Screen" prompt for regular visitors (not the admin panel). Android/Chrome
  // can trigger the browser's own real install prompt; iPhone/Safari has no API for any
  // website to trigger or detect this, so iOS just gets a one-time instructional banner.
  const [showInstallBanner,setShowInstallBanner]=useState(false);
  const [installPlatform,setInstallPlatform]=useState<"ios"|"android"|"android-manual"|null>(null);
  const [deferredInstallEvent,setDeferredInstallEvent]=useState<any>(null);
  const [adminSignInEmail,setAdminSignInEmail]=useState("");
  const [adminSignInPassword,setAdminSignInPassword]=useState("");
  const [adminSignInBusy,setAdminSignInBusy]=useState(false);
  const [adminSignInErr,setAdminSignInErr]=useState("");
  const [forgotMode,setForgotMode]=useState(false);
  const [forgotBusy,setForgotBusy]=useState(false);
  const [forgotSent,setForgotSent]=useState(false);
  const [resetMode,setResetMode]=useState(false);
  const [newPass1,setNewPass1]=useState(""); const [newPass2,setNewPass2]=useState("");
  const [resetBusy,setResetBusy]=useState(false); const [resetErr,setResetErr]=useState(""); const [resetDone,setResetDone]=useState(false);
  const [bookingsList,setBookingsList]=useState<any[]|null>(null);
  const [bookingsLoading,setBookingsLoading]=useState(false);
  const [bookingsErr,setBookingsErr]=useState("");
  const [bookingActionBusy,setBookingActionBusy]=useState<string|null>(null);
  const [rejectReasonFor,setRejectReasonFor]=useState<string|null>(null);
  // Client messages (CMS > Messages) -- same requireAdmin/adminSession pattern as Bookings.
  // See functions/api/admin/messages.ts / functions/api/client/messages.ts.
  const [msgList,setMsgList]=useState<any[]|null>(null);
  const [msgLoading,setMsgLoading]=useState(false);
  const [msgErr,setMsgErr]=useState("");
  const [msgOpenCustomerId,setMsgOpenCustomerId]=useState<string|null>(null);
  const [msgReplyText,setMsgReplyText]=useState("");
  const [msgSending,setMsgSending]=useState(false);
  // Comments moderation (CMS > Comments) -- same requireAdmin/adminSession pattern as Bookings.
  const [commentsList,setCommentsList]=useState<any[]|null>(null);
  const [commentsLoading,setCommentsLoading]=useState(false);
  const [commentsErr,setCommentsErr]=useState("");
  const [commentActionBusy,setCommentActionBusy]=useState<string|null>(null);
  // Image Permission Requests (CMS > Image Requests) -- manual-approval-only workflow.
  const [permReqList,setPermReqList]=useState<any[]|null>(null);
  const [permReqLoading,setPermReqLoading]=useState(false);
  const [permReqErr,setPermReqErr]=useState("");
  const [permReqActionBusy,setPermReqActionBusy]=useState<string|null>(null);
  const [permReqOpenId,setPermReqOpenId]=useState<string|null>(null);
  const [permReqNotes,setPermReqNotes]=useState("");
  const [permReqRejectReason,setPermReqRejectReason]=useState("");
  const [permReqApprovedUsage,setPermReqApprovedUsage]=useState("");
  const [permReqCreditRequired,setPermReqCreditRequired]=useState(true);
  const [permReqCreditText,setPermReqCreditText]=useState("Photography: Naveed Anjum / Creative Fusion LLC");
  const [rejectReasonText,setRejectReasonText]=useState("");

  // Restore an existing session on load, and react to sign-in/out and password-recovery
  // links (Supabase appends #access_token=...&type=recovery to the URL and this fires a
  // PASSWORD_RECOVERY event) -- this is what makes "Forgot Password" work end to end on
  // the live site itself, instead of needing a one-off manual page.
  useEffect(()=>{
    if(!sb){ setAdminSessionChecked(true); return; }
    sb.auth.getSession().then(async ({data})=>{
      const session=data.session||null;
      setAdminSession(session);
      setAuthed(session ? await hasAdminAccess() : false);
      setAdminSessionChecked(true);
    });
    const {data:sub}=sb.auth.onAuthStateChange((event:string,session:any)=>{
      if(event==="PASSWORD_RECOVERY") setResetMode(true);
      setAdminSession(session||null);
      if(session) hasAdminAccess().then(setAuthed); else setAuthed(false);
    });
    return ()=>{ sub?.subscription?.unsubscribe?.(); };
  },[]);
  async function adminSignIn(){
    if(!sb) return;
    setAdminSignInBusy(true); setAdminSignInErr("");
    const {data,error}=await sb.auth.signInWithPassword({email:adminSignInEmail.trim(),password:adminSignInPassword});
    if(error||!data.session){ setAdminSignInBusy(false); setAdminSignInErr("Incorrect email or password."); return; }
    // Real credentials, but does this account actually hold an admin/staff/super_admin
    // role (migration 0005's user_roles table)? A plain client account authenticates
    // successfully here but must never see the CMS -- sign it back out immediately so no
    // session lingers, rather than just leaving `authed` false.
    const ok = await hasAdminAccess();
    setAdminSignInBusy(false);
    if(!ok){ await sb.auth.signOut(); setAdminSession(null); setAdminSignInErr("This account doesn't have admin access."); return; }
    setAdminSession(data.session); setAuthed(true); setAdminSignInPassword("");
  }
  async function adminSignOut(){ if(sb) await sb.auth.signOut(); setAdminSession(null); setAuthed(false); setBookingsList(null); setCms(false); }

  // ─── PUSH NOTIFICATIONS (mobile + desktop) ─────────────────────────────────────────────
  // Real Web Push (RFC 8291/8292) -- see functions/_shared/webpush.ts for the server side.
  // Nothing here can fabricate a notification: this only registers/removes a browser
  // subscription; the actual sends always happen server-side, from real database events.
  function urlBase64ToUint8Array(b64url:string){
    const pad="=".repeat((4-(b64url.length%4))%4);
    const base64=(b64url+pad).replace(/-/g,"+").replace(/_/g,"/");
    const raw=atob(base64); const arr=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++) arr[i]=raw.charCodeAt(i);
    return arr;
  }
  // ─── "ADD TO HOME SCREEN" PROMPT (public site, every visitor) ─────────────────────────
  // Real behavior only: on Android this captures Chrome's own native install prompt and
  // fires it on tap (nothing fake -- it's the browser's real dialog). On iPhone, Apple
  // gives websites no API to trigger or even detect install-readiness, so this shows a
  // one-time instructional banner instead of pretending to offer a real install button.
  useEffect(()=>{
    if(typeof window==="undefined") return;
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone===true;
    if(isStandalone) return; // already installed/opened as the app -- never nag
    let dismissed=false;
    try{ dismissed = localStorage.getItem("na_install_dismissed")==="1"; }catch{}
    if(dismissed) return;
    const ua = window.navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window);
    const isAndroid = /Android/.test(ua);
    if(isIOS){
      setInstallPlatform("ios"); setShowInstallBanner(true);
    }else if(isAndroid){
      setInstallPlatform("android");
      const handler=(e:any)=>{ e.preventDefault(); setDeferredInstallEvent(e); setShowInstallBanner(true); };
      window.addEventListener("beforeinstallprompt",handler);
      return ()=>window.removeEventListener("beforeinstallprompt",handler);
    }
  },[]);
  function dismissInstallBanner(){
    setShowInstallBanner(false);
    try{ localStorage.setItem("na_install_dismissed","1"); }catch{}
  }
  async function triggerInstall(){
    // Chrome's own install prompt is genuinely flaky in the wild: the captured event can
    // go stale (backgrounding the tab, too much time passed) and .prompt() then just does
    // nothing, silently -- a known Chromium quirk, not something this code can force past.
    // So this never claims success; it only ever reports what actually happened, and the
    // banner's own text (below) already gives a manual path that works regardless.
    if(deferredInstallEvent){
      try{
        deferredInstallEvent.prompt();
        await deferredInstallEvent.userChoice;
        setDeferredInstallEvent(null);
        dismissInstallBanner();
        return;
      }catch(e){
        console.warn("Install prompt failed, falling back to manual instructions:",e);
      }
    }
    // Either there was no captured event, or prompting it failed -- don't hide the banner
    // (that would strand the visitor with no path at all); switch its own text to the
    // manual Chrome-menu steps instead, which always works.
    setInstallPlatform("android-manual");
  }
  useEffect(()=>{
    if(!authed) return;
    if(typeof window==="undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)){ setPushStatus("unsupported"); return; }
    navigator.serviceWorker.register("/sw.js").then(async reg=>{
      const sub = await reg.pushManager.getSubscription();
      setPushStatus(sub ? "on" : (Notification.permission==="denied" ? "denied" : "off"));
    }).catch(()=>setPushStatus("unsupported"));
  },[authed]);
  async function enablePush(){
    setPushErr(""); setPushBusy(true);
    try{
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
      if(!vapidKey){ setPushErr("Notifications aren't configured yet."); setPushBusy(false); return; }
      const perm = await Notification.requestPermission();
      if(perm!=="granted"){ setPushStatus(perm==="denied"?"denied":"off"); setPushBusy(false); return; }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({userVisibleOnly:true, applicationServerKey:urlBase64ToUint8Array(vapidKey)});
      const raw = sub.toJSON() as any;
      const res = await fetch("/api/admin/push/subscribe",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${adminSession?.access_token}`},body:JSON.stringify({endpoint:raw.endpoint,keys:raw.keys})});
      if(!res.ok){ setPushErr("Could not save this device on the server."); setPushBusy(false); return; }
      setPushStatus("on");
    }catch{ setPushErr("Could not enable notifications on this device/browser."); }
    setPushBusy(false);
  }
  async function disablePush(){
    setPushErr(""); setPushBusy(true);
    try{
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if(sub){
        const raw = sub.toJSON() as any;
        await fetch("/api/admin/push/unsubscribe",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${adminSession?.access_token}`},body:JSON.stringify({endpoint:raw.endpoint})}).catch(()=>{});
        await sub.unsubscribe();
      }
      setPushStatus("off");
    }catch{ setPushErr("Could not turn off notifications on this device."); }
    setPushBusy(false);
  }
  async function sendForgotPassword(){
    if(!sb||!adminSignInEmail.trim()) return;
    setForgotBusy(true);
    await sb.auth.resetPasswordForEmail(adminSignInEmail.trim(),{redirectTo:window.location.origin+"/?admin=1"});
    setForgotBusy(false); setForgotSent(true);
  }
  async function submitNewPassword(){
    if(!sb) return;
    setResetErr("");
    if(newPass1.length<6){ setResetErr("Password must be at least 6 characters."); return; }
    if(newPass1!==newPass2){ setResetErr("Passwords don't match."); return; }
    setResetBusy(true);
    const {error}=await sb.auth.updateUser({password:newPass1});
    setResetBusy(false);
    if(error){ setResetErr(error.message); return; }
    setResetDone(true);
  }

  async function loadBookings(){
    if(!adminSession) return;
    setBookingsLoading(true); setBookingsErr("");
    try{
      const res=await fetch("/api/admin/bookings",{headers:{Authorization:`Bearer ${adminSession.access_token}`}});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||"Failed to load bookings");
      setBookingsList(data.bookings||[]);
    }catch(e:any){ setBookingsErr(e.message||"Failed to load bookings"); }
    setBookingsLoading(false);
  }
  useEffect(()=>{ if(cmsTab==="bookings"&&adminSession) loadBookings(); },[cmsTab,adminSession]);

  async function loadMessages(){
    if(!adminSession) return;
    setMsgLoading(true); setMsgErr("");
    try{
      const res=await fetch("/api/admin/messages",{headers:{Authorization:`Bearer ${adminSession.access_token}`}});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||"Failed to load messages");
      setMsgList(data.messages||[]);
    }catch(e:any){ setMsgErr(e.message||"Failed to load messages"); }
    setMsgLoading(false);
  }
  useEffect(()=>{ if(cmsTab==="messages"&&adminSession) loadMessages(); },[cmsTab,adminSession]);
  // Refresh the unread-count badge in the CMS nav regardless of which tab is open, same
  // pattern as Image Requests' pending-count badge above.
  useEffect(()=>{ if(adminSession) loadMessages(); },[adminSession]);

  async function sendAdminReply(customerId:string){
    if(!adminSession||!msgReplyText.trim()) return;
    setMsgSending(true);
    try{
      const res=await fetch("/api/admin/messages",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${adminSession.access_token}`},body:JSON.stringify({customer_id:customerId,body:msgReplyText.trim()})});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||"Failed to send reply");
      setMsgReplyText("");
      await loadMessages();
    }catch(e:any){ setMsgErr(e.message||"Failed to send reply"); }
    setMsgSending(false);
  }

  async function loadComments(){
    if(!adminSession) return;
    setCommentsLoading(true); setCommentsErr("");
    try{
      const res=await fetch("/api/admin/comments",{headers:{Authorization:`Bearer ${adminSession.access_token}`}});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||"Failed to load comments");
      setCommentsList(data.comments||[]);
    }catch(e:any){ setCommentsErr(e.message||"Failed to load comments"); }
    setCommentsLoading(false);
  }
  useEffect(()=>{ if(cmsTab==="comments"&&adminSession) loadComments(); },[cmsTab,adminSession]);

  async function moderateComment(commentId:string,action:"approve"|"hide"|"delete"){
    if(!adminSession) return;
    setCommentActionBusy(commentId);
    try{
      const res=await fetch("/api/admin/comments",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${adminSession.access_token}`},body:JSON.stringify({commentId,action})});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||"Failed to update comment");
      await loadComments();
    }catch(e:any){ alert(e.message||"Failed to update comment"); }
    setCommentActionBusy(null);
  }

  async function loadPermReqs(){
    if(!adminSession) return;
    setPermReqLoading(true); setPermReqErr("");
    try{
      const res=await fetch("/api/admin/permission-requests",{headers:{Authorization:`Bearer ${adminSession.access_token}`}});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||"Failed to load permission requests");
      setPermReqList(data.requests||[]);
    }catch(e:any){ setPermReqErr(e.message||"Failed to load permission requests"); }
    setPermReqLoading(false);
  }
  useEffect(()=>{ if(cmsTab==="permrequests"&&adminSession) loadPermReqs(); },[cmsTab,adminSession]);
  // Refresh the pending-count badge in the CMS nav regardless of which tab is open, so the
  // admin notices a new request without having to click into the tab first.
  useEffect(()=>{ if(adminSession) loadPermReqs(); },[adminSession]);

  async function decidePermReq(requestId:string,action:"approve"|"reject"){
    if(!adminSession) return;
    setPermReqActionBusy(requestId);
    try{
      const res=await fetch("/api/admin/permission-requests",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${adminSession.access_token}`},body:JSON.stringify({
        requestId,action,
        adminNotes:permReqNotes,
        rejectionReason:permReqRejectReason,
        approvedUsage:permReqApprovedUsage,
        creditRequired:permReqCreditRequired,
        creditText:permReqCreditText,
      })});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||"Failed to update request");
      setPermReqOpenId(null); setPermReqNotes(""); setPermReqRejectReason(""); setPermReqApprovedUsage("");
      await loadPermReqs();
    }catch(e:any){ alert(e.message||"Failed to update request"); }
    setPermReqActionBusy(null);
  }

  async function loadSeoAudit(){
    if(!adminSession) return;
    setSeoLoading(true); setSeoErr("");
    try{
      const res=await fetch("/api/admin/seo/audits",{headers:{Authorization:`Bearer ${adminSession.access_token}`}});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||"Failed to load SEO data");
      setSeoAudit(data);
    }catch(e:any){ setSeoErr(e.message||"Failed to load SEO data"); }
    setSeoLoading(false);
  }
  useEffect(()=>{ if(cmsTab==="seoagent"&&adminSession) loadSeoAudit(); },[cmsTab,adminSession]);

  async function runSeoAudit(){
    if(!adminSession) return;
    setSeoRunning(true); setSeoErr("");
    try{
      const res=await fetch("/api/admin/seo/run",{method:"POST",headers:{Authorization:`Bearer ${adminSession.access_token}`}});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||"Audit run failed");
      await loadSeoAudit();
    }catch(e:any){ setSeoErr(e.message||"Audit run failed"); }
    setSeoRunning(false);
  }

  async function seoIssueAction(issueId:string,action:"ignore"|"reopen"){
    if(!adminSession) return;
    try{
      const res=await fetch("/api/admin/seo/issue",{method:"POST",headers:{Authorization:`Bearer ${adminSession.access_token}`,"Content-Type":"application/json"},body:JSON.stringify({issueId,action})});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||"Action failed");
      await loadSeoAudit();
    }catch(e:any){ setSeoErr(e.message||"Action failed"); }
  }

  // Generates real alt text for any portfolio images that don't have it yet, using
  // Cloudflare Workers AI to actually look at each image (see functions/api/admin/seo/alt-text.ts).
  // Never touches an image that already has admin-written alt text.
  async function runAltTextGen(){
    if(!adminSession) return;
    setAltTextRunning(true); setAltTextErr(""); setAltTextResult(null);
    try{
      const res=await fetch("/api/admin/seo/alt-text",{method:"POST",headers:{Authorization:`Bearer ${adminSession.access_token}`}});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||"Alt-text generation failed");
      setAltTextResult(data);
    }catch(e:any){ setAltTextErr(e.message||"Alt-text generation failed"); }
    setAltTextRunning(false);
  }

  async function approvePayment(paymentId:string){
    if(!adminSession) return;
    setBookingActionBusy(paymentId);
    try{
      const res=await fetch(`/api/admin/payments/${paymentId}/approve`,{method:"POST",headers:{Authorization:`Bearer ${adminSession.access_token}`}});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||"Approve failed");
      await loadBookings();
    }catch(e:any){ setBookingsErr(e.message||"Approve failed"); }
    setBookingActionBusy(null);
  }
  async function rejectPayment(paymentId:string){
    if(!adminSession||!rejectReasonText.trim()) return;
    setBookingActionBusy(paymentId);
    try{
      const res=await fetch(`/api/admin/payments/${paymentId}/reject`,{method:"POST",headers:{Authorization:`Bearer ${adminSession.access_token}`,"Content-Type":"application/json"},body:JSON.stringify({reason:rejectReasonText.trim()})});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||"Reject failed");
      setRejectReasonFor(null); setRejectReasonText("");
      await loadBookings();
    }catch(e:any){ setBookingsErr(e.message||"Reject failed"); }
    setBookingActionBusy(null);
  }
  const [form,setForm]=useState<Partial<Project>&{images:Img[];reels:string[];videos:string[];categories:string[]}>({title:"",slug:"",categories:[],description:"",fullDescription:"",clientName:"",location:"",projectDate:"",tags:[],featured:false,coverImage:"",images:[],videos:[],reels:[],youtubeUrl:"",projectName:"",bannerTitle:"",bannerImage:""});
  const [newImg,setNewImg]=useState(""); const [addingImg,setAddingImg]=useState(false);
  const [newReel,setNewReel]=useState(""); const [newCat,setNewCat]=useState(""); const [newBlogCat,setNewBlogCat]=useState("");
  const [cropSrc,setCropSrc]=useState<string|null>(null);
  const [booking,setBooking]=useState({name:"",email:"",phone:"",service:"",date:"",time:"",location:"",details:"",budget:"",agreed:false});
  const [bookingDone,setBookingDone]=useState(false);
  // Real paid appointment flow (separate from the WhatsApp-only quote request above, which stays as-is)
  const [bkStep,setBkStep]=useState(0);
  const [bkCountry,setBkCountry]=useState("+971");
  const [bkPkgId,setBkPkgId]=useState("");
  const [bkPayMethod,setBkPayMethod]=useState<"paypal"|"bank_transfer">("bank_transfer");
  const [bkSlotTaken,setBkSlotTaken]=useState(false);
  const [bkCheckingSlot,setBkCheckingSlot]=useState(false);
  const [bkSubmitting,setBkSubmitting]=useState(false);
  const [bkError,setBkError]=useState("");
  // Lightweight, no-signup human check before the final "Confirm Booking" -- same approach
  // as the standalone /contact form's ContactForm.tsx: a honeypot field bots auto-fill, plus
  // a tiny arithmetic question, both checked in submitAppointment() below.
  const [bkHp,setBkHp]=useState("");
  const [bkCaptchaA]=useState(()=>1+Math.floor(Math.random()*8));
  const [bkCaptchaB]=useState(()=>1+Math.floor(Math.random()*8));
  const [bkCaptchaAnswer,setBkCaptchaAnswer]=useState("");
  const [bkConfirmed,setBkConfirmed]=useState<{ref:string;id:string}|null>(null);
  const [bkReceiptFile,setBkReceiptFile]=useState<File|null>(null);
  const [bkReceiptUploading,setBkReceiptUploading]=useState(false);
  const [bkReceiptDone,setBkReceiptDone]=useState(false);
  const [bkReceiptErr,setBkReceiptErr]=useState("");
  const [settingsDraft,setSettingsDraft]=useState<SiteSettings>(settings);
  const [settingsTab,setSettingsTab]=useState("general");

  // Apply CMS-editable theme colors as CSS custom properties on :root -- every C.xxx usage
  // across the file (Nav/Footer inside Home() and standalone components like FloatingWA,
  // ConsultPopup, Hero, Lightbox, SmartGrid, CropModal, PageBanner) is a var(--c-x,fallback)
  // reference, so this instantly repaints the whole site without touching any of those call sites.
  useEffect(()=>{
    const t=settings.theme; if(!t||typeof document==="undefined") return;
    const root=document.documentElement.style;
    root.setProperty("--c-p",t.P); root.setProperty("--c-pl",t.PL); root.setProperty("--c-pd",t.PD);
    root.setProperty("--c-gold",t.GOLD); root.setProperty("--c-goldl",t.GOLDL);
    root.setProperty("--c-bg",t.BG); root.setProperty("--c-fg",t.FG); root.setProperty("--c-mid",t.MID);
    root.setProperty("--c-dark",t.DARK); root.setProperty("--c-border",t.BORDER);
    root.setProperty("--c-lt",t.LT); root.setProperty("--c-ltcard",t.LTCARD);
    root.setProperty("--c-ltborder",t.LTBORDER); root.setProperty("--c-inkmid",t.INKMID);
  },[settings.theme]);

  // Surfaces save failures instead of swallowing them -- see pushCloudData's comment. Cleared
  // on the next successful save, whichever section that comes from.
  const [cloudSyncError,setCloudSyncError]=useState<string|null>(null);
  async function pushCloudDataChecked(key:typeof CLOUD_KEYS[number], value:any, label:string){
    const ok = await pushCloudData(key,value);
    setCloudSyncError(ok?null:`Unable to save your last change (${label}) to the server. Check your internet connection and try again -- this browser is showing it, but other visitors and devices are not.`);
  }
  // Guards the six push effects below against a real clobbering bug (confirmed: newly-added
  // project images going missing from the CMS after being saved). On mount, every piece of
  // state above starts from THIS browser's own localStorage snapshot, which can be stale the
  // moment another device/session saved something more recent. If the admin session is
  // already authenticated at mount (it usually is), the push effects used to fire with that
  // stale snapshot the instant React committed the initial render -- often before the cloud
  // fetch below had a chance to correct it -- overwriting the real, newer cloud copy with old
  // local data. Nothing pushes until the initial cloud fetch has resolved at least once, so
  // every push effect always starts from the real current state, never a stale local guess.
  const [cloudLoaded,setCloudLoaded]=useState(false);
  // cloudDataConfirmed is the REAL save gate (see push effects just below) -- true only when
  // the cloud fetch actually reached Supabase and returned something, never just "we tried".
  // cloudLoaded (above) flips true even when that fetch fails, so it stayed the gate for
  // things where showing something is fine either way (cmsPhotosReady). But it's not safe as
  // the SAVE gate: on a failed/offline fetch, cloudLoaded still went true while every array
  // above was sitting on either this browser's local cache (fine) or, for a brand-new browser
  // with no local cache yet, the plain code defaults -- dummy placeholder projects/
  // testimonials/blog posts. Gating saves on cloudLoaded meant a failed fetch on a fresh
  // browser could push that dummy placeholder data over the real live content, with no error
  // shown (the push itself "succeeds" -- it's just pushing the wrong thing). cloudDataConfirmed
  // never goes true unless we've actually confirmed the real state with Supabase, so the worst
  // case on a failed fetch is now "this save doesn't go out yet" (visible via cloudSyncError
  // below), never "silently overwrite real data with placeholders".
  const [cloudDataConfirmed,setCloudDataConfirmed]=useState(false);
  // Only push to the shared cloud copy while an authenticated CMS session made the change AND
  // the cloud fetch has actually confirmed real data at least once (see cloudDataConfirmed
  // above) -- never on a plain public page load, otherwise an ordinary visitor's own (possibly
  // stale) locally-cached copy could momentarily clobber the real live content for everyone.
  useEffect(()=>{try{localStorage.setItem("nap_settings",JSON.stringify(settings));}catch{}; if(authed&&cloudDataConfirmed) pushCloudDataChecked("nap_settings",settings,"Settings");},[settings,authed,cloudDataConfirmed]);
  useEffect(()=>{try{localStorage.setItem("nap_projects",JSON.stringify(projects));}catch{}; if(authed&&cloudDataConfirmed) pushCloudDataChecked("nap_projects",projects,"Projects");},[projects,authed,cloudDataConfirmed]);
  useEffect(()=>{try{localStorage.setItem("nap_cats",JSON.stringify(cats));}catch{}; if(authed&&cloudDataConfirmed) pushCloudDataChecked("nap_cats",cats,"Categories");},[cats,authed,cloudDataConfirmed]);
  useEffect(()=>{try{localStorage.setItem("nap_testimonials",JSON.stringify(testimonials));}catch{}; if(authed&&cloudDataConfirmed) pushCloudDataChecked("nap_testimonials",testimonials,"Testimonials");},[testimonials,authed,cloudDataConfirmed]);
  useEffect(()=>{try{localStorage.setItem("nap_blog",JSON.stringify(blog));}catch{}; if(authed&&cloudDataConfirmed) pushCloudDataChecked("nap_blog",blog,"Blog");},[blog,authed,cloudDataConfirmed]);
  useEffect(()=>{try{localStorage.setItem("nap_blogcats",JSON.stringify(blogCats));}catch{}; if(authed&&cloudDataConfirmed) pushCloudDataChecked("nap_blogcats",blogCats,"Blog Categories");},[blogCats,authed,cloudDataConfirmed]);
  // Lets the admin actually see it when saves are blocked, instead of edits silently not going
  // out: authenticated, the initial fetch has finished, but it never confirmed real cloud data
  // (offline, Supabase unreachable, etc). Clears itself the moment a real save succeeds
  // (pushCloudDataChecked already clears cloudSyncError on success) or the connection recovers.
  useEffect(()=>{
    if(authed&&cloudLoaded&&!cloudDataConfirmed){
      setCloudSyncError("Can't confirm a connection to the server -- your edits are being kept in this browser but are NOT being saved yet. Check your internet connection and reload this page.");
    }
  },[authed,cloudLoaded,cloudDataConfirmed]);
  // On first mount, pull the shared cloud copy (if reachable) so every visitor/device sees the
  // same latest content instead of whatever this particular browser cached locally. cloudLoaded
  // flips to true whether or not the fetch actually found cloud data (an offline first load
  // must still be able to save eventually), unblocking the push effects above exactly once.
  useEffect(()=>{
    let cancelled=false;
    fetchCloudData().then(cloud=>{
      if(cancelled) return;
      if(cloud){
        if(cloud.nap_settings) setSettings(s=>({...DEF_SETTINGS,...cloud.nap_settings}));
        if(cloud.nap_projects) setProjects(cloud.nap_projects);
        if(cloud.nap_cats) setCats(cloud.nap_cats);
        if(cloud.nap_testimonials) setTestimonials(cloud.nap_testimonials);
        if(cloud.nap_blog) setBlog(cloud.nap_blog);
        if(cloud.nap_blogcats) setBlogCats(cloud.nap_blogcats);
      }
      setCloudLoaded(true);
      setCloudDataConfirmed(!!cloud);
      // Only now is it safe to paint the Hero/About photos -- see the localStorage-hydration
      // effect above for why cmsPhotosReady moved here instead of firing on that earlier tick.
      setCmsPhotosReady(true);
    });
    return ()=>{cancelled=true;};
  },[]);

  // Seed the CMS's Settings-tab editing draft from the real `settings` state -- but only
  // once real cloud data has actually been confirmed loaded (cloudDataConfirmed), and only
  // once per sign-in (settingsDraftSyncedRef), never on every change of `adminSession`.
  // The old version re-ran this on ANY change to `adminSession`'s object identity, which
  // includes Supabase's silent background token refresh (same user, new token object) --
  // not just a real sign-in. Two failure modes came from that: (1) on a fresh page load,
  // the session often restores from localStorage faster than the cloud settings fetch
  // resolves, so this fired with `settings` still on its pre-cloud placeholder value,
  // freezing the CMS's Hero Slides / picture fields on stale/old images even after the
  // real cloud data (with the actually-saved picture) arrived a moment later -- exactly
  // "I update a picture, open it again, still shows the old picture" in the CMS itself,
  // even though the live site and the real saved data were fine. (2) a background token
  // refresh firing mid-edit would silently reset any in-progress unsaved changes in the
  // Settings form back to the last-saved state. Gating on cloudDataConfirmed fixes (1);
  // the once-per-sign-in ref guard fixes (2).
  const settingsDraftSyncedRef=useRef(false);
  useEffect(()=>{
    if(!adminSession){ settingsDraftSyncedRef.current=false; return; }
    if(!cloudDataConfirmed) return;
    if(settingsDraftSyncedRef.current) return;
    setSettingsDraft(settings);
    settingsDraftSyncedRef.current=true;
  },[adminSession,cloudDataConfirmed,settings]);

  const filtered=filterCat==="All"?projects:projects.filter(p=>p.categories?.includes(filterCat));
  const featured=projects.filter(p=>p.featured);
  const filteredBlog=blogFilterCat==="All"?blog:blog.filter(b=>b.category===blogFilterCat);
  const WA=settings.waNumber; const WA_MSG=settings.waMsg;

  function goTo(p:string){
    const pe=settings.pageEnabled as Record<string,boolean>|undefined; if(pe&&pe[p]===false) p="home";
    // "Work" has a real, indexable static route (/work) built from the same CMS project data --
    // send every Work nav/link click there instead of flipping to this SPA's own in-page Work
    // view, so there's only one Work page (with a real, bookmarkable bynaveedanjum.com/work URL)
    // instead of two different ones depending on how the visitor got there.
    // Client-side router.push() instead of window.location.href -- a hard navigation here
    // reloads the entire page (full JS re-download + re-hydration), which is exactly what
    // made the Home page visibly stay on screen for a few seconds before Work/Packages/Gear
    // appeared. router.push() does the same real-URL navigation but through Next's own
    // client-side transition, so the target route swaps in immediately.
    if(p==="work"){ router.push("/work"); return; }
    // Packages and Gear now have the same kind of real, indexable static route as Work
    // (/packages, /gear) -- send nav/link clicks there too instead of the old in-page
    // Packages view / the old "/?page=packages" query-param workaround, so the address bar
    // always shows a real bynaveedanjum.com/packages or /gear URL. Gear has no in-memory
    // page view at all; it only ever existed as this real static route.
    if(p==="packages"||p==="gear"){ router.push("/"+p); return; }
    // Contact now has the same kind of real, indexable static route (/contact) as
    // Work/Packages/Gear -- and it's the one with the redesigned advanced form + spam
    // check, so every nav/footer/CTA "Contact" click needs to land there instead of this
    // SPA's old in-page Contact view, or visitors just keep seeing the old design.
    if(p==="contact"){ router.push("/contact"); return; }
    // Same bug class as Contact above: About also has a real, indexable static route
    // (/about) with the current CMS bio, but nothing sent nav/footer/CTA clicks there, so
    // every "About" click kept showing this SPA's old, disconnected in-page About view
    // instead -- which is why an updated bio never appeared to visitors no matter what was
    // saved in the CMS. Route it the same way Work/Packages/Gear/Contact already are.
    if(p==="about"){ router.push("/about"); return; }
    setPage(p);window.scrollTo(0,0);
  }
  function openProj(p:Project){setSelProj(p);setPage("project");window.scrollTo(0,0);}
  function openBlog(b:BlogPost){setSelBlog(b);setPage("blog-post");window.scrollTo(0,0);}

  // Contact form: opens a WhatsApp handoff immediately (same guaranteed-delivery channel every
  // other lead-capture on this site already uses -- Hero callback, popup, booking), then also
  // best-effort saves to Supabase (CMS-viewable under Leads) and, once Naveed has pasted his
  // own free EmailJS credentials into Settings > Contact, emails him a copy. The WhatsApp open
  // happens first and synchronously so it stays inside the click's user-gesture window (an
  // await before window.open() gets it popup-blocked in some browsers).
  async function submitContact(){
    if(!contactForm.name.trim()||!contactForm.email.trim()||!contactForm.message.trim()) return;
    const entry:ContactLead={id:String(Date.now()),date:new Date().toISOString(),...contactForm};
    const waMsg=`New website contact form message:\nName: ${entry.name}\nEmail: ${entry.email}\nPhone: ${entry.phone||"-"}\nSubject: ${entry.subject||"-"}\nMessage: ${entry.message}`;
    window.open(`https://wa.me/${WA}?text=${encodeURIComponent(waMsg)}`,"_blank");
    setContactSending(true);
    await addContactLead(entry);
    notifyServer("new_lead", entry.id);
    await sendEmailNotification(settings,entry);
    setContactSending(false); setContactSent(true);
    setContactForm({name:"",email:"",phone:"",subject:"",message:""});
  }
  function removeLead(id:string){ setLeads(ls=>ls.filter(l=>l.id!==id)); deleteContactLead(id); }
  function saveSettings(){
    const prior=settings,next=settingsDraft;
    setSettings(next);
    // Same auto-cleanup as project saves -- see STORAGE CLEANUP helpers above.
    const dropped=Array.from(settingsImageUrls(prior)).filter(u=>!settingsImageUrls(next).has(u));
    if(dropped.length){
      const inUse=collectAllImageUrls({projects,blog,settings:next});
      deleteStorageFiles(dropped.filter(u=>!inUse.has(u)));
    }
  }
  function updateSD(patch:Partial<SiteSettings>){setSettingsDraft(d=>({...d,...patch}));}

  function startEdit(p:Project|null){setEditId(p?.id||"new");setForm(p?{...p,tags:p.tags||[],categories:p.categories||[]}:{title:"",slug:"",categories:[],description:"",fullDescription:"",clientName:"",location:"",projectDate:"",tags:[],featured:false,coverImage:"",images:[],videos:[],reels:[],youtubeUrl:"",projectName:"",bannerTitle:"",bannerImage:""});}

  async function addImgUrl(){if(!newImg.trim())return;setAddingImg(true);const o=await detectOrientation(newImg.trim());setForm(f=>({...f,images:[...(f.images||[]),{url:newImg.trim(),orientation:o}],coverImage:f.coverImage||newImg.trim()}));setNewImg("");setAddingImg(false);}

  const {Btn:UploadBtn}=useUploader((imgs)=>setForm(f=>({...f,images:[...(f.images||[]),...imgs],coverImage:f.coverImage||imgs[0]?.url||""})));

  function saveProj(){
    if(!form.title?.trim())return;
    const id=editId!=="new"?editId!:Date.now().toString();
    const prior=editId!=="new"?projects.find(x=>x.id===id):undefined;
    // Slug: explicit form.slug wins, else derive from title. Never blank.
    let slug=(form.slug||slugify(form.title||"")||id).trim();
    // Prevent duplicate slugs -- if any OTHER project already has this slug, suffix with
    // -2, -3, etc. until it's unique, instead of silently letting two projects collide on
    // the same /work/[slug] URL (which would make the wrong one win the lookup).
    if(projects.some(x=>x.id!==id&&x.slug===slug)){
      let n=2; const base=slug;
      while(projects.some(x=>x.id!==id&&x.slug===`${base}-${n}`)) n++;
      slug=`${base}-${n}`;
    }
    // Track every slug this project has ever had (oldest first, deduped, current slug
    // excluded) so /work/[slug] can soft-redirect an old shared link instead of 404ing.
    const previousSlugs=prior&&prior.slug&&prior.slug!==slug
      ? Array.from(new Set([...(prior.previousSlugs||[]),prior.slug])).filter(s=>s!==slug)
      : (prior?.previousSlugs||[]);
    const p:Project={id,title:form.title||"",slug,categories:form.categories||[],description:form.description||"",fullDescription:form.fullDescription||"",clientName:form.clientName||"",location:form.location||"",projectDate:form.projectDate||"",tags:Array.isArray(form.tags)?form.tags:[],featured:!!form.featured,coverImage:form.coverImage||"",images:form.images||[],videos:form.videos||[],reels:form.reels||[],youtubeUrl:form.youtubeUrl||"",projectName:form.projectName||"",bannerTitle:form.bannerTitle||"",bannerImage:form.bannerImage||"",previousSlugs};
    const nextProjects=editId!=="new"?projects.map(x=>x.id===editId?p:x):[...projects,p];
    if(editId!=="new")setProjects(ps=>ps.map(x=>x.id===editId?p:x));else setProjects(ps=>[...ps,p]);
    setEditId(null);
    // Auto-delete this project's own previously-uploaded photos that got replaced or removed
    // in this save, once nothing else in the CMS still references them (see STORAGE CLEANUP
    // helpers above).
    if(prior){
      const dropped=Array.from(projectImageUrls(prior)).filter(u=>!projectImageUrls(p).has(u));
      if(dropped.length){
        const inUse=collectAllImageUrls({projects:nextProjects,blog,settings});
        deleteStorageFiles(dropped.filter(u=>!inUse.has(u)));
      }
    }
  }

  function submitBooking(){
    if(!booking.name||!booking.service||!booking.date)return;
    const msg=`Hello ${settings.siteName}! 👋\n\nNew Booking:\n📋 *Service:* ${booking.service}\n👤 *Name:* ${booking.name}\n📧 *Email:* ${booking.email}\n📱 *Phone:* ${booking.phone}\n📅 *Date:* ${booking.date}\n⏰ *Time:* ${booking.time}\n📍 *Location:* ${booking.location}\n💰 *Budget:* ${booking.budget} AED\n📝 ${booking.details}`;
    window.open(`https://wa.me/${WA}?text=${encodeURIComponent(msg)}`,"_blank");
    setBookingDone(true);
  }

  // Real appointment flow: the packages/prices come straight from the live CMS package the
  // person picked (settings.pricingPackages) -- looked up fresh at submit time, never cached
  // from an earlier step -- so an in-between CMS price edit can never be bypassed.
  const bkSelectedPkg = settings.pricingPackages.find(p=>p.id===bkPkgId) || null;
  const bkBase = bkSelectedPkg ? parsePackagePrice(bkSelectedPkg.price) : 0;
  const bkFee = calcFee(bkBase); const bkTotal = calcTotal(bkBase);
  useEffect(()=>{
    if(!booking.date||!booking.time){ setBkSlotTaken(false); return; }
    let cancelled=false; setBkCheckingSlot(true);
    isSlotTaken(booking.date,booking.time).then(taken=>{ if(!cancelled){ setBkSlotTaken(taken); setBkCheckingSlot(false); } });
    return ()=>{cancelled=true;};
  },[booking.date,booking.time]);
  async function submitAppointment(){
    setBkError("");
    if(!booking.name||!booking.email||!booking.date||!booking.time||!bkSelectedPkg||!booking.service){ setBkError("Please complete every required field."); return; }
    if(bkHp.trim()) return; // honeypot tripped -- silently drop, no feedback for bots
    if(Number(bkCaptchaAnswer)!==bkCaptchaA+bkCaptchaB){ setBkError("Please solve the human-check question correctly before continuing."); return; }
    setBkSubmitting(true);
    const stillTaken = await isSlotTaken(booking.date,booking.time);
    if(stillTaken){ setBkSlotTaken(true); setBkSubmitting(false); setBkError("This time slot is no longer available. Please select another time."); return; }
    const customerId = await findOrCreateCustomerId({full_name:booking.name,email:booking.email,phone:booking.phone,whatsapp:booking.phone,company:""});
    if(!customerId){ setBkSubmitting(false); setBkError("Something went wrong saving your details. Please try again."); return; }
    const created = await createAppointment({
      customer_id:customerId, service_key:booking.service, service_name:booking.service,
      package_id:bkSelectedPkg.id, package_name:bkSelectedPkg.label, price_base:bkBase,
      booking_date:booking.date, booking_time:booking.time, notes:booking.details, method:bkPayMethod,
    });
    setBkSubmitting(false);
    if(!created){ setBkError("Payment could not be completed. Please try again."); return; }
    setBkConfirmed(created);
    notifyServer("new_booking", created.id);
    setBkStep(7);
    // Existing WhatsApp notification stays as a bonus heads-up -- real record of truth is now the database above.
    try{ const msg=`New paid appointment ${created.ref}\n${bkSelectedPkg.label} (${booking.service})\n${booking.date} ${booking.time}\nAED ${bkTotal} via ${bkPayMethod==="paypal"?"Online Payment":"Bank Transfer"}\n${booking.name} / ${booking.email} / ${booking.phone}`; window.open(`https://wa.me/${WA}?text=${encodeURIComponent(msg)}`,"_blank"); }catch{}
  }
  async function submitReceipt(){
    if(!bkReceiptFile||!bkConfirmed) return;
    setBkReceiptErr("");
    const invalid = validateReceiptFile(bkReceiptFile);
    if(invalid){ setBkReceiptErr(invalid); return; }
    setBkReceiptUploading(true);
    const path = await uploadReceiptFile(bkReceiptFile,bkConfirmed.id);
    setBkReceiptUploading(false);
    if(!path){ setBkReceiptErr("Please upload a valid payment receipt."); return; }
    notifyServer("receipt_uploaded", bkConfirmed.id);
    setBkReceiptDone(true);
  }
  function resetAppointmentFlow(){
    setBkStep(0); setBkPkgId(""); setBkPayMethod("bank_transfer"); setBkSlotTaken(false); setBkError("");
    setBkConfirmed(null); setBkReceiptFile(null); setBkReceiptDone(false); setBkReceiptErr("");
    setBooking({name:"",email:"",phone:"",service:"",date:"",time:"",location:"",details:"",budget:"",agreed:false});
  }

  // ── NAV ──
  // Nav order everywhere: Home | Work | About | Packages | Gear | Journal | CV | Contact | Book
  // (kept in sync with SiteHeader.tsx's STATIC_NAV_ORDER for the static routes). "Gear" has
  // no translation key of its own in T (its content is English-only, same as the /gear page
  // itself) -- literal label here matches SiteHeader.tsx's static-mode NAV_TEXT.gear default.
  const NAV_LINKS:[string,string][]=[["home",T.home],["work",T.work],["about",T.about],["packages",T.packages],["gear","Gear"],["blog",T.journal],["cv",T.cv],["contact",T.contact]];
  // Skip any page CMS-disabled via Settings > Pages. Home is never in pageEnabled, so it's
  // always shown regardless.
  const visibleNavLinks=NAV_LINKS.filter(([k])=>(settings.pageEnabled as Record<string,boolean>|undefined)?.[k]!==false);

  const site: PublicSiteInfo = {
    siteName: settings.siteName,
    siteTagline: settings.siteTagline,
    phone: settings.phone,
    email: settings.email,
    location: settings.location,
    instagram: settings.instagram,
    youtube: settings.youtube,
    linkedin: settings.linkedin,
    footerCopyright: settings.footerCopyright,
    address: settings.address,
    waNumber: WA,
    waMsg: WA_MSG,
    tiktok: settings.tiktok,
    pageEnabled: settings.pageEnabled as Record<string, boolean>,
    footerLinks: settings.footerLinks.map(l => {
      const tk = PAGE_LABEL_KEY[l.page];
      return { label: (lang === "en" || !tk) ? l.label : T[tk], page: l.page };
    }),
    services: settings.services.map(sv => ({ id: sv.id, title: sv.title })),
    navBookBtn: settings.uiText.navBookBtn,
    footerWhatsappBtn: settings.uiText.footerWhatsappBtn,
    // Additive fields for the standalone /about and /contact routes (lib/cmsData.ts's
    // PublicSiteInfo) -- same underlying CMS fields this SPA's own About/Contact
    // page-views already render below, just also exposed via this shared `site` object.
    aboutName: settings.aboutName,
    aboutTitle: settings.aboutTitle,
    aboutBio: settings.aboutBio,
    aboutPhoto: settings.aboutPhoto,
    statsYears: settings.statsYears,
    statsProjects: settings.statsProjects,
    statsClients: settings.statsClients,
    aboutBannerEyebrow: settings.uiText.aboutBannerEyebrow,
    aboutBannerTitle: settings.uiText.aboutBannerTitle,
    contactBannerEyebrow: settings.uiText.contactBannerEyebrow,
    contactBannerTitle: settings.uiText.contactBannerTitle,
    // Additive fields for the standalone /work index route (lib/cmsData.ts's PublicSiteInfo)
    // -- same underlying CMS fields this SPA's own all-projects Work page-view already reads
    // below (settings.uiText.workBannerEyebrow/workBannerTitle), just also exposed here.
    workBannerEyebrow: settings.uiText.workBannerEyebrow,
    workBannerTitle: settings.uiText.workBannerTitle,
    // Same real banner-background photos (Settings > Pages > Banner Background Image) the
    // SPA's own PageBanner calls below already read from settings.sectionBg, just also
    // exposed here so the standalone /work, /about, /contact, /packages pages show the same
    // photo banner instead of a flat color one.
    workBannerImage: settings.sectionBg.work,
    aboutBannerImage: settings.sectionBg.about,
    contactBannerImage: settings.sectionBg.contact,
    // Additive fields for the standalone /packages route (lib/cmsData.ts's PublicSiteInfo)
    // -- same underlying CMS fields this SPA's own in-memory Packages page-view already
    // reads below (settings.uiText.packagesBannerEyebrow/Title, settings.pricingPackages,
    // settings.services), just also exposed here so the static /packages page renders the
    // same real data instead of duplicating it.
    packagesBannerEyebrow: settings.uiText.packagesBannerEyebrow,
    packagesBannerTitle: settings.uiText.packagesBannerTitle,
    packagesBannerImage: settings.sectionBg.packages,
    pricingPackages: settings.pricingPackages.map(p => ({
      id: p.id, icon: p.icon, label: p.label, price: p.price, priceNote: p.priceNote,
      desc: p.desc, image: p.image, ctaLabel: p.ctaLabel, features: p.features,
    })),
    packagesServices: settings.services.map(sv => ({
      id: sv.id, icon: sv.icon, title: sv.title, desc: sv.desc, deliverables: sv.deliverables,
    })),
    // Additive fields for the standalone /gear route -- same rationale as Work/About/
    // Packages above, so its banner matches the real photo-banner treatment (incl. Journal)
    // instead of the flat banner it had before.
    gearBannerEyebrow: settings.uiText.gearBannerEyebrow,
    gearBannerTitle: settings.uiText.gearBannerTitle,
    gearBannerImage: settings.sectionBg.gear,
    // Additive fields for the standalone /journal and /cv routes (lib/cmsData.ts's
    // PublicSiteInfo) -- same underlying CMS fields this SPA's own Journal/CV page-views
    // already read below (settings.uiText.blogBannerEyebrow/Title, settings.uiText.
    // cvBannerEyebrow/Title, settings.sectionBg.blog/cv, settings.cvSections, settings.skills),
    // just also exposed here so those static routes render the same real data.
    blogBannerEyebrow: settings.uiText.blogBannerEyebrow,
    blogBannerTitle: settings.uiText.blogBannerTitle,
    blogBannerImage: settings.sectionBg.blog,
    cvBannerEyebrow: settings.uiText.cvBannerEyebrow,
    cvBannerTitle: settings.uiText.cvBannerTitle,
    cvBannerImage: settings.sectionBg.cv,
    cvSections: settings.cvSections,
    skills: settings.skills,
    // Homepage <title>/meta-description (Settings > SEO) -- now actually read by
    // app/layout.tsx's generateMetadata(), also exposed here so this shared `site` object
    // matches lib/cmsData.ts's PublicSiteInfo shape.
    seoTitle: settings.seoTitle,
    seoDesc: settings.seoDesc,
  };
  const bookBtnLabel = lang === "en" ? settings.uiText.navBookBtn : T.bookBtn;

  const Nav=()=>(
    <>
      <SiteHeader
        site={site}
        spa={{
          page,
          lang,
          onLangChange: setLang,
          goTo,
          scrolled,
          isMobile,
          mobileNavOpen,
          onToggleMobileNav: () => setMobileNavOpen(o => !o),
          onCloseMobileNav: () => setMobileNavOpen(false),
          visibleLinks: visibleNavLinks,
          bookBtnLabel,
        }}
      />
      {showInstallBanner&&(
      <div style={{position:"fixed",left:12,right:12,bottom:12,zIndex:600,background:"rgba(20,13,33,0.98)",border:`1px solid ${C.BORDER}`,borderRadius:12,padding:"14px 16px",display:"flex",alignItems:"center",gap:12,boxShadow:"0 8px 30px rgba(0,0,0,0.4)",backdropFilter:"blur(10px)"}}>
        <div style={{width:36,height:36,borderRadius:9,background:"#140D21",display:"flex",alignItems:"center",justifyContent:"center",color:"#A855F7",fontSize:14,fontWeight:700,flexShrink:0}}>NA</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:12.5,color:C.FG,fontWeight:600,marginBottom:2}}>Install this site as an app</div>
          <div style={{fontSize:11,color:C.MID,lineHeight:1.4}}>
            {installPlatform==="ios"
              ? "Tap the Share icon below, then \"Add to Home Screen.\""
              : installPlatform==="android-manual"
              ? "Tap your browser's ⋮ menu, then \"Add to Home screen\" / \"Install app.\""
              : "Add a quick-access icon to your home screen."}
          </div>
        </div>
        {installPlatform==="android"&&(
          <button onClick={triggerInstall} style={{...S.btnP,padding:"9px 16px",fontSize:11,flexShrink:0}}>Install</button>
        )}
        <button aria-label="Dismiss" onClick={dismissInstallBanner} style={{background:"none",border:"none",color:C.MID,fontSize:18,lineHeight:1,cursor:"pointer",padding:4,flexShrink:0}}>×</button>
      </div>
    )}
    </>
  );

  // ── FOOTER ──
  const Footer=()=>(
    <SiteFooter site={site} spa={{ goTo }} />
  );

  // ── CMS ──
  if(cms){
    // Single unified login for the whole CMS -- real Supabase email+password, no PIN.
    if(!adminSessionChecked) return(
      <div style={{...S.base,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{color:"#444",fontSize:13}}>Loading…</div>
      </div>
    );

    // Centralized auth, Naveed's request: this CMS gate no longer has its own separate
    // sign-in / forgot-password / set-new-password screens -- /login (+ its Admin tab)
    // and /reset-password + /reset-password/update are now the ONE login and ONE
    // password-reset system for the whole site, admin and client alike. Both branches
    // below just hand off to that centralized system instead of duplicating it here.
    if(resetMode){
      if(typeof window!=="undefined") window.location.href="/reset-password/update";
      return (<div style={{...S.base,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{color:"#444",fontSize:13}}>Redirecting…</div></div>);
    }

    if(!authed){
      if(typeof window!=="undefined") window.location.href="/login?tab=admin";
      return (<div style={{...S.base,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{color:"#444",fontSize:13}}>Redirecting…</div></div>);
    }

    // CMS_NAV -- grouped sidebar navigation. Each leaf routes to the SAME cmsTab/settingsTab
    // state the old flat tab bar used -- this is a navigation/layout reorganization only,
    // every existing panel below is unchanged and still reachable.
    const cmsPageTitle:Record<string,string> = {
      dashboard:"Dashboard", leads:"Leads", bookings:"Bookings & Payments", projects:"Portfolio",
      categories:"Categories", testimonials:"Testimonials", blog:"Journal", media:"Media Library",
      activity:"Activity", errorlog:"Error Logs", access:"Admin & Access", seoagent:"SEO Agent",
      settings:{general:"General",hero:"Hero Slides",about:"About",services:"Services",clients:"Clients",cv:"CV & Skills",footer:"Footer",seo:"SEO & Metadata",contact:"Contact",popup:"Popup",colors:"Colors",text:"Text & Banners",pages:"Navigation & Pages",pricing:"Packages"}[settingsTab] || "Settings",
    };
    function CmsNavItem({icon,label,active,onClick}:{icon:string;label:string;active:boolean;onClick:()=>void}){
      return(
        <button onClick={()=>{onClick();if(isMobile)setMobileNavOpen(false);}} style={{display:"flex",alignItems:"center",gap:10,width:"100%",textAlign:"left" as const,padding:"9px 12px",borderRadius:6,border:"none",cursor:"pointer",marginBottom:2,background:active?C.P:"transparent",color:active?"#fff":"#E8E3F0",fontSize:12.5,fontWeight:active?600:400}}>
          <span style={{fontSize:13,opacity:active?1:0.85}}>{icon}</span>{label}
        </button>
      );
    }
    function CmsNavSection({label}:{label:string}){
      return <div style={{fontSize:10.5,letterSpacing:1.2,textTransform:"uppercase" as const,color:"#6E6480",padding:"16px 12px 6px"}}>{label}</div>;
    }
    const cmsSidebar = (
      <div style={{width:250,minWidth:250,background:C.DARK,borderRight:`1px solid ${C.BORDER}`,position:"fixed",top:0,left:0,height:"100vh",overflowY:"auto" as const,padding:"18px 12px",zIndex:20,transform:(isMobile&&!mobileNavOpen)?"translateX(-100%)":"translateX(0)",transition:"transform 0.2s"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"4px 6px 20px"}}>
          <div style={{width:26,height:26,borderRadius:"50%",background:C.P,flexShrink:0}} />
          <div>
            <div style={{fontSize:12.5,fontWeight:700,letterSpacing:0.5,color:"#fff"}}>CREATIVE FUSION</div>
            <div style={{fontSize:10.5,color:C.MID}}>CMS Admin</div>
          </div>
        </div>
        <CmsNavItem icon="📊" label="Dashboard" active={cmsTab==="dashboard"} onClick={()=>setCmsTab("dashboard")} />
        <CmsNavItem icon="📅" label="Bookings" active={cmsTab==="bookings"} onClick={()=>setCmsTab("bookings")} />
        <CmsNavItem icon="✉️" label={`Messages${msgList&&msgList.filter((m:any)=>m.sender==="client"&&!m.is_read_by_admin).length>0?` · ${msgList.filter((m:any)=>m.sender==="client"&&!m.is_read_by_admin).length}`:""}`} active={cmsTab==="messages"} onClick={()=>setCmsTab("messages")} />
        <CmsNavItem icon="📥" label="Leads" active={cmsTab==="leads"} onClick={()=>setCmsTab("leads")} />
        <CmsNavItem icon="💬" label="Comments" active={cmsTab==="comments"} onClick={()=>setCmsTab("comments")} />
        <CmsNavItem icon="🖼️🔒" label={`Image Requests${permReqList&&permReqList.filter((r:any)=>r.status==="pending").length>0?` · ${permReqList.filter((r:any)=>r.status==="pending").length}`:""}`} active={cmsTab==="permrequests"} onClick={()=>setCmsTab("permrequests")} />
        <CmsNavSection label="Content" />
        <CmsNavItem icon="🖼" label="Portfolio" active={cmsTab==="projects"} onClick={()=>setCmsTab("projects")} />
        <CmsNavItem icon="🏷" label="Categories" active={cmsTab==="categories"} onClick={()=>setCmsTab("categories")} />
        <CmsNavItem icon="⭐" label="Testimonials" active={cmsTab==="testimonials"} onClick={()=>setCmsTab("testimonials")} />
        <CmsNavItem icon="📝" label="Journal" active={cmsTab==="blog"} onClick={()=>setCmsTab("blog")} />
        <CmsNavItem icon="🧾" label="Services" active={cmsTab==="settings"&&settingsTab==="services"} onClick={()=>{setCmsTab("settings");setSettingsTab("services");}} />
        <CmsNavItem icon="💳" label="Packages" active={cmsTab==="settings"&&settingsTab==="pricing"} onClick={()=>{setCmsTab("settings");setSettingsTab("pricing");}} />
        <CmsNavItem icon="🗂" label="Media Library" active={cmsTab==="media"} onClick={()=>setCmsTab("media")} />
        <CmsNavSection label="Website" />
        <CmsNavItem icon="🔀" label="Navigation & Pages" active={cmsTab==="settings"&&settingsTab==="pages"} onClick={()=>{setCmsTab("settings");setSettingsTab("pages");}} />
        <CmsNavItem icon="⚙️" label="General" active={cmsTab==="settings"&&settingsTab==="general"} onClick={()=>{setCmsTab("settings");setSettingsTab("general");}} />
        <CmsNavItem icon="🎞" label="Hero Slides" active={cmsTab==="settings"&&settingsTab==="hero"} onClick={()=>{setCmsTab("settings");setSettingsTab("hero");}} />
        <CmsNavItem icon="👤" label="About" active={cmsTab==="settings"&&settingsTab==="about"} onClick={()=>{setCmsTab("settings");setSettingsTab("about");}} />
        <CmsNavItem icon="🤝" label="Clients" active={cmsTab==="settings"&&settingsTab==="clients"} onClick={()=>{setCmsTab("settings");setSettingsTab("clients");}} />
        <CmsNavItem icon="🎓" label="CV & Skills" active={cmsTab==="settings"&&settingsTab==="cv"} onClick={()=>{setCmsTab("settings");setSettingsTab("cv");}} />
        <CmsNavItem icon="📦" label="Gear Photos" active={cmsTab==="settings"&&settingsTab==="gear"} onClick={()=>{setCmsTab("settings");setSettingsTab("gear");}} />
        <CmsNavItem icon="⬇️" label="Footer" active={cmsTab==="settings"&&settingsTab==="footer"} onClick={()=>{setCmsTab("settings");setSettingsTab("footer");}} />
        <CmsNavItem icon="✉️" label="Contact" active={cmsTab==="settings"&&settingsTab==="contact"} onClick={()=>{setCmsTab("settings");setSettingsTab("contact");}} />
        <CmsNavItem icon="🔔" label="Popup" active={cmsTab==="settings"&&settingsTab==="popup"} onClick={()=>{setCmsTab("settings");setSettingsTab("popup");}} />
        <CmsNavItem icon="🎨" label="Colors" active={cmsTab==="settings"&&settingsTab==="colors"} onClick={()=>{setCmsTab("settings");setSettingsTab("colors");}} />
        <CmsNavItem icon="🔤" label="Text & Banners" active={cmsTab==="settings"&&settingsTab==="text"} onClick={()=>{setCmsTab("settings");setSettingsTab("text");}} />
        <CmsNavSection label="SEO" />
        <CmsNavItem icon="🤖" label="SEO Agent" active={cmsTab==="seoagent"} onClick={()=>setCmsTab("seoagent")} />
        <CmsNavItem icon="🔍" label="SEO & Metadata" active={cmsTab==="settings"&&settingsTab==="seo"} onClick={()=>{setCmsTab("settings");setSettingsTab("seo");}} />
        <CmsNavSection label="System" />
        <CmsNavItem icon="📈" label="Activity" active={cmsTab==="activity"} onClick={()=>setCmsTab("activity")} />
        <CmsNavItem icon="⚠️" label="Error Logs" active={cmsTab==="errorlog"} onClick={()=>setCmsTab("errorlog")} />
        <CmsNavItem icon="🔐" label="Admin & Access" active={cmsTab==="access"} onClick={()=>setCmsTab("access")} />
        {/* Sign out, also reachable here in the sidebar (not just the top bar) -- stays
            visible/reachable on every tab, including on mobile where the top bar's own
            Sign Out can wrap off to a second line next to the admin's email. */}
        <div style={{marginTop:16,borderTop:`1px solid ${C.BORDER}`,padding:"14px 6px 6px"}}>
          <div style={{fontSize:10.5,color:C.MID,padding:"0 6px 8px",wordBreak:"break-all" as const}}>{adminSession?.user?.email}</div>
          <button onClick={adminSignOut} style={{...S.btnO,width:"100%",padding:"9px 6px"}}>Sign Out</button>
        </div>
      </div>
    );

    return(
      <div style={{...S.base,paddingLeft:isMobile?0:250}} onKeyDown={e=>{
        // CMS-wide: pressing Enter in any plain text field must never save/submit anything --
        // only clicking the section's own Save/Add button does. Covers every tab (Settings,
        // Testimonials, Blog, Categories, etc.), not just Projects, which already had this same
        // guard on its own edit panel. Buttons are untouched -- Enter while a button itself has
        // focus still "clicks" it (normal keyboard accessibility), and textareas keep normal
        // Enter-for-newline. Deliberate exceptions (typing a category/tag then hitting Enter to
        // add it, or pasting an image URL) are marked data-allow-enter="true" at the input.
        if(e.key==="Enter" && (e.target as HTMLElement).tagName==="INPUT" && (e.target as HTMLElement).getAttribute("data-allow-enter")!=="true"){
          e.preventDefault();
        }
      }}>
        {cmsSidebar}
        {isMobile&&mobileNavOpen&&<div onClick={()=>setMobileNavOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:19}} />}
        <div style={{background:C.LTCARD,borderBottom:`1px solid ${C.LTBORDER}`,padding:"14px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:10,gap:12,flexWrap:"wrap" as const}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            {isMobile&&<button onClick={()=>setMobileNavOpen(v=>!v)} style={{...S.btnO,padding:"8px 12px"}}>☰</button>}
            <span style={{fontSize:15,fontWeight:700,color:"#140D21"}}>{cmsPageTitle[cmsTab]||cmsPageTitle.settings}</span>
          </div>
          <div style={{display:"flex",gap:12,alignItems:"center"}}>
            {cmsTab==="projects"&&<button onClick={()=>startEdit(null)} style={S.btnP}>+ New Project</button>}
            <span style={{fontSize:11,color:"#6E6480"}}>{adminSession?.user?.email}</span>
            <button onClick={adminSignOut} style={S.btnO}>Sign Out</button>
          </div>
        </div>
        {cloudSyncError&&(
          <div style={{background:"#3a1414",borderBottom:"1px solid #ff6b6b",color:"#ff9b9b",padding:"10px 24px",fontSize:12,textAlign:"center"}}>
            ⚠️ {cloudSyncError}
          </div>
        )}

        {/* DASHBOARD -- real, computed overview (no fabricated data). Landing screen after login. */}
        {cmsTab==="dashboard"&&(
          <div style={{maxWidth:1100,margin:"0 auto",padding:"32px 24px"}}>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(4,1fr)",gap:16,marginBottom:28}}>
              {[
                ["TOTAL BOOKINGS", String((bookingsList||[]).length||"—")],
                ["PENDING RECEIPTS", String((bookingsList||[]).filter((b:any)=>(b.payments||[])[0]?.status==="under_review").length)],
                ["PUBLISHED PROJECTS", String(projects.length)],
                ["NEW LEADS", String(leads.length)],
              ].map(([label,value])=>(
                <div key={label} style={{background:C.LTCARD,border:`1px solid ${C.LTBORDER}`,borderRadius:12,padding:20}}>
                  <div style={{fontSize:11,letterSpacing:1,color:"#6E6480",marginBottom:8,textTransform:"uppercase" as const}}>{label}</div>
                  <div style={{fontSize:26,fontWeight:700,color:"#140D21"}}>{value}</div>
                </div>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"2fr 1fr",gap:16}}>
              <div style={{background:C.LTCARD,border:`1px solid ${C.LTBORDER}`,borderRadius:12,padding:22}}>
                <div style={{fontSize:15,fontWeight:600,color:"#140D21",marginBottom:4}}>Recent Bookings</div>
                <div style={{fontSize:11.5,color:"#6E6480",marginBottom:16}}>Latest bookings received</div>
                {!bookingsList||bookingsList.length===0?(
                  <div style={{fontSize:12,color:"#8a8098",fontStyle:"italic" as const}}>No bookings yet.</div>
                ):bookingsList.slice(0,5).map((b:any)=>(
                  <div key={b.id} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid rgba(0,0,0,0.06)",fontSize:12.5}}>
                    <span style={{color:"#140D21"}}>{b.appointment_ref} — {b.customers?.full_name||"—"}</span>
                    <span style={{color:"#6E6480"}}>{String(b.status).replace(/_/g," ")}</span>
                  </div>
                ))}
                <button onClick={()=>setCmsTab("bookings")} style={{...S.btnSm,marginTop:14}}>View All Bookings →</button>
              </div>
              <div style={{background:C.LTCARD,border:`1px solid ${C.LTBORDER}`,borderRadius:12,padding:22}}>
                <div style={{fontSize:15,fontWeight:600,color:"#140D21",marginBottom:14}}>Quick Actions</div>
                <div style={{display:"flex",flexDirection:"column" as const,gap:8}}>
                  <button onClick={()=>{setCmsTab("projects");startEdit(null);}} style={{...S.btnSm,textAlign:"left" as const}}>+ Add Portfolio Project</button>
                  <button onClick={()=>setCmsTab("bookings")} style={{...S.btnSm,textAlign:"left" as const}}>📥 Review Bookings</button>
                  <button onClick={()=>setCmsTab("leads")} style={{...S.btnSm,textAlign:"left" as const}}>✉️ View Leads ({leads.length})</button>
                  <button onClick={()=>{setCmsTab("settings");setSettingsTab("pricing");}} style={{...S.btnSm,textAlign:"left" as const}}>🧾 Edit Packages</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MEDIA LIBRARY -- real aggregation of media already stored on projects, hero slides,
            about photo and journal covers. Read-only browse; uploads still happen from within
            each section (Portfolio / Hero Slides / About / Journal) so there's one source of truth. */}
        {cmsTab==="media"&&(
          <div style={{maxWidth:1100,margin:"0 auto",padding:"32px 24px"}}>
            <div style={{fontSize:12,color:"#6E6480",marginBottom:20,lineHeight:1.6}}>All images and videos currently used across your site, gathered from where they're actually stored. To add or remove media, open the section it belongs to (Portfolio, Hero Slides, About, or Journal) -- this is a browse view, not a separate upload location.</div>
            {(()=>{
              const items:{src:string;label:string;kind:string}[]=[];
              projects.forEach(p=>{ if(p.coverImage) items.push({src:p.coverImage,label:p.title,kind:"Portfolio cover"}); (p.images||[]).forEach(im=>items.push({src:im.url,label:p.title,kind:"Portfolio image"})); });
              settings.heroSlides.forEach(h=>{ if(h.img) items.push({src:h.img,label:h.label,kind:"Hero slide"}); });
              if(settings.aboutPhoto) items.push({src:settings.aboutPhoto,label:"About photo",kind:"About"});
              blog.forEach(b=>{ if(b.coverImage) items.push({src:b.coverImage,label:b.title,kind:"Journal cover"}); });
              return items.length===0?(
                <div style={{fontSize:12,color:"#8a8098",fontStyle:"italic" as const}}>No media found yet.</div>
              ):(
                <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(5,1fr)",gap:14}}>
                  {items.map((it,i)=>(
                    <div key={i} style={{background:C.LTCARD,border:`1px solid ${C.LTBORDER}`,borderRadius:10,overflow:"hidden"}}>
                      <div style={{width:"100%",aspectRatio:"1",backgroundImage:`url(${it.src})`,backgroundSize:"cover",backgroundPosition:"center"}} />
                      <div style={{padding:"8px 10px"}}>
                        <div style={{fontSize:11,color:"#140D21",fontWeight:600,whiteSpace:"nowrap" as const,overflow:"hidden",textOverflow:"ellipsis"}}>{it.label}</div>
                        <div style={{fontSize:9.5,color:"#8a8098",textTransform:"uppercase" as const,letterSpacing:0.5}}>{it.kind}</div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* ACTIVITY & ERROR LOGS -- honest placeholders for now. Wiring these to a real, persisted
            audit trail is a separate, larger change (a new synced log) and hasn't been built yet --
            this deliberately shows an empty state instead of fabricated entries. */}
        {(cmsTab==="activity"||cmsTab==="errorlog")&&(
          <div style={{maxWidth:700,margin:"64px auto",padding:"0 24px",textAlign:"center" as const}}>
            <div style={{fontSize:32,marginBottom:12}}>{cmsTab==="activity"?"📈":"⚠️"}</div>
            <div style={{fontSize:15,fontWeight:600,color:"#140D21",marginBottom:8}}>{cmsTab==="activity"?"Activity log":"Error logs"} coming soon</div>
            <div style={{fontSize:12.5,color:"#6E6480",lineHeight:1.6}}>{cmsTab==="activity"?"A real, persisted history of changes made in this CMS will appear here.":"Application errors will appear here with a friendly summary and expandable technical detail, without exposing raw errors to visitors."} This section isn't wired up yet -- ask to have it built next and it will show genuine data only, never placeholder entries.</div>
          </div>
        )}

        {/* SEO AGENT -- real crawler + audit engine (Phase 1). Every number on this screen
            comes from an actual fetch of the real live site, done when "Run Full SEO
            Audit" is clicked (see functions/api/admin/seo/run.ts). No fake data, ever --
            an empty state means no audit has run yet, not that everything is perfect. */}
        {cmsTab==="seoagent"&&(
          <div style={{maxWidth:1100,margin:"0 auto",padding:"32px 24px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap" as const,gap:16,marginBottom:24}}>
              <div style={{maxWidth:480}}>
                <div style={{fontSize:11,letterSpacing:4,color:C.MID,marginBottom:6,textTransform:"uppercase" as const}}>SEO Agent</div>
                <div style={{fontSize:12.5,color:C.MID,lineHeight:1.6}}>Crawls the real live site and audits every real, public page from your sitemap -- titles, meta descriptions, headings, images, canonical tags, Open Graph, structured data, mobile viewport and content depth. No fake data, ever.</div>
              </div>
              <button onClick={runSeoAudit} disabled={seoRunning} style={{...S.btnP,opacity:seoRunning?0.6:1,cursor:seoRunning?"default":"pointer"}}>{seoRunning?"⏳ Crawling site…":"▶ Run Full SEO Audit"}</button>
            </div>

            {seoErr&&<div style={{background:"#3a1414",border:"1px solid #ff6b6b",color:"#ff9b9b",padding:"10px 14px",borderRadius:8,fontSize:12,marginBottom:16}}>⚠️ {seoErr}</div>}
            {seoLoading&&!seoAudit&&<div style={{fontSize:12.5,color:C.MID}}>Loading…</div>}

            {!seoLoading&&!seoAudit?.lastAudit&&(
              <div style={{background:C.LTCARD,border:`1px solid ${C.LTBORDER}`,borderRadius:12,padding:"40px 24px",textAlign:"center" as const}}>
                <div style={{fontSize:32,marginBottom:12}}>🤖</div>
                <div style={{fontSize:14,fontWeight:600,color:"#140D21",marginBottom:8}}>No audit has run yet</div>
                <div style={{fontSize:12.5,color:"#6E6480"}}>Click "Run Full SEO Audit" above to crawl bynaveedanjum.com and generate real findings.</div>
              </div>
            )}

            {seoAudit?.lastAudit&&(
              <>
                <div style={{fontSize:11,color:C.MID,marginBottom:16}}>
                  Last run: {new Date(seoAudit.lastAudit.finished_at||seoAudit.lastAudit.started_at).toLocaleString()} · {seoAudit.lastAudit.status} · {seoAudit.lastAudit.pages_crawled} pages crawled · {(seoAudit.issues||[]).length} findings
                </div>

                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",gap:12,marginBottom:28}}>
                  {Object.entries(seoAudit.lastAudit.score_by_category||{}).map(([cat,score]:[string,any])=>(
                    <div key={cat} style={{background:C.LTCARD,border:`1px solid ${C.LTBORDER}`,borderRadius:10,padding:"14px 16px"}}>
                      <div style={{fontSize:10,letterSpacing:1,textTransform:"uppercase" as const,color:"#6E6480",marginBottom:6}}>{cat}</div>
                      <div style={{fontSize:22,fontWeight:700,color:score>=80?"#22c55e":score>=50?"#f59e0b":"#ef4444"}}>{score}</div>
                    </div>
                  ))}
                </div>

                <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap" as const}}>
                  {(["all","critical","high","medium","low","opportunity"] as const).map(f=>(
                    <button key={f} onClick={()=>setSeoFilter(f)} style={{...S.btnSm,background:seoFilter===f?C.P:"transparent",color:seoFilter===f?"#fff":undefined,borderColor:seoFilter===f?C.P:undefined,textTransform:"capitalize" as const}}>{f}</button>
                  ))}
                </div>

                <div style={{display:"flex",flexDirection:"column" as const,gap:10}}>
                  {(seoAudit.issues||[]).filter((i:any)=>seoFilter==="all"||i.severity===seoFilter).map((issue:any)=>(
                    <div key={issue.id} style={{background:C.LTCARD,border:`1px solid ${C.LTBORDER}`,borderRadius:10,padding:"14px 16px",opacity:issue.status==="ignored"?0.55:1}}>
                      <div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap" as const}}>
                        <div style={{flex:1,minWidth:220}}>
                          <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4,flexWrap:"wrap" as const}}>
                            <span style={{fontSize:9.5,fontWeight:700,letterSpacing:0.5,textTransform:"uppercase" as const,padding:"2px 7px",borderRadius:4,background:issue.severity==="critical"?"#ef4444":issue.severity==="high"?"#f59e0b":issue.severity==="medium"?"#eab308":issue.severity==="low"?"#3b82f6":"#8b5cf6",color:"#fff"}}>{issue.severity}</span>
                            <span style={{fontSize:9.5,color:"#8a8098"}}>{issue.category}</span>
                            <span style={{fontSize:12.5,fontWeight:600,color:"#140D21"}}>{issue.title}</span>
                          </div>
                          <div style={{fontSize:11.5,color:"#6E6480",marginBottom:4}}>{issue.page_path}</div>
                          <div style={{fontSize:12,color:"#4a4458",lineHeight:1.5}}>{issue.description}</div>
                          {issue.recommendation&&<div style={{fontSize:11.5,color:"#6E6480",marginTop:4}}><b>Fix:</b> {issue.recommendation}</div>}
                        </div>
                        <div style={{display:"flex",gap:6,alignItems:"flex-start",flexShrink:0}}>
                          {issue.status!=="ignored"?(
                            <button onClick={()=>seoIssueAction(issue.id,"ignore")} style={S.btnSm}>Ignore</button>
                          ):(
                            <button onClick={()=>seoIssueAction(issue.id,"reopen")} style={S.btnSm}>Reopen</button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {(seoAudit.issues||[]).length===0&&<div style={{fontSize:12.5,color:C.MID}}>No issues found on the last run. 🎉</div>}
                </div>
              </>
            )}

            <div style={{marginTop:32,padding:"16px 18px",background:C.LTCARD,border:`1px solid ${C.LTBORDER}`,borderRadius:10}}>
              <div style={{fontSize:11,fontWeight:600,color:"#140D21",marginBottom:6}}>Image Alt Text (Cloudflare Workers AI)</div>
              <div style={{fontSize:12,color:"#6E6480",lineHeight:1.6,marginBottom:10}}>
                Scans every portfolio image with no alt text yet and generates a real, one-sentence description by analyzing that exact image with Cloudflare Workers AI -- already part of this Cloudflare account, no new service. Existing alt text is never overwritten.
              </div>
              <button onClick={runAltTextGen} disabled={altTextRunning} style={{...S.btnP,opacity:altTextRunning?0.6:1,cursor:altTextRunning?"default":"pointer"}}>{altTextRunning?"⏳ Generating…":"✨ Generate Missing Alt Text"}</button>
              {altTextErr&&<div style={{fontSize:12,color:"#c0392b",marginTop:10}}>⚠️ {altTextErr}</div>}
              {altTextResult&&(
                <div style={{marginTop:10,fontSize:12,color:"#140D21"}}>
                  <b>{altTextResult.updated}</b> image(s) updated.
                  {(altTextResult.results||[]).some((r:any)=>r.error)&&(
                    <div style={{marginTop:6,color:"#6E6480"}}>
                      {(altTextResult.results||[]).filter((r:any)=>r.error).map((r:any,i:number)=>(
                        <div key={i}>⚠ {r.project}: {r.error}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{marginTop:16,padding:"16px 18px",background:C.LTCARD,border:`1px solid ${C.LTBORDER}`,borderRadius:10}}>
              <div style={{fontSize:11,fontWeight:600,color:"#140D21",marginBottom:6}}>Integrations</div>
              <div style={{fontSize:12,color:"#6E6480",lineHeight:1.6}}>
                Google Search Console: <b>Not connected yet</b> · Google Analytics 4: <b>Not connected</b> · Semrush: <b>Not connected</b><br/>
                This first version audits your real live pages directly. Connecting Search Console for real click/impression data, and one-click safe auto-fixes for real issues, are the next steps.
              </div>
            </div>
          </div>
        )}

        {/* ADMIN & ACCESS -- real info about the current, single admin session. */}
        {cmsTab==="access"&&(
          <div style={{maxWidth:600,margin:"48px auto",padding:"0 24px"}}>
            <div style={{background:C.LTCARD,border:`1px solid ${C.LTBORDER}`,borderRadius:12,padding:24}}>
              <div style={{fontSize:15,fontWeight:600,color:"#140D21",marginBottom:16}}>Signed in</div>
              <div style={{fontSize:13,color:"#140D21",marginBottom:4}}>{adminSession?.user?.email}</div>
              <div style={{fontSize:11.5,color:"#6E6480",marginBottom:20}}>Authenticated via Supabase Auth (email + password)</div>
              <div style={{fontSize:11.5,color:"#8a8098",lineHeight:1.6,borderTop:"1px solid rgba(0,0,0,0.06)",paddingTop:16}}>This CMS currently has a single administrator account. Multiple admin users with individual permissions aren't set up yet -- ask if you'd like that added.</div>
            </div>

            <div style={{background:C.LTCARD,border:`1px solid ${C.LTBORDER}`,borderRadius:12,padding:24,marginTop:16}}>
              <div style={{fontSize:15,fontWeight:600,color:"#140D21",marginBottom:6}}>Push Notifications</div>
              <div style={{fontSize:11.5,color:"#6E6480",marginBottom:16,lineHeight:1.6}}>Get alerted on this device -- desktop or mobile -- for new bookings, receipts awaiting review, new contact messages, and payment approvals/rejections, even when this tab isn't open. On iPhone, add this site to your Home Screen first (Share → Add to Home Screen) -- that's Apple's requirement for push, not something this CMS can skip.</div>
              {pushStatus==="unsupported"&&<div style={{fontSize:12,color:"#8a8098"}}>Not supported in this browser.</div>}
              {pushStatus==="denied"&&<div style={{fontSize:12,color:"#c0392b"}}>Notifications are blocked for this site in your browser settings -- allow them there, then reload.</div>}
              {(pushStatus==="off"||pushStatus==="unknown")&&<button onClick={enablePush} disabled={pushBusy} style={{...S.btnP,opacity:pushBusy?0.6:1}}>{pushBusy?"Enabling…":"🔔 Enable Notifications on This Device"}</button>}
              {pushStatus==="on"&&(
                <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap" as const}}>
                  <span style={{fontSize:12,color:"#22C55E",fontWeight:600}}>✓ Enabled on this device</span>
                  <button onClick={disablePush} disabled={pushBusy} style={S.btnO}>{pushBusy?"…":"Turn Off"}</button>
                </div>
              )}
              {pushErr&&<div style={{fontSize:11.5,color:"#c0392b",marginTop:10}}>{pushErr}</div>}
            </div>
          </div>
        )}

        {/* LEADS -- contact-form submissions saved by any visitor (see fetchContactLeads) */}
        {cmsTab==="leads"&&(
          <div style={{maxWidth:800,margin:"48px auto",padding:"0 24px"}}>
            <div style={{fontSize:11,letterSpacing:4,color:C.MID,marginBottom:20,textTransform:"uppercase"}}>Contact Form Submissions</div>
            <div style={{fontSize:12,color:"#888",background:"#10101c",border:`1px solid ${C.BORDER}`,borderRadius:4,padding:"12px 16px",marginBottom:20,lineHeight:1.6}}>
              Every submission also opens a WhatsApp message to you immediately, so nothing is missed even if this list below is briefly empty. {!settings.emailjsServiceId&&"Add your free EmailJS details in Settings → Contact to also get them by email."}
            </div>
            {leadsLoading?(
              <div style={{color:"#444",fontSize:13}}>Loading…</div>
            ):leads.length===0?(
              <div style={{color:"#444",fontSize:13,fontStyle:"italic"}}>No submissions yet.</div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                {leads.map(l=>(
                  <div key={l.id} style={{background:"#10101c",border:`1px solid ${C.BORDER}`,borderRadius:4,padding:20,position:"relative"}}>
                    <button onClick={()=>removeLead(l.id)} style={{position:"absolute",top:12,right:12,background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:14}}>✕</button>
                    <div style={{fontSize:10,color:"#555",letterSpacing:1,marginBottom:8}}>{new Date(l.date).toLocaleString()}</div>
                    <div style={{fontSize:14,color:"#fff",fontWeight:700,marginBottom:4}}>{l.name} {l.subject&&<span style={{color:C.PL,fontWeight:400}}>· {l.subject}</span>}</div>
                    <div style={{fontSize:12,color:C.MID,marginBottom:10}}>{l.email}{l.phone&&` · ${l.phone}`}</div>
                    <div style={{fontSize:13,color:"#ccc",lineHeight:1.6,whiteSpace:"pre-wrap"}}>{l.message}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* BOOKINGS -- approve/reject bank-transfer payments. By the time this tab can even be
            reached, the single CMS login above has already established a real Supabase Auth
            session (adminSession) -- that's the credential these calls send, never the PIN. */}
        {cmsTab==="bookings"&&(
          <div style={{maxWidth:900,margin:"48px auto",padding:"0 24px"}}>
            <>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                  <div style={{fontSize:11,letterSpacing:4,color:C.MID,textTransform:"uppercase"}}>Bookings &amp; Payments</div>
                  <div style={{display:"flex",gap:10,alignItems:"center"}}>
                    <button onClick={loadBookings} style={S.btnSm}>↻ Refresh</button>
                  </div>
                </div>
                {bookingsErr&&<div style={{color:"#e74c3c",fontSize:12,marginBottom:16,background:"#2a1010",border:"1px solid #4a2020",borderRadius:4,padding:"10px 14px"}}>{bookingsErr}</div>}
                {bookingsLoading?(
                  <div style={{color:"#444",fontSize:13}}>Loading…</div>
                ):!bookingsList||bookingsList.length===0?(
                  <div style={{color:"#444",fontSize:13,fontStyle:"italic"}}>No bookings yet.</div>
                ):(
                  <div style={{display:"flex",flexDirection:"column",gap:14}}>
                    {bookingsList.map((b:any)=>{
                      const payment=(b.payments||[])[0];
                      const cust=b.customers;
                      const canDecide=payment&&payment.status==="under_review"&&payment.receipt_path;
                      const statusColor:Record<string,string>={pending_verification:"#d4a017",confirmed:"#2ecc71",payment_rejected:"#e74c3c",cancelled:"#666",completed:"#3498db"};
                      return(
                        <div key={b.id} style={{background:"#10101c",border:`1px solid ${C.BORDER}`,borderRadius:4,padding:20}}>
                          <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8,marginBottom:10}}>
                            <div>
                              <div style={{fontSize:14,color:"#fff",fontWeight:700}}>{b.appointment_ref} <span style={{color:C.MID,fontWeight:400}}>· {b.service_name} — {b.package_name}</span></div>
                              <div style={{fontSize:12,color:"#888",marginTop:2}}>{cust?.full_name} · {cust?.email}{cust?.phone&&` · ${cust.phone}`}</div>
                            </div>
                            <span style={{fontSize:10,letterSpacing:1,textTransform:"uppercase",padding:"4px 10px",borderRadius:20,background:"#1a1a2e",color:statusColor[b.status]||C.MID,border:`1px solid ${statusColor[b.status]||C.BORDER}`}}>{String(b.status).replace(/_/g," ")}</span>
                          </div>
                          <div style={{fontSize:12,color:"#aaa",marginBottom:10}}>{b.booking_date} · {b.booking_time} &nbsp;·&nbsp; AED {Number(b.total).toLocaleString()} total ({Number(b.price_base).toLocaleString()} + {Number(b.transaction_fee).toLocaleString()} fee)</div>
                          {payment&&(
                            <div style={{fontSize:12,color:"#888",marginBottom:12,display:"flex",gap:16,flexWrap:"wrap",alignItems:"center"}}>
                              <span>Payment: {payment.method==="bank_transfer"?"Bank Transfer":"PayPal"} · {payment.status}</span>
                              {payment.receipt_signed_url?(
                                <a href={payment.receipt_signed_url} target="_blank" rel="noreferrer" style={{color:C.PL}}>View Receipt →</a>
                              ):payment.method==="bank_transfer"?(
                                <span style={{color:"#666"}}>Waiting for client's receipt</span>
                              ):null}
                            </div>
                          )}
                          {canDecide&&(
                            rejectReasonFor===payment.id?(
                              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                                <input style={{...S.inp,flex:1,minWidth:200}} placeholder="Reason (shown to client)" value={rejectReasonText} onChange={e=>setRejectReasonText(e.target.value)} />
                                <button onClick={()=>rejectPayment(payment.id)} disabled={bookingActionBusy===payment.id||!rejectReasonText.trim()} style={{...S.btnO,borderColor:"#e74c3c",color:"#e74c3c"}}>Confirm Reject</button>
                                <button onClick={()=>{setRejectReasonFor(null);setRejectReasonText("");}} style={S.btnSm}>Cancel</button>
                              </div>
                            ):(
                              <div style={{display:"flex",gap:8}}>
                                <button onClick={()=>approvePayment(payment.id)} disabled={bookingActionBusy===payment.id} style={{...S.btnP,opacity:bookingActionBusy===payment.id?0.6:1}}>✓ Approve Payment</button>
                                <button onClick={()=>setRejectReasonFor(payment.id)} disabled={bookingActionBusy===payment.id} style={{...S.btnO,borderColor:"#e74c3c",color:"#e74c3c"}}>✕ Reject</button>
                              </div>
                            )
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
          </div>
        )}

        {/* CLIENT MESSAGES -- one thread per customer_id, grouped client-side from the flat
            list functions/api/admin/messages.ts returns. Replying (sendAdminReply) also
            marks that customer's earlier client messages as read server-side. */}
        {cmsTab==="messages"&&(
          <div style={{maxWidth:900,margin:"48px auto",padding:"0 24px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div style={{fontSize:11,letterSpacing:4,color:C.MID,textTransform:"uppercase"}}>Client Messages</div>
              <button onClick={loadMessages} style={S.btnSm}>↻ Refresh</button>
            </div>
            {msgErr&&<div style={{color:"#e74c3c",fontSize:12,marginBottom:16,background:"#2a1010",border:"1px solid #4a2020",borderRadius:4,padding:"10px 14px"}}>{msgErr}</div>}
            {msgLoading?(
              <div style={{color:"#444",fontSize:13}}>Loading…</div>
            ):!msgList||msgList.length===0?(
              <div style={{color:"#444",fontSize:13,fontStyle:"italic"}}>No messages yet.</div>
            ):(()=>{
              const byCustomer=new Map<string,any[]>();
              for(const m of msgList){
                if(!byCustomer.has(m.customer_id)) byCustomer.set(m.customer_id,[]);
                byCustomer.get(m.customer_id)!.push(m);
              }
              const threads=Array.from(byCustomer.entries()).map(([cid,msgs])=>{
                const sorted=[...msgs].sort((a,b)=>new Date(a.created_at).getTime()-new Date(b.created_at).getTime());
                const last=sorted[sorted.length-1];
                const unread=msgs.filter((m:any)=>m.sender==="client"&&!m.is_read_by_admin).length;
                return{customerId:cid,customer:last.customers,messages:sorted,last,unread};
              }).sort((a,b)=>new Date(b.last.created_at).getTime()-new Date(a.last.created_at).getTime());
              return(
                <div style={{display:"flex",flexDirection:"column",gap:14}}>
                  {threads.map(t=>{
                    const open=msgOpenCustomerId===t.customerId;
                    return(
                      <div key={t.customerId} style={{background:"#10101c",border:`1px solid ${C.BORDER}`,borderRadius:4,padding:20}}>
                        <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8,marginBottom:8,cursor:"pointer"}} onClick={()=>setMsgOpenCustomerId(open?null:t.customerId)}>
                          <div>
                            <div style={{fontSize:14,color:"#fff",fontWeight:700}}>{t.customer?.full_name||"Unknown"} <span style={{color:C.MID,fontWeight:400,fontSize:12}}>· {t.customer?.email}</span></div>
                            <div style={{fontSize:12,color:"#888",marginTop:2}}>{t.last.sender==="admin"?"You: ":""}{String(t.last.body).slice(0,80)}{t.last.body.length>80?"…":""}</div>
                          </div>
                          {t.unread>0&&<span style={{fontSize:10,letterSpacing:1,padding:"4px 10px",borderRadius:20,background:"#1a1a2e",color:C.PL,border:`1px solid ${C.PL}`,flexShrink:0,alignSelf:"flex-start"}}>{t.unread} NEW</span>}
                        </div>
                        {open&&(
                          <div style={{marginTop:14,paddingTop:14,borderTop:`1px solid ${C.BORDER}`}}>
                            <div style={{display:"flex",flexDirection:"column",gap:10,maxHeight:320,overflowY:"auto",marginBottom:14}}>
                              {t.messages.map((m:any)=>(
                                <div key={m.id} style={{alignSelf:m.sender==="admin"?"flex-end":"flex-start",maxWidth:"80%"}}>
                                  <div style={{background:m.sender==="admin"?C.P:"#1a1a2e",color:"#fff",borderRadius:8,padding:"8px 12px",fontSize:13,lineHeight:1.5,whiteSpace:"pre-wrap"}}>{m.body}</div>
                                  <div style={{fontSize:10,color:"#666",marginTop:3}}>{m.sender==="admin"?"You":t.customer?.full_name||"Client"} · {new Date(m.created_at).toLocaleString()}</div>
                                </div>
                              ))}
                            </div>
                            <div style={{display:"flex",gap:8}}>
                              <input style={{...S.inp,flex:1}} placeholder="Reply…" value={msgReplyText} onChange={e=>setMsgReplyText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendAdminReply(t.customerId)} />
                              <button onClick={()=>sendAdminReply(t.customerId)} disabled={msgSending||!msgReplyText.trim()} style={S.btnP}>{msgSending?"...":"Send"}</button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* COMMENTS -- moderation queue. Public visitors only ever see status="approved"
            (see functions/api/comments.ts); everything lands here first. */}
        {cmsTab==="comments"&&(
          <div style={{maxWidth:900,margin:"48px auto",padding:"0 24px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div style={{fontSize:11,letterSpacing:4,color:C.MID,textTransform:"uppercase"}}>Comments</div>
              <button onClick={loadComments} style={S.btnSm}>↻ Refresh</button>
            </div>
            {commentsErr&&<div style={{color:"#e74c3c",fontSize:12,marginBottom:16,background:"#2a1010",border:"1px solid #4a2020",borderRadius:4,padding:"10px 14px"}}>{commentsErr}</div>}
            {commentsLoading?(
              <div style={{color:"#444",fontSize:13}}>Loading…</div>
            ):!commentsList||commentsList.length===0?(
              <div style={{color:"#444",fontSize:13,fontStyle:"italic"}}>No comments yet.</div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                {commentsList.map((c:any)=>{
                  const statusColor:Record<string,string>={pending:"#d4a017",approved:"#2ecc71",hidden:"#888",deleted:"#e74c3c"};
                  const proj=projects.find(p=>p.id===c.projectId);
                  return(
                    <div key={c.id} style={{background:"#10101c",border:`1px solid ${C.BORDER}`,borderRadius:4,padding:18}}>
                      <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8,marginBottom:8}}>
                        <div style={{fontSize:13,color:"#fff",fontWeight:700}}>{c.visitorName} <span style={{color:C.MID,fontWeight:400,fontSize:12}}>· {c.visitorEmail}</span></div>
                        <span style={{fontSize:10,letterSpacing:1,textTransform:"uppercase",padding:"4px 10px",borderRadius:20,background:"#1a1a2e",color:statusColor[c.status]||C.MID,border:`1px solid ${statusColor[c.status]||C.BORDER}`}}>{c.status}</span>
                      </div>
                      <div style={{fontSize:11,color:"#666",marginBottom:8}}>{proj?.title||c.projectId} · {new Date(c.createdAt).toLocaleString()}</div>
                      <div style={{fontSize:13,color:"#ccc",lineHeight:1.6,marginBottom:12,whiteSpace:"pre-wrap"}}>{c.comment}</div>
                      <div style={{display:"flex",gap:8}}>
                        {c.status!=="approved"&&<button onClick={()=>moderateComment(c.id,"approve")} disabled={commentActionBusy===c.id} style={S.btnSm}>✓ Approve</button>}
                        {c.status!=="hidden"&&<button onClick={()=>moderateComment(c.id,"hide")} disabled={commentActionBusy===c.id} style={{...S.btnO,padding:"8px 14px",fontSize:10}}>Hide</button>}
                        {c.status!=="deleted"&&<button onClick={()=>{if(confirm("Delete this comment?"))moderateComment(c.id,"delete");}} disabled={commentActionBusy===c.id} style={{...S.btnO,padding:"8px 14px",fontSize:10,borderColor:"#e74c3c",color:"#e74c3c"}}>Delete</button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* IMAGE PERMISSION REQUESTS -- manual-approval-only. Nothing here or anywhere else in
            this codebase can auto-grant a request; every approve/reject is a deliberate click
            that hits functions/api/admin/permission-requests.ts behind requireAdmin. */}
        {cmsTab==="permrequests"&&(
          <div style={{maxWidth:900,margin:"48px auto",padding:"0 24px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div style={{fontSize:11,letterSpacing:4,color:C.MID,textTransform:"uppercase"}}>Image Permission Requests</div>
              <button onClick={loadPermReqs} style={S.btnSm}>↻ Refresh</button>
            </div>
            {permReqErr&&<div style={{color:"#e74c3c",fontSize:12,marginBottom:16,background:"#2a1010",border:"1px solid #4a2020",borderRadius:4,padding:"10px 14px"}}>{permReqErr}</div>}
            {permReqLoading?(
              <div style={{color:"#444",fontSize:13}}>Loading…</div>
            ):!permReqList||permReqList.length===0?(
              <div style={{color:"#444",fontSize:13,fontStyle:"italic"}}>No permission requests yet.</div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                {permReqList.map((r:any)=>{
                  const statusColor:Record<string,string>={pending:"#d4a017",approved:"#2ecc71",rejected:"#e74c3c",cancelled:"#666"};
                  const open=permReqOpenId===r.id;
                  return(
                    <div key={r.id} style={{background:"#10101c",border:`1px solid ${C.BORDER}`,borderRadius:4,padding:20}}>
                      <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
                        <img src={r.imageUrl} alt="" style={{width:96,height:96,objectFit:"cover",background:"#000",flexShrink:0,borderRadius:2}} />
                        <div style={{flex:1,minWidth:200}}>
                          <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
                            <div style={{fontSize:14,color:"#fff",fontWeight:700}}>{r.requesterName} <span style={{color:C.MID,fontWeight:400,fontSize:12}}>· {r.requesterEmail}{r.requesterWhatsapp&&` · ${r.requesterWhatsapp}`}</span></div>
                            <span style={{fontSize:10,letterSpacing:1,textTransform:"uppercase",padding:"4px 10px",borderRadius:20,background:"#1a1a2e",color:statusColor[r.status]||C.MID,border:`1px solid ${statusColor[r.status]||C.BORDER}`,flexShrink:0}}>{r.status}</span>
                          </div>
                          <div style={{fontSize:11,color:"#666",margin:"4px 0 8px"}}>{r.projectName||r.projectId} · {new Date(r.createdAt).toLocaleString()}</div>
                          <div style={{fontSize:12,color:C.MID,marginBottom:4}}>Intended usage: {(r.usageTypes||[]).join(", ")}</div>
                          {r.usageUrl&&<div style={{fontSize:12,color:C.MID,marginBottom:4}}>URL: <a href={r.usageUrl} target="_blank" rel="noreferrer" style={{color:C.PL}}>{r.usageUrl}</a></div>}
                          {r.usageDescription&&<div style={{fontSize:12,color:"#ccc",marginBottom:4,whiteSpace:"pre-wrap"}}>{r.usageDescription}</div>}
                          {r.status==="approved"&&<div style={{fontSize:12,color:"#2ecc71",marginTop:6}}>✓ Approved{r.approvedUsage?` — ${r.approvedUsage}`:""}{r.creditRequired?` (credit required: "${r.creditText}")`:""}</div>}
                          {r.status==="rejected"&&<div style={{fontSize:12,color:"#e74c3c",marginTop:6}}>✕ Rejected — {r.rejectionReason}</div>}
                        </div>
                      </div>
                      {r.status==="pending"&&(
                        open?(
                          <div style={{marginTop:16,paddingTop:16,borderTop:`1px solid ${C.BORDER}`,display:"flex",flexDirection:"column",gap:10}}>
                            <div><label style={S.lbl}>Admin Notes (internal)</label><textarea style={{...S.inp,height:50,resize:"vertical" as const}} value={permReqNotes} onChange={e=>setPermReqNotes(e.target.value)} /></div>
                            <div><label style={S.lbl}>Approved Usage (shown to requester if approved)</label><input style={S.inp} value={permReqApprovedUsage} onChange={e=>setPermReqApprovedUsage(e.target.value)} placeholder="e.g. Website use approved, non-exclusive" /></div>
                            <div style={{display:"flex",alignItems:"center",gap:8}}>
                              <input type="checkbox" checked={permReqCreditRequired} onChange={e=>setPermReqCreditRequired(e.target.checked)} />
                              <span style={{fontSize:11,color:C.MID}}>Require photo credit</span>
                            </div>
                            {permReqCreditRequired&&<div><label style={S.lbl}>Credit Text</label><input style={S.inp} value={permReqCreditText} onChange={e=>setPermReqCreditText(e.target.value)} /></div>}
                            <div><label style={S.lbl}>Rejection Reason (required if rejecting)</label><input style={S.inp} value={permReqRejectReason} onChange={e=>setPermReqRejectReason(e.target.value)} /></div>
                            <div style={{display:"flex",gap:8}}>
                              <button onClick={()=>decidePermReq(r.id,"approve")} disabled={permReqActionBusy===r.id} style={S.btnP}>✓ Approve</button>
                              <button onClick={()=>decidePermReq(r.id,"reject")} disabled={permReqActionBusy===r.id||!permReqRejectReason.trim()} style={{...S.btnO,borderColor:"#e74c3c",color:"#e74c3c"}}>✕ Reject</button>
                              <button onClick={()=>{setPermReqOpenId(null);setPermReqNotes("");setPermReqRejectReason("");setPermReqApprovedUsage("");}} style={S.btnSm}>Cancel</button>
                            </div>
                          </div>
                        ):(
                          <div style={{marginTop:14}}><button onClick={()=>{setPermReqOpenId(r.id);setPermReqCreditText("Photography: Naveed Anjum / Creative Fusion LLC");setPermReqCreditRequired(true);}} style={S.btnSm}>Review Request</button></div>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SETTINGS TAB */}
        {cmsTab==="settings"&&(
          <div style={{maxWidth:800,margin:"0 auto",padding:"32px 24px"}}>
            <div style={{display:"flex",gap:8,marginBottom:24,flexWrap:"wrap"}}>
              {[["general","General"],["hero","Hero Slides"],["about","About"],["services","Services"],["clients","🤝 Clients"],["cv","CV & Skills"],["gear","📦 Gear Photos"],["footer","Footer"],["seo","SEO"],["contact","Contact"],["popup","Popup"],["colors","🎨 Colors"],["text","🔤 Text & Banners"],["pages","🔀 Pages"],["pricing","💳 Packages"]].map(([k,l])=>(
                <button key={k} onClick={()=>setSettingsTab(k)} style={{...S.btnSm,background:settingsTab===k?C.P:"#1a1a2e"}}>{l}</button>
              ))}
            </div>

            {settingsTab==="general"&&(
              <div>
                <div style={{fontSize:11,letterSpacing:4,color:C.MID,marginBottom:20,textTransform:"uppercase"}}>General Settings</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                  <div><label style={S.lbl}>Site Name</label><input style={S.inp} value={settingsDraft.siteName} onChange={e=>updateSD({siteName:e.target.value})} /></div>
                  <div><label style={S.lbl}>Tagline</label><input style={S.inp} value={settingsDraft.siteTagline} onChange={e=>updateSD({siteTagline:e.target.value})} /></div>
                  <div><label style={S.lbl}>Stats: Years</label><input style={S.inp} value={settingsDraft.statsYears} onChange={e=>updateSD({statsYears:e.target.value})} /></div>
                  <div><label style={S.lbl}>Stats: Projects</label><input style={S.inp} value={settingsDraft.statsProjects} onChange={e=>updateSD({statsProjects:e.target.value})} /></div>
                  <div><label style={S.lbl}>Stats: Clients</label><input style={S.inp} value={settingsDraft.statsClients} onChange={e=>updateSD({statsClients:e.target.value})} /></div>
                </div>
                <div style={{marginTop:32,paddingTop:24,borderTop:`1px solid ${C.BORDER}`}}>
                  <div style={{fontSize:11,letterSpacing:4,color:C.MID,marginBottom:12,textTransform:"uppercase"}}>Image Permission Requests</div>
                  <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
                    <input type="checkbox" checked={settingsDraft.imagePermissionEnabled!==false} onChange={e=>updateSD({imagePermissionEnabled:e.target.checked})} />
                    <span style={{fontSize:13,color:"#ccc"}}>Allow visitors to request permission to use project images (shown on every /work project page)</span>
                  </label>
                </div>
              </div>
            )}

            {settingsTab==="contact"&&(
              <div>
                <div style={{fontSize:11,letterSpacing:4,color:C.MID,marginBottom:20,textTransform:"uppercase"}}>Contact & Social</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                  <div><label style={S.lbl}>Phone</label><input style={S.inp} value={settingsDraft.phone} onChange={e=>updateSD({phone:e.target.value})} /></div>
                  <div><label style={S.lbl}>Email</label><input style={S.inp} value={settingsDraft.email} onChange={e=>updateSD({email:e.target.value})} /></div>
                  <div><label style={S.lbl}>WhatsApp Number (digits only)</label><input style={S.inp} value={settingsDraft.waNumber} onChange={e=>updateSD({waNumber:e.target.value})} /></div>
                  <div><label style={S.lbl}>Location</label><input style={S.inp} value={settingsDraft.location} onChange={e=>updateSD({location:e.target.value})} /></div>
                  <div><label style={S.lbl}>Full Address (shown in footer with map)</label><input style={S.inp} value={settingsDraft.address} onChange={e=>updateSD({address:e.target.value})} placeholder="e.g. Downtown Dubai, UAE" /></div>
                </div>
                <div style={{marginTop:16}}><label style={S.lbl}>WhatsApp Default Message</label><textarea style={{...S.inp,height:70,resize:"vertical" as const}} value={settingsDraft.waMsg} onChange={e=>updateSD({waMsg:e.target.value})} /></div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginTop:16}}>
                  <div><label style={S.lbl}>Instagram URL</label><input style={S.inp} value={settingsDraft.instagram} onChange={e=>updateSD({instagram:e.target.value})} /></div>
                  <div><label style={S.lbl}>YouTube URL</label><input style={S.inp} value={settingsDraft.youtube} onChange={e=>updateSD({youtube:e.target.value})} /></div>
                  <div><label style={S.lbl}>LinkedIn URL</label><input style={S.inp} value={settingsDraft.linkedin} onChange={e=>updateSD({linkedin:e.target.value})} /></div>
                  <div><label style={S.lbl}>TikTok URL</label><input style={S.inp} value={settingsDraft.tiktok} onChange={e=>updateSD({tiktok:e.target.value})} /></div>
                </div>

                <div style={{marginTop:32,paddingTop:24,borderTop:`1px solid ${C.BORDER}`}}>
                  <div style={{fontSize:11,letterSpacing:4,color:C.MID,marginBottom:12,textTransform:"uppercase"}}>Bank Transfer Instructions (Booking)</div>
                  <div style={{fontSize:12,color:"#888",lineHeight:1.6,marginBottom:12}}>Shown to clients on the Booking page's payment step when they choose Bank Transfer. Enter your real bank name, account name, IBAN/account number and any reference instructions -- this is never invented for you, so leave it blank until you fill in your real details.</div>
                  <textarea style={{...S.inp,height:110,resize:"vertical" as const,fontFamily:"monospace" as const}} value={settingsDraft.bankTransferInstructions} onChange={e=>updateSD({bankTransferInstructions:e.target.value})} placeholder={"Bank Name: \nAccount Name: \nAccount Number / IBAN: \nSWIFT/BIC: \nReference: Please include your booking reference in the transfer description."} />
                </div>

                <div style={{marginTop:32,paddingTop:24,borderTop:`1px solid ${C.BORDER}`}}>
                  <div style={{fontSize:11,letterSpacing:4,color:C.MID,marginBottom:12,textTransform:"uppercase"}}>Online Payment Link (Booking)</div>
                  <div style={{fontSize:12,color:"#888",lineHeight:1.6,marginBottom:12}}>
                    Paste a real hosted payment link here once you've set one up (e.g. a Mamo Business or Tap Payments payment link, or a Stripe Payment Link) and the &quot;Pay Online&quot; option on the Booking page's payment step turns on automatically -- until then it stays disabled exactly as it is now. When a client picks it, they&apos;re sent to this link to pay; you confirm the booking the same way you already confirm bank transfers.
                  </div>
                  <input style={S.inp} value={settingsDraft.paymentLinkUrl} onChange={e=>updateSD({paymentLinkUrl:e.target.value})} placeholder="https://pay.mamopay.com/... or https://pay.tap.company/..." />
                </div>

                <div style={{marginTop:32,paddingTop:24,borderTop:`1px solid ${C.BORDER}`}}>
                  <div style={{fontSize:11,letterSpacing:4,color:C.MID,marginBottom:12,textTransform:"uppercase"}}>Contact Form Email Notifications</div>
                  <div style={{fontSize:12,color:"#888",lineHeight:1.7,marginBottom:16,background:"#10101c",border:`1px solid ${C.BORDER}`,borderRadius:4,padding:"14px 16px"}}>
                    Every contact-form submission already opens a WhatsApp message to you immediately -- that part needs no setup. The CMS Leads tab is meant to also list submissions, but a Supabase permission setting is currently blocking that (flagged separately). To get submissions emailed to you too, create a free EmailJS account (200 emails/month, no card needed) -- takes about 2 minutes:<br/><br/>
                    1. Go to emailjs.com → Sign Up (free)<br/>
                    2. Email Services → Add New Service → connect your Gmail ({settings.email})<br/>
                    3. Email Templates → Create New Template. Use variables: {"{{from_name}}"}, {"{{from_email}}"}, {"{{phone}}"}, {"{{subject}}"}, {"{{message}}"}, and set "To Email" to {"{{to_email}}"}<br/>
                    4. Account → General → copy your Public Key, and copy the Service ID and Template ID from the steps above<br/>
                    5. Paste all three below and Save
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>
                    <div><label style={S.lbl}>EmailJS Service ID</label><input style={S.inp} value={settingsDraft.emailjsServiceId} onChange={e=>updateSD({emailjsServiceId:e.target.value})} placeholder="service_xxxxxxx" /></div>
                    <div><label style={S.lbl}>EmailJS Template ID</label><input style={S.inp} value={settingsDraft.emailjsTemplateId} onChange={e=>updateSD({emailjsTemplateId:e.target.value})} placeholder="template_xxxxxxx" /></div>
                    <div><label style={S.lbl}>EmailJS Public Key</label><input style={S.inp} value={settingsDraft.emailjsPublicKey} onChange={e=>updateSD({emailjsPublicKey:e.target.value})} placeholder="xxxxxxxxxxxxxxxx" /></div>
                  </div>
                </div>
              </div>
            )}

            {settingsTab==="hero"&&(
              <div>
                <div style={{fontSize:11,letterSpacing:4,color:C.MID,marginBottom:20,textTransform:"uppercase"}}>🔤 Typography</div>
                <div style={{fontSize:12,color:"#555",marginBottom:20,lineHeight:1.6}}>Controls the headline and sub-text style across every hero slide. Leave as-is for the current look.</div>
                <div style={{background:"#10101c",padding:20,marginBottom:24,border:`1px solid ${C.BORDER}`}}>
                  <div style={{fontSize:10,letterSpacing:3,color:C.PL,textTransform:"uppercase",marginBottom:12}}>Headline</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                    <div><label style={S.lbl}>Font</label><select style={S.inp} value={settingsDraft.heroTypography.headlineFont} onChange={e=>updateSD({heroTypography:{...settingsDraft.heroTypography,headlineFont:e.target.value}})}>{HERO_FONT_LABELS.map(([k,l])=><option key={k} value={k}>{l}</option>)}</select></div>
                    <div><label style={S.lbl}>Weight</label><select style={S.inp} value={settingsDraft.heroTypography.headlineWeight} onChange={e=>updateSD({heroTypography:{...settingsDraft.heroTypography,headlineWeight:Number(e.target.value)}})}>{[300,400,500,600,700,800,900].map(w=><option key={w} value={w}>{w}</option>)}</select></div>
                    <div><label style={S.lbl}>Size (px, desktop max)</label><input type="number" min={40} max={140} style={S.inp} value={settingsDraft.heroTypography.headlineSize} onChange={e=>updateSD({heroTypography:{...settingsDraft.heroTypography,headlineSize:Number(e.target.value)||86}})} /></div>
                    <div><label style={S.lbl}>Letter Spacing (px)</label><input type="number" step={0.1} style={S.inp} value={settingsDraft.heroTypography.headlineSpacing} onChange={e=>updateSD({heroTypography:{...settingsDraft.heroTypography,headlineSpacing:Number(e.target.value)||0}})} /></div>
                    <div>
                      <label style={S.lbl}>Color</label>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <input type="color" value={/^#/.test(settingsDraft.heroTypography.headlineColor)?settingsDraft.heroTypography.headlineColor:"#ffffff"} onChange={e=>updateSD({heroTypography:{...settingsDraft.heroTypography,headlineColor:e.target.value}})} style={{width:36,height:32,padding:0,border:"none",background:"none",cursor:"pointer"}} />
                        <input style={{...S.inp,fontSize:11}} value={settingsDraft.heroTypography.headlineColor} onChange={e=>updateSD({heroTypography:{...settingsDraft.heroTypography,headlineColor:e.target.value}})} />
                      </div>
                    </div>
                    <div style={{display:"flex",alignItems:"flex-end",paddingBottom:8}}>
                      <label style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:C.MID,cursor:"pointer"}}>
                        <input type="checkbox" checked={settingsDraft.heroTypography.headlineItalic} onChange={e=>updateSD({heroTypography:{...settingsDraft.heroTypography,headlineItalic:e.target.checked}})} />
                        Italic
                      </label>
                    </div>
                  </div>
                  <div style={{fontSize:10,letterSpacing:3,color:C.PL,textTransform:"uppercase",margin:"16px 0 12px"}}>Sub-Text</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                    <div><label style={S.lbl}>Font</label><select style={S.inp} value={settingsDraft.heroTypography.subFont} onChange={e=>updateSD({heroTypography:{...settingsDraft.heroTypography,subFont:e.target.value}})}>{HERO_FONT_LABELS.map(([k,l])=><option key={k} value={k}>{l}</option>)}</select></div>
                    <div><label style={S.lbl}>Weight</label><select style={S.inp} value={settingsDraft.heroTypography.subWeight} onChange={e=>updateSD({heroTypography:{...settingsDraft.heroTypography,subWeight:Number(e.target.value)}})}>{[300,400,500,600,700].map(w=><option key={w} value={w}>{w}</option>)}</select></div>
                    <div><label style={S.lbl}>Size (px, desktop max)</label><input type="number" min={12} max={32} style={S.inp} value={settingsDraft.heroTypography.subSize} onChange={e=>updateSD({heroTypography:{...settingsDraft.heroTypography,subSize:Number(e.target.value)||22}})} /></div>
                    <div>
                      <label style={S.lbl}>Color (blank = default faded white)</label>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <input type="color" value={/^#/.test(settingsDraft.heroTypography.subColor)?settingsDraft.heroTypography.subColor:"#ffffff"} onChange={e=>updateSD({heroTypography:{...settingsDraft.heroTypography,subColor:e.target.value}})} style={{width:36,height:32,padding:0,border:"none",background:"none",cursor:"pointer"}} />
                        <input style={{...S.inp,fontSize:11}} placeholder="rgba(255,255,255,0.6)" value={settingsDraft.heroTypography.subColor} onChange={e=>updateSD({heroTypography:{...settingsDraft.heroTypography,subColor:e.target.value}})} />
                      </div>
                    </div>
                  </div>
                  <button onClick={()=>updateSD({heroTypography:DEF_SETTINGS.heroTypography})} style={{...S.btnO,marginTop:16}}>Reset to Default Typography</button>
                </div>
                <div style={{fontSize:11,letterSpacing:4,color:C.MID,marginBottom:20,textTransform:"uppercase"}}>Hero Slides ({settingsDraft.heroSlides.length})</div>
                <button onClick={()=>updateSD({heroSlides:[...settingsDraft.heroSlides,{label:"New Slide",headline:"Headline\nHere.",sub:"Supporting text.",btn1:"View Work",btn2:"",img:"",page:"work"}]})} style={{...S.btnSm,marginBottom:16}}>+ Add Slide</button>
                {settingsDraft.heroSlides.map((sl,i)=>(
                  <div key={i} style={{background:"#10101c",padding:20,marginBottom:12,border:`1px solid ${C.BORDER}`}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                      <div><label style={S.lbl}>Label</label><input style={S.inp} value={sl.label} onChange={e=>updateSD({heroSlides:settingsDraft.heroSlides.map((x,idx)=>idx===i?{...x,label:e.target.value}:x)})} /></div>
                      <div><label style={S.lbl}>Button 1</label><input style={S.inp} value={sl.btn1} onChange={e=>updateSD({heroSlides:settingsDraft.heroSlides.map((x,idx)=>idx===i?{...x,btn1:e.target.value}:x)})} /></div>
                      <div style={{gridColumn:"1/3"}}>
                        <label style={S.lbl}>Button 1 Link (optional)</label>
                        <input style={S.inp} value={sl.btn1Link||""} onChange={e=>updateSD({heroSlides:settingsDraft.heroSlides.map((x,idx)=>idx===i?{...x,btn1Link:e.target.value}:x)})} placeholder="Leave blank to keep the default page link" />
                        <div style={{fontSize:10.5,color:"#666",marginTop:4}}>Paste a full link (https://...) or a page path (e.g. /packages). Leave blank to keep this button going to its default page.</div>
                      </div>
                      <div style={{gridColumn:"1/3"}}><label style={S.lbl}>Button 2 (optional — leave blank to hide this button)</label><input style={S.inp} value={sl.btn2} onChange={e=>updateSD({heroSlides:settingsDraft.heroSlides.map((x,idx)=>idx===i?{...x,btn2:e.target.value}:x)})} /></div>
                      <div style={{gridColumn:"1/3"}}>
                        <label style={S.lbl}>Button 2 Link (optional)</label>
                        <input style={S.inp} value={sl.btn2Link||""} onChange={e=>updateSD({heroSlides:settingsDraft.heroSlides.map((x,idx)=>idx===i?{...x,btn2Link:e.target.value}:x)})} placeholder="Leave blank to keep sending this button to Booking" />
                        <div style={{fontSize:10.5,color:"#666",marginTop:4}}>Paste a full link (https://...) or a page path (e.g. /contact). Leave blank to keep this button going to Booking.</div>
                      </div>
                      <div style={{gridColumn:"1/3"}}><label style={S.lbl}>Headline (use \n for line break)</label><input style={S.inp} value={sl.headline} onChange={e=>updateSD({heroSlides:settingsDraft.heroSlides.map((x,idx)=>idx===i?{...x,headline:e.target.value}:x)})} /></div>
                      <div style={{gridColumn:"1/3"}}><label style={S.lbl}>Sub Text</label><input style={S.inp} value={sl.sub} onChange={e=>updateSD({heroSlides:settingsDraft.heroSlides.map((x,idx)=>idx===i?{...x,sub:e.target.value}:x)})} /></div>
                      <div style={{gridColumn:"1/3"}}><SingleImageUpload label="Background Image" value={sl.img} onChange={v=>updateSD({heroSlides:settingsDraft.heroSlides.map((x,idx)=>idx===i?{...x,img:v}:x)})} /></div>
                    </div>
                    <button onClick={()=>updateSD({heroSlides:settingsDraft.heroSlides.filter((_,idx)=>idx!==i)})} style={{background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:11,letterSpacing:2,textTransform:"uppercase" as const}}>Remove Slide</button>
                  </div>
                ))}
              </div>
            )}

            {settingsTab==="about"&&(
              <div>
                <div style={{fontSize:11,letterSpacing:4,color:C.MID,marginBottom:20,textTransform:"uppercase"}}>About Page</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
                  <div><label style={S.lbl}>Name</label><input style={S.inp} value={settingsDraft.aboutName} onChange={e=>updateSD({aboutName:e.target.value})} /></div>
                  <div><label style={S.lbl}>Professional Title</label><input style={S.inp} value={settingsDraft.aboutTitle} onChange={e=>updateSD({aboutTitle:e.target.value})} /></div>
                </div>
                <div style={{marginBottom:16}}><label style={S.lbl}>Biography</label><textarea style={{...S.inp,height:120,resize:"vertical" as const}} value={settingsDraft.aboutBio} onChange={e=>updateSD({aboutBio:e.target.value})} /></div>
                <SingleImageUpload value={settingsDraft.aboutPhoto} onChange={url=>updateSD({aboutPhoto:url})} label="Profile Photo" />
              </div>
            )}

            {settingsTab==="services"&&(
              <div>
                <div style={{fontSize:11,letterSpacing:4,color:C.MID,marginBottom:20,textTransform:"uppercase"}}>Services</div>
                <SingleImageUpload label="Section Photo (left side of the Services block on the homepage)" value={settingsDraft.servicesImage} onChange={url=>updateSD({servicesImage:url})} />
                <button onClick={()=>updateSD({services:[...settingsDraft.services,{id:Date.now().toString(),icon:"📸",title:"New Service",desc:"Service description.",detail:"",deliverables:[]}]})} style={{...S.btnSm,marginBottom:16}}>+ Add Service</button>
                {settingsDraft.services.map((sv,i)=>(
                  <div key={sv.id} style={{background:"#10101c",padding:20,marginBottom:12,border:`1px solid ${C.BORDER}`}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                      <div><label style={S.lbl}>Icon (emoji)</label><input style={S.inp} value={sv.icon} onChange={e=>updateSD({services:settingsDraft.services.map((x,idx)=>idx===i?{...x,icon:e.target.value}:x)})} /></div>
                      <div><label style={S.lbl}>Title</label><input style={S.inp} value={sv.title} onChange={e=>updateSD({services:settingsDraft.services.map((x,idx)=>idx===i?{...x,title:e.target.value}:x)})} /></div>
                      <div style={{gridColumn:"1/3"}}><label style={S.lbl}>Short Description</label><input style={S.inp} value={sv.desc} onChange={e=>updateSD({services:settingsDraft.services.map((x,idx)=>idx===i?{...x,desc:e.target.value}:x)})} /></div>
                      <div style={{gridColumn:"1/3"}}><label style={S.lbl}>Full Description</label><textarea style={{...S.inp,height:70,resize:"vertical" as const}} value={sv.detail} onChange={e=>updateSD({services:settingsDraft.services.map((x,idx)=>idx===i?{...x,detail:e.target.value}:x)})} /></div>
                    </div>
                    <button onClick={()=>updateSD({services:settingsDraft.services.filter((_,idx)=>idx!==i)})} style={{background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:11,letterSpacing:2,textTransform:"uppercase" as const}}>Remove</button>
                  </div>
                ))}
              </div>
            )}

            {settingsTab==="clients"&&(
              <div>
                <div style={{fontSize:11,letterSpacing:4,color:C.MID,marginBottom:20,textTransform:"uppercase"}}>Our Clients</div>
                <div style={{fontSize:12,color:"#555",marginBottom:16,lineHeight:1.6}}>Currently showing DUMMY placeholder clients for testing. Replace each name/logo below with your real ones, remove any you don't need, and reorder with the arrows -- the homepage marquee reflects this list exactly.</div>
                <label style={{display:"flex",alignItems:"center",gap:10,marginBottom:20,cursor:"pointer"}}>
                  <input type="checkbox" checked={settingsDraft.clientsEnabled} onChange={e=>updateSD({clientsEnabled:e.target.checked})} style={{width:16,height:16,cursor:"pointer"}} />
                  <span style={{fontSize:12,color:C.FG}}>Show "Our Clients" section on the homepage</span>
                </label>
                <button onClick={()=>updateSD({clients:[...settingsDraft.clients,{id:Date.now().toString(),name:"New Client",logo:""}]})} style={{...S.btnSm,marginBottom:16}}>+ Add Client</button>
                {settingsDraft.clients.map((cl,i)=>(
                  <div key={cl.id} style={{background:"#10101c",padding:20,marginBottom:12,border:`1px solid ${C.BORDER}`}}>
                    <div style={{display:"flex",gap:12,marginBottom:12}}>
                      <button title="Move up" disabled={i===0} onClick={()=>{const arr=[...settingsDraft.clients];[arr[i-1],arr[i]]=[arr[i],arr[i-1]];updateSD({clients:arr});}} style={{...S.btnSm,opacity:i===0?0.3:1,padding:"6px 10px"}}>↑</button>
                      <button title="Move down" disabled={i===settingsDraft.clients.length-1} onClick={()=>{const arr=[...settingsDraft.clients];[arr[i+1],arr[i]]=[arr[i],arr[i+1]];updateSD({clients:arr});}} style={{...S.btnSm,opacity:i===settingsDraft.clients.length-1?0.3:1,padding:"6px 10px"}}>↓</button>
                      <div style={{flex:1}}><label style={S.lbl}>Client Name</label><input style={S.inp} value={cl.name} onChange={e=>updateSD({clients:settingsDraft.clients.map((x,idx)=>idx===i?{...x,name:e.target.value}:x)})} /></div>
                    </div>
                    <SingleImageUpload label="Logo" value={cl.logo} onChange={url=>updateSD({clients:settingsDraft.clients.map((x,idx)=>idx===i?{...x,logo:url}:x)})} />
                    <div style={{display:"flex",gap:16}}>
                      {cl.logo&&<button onClick={()=>updateSD({clients:settingsDraft.clients.map((x,idx)=>idx===i?{...x,logo:""}:x)})} style={{background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:11,letterSpacing:2,textTransform:"uppercase" as const}}>Remove Logo (show name only)</button>}
                      <button onClick={()=>updateSD({clients:settingsDraft.clients.filter((_,idx)=>idx!==i)})} style={{background:"none",border:"none",color:"#a33",cursor:"pointer",fontSize:11,letterSpacing:2,textTransform:"uppercase" as const}}>Remove Client</button>
                    </div>
                  </div>
                ))}
                {settingsDraft.clients.length===0&&<div style={{fontSize:12,color:"#555"}}>No clients yet -- the section stays hidden on the homepage until you add at least one.</div>}
              </div>
            )}

            {settingsTab==="cv"&&(
              <div>
                <div style={{fontSize:11,letterSpacing:4,color:C.MID,marginBottom:20,textTransform:"uppercase"}}>CV Sections</div>
                <button onClick={()=>updateSD({cvSections:[...settingsDraft.cvSections,{title:"New Section",content:""}]})} style={{...S.btnSm,marginBottom:16}}>+ Add Section</button>
                {settingsDraft.cvSections.map((sec,i)=>(
                  <div key={i} style={{background:"#10101c",padding:20,marginBottom:12,border:`1px solid ${C.BORDER}`}}>
                    <div style={{marginBottom:12}}><label style={S.lbl}>Title</label><input style={S.inp} value={sec.title} onChange={e=>updateSD({cvSections:settingsDraft.cvSections.map((x,idx)=>idx===i?{...x,title:e.target.value}:x)})} /></div>
                    <div style={{marginBottom:12}}><label style={S.lbl}>Content</label><textarea style={{...S.inp,height:80,resize:"vertical" as const}} value={sec.content} onChange={e=>updateSD({cvSections:settingsDraft.cvSections.map((x,idx)=>idx===i?{...x,content:e.target.value}:x)})} /></div>
                    <button onClick={()=>updateSD({cvSections:settingsDraft.cvSections.filter((_,idx)=>idx!==i)})} style={{background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:11,letterSpacing:2,textTransform:"uppercase" as const}}>Remove</button>
                  </div>
                ))}
                <div style={{marginTop:32,fontSize:11,letterSpacing:4,color:C.MID,marginBottom:16,textTransform:"uppercase"}}>Skills by Department</div>
                <button onClick={()=>updateSD({skills:[...settingsDraft.skills,{dept:"New Department",items:[]}]})} style={{...S.btnSm,marginBottom:16}}>+ Add Department</button>
                {settingsDraft.skills.map((sk,i)=>(
                  <div key={i} style={{background:"#10101c",padding:20,marginBottom:12,border:`1px solid ${C.BORDER}`}}>
                    <div style={{marginBottom:12}}><label style={S.lbl}>Department</label><input style={S.inp} value={sk.dept} onChange={e=>updateSD({skills:settingsDraft.skills.map((x,idx)=>idx===i?{...x,dept:e.target.value}:x)})} /></div>
                    <div style={{marginBottom:8}}><label style={S.lbl}>Skills (comma separated)</label><input style={S.inp} value={sk.items.join(", ")} onChange={e=>updateSD({skills:settingsDraft.skills.map((x,idx)=>idx===i?{...x,items:e.target.value.split(",").map(s=>s.trim()).filter(Boolean)}:x)})} placeholder="Skill 1, Skill 2, Skill 3" /></div>
                    <button onClick={()=>updateSD({skills:settingsDraft.skills.filter((_,idx)=>idx!==i)})} style={{background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:11,letterSpacing:2,textTransform:"uppercase" as const}}>Remove</button>
                  </div>
                ))}
              </div>
            )}

            {settingsTab==="gear"&&(
              <div>
                <div style={{fontSize:11,letterSpacing:4,color:C.MID,marginBottom:12,textTransform:"uppercase"}}>Gear Page Photos</div>
                <div style={{fontSize:12,color:"#555",marginBottom:20,lineHeight:1.6}}>
                  Upload your own photo for any item on the /gear page -- it replaces the current default photo for that item only, everywhere it appears. Leave an item blank to keep its default photo; nothing on the live page changes until you upload here and Save.
                </div>
                {GEAR_PHOTO_SECTIONS.map(section=>(
                  <div key={section.label} style={{marginBottom:28}}>
                    <div style={{fontSize:10,letterSpacing:3,color:C.PL,textTransform:"uppercase",marginBottom:10}}>{section.label}</div>
                    {section.items.map(name=>{
                      const current = settingsDraft.gearImages.find(g=>g.name===name)?.img || "";
                      return (
                        <div key={name} style={{background:"#10101c",padding:16,marginBottom:10,border:`1px solid ${C.BORDER}`}}>
                          <div style={{fontSize:13,fontWeight:600,color:C.FG,marginBottom:8}}>{name}</div>
                          <SingleImageUpload
                            label="Photo"
                            value={current}
                            onChange={url=>updateSD({
                              gearImages: settingsDraft.gearImages.some(g=>g.name===name)
                                ? settingsDraft.gearImages.map(g=>g.name===name?{...g,img:url}:g)
                                : [...settingsDraft.gearImages,{name,img:url}],
                            })}
                          />
                          {current&&<button onClick={()=>updateSD({gearImages:settingsDraft.gearImages.filter(g=>g.name!==name)})} style={{background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:11,letterSpacing:2,textTransform:"uppercase" as const}}>Remove (use default photo)</button>}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}

            {settingsTab==="footer"&&(
              <div>
                <div style={{fontSize:11,letterSpacing:4,color:C.MID,marginBottom:20,textTransform:"uppercase"}}>Footer</div>
                <div style={{marginBottom:16}}><label style={S.lbl}>Copyright Text</label><input style={S.inp} value={settingsDraft.footerCopyright} onChange={e=>updateSD({footerCopyright:e.target.value})} /></div>
              </div>
            )}

            {settingsTab==="seo"&&(
              <div>
                <div style={{fontSize:11,letterSpacing:4,color:C.MID,marginBottom:20,textTransform:"uppercase"}}>SEO Settings</div>
                <div style={{marginBottom:16}}><label style={S.lbl}>SEO Title</label><input style={S.inp} value={settingsDraft.seoTitle} onChange={e=>updateSD({seoTitle:e.target.value})} /></div>
                <div style={{marginBottom:16}}><label style={S.lbl}>Meta Description</label><textarea style={{...S.inp,height:80,resize:"vertical" as const}} value={settingsDraft.seoDesc} onChange={e=>updateSD({seoDesc:e.target.value})} /></div>
                <div style={{marginBottom:16}}>
                  <label style={S.lbl}>Google Place ID (for real reviews)</label>
                  <input style={S.inp} value={settingsDraft.googlePlaceId} onChange={e=>updateSD({googlePlaceId:e.target.value})} placeholder="ChIJ... (find at places.google.com)" />
                  <div style={{fontSize:11,color:"#444",marginTop:4}}>Go to maps.google.com → search your business → share → copy the place ID</div>
                </div>
              </div>
            )}

            {settingsTab==="popup"&&(
              <div>
                <div style={{fontSize:11,letterSpacing:4,color:C.MID,marginBottom:20,textTransform:"uppercase"}}>Consultation Popup</div>
                <div style={{fontSize:12,color:"#555",marginBottom:16,lineHeight:1.6}}>Shows once per visitor session after the delay below, asking for a name + phone number and sending it to you on WhatsApp. Swap the text below to a real seasonal offer any time -- nothing is invented automatically.</div>
                <label style={{display:"flex",alignItems:"center",gap:8,marginBottom:16,cursor:"pointer"}}>
                  <input type="checkbox" checked={settingsDraft.popupEnabled} onChange={e=>updateSD({popupEnabled:e.target.checked})} />
                  <span style={{fontSize:13,color:"#ccc"}}>Enable popup</span>
                </label>
                <div style={{marginBottom:16}}><label style={S.lbl}>Delay Before Showing (seconds)</label><input type="number" min={3} style={{...S.inp,maxWidth:160}} value={settingsDraft.popupDelaySec} onChange={e=>updateSD({popupDelaySec:Number(e.target.value)||20})} /></div>
                <div style={{marginBottom:16}}><label style={S.lbl}>Popup Title</label><input style={S.inp} value={settingsDraft.popupTitle} onChange={e=>updateSD({popupTitle:e.target.value})} /></div>
                <div style={{marginBottom:16}}><label style={S.lbl}>Popup Text</label><textarea style={{...S.inp,height:80,resize:"vertical" as const}} value={settingsDraft.popupText} onChange={e=>updateSD({popupText:e.target.value})} /></div>
                <div style={{marginBottom:16}}><label style={S.lbl}>Button Label</label><input style={S.inp} value={settingsDraft.popupCtaLabel} onChange={e=>updateSD({popupCtaLabel:e.target.value})} /></div>
              </div>
            )}

            {settingsTab==="colors"&&(
              <div>
                <div style={{fontSize:11,letterSpacing:4,color:C.MID,marginBottom:20,textTransform:"uppercase"}}>Site Colors</div>
                <div style={{fontSize:12,color:"#555",marginBottom:20,lineHeight:1.6}}>Change any brand color below and the whole live site repaints instantly -- every page, the CMS excluded. Leave as-is for the current look.</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:14}}>
                  {([["P","Primary Accent (Violet)"],["PL","Secondary / Active Text"],["PD","Accent Hover (Darker)"],["GOLD","Gold Accent"],["GOLDL","Gold Accent (Light)"],["BG","Page Background"],["FG","Main Text (on dark)"],["MID","Muted Text (on dark)"],["DARK","Dark Panel / Nav / Footer"],["BORDER","Dark Section Borders"],["LT","Light Section Background"],["LTCARD","Light Section Cards"],["LTBORDER","Light Section Borders"],["INKMID","Muted Text (on light)"]] as [keyof ThemeColors,string][]).map(([key,label])=>(
                    <div key={key} style={{background:"#10101c",border:`1px solid ${C.BORDER}`,borderRadius:4,padding:12}}>
                      <label style={{...S.lbl,marginBottom:8}}>{label}</label>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <input type="color" value={/^#/.test(settingsDraft.theme[key])?settingsDraft.theme[key]:"#000000"} onChange={e=>updateSD({theme:{...settingsDraft.theme,[key]:e.target.value}})} style={{width:36,height:32,padding:0,border:"none",background:"none",cursor:"pointer"}} />
                        <input style={{...S.inp,fontSize:11}} value={settingsDraft.theme[key]} onChange={e=>updateSD({theme:{...settingsDraft.theme,[key]:e.target.value}})} />
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={()=>updateSD({theme:DEF_SETTINGS.theme})} style={{...S.btnO,marginTop:16}}>Reset to Default Colors</button>
              </div>
            )}

            {settingsTab==="text"&&(
              <div>
                <div style={{fontSize:11,letterSpacing:4,color:C.MID,marginBottom:20,textTransform:"uppercase"}}>Homepage Text</div>
                <div style={{fontSize:12,color:"#555",marginBottom:20,lineHeight:1.6}}>Every heading, eyebrow label and button below is editable, like the rest of the site's content.</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:32}}>
                  <div><label style={S.lbl}>Nav "Book" Button</label><input style={S.inp} value={settingsDraft.uiText.navBookBtn} onChange={e=>updateSD({uiText:{...settingsDraft.uiText,navBookBtn:e.target.value}})} /></div>
                  <div><label style={S.lbl}>Footer WhatsApp Button</label><input style={S.inp} value={settingsDraft.uiText.footerWhatsappBtn} onChange={e=>updateSD({uiText:{...settingsDraft.uiText,footerWhatsappBtn:e.target.value}})} /></div>
                  <div><label style={S.lbl}>Services Eyebrow</label><input style={S.inp} value={settingsDraft.uiText.homeServicesEyebrow} onChange={e=>updateSD({uiText:{...settingsDraft.uiText,homeServicesEyebrow:e.target.value}})} /></div>
                  <div><label style={S.lbl}>Services Title</label><input style={S.inp} value={settingsDraft.uiText.homeServicesTitle} onChange={e=>updateSD({uiText:{...settingsDraft.uiText,homeServicesTitle:e.target.value}})} /></div>
                  <div style={{gridColumn:"1/3"}}><label style={S.lbl}>Services Intro Text</label><input style={S.inp} value={settingsDraft.uiText.homeServicesIntro} onChange={e=>updateSD({uiText:{...settingsDraft.uiText,homeServicesIntro:e.target.value}})} /></div>
                  <div><label style={S.lbl}>Work Eyebrow</label><input style={S.inp} value={settingsDraft.uiText.homeWorkEyebrow} onChange={e=>updateSD({uiText:{...settingsDraft.uiText,homeWorkEyebrow:e.target.value}})} /></div>
                  <div><label style={S.lbl}>Work Title</label><input style={S.inp} value={settingsDraft.uiText.homeWorkTitle} onChange={e=>updateSD({uiText:{...settingsDraft.uiText,homeWorkTitle:e.target.value}})} /></div>
                  <div><label style={S.lbl}>Work "View All" Link</label><input style={S.inp} value={settingsDraft.uiText.homeWorkViewAll} onChange={e=>updateSD({uiText:{...settingsDraft.uiText,homeWorkViewAll:e.target.value}})} /></div>
                  <div><label style={S.lbl}>Clients Eyebrow</label><input style={S.inp} value={settingsDraft.uiText.homeClientsEyebrow} onChange={e=>updateSD({uiText:{...settingsDraft.uiText,homeClientsEyebrow:e.target.value}})} /></div>
                  <div><label style={S.lbl}>Clients Title</label><input style={S.inp} value={settingsDraft.uiText.homeClientsTitle} onChange={e=>updateSD({uiText:{...settingsDraft.uiText,homeClientsTitle:e.target.value}})} /></div>
                  <div><label style={S.lbl}>Testimonials Eyebrow</label><input style={S.inp} value={settingsDraft.uiText.homeTestimonialsEyebrow} onChange={e=>updateSD({uiText:{...settingsDraft.uiText,homeTestimonialsEyebrow:e.target.value}})} /></div>
                  <div><label style={S.lbl}>Journal Eyebrow</label><input style={S.inp} value={settingsDraft.uiText.homeJournalEyebrow} onChange={e=>updateSD({uiText:{...settingsDraft.uiText,homeJournalEyebrow:e.target.value}})} /></div>
                  <div><label style={S.lbl}>Journal Title</label><input style={S.inp} value={settingsDraft.uiText.homeJournalTitle} onChange={e=>updateSD({uiText:{...settingsDraft.uiText,homeJournalTitle:e.target.value}})} /></div>
                  <div><label style={S.lbl}>Journal "All Posts" Link</label><input style={S.inp} value={settingsDraft.uiText.homeJournalViewAll} onChange={e=>updateSD({uiText:{...settingsDraft.uiText,homeJournalViewAll:e.target.value}})} /></div>
                  <div><label style={S.lbl}>Closing CTA Eyebrow</label><input style={S.inp} value={settingsDraft.uiText.homeCtaEyebrow} onChange={e=>updateSD({uiText:{...settingsDraft.uiText,homeCtaEyebrow:e.target.value}})} /></div>
                  <div><label style={S.lbl}>Closing CTA Title</label><input style={S.inp} value={settingsDraft.uiText.homeCtaTitle} onChange={e=>updateSD({uiText:{...settingsDraft.uiText,homeCtaTitle:e.target.value}})} /></div>
                  <div><label style={S.lbl}>CTA "Book" Button</label><input style={S.inp} value={settingsDraft.uiText.homeCtaBookBtn} onChange={e=>updateSD({uiText:{...settingsDraft.uiText,homeCtaBookBtn:e.target.value}})} /></div>
                  <div><label style={S.lbl}>CTA "WhatsApp" Button</label><input style={S.inp} value={settingsDraft.uiText.homeCtaWaBtn} onChange={e=>updateSD({uiText:{...settingsDraft.uiText,homeCtaWaBtn:e.target.value}})} /></div>
                </div>

                <div style={{fontSize:11,letterSpacing:4,color:C.MID,marginBottom:20,textTransform:"uppercase"}}>Page Banners</div>
                <div style={{fontSize:12,color:"#555",marginBottom:20,lineHeight:1.6}}>Each inner page shows a banner under the menu with the eyebrow/title below, plus an optional background photo (leave blank for a plain color band).</div>
                {([
                  ["work","Work"],["about","About"],["packages","Packages"],["gear","Gear"],["blog","Journal"],["cv","CV"],["booking","Booking"],["contact","Contact"],
                ] as [keyof SectionBg,string][]).map(([key,label])=>(
                  <div key={key} style={{background:"#10101c",border:`1px solid ${C.BORDER}`,borderRadius:4,padding:16,marginBottom:12}}>
                    <div style={{fontSize:11,letterSpacing:2,color:C.PL,textTransform:"uppercase",marginBottom:10}}>{label} Page</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:10}}>
                      <div><label style={S.lbl}>Eyebrow</label><input style={S.inp} value={(settingsDraft.uiText as any)[`${key}BannerEyebrow`]} onChange={e=>updateSD({uiText:{...settingsDraft.uiText,[`${key}BannerEyebrow`]:e.target.value}})} /></div>
                      <div><label style={S.lbl}>Title</label><input style={S.inp} value={(settingsDraft.uiText as any)[`${key}BannerTitle`]} onChange={e=>updateSD({uiText:{...settingsDraft.uiText,[`${key}BannerTitle`]:e.target.value}})} /></div>
                    </div>
                    <SingleImageUpload value={settingsDraft.sectionBg[key]} onChange={url=>updateSD({sectionBg:{...settingsDraft.sectionBg,[key]:url}})} label="Banner Background Image (optional)" />
                  </div>
                ))}
              </div>
            )}

            {settingsTab==="pages"&&(
              <div>
                <div style={{fontSize:11,letterSpacing:4,color:C.MID,marginBottom:20,textTransform:"uppercase"}}>Show / Hide Pages</div>
                <div style={{fontSize:12,color:"#555",marginBottom:20,lineHeight:1.6}}>Turn a page off to remove it from the menu and footer everywhere on the site -- nothing is deleted, its content is just hidden until you switch it back on. Home always stays on.</div>
                {([
                  ["work","Work"],["about","About"],["packages","Packages"],["gear","Gear"],["blog","Journal"],["cv","CV"],["booking","Booking"],["contact","Contact"],
                ] as [keyof PageEnabled,string][]).map(([key,label])=>{
                  const on=settingsDraft.pageEnabled[key]!==false;
                  return (
                    <div key={key} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#10101c",border:`1px solid ${C.BORDER}`,borderRadius:4,padding:"14px 18px",marginBottom:10}}>
                      <span style={{fontSize:13,fontWeight:600}}>{label} Page</span>
                      <button onClick={()=>updateSD({pageEnabled:{...settingsDraft.pageEnabled,[key]:!on}})} style={{width:46,height:26,borderRadius:13,border:"none",cursor:"pointer",position:"relative",background:on?C.P:"#3a3a4a",transition:"background 0.2s"}} aria-label={`Turn ${label} page ${on?"off":"on"}`}>
                        <span style={{position:"absolute",top:3,left:on?23:3,width:20,height:20,borderRadius:"50%",background:"#fff",transition:"left 0.2s"}} />
                      </button>
                    </div>
                  );
                })}

                {/* Show/Hide HOME PAGE SECTIONS -- separate from the whole-page switches above.
                    "Our Clients" is included here for a single "everything homepage" panel,
                    but toggling it writes to clientsEnabled (its existing, already-shipped
                    flag from CMS > Settings > Clients) rather than a new duplicate field. */}
                <div style={{fontSize:11,letterSpacing:4,color:C.MID,margin:"28px 0 20px",textTransform:"uppercase"}}>Show / Hide Homepage Sections</div>
                <div style={{fontSize:12,color:"#555",marginBottom:20,lineHeight:1.6}}>Turn any section of the home page off without deleting its content -- switch it back on any time.</div>
                {([
                  ["hero","Hero Slideshow"],["intro","Intro Strip"],["about","About Naveed"],["video","Full-Width Video"],["services","Services"],["work","Featured Work"],["clients","Our Clients"],["testimonials","Testimonials (Manual)"],["googleReviews","Google Reviews"],["journal","Journal Preview"],["cta","Book CTA"],
                ] as [string,string][]).map(([key,label])=>{
                  const on = key==="clients" ? settingsDraft.clientsEnabled!==false : key==="googleReviews" ? !!settingsDraft.googleReviewsEnabled : key==="video" ? !!settingsDraft.videoSectionEnabled : (settingsDraft.homeSections as any)?.[key]!==false;
                  return (
                    <div key={key} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#10101c",border:`1px solid ${C.BORDER}`,borderRadius:4,padding:"14px 18px",marginBottom:10}}>
                      <span style={{fontSize:13,fontWeight:600}}>{label}</span>
                      <button onClick={()=>{
                        if(key==="clients") updateSD({clientsEnabled:!on});
                        else if(key==="googleReviews") updateSD({googleReviewsEnabled:!on});
                        else if(key==="video") updateSD({videoSectionEnabled:!on});
                        else updateSD({homeSections:{...settingsDraft.homeSections,[key]:!on}});
                      }} style={{width:46,height:26,borderRadius:13,border:"none",cursor:"pointer",position:"relative",background:on?C.P:"#3a3a4a",transition:"background 0.2s"}} aria-label={`Turn ${label} ${on?"off":"on"}`}>
                        <span style={{position:"absolute",top:3,left:on?23:3,width:20,height:20,borderRadius:"50%",background:"#fff",transition:"left 0.2s"}} />
                      </button>
                    </div>
                  );
                })}
                {settingsDraft.googleReviewsEnabled && !settingsDraft.googlePlaceId && (
                  <div style={{fontSize:11,color:"#c9963f",marginTop:-2,marginBottom:14,lineHeight:1.6}}>
                    Google Reviews is on but no Google Place ID is set yet -- add one in the SEO tab, or this section stays hidden.
                  </div>
                )}

                {/* Full-Width Video URL -- sits right here (not in SEO) since it's this
                    section's own content, not search-engine metadata. Shows between About
                    and Services on the home page once both this URL and the toggle above
                    are set. Autoplays muted (browser requirement); visitors get a mute/unmute
                    button on the video itself. */}
                <div style={{marginTop:20,marginBottom:16}}>
                  <label style={S.lbl}>Full-Width Video -- YouTube Link</label>
                  <input style={S.inp} value={settingsDraft.videoSectionUrl} onChange={e=>updateSD({videoSectionUrl:e.target.value})} placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..." />
                  <div style={{fontSize:11,color:"#444",marginTop:4}}>Paste any normal YouTube video/share link -- it plays full-width between About and Services, autoplaying on mute with a mute/unmute + volume control.</div>
                </div>
                <div style={{marginBottom:16}}>
                  <label style={S.lbl}>Full-Width Video -- Small Label (optional)</label>
                  <input style={S.inp} value={settingsDraft.videoSectionSubtitle} onChange={e=>updateSD({videoSectionSubtitle:e.target.value})} placeholder="e.g. FEATURED PROJECT" />
                </div>
                <div style={{marginBottom:16}}>
                  <label style={S.lbl}>Full-Width Video -- Headline (optional)</label>
                  <input style={S.inp} value={settingsDraft.videoSectionTitle} onChange={e=>updateSD({videoSectionTitle:e.target.value})} placeholder="e.g. Luxury Villa Shoot" />
                  <div style={{fontSize:11,color:"#444",marginTop:4}}>Both are shown as a caption over the bottom-left of the video, over a slight dark scrim so they stay readable. Leave either blank to skip it.</div>
                </div>
                {settingsDraft.videoSectionEnabled && !settingsDraft.videoSectionUrl && (
                  <div style={{fontSize:11,color:"#c9963f",marginTop:-8,marginBottom:14,lineHeight:1.6}}>
                    Full-Width Video is on but no YouTube link is set yet -- add one above, or this section stays hidden.
                  </div>
                )}
              </div>
            )}

            {settingsTab==="pricing"&&(
              <div>
                <div style={{fontSize:11,letterSpacing:4,color:C.MID,marginBottom:20,textTransform:"uppercase"}}>Pricing Packages ({settingsDraft.pricingPackages.length})</div>
                <div style={{fontSize:12,color:"#555",marginBottom:20,lineHeight:1.6}}>These cards show on the Packages page under "Your Investment" -- add, remove, reorder or restyle freely. Each can carry its own photo; leave the image blank to show the card without one.</div>

                <div style={{background:"#10101c",padding:20,marginBottom:24,border:`1px solid ${C.BORDER}`}}>
                  <div style={{fontSize:10,letterSpacing:3,color:C.PL,textTransform:"uppercase",marginBottom:12}}>🎨 Card Style (applies to every package card)</div>
                  <div style={{fontSize:12,color:"#555",marginBottom:16,lineHeight:1.6}}>Padding, fonts and colors used on every pricing card. "On Photo" colors apply only to cards that have a background photo set.</div>

                  <div style={{fontSize:10,letterSpacing:3,color:C.PL,textTransform:"uppercase",marginBottom:10}}>Padding (px)</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12,marginBottom:16}}>
                    <div><label style={S.lbl}>Top</label><input type="number" min={0} max={80} style={S.inp} value={settingsDraft.pricingCardStyle.padTop} onChange={e=>updateSD({pricingCardStyle:{...settingsDraft.pricingCardStyle,padTop:Number(e.target.value)||0}})} /></div>
                    <div><label style={S.lbl}>Right</label><input type="number" min={0} max={80} style={S.inp} value={settingsDraft.pricingCardStyle.padRight} onChange={e=>updateSD({pricingCardStyle:{...settingsDraft.pricingCardStyle,padRight:Number(e.target.value)||0}})} /></div>
                    <div><label style={S.lbl}>Bottom</label><input type="number" min={0} max={80} style={S.inp} value={settingsDraft.pricingCardStyle.padBottom} onChange={e=>updateSD({pricingCardStyle:{...settingsDraft.pricingCardStyle,padBottom:Number(e.target.value)||0}})} /></div>
                    <div><label style={S.lbl}>Left</label><input type="number" min={0} max={80} style={S.inp} value={settingsDraft.pricingCardStyle.padLeft} onChange={e=>updateSD({pricingCardStyle:{...settingsDraft.pricingCardStyle,padLeft:Number(e.target.value)||0}})} /></div>
                  </div>

                  <div style={{fontSize:10,letterSpacing:3,color:C.PL,textTransform:"uppercase",margin:"16px 0 10px"}}>Package Name (Title)</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
                    <div><label style={S.lbl}>Font</label><select style={S.inp} value={settingsDraft.pricingCardStyle.titleFont} onChange={e=>updateSD({pricingCardStyle:{...settingsDraft.pricingCardStyle,titleFont:e.target.value}})}>{HERO_FONT_LABELS.map(([k,l])=><option key={k} value={k}>{l}</option>)}</select></div>
                    <div><label style={S.lbl}>Weight</label><select style={S.inp} value={settingsDraft.pricingCardStyle.titleWeight} onChange={e=>updateSD({pricingCardStyle:{...settingsDraft.pricingCardStyle,titleWeight:Number(e.target.value)}})}>{[400,500,600,700,800,900].map(w=><option key={w} value={w}>{w}</option>)}</select></div>
                    <div><label style={S.lbl}>Size (px)</label><input type="number" min={8} max={22} style={S.inp} value={settingsDraft.pricingCardStyle.titleSize} onChange={e=>updateSD({pricingCardStyle:{...settingsDraft.pricingCardStyle,titleSize:Number(e.target.value)||11}})} /></div>
                    <div>
                      <label style={S.lbl}>Color (no photo, blank = brand accent)</label>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <input type="color" value={/^#/.test(settingsDraft.pricingCardStyle.titleColor)?settingsDraft.pricingCardStyle.titleColor:"#8B5CF6"} onChange={e=>updateSD({pricingCardStyle:{...settingsDraft.pricingCardStyle,titleColor:e.target.value}})} style={{width:36,height:32,padding:0,border:"none",background:"none",cursor:"pointer"}} />
                        <input style={{...S.inp,fontSize:11}} placeholder="Brand accent" value={settingsDraft.pricingCardStyle.titleColor} onChange={e=>updateSD({pricingCardStyle:{...settingsDraft.pricingCardStyle,titleColor:e.target.value}})} />
                      </div>
                    </div>
                    <div style={{gridColumn:"1/3"}}>
                      <label style={S.lbl}>Color on Photo</label>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <input type="color" value={/^#/.test(settingsDraft.pricingCardStyle.titleColorOnPhoto)?settingsDraft.pricingCardStyle.titleColorOnPhoto:"#ffffff"} onChange={e=>updateSD({pricingCardStyle:{...settingsDraft.pricingCardStyle,titleColorOnPhoto:e.target.value}})} style={{width:36,height:32,padding:0,border:"none",background:"none",cursor:"pointer"}} />
                        <input style={{...S.inp,fontSize:11}} value={settingsDraft.pricingCardStyle.titleColorOnPhoto} onChange={e=>updateSD({pricingCardStyle:{...settingsDraft.pricingCardStyle,titleColorOnPhoto:e.target.value}})} />
                      </div>
                    </div>
                  </div>

                  <div style={{fontSize:10,letterSpacing:3,color:C.PL,textTransform:"uppercase",margin:"16px 0 10px"}}>Price Number</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
                    <div><label style={S.lbl}>Size (px, desktop max)</label><input type="number" min={24} max={72} style={S.inp} value={settingsDraft.pricingCardStyle.priceSize} onChange={e=>updateSD({pricingCardStyle:{...settingsDraft.pricingCardStyle,priceSize:Number(e.target.value)||44}})} /></div>
                    <div>
                      <label style={S.lbl}>Color (no photo, blank = dark ink)</label>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <input type="color" value={/^#/.test(settingsDraft.pricingCardStyle.priceColor)?settingsDraft.pricingCardStyle.priceColor:"#140D21"} onChange={e=>updateSD({pricingCardStyle:{...settingsDraft.pricingCardStyle,priceColor:e.target.value}})} style={{width:36,height:32,padding:0,border:"none",background:"none",cursor:"pointer"}} />
                        <input style={{...S.inp,fontSize:11}} placeholder="Dark ink" value={settingsDraft.pricingCardStyle.priceColor} onChange={e=>updateSD({pricingCardStyle:{...settingsDraft.pricingCardStyle,priceColor:e.target.value}})} />
                      </div>
                    </div>
                    <div style={{gridColumn:"1/3"}}>
                      <label style={S.lbl}>Color on Photo</label>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <input type="color" value={/^#/.test(settingsDraft.pricingCardStyle.priceColorOnPhoto)?settingsDraft.pricingCardStyle.priceColorOnPhoto:"#ffffff"} onChange={e=>updateSD({pricingCardStyle:{...settingsDraft.pricingCardStyle,priceColorOnPhoto:e.target.value}})} style={{width:36,height:32,padding:0,border:"none",background:"none",cursor:"pointer"}} />
                        <input style={{...S.inp,fontSize:11}} value={settingsDraft.pricingCardStyle.priceColorOnPhoto} onChange={e=>updateSD({pricingCardStyle:{...settingsDraft.pricingCardStyle,priceColorOnPhoto:e.target.value}})} />
                      </div>
                    </div>
                  </div>

                  <div style={{fontSize:10,letterSpacing:3,color:C.PL,textTransform:"uppercase",margin:"16px 0 10px"}}>Description</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
                    <div><label style={S.lbl}>Font</label><select style={S.inp} value={settingsDraft.pricingCardStyle.descFont} onChange={e=>updateSD({pricingCardStyle:{...settingsDraft.pricingCardStyle,descFont:e.target.value}})}>{HERO_FONT_LABELS.map(([k,l])=><option key={k} value={k}>{l}</option>)}</select></div>
                    <div><label style={S.lbl}>Size (px)</label><input type="number" min={10} max={20} style={S.inp} value={settingsDraft.pricingCardStyle.descSize} onChange={e=>updateSD({pricingCardStyle:{...settingsDraft.pricingCardStyle,descSize:Number(e.target.value)||13}})} /></div>
                    <div>
                      <label style={S.lbl}>Color (no photo, blank = muted ink)</label>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <input type="color" value={/^#/.test(settingsDraft.pricingCardStyle.descColor)?settingsDraft.pricingCardStyle.descColor:"#6E6480"} onChange={e=>updateSD({pricingCardStyle:{...settingsDraft.pricingCardStyle,descColor:e.target.value}})} style={{width:36,height:32,padding:0,border:"none",background:"none",cursor:"pointer"}} />
                        <input style={{...S.inp,fontSize:11}} placeholder="Muted ink" value={settingsDraft.pricingCardStyle.descColor} onChange={e=>updateSD({pricingCardStyle:{...settingsDraft.pricingCardStyle,descColor:e.target.value}})} />
                      </div>
                    </div>
                    <div>
                      <label style={S.lbl}>Color on Photo</label>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <input type="color" value={/^#/.test(settingsDraft.pricingCardStyle.descColorOnPhoto)?settingsDraft.pricingCardStyle.descColorOnPhoto:"#ffffff"} onChange={e=>updateSD({pricingCardStyle:{...settingsDraft.pricingCardStyle,descColorOnPhoto:e.target.value}})} style={{width:36,height:32,padding:0,border:"none",background:"none",cursor:"pointer"}} />
                        <input style={{...S.inp,fontSize:11}} value={settingsDraft.pricingCardStyle.descColorOnPhoto} onChange={e=>updateSD({pricingCardStyle:{...settingsDraft.pricingCardStyle,descColorOnPhoto:e.target.value}})} />
                      </div>
                    </div>
                  </div>

                  <div style={{fontSize:10,letterSpacing:3,color:C.PL,textTransform:"uppercase",margin:"16px 0 10px"}}>Photo Overlay (readability tint for cards with a background photo)</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                    <div><label style={S.lbl}>Tint Color (R,G,B)</label><input style={S.inp} value={settingsDraft.pricingCardStyle.overlayColor} onChange={e=>updateSD({pricingCardStyle:{...settingsDraft.pricingCardStyle,overlayColor:e.target.value}})} placeholder="20,13,33" /></div>
                    <div><label style={S.lbl}>Darkness (0 = light, 1 = solid)</label><input type="number" step={0.05} min={0} max={1} style={S.inp} value={settingsDraft.pricingCardStyle.overlayOpacity} onChange={e=>updateSD({pricingCardStyle:{...settingsDraft.pricingCardStyle,overlayOpacity:Number(e.target.value)}})} /></div>
                  </div>
                  <button onClick={()=>updateSD({pricingCardStyle:DEF_SETTINGS.pricingCardStyle})} style={{...S.btnO,marginTop:16}}>Reset to Default Card Style</button>
                </div>

                <button onClick={()=>updateSD({pricingPackages:[...settingsDraft.pricingPackages,{id:Date.now().toString(),icon:"📷",label:"New Package",price:"0",priceNote:"Starting price",desc:"Describe what's included.",image:"",ctaLabel:"Enquire Now",features:[]}]})} style={{...S.btnSm,marginBottom:16}}>+ Add Package</button>
                {settingsDraft.pricingPackages.map((pk,i)=>(
                  <div key={pk.id} style={{background:"#10101c",padding:20,marginBottom:12,border:`1px solid ${C.BORDER}`}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                      <div><label style={S.lbl}>Icon (emoji)</label><input style={S.inp} value={pk.icon} onChange={e=>updateSD({pricingPackages:settingsDraft.pricingPackages.map((x,idx)=>idx===i?{...x,icon:e.target.value}:x)})} /></div>
                      <div><label style={S.lbl}>Package Name</label><input style={S.inp} value={pk.label} onChange={e=>updateSD({pricingPackages:settingsDraft.pricingPackages.map((x,idx)=>idx===i?{...x,label:e.target.value}:x)})} /></div>
                      <div><label style={S.lbl}>Price (AED, numbers only)</label><input style={S.inp} value={pk.price} onChange={e=>updateSD({pricingPackages:settingsDraft.pricingPackages.map((x,idx)=>idx===i?{...x,price:e.target.value}:x)})} placeholder="1,500" /></div>
                      <div><label style={S.lbl}>Price Note</label><input style={S.inp} value={pk.priceNote} onChange={e=>updateSD({pricingPackages:settingsDraft.pricingPackages.map((x,idx)=>idx===i?{...x,priceNote:e.target.value}:x)})} placeholder="Starting price · per session" /></div>
                      <div style={{gridColumn:"1/3"}}><label style={S.lbl}>Description</label><textarea style={{...S.inp,height:70,resize:"vertical" as const}} value={pk.desc} onChange={e=>updateSD({pricingPackages:settingsDraft.pricingPackages.map((x,idx)=>idx===i?{...x,desc:e.target.value}:x)})} /></div>
                      <div><label style={S.lbl}>Button Label</label><input style={S.inp} value={pk.ctaLabel} onChange={e=>updateSD({pricingPackages:settingsDraft.pricingPackages.map((x,idx)=>idx===i?{...x,ctaLabel:e.target.value}:x)})} /></div>
                      <div>
                        <label style={S.lbl}>Button Link (optional)</label>
                        <input style={S.inp} value={pk.ctaLink||""} onChange={e=>updateSD({pricingPackages:settingsDraft.pricingPackages.map((x,idx)=>idx===i?{...x,ctaLink:e.target.value}:x)})} placeholder="Leave blank for the default Contact page" />
                        <div style={{fontSize:10.5,color:"#666",marginTop:4}}>Paste a full link (https://...) or a page path (e.g. /contact). Leave blank to keep sending this button to the Contact page.</div>
                      </div>
                      <div style={{gridColumn:"1/3"}}>
                        <label style={S.lbl}>Includes (one per line -- shows on the card's flip-back side)</label>
                        <textarea style={{...S.inp,height:100,resize:"vertical" as const}} value={(pk.features||[]).join("\n")} onChange={e=>updateSD({pricingPackages:settingsDraft.pricingPackages.map((x,idx)=>idx===i?{...x,features:e.target.value.split("\n").filter(l=>l.trim())}:x)})} placeholder={"High-resolution edited images\nCommercial usage license\nFast turnaround"} />
                      </div>
                      <div style={{gridColumn:"1/3"}}><SingleImageUpload label="Photo (optional)" value={pk.image} onChange={v=>updateSD({pricingPackages:settingsDraft.pricingPackages.map((x,idx)=>idx===i?{...x,image:v}:x)})} /></div>
                    </div>
                    <button onClick={()=>updateSD({pricingPackages:settingsDraft.pricingPackages.filter((_,idx)=>idx!==i)})} style={{background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:11,letterSpacing:2,textTransform:"uppercase" as const}}>Remove Package</button>
                  </div>
                ))}
              </div>
            )}

            <div style={{marginTop:24,paddingTop:24,borderTop:`1px solid ${C.BORDER}`,display:"flex",gap:12}}>
              <button onClick={saveSettings} style={S.btnP}>💾 Save All Settings</button>
              <button onClick={()=>setSettingsDraft(settings)} style={S.btnO}>Reset Changes</button>
            </div>
          </div>
        )}

        {/* CATEGORIES */}
        {cmsTab==="categories"&&(
          <div style={{maxWidth:600,margin:"48px auto",padding:"0 24px"}}>
            <div style={{fontSize:11,letterSpacing:4,color:C.MID,marginBottom:20,textTransform:"uppercase"}}>Categories</div>
            <div style={{display:"flex",gap:8,marginBottom:24}}>
              <input style={{...S.inp,flex:1}} value={newCat} onChange={e=>setNewCat(e.target.value)} placeholder="New category" onKeyDown={e=>{if(e.key==="Enter"&&newCat.trim()){setCats(c=>[...c,newCat.trim()]);setNewCat("");}}} data-allow-enter="true" />
              <button onClick={()=>{if(newCat.trim()){setCats(c=>[...c,newCat.trim()]);setNewCat("");}}} style={S.btnP}>Add</button>
            </div>
            {cats.map((c,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",borderBottom:`1px solid ${C.BORDER}`}}>
                <span style={{fontSize:13}}>{c}</span>
                <button onClick={()=>setCats(cs=>cs.filter((_,idx)=>idx!==i))} style={{background:"none",border:"none",color:"#555",cursor:"pointer"}}>✕</button>
              </div>
            ))}

            <div style={{fontSize:11,letterSpacing:4,color:C.MID,margin:"40px 0 20px",textTransform:"uppercase"}}>Journal Categories</div>
            <div style={{display:"flex",gap:8,marginBottom:24}}>
              <input style={{...S.inp,flex:1}} value={newBlogCat} onChange={e=>setNewBlogCat(e.target.value)} placeholder="New journal category" onKeyDown={e=>{if(e.key==="Enter"&&newBlogCat.trim()){setBlogCats(c=>[...c,newBlogCat.trim()]);setNewBlogCat("");}}} data-allow-enter="true" />
              <button onClick={()=>{if(newBlogCat.trim()){setBlogCats(c=>[...c,newBlogCat.trim()]);setNewBlogCat("");}}} style={S.btnP}>Add</button>
            </div>
            {blogCats.map((c,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",borderBottom:`1px solid ${C.BORDER}`}}>
                <span style={{fontSize:13}}>{c}</span>
                <button onClick={()=>setBlogCats(cs=>cs.filter((_,idx)=>idx!==i))} style={{background:"none",border:"none",color:"#555",cursor:"pointer"}}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* TESTIMONIALS */}
        {cmsTab==="testimonials"&&(
          <div style={{maxWidth:700,margin:"48px auto",padding:"0 24px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div style={{fontSize:11,letterSpacing:4,color:C.MID,textTransform:"uppercase"}}>Testimonials</div>
              <button onClick={()=>setTestimonials(ts=>[...ts,{id:Date.now().toString(),name:"Client Name",role:"Role",company:"Company",quote:"Testimonial quote here.",featured:true}])} style={S.btnP}>+ Add</button>
            </div>
            {testimonials.map((t,i)=>(
              <div key={t.id} style={{background:"#10101c",padding:20,marginBottom:12,border:`1px solid ${C.BORDER}`}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                  <div><label style={S.lbl}>Name</label><input style={S.inp} value={t.name} onChange={e=>setTestimonials(ts=>ts.map((x,idx)=>idx===i?{...x,name:e.target.value}:x))} /></div>
                  <div><label style={S.lbl}>Role</label><input style={S.inp} value={t.role} onChange={e=>setTestimonials(ts=>ts.map((x,idx)=>idx===i?{...x,role:e.target.value}:x))} /></div>
                  <div><label style={S.lbl}>Company</label><input style={S.inp} value={t.company} onChange={e=>setTestimonials(ts=>ts.map((x,idx)=>idx===i?{...x,company:e.target.value}:x))} /></div>
                  <div style={{display:"flex",alignItems:"center",gap:8,paddingTop:20}}>
                    <input type="checkbox" checked={t.featured} onChange={e=>setTestimonials(ts=>ts.map((x,idx)=>idx===i?{...x,featured:e.target.checked}:x))} />
                    <span style={{fontSize:11,color:C.MID}}>Featured</span>
                  </div>
                </div>
                <div style={{marginBottom:12}}><label style={S.lbl}>Quote</label><textarea style={{...S.inp,height:80,resize:"vertical" as const}} value={t.quote} onChange={e=>setTestimonials(ts=>ts.map((x,idx)=>idx===i?{...x,quote:e.target.value}:x))} /></div>
                <button onClick={()=>setTestimonials(ts=>ts.filter((_,idx)=>idx!==i))} style={{background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:11,letterSpacing:2,textTransform:"uppercase" as const}}>Remove</button>
              </div>
            ))}
          </div>
        )}

        {/* BLOG */}
        {cmsTab==="blog"&&(
          <div style={{maxWidth:700,margin:"48px auto",padding:"0 24px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div style={{fontSize:11,letterSpacing:4,color:C.MID,textTransform:"uppercase"}}>Blog Posts</div>
              <button onClick={()=>setBlog(bs=>[...bs,{id:Date.now().toString(),title:"New Post",slug:"new-post",excerpt:"",date:new Date().toISOString().split("T")[0],category:blogCats[0]||"",coverImage:"",content:""}])} style={S.btnP}>+ New Post</button>
            </div>
            {blog.map((b,i)=>(
              <div key={b.id} style={{background:"#10101c",padding:20,marginBottom:12,border:`1px solid ${C.BORDER}`}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                  <div><label style={S.lbl}>Title</label><input style={S.inp} value={b.title} onChange={e=>setBlog(bs=>bs.map((x,idx)=>idx===i?{...x,title:e.target.value,slug:slugify(e.target.value)}:x))} /></div>
                  <div><label style={S.lbl}>Category</label>
                    <select style={S.inp} value={b.category} onChange={e=>setBlog(bs=>bs.map((x,idx)=>idx===i?{...x,category:e.target.value}:x))}>
                      {!blogCats.includes(b.category)&&b.category&&<option value={b.category}>{b.category}</option>}
                      {blogCats.map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div><label style={S.lbl}>Date</label><input type="date" style={S.inp} value={b.date} onChange={e=>setBlog(bs=>bs.map((x,idx)=>idx===i?{...x,date:e.target.value}:x))} /></div>
                </div>
                <SingleImageUpload value={b.coverImage} onChange={url=>{const old=b.coverImage;const nextBlog=blog.map((x,idx)=>idx===i?{...x,coverImage:url}:x);setBlog(()=>nextBlog);if(old&&old!==url){const inUse=collectAllImageUrls({projects,blog:nextBlog,settings});if(!inUse.has(old))deleteStorageFiles([old]);}}} label="Cover Image" />
                <div style={{marginBottom:12}}><label style={S.lbl}>Excerpt</label><textarea style={{...S.inp,height:70,resize:"vertical" as const}} value={b.excerpt} onChange={e=>setBlog(bs=>bs.map((x,idx)=>idx===i?{...x,excerpt:e.target.value}:x))} /></div>
                <div style={{marginBottom:12}}><label style={S.lbl}>Full Content</label><textarea style={{...S.inp,height:160,resize:"vertical" as const}} value={b.content} onChange={e=>setBlog(bs=>bs.map((x,idx)=>idx===i?{...x,content:e.target.value}:x))} placeholder="Full article content..." /></div>
                <button onClick={()=>{const remaining=blog.filter((_,idx)=>idx!==i);setBlog(bs=>bs.filter((_,idx)=>idx!==i));if(b.coverImage){const inUse=collectAllImageUrls({projects,blog:remaining,settings});if(!inUse.has(b.coverImage))deleteStorageFiles([b.coverImage]);}}} style={{background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:11,letterSpacing:2,textTransform:"uppercase" as const}}>Remove</button>
              </div>
            ))}
          </div>
        )}

        {/* PROJECTS */}
        {cmsTab==="projects"&&(
          <div style={{display:"flex",minHeight:"calc(100vh - 60px)"}}>
            <div style={{width:280,borderRight:`1px solid ${C.BORDER}`,padding:16,overflowY:"auto",maxHeight:"calc(100vh - 60px)"}}>
              <div style={{fontSize:10,letterSpacing:3,color:"#444",marginBottom:12,textTransform:"uppercase"}}>{projects.length} Projects</div>
              {projects.map(p=>(
                <div key={p.id} onClick={()=>startEdit(p)} style={{padding:"10px 12px",marginBottom:2,cursor:"pointer",background:editId===p.id?"#12121e":"none",borderLeft:editId===p.id?`2px solid ${C.P}`:"2px solid transparent",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div><div style={{fontSize:12,color:C.FG}}>{p.title}</div><div style={{fontSize:10,color:"#555"}}>{p.categories?.join(", ")} · {p.images?.length||0}📷</div></div>
                  <button onClick={e=>{e.stopPropagation();if(confirm("Delete?")){const remaining=projects.filter(x=>x.id!==p.id);setProjects(ps=>ps.filter(x=>x.id!==p.id));const dropped=Array.from(projectImageUrls(p));if(dropped.length){const inUse=collectAllImageUrls({projects:remaining,blog,settings});deleteStorageFiles(dropped.filter(u=>!inUse.has(u)));}}}} style={{background:"none",border:"none",color:"#444",cursor:"pointer"}}>✕</button>
                </div>
              ))}
            </div>
            <div style={{flex:1,padding:32,overflowY:"auto",maxHeight:"calc(100vh - 60px)"}}>
              {editId?(
                <div style={{maxWidth:720}} onKeyDown={e=>{
                  // Pressing Enter in any plain text field here must never save/submit the
                  // project -- only clicking the "Save Project" button below does. The one
                  // deliberate exception is the "paste URL" field just below (marked
                  // data-allow-enter), whose own Enter convenience adds that single image URL
                  // to the gallery -- a distinct, already-existing micro-action, not a project
                  // save. Textareas keep their normal Enter-for-newline behavior.
                  if(e.key==="Enter" && (e.target as HTMLElement).tagName==="INPUT" && (e.target as HTMLElement).getAttribute("data-allow-enter")!=="true"){
                    e.preventDefault();
                  }
                }}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
                    <div><label style={S.lbl}>Title *</label><input style={S.inp} value={form.title||""} onChange={e=>setForm(f=>({...f,title:e.target.value,slug:slugify(e.target.value)}))} /></div>
                    <div><label style={S.lbl}>Slug</label><input style={S.inp} value={form.slug||""} onChange={e=>setForm(f=>({...f,slug:e.target.value}))} /></div>
                    <div><label style={S.lbl}>Project Name</label><input style={S.inp} value={form.projectName||""} onChange={e=>setForm(f=>({...f,projectName:e.target.value}))} placeholder="Defaults to Title if left blank" /></div>
                    <div><label style={S.lbl}>Client</label><input style={S.inp} value={form.clientName||""} onChange={e=>setForm(f=>({...f,clientName:e.target.value}))} /></div>
                    <div><label style={S.lbl}>Location</label><input style={S.inp} value={form.location||""} onChange={e=>setForm(f=>({...f,location:e.target.value}))} /></div>
                    <div><label style={S.lbl}>Date</label><input type="date" style={S.inp} value={form.projectDate||""} onChange={e=>setForm(f=>({...f,projectDate:e.target.value}))} /></div>
                    <div><label style={S.lbl}>YouTube URL</label><input style={S.inp} value={form.youtubeUrl||""} onChange={e=>setForm(f=>({...f,youtubeUrl:e.target.value}))} /></div>
                  </div>
                  <div style={{marginBottom:16}}>
                    <label style={S.lbl}>Banner Title (optional -- press Enter for a line break; defaults to Title if left blank)</label>
                    <textarea style={{...S.inp,height:60,resize:"vertical" as const}} value={form.bannerTitle||""} onChange={e=>setForm(f=>({...f,bannerTitle:e.target.value}))} placeholder={form.title||"e.g. World Investment\\nConference 2025"} />
                  </div>
                  <div style={{marginBottom:16}}>
                    <SingleImageUpload value={form.bannerImage||""} onChange={url=>setForm(f=>({...f,bannerImage:url}))} label="Banner Image (optional -- defaults to Cover Image if left blank)" />
                  </div>
                  <div style={{marginBottom:16}}>
                    <label style={S.lbl}>Categories</label>
                    <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                      {cats.map(c=><span key={c} onClick={()=>setForm(f=>({...f,categories:f.categories.includes(c)?f.categories.filter(x=>x!==c):[...f.categories,c]}))} style={{fontSize:11,padding:"6px 14px",cursor:"pointer",border:`1px solid ${(form.categories||[]).includes(c)?C.PL:"#2a2840"}`,color:(form.categories||[]).includes(c)?C.PL:C.MID,letterSpacing:1,textTransform:"uppercase" as const,transition:"all 0.2s"}}>{c}</span>)}
                    </div>
                  </div>
                  <div style={{marginBottom:16}}><label style={S.lbl}>Short Description</label><textarea style={{...S.inp,height:70,resize:"vertical" as const}} value={form.description||""} onChange={e=>setForm(f=>({...f,description:e.target.value}))} /></div>
                  <div style={{marginBottom:16}}><label style={S.lbl}>Full Description</label><textarea style={{...S.inp,height:100,resize:"vertical" as const}} value={form.fullDescription||""} onChange={e=>setForm(f=>({...f,fullDescription:e.target.value}))} /></div>
                  <div style={{marginBottom:16,display:"flex",gap:10,alignItems:"center"}}>
                    <input type="checkbox" checked={!!form.featured} onChange={e=>setForm(f=>({...f,featured:e.target.checked}))} />
                    <span style={{fontSize:11,letterSpacing:2,color:C.MID,textTransform:"uppercase" as const}}>Featured on homepage</span>
                  </div>
                  <SingleImageUpload value={form.coverImage||""} onChange={url=>setForm(f=>({...f,coverImage:url}))} label="Cover Image" />
                    {form.coverImage&&<button onClick={()=>setCropSrc(form.coverImage!)} style={{...S.btnSm,marginTop:-10,marginBottom:16}}>✂️ Crop for Display Size</button>}
                  <div style={{marginBottom:8}}>
                    <label style={S.lbl}>Project Gallery</label>
                    <div style={{display:"flex",gap:8,marginBottom:8,flexWrap:"wrap"}}>
                      <UploadBtn label="📁 Upload Multiple Photos" />
                      <div style={{display:"flex",gap:8,flex:1}}>
                        <input style={{...S.inp,flex:1}} value={newImg} onChange={e=>setNewImg(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addImgUrl()} placeholder="or paste URL..." data-allow-enter="true" />
                        <button onClick={addImgUrl} style={S.btnP}>{addingImg?"...":"Add URL"}</button>
                      </div>
                    </div>
                    <div style={{fontSize:10,color:"#444",marginBottom:8}}>P = Portrait · L = Landscape · Click Cover to set cover photo</div>
                  </div>
                  <div style={{fontSize:10,color:"#444",marginBottom:6,marginTop:-4}}>Click ◀ ▶ to nudge one spot, or the #N badge to jump an image straight to a position</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6,marginBottom:16}}>
                    {(form.images||[]).map((img,i)=>{
                      const total=(form.images||[]).length;
                      const moveImgTo=(to:number)=>{
                        if(isNaN(to)||to<0||to>=total||to===i)return;
                        setForm(f=>{ const arr=[...(f.images||[])]; const [item]=arr.splice(i,1); arr.splice(to,0,item); return {...f,images:arr}; });
                      };
                      return(
                      <div key={i} style={{position:"relative",aspectRatio:"1",overflow:"hidden",background:"#0d0d18"}}>
                        <img src={img.url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} />
                        <div style={{position:"absolute",top:2,right:2,background:"rgba(0,0,0,0.8)",color:img.orientation==="portrait"?C.PL:"#7ec8e3",fontSize:8,padding:"1px 4px"}}>{img.orientation==="portrait"?"P":"L"}</div>
                        <button onClick={()=>setForm(f=>({...f,images:f.images.filter((_,idx)=>idx!==i)}))} style={{position:"absolute",top:2,left:2,background:"rgba(0,0,0,0.8)",border:"none",color:"#fff",cursor:"pointer",fontSize:10}}>✕</button>
                        <button onClick={()=>setForm(f=>({...f,coverImage:img.url}))} style={{position:"absolute",bottom:2,left:2,background:form.coverImage===img.url?C.P:"rgba(0,0,0,0.8)",border:"none",color:"#fff",cursor:"pointer",fontSize:8,padding:"1px 4px"}}>Cover</button>
                        {/* Reorder controls: ◀ ▶ nudge this image one spot, and the #N badge
                            opens a prompt to jump it straight to any position (e.g. #5 -> #4,
                            or #3 -> #8) -- built for projects with dozens of images where
                            clicking ◀/▶ repeatedly would be impractical. */}
                        <button onClick={()=>moveImgTo(i-1)} disabled={i===0} title="Move left" style={{position:"absolute",bottom:2,right:46,width:16,textAlign:"center" as const,background:"rgba(0,0,0,0.8)",border:"none",color:i===0?"#555":"#fff",cursor:i===0?"default":"pointer",fontSize:10,padding:"1px 0"}}>◀</button>
                        <button onClick={()=>moveImgTo(i+1)} disabled={i===total-1} title="Move right" style={{position:"absolute",bottom:2,right:26,width:16,textAlign:"center" as const,background:"rgba(0,0,0,0.8)",border:"none",color:i===total-1?"#555":"#fff",cursor:i===total-1?"default":"pointer",fontSize:10,padding:"1px 0"}}>▶</button>
                        <button onClick={()=>{ const input=prompt(`Move image #${i+1} to position (1-${total}):`,String(i+1)); if(input===null)return; moveImgTo(parseInt(input,10)-1); }} title="Jump to position" style={{position:"absolute",bottom:2,right:2,minWidth:20,textAlign:"center" as const,background:"rgba(0,0,0,0.8)",border:"none",color:"#fff",cursor:"pointer",fontSize:8,padding:"1px 3px"}}>#{i+1}</button>
                      </div>
                      );
                    })}
                  </div>
                  <div style={{marginBottom:16}}>
                    <label style={S.lbl}>Add Reel/Social URL</label>
                    <div style={{display:"flex",gap:8}}>
                      <input style={{...S.inp,flex:1}} value={newReel} onChange={e=>setNewReel(e.target.value)} placeholder="YouTube/Instagram reel URL" />
                      <button onClick={()=>{if(newReel.trim()){setForm(f=>({...f,reels:[...(f.reels||[]),newReel.trim()]}));setNewReel("");}}} style={S.btnP}>Add</button>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:12,marginTop:24}}>
                    <button onClick={saveProj} style={S.btnP}>Save Project</button>
                    <button onClick={()=>setEditId(null)} style={S.btnO}>Cancel</button>
                  </div>
                </div>
              ):<div style={{color:"#333",textAlign:"center",marginTop:100,fontSize:13}}>Select a project or create a new one</div>}
            </div>
          </div>
        )}
        {cropSrc&&<CropModal src={cropSrc} onCancel={()=>setCropSrc(null)} onConfirm={async(file)=>{ try{ const url=await uploadToStorage(file); setForm(f=>({...f,coverImage:url})); }catch(e:any){ alert(e?.message||"Couldn't upload the cropped image."); } setCropSrc(null); }} />}
      </div>
    );
  }

  // ── PROJECT PAGE ──
  if(page==="project"&&selProj){
    const ytId=getYTId(selProj.youtubeUrl);
    return(
      <div key={page} className="pg-fade" style={{...S.base,animation:"pgFadeIn 0.55s cubic-bezier(.16,.84,.44,1) both"}}>
        <Nav />
        <PageBanner eyebrow={selProj.categories?.join(" · ")||"Portfolio"} title={selProj.title} image={selProj.coverImage} />
        <div style={{maxWidth:1200,margin:"0 auto",padding:"40px 40px 80px"}}>
          <span onClick={()=>goTo("work")} style={{fontSize:11,letterSpacing:3,color:C.MID,textTransform:"uppercase",cursor:"pointer",display:"inline-block",marginBottom:24}}>← All Work</span>
          <div style={{display:"flex",gap:24,color:C.MID,fontSize:12,marginBottom:20,flexWrap:"wrap"}}>
            {selProj.location&&<span>📍 {selProj.location}</span>}
            {selProj.projectDate&&<span>📅 {selProj.projectDate}</span>}
            {selProj.clientName&&<span>👤 {selProj.clientName}</span>}
          </div>
          <ProjectReaction projectId={selProj.id} />
          {selProj.description&&<p style={{color:C.MID,fontSize:15,lineHeight:1.9,maxWidth:680,marginBottom:48}}>{selProj.description}</p>}
          {ytId&&<div style={{marginBottom:48,aspectRatio:"16/9",maxWidth:900}}><iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${ytId}`} frameBorder={0} allowFullScreen style={{display:"block"}} /></div>}
          {selProj.images?.length>0&&<div style={{marginBottom:48}}><SmartGrid images={selProj.images} onClick={i=>setLb({open:true,index:i})} /></div>}
          {selProj.reels?.length>0&&<div style={{marginBottom:48,display:"flex",gap:12,flexWrap:"wrap"}}>{selProj.reels.map((r,i)=><a key={i} href={r} target="_blank" rel="noopener noreferrer" style={{...S.btnO,textDecoration:"none"}}>View Reel {i+1}</a>)}</div>}
          <div style={{marginTop:48,paddingTop:48,borderTop:`1px solid ${C.BORDER}`}}>
            <div style={{fontSize:10,letterSpacing:5,color:C.PL,textTransform:"uppercase",marginBottom:20}}>Related Projects</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:3}}>
              {projects.filter(p=>p.id!==selProj.id&&p.categories?.some(c=>selProj.categories?.includes(c))).slice(0,3).map(p=>(
                <a key={p.id} href={`/work/${p.slug}`} style={{display:"block",cursor:"pointer",aspectRatio:"4/3",overflow:"hidden",position:"relative",background:C.DARK,textDecoration:"none"}}>
                  <img src={p.coverImage||""} alt={p.title} loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover",filter:"grayscale(1)",transition:"transform 0.5s, filter 0.5s"}} onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.05)";e.currentTarget.style.filter="grayscale(0)";}} onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.filter="grayscale(1)";}} />
                  <div style={{position:"absolute",bottom:0,left:0,right:0,padding:16,background:"linear-gradient(to top,rgba(9,6,14,0.9),transparent)"}}><div style={{fontSize:13,color:"#fff"}}>{p.title}</div></div>
                </a>
              ))}
            </div>
          </div>
        </div>
        {lb.open&&<Lightbox images={selProj.images||[]} index={lb.index} onClose={()=>setLb({open:false,index:0})} onPrev={()=>setLb(l=>({...l,index:Math.max(0,l.index-1)}))} onNext={()=>setLb(l=>({...l,index:Math.min((selProj.images?.length||1)-1,l.index+1)}))} />}
        <FloatingWA num={WA} msg={WA_MSG} />
      <ConsultPopup open={popupOpen} onClose={closePopup} title={settings.popupTitle} text={settings.popupText} ctaLabel={settings.popupCtaLabel} waNumber={WA} />
      </div>
    );
  }

  // ── BLOG POST ──
  if(page==="blog-post"&&selBlog) return(
    <div key={page} className="pg-fade" style={{...S.base,animation:"pgFadeIn 0.55s cubic-bezier(.16,.84,.44,1) both"}}>
      <Nav />
      <PageBanner eyebrow={selBlog.category||"Journal"} title={selBlog.title} image={selBlog.coverImage} />
      <div style={{maxWidth:800,margin:"0 auto",padding:"40px 40px 80px"}}>
        <span onClick={()=>goTo("blog")} style={{fontSize:11,letterSpacing:3,color:C.MID,textTransform:"uppercase",cursor:"pointer",display:"inline-block",marginBottom:24}}>← Journal</span>
        <div style={{color:C.MID,fontSize:12,marginBottom:32}}>📅 {selBlog.date}</div>
        {selBlog.coverImage&&<div style={{aspectRatio:"16/9",overflow:"hidden",marginBottom:48}}><img src={selBlog.coverImage} alt={selBlog.title} style={{width:"100%",height:"100%",objectFit:"cover"}} /></div>}
        <p style={{color:C.MID,fontSize:15,lineHeight:1.9,marginBottom:24}}>{selBlog.excerpt}</p>
        {selBlog.content?<div style={{color:C.MID,fontSize:14,lineHeight:1.9,whiteSpace:"pre-wrap"}}>{selBlog.content}</div>:<p style={{color:"#444",fontSize:13,fontStyle:"italic"}}>Full article coming soon.</p>}
      </div>
      <Footer /><FloatingWA num={WA} msg={WA_MSG} />
      <ConsultPopup open={popupOpen} onClose={closePopup} title={settings.popupTitle} text={settings.popupText} ctaLabel={settings.popupCtaLabel} waNumber={WA} />
    </div>
  );

  // ── BLOG ──
  if(page==="blog") return(
    <div key={page} className="pg-fade" style={{...S.base,animation:"pgFadeIn 0.55s cubic-bezier(.16,.84,.44,1) both"}}>
      <Nav />
      {/* Was a hardcoded heading here instead of the shared PageBanner every other inner page
          uses -- meant the CMS's Journal Banner Eyebrow/Title fields and its banner image
          (Settings > Text & Banners) silently did nothing. Now wired up the same way Work/
          Packages/CV/Booking already are. */}
      <PageBanner eyebrow={settings.uiText.blogBannerEyebrow} title={settings.uiText.blogBannerTitle} description="Tips and tricks, camera settings and gear, behind-the-scenes stories and client guides -- practical notes from the field for anyone into photography and video." image={settings.sectionBg.blog} />
      <div style={{maxWidth:1200,margin:"0 auto",padding:"40px 40px 80px"}}>
        <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:48}}>
          <span onClick={()=>setBlogFilterCat("All")} style={{fontSize:11,letterSpacing:1,padding:"8px 16px",borderRadius:20,cursor:"pointer",border:`1px solid ${blogFilterCat==="All"?C.PL:C.BORDER}`,background:blogFilterCat==="All"?C.PL:"transparent",color:blogFilterCat==="All"?C.BG:C.MID,transition:"all 0.2s"}}>All ({blog.length})</span>
          {blogCats.map(c=>{ const cnt=blog.filter(b=>b.category===c).length; if(!cnt) return null; return <span key={c} onClick={()=>setBlogFilterCat(c)} style={{fontSize:11,letterSpacing:1,padding:"8px 16px",borderRadius:20,cursor:"pointer",border:`1px solid ${blogFilterCat===c?C.PL:C.BORDER}`,background:blogFilterCat===c?C.PL:"transparent",color:blogFilterCat===c?C.BG:C.MID,transition:"all 0.2s"}}>{c} ({cnt})</span>; })}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",gap:24}}>
          {filteredBlog.map(b=>(
            <div key={b.id} className="tcard" onClick={()=>openBlog(b)} style={{cursor:"pointer",background:C.DARK,border:`1px solid ${C.BORDER}`,borderRadius:4,overflow:"hidden"}}>
              {b.coverImage&&<div style={{aspectRatio:"16/9",overflow:"hidden"}}><img src={b.coverImage} alt={b.title} loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover",transition:"transform 0.5s"}} onMouseEnter={e=>(e.currentTarget.style.transform="scale(1.04)")} onMouseLeave={e=>(e.currentTarget.style.transform="scale(1)")} /></div>}
              <div style={{padding:24}}>
                <div style={{fontSize:10,letterSpacing:3,color:C.PL,textTransform:"uppercase",marginBottom:8}}>{b.category} · {b.date}</div>
                <h3 style={{fontSize:18,fontWeight:700,letterSpacing:0.5,margin:"0 0 12px"}}>{b.title}</h3>
                <p style={{color:C.MID,fontSize:13,lineHeight:1.7}}>{b.excerpt}</p>
                <div style={{marginTop:16,fontSize:11,letterSpacing:2,color:C.PL,textTransform:"uppercase"}}>Read More →</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Footer /><FloatingWA num={WA} msg={WA_MSG} />
      <ConsultPopup open={popupOpen} onClose={closePopup} title={settings.popupTitle} text={settings.popupText} ctaLabel={settings.popupCtaLabel} waNumber={WA} />
    </div>
  );

  // ── PACKAGES ── feature-list cards + Enquire/Book Now CTAs, no exact pricing shown --
  // modeled on the shamsfz.ae reference, tiers derived from the CMS-editable services list.
  if(page==="packages") return(
    <div key={page} className="pg-fade" style={{...S.base,animation:"pgFadeIn 0.55s cubic-bezier(.16,.84,.44,1) both"}}>
      <Nav />
      <PageBanner eyebrow={settings.uiText.packagesBannerEyebrow} title={settings.uiText.packagesBannerTitle} image={settings.sectionBg.packages} />
      <div style={{maxWidth:1200,margin:"0 auto",padding:"40px 40px 100px"}}>
        <div style={{textAlign:"center",maxWidth:640,margin:"0 auto 64px"}}>
          <div style={{...S.tag(true),marginBottom:16}}><span style={{width:32,height:1,background:C.PL,display:"inline-block"}} />Packages<span style={{width:32,height:1,background:C.PL,display:"inline-block"}} /></div>
          <h1 style={{fontSize:"clamp(32px,4.5vw,56px)",fontWeight:700,letterSpacing:1,margin:"0 0 16px"}}>Your Investment</h1>
          <p style={{color:C.MID,fontSize:14,lineHeight:1.8,margin:0}}>Every project is scoped around your brand and goals, so pricing is quoted after a short conversation about what you need. Here's what each service includes -- enquire for a tailored quote.</p>
        </div>

        {/* PRICING PACKAGES -- CMS > Settings > Packages. Light lavender cards (the same
            C.LT/C.LTCARD tokens already used for the homepage's light sections) popping
            against this page's dark background, each with a badge, a headline price,
            description and an optional photo -- add/remove/edit freely in CMS, images included. */}
        {settings.pricingPackages.length>0&&(
          <div style={{marginBottom:72}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:28}}>
              {settings.pricingPackages.map((pk,i)=>{
                const waHref=`https://wa.me/${WA}?text=${encodeURIComponent(`Hello ${settings.siteName}! I'd like to enquire about your ${pk.label}.`)}`;
                const pcs=settings.pricingCardStyle;
                const cardPad=`${pcs.padTop}px ${pcs.padRight}px ${pcs.padBottom}px ${pcs.padLeft}px`;
                const titleFF=HERO_FONTS[pcs.titleFont];
                const descFF=HERO_FONTS[pcs.descFont];
                return (
                <Reveal key={pk.id} delay={i*0.08}>
                {/* Hover (or keyboard-focus the Enquire button) flips the card to a solid-accent
                    back face listing what's included -- see .pflip in globals.css. Explicit
                    height is required: the faces are position:absolute so the wrapper has no
                    intrinsic height of its own. */}
                <div className="pflip" style={{height:420}}>
                <div className="pflip-inner">
                  {/* When a photo is set for this package, it becomes the card's full background
                      (with a dark gradient overlay for text contrast) instead of a small side
                      thumbnail -- gives each package its own visual identity. Padding, fonts and
                      colors below all come from settings.pricingCardStyle (CMS > Settings >
                      Packages > Card Style), applied the same way to every card. */}
                  <div className="pflip-face" style={pk.image?{backgroundImage:`${pricingOverlayGradient(pcs)}, url(${pk.image})`,backgroundSize:"cover",backgroundPosition:"center",border:`1px solid ${C.LTBORDER}`,borderRadius:10,padding:cardPad,boxShadow:"0 24px 60px rgba(20,13,33,0.18)"}:{background:C.LTCARD,border:`1px solid ${C.LTBORDER}`,borderRadius:10,padding:cardPad,boxShadow:"0 24px 60px rgba(20,13,33,0.10)"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:26}}>
                      <span style={{fontSize:20}}>{pk.icon}</span>
                      <span style={{fontFamily:titleFF,fontSize:pcs.titleSize,letterSpacing:3,fontWeight:pcs.titleWeight,color:pk.image?pcs.titleColorOnPhoto:(pcs.titleColor||C.P),textTransform:"uppercase"}}>{pk.label}</span>
                    </div>
                    <div style={{flex:1,minHeight:0}}>
                      <div style={{fontSize:11,letterSpacing:2,color:pk.image?pcs.descColorOnPhoto:(pcs.descColor||C.INKMID),textTransform:"uppercase",marginBottom:6}}>Starting From</div>
                      <div style={{display:"flex",alignItems:"baseline",gap:6,marginBottom:4,flexWrap:"wrap"}}>
                        <span style={{fontSize:12,fontWeight:700,color:pk.image?pcs.titleColorOnPhoto:(pcs.titleColor||C.P)}}>AED</span>
                        <span style={{fontSize:`clamp(32px,3.4vw,${pcs.priceSize}px)`,fontWeight:800,color:pk.image?pcs.priceColorOnPhoto:(pcs.priceColor||C.DARK),lineHeight:1}}>{pk.price}</span>
                      </div>
                      {pk.priceNote&&<div style={{fontSize:11,color:pk.image?pcs.descColorOnPhoto:(pcs.descColor||C.INKMID),marginBottom:18}}>{pk.priceNote}</div>}
                      <p style={{fontFamily:descFF,fontSize:pcs.descSize,color:pk.image?pcs.descColorOnPhoto:(pcs.descColor||C.INKMID),lineHeight:1.7,margin:0}}>{pk.desc}</p>
                    </div>
                    <div style={{marginTop:"auto"}}>
                      {(pk.features||[]).length>0&&<div style={{fontSize:10,color:pk.image?pcs.titleColorOnPhoto:(pcs.titleColor||C.P),letterSpacing:1,marginBottom:10}}>↻ Hover to see what's included</div>}
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,paddingTop:20,borderTop:`1px solid ${pk.image?"rgba(255,255,255,0.3)":C.LTBORDER}`}}>
                        <span style={{fontSize:10,color:pk.image?pcs.descColorOnPhoto:(pcs.descColor||C.INKMID)}}>T&C Apply</span>
                        <a href={waHref} target="_blank" rel="noopener noreferrer" style={{...S.btnP,padding:"10px 20px",fontSize:11,textDecoration:"none"}}>{pk.ctaLabel}</a>
                      </div>
                    </div>
                  </div>
                  <div className="pflip-face pflip-back" style={{background:C.P,borderRadius:10,padding:cardPad,boxShadow:"0 24px 60px rgba(20,13,33,0.10)"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:22}}>
                      <span style={{fontSize:20}}>{pk.icon}</span>
                      <span style={{fontSize:11,letterSpacing:3,fontWeight:700,color:"#fff",textTransform:"uppercase"}}>{pk.label}</span>
                    </div>
                    <div style={{fontSize:11,letterSpacing:2,color:"rgba(255,255,255,0.8)",textTransform:"uppercase",fontWeight:700,marginBottom:14}}>Includes</div>
                    <div style={{flex:1,overflowY:"auto"}}>
                      {(pk.features||[]).map((f,j)=>(
                        <div key={j} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"5px 0",fontSize:13,color:"rgba(255,255,255,0.94)",lineHeight:1.5}}>
                          <span style={{flexShrink:0}}>✓</span>{f}
                        </div>
                      ))}
                    </div>
                    <a href={waHref} target="_blank" rel="noopener noreferrer" style={{marginTop:16,textAlign:"center",background:"#fff",color:C.P,border:"none",padding:"10px 20px",fontSize:11,fontWeight:700,letterSpacing:2,textTransform:"uppercase",textDecoration:"none",borderRadius:2}}>{pk.ctaLabel}</a>
                  </div>
                </div>
                </div>
                </Reveal>
                );
              })}
            </div>
          </div>
        )}

        <div style={{...S.tag(),marginBottom:24}}><span style={{width:24,height:1,background:C.PL,display:"inline-block"}} />What's Included</div>
        {/* Same hover-flip pattern as the pricing packages above (.pflip in globals.css) applied
            to each individual service, so the two card rows read as one consistent design
            language: front face is icon/title/desc, back face (shown on hover, or focus-within
            for keyboard users) reveals sv.deliverables -- that data already existed, it just
            used to render open on the front instead of behind a flip. */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:24}}>
          {settings.services.map(sv=>(
            <div key={sv.id} className="pflip" style={{height:380}}>
            <div className="pflip-inner">
              <div className="pflip-face" style={{background:C.DARK,border:`1px solid ${C.BORDER}`,borderRadius:4,padding:32}}>
                <div style={{width:44,height:44,borderRadius:4,background:"rgba(139,92,246,0.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,marginBottom:20}}>{sv.icon}</div>
                <h3 style={{fontSize:19,fontWeight:700,letterSpacing:0.3,margin:"0 0 8px"}}>{sv.title}</h3>
                <p style={{color:C.MID,fontSize:13,lineHeight:1.7,margin:"0 0 20px"}}>{sv.desc}</p>
                {sv.deliverables.length>0&&<div style={{fontSize:10,color:C.PL,letterSpacing:1,marginTop:"auto",marginBottom:10}}>↻ Hover to see what's included</div>}
                <div style={{display:"flex",gap:10,flexWrap:"wrap",paddingTop:20,marginTop:sv.deliverables.length>0?0:"auto",borderTop:`1px solid ${C.BORDER}`}}>
                  <a href={`https://wa.me/${WA}?text=${encodeURIComponent(`Hello ${settings.siteName}! I'd like to enquire about your ${sv.title} package.`)}`} target="_blank" rel="noopener noreferrer" style={{...S.btnP,padding:"10px 18px",fontSize:11,textDecoration:"none"}}>Enquire Now</a>
                  <button onClick={()=>goTo("booking")} style={{...S.btnO,padding:"10px 18px",fontSize:11}}>Book Now</button>
                </div>
              </div>
              <div className="pflip-face pflip-back" style={{background:C.P,borderRadius:4,padding:32}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}>
                  <span style={{fontSize:20}}>{sv.icon}</span>
                  <span style={{fontSize:11,letterSpacing:3,fontWeight:700,color:"#fff",textTransform:"uppercase"}}>{sv.title}</span>
                </div>
                <div style={{fontSize:11,letterSpacing:2,color:"rgba(255,255,255,0.8)",textTransform:"uppercase",fontWeight:700,marginBottom:14}}>Includes</div>
                <div style={{flex:1,overflowY:"auto"}}>
                  {sv.deliverables.map((d,j)=>(
                    <div key={j} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"5px 0",fontSize:13,color:"rgba(255,255,255,0.94)",lineHeight:1.5}}>
                      <span style={{flexShrink:0}}>✓</span>{d}
                    </div>
                  ))}
                </div>
                <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:16}}>
                  <a href={`https://wa.me/${WA}?text=${encodeURIComponent(`Hello ${settings.siteName}! I'd like to enquire about your ${sv.title} package.`)}`} target="_blank" rel="noopener noreferrer" style={{textAlign:"center",background:"#fff",color:C.P,border:"none",padding:"10px 18px",fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",textDecoration:"none",borderRadius:2}}>Enquire Now</a>
                  <button onClick={()=>goTo("booking")} style={{background:"none",border:"1px solid rgba(255,255,255,0.5)",color:"#fff",padding:"10px 18px",fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",cursor:"pointer",borderRadius:2}}>Book Now</button>
                </div>
              </div>
            </div>
            </div>
          ))}
        </div>
      </div>
      <Footer /><FloatingWA num={WA} msg={WA_MSG} />
      <ConsultPopup open={popupOpen} onClose={closePopup} title={settings.popupTitle} text={settings.popupText} ctaLabel={settings.popupCtaLabel} waNumber={WA} />
    </div>
  );

  // ── CV ── redesigned as a two-column, animated layout (per Naveed's request): a sticky
  // left profile/skills column beside a right-hand animated timeline of CV sections, with a
  // portrait+identity hero on top. Falls back to a single stacked column on mobile via the
  // shared `isMobile` flag already used elsewhere in this file. All content still comes
  // straight from settings.aboutPhoto/aboutName/aboutTitle/cvSections/skills -- nothing here
  // is hardcoded.
  if(page==="cv") return(
    <div key={page} className="pg-fade" style={{...S.base,animation:"pgFadeIn 0.55s cubic-bezier(.16,.84,.44,1) both"}}>
      <Nav />
      <PageBanner eyebrow={settings.uiText.cvBannerEyebrow} title={settings.uiText.cvBannerTitle} description="20+ years behind the camera across photography, cinematography and creative direction -- skills, tools and experience, at a glance." image={settings.sectionBg.cv} />
      <style>{`
        @keyframes cvItemIn{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
        @keyframes cvGlow{0%,100%{box-shadow:0 0 0 0 rgba(139,92,246,0.55)}50%{box-shadow:0 0 0 6px rgba(139,92,246,0.12)}}
        .cv-item{animation:cvItemIn 0.6s cubic-bezier(.16,.84,.44,1) both}
        .cv-dot{animation:cvGlow 2.6s ease-in-out infinite}
        .cv-skill-row{transition:color 0.2s,padding-left 0.2s}
        .cv-skill-row:hover{color:${C.PL};padding-left:6px}
      `}</style>
      <div style={{maxWidth:1140,margin:"0 auto",padding:"48px 40px 100px"}}>

        {/* PROFILE HERO -- portrait beside identity/contact, stacks on mobile. */}
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"220px 1fr",gap:40,alignItems:"center",marginBottom:72}}>
          <div style={{display:"flex",justifyContent:isMobile?"center":"flex-start"}}>
            <div style={{width:180,height:180,borderRadius:"50%",padding:3,background:`linear-gradient(135deg,${C.P},${C.PD})`,flexShrink:0}}>
              {/* Gated on cmsPhotosReady (see Home()) for the same reason as the Hero/homepage
                  About photo -- never paints a stale locally-cached headshot before the real
                  current one loads. */}
              {settings.aboutPhoto&&cmsPhotosReady?(
                <img src={settings.aboutPhoto} alt={settings.aboutName} style={{width:"100%",height:"100%",borderRadius:"50%",objectFit:"cover",display:"block",border:`4px solid ${C.BG}`}} />
              ):(
                <div style={{width:"100%",height:"100%",borderRadius:"50%",background:C.DARK,border:`4px solid ${C.BG}`}} />
              )}
            </div>
          </div>
          <div style={{textAlign:isMobile?"center":"left"}}>
            <div style={S.tag(isMobile)}><span style={{width:32,height:1,background:C.PL,display:"inline-block"}} />Curriculum Vitae<span style={{width:32,height:1,background:C.PL,display:"inline-block"}} /></div>
            {/* H1 = name (full white, highest emphasis). Subheading = role tagline, bold
                accent color -- one clear step down from the H1, not just a smaller copy of
                the same muted body tone. Contact line is the quietest text on the page. */}
            <h1 style={{fontSize:"clamp(32px,5vw,54px)",fontWeight:700,letterSpacing:1,margin:"0 0 10px",color:C.FG}}><NoTranslate>{settings.aboutName}</NoTranslate></h1>
            <p style={{color:C.PL,fontSize:15,fontWeight:600,letterSpacing:1.5,marginBottom:10}}>{settings.aboutTitle}</p>
            <p style={{color:"rgba(255,255,255,0.42)",fontSize:13}}>{settings.phone} · {settings.email}</p>
            <div style={{display:"flex",justifyContent:isMobile?"center":"flex-start",gap:16,marginTop:22}}>
              <a href={`https://wa.me/${WA}`} target="_blank" style={{...S.btnP,textDecoration:"none"}}>WhatsApp</a>
              <button onClick={()=>goTo("booking")} style={S.btnO}>Book Now</button>
            </div>
          </div>
        </div>

        {/* TYPOGRAPHY RULE for everything below: eyebrow (11-12px, wide-tracked, uppercase,
            accent) marks a SECTION; h3 (19px, 700, pure white) is an ENTRY HEADING -- the
            role/skill-group name itself; the small accent meta line under it is the
            SUBHEADING (company · location · dates, or a short divider when there's none);
            CV_BODY is the one body-copy color used for every paragraph and list line --
            dimmed off-white, never pure white, so it always reads a clear step quieter than
            the headings above it. Every CV entry is also its own bordered card -- a real,
            visually separate "section" rather than a line under a thin divider. */}
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"280px 1fr",gap:isMobile?48:56,alignItems:"start"}}>

          {settings.skills.length>0&&(
            <div style={isMobile?{}:{position:"sticky",top:100}}>
              <div style={{...S.tag(),marginBottom:20,fontSize:12,letterSpacing:5}}><span style={{width:20,height:1,background:C.PL,display:"inline-block"}} />Skills &amp; Expertise</div>
              {settings.skills.map((sk,i)=>(
                <div key={i} className="cv-item" style={{marginBottom:16,padding:"20px 20px",background:"rgba(255,255,255,0.035)",border:`1px solid ${C.BORDER}`,borderRadius:10,animationDelay:`${i*0.08}s`}}>
                  <h4 style={{fontSize:12.5,fontWeight:700,letterSpacing:2,color:C.PL,textTransform:"uppercase",margin:"0 0 12px",display:"flex",alignItems:"center",gap:8}}>
                    <span style={{width:6,height:6,borderRadius:"50%",background:C.P,display:"inline-block",flexShrink:0}} />{sk.dept}
                  </h4>
                  {sk.items.map((item,j)=><div key={j} className="cv-skill-row" style={{fontSize:13.5,color:"rgba(255,255,255,0.62)",padding:"5px 0",borderBottom:j===sk.items.length-1?"none":`1px solid ${C.BORDER}`}}>→ {item}</div>)}
                </div>
              ))}
            </div>
          )}

          <div>
            <div style={{...S.tag(),marginBottom:28,fontSize:12,letterSpacing:5}}><span style={{width:20,height:1,background:C.PL,display:"inline-block"}} />Experience &amp; Background</div>
            <div style={{position:"relative",paddingLeft:isMobile?0:28,borderLeft:isMobile?"none":`1px solid ${C.BORDER}`}}>
              {settings.cvSections.map((sec,i)=>{
                // CMS entries are free text -- most job entries follow "Role — Company,
                // Location · Dates" (an em dash), which we split into a heading + a
                // subheading. Plain category entries ("Profile", "Creative Expertise")
                // have no dash and just get a short accent divider instead of a blank line.
                const dashIdx=sec.title.indexOf(" — ");
                const heading=dashIdx>-1?sec.title.slice(0,dashIdx):sec.title;
                const meta=dashIdx>-1?sec.title.slice(dashIdx+3):"";
                return (
                  <div key={i} className="cv-item" style={{position:"relative",marginBottom:24,padding:"26px 28px",background:"rgba(255,255,255,0.035)",border:`1px solid ${C.BORDER}`,borderRadius:10,animationDelay:`${i*0.1}s`}}>
                    {!isMobile&&<span className="cv-dot" style={{position:"absolute",left:-38,top:30,width:10,height:10,borderRadius:"50%",background:C.P}} />}
                    <h3 style={{fontSize:19,fontWeight:700,letterSpacing:0.2,color:C.FG,margin:"0 0 6px",lineHeight:1.35}}>{heading}</h3>
                    {meta?(
                      <div style={{fontSize:12,fontWeight:600,letterSpacing:1,color:C.PL,textTransform:"uppercase",marginBottom:16}}>{meta}</div>
                    ):(
                      <div style={{width:24,height:2,background:C.P,marginBottom:16,borderRadius:1}} />
                    )}
                    <p style={{color:"rgba(255,255,255,0.62)",fontSize:14.5,lineHeight:1.85,margin:0}}>{sec.content}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{textAlign:"center",marginTop:64,paddingTop:40,borderTop:`1px solid ${C.BORDER}`,display:"flex",justifyContent:"center",gap:16}}>
          <button onClick={()=>goTo("booking")} style={S.btnP}>Book a Session</button>
          <a href={`https://wa.me/${WA}`} target="_blank" style={{...S.btnO,textDecoration:"none"}}>WhatsApp</a>
        </div>
      </div>
      <Footer /><FloatingWA num={WA} msg={WA_MSG} />
      <ConsultPopup open={popupOpen} onClose={closePopup} title={settings.popupTitle} text={settings.popupText} ctaLabel={settings.popupCtaLabel} waNumber={WA} />
    </div>
  );

  // ── BOOKING ──
  if(page==="booking") return(
    <div key={page} className="pg-fade" style={{...S.base,animation:"pgFadeIn 0.55s cubic-bezier(.16,.84,.44,1) both"}}>
      <Nav />
      <PageBanner eyebrow={settings.uiText.bookingBannerEyebrow} title={settings.uiText.bookingBannerTitle} description="Choose your service and package, pick a date, and book securely -- online payment or bank transfer." image={settings.sectionBg.booking} />
      <div style={{maxWidth:680,margin:"0 auto",padding:"40px 24px 80px"}}>
        {bkStep>0&&bkStep<7&&(
          <div style={{display:"flex",justifyContent:"center",gap:8,marginBottom:32}}>
            {["Service","Package","Date","Details","Review","Payment"].map((lbl,i)=>(
              <div key={lbl} style={{display:"flex",alignItems:"center",gap:8}}>
                <div className={`adv-step-dot ${bkStep>i+1?"is-done":bkStep===i+1?"is-active":"is-upcoming"}`}>{bkStep>i+1?"✓":i+1}</div>
                {i<5&&<div className={`adv-step-line ${bkStep>i+1?"is-done":"is-upcoming"}`} />}
              </div>
            ))}
          </div>
        )}

        <div className="adv-form-card">

        {bkStep===0&&(
          <div>
            <h2 style={{fontSize:24,fontWeight:700,marginBottom:8,textAlign:"center"}}>How can we reach you?</h2>
            <p style={{color:C.MID,fontSize:13,textAlign:"center",marginBottom:32}}>We'll use this to send your booking confirmation and bank transfer details.</p>
            <div style={{maxWidth:420,margin:"0 auto 24px"}}>
              <div style={{marginBottom:16}}>
                <label className="adv-label">WhatsApp Number *</label>
                <div style={{display:"flex",gap:8}}>
                  <select className="adv-input" style={{width:118,flexShrink:0}} value={bkCountry} onChange={e=>{const nc=e.target.value; setBkCountry(nc); setBooking(b=>({...b,phone:nc+" "+b.phone.replace(/^\+\d{1,4}\s?/,"")}));}}>
                    <option value="+971">🇦🇪 +971</option>
                    <option value="+966">🇸🇦 +966</option>
                    <option value="+974">🇶🇦 +974</option>
                    <option value="+965">🇰🇼 +965</option>
                    <option value="+968">🇴🇲 +968</option>
                    <option value="+973">🇧🇭 +973</option>
                    <option value="+92">🇵🇰 +92</option>
                    <option value="+91">🇮🇳 +91</option>
                    <option value="+63">🇵🇭 +63</option>
                    <option value="+44">🇬🇧 +44</option>
                    <option value="+1">🇺🇸 +1</option>
                  </select>
                  <input className="adv-input" value={booking.phone.replace(/^\+\d{1,4}\s?/,"")} onChange={e=>setBooking(b=>({...b,phone:bkCountry+" "+e.target.value.replace(/[^\d\s]/g,"")}))} placeholder="5XX XXX XXX" />
                </div>
              </div>
              <div><label className="adv-label">Email *</label><input type="email" className="adv-input" value={booking.email} onChange={e=>setBooking(b=>({...b,email:e.target.value}))} /></div>
            </div>
            <div style={{display:"flex",justifyContent:"flex-end"}}><button onClick={()=>setBkStep(1)} disabled={!booking.phone.trim()||!booking.email.trim()} className="adv-btn-primary">Continue</button></div>
          </div>
        )}

        {bkStep===1&&(
          <div>
            <h2 style={{fontSize:24,fontWeight:700,marginBottom:8,textAlign:"center"}}>What do you need?</h2>
            <p style={{color:C.MID,fontSize:13,textAlign:"center",marginBottom:32}}>Select a service to see matching packages</p>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12,marginBottom:32}}>
              {BOOKING_SERVICES.map(sv=>(
                <button key={sv} onClick={()=>setBooking(b=>({...b,service:sv}))} className={`adv-tile${booking.service===sv?" is-active":""}`} style={{fontSize:13,fontWeight:600}}>{sv}</button>
              ))}
            </div>
            <div style={{display:"flex",justifyContent:"flex-end"}}><button onClick={()=>setBkStep(2)} disabled={!booking.service} className="adv-btn-primary">Continue</button></div>
          </div>
        )}

        {bkStep===2&&(
          <div>
            <h2 style={{fontSize:24,fontWeight:700,marginBottom:8,textAlign:"center"}}>Choose Your Package</h2>
            <p style={{color:C.MID,fontSize:13,textAlign:"center",marginBottom:32}}>Prices are set live from our current packages -- always accurate</p>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:16,marginBottom:32}}>
              {settings.pricingPackages.map(pkg=>(
                <button key={pkg.id} onClick={()=>setBkPkgId(pkg.id)} className={`adv-tile${bkPkgId===pkg.id?" is-active":""}`} style={{padding:24}}>
                  <div style={{fontSize:22,marginBottom:8}}>{pkg.icon}</div>
                  <div style={{fontWeight:700,fontSize:14,marginBottom:6}}>{pkg.label}</div>
                  <div style={{fontSize:24,fontWeight:700,color:C.PL,marginBottom:4}}>AED {pkg.price}</div>
                  <div style={{fontSize:11,color:C.MID,marginBottom:12}}>{pkg.priceNote}</div>
                  <div style={{fontSize:12,color:C.MID,lineHeight:1.6}}>{pkg.desc}</div>
                </button>
              ))}
            </div>
            <div style={{display:"flex",justifyContent:"space-between"}}><button onClick={()=>setBkStep(1)} className="adv-btn-outline">Back</button><button onClick={()=>setBkStep(3)} disabled={!bkPkgId} className="adv-btn-primary">Continue</button></div>
          </div>
        )}

        {bkStep===3&&(
          <div>
            <h2 style={{fontSize:24,fontWeight:700,marginBottom:8,textAlign:"center"}}>Pick a Date & Time</h2>
            <div style={{maxWidth:420,margin:"32px auto"}}>
              <div style={{marginBottom:16}}><label className="adv-label">Date *</label><input type="date" min={new Date().toISOString().slice(0,10)} className="adv-input" value={booking.date} onChange={e=>setBooking(b=>({...b,date:e.target.value}))} /></div>
              <div style={{marginBottom:16}}><label className="adv-label">Time *</label><select className="adv-input" value={booking.time} onChange={e=>setBooking(b=>({...b,time:e.target.value}))}><option value="">Select...</option>{TIMES.map(t=><option key={t}>{t}</option>)}</select></div>
              {bkCheckingSlot&&<div style={{fontSize:12,color:C.MID}}>Checking availability...</div>}
              {!bkCheckingSlot&&bkSlotTaken&&<div style={{fontSize:12,color:"#ff6b6b"}}>This time slot is no longer available. Please select another time.</div>}
            </div>
            <div style={{display:"flex",justifyContent:"space-between"}}><button onClick={()=>setBkStep(2)} className="adv-btn-outline">Back</button><button onClick={()=>setBkStep(4)} disabled={!booking.date||!booking.time||bkSlotTaken||bkCheckingSlot} className="adv-btn-primary">Continue</button></div>
          </div>
        )}

        {bkStep===4&&(
          <div>
            <h2 style={{fontSize:24,fontWeight:700,marginBottom:24,textAlign:"center"}}>Your Details</h2>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16,maxWidth:560,margin:"0 auto 16px"}}>
              <div><label className="adv-label">Full Name *</label><input className="adv-input" value={booking.name} onChange={e=>setBooking(b=>({...b,name:e.target.value}))} /></div>
              <div><label className="adv-label">Location / Venue</label><input className="adv-input" value={booking.location} onChange={e=>setBooking(b=>({...b,location:e.target.value}))} placeholder="Dubai Marina, Studio, etc." /></div>
            </div>
            <p style={{maxWidth:560,margin:"0 auto 16px",fontSize:12,color:C.MID,textAlign:"center"}}>We'll send your confirmation to <strong style={{color:C.FG}}>{booking.email}</strong> / <strong style={{color:C.FG}}>{booking.phone}</strong></p>
            <div style={{maxWidth:560,margin:"0 auto 24px"}}><label className="adv-label">Anything we should know?</label><textarea className="adv-input" style={{height:90,resize:"vertical" as const}} value={booking.details} onChange={e=>setBooking(b=>({...b,details:e.target.value}))} placeholder="Optional notes about your project..." /></div>
            <div style={{display:"flex",justifyContent:"space-between",maxWidth:560,margin:"0 auto"}}><button onClick={()=>setBkStep(3)} className="adv-btn-outline">Back</button><button onClick={()=>setBkStep(5)} disabled={!booking.name||!booking.email||!booking.phone} className="adv-btn-primary">Continue</button></div>
          </div>
        )}

        {bkStep===5&&bkSelectedPkg&&(
          <div>
            <h2 style={{fontSize:24,fontWeight:700,marginBottom:24,textAlign:"center"}}>Review Your Booking</h2>
            <div className="adv-review-card" style={{maxWidth:480,margin:"0 auto 32px"}}>
              <div className="adv-review-row"><span style={{color:C.MID}}>Service</span><span>{booking.service}</span></div>
              <div className="adv-review-row"><span style={{color:C.MID}}>Package</span><span>{bkSelectedPkg.label}</span></div>
              <div className="adv-review-row"><span style={{color:C.MID}}>Date & Time</span><span>{booking.date} · {booking.time}</span></div>
              <div className="adv-review-row" style={{marginBottom:20}}><span style={{color:C.MID}}>Contact</span><span>{booking.name}</span></div>
              <div className="adv-review-divider">
                <div className="adv-review-row"><span style={{color:C.MID}}>Package price</span><span>AED {bkBase.toLocaleString()}</span></div>
                <div className="adv-review-row"><span style={{color:C.MID}}>Transaction fee (4%)</span><span>AED {bkFee.toLocaleString()}</span></div>
                <div className="adv-review-row" style={{fontSize:16,fontWeight:700,marginTop:8}}><span>Total</span><span style={{color:C.PL}}>AED {bkTotal.toLocaleString()}</span></div>
              </div>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",maxWidth:480,margin:"0 auto"}}><button onClick={()=>setBkStep(4)} className="adv-btn-outline">Back</button><button onClick={()=>setBkStep(6)} className="adv-btn-primary">Continue to Payment</button></div>
          </div>
        )}

        {bkStep===6&&bkSelectedPkg&&(
          <div>
            <h2 style={{fontSize:24,fontWeight:700,marginBottom:24,textAlign:"center"}}>Choose Payment Method</h2>
            {bkError&&<div style={{maxWidth:480,margin:"0 auto 16px",fontSize:12,color:"#ff6b6b",textAlign:"center"}}>{bkError}</div>}
            <div style={{maxWidth:480,margin:"0 auto 24px",display:"grid",gap:12}}>
              <button onClick={()=>setBkPayMethod("bank_transfer")} className={`adv-tile${bkPayMethod==="bank_transfer"?" is-active":""}`}>
                <div style={{fontWeight:700,fontSize:13,marginBottom:4}}>🏦 Bank Transfer</div>
                <div style={{fontSize:12,color:C.MID}}>Pay by bank transfer, then upload your receipt. Confirmed once verified.</div>
              </button>
              {/* "Pay Online" -- reuses the existing "paypal" method value already wired into
                  createAppointment/payments (no schema change). Only enabled once Naveed has
                  pasted a real hosted payment link (CMS > Settings > Online Payment Link);
                  until then it stays disabled exactly as the old "PayPal -- Available soon"
                  placeholder did, so nothing changes for anyone until it's configured. */}
              {settings.paymentLinkUrl?.trim() ? (
                <button onClick={()=>setBkPayMethod("paypal")} className={`adv-tile${bkPayMethod==="paypal"?" is-active":""}`}>
                  <div style={{fontWeight:700,fontSize:13,marginBottom:4}}>💳 Pay Online</div>
                  <div style={{fontSize:12,color:C.MID}}>Pay securely online by card. Confirmed as soon as we see your payment.</div>
                </button>
              ) : (
                <button disabled title="Available soon" className="adv-tile is-disabled">
                  <div style={{fontWeight:700,fontSize:13,marginBottom:4}}>💳 Pay Online — Available soon</div>
                  <div style={{fontSize:12}}>Instant online payment is being finalized.</div>
                </button>
              )}
            </div>
            {bkPayMethod==="bank_transfer"&&(
              <div className="adv-note-box" style={{maxWidth:480,margin:"0 auto 24px"}}>
                {settings.bankTransferInstructions?.trim()
                  ? settings.bankTransferInstructions
                  : "Bank transfer details will be sent to your email and WhatsApp right after you submit. Once you've paid, come back and upload your receipt to confirm your booking."}
              </div>
            )}
            {bkPayMethod==="paypal"&&(
              <div className="adv-note-box" style={{maxWidth:480,margin:"0 auto 24px"}}>
                After you confirm below, a secure payment page will open in a new tab for <strong style={{color:C.FG}}>AED {bkTotal.toLocaleString()}</strong>. Please complete the payment there and include your booking reference (shown next) so we can match it to your booking.
              </div>
            )}

            {/* Honeypot -- invisible to real visitors, but a form-filling bot will find and
                fill it like any other field. A filled value silently drops the submission. */}
            <div aria-hidden="true" style={{position:"absolute",left:"-9999px",top:"-9999px",opacity:0,height:0,overflow:"hidden"}}>
              <label htmlFor="bk-website">Website</label>
              <input id="bk-website" name="website" type="text" tabIndex={-1} autoComplete="off" value={bkHp} onChange={e=>setBkHp(e.target.value)} />
            </div>
            <div style={{maxWidth:480,margin:"0 auto 24px"}}>
              <label className="adv-label">Quick human check *</label>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <span style={{color:"#fff",fontSize:14,whiteSpace:"nowrap"}}>{bkCaptchaA} + {bkCaptchaB} =</span>
                <input className="adv-input" inputMode="numeric" style={{maxWidth:90}} value={bkCaptchaAnswer} onChange={e=>setBkCaptchaAnswer(e.target.value.replace(/[^\d]/g,""))} placeholder="?" />
              </div>
            </div>

            <div style={{display:"flex",justifyContent:"space-between",maxWidth:480,margin:"0 auto"}}>
              <button onClick={()=>setBkStep(5)} className="adv-btn-outline">Back</button>
              <button onClick={submitAppointment} disabled={bkSubmitting||!bkCaptchaAnswer.trim()} className="adv-btn-primary">{bkSubmitting?"Submitting...":"Confirm Booking"}</button>
            </div>
          </div>
        )}

        {bkStep===7&&bkConfirmed&&(
          <div style={{textAlign:"center",padding:"32px 0"}}>
            <div style={{fontSize:48,color:C.PL,marginBottom:16}}>✓</div>
            <h2 style={{fontWeight:700,letterSpacing:0.5,marginBottom:8}}>Booking Received</h2>
            <p style={{color:C.MID,fontSize:13,marginBottom:4}}>Reference: <strong style={{color:C.FG}}>{bkConfirmed.ref}</strong></p>
            {bkPayMethod==="bank_transfer"?(
              bkReceiptDone?(
                <div style={{marginTop:24}}>
                  <p style={{color:C.MID,fontSize:13}}>Your payment receipt has been submitted and is awaiting verification. You'll get a confirmation message on WhatsApp and email as soon as it's verified.</p>
                  <button onClick={resetAppointmentFlow} className="adv-btn-outline" style={{marginTop:24}}>Book Another Session</button>
                </div>
              ):(
                <div style={{maxWidth:420,margin:"24px auto 0"}}>
                  <p style={{color:C.MID,fontSize:13,marginBottom:16}}>Once you've made the bank transfer, upload your receipt below to confirm your booking.</p>
                  <input type="file" accept="image/jpeg,image/png,application/pdf" onChange={e=>setBkReceiptFile(e.target.files?.[0]||null)} style={{marginBottom:12,fontSize:12,color:C.MID}} />
                  {bkReceiptErr&&<div style={{fontSize:12,color:"#ff6b6b",marginBottom:12}}>{bkReceiptErr}</div>}
                  <div><button onClick={submitReceipt} disabled={!bkReceiptFile||bkReceiptUploading} className="adv-btn-primary">{bkReceiptUploading?"Uploading...":"Upload Receipt"}</button></div>
                </div>
              )
            ):(
              // Real "Pay Online" confirmation -- an explicit button (not an auto-opened tab,
              // which popup blockers tend to kill right after an async submit) linking out to
              // the CMS-configured payment link, with the exact amount and reference so the
              // client knows what to pay and Naveed can match it. Same manual-confirm model as
              // bank transfer -- he marks it paid from the CMS Bookings tab once he sees it.
              <div style={{maxWidth:420,margin:"24px auto 0"}}>
                <p style={{color:C.MID,fontSize:13,marginBottom:16}}>Pay <strong style={{color:C.FG}}>AED {bkTotal.toLocaleString()}</strong> using the secure payment link below. Please include your reference <strong style={{color:C.FG}}>{bkConfirmed.ref}</strong> if there's a note field -- we'll confirm your booking as soon as we see the payment.</p>
                <a href={settings.paymentLinkUrl} target="_blank" rel="noopener noreferrer" className="adv-btn-primary" style={{textDecoration:"none",display:"inline-block"}}>Pay Now</a>
                <p style={{color:C.MID,fontSize:12,marginTop:20}}>Already paid? We'll be in touch on WhatsApp/email to confirm.</p>
                <button onClick={resetAppointmentFlow} className="adv-btn-outline" style={{marginTop:16}}>Book Another Session</button>
              </div>
            )}
          </div>
        )}

        </div>

        <div style={{textAlign:"center",marginTop:32}}>
          <p style={{fontSize:12,color:C.MID,marginBottom:12}}>Prefer to just chat first?</p>
          <a href={`https://wa.me/${WA}?text=${encodeURIComponent(WA_MSG)}`} target="_blank" className="adv-btn-outline" style={{textDecoration:"none",fontSize:11,padding:"10px 24px",display:"inline-block"}}>Message on WhatsApp</a>
        </div>
      </div>
      <Footer /><FloatingWA num={WA} msg={WA_MSG} />
      <ConsultPopup open={popupOpen} onClose={closePopup} title={settings.popupTitle} text={settings.popupText} ctaLabel={settings.popupCtaLabel} waNumber={WA} />
    </div>
  );

  // ── ABOUT ──
  if(page==="about") return(
    <div key={page} className="pg-fade" style={{...S.base,animation:"pgFadeIn 0.55s cubic-bezier(.16,.84,.44,1) both"}}>
      <Nav />
      <PageBanner eyebrow={settings.uiText.aboutBannerEyebrow} title={settings.uiText.aboutBannerTitle} image={settings.sectionBg.about} />
      <div style={{maxWidth:1000,margin:"0 auto",padding:"40px 40px 80px"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:64,alignItems:"start"}}>
          <div>
            <div style={{...S.tag(),marginBottom:20}}><span style={{width:24,height:1,background:C.PL,display:"inline-block"}} />About</div>
            <h1 style={{fontSize:"clamp(32px,4.5vw,56px)",fontWeight:700,letterSpacing:1,margin:"0 0 16px"}}><NoTranslate>{settings.aboutName}</NoTranslate></h1>
            <p style={{color:C.MID,fontSize:13,letterSpacing:2,marginBottom:24}}>{settings.aboutTitle}</p>
            <p style={{color:C.MID,fontSize:14,lineHeight:1.9,marginBottom:32}}>{settings.aboutBio}</p>
            <p style={{color:C.MID,fontSize:14,lineHeight:1.8,marginBottom:32}}>📱 {settings.phone}<br/>📧 {settings.email}<br/>📍 {settings.location}</p>
            <div style={{display:"flex",gap:12,marginBottom:24}}>
              <button onClick={()=>goTo("booking")} style={S.btnP}>Book Now</button>
              <button onClick={()=>goTo("cv")} style={S.btnO}>View CV</button>
            </div>
            <div style={{display:"flex",gap:16}}>
              {settings.instagram&&<a href={settings.instagram} target="_blank" rel="noopener noreferrer" style={{fontSize:11,letterSpacing:2,color:C.MID,textTransform:"uppercase",textDecoration:"none",transition:"color 0.2s"}} onMouseEnter={e=>(e.currentTarget.style.color=C.PL)} onMouseLeave={e=>(e.currentTarget.style.color=C.MID)}>Instagram</a>}
              {settings.youtube&&<a href={settings.youtube} target="_blank" rel="noopener noreferrer" style={{fontSize:11,letterSpacing:2,color:C.MID,textTransform:"uppercase",textDecoration:"none",transition:"color 0.2s"}} onMouseEnter={e=>(e.currentTarget.style.color=C.PL)} onMouseLeave={e=>(e.currentTarget.style.color=C.MID)}>YouTube</a>}
              {settings.linkedin&&<a href={settings.linkedin} target="_blank" rel="noopener noreferrer" style={{fontSize:11,letterSpacing:2,color:C.MID,textTransform:"uppercase",textDecoration:"none",transition:"color 0.2s"}} onMouseEnter={e=>(e.currentTarget.style.color=C.PL)} onMouseLeave={e=>(e.currentTarget.style.color=C.MID)}>LinkedIn</a>}
            </div>
          </div>
          <div>
            <div style={{aspectRatio:"3/4",background:C.DARK,overflow:"hidden",borderRadius:4,border:`1px solid ${C.BORDER}`,boxShadow:"0 8px 28px rgba(0,0,0,0.35)"}}>
              {/* Gated on cmsPhotosReady -- same reason as the CV/Hero/homepage About photo. */}
              {settings.aboutPhoto&&cmsPhotosReady&&<img src={settings.aboutPhoto} alt={settings.aboutName} style={{width:"100%",height:"100%",objectFit:"cover"}} />}
            </div>
            <div style={{marginTop:32,display:"grid",gridTemplateColumns:"1fr 1fr",gap:24}}>
              {[[settings.statsYears,"Years"],[settings.statsProjects,"Projects"],[settings.statsClients,"Clients"],["UAE","Base"]].map(([n,l])=>(
                <div key={l} style={{textAlign:"center"}}>
                  <div style={{fontSize:40,color:C.PL,fontWeight:700}}>{n}</div>
                  <div style={{fontSize:9,letterSpacing:3,color:C.MID,textTransform:"uppercase",marginTop:4}}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <Footer /><FloatingWA num={WA} msg={WA_MSG} />
      <ConsultPopup open={popupOpen} onClose={closePopup} title={settings.popupTitle} text={settings.popupText} ctaLabel={settings.popupCtaLabel} waNumber={WA} />
    </div>
  );

  // ── CONTACT ──
  if(page==="contact") return(
    <div key={page} className="pg-fade" style={{...S.base,animation:"pgFadeIn 0.55s cubic-bezier(.16,.84,.44,1) both"}}>
      <Nav />
      <PageBanner eyebrow={settings.uiText.contactBannerEyebrow} title={settings.uiText.contactBannerTitle} image={settings.sectionBg.contact} />
      <div style={{maxWidth:700,margin:"0 auto",padding:"40px 40px 80px",textAlign:"center"}}>
        <div style={{...S.tag(true),marginBottom:16}}><span style={{width:32,height:1,background:C.PL,display:"inline-block"}} />Get In Touch</div>
        <h1 style={{fontSize:"clamp(32px,4.5vw,56px)",fontWeight:700,letterSpacing:1,margin:"0 0 48px"}}>Let's Work Together</h1>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:24,marginBottom:48}}>
          {[{label:"WhatsApp",value:settings.phone,href:`https://wa.me/${WA}`},{label:"Email",value:settings.email,href:`mailto:${settings.email}`},{label:"Location",value:settings.location,href:null}].map((c,i)=>(
            <div key={i} className="tcard" style={{padding:24,borderRadius:4,border:`1px solid ${C.BORDER}`,background:C.DARK}}>
              <div style={{fontSize:10,letterSpacing:3,color:C.MID,textTransform:"uppercase",marginBottom:12}}>{c.label}</div>
              {c.href?<a href={c.href} target="_blank" style={{color:C.PL,fontSize:13,textDecoration:"none"}}>{c.value}</a>:<div style={{color:C.PL,fontSize:13}}>{c.value}</div>}
            </div>
          ))}
        </div>
        {/* Message form -- saved to the CMS (Leads tab) and, once EmailJS is configured,
            emailed to Naveed too. WhatsApp/phone above stay the instant-response option.
            The reason chips below reuse this exact same form/pipeline (no separate form,
            no new lead type) for collaboration and media/press partnership requests --
            picking one just sets the Subject field, so it's the same trusted, already-working
            delivery path (WhatsApp handoff + saved lead + email) for every kind of enquiry. */}
        <div style={{textAlign:"left",background:C.DARK,border:`1px solid ${C.BORDER}`,borderRadius:6,padding:"36px 32px",marginBottom:48}}>
          <div style={{...S.tag(),marginBottom:8}}><span style={{width:24,height:1,background:C.PL,display:"inline-block"}} />Send a Message</div>
          {!contactSent&&<div style={{fontSize:12,color:C.MID,marginBottom:20,lineHeight:1.6}}>Project enquiries, collaboration proposals and media/press partnership requests -- this form reaches Naveed directly, whichever one it is.</div>}
          {contactSent?(
            <div style={{textAlign:"center",padding:"24px 0"}}>
              <div style={{width:44,height:44,borderRadius:"50%",background:C.P,color:"#fff",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>✓</div>
              <div style={{fontSize:14,color:"#fff"}}>{T.formThanks}</div>
            </div>
          ):(
            <>
              <div style={{marginBottom:14}}>
                <div style={{fontSize:10,letterSpacing:2,color:C.MID,textTransform:"uppercase",marginBottom:8}}>{T.reachingOut}</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {[T.chipGeneral,T.chipCollab,T.chipMedia,T.chipPress].map(r=>(
                    <span key={r} onClick={()=>setContactForm(f=>({...f,subject:r}))} style={{fontSize:11,padding:"7px 14px",borderRadius:20,cursor:"pointer",border:`1px solid ${contactForm.subject===r?C.P:C.BORDER}`,background:contactForm.subject===r?C.P:"transparent",color:contactForm.subject===r?"#fff":C.MID,transition:"all 0.2s"}}>{r}</span>
                  ))}
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
                <input style={S.inp} value={contactForm.name} onChange={e=>setContactForm(f=>({...f,name:e.target.value}))} placeholder={T.formName} />
                <input style={S.inp} type="email" value={contactForm.email} onChange={e=>setContactForm(f=>({...f,email:e.target.value}))} placeholder={T.formEmail} />
                <input style={S.inp} type="tel" value={contactForm.phone} onChange={e=>setContactForm(f=>({...f,phone:e.target.value}))} placeholder={T.formPhone} />
                <input style={S.inp} value={contactForm.subject} onChange={e=>setContactForm(f=>({...f,subject:e.target.value}))} placeholder={T.formSubject} />
              </div>
              <textarea style={{...S.inp,height:110,resize:"vertical" as const,marginBottom:16}} value={contactForm.message} onChange={e=>setContactForm(f=>({...f,message:e.target.value}))} placeholder={T.formMessage} />
              <button onClick={submitContact} disabled={contactSending||!contactForm.name.trim()||!contactForm.email.trim()||!contactForm.message.trim()} style={{...S.btnP,opacity:contactSending?0.6:1}}>{contactSending?T.formSending:T.formSend}</button>
            </>
          )}
        </div>
        {/* Google Reviews Embed */}
        {settings.googlePlaceId&&(
          <div style={{marginTop:48,textAlign:"left"}}>
            <div style={{...S.tag(),marginBottom:24}}><span style={{width:24,height:1,background:C.PL,display:"inline-block"}} />Google Reviews</div>
            <iframe title="Google Reviews" src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyD-placeholder&q=place_id:${settings.googlePlaceId}`} width="100%" height="300" style={{border:0,borderRadius:4}} allowFullScreen loading="lazy" />
            <div style={{fontSize:11,color:"#444",marginTop:8,textTransform:"uppercase",letterSpacing:2}}>Add your Google Maps API key in the CMS → SEO settings to enable reviews</div>
          </div>
        )}
        <div style={{display:"flex",justifyContent:"center",gap:16,marginTop:32}}>
          <a href={`https://wa.me/${WA}?text=${encodeURIComponent(WA_MSG)}`} target="_blank" style={{...S.btnP,textDecoration:"none"}}>WhatsApp Now</a>
          <button onClick={()=>goTo("booking")} style={S.btnO}>Book a Session</button>
        </div>
      </div>
      <Footer /><FloatingWA num={WA} msg={WA_MSG} />
      <ConsultPopup open={popupOpen} onClose={closePopup} title={settings.popupTitle} text={settings.popupText} ctaLabel={settings.popupCtaLabel} waNumber={WA} />
    </div>
  );

  // ── WORK ──
  if(page==="work") return(
    <div key={page} className="pg-fade" style={{...S.base,animation:"pgFadeIn 0.55s cubic-bezier(.16,.84,.44,1) both"}}>
      <Nav />
      <PageBanner eyebrow={settings.uiText.workBannerEyebrow} title={settings.uiText.workBannerTitle} description="A curated selection of photography and cinematography work across the UAE -- brand campaigns, weddings, real estate and editorial, all in one place." image={settings.sectionBg.work} />
      <div style={{maxWidth:1400,margin:"0 auto",padding:"40px 32px 80px"}}>
        {/* Pill chips (same style as the Contact page's subject tags) instead of plain
            underlined text -- with more categories now in play (6 sample projects across 8
            categories) the old bare-text list wrapped into a dense, hard-to-scan run-on line.
            Chips give each one its own visible boundary and comfortable tap target. */}
        <div style={{marginBottom:48}}>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            <span onClick={()=>setFilterCat("All")} style={{fontSize:11,letterSpacing:1,padding:"8px 16px",borderRadius:20,cursor:"pointer",border:`1px solid ${filterCat==="All"?C.PL:C.BORDER}`,background:filterCat==="All"?C.PL:"transparent",color:filterCat==="All"?C.BG:C.MID,transition:"all 0.2s"}}>All ({projects.length})</span>
            {cats.map(c=>{ const cnt=projects.filter(p=>p.categories?.includes(c)).length; if(!cnt) return null; return <span key={c} onClick={()=>setFilterCat(c)} style={{fontSize:11,letterSpacing:1,padding:"8px 16px",borderRadius:20,cursor:"pointer",border:`1px solid ${filterCat===c?C.PL:C.BORDER}`,background:filterCat===c?C.PL:"transparent",color:filterCat===c?C.BG:C.MID,transition:"all 0.2s"}}>{c} ({cnt})</span>; })}
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(360px,1fr))",gap:3}}>
          {filtered.map(p=>(
            <a key={p.id} href={`/work/${p.slug}`} style={{display:"block",position:"relative",cursor:"pointer",overflow:"hidden",aspectRatio:"4/3",background:C.DARK,textDecoration:"none"}}
              onMouseEnter={e=>{ (e.currentTarget.querySelector("img") as HTMLElement).style.transform="scale(1.06)"; (e.currentTarget.querySelector("img") as HTMLElement).style.filter="grayscale(0)"; (e.currentTarget.querySelector(".ov") as HTMLElement).style.opacity="1"; }}
              onMouseLeave={e=>{ (e.currentTarget.querySelector("img") as HTMLElement).style.transform="scale(1)"; (e.currentTarget.querySelector("img") as HTMLElement).style.filter="grayscale(1)"; (e.currentTarget.querySelector(".ov") as HTMLElement).style.opacity="0"; }}>
              {/* B&W-by-default, full color on hover -- same reveal treatment requested from kima.framer.media */}
              <img src={p.coverImage||p.images?.[0]?.url||""} alt={p.title} loading="lazy" className={PROTECTED_IMG_CLASS} {...protectedImgProps} style={{width:"100%",height:"100%",objectFit:"cover",display:"block",filter:"grayscale(1)",transition:"transform 0.6s, filter 0.6s"}} />
              <PhotoCountBadge count={p.images?.length||0} />
              <div className="ov" style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(9,6,14,0.92) 0%,transparent 55%)",opacity:0,transition:"opacity 0.3s",display:"flex",flexDirection:"column",justifyContent:"flex-end",padding:24}}>
                <div style={{fontSize:10,letterSpacing:3,color:C.PL,textTransform:"uppercase",marginBottom:6}}>{p.categories?.join(" · ")}</div>
                <div style={{fontSize:18,letterSpacing:2,color:"#fff"}}>{p.title}</div>
                {p.location&&<div style={{fontSize:11,color:C.MID,marginTop:4}}>📍 {p.location}</div>}
              </div>
              {p.featured&&<div style={{position:"absolute",top:14,right:14,background:C.P,color:"#fff",fontSize:9,letterSpacing:2,padding:"3px 8px",textTransform:"uppercase"}}>Featured</div>}
            </a>
          ))}
        </div>
      </div>
      <Footer /><FloatingWA num={WA} msg={WA_MSG} />
      <ConsultPopup open={popupOpen} onClose={closePopup} title={settings.popupTitle} text={settings.popupText} ctaLabel={settings.popupCtaLabel} waNumber={WA} />
    </div>
  );

  // ── HOME ──
  return(
    <div key={page} className="pg-fade" style={{...S.base,animation:"pgFadeIn 0.55s cubic-bezier(.16,.84,.44,1) both"}}>
      {showSplash && <IntroSplash siteName={settings.siteName} tagline={settings.siteTagline} onDone={()=>setShowSplash(false)} />}
      <Nav />
      {settings.homeSections?.hero!==false && (
      <Hero slides={settings.heroSlides} onNav={goTo} waNumber={WA} typography={settings.heroTypography} ready={cmsPhotosReady} />
      )}

      {/* INTRO STRIP */}
      {settings.homeSections?.intro!==false && (
      <div style={{background:C.DARK,padding:"24px 40px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:16}}>
        <div style={{fontSize:16,fontWeight:600,letterSpacing:0.3,color:C.FG,maxWidth:440}}>Photography That Makes Your Business Stand Out.</div>
        <div style={{display:"flex",gap:28}}>
          {[[settings.statsYears,"Years"],[settings.statsProjects,"Projects"],[settings.statsClients,"Clients"]].map(([n,l])=>(
            <div key={l} style={{textAlign:"left",borderLeft:`2px solid ${C.GOLD}`,paddingLeft:14}}>
              <div style={{fontSize:20,color:C.FG,fontWeight:700}}>{n}</div>
              <div style={{fontSize:9,letterSpacing:3,color:C.MID,textTransform:"uppercase"}}>{l}</div>
            </div>
          ))}
        </div>
        <button onClick={()=>goTo("booking")} style={S.btnP} onMouseEnter={e=>(e.currentTarget.style.background=C.PD)} onMouseLeave={e=>(e.currentTarget.style.background=C.P)}>{settings.uiText.navBookBtn}</button>
      </div>
      )}

      {/* ABOUT NAVEED -- moved to sit right under the Hero/intro-strip, ahead of Featured Work
          and Services. Built from the real content that already lives on the /about page
          (settings.aboutBio + the 20+/500+/200+ stats shown there) instead of the agency's own
          bio -- nothing invented, just reused and re-cut to fit this shorter format. The CTA
          links to the existing /about page via goTo() -- doesn't add to or change that page
          itself. Photo reuses settings.aboutPhoto (CMS > Settings > About). */}
      {settings.homeSections?.about!==false && settings.pageEnabled.about!==false && (
      <div style={{background:C.BG,padding:"110px 40px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:"-14%",left:"-8%",width:480,height:480,borderRadius:"50%",background:"radial-gradient(circle,rgba(139,92,246,0.18),transparent 70%)",filter:"blur(20px)",pointerEvents:"none"}} />
        <Reveal style={{maxWidth:1160,margin:"0 auto",position:"relative",display:"flex",gap:64,alignItems:"flex-start",flexWrap:"wrap"}}>
          {/* alignSelf:"stretch" (was a fixed height:440) so the photo's top stays exactly where
              it already was but its bottom now runs all the way down to match the content
              column -- level with the "Learn More About Naveed" button -- whatever that
              column's height ends up being. minHeight is just a floor. */}
          <div style={{flex:"0 0 420px",minWidth:280,minHeight:440,alignSelf:"stretch",position:"relative"}}>
            <div style={{position:"absolute",inset:0,borderRadius:12,overflow:"hidden",boxShadow:"0 30px 70px rgba(0,0,0,0.45), 0 0 0 1px rgba(139,92,246,0.16)"}}>
              {/* Gated on cmsPhotosReady (see Home()) so a fresh page load/refresh -- including
                  right after saving a new photo in the admin panel on this same device --
                  never paints the previous photo for a moment before the current one replaces
                  it; the container's own dark background shows through until it's ready. */}
              {cmsPhotosReady && <img src={settings.aboutPhoto} alt={settings.aboutName} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}} />}
            </div>
            <div style={{position:"absolute",bottom:-22,right:-22,background:C.P,color:C.BG,borderRadius:10,padding:"18px 22px",boxShadow:"0 20px 40px rgba(139,92,246,0.35)",lineHeight:1.15}}>
              <div style={{fontSize:30,fontWeight:800}}>{settings.statsYears}</div>
              <div style={{fontSize:11,letterSpacing:0.5,marginTop:2}}>Years<br/>Experience</div>
            </div>
          </div>
          <div style={{flex:"1 1 420px",minWidth:280}}>
            <div style={{...S.tag(),color:C.PL}}><span style={{width:24,height:1,background:C.PL,display:"inline-block"}} />About</div>
            <h2 style={{fontSize:"clamp(30px,4vw,48px)",fontWeight:700,letterSpacing:0.5,margin:"0 0 10px",color:C.FG}}>{settings.aboutName}</h2>
            <div style={{fontSize:"clamp(14px,1.4vw,17px)",color:C.PL,letterSpacing:0.5,marginBottom:20}}>Photographer · Cinematographer · Visual Artist</div>
            <p style={{fontSize:14,color:C.MID,lineHeight:1.8,margin:"0 0 28px",maxWidth:500}}>A Dubai-based photographer and cinematographer with over 20 years of experience -- including 10 years based in the UAE -- crafting luxury visual content for high-end clients. Founder of Creative Fusion.</p>
            <div style={{display:"flex",flexDirection:"column",gap:16,marginBottom:28}}>
              {["20+ years of experience, 10 of them based in the UAE","Specializing in interior, real estate, product, lifestyle & campaign photography","Short-form video content for Instagram & TikTok with brand-consistent storytelling"].map((t,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:14}}>
                  <span style={{width:30,height:30,borderRadius:6,background:"rgba(139,92,246,0.14)",color:C.PL,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>✓</span>
                  <span style={{fontSize:14,color:C.FG}}>{t}</span>
                </div>
              ))}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:14,background:"rgba(255,255,255,0.04)",border:`1px solid ${C.BORDER}`,borderRadius:10,padding:"14px 18px",marginBottom:28,maxWidth:420}}>
              <span style={{width:34,height:34,borderRadius:"50%",background:"rgba(139,92,246,0.16)",color:C.PL,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>✓</span>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:C.FG}}>{settings.statsProjects} Projects Delivered</div>
                <div style={{fontSize:12,color:C.MID}}>{settings.statsClients} Clients across Dubai, UAE</div>
              </div>
            </div>
            <button onClick={()=>goTo("about")} style={S.btnP}>Learn More About Naveed</button>
          </div>
        </Reveal>
      </div>
      )}

      {/* FULL-WIDTH VIDEO -- off by default; turned on + given a YouTube link in
          CMS > Settings > Pages. See FullVideoSection above. */}
      {settings.videoSectionEnabled && settings.videoSectionUrl && (
        <FullVideoSection url={settings.videoSectionUrl} title={settings.videoSectionTitle} subtitle={settings.videoSectionSubtitle} />
      )}

      {/* SERVICES -- editorial index list, but each row is bookended by a solid-DARK chip
          (number + arrow). The chips are the same DARK used in the hero/nav, so the light
          section reads as this site's light register, not a different site pasted in --
          exactly how creativefusion.llc threads its dark charcoal through its white sections
          via repeated dark card elements. */}
      {settings.homeSections?.services!==false && (
      <div style={{background:C.LT,padding:"130px 40px 140px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:"-12%",right:"-8%",width:560,height:560,borderRadius:"50%",background:"radial-gradient(circle,rgba(139,92,246,0.20),transparent 70%)",filter:"blur(20px)",pointerEvents:"none"}} />
        <div style={{position:"absolute",bottom:"-10%",left:"-6%",width:360,height:360,borderRadius:"50%",background:"radial-gradient(circle,rgba(139,92,246,0.10),transparent 70%)",filter:"blur(24px)",pointerEvents:"none"}} />
        <div style={{maxWidth:1160,margin:"0 auto",position:"relative"}}>
          {/* Header hoisted above both columns (used to float beside the row list, sharing its
              column with it) -- reads clearly above the photo now, and the photo column
              shrinks to just match the row-list height since it no longer has to also clear
              the header's own height. */}
          <Reveal style={{marginBottom:56}}>
            <div style={{...S.tag(),marginBottom:14,color:C.P}}><span style={{width:24,height:1,background:C.P,display:"inline-block"}} />{settings.uiText.homeServicesEyebrow}</div>
            <h2 style={{fontSize:"clamp(30px,4vw,52px)",fontWeight:700,letterSpacing:0.5,margin:"0 0 14px",color:C.DARK}}>{settings.uiText.homeServicesTitle}</h2>
            <p style={{maxWidth:480,fontSize:13,color:C.INKMID,lineHeight:1.8,margin:0}}>{settings.uiText.homeServicesIntro}</p>
          </Reveal>
          <div style={{display:"flex",gap:48,alignItems:"flex-start",flexWrap:"wrap"}}>
            {/* DUMMY placeholder image for now -- replace via CMS > Settings > Services (upload
                or paste a URL, see settingsTab==="services" below). Independent from aboutPhoto.
                alignSelf:"stretch" so this column always matches the full height of the services
                list next to it -- top edge lines up with row 1, bottom edge lines up with the
                last row's bottom border, whatever the row count/height ends up being. minHeight
                is just a floor for very short content (e.g. only 1-2 services). Shorter now that
                the header lives above both columns instead of sharing this row's height.
                Refresh pass: stronger drop shadow + a soft brand-purple glow ring so the photo
                lifts off the page instead of sitting flush against it. */}
            <div style={{flex:"0 0 390px",minWidth:280,minHeight:280,alignSelf:"stretch",position:"relative",borderRadius:10,overflow:"hidden",boxShadow:"0 30px 70px rgba(20,13,33,0.18), 0 0 0 1px rgba(139,92,246,0.14), 0 0 60px rgba(139,92,246,0.12)"}}>
              {/* Gated on cmsPhotosReady -- same reason as the Hero/About photo. */}
              {cmsPhotosReady&&<img src={settings.servicesImage} alt={settings.uiText.homeServicesTitle} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}} />}
            </div>
            <div style={{flex:"1 1 480px",minWidth:280}}>
              <div>
                {settings.services.map((sv,i)=>(
                  <Reveal key={sv.id} delay={i*0.07}>
                  <div className="svc-row" onClick={()=>goTo("packages")} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:28,padding:"34px 6px",borderTop:i===0?`1px solid ${C.LTBORDER}`:"none",borderBottom:`1px solid ${C.LTBORDER}`,cursor:"pointer"}}>
                    <div style={{display:"flex",alignItems:"center",gap:26,minWidth:0}}>
                      <span className="svc-num" style={{width:44,height:44,borderRadius:6,background:C.DARK,color:C.P,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,letterSpacing:0.5,flexShrink:0,boxShadow:"0 6px 16px rgba(20,13,33,0.20)"}}>{String(i+1).padStart(2,"0")}</span>
                      <div style={{minWidth:0}}>
                        <div style={{fontSize:"clamp(19px,2.4vw,28px)",fontWeight:700,letterSpacing:0.3,color:C.DARK,marginBottom:6}}>{sv.title}</div>
                        <div className="svc-desc" style={{fontSize:13,color:C.INKMID,lineHeight:1.7,maxWidth:480}}>{sv.desc}</div>
                      </div>
                    </div>
                    <span className="svc-arrow" style={{width:42,height:42,borderRadius:4,border:`1px solid ${C.LTBORDER}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,color:C.DARK,flexShrink:0}}>→</span>
                  </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* FEATURED WORK -- also gated on pageEnabled.work (CMS > Settings > Pages) so switching
          the whole Work page off hides this teaser too, in the same single action, instead of
          needing a second separate toggle in Homepage Sections. */}
      {settings.homeSections?.work!==false && settings.pageEnabled.work!==false && featured.length>0&&(
        <div style={{maxWidth:1400,margin:"0 auto",padding:"64px 32px"}}>
          <Reveal style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:36}}>
            <div>
              <div style={{...S.tag(),marginBottom:8}}><span style={{width:24,height:1,background:C.PL,display:"inline-block"}} />{settings.uiText.homeWorkEyebrow}</div>
              <h2 style={{fontSize:"clamp(28px,4vw,56px)",fontWeight:700,letterSpacing:1,margin:0}}>{settings.uiText.homeWorkTitle}</h2>
            </div>
            <span onClick={()=>goTo("work")} style={{fontSize:10,letterSpacing:3,color:C.PL,textTransform:"uppercase",cursor:"pointer",borderBottom:`1px solid ${C.PL}`,paddingBottom:2}}>{settings.uiText.homeWorkViewAll}</span>
          </Reveal>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:3}}>
            {featured.slice(0,1).map(p=>(
              <Reveal key={p.id} style={{gridColumn:isMobile?"1/2":"1/3"}}>
              <Link href={`/work/${p.slug}`} style={{display:"block",position:"relative",cursor:"pointer",overflow:"hidden",aspectRatio:"16/9",background:C.DARK,textDecoration:"none"}}
                onMouseEnter={e=>{ (e.currentTarget.querySelector("img") as HTMLElement).style.transform="scale(1.06)"; (e.currentTarget.querySelector("img") as HTMLElement).style.filter="grayscale(0)"; (e.currentTarget.querySelector(".ov") as HTMLElement).style.opacity="1"; (e.currentTarget.querySelector(".ov-cap") as HTMLElement).style.transform="translateY(0)"; }}
                onMouseLeave={e=>{ (e.currentTarget.querySelector("img") as HTMLElement).style.transform="scale(1)"; (e.currentTarget.querySelector("img") as HTMLElement).style.filter="grayscale(1)"; (e.currentTarget.querySelector(".ov") as HTMLElement).style.opacity="0"; (e.currentTarget.querySelector(".ov-cap") as HTMLElement).style.transform="translateY(14px)"; }}>
                <img src={p.coverImage||""} alt={p.title} className={PROTECTED_IMG_CLASS} {...protectedImgProps} style={{width:"100%",height:"100%",objectFit:"cover",filter:"grayscale(1)",transition:"transform 0.7s cubic-bezier(.16,.84,.44,1), filter 0.7s"}} />
                <PhotoCountBadge count={p.images?.length||0} />
                <div className="ov" style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(9,6,14,0.9),transparent 50%)",opacity:0,transition:"opacity 0.35s",display:"flex",flexDirection:"column",justifyContent:"flex-end",padding:32}}>
                  <div className="ov-cap" style={{transform:"translateY(14px)",transition:"transform 0.45s cubic-bezier(.16,.84,.44,1)"}}>
                    <div style={{fontSize:10,letterSpacing:4,color:C.PL,textTransform:"uppercase",marginBottom:8}}>{p.categories?.join(" · ")}</div>
                    <div style={{fontSize:22,letterSpacing:2,color:"#fff"}}>{p.title}</div>
                  </div>
                </div>
              </Link>
              </Reveal>
            ))}
            {featured.slice(1,4).map((p,idx)=>(
              <Reveal key={p.id} delay={0.1+idx*0.08}>
              <Link href={`/work/${p.slug}`} style={{display:"block",position:"relative",cursor:"pointer",overflow:"hidden",aspectRatio:"4/3",background:C.DARK,textDecoration:"none"}}
                onMouseEnter={e=>{ (e.currentTarget.querySelector("img") as HTMLElement).style.transform="scale(1.07)"; (e.currentTarget.querySelector("img") as HTMLElement).style.filter="grayscale(0)"; (e.currentTarget.querySelector(".ov") as HTMLElement).style.opacity="1"; (e.currentTarget.querySelector(".ov-cap") as HTMLElement).style.transform="translateY(0)"; }}
                onMouseLeave={e=>{ (e.currentTarget.querySelector("img") as HTMLElement).style.transform="scale(1)"; (e.currentTarget.querySelector("img") as HTMLElement).style.filter="grayscale(1)"; (e.currentTarget.querySelector(".ov") as HTMLElement).style.opacity="0"; (e.currentTarget.querySelector(".ov-cap") as HTMLElement).style.transform="translateY(14px)"; }}>
                <img src={p.coverImage||""} alt={p.title} loading="lazy" className={PROTECTED_IMG_CLASS} {...protectedImgProps} style={{width:"100%",height:"100%",objectFit:"cover",filter:"grayscale(1)",transition:"transform 0.6s cubic-bezier(.16,.84,.44,1), filter 0.6s"}} />
                <PhotoCountBadge count={p.images?.length||0} />
                <div className="ov" style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(9,6,14,0.9),transparent 50%)",opacity:0,transition:"opacity 0.35s",display:"flex",flexDirection:"column",justifyContent:"flex-end",padding:20}}>
                  <div className="ov-cap" style={{transform:"translateY(14px)",transition:"transform 0.45s cubic-bezier(.16,.84,.44,1)"}}>
                    <div style={{fontSize:9,letterSpacing:3,color:C.PL,textTransform:"uppercase",marginBottom:4}}>{p.categories?.[0]}</div>
                    <div style={{fontSize:15,letterSpacing:1,color:"#fff"}}>{p.title}</div>
                  </div>
                </div>
              </Link>
              </Reveal>
            ))}
          </div>
        </div>
      )}

      {/* OUR CLIENTS -- rebuilt to match spector.framer.website's actual "Our Clients" component
          as closely as directly inspecting its live DOM/CSS allows: white section (their
          .mr-container is rgb(255,255,255), not a dark panel), bare logos with no card chrome,
          pure rotateY+translateZ per item (their .mr-item transform is a plain rotateY matrix --
          no X-axis tilt), and the same continuous per-item blur+opacity-by-depth curve their
          .mr-item-content layer animates. Currently DUMMY data (Client One..Four) for review --
          manage names/logos/order and the on/off toggle via CMS > Settings > Clients. */}
      {settings.clientsEnabled&&settings.clients.length>0&&(
        <div style={{background:C.LT,padding:"90px 0",overflow:"hidden"}}>
          <Reveal style={{maxWidth:1160,margin:"0 auto 48px",padding:"0 40px",textAlign:"center"}}>
            <div style={{...S.tag(),marginBottom:14,color:C.P,justifyContent:"center"}}><span style={{width:24,height:1,background:C.P,display:"inline-block"}} />{settings.uiText.homeClientsEyebrow}<span style={{width:24,height:1,background:C.P,display:"inline-block"}} /></div>
            <h2 style={{fontSize:"clamp(26px,3.4vw,42px)",fontWeight:700,letterSpacing:0.5,margin:0,color:C.DARK}}>{settings.uiText.homeClientsTitle}</h2>
          </Reveal>
          <div style={{maxWidth:1160,margin:"0 auto",padding:isMobile?"0 20px":"0 40px",height:isMobile?190:250,position:"relative",perspective:isMobile?1000:1800}}>
            <div className="clients-orbit-anchor" style={{position:"absolute",top:"50%",left:"50%",transformStyle:"preserve-3d"}}>
              {settings.clients.map((cl,i)=>{
                const n=settings.clients.length;
                const angle=(360/n)*i;
                const radius=isMobile?Math.max(130,n*32):Math.max(220,n*55);
                const tileW=isMobile?116:160;
                // Measured the reference's own idle rotation directly (sampled its rotateY
                // transform 2s apart): ~9deg/s, i.e. a full 360deg turn takes ~40s. Fixed at 40s
                // regardless of client count (was tied to n before) so the speed always matches.
                const dur=40;
                const delay=-(angle/360)*dur;
                return (
                  <div key={cl.id} className="client-orbit-item" style={{position:"absolute",top:0,left:0,"--r":`${radius}px`,animation:`clientsOrbit ${dur}s linear infinite`,animationDelay:`${delay}s`,backfaceVisibility:"hidden",WebkitBackfaceVisibility:"hidden"} as React.CSSProperties}>
                    <div className="client-tile" style={{width:tileW,marginLeft:-tileW/2,height:64,marginTop:-32,display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {cl.logo&&cmsPhotosReady?(
                        <img src={cl.logo} alt={cl.name} style={{maxHeight:"100%",maxWidth:tileW-10,objectFit:"contain"}} />
                      ):(
                        <span style={{fontSize:isMobile?14:18,letterSpacing:1,color:C.DARK,fontWeight:600,whiteSpace:"nowrap"}}>{cl.name}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* GOOGLE REVIEWS -- when switched on in CMS > Settings > Pages, real live Google reviews
          take over this slot from the manual testimonial spotlight below (see the ! check on
          that block's condition), per the "Google reviews only when both are on" priority rule. */}
      {settings.googleReviewsEnabled && (
        <GoogleReviewsSection placeId={settings.googlePlaceId} eyebrow={settings.uiText.homeTestimonialsEyebrow} />
      )}

      {/* TESTIMONIALS -- a pull-quote spotlight held inside a bordered panel (not bare floating
          text) with a solid-DARK quote badge, echoing the Services chips so this section reads
          as part of the same design language. Auto-rotates like the Hero slideshow. Suppressed
          whenever Google Reviews is on (that section takes exclusive priority in this slot). */}
      {!settings.googleReviewsEnabled && settings.homeSections?.testimonials!==false && featuredTesti.length>0&&(
        <div style={{background:C.LT,padding:"0 40px 130px",position:"relative"}}>
          <Reveal style={{maxWidth:720,margin:"0 auto",position:"relative"}}>
            <div style={{background:C.LTCARD,border:`1px solid ${C.LTBORDER}`,borderRadius:6,padding:"56px 48px",textAlign:"center",boxShadow:"0 24px 60px rgba(20,13,33,0.08)"}}>
              <div style={{width:44,height:44,borderRadius:4,background:C.DARK,color:C.P,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:700,margin:"0 auto 28px"}}>"</div>
              <div style={{...S.tag(true),marginBottom:24,color:C.P}}><span style={{width:24,height:1,background:C.P,display:"inline-block"}} />{settings.uiText.homeTestimonialsEyebrow}<span style={{width:24,height:1,background:C.P,display:"inline-block"}} /></div>
              <p key={testiIdx} className="testi-fade" style={{fontSize:"clamp(18px,2.2vw,26px)",fontWeight:500,fontStyle:"italic",color:C.DARK,lineHeight:1.6,margin:"0 0 28px"}}>{featuredTesti[testiIdx % featuredTesti.length].quote}</p>
              <div key={"n"+testiIdx} className="testi-fade" style={{marginBottom:featuredTesti.length>1?28:0}}>
                <div style={{fontSize:14,color:C.DARK,letterSpacing:1,fontWeight:700}}>{featuredTesti[testiIdx % featuredTesti.length].name}</div>
                <div style={{fontSize:11,color:C.INKMID,marginTop:4,letterSpacing:1,textTransform:"uppercase"}}>{featuredTesti[testiIdx % featuredTesti.length].role} · {featuredTesti[testiIdx % featuredTesti.length].company}</div>
              </div>
              {featuredTesti.length>1&&<div style={{display:"flex",gap:10,justifyContent:"center"}}>
                {featuredTesti.map((_,i)=>(
                  <span key={i} onClick={()=>setTestiIdx(i)} style={{width:i===testiIdx%featuredTesti.length?26:8,height:8,borderRadius:4,background:i===testiIdx%featuredTesti.length?C.P:"rgba(139,92,246,0.25)",cursor:"pointer",transition:"all 0.3s"}} />
                ))}
              </div>}
            </div>
          </Reveal>
        </div>
      )}

      {/* BLOG PREVIEW -- also gated on pageEnabled.blog, same reasoning as Featured Work above. */}
      {settings.homeSections?.journal!==false && settings.pageEnabled.blog!==false && blog.length>0&&(
        <div style={{background:C.DARK,padding:"60px 40px"}}>
          <div style={{maxWidth:1200,margin:"0 auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:36}}>
              <div>
                <div style={{...S.tag(),marginBottom:8}}><span style={{width:24,height:1,background:C.PL,display:"inline-block"}} />{settings.uiText.homeJournalEyebrow}</div>
                <h2 style={{fontSize:"clamp(26px,3.5vw,48px)",fontWeight:700,letterSpacing:1,margin:0}}>{settings.uiText.homeJournalTitle}</h2>
              </div>
              <span onClick={()=>goTo("blog")} style={{fontSize:10,letterSpacing:3,color:C.PL,textTransform:"uppercase",cursor:"pointer",borderBottom:`1px solid ${C.PL}`,paddingBottom:2}}>{settings.uiText.homeJournalViewAll}</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",gap:24}}>
              {blog.slice(0,2).map((b,idx)=>(
                <Reveal key={b.id} delay={idx*0.1}>
                <div className="tcard" onClick={()=>openBlog(b)} style={{cursor:"pointer",borderRadius:4,overflow:"hidden",border:`1px solid ${C.BORDER}`,background:C.DARK}}>
                  {b.coverImage&&<div style={{aspectRatio:"16/9",overflow:"hidden"}}><img src={b.coverImage} alt={b.title} loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover",transition:"transform 0.5s cubic-bezier(.16,.84,.44,1)"}} onMouseEnter={e=>(e.currentTarget.style.transform="scale(1.04)")} onMouseLeave={e=>(e.currentTarget.style.transform="scale(1)")} /></div>}
                  <div style={{padding:24}}>
                    <div style={{fontSize:10,letterSpacing:3,color:C.PL,textTransform:"uppercase",marginBottom:8}}>{b.category} · {b.date}</div>
                    <h3 style={{fontSize:16,fontWeight:700,letterSpacing:0.5,margin:"0 0 10px"}}>{b.title}</h3>
                    <p style={{color:C.MID,fontSize:13,lineHeight:1.7}}>{b.excerpt}</p>
                  </div>
                </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CTA */}
      {settings.homeSections?.cta!==false && (
      <Reveal style={{textAlign:"center",padding:"64px 32px",background:`linear-gradient(135deg,${C.BG} 0%,${C.DARK} 50%,${C.BG} 100%)`}}>
        <div style={{...S.tag(true),marginBottom:12}}><span style={{width:32,height:1,background:C.PL,display:"inline-block"}} />{settings.uiText.homeCtaEyebrow}</div>
        <h2 style={{fontSize:"clamp(26px,3.5vw,44px)",fontWeight:700,letterSpacing:1,margin:"0 0 12px"}}>{settings.uiText.homeCtaTitle}</h2>
        <p style={{color:C.MID,fontSize:14,marginBottom:36}}>Based in {settings.location} · Available across UAE, GCC & internationally</p>
        <div style={{display:"flex",gap:16,justifyContent:"center",flexWrap:"wrap"}}>
          <button onClick={()=>goTo("booking")} style={S.btnP} onMouseEnter={e=>(e.currentTarget.style.background=C.PD)} onMouseLeave={e=>(e.currentTarget.style.background=C.P)}>{settings.uiText.homeCtaBookBtn}</button>
          <a href={`https://wa.me/${WA}?text=${encodeURIComponent(WA_MSG)}`} target="_blank" style={{...S.btnO,textDecoration:"none"}}>{settings.uiText.homeCtaWaBtn}</a>
        </div>
      </Reveal>
      )}

      <Footer />
      <FloatingWA num={WA} msg={WA_MSG} />
      <ConsultPopup open={popupOpen} onClose={closePopup} title={settings.popupTitle} text={settings.popupText} ctaLabel={settings.popupCtaLabel} waNumber={WA} />
    </div>
  );
}