"use client";
import { useState, useEffect, useRef } from "react";
import { createClient as _createSupabaseClient } from "@supabase/supabase-js";

// ─── TYPES ──────────────────────────────────────────────────────────────────
type Img = { url: string; orientation: string; caption?: string };
type Project = { id:string;title:string;slug:string;categories:string[];description:string;fullDescription:string;clientName:string;location:string;projectDate:string;tags:string[];featured:boolean;coverImage:string;images:Img[];videos:string[];reels:string[];youtubeUrl:string; };
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
};
// Optional per-page banner background image (CMS > Settings > Colors & Banners). Empty string
// (the default for every page) means "no image" -- the banner renders as a plain solid-color
// band using theme.DARK, identical to how these pages look today. Adding a URL overlays a dark
// scrim automatically so the banner title stays readable over any photo.
type SectionBg = { work:string;about:string;packages:string;blog:string;cv:string;booking:string;contact:string; };
// Per-page visibility switch (CMS > Settings > Pages). Home always stays on -- these are the
// other public pages, each independently turn-off-able without touching any content or code.
// A disabled page is simply skipped from nav/footer links and goTo() bounces back to Home if
// something still points at it, so nothing 404s and no content is deleted.
type PageEnabled = { work:boolean;about:boolean;packages:boolean;blog:boolean;cv:boolean;booking:boolean;contact:boolean; };
// Pricing package cards (CMS > Settings > Packages), rendered on the Packages page under
// "Your Investment" -- add/remove/edit freely, each with its own image. Separate from
// `services` (the deliverables-list cards further down that page), which stay untouched.
// `features` populates the card-back "Includes" checklist (hover-flip -- see .pflip in
// globals.css); safe to be missing/empty on older saved data, the back face just shows nothing.
type PricingPackage = { id:string; icon:string; label:string; price:string; priceNote:string; desc:string; image:string; ctaLabel:string; features:string[]; };
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
  phone:string; email:string; waNumber:string; waMsg:string; location:string;
  instagram:string; youtube:string; linkedin:string; tiktok:string;
  footerCopyright:string; footerLinks:{label:string;page:string}[];
  seoTitle:string; seoDesc:string; googlePlaceId:string;
  popupEnabled:boolean; popupDelaySec:number; popupTitle:string; popupText:string; popupCtaLabel:string;
  emailjsServiceId:string; emailjsTemplateId:string; emailjsPublicKey:string;
  theme:ThemeColors; uiText:UiText; sectionBg:SectionBg; pageEnabled:PageEnabled; heroTypography:HeroTypography;
  pricingPackages:PricingPackage[]; pricingCardStyle:PricingCardStyle;
  services:Service[];
  cvSections:{title:string;content:string}[];
  skills:{dept:string;items:string[]}[];
};
type HeroSlide = { label:string;headline:string;sub:string;btn1:string;btn2:string;img:string;page:string; };

// ─── LANGUAGE SWITCHER ────────────────────────────────────────────────────────
// Translates the fixed site chrome only -- nav labels, the book/WhatsApp buttons, and the
// contact form. CMS-authored long-form content (hero headlines, about bio, services, CV,
// blog posts, package descriptions) stays in whichever language Naveed wrote it in; adding
// real per-field translations for that content is a separate, larger step once he has
// translated text to paste in, rather than machine-translating his bio/CV on the fly.
type Lang = "en"|"ar"|"fr"|"ru"|"zh";
const LANGS: {code:Lang;label:string;flag:string;rtl?:boolean}[] = [
  {code:"en",label:"English",flag:"🇬🇧"},
  {code:"ar",label:"العربية",flag:"🇦🇪",rtl:true},
  {code:"fr",label:"Français",flag:"🇫🇷"},
  {code:"ru",label:"Русский",flag:"🇷🇺"},
  {code:"zh",label:"中文",flag:"🇨🇳"},
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
};
// Maps a footerLinks/NAV_LINKS page key to its UI_STRINGS translation key (a few names differ,
// e.g. "blog" the page vs "journal" the label).
const PAGE_LABEL_KEY: Record<string,keyof typeof UI_STRINGS["en"]> = {work:"work",about:"about",packages:"packages",blog:"journal",cv:"cv",booking:"booking",contact:"contact"};

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
  location:"Dubai, UAE",
  instagram:"https://www.instagram.com/bynaveedanjum/", youtube:"https://youtube.com/@creativeeyeuae", linkedin:"https://linkedin.com/in/naveedanjumch", tiktok:"",
  footerCopyright:"© 2026 Naveed Anjum · Creative Fusion · Dubai, UAE",
  footerLinks:[{label:"Work",page:"work"},{label:"About",page:"about"},{label:"Packages",page:"packages"},{label:"CV",page:"cv"},{label:"Booking",page:"booking"},{label:"Contact",page:"contact"}],
  seoTitle:"Naveed Anjum — Professional Photographer & Videographer Dubai",
  seoDesc:"Professional photographer and videographer in Dubai, UAE. 20+ years experience in portrait, commercial, real estate, events and cinematography.",
  googlePlaceId:"",
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
  },
  sectionBg:{work:"",about:"",packages:"",blog:"",cv:"",booking:"",contact:""},
  pageEnabled:{work:true,about:true,packages:true,blog:true,cv:true,booking:true,contact:true},
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
};

const DEF_PROJECTS: Project[] = [
  {id:"p1",title:"Golden Hour Dubai",slug:"golden-hour-dubai",categories:["Landscape Photography"],description:"Aerial and ground-level captures of Dubai at dusk.",fullDescription:"",clientName:"Visit Dubai",location:"Dubai, UAE",projectDate:"2026-01-15",tags:["dubai","landscape"],featured:true,coverImage:"https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&q=80",images:[{url:"https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&q=80",orientation:"landscape"},{url:"https://images.unsplash.com/photo-1582672060674-bc2bd808a8b5?w=800&q=80",orientation:"portrait"},{url:"https://images.unsplash.com/photo-1582672060674-bc2bd808a8b5?w=1200&q=80",orientation:"landscape"}],videos:[],reels:[],youtubeUrl:""},
  {id:"p2",title:"Bridal Portraits",slug:"bridal-portraits",categories:["Wedding","Portrait Photography"],description:"Intimate bridal portraits in natural light.",fullDescription:"",clientName:"Private Client",location:"Abu Dhabi",projectDate:"2026-02-20",tags:["wedding","portrait"],featured:true,coverImage:"https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=80",images:[{url:"https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=80",orientation:"landscape"}],videos:[],reels:[],youtubeUrl:""},
  {id:"p3",title:"Corporate Excellence",slug:"corporate-excellence",categories:["Commercial","Editorial"],description:"Premium corporate photography for UAE brands.",fullDescription:"",clientName:"UAE Corporate",location:"DIFC, Dubai",projectDate:"2026-03-10",tags:["corporate","commercial"],featured:true,coverImage:"https://images.unsplash.com/photo-1705412238984-8bb35d443964?w=1200&q=80",images:[{url:"https://images.unsplash.com/photo-1705412238984-8bb35d443964?w=1200&q=80",orientation:"landscape"}],videos:[],reels:[],youtubeUrl:""},
];

const DEF_TESTIMONIALS: Testimonial[] = [
  {id:"t1",name:"Sarah Al Mansoori",role:"Marketing Director",company:"Emaar Properties",quote:"Naveed's work exceeded our expectations. His ability to capture the essence of our brand through photography is truly exceptional.",featured:true},
  {id:"t2",name:"Ahmed Hassan",role:"CEO",company:"Dubai Ventures",quote:"Professional, creative, and always delivers on time. Our corporate event coverage was absolutely stunning.",featured:true},
  {id:"t3",name:"Layla Khalid",role:"Brand Manager",company:"Luxury Retail UAE",quote:"Working with Naveed transformed our product photography. The quality speaks for itself.",featured:true},
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
const CLOUD_KEYS = ["nap_settings","nap_projects","nap_cats","nap_testimonials","nap_blog","nap_blogcats"] as const;
async function fetchCloudData(): Promise<Partial<Record<typeof CLOUD_KEYS[number],any>>|null> {
  if(!sb) return null;
  try {
    const {data,error} = await sb.from("site_settings").select("key,value").in("key",CLOUD_KEYS as unknown as string[]);
    if(error||!data) return null;
    const out:Partial<Record<typeof CLOUD_KEYS[number],any>> = {};
    data.forEach((row:any)=>{ try{ (out as any)[row.key] = JSON.parse(row.value); }catch{} });
    return out;
  } catch { return null; }
}
function pushCloudData(key:typeof CLOUD_KEYS[number], value:any) {
  if(!sb) return;
  sb.from("site_settings").upsert({key,value:JSON.stringify(value)},{onConflict:"key"}).then(()=>{},()=>{});
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
async function uploadToStorage(file:File): Promise<string> {
  if (sb) {
    try {
      const ext = (file.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"")||"jpg";
      const key = `cms-uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await sb.storage.from("portfolio").upload(key,file,{contentType:file.type});
      if(!error){
        const { data } = sb.storage.from("portfolio").getPublicUrl(key);
        if(data?.publicUrl) return data.publicUrl;
      }
    } catch {}
  }
  // Fallback (offline/misconfigured): embed as base64 so the CMS still works in this browser.
  return await new Promise<string>((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result as string); r.onerror=rej; r.readAsDataURL(file); });
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
  async function upload(files:FileList|null) {
    if(!files?.length) return;
    setBusy(true); const out:Img[]=[];
    for(let i=0;i<files.length;i++){
      setProg(Math.round(i/files.length*100));
      const f=files[i];
      const url = await uploadToStorage(f);
      const o = await detectOrientation(url);
      out.push({url,orientation:o});
    }
    setProg(100); onDone(out); setTimeout(()=>{setBusy(false);setProg(0);},500);
  }
  const Btn = ({label="📁 Upload Photos"}:{label?:string}) => (
    <div>
      <input ref={ref} type="file" accept="image/*" multiple style={{display:"none"}} onChange={e=>upload(e.target.files)} />
      <button onClick={()=>ref.current?.click()} style={{...S.btnP,opacity:busy?0.7:1,marginBottom:busy?8:0}}>{busy?`Uploading ${prog}%`:label}</button>
      {busy&&<div style={{height:3,background:"#1a1a2e",borderRadius:2}}><div style={{height:"100%",background:C.P,width:`${prog}%`,transition:"width 0.3s"}} /></div>}
    </div>
  );
  return {Btn,busy};
}

// ─── SINGLE IMAGE UPLOAD ──────────────────────────────────────────────────────
function SingleImageUpload({value,onChange,label="Photo"}:{value:string;onChange:(url:string)=>void;label?:string}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy,setBusy] = useState(false);
  async function upload(f:File|null){
    if(!f) return; setBusy(true);
    const url = await uploadToStorage(f);
    onChange(url); setBusy(false);
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

// ─── PAGE BANNER ──────────────────────────────────────────────────────────────
// Reusable banner rendered at the top of every inner page (Work, About, Packages, Journal,
// CV, Booking, Contact, plus individual Project/Post pages using their own title+cover image).
// CMS-editable eyebrow/title text (Settings > Colors & Banners) with an optional background
// image; no image set (the default everywhere) renders as a plain solid-color band using
// theme.DARK, so shipping this changes nothing visually until an image is actually added.
function PageBanner({eyebrow,title,image}:{eyebrow:string;title:string;image?:string}) {
  return (
    <div style={{position:"relative",overflow:"hidden",background:C.DARK,minHeight:"clamp(420px,66vh,720px)",display:"flex",alignItems:"center",padding:"134px 40px 60px"}}>
      {image&&<img src={image} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:0.6}} />}
      {image&&<div style={{position:"absolute",inset:0,background:"linear-gradient(105deg,rgba(9,6,14,0.85) 0%,rgba(9,6,14,0.45) 100%)"}} />}
      <div style={{position:"relative",zIndex:1,maxWidth:1400,margin:"0 auto",width:"100%"}}>
        <div style={{fontSize:11,letterSpacing:6,color:C.PL,textTransform:"uppercase",display:"flex",alignItems:"center",gap:12,marginBottom:14}}><span style={{width:24,height:1,background:C.PL,display:"inline-block"}} />{eyebrow}</div>
        <h1 style={{fontSize:"clamp(32px,5.2vw,64px)",fontWeight:700,letterSpacing:0.5,margin:0,color:"#fff"}}>{title}</h1>
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
function Hero({slides,onNav,waNumber,typography}:{slides:HeroSlide[];onNav:(p:string)=>void;waNumber:string;typography:HeroTypography}) {
  const ht=typography;
  const [slide,setSlide]=useState(0); const [prog,setProg]=useState(0);
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
    <div style={{position:"relative",height:"100vh",overflow:"hidden",background:C.BG}}>
      {slides.map((s,i)=>(
        <div key={i} style={{position:"absolute",inset:0,opacity:i===slide?1:0,transition:"opacity 1.4s ease",zIndex:i===slide?1:0}}>
          <img src={s.img} alt={s.label} style={{width:"100%",height:"100%",objectFit:"cover",transform:i===slide?"scale(1.06)":"scale(1)",transition:"transform 7s ease"}} />
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
          <h1 style={{fontSize:`clamp(30px,min(5.4vw,7.5vh),${ht.headlineSize}px)`,fontFamily:HERO_FONTS[ht.headlineFont],fontWeight:ht.headlineWeight,fontStyle:ht.headlineItalic?"italic":"normal",letterSpacing:ht.headlineSpacing,color:ht.headlineColor||"#fff",margin:"0 0 clamp(12px,2.5vh,20px)",lineHeight:1.1,whiteSpace:"pre-line"}}>{sl.headline}</h1>
          <p style={{fontSize:`clamp(14px,min(1.5vw,2.1vh),${ht.subSize}px)`,fontFamily:HERO_FONTS[ht.subFont],fontWeight:ht.subWeight,color:ht.subColor||"rgba(255,255,255,0.6)",lineHeight:1.7,maxWidth:460,marginBottom:"clamp(18px,3.5vh,40px)"}}>{sl.sub}</p>
          <div style={{display:"flex",gap:14,flexWrap:"wrap",marginBottom:"clamp(16px,3vh,36px)"}}>
            <button onClick={()=>onNav(sl.page)} style={{...S.btnP}} onMouseEnter={e=>(e.currentTarget.style.background=C.PD)} onMouseLeave={e=>(e.currentTarget.style.background=C.P)}>{sl.btn1}</button>
            {sl.btn2&&<button onClick={()=>onNav("booking")} style={{background:"none",border:"1px solid rgba(255,255,255,0.25)",color:"rgba(255,255,255,0.75)",padding:"13px 36px",fontSize:11,letterSpacing:3,textTransform:"uppercase",cursor:"pointer"}}>{sl.btn2}</button>}
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
  const [settings,setSettings]=useState<SiteSettings>(()=>({...DEF_SETTINGS,...ls("nap_settings",DEF_SETTINGS)}));
  const [projects,setProjects]=useState<Project[]>(()=>ls("nap_projects",DEF_PROJECTS));
  const [cats,setCats]=useState<string[]>(()=>ls("nap_cats",DEF_CATS));
  const [testimonials,setTestimonials]=useState<Testimonial[]>(()=>ls("nap_testimonials",DEF_TESTIMONIALS));
  const [blog,setBlog]=useState<BlogPost[]>(()=>ls("nap_blog",DEF_BLOG));
  const [blogCats,setBlogCats]=useState<string[]>(()=>ls("nap_blogcats",DEF_BLOG_CATS));
  const [page,setPage]=useState("home");
  const [selProj,setSelProj]=useState<Project|null>(null);
  const [selBlog,setSelBlog]=useState<BlogPost|null>(null);
  const [filterCat,setFilterCat]=useState("All");
  const [blogFilterCat,setBlogFilterCat]=useState("All");
  const [testiIdx,setTestiIdx]=useState(0);
  const [lb,setLb]=useState({open:false,index:0});
  const [cms,setCms]=useState(false);
  const [authed,setAuthed]=useState(false);
  const [pin,setPin]=useState(""); const [pinErr,setPinErr]=useState(false);
  const [pinLockUntil,setPinLockUntil]=useState(0);
  const [pinAttempts,setPinAttempts]=useState(0);
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

  // Admin is reached only via a private link (?admin=1) — never shown in the public nav.
  useEffect(()=>{
    try{
      const params=new URLSearchParams(window.location.search);
      if(params.get("admin")==="1") setCms(true);
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

  // Auto sign-out of the CMS after 10 minutes of inactivity, so an unlocked admin
  // session doesn't stay open indefinitely on a shared or public computer.
  useEffect(()=>{
    if(!authed) return;
    let timer:ReturnType<typeof setTimeout>;
    const TIMEOUT_MS=10*60*1000;
    function reset(){ if(timer) clearTimeout(timer); timer=setTimeout(()=>{ setAuthed(false); setCms(false); },TIMEOUT_MS); }
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
  const [form,setForm]=useState<Partial<Project>&{images:Img[];reels:string[];videos:string[];categories:string[]}>({title:"",slug:"",categories:[],description:"",fullDescription:"",clientName:"",location:"",projectDate:"",tags:[],featured:false,coverImage:"",images:[],videos:[],reels:[],youtubeUrl:""});
  const [newImg,setNewImg]=useState(""); const [addingImg,setAddingImg]=useState(false);
  const [newReel,setNewReel]=useState(""); const [newCat,setNewCat]=useState(""); const [newBlogCat,setNewBlogCat]=useState("");
  const [cropSrc,setCropSrc]=useState<string|null>(null);
  const [booking,setBooking]=useState({name:"",email:"",phone:"",service:"",date:"",time:"",location:"",details:"",budget:"",agreed:false});
  const [bookingDone,setBookingDone]=useState(false);
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

  // Only push to the shared cloud copy while an authenticated CMS session made the change --
  // never on a plain public page load, otherwise an ordinary visitor's own (possibly stale)
  // locally-cached copy could momentarily clobber the real live content for everyone.
  useEffect(()=>{try{localStorage.setItem("nap_settings",JSON.stringify(settings));}catch{}; if(authed) pushCloudData("nap_settings",settings);},[settings,authed]);
  useEffect(()=>{try{localStorage.setItem("nap_projects",JSON.stringify(projects));}catch{}; if(authed) pushCloudData("nap_projects",projects);},[projects,authed]);
  useEffect(()=>{try{localStorage.setItem("nap_cats",JSON.stringify(cats));}catch{}; if(authed) pushCloudData("nap_cats",cats);},[cats,authed]);
  useEffect(()=>{try{localStorage.setItem("nap_testimonials",JSON.stringify(testimonials));}catch{}; if(authed) pushCloudData("nap_testimonials",testimonials);},[testimonials,authed]);
  useEffect(()=>{try{localStorage.setItem("nap_blog",JSON.stringify(blog));}catch{}; if(authed) pushCloudData("nap_blog",blog);},[blog,authed]);
  useEffect(()=>{try{localStorage.setItem("nap_blogcats",JSON.stringify(blogCats));}catch{}; if(authed) pushCloudData("nap_blogcats",blogCats);},[blogCats,authed]);
  // On first mount, pull the shared cloud copy (if reachable) so every visitor/device sees the
  // same latest content instead of whatever this particular browser cached locally.
  useEffect(()=>{
    let cancelled=false;
    fetchCloudData().then(cloud=>{
      if(cancelled||!cloud) return;
      if(cloud.nap_settings) setSettings(s=>({...DEF_SETTINGS,...cloud.nap_settings}));
      if(cloud.nap_projects) setProjects(cloud.nap_projects);
      if(cloud.nap_cats) setCats(cloud.nap_cats);
      if(cloud.nap_testimonials) setTestimonials(cloud.nap_testimonials);
      if(cloud.nap_blog) setBlog(cloud.nap_blog);
      if(cloud.nap_blogcats) setBlogCats(cloud.nap_blogcats);
    });
    return ()=>{cancelled=true;};
  },[]);

  const filtered=filterCat==="All"?projects:projects.filter(p=>p.categories?.includes(filterCat));
  const featured=projects.filter(p=>p.featured);
  const filteredBlog=blogFilterCat==="All"?blog:blog.filter(b=>b.category===blogFilterCat);
  const WA=settings.waNumber; const WA_MSG=settings.waMsg;

  function goTo(p:string){ const pe=settings.pageEnabled as Record<string,boolean>|undefined; if(pe&&pe[p]===false) p="home"; setPage(p);window.scrollTo(0,0); }
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
    await sendEmailNotification(settings,entry);
    setContactSending(false); setContactSent(true);
    setContactForm({name:"",email:"",phone:"",subject:"",message:""});
  }
  function removeLead(id:string){ setLeads(ls=>ls.filter(l=>l.id!==id)); deleteContactLead(id); }
  function handlePin(){
    if(Date.now()<pinLockUntil){ setPinErr(true); return; }
    if(pin===settings.pin){
      setAuthed(true);setPinErr(false);setPin("");setSettingsDraft(settings);setPinAttempts(0);
    }else{
      const attempts=pinAttempts+1; setPinAttempts(attempts); setPinErr(true);
      if(attempts>=5){ setPinLockUntil(Date.now()+60000); setPinAttempts(0); }
    }
  }
  function saveSettings(){setSettings(settingsDraft);}
  function updateSD(patch:Partial<SiteSettings>){setSettingsDraft(d=>({...d,...patch}));}

  function startEdit(p:Project|null){setEditId(p?.id||"new");setForm(p?{...p,tags:p.tags||[],categories:p.categories||[]}:{title:"",slug:"",categories:[],description:"",fullDescription:"",clientName:"",location:"",projectDate:"",tags:[],featured:false,coverImage:"",images:[],videos:[],reels:[],youtubeUrl:""});}

  async function addImgUrl(){if(!newImg.trim())return;setAddingImg(true);const o=await detectOrientation(newImg.trim());setForm(f=>({...f,images:[...(f.images||[]),{url:newImg.trim(),orientation:o}],coverImage:f.coverImage||newImg.trim()}));setNewImg("");setAddingImg(false);}

  const {Btn:UploadBtn}=useUploader((imgs)=>setForm(f=>({...f,images:[...(f.images||[]),...imgs],coverImage:f.coverImage||imgs[0]?.url||""})));

  function saveProj(){
    if(!form.title?.trim())return;
    const p:Project={id:editId!=="new"?editId!:Date.now().toString(),title:form.title||"",slug:form.slug||slugify(form.title||""),categories:form.categories||[],description:form.description||"",fullDescription:form.fullDescription||"",clientName:form.clientName||"",location:form.location||"",projectDate:form.projectDate||"",tags:Array.isArray(form.tags)?form.tags:[],featured:!!form.featured,coverImage:form.coverImage||"",images:form.images||[],videos:form.videos||[],reels:form.reels||[],youtubeUrl:form.youtubeUrl||""};
    if(editId!=="new")setProjects(ps=>ps.map(x=>x.id===editId?p:x));else setProjects(ps=>[...ps,p]);
    setEditId(null);
  }

  function submitBooking(){
    if(!booking.name||!booking.service||!booking.date)return;
    const msg=`Hello ${settings.siteName}! 👋\n\nNew Booking:\n📋 *Service:* ${booking.service}\n👤 *Name:* ${booking.name}\n📧 *Email:* ${booking.email}\n📱 *Phone:* ${booking.phone}\n📅 *Date:* ${booking.date}\n⏰ *Time:* ${booking.time}\n📍 *Location:* ${booking.location}\n💰 *Budget:* ${booking.budget} AED\n📝 ${booking.details}`;
    window.open(`https://wa.me/${WA}?text=${encodeURIComponent(msg)}`,"_blank");
    setBookingDone(true);
  }

  // ── NAV ──
  const NAV_LINKS:[string,string][]=[["home",T.home],["work",T.work],["about",T.about],["packages",T.packages],["blog",T.journal],["cv",T.cv],["contact",T.contact]];
  // Skip any page CMS-disabled via Settings > Pages. Home is never in pageEnabled, so it's
  // always shown regardless.
  const visibleNavLinks=NAV_LINKS.filter(([k])=>(settings.pageEnabled as Record<string,boolean>|undefined)?.[k]!==false);

  const Nav=()=>(
    <>
    {/* Sitewide motion: a soft fade plays once whenever the page div below remounts (React
        remounts it on every nav change because of its key={page}), giving every page switch a
        smooth transition instead of an abrupt cut. Defined once here since Nav renders at the
        top of every public page. Opacity-only on purpose -- animating `transform` on the page
        wrapper (which contains this fixed Nav) would make the browser treat "fixed" as relative
        to that wrapper instead of the viewport for the animation's duration, visibly shifting
        the nav/top-strip and opening a gap above the hero image. Never add transform here. */}
    <style>{`@keyframes pgFadeIn{from{opacity:0}to{opacity:1}}`}</style>
    <div style={{position:"fixed",top:0,left:0,right:0,zIndex:501,height:32,boxSizing:"border-box",padding:isMobile?"0 20px":"0 40px",display:"flex",justifyContent:"space-between",alignItems:"center",background:C.DARK,opacity:scrolled?0:1,transform:scrolled?"translateY(-100%)":"translateY(0)",pointerEvents:scrolled?"none":"auto",transition:"opacity 0.35s cubic-bezier(.16,.84,.44,1), transform 0.35s cubic-bezier(.16,.84,.44,1)"}}>
      <a href="/?admin=1" style={{fontSize:10,letterSpacing:2,color:C.MID,textTransform:"uppercase",textDecoration:"none",transition:"color 0.2s"}} onMouseEnter={e=>(e.currentTarget.style.color=C.PL)} onMouseLeave={e=>(e.currentTarget.style.color=C.MID)}>Admin</a>
      <div style={{display:"flex",gap:18,alignItems:"center"}}>
        {/* Language switcher -- translates nav/buttons/contact form only, see UI_STRINGS. */}
        <select aria-label="Language" value={lang} onChange={e=>setLang(e.target.value as Lang)} style={{background:"transparent",border:"none",color:C.MID,fontSize:10,letterSpacing:1,textTransform:"uppercase",cursor:"pointer",outline:"none"}}>
          {LANGS.map(l=><option key={l.code} value={l.code} style={{color:"#000"}}>{l.flag} {l.label}</option>)}
        </select>
        {settings.instagram&&<a href={settings.instagram} target="_blank" rel="noopener noreferrer" style={{fontSize:10,letterSpacing:2,color:C.MID,textTransform:"uppercase",textDecoration:"none",transition:"color 0.2s"}} onMouseEnter={e=>(e.currentTarget.style.color=C.PL)} onMouseLeave={e=>(e.currentTarget.style.color=C.MID)}>Instagram</a>}
        {settings.youtube&&<a href={settings.youtube} target="_blank" rel="noopener noreferrer" style={{fontSize:10,letterSpacing:2,color:C.MID,textTransform:"uppercase",textDecoration:"none",transition:"color 0.2s"}} onMouseEnter={e=>(e.currentTarget.style.color=C.PL)} onMouseLeave={e=>(e.currentTarget.style.color=C.MID)}>YouTube</a>}
      </div>
    </div>
    <nav role="navigation" aria-label="Main navigation" style={{position:"fixed",top:scrolled?0:32,left:0,right:0,zIndex:500,padding:isMobile?"21px 20px":"23px 40px",display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(9,6,14,0.85)",backdropFilter:"blur(16px)",borderBottom:`1px solid ${C.BORDER}`,transition:"top 0.35s cubic-bezier(.16,.84,.44,1)"}}>
      <div onClick={()=>{goTo("home");setMobileNavOpen(false);}} style={{fontSize:15,letterSpacing:4,textTransform:"uppercase",cursor:"pointer",color:C.FG,fontFamily:"var(--font-serif),'Plus Jakarta Sans',sans-serif"}}>{settings.siteName}</div>

      {isMobile?(
        <button aria-label={mobileNavOpen?"Close menu":"Open menu"} onClick={()=>setMobileNavOpen(o=>!o)} style={{background:"none",border:`1px solid ${C.BORDER}`,color:C.FG,width:40,height:36,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,cursor:"pointer"}}>
          <span style={{display:"block",width:18,height:1,background:C.FG}} />
          <span style={{display:"block",width:18,height:1,background:C.FG}} />
          <span style={{display:"block",width:18,height:1,background:C.FG}} />
        </button>
      ):(
        <div style={{display:"flex",gap:16,alignItems:"center"}}>
          {visibleNavLinks.map(([k,l])=>(
            <span key={k} onClick={()=>goTo(k)} style={{fontSize:11,letterSpacing:3,color:page===k?C.PL:C.MID,textTransform:"uppercase",cursor:"pointer",transition:"color 0.2s",borderBottom:page===k?`1px solid ${C.PL}`:"1px solid transparent",paddingBottom:2}}>{l}</span>
          ))}
          <button onClick={()=>goTo("booking")} style={{...S.btnP,padding:"9px 20px",fontSize:10}} onMouseEnter={e=>(e.currentTarget.style.background=C.PD)} onMouseLeave={e=>(e.currentTarget.style.background=C.P)}>{lang==="en"?settings.uiText.navBookBtn:T.bookBtn}</button>
        </div>
      )}

      {isMobile&&mobileNavOpen&&(
        <div style={{position:"fixed",top:scrolled?78:110,left:0,right:0,bottom:0,background:"rgba(9,6,14,0.97)",zIndex:499,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:26,transition:"top 0.35s cubic-bezier(.16,.84,.44,1)"}}>
          {visibleNavLinks.map(([k,l])=>(
            <span key={k} onClick={()=>{goTo(k);setMobileNavOpen(false);}} style={{fontSize:15,letterSpacing:3,color:page===k?C.PL:C.FG,textTransform:"uppercase",cursor:"pointer"}}>{l}</span>
          ))}
          <button onClick={()=>{goTo("booking");setMobileNavOpen(false);}} style={{...S.btnP,padding:"13px 32px",fontSize:11}}>{lang==="en"?settings.uiText.navBookBtn:T.bookBtn}</button>
        </div>
      )}
    </nav>
    </>
  );

  // ── FOOTER ──
  const Footer=()=>(
    <footer style={{background:"#0C0817",borderTop:`1px solid ${C.BORDER}`}}>
      <div style={{maxWidth:1200,margin:"0 auto",padding:"48px 40px 24px",display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:40}}>
        <div>
          <div style={{fontSize:14,letterSpacing:4,textTransform:"uppercase",color:C.FG,marginBottom:12}}>{settings.siteName}</div>
          <p style={{color:C.MID,fontSize:13,lineHeight:1.7,marginBottom:16,maxWidth:280}}>{settings.siteTagline}</p>
          <div style={{fontSize:13,color:C.MID,marginBottom:6}}>{settings.phone}</div>
          <div style={{fontSize:13,color:C.MID,marginBottom:6}}>{settings.email}</div>
          <div style={{fontSize:13,color:C.MID,marginBottom:16}}>{settings.location}</div>
          <a href={`https://wa.me/${WA}?text=${encodeURIComponent(WA_MSG)}`} target="_blank" style={{...S.btnP,textDecoration:"none",fontSize:10,padding:"8px 20px",display:"inline-block"}}>{lang==="en"?settings.uiText.footerWhatsappBtn:T.whatsappBtn}</a>
        </div>
        <div>
          <div style={{fontSize:10,letterSpacing:4,color:C.PL,textTransform:"uppercase",marginBottom:16}}>Services</div>
          {settings.services.map(sv=><div key={sv.id} onClick={()=>goTo("work")} style={{fontSize:13,color:C.MID,marginBottom:10,cursor:"pointer",transition:"color 0.2s"}} onMouseEnter={e=>(e.currentTarget.style.color=C.PL)} onMouseLeave={e=>(e.currentTarget.style.color=C.MID)}>{sv.title}</div>)}
        </div>
        <div>
          <div style={{fontSize:10,letterSpacing:4,color:C.PL,textTransform:"uppercase",marginBottom:16}}>Quick Links</div>
          {settings.footerLinks.filter(l=>(settings.pageEnabled as Record<string,boolean>|undefined)?.[l.page]!==false).map((l,i)=>{ const tk=PAGE_LABEL_KEY[l.page]; const label=lang==="en"||!tk?l.label:T[tk]; return <div key={i} onClick={()=>goTo(l.page)} style={{fontSize:13,color:C.MID,marginBottom:10,cursor:"pointer",transition:"color 0.2s"}} onMouseEnter={e=>(e.currentTarget.style.color=C.PL)} onMouseLeave={e=>(e.currentTarget.style.color=C.MID)}>{label}</div>; })}
        </div>
        <div>
          <div style={{fontSize:10,letterSpacing:4,color:C.PL,textTransform:"uppercase",marginBottom:16}}>Follow</div>
          {settings.instagram&&<a href={settings.instagram} target="_blank" rel="noopener noreferrer" style={{display:"block",fontSize:13,color:C.MID,marginBottom:10,textDecoration:"none",transition:"color 0.2s"}} onMouseEnter={e=>(e.currentTarget.style.color=C.PL)} onMouseLeave={e=>(e.currentTarget.style.color=C.MID)}>Instagram</a>}
          {settings.youtube&&<a href={settings.youtube} target="_blank" rel="noopener noreferrer" style={{display:"block",fontSize:13,color:C.MID,marginBottom:10,textDecoration:"none",transition:"color 0.2s"}} onMouseEnter={e=>(e.currentTarget.style.color=C.PL)} onMouseLeave={e=>(e.currentTarget.style.color=C.MID)}>YouTube</a>}
          {settings.linkedin&&<a href={settings.linkedin} target="_blank" rel="noopener noreferrer" style={{display:"block",fontSize:13,color:C.MID,marginBottom:10,textDecoration:"none",transition:"color 0.2s"}} onMouseEnter={e=>(e.currentTarget.style.color=C.PL)} onMouseLeave={e=>(e.currentTarget.style.color=C.MID)}>LinkedIn</a>}
          {settings.tiktok&&<a href={settings.tiktok} target="_blank" rel="noopener noreferrer" style={{display:"block",fontSize:13,color:C.MID,marginBottom:10,textDecoration:"none",transition:"color 0.2s"}} onMouseEnter={e=>(e.currentTarget.style.color=C.PL)} onMouseLeave={e=>(e.currentTarget.style.color=C.MID)}>TikTok</a>}
        </div>
      </div>
      <div style={{borderTop:`1px solid ${C.BORDER}`,padding:"16px 40px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
        <div style={{fontSize:11,letterSpacing:2,color:"#2a2a3a",textTransform:"uppercase"}}>{settings.footerCopyright}</div>
        <div style={{display:"flex",gap:16}}>
          {["work","about","booking","contact"].filter(l=>(settings.pageEnabled as Record<string,boolean>|undefined)?.[l]!==false).map(l=><span key={l} onClick={()=>goTo(l)} style={{fontSize:10,letterSpacing:2,color:"#2a2a3a",textTransform:"uppercase",cursor:"pointer",transition:"color 0.2s"}} onMouseEnter={e=>(e.currentTarget.style.color=C.PL)} onMouseLeave={e=>(e.currentTarget.style.color="#2a2a3a")}>{l}</span>)}
        </div>
      </div>
    </footer>
  );

  // ── CMS ──
  if(cms){
    if(!authed) return(
      <div style={{...S.base,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{textAlign:"center",width:320}}>
          <div style={{fontSize:11,letterSpacing:6,color:C.MID,marginBottom:32,textTransform:"uppercase"}}>Admin Access</div>
          <input type="password" value={pin} onChange={e=>setPin(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handlePin()} placeholder="PIN" style={{...S.inp,textAlign:"center",fontSize:28,letterSpacing:10,marginBottom:16}} />
          {pinErr&&<div style={{color:"#e74c3c",fontSize:12,marginBottom:12}}>{Date.now()<pinLockUntil?"Too many attempts — try again in a minute.":"Incorrect PIN"}</div>}
          <button onClick={handlePin} style={{...S.btnP,width:"100%"}}>Enter</button>
          <div onClick={()=>setCms(false)} style={{marginTop:20,color:"#444",fontSize:11,letterSpacing:2,cursor:"pointer",textTransform:"uppercase"}}>← Back</div>
        </div>
      </div>
    );

    const TABS=[["projects","📁 Projects"],["categories","🏷 Categories"],["testimonials","⭐ Testimonials"],["blog","📝 Blog"],["leads","📥 Leads"],["settings","⚙️ Settings"]];

    return(
      <div style={S.base}>
        <div style={{background:"#0a0a16",borderBottom:`1px solid ${C.BORDER}`,padding:"14px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:10}}>
          <div style={{display:"flex",gap:4,alignItems:"center",flexWrap:"wrap"}}>
            <span style={{fontSize:11,letterSpacing:4,textTransform:"uppercase",color:C.PL,marginRight:8}}>CMS</span>
            {TABS.map(([k,l])=><button key={k} onClick={()=>setCmsTab(k)} style={{...S.btnSm,background:cmsTab===k?C.P:"#1a1a2e",marginRight:4}}>{l}</button>)}
          </div>
          <div style={{display:"flex",gap:12}}>
            {cmsTab==="projects"&&<button onClick={()=>startEdit(null)} style={S.btnP}>+ New Project</button>}
            <button onClick={()=>{setCms(false);setAuthed(false);}} style={S.btnO}>Exit</button>
          </div>
        </div>

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

        {/* SETTINGS TAB */}
        {cmsTab==="settings"&&(
          <div style={{maxWidth:800,margin:"0 auto",padding:"32px 24px"}}>
            <div style={{display:"flex",gap:8,marginBottom:24,flexWrap:"wrap"}}>
              {[["general","General"],["hero","Hero Slides"],["about","About"],["services","Services"],["cv","CV & Skills"],["footer","Footer"],["seo","SEO"],["contact","Contact"],["popup","Popup"],["colors","🎨 Colors"],["text","🔤 Text & Banners"],["pages","🔀 Pages"],["pricing","💳 Packages"]].map(([k,l])=>(
                <button key={k} onClick={()=>setSettingsTab(k)} style={{...S.btnSm,background:settingsTab===k?C.P:"#1a1a2e"}}>{l}</button>
              ))}
            </div>

            {settingsTab==="general"&&(
              <div>
                <div style={{fontSize:11,letterSpacing:4,color:C.MID,marginBottom:20,textTransform:"uppercase"}}>General Settings</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                  <div><label style={S.lbl}>Site Name</label><input style={S.inp} value={settingsDraft.siteName} onChange={e=>updateSD({siteName:e.target.value})} /></div>
                  <div><label style={S.lbl}>Tagline</label><input style={S.inp} value={settingsDraft.siteTagline} onChange={e=>updateSD({siteTagline:e.target.value})} /></div>
                  <div><label style={S.lbl}>Admin PIN</label><input style={S.inp} value={settingsDraft.pin} onChange={e=>updateSD({pin:e.target.value})} /></div>
                  <div><label style={S.lbl}>Stats: Years</label><input style={S.inp} value={settingsDraft.statsYears} onChange={e=>updateSD({statsYears:e.target.value})} /></div>
                  <div><label style={S.lbl}>Stats: Projects</label><input style={S.inp} value={settingsDraft.statsProjects} onChange={e=>updateSD({statsProjects:e.target.value})} /></div>
                  <div><label style={S.lbl}>Stats: Clients</label><input style={S.inp} value={settingsDraft.statsClients} onChange={e=>updateSD({statsClients:e.target.value})} /></div>
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
                </div>
                <div style={{marginTop:16}}><label style={S.lbl}>WhatsApp Default Message</label><textarea style={{...S.inp,height:70,resize:"vertical" as const}} value={settingsDraft.waMsg} onChange={e=>updateSD({waMsg:e.target.value})} /></div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginTop:16}}>
                  <div><label style={S.lbl}>Instagram URL</label><input style={S.inp} value={settingsDraft.instagram} onChange={e=>updateSD({instagram:e.target.value})} /></div>
                  <div><label style={S.lbl}>YouTube URL</label><input style={S.inp} value={settingsDraft.youtube} onChange={e=>updateSD({youtube:e.target.value})} /></div>
                  <div><label style={S.lbl}>LinkedIn URL</label><input style={S.inp} value={settingsDraft.linkedin} onChange={e=>updateSD({linkedin:e.target.value})} /></div>
                  <div><label style={S.lbl}>TikTok URL</label><input style={S.inp} value={settingsDraft.tiktok} onChange={e=>updateSD({tiktok:e.target.value})} /></div>
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
                  ["work","Work"],["about","About"],["packages","Packages"],["blog","Journal"],["cv","CV"],["booking","Booking"],["contact","Contact"],
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
                  ["work","Work"],["about","About"],["packages","Packages"],["blog","Journal"],["cv","CV"],["booking","Booking"],["contact","Contact"],
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
              <input style={{...S.inp,flex:1}} value={newCat} onChange={e=>setNewCat(e.target.value)} placeholder="New category" onKeyDown={e=>{if(e.key==="Enter"&&newCat.trim()){setCats(c=>[...c,newCat.trim()]);setNewCat("");}}} />
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
              <input style={{...S.inp,flex:1}} value={newBlogCat} onChange={e=>setNewBlogCat(e.target.value)} placeholder="New journal category" onKeyDown={e=>{if(e.key==="Enter"&&newBlogCat.trim()){setBlogCats(c=>[...c,newBlogCat.trim()]);setNewBlogCat("");}}} />
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
                <SingleImageUpload value={b.coverImage} onChange={url=>setBlog(bs=>bs.map((x,idx)=>idx===i?{...x,coverImage:url}:x))} label="Cover Image" />
                <div style={{marginBottom:12}}><label style={S.lbl}>Excerpt</label><textarea style={{...S.inp,height:70,resize:"vertical" as const}} value={b.excerpt} onChange={e=>setBlog(bs=>bs.map((x,idx)=>idx===i?{...x,excerpt:e.target.value}:x))} /></div>
                <div style={{marginBottom:12}}><label style={S.lbl}>Full Content</label><textarea style={{...S.inp,height:160,resize:"vertical" as const}} value={b.content} onChange={e=>setBlog(bs=>bs.map((x,idx)=>idx===i?{...x,content:e.target.value}:x))} placeholder="Full article content..." /></div>
                <button onClick={()=>setBlog(bs=>bs.filter((_,idx)=>idx!==i))} style={{background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:11,letterSpacing:2,textTransform:"uppercase" as const}}>Remove</button>
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
                  <button onClick={e=>{e.stopPropagation();if(confirm("Delete?"))setProjects(ps=>ps.filter(x=>x.id!==p.id));}} style={{background:"none",border:"none",color:"#444",cursor:"pointer"}}>✕</button>
                </div>
              ))}
            </div>
            <div style={{flex:1,padding:32,overflowY:"auto",maxHeight:"calc(100vh - 60px)"}}>
              {editId?(
                <div style={{maxWidth:720}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
                    <div><label style={S.lbl}>Title *</label><input style={S.inp} value={form.title||""} onChange={e=>setForm(f=>({...f,title:e.target.value,slug:slugify(e.target.value)}))} /></div>
                    <div><label style={S.lbl}>Slug</label><input style={S.inp} value={form.slug||""} onChange={e=>setForm(f=>({...f,slug:e.target.value}))} /></div>
                    <div><label style={S.lbl}>Client</label><input style={S.inp} value={form.clientName||""} onChange={e=>setForm(f=>({...f,clientName:e.target.value}))} /></div>
                    <div><label style={S.lbl}>Location</label><input style={S.inp} value={form.location||""} onChange={e=>setForm(f=>({...f,location:e.target.value}))} /></div>
                    <div><label style={S.lbl}>Date</label><input type="date" style={S.inp} value={form.projectDate||""} onChange={e=>setForm(f=>({...f,projectDate:e.target.value}))} /></div>
                    <div><label style={S.lbl}>YouTube URL</label><input style={S.inp} value={form.youtubeUrl||""} onChange={e=>setForm(f=>({...f,youtubeUrl:e.target.value}))} /></div>
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
                        <input style={{...S.inp,flex:1}} value={newImg} onChange={e=>setNewImg(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addImgUrl()} placeholder="or paste URL..." />
                        <button onClick={addImgUrl} style={S.btnP}>{addingImg?"...":"Add URL"}</button>
                      </div>
                    </div>
                    <div style={{fontSize:10,color:"#444",marginBottom:8}}>P = Portrait · L = Landscape · Click Cover to set cover photo</div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6,marginBottom:16}}>
                    {(form.images||[]).map((img,i)=>(
                      <div key={i} style={{position:"relative",aspectRatio:"1",overflow:"hidden",background:"#0d0d18"}}>
                        <img src={img.url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} />
                        <div style={{position:"absolute",top:2,right:2,background:"rgba(0,0,0,0.8)",color:img.orientation==="portrait"?C.PL:"#7ec8e3",fontSize:8,padding:"1px 4px"}}>{img.orientation==="portrait"?"P":"L"}</div>
                        <button onClick={()=>setForm(f=>({...f,images:f.images.filter((_,idx)=>idx!==i)}))} style={{position:"absolute",top:2,left:2,background:"rgba(0,0,0,0.8)",border:"none",color:"#fff",cursor:"pointer",fontSize:10}}>✕</button>
                        <button onClick={()=>setForm(f=>({...f,coverImage:img.url}))} style={{position:"absolute",bottom:2,left:2,background:form.coverImage===img.url?C.P:"rgba(0,0,0,0.8)",border:"none",color:"#fff",cursor:"pointer",fontSize:8,padding:"1px 4px"}}>Cover</button>
                      </div>
                    ))}
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
        {cropSrc&&<CropModal src={cropSrc} onCancel={()=>setCropSrc(null)} onConfirm={async(file)=>{ const url=await uploadToStorage(file); setForm(f=>({...f,coverImage:url})); setCropSrc(null); }} />}
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
          <div style={{display:"flex",gap:24,color:C.MID,fontSize:12,marginBottom:32,flexWrap:"wrap"}}>
            {selProj.location&&<span>📍 {selProj.location}</span>}
            {selProj.projectDate&&<span>📅 {selProj.projectDate}</span>}
            {selProj.clientName&&<span>👤 {selProj.clientName}</span>}
          </div>
          {selProj.description&&<p style={{color:C.MID,fontSize:15,lineHeight:1.9,maxWidth:680,marginBottom:48}}>{selProj.description}</p>}
          {ytId&&<div style={{marginBottom:48,aspectRatio:"16/9",maxWidth:900}}><iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${ytId}`} frameBorder={0} allowFullScreen style={{display:"block"}} /></div>}
          {selProj.images?.length>0&&<div style={{marginBottom:48}}><SmartGrid images={selProj.images} onClick={i=>setLb({open:true,index:i})} /></div>}
          {selProj.reels?.length>0&&<div style={{marginBottom:48,display:"flex",gap:12,flexWrap:"wrap"}}>{selProj.reels.map((r,i)=><a key={i} href={r} target="_blank" rel="noopener noreferrer" style={{...S.btnO,textDecoration:"none"}}>View Reel {i+1}</a>)}</div>}
          <div style={{marginTop:48,paddingTop:48,borderTop:`1px solid ${C.BORDER}`}}>
            <div style={{fontSize:10,letterSpacing:5,color:C.PL,textTransform:"uppercase",marginBottom:20}}>Related Projects</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:3}}>
              {projects.filter(p=>p.id!==selProj.id&&p.categories?.some(c=>selProj.categories?.includes(c))).slice(0,3).map(p=>(
                <div key={p.id} onClick={()=>openProj(p)} style={{cursor:"pointer",aspectRatio:"4/3",overflow:"hidden",position:"relative",background:C.DARK}}>
                  <img src={p.coverImage||""} alt={p.title} loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover",transition:"transform 0.5s"}} onMouseEnter={e=>(e.currentTarget.style.transform="scale(1.05)")} onMouseLeave={e=>(e.currentTarget.style.transform="scale(1)")} />
                  <div style={{position:"absolute",bottom:0,left:0,right:0,padding:16,background:"linear-gradient(to top,rgba(9,6,14,0.9),transparent)"}}><div style={{fontSize:13,color:"#fff"}}>{p.title}</div></div>
                </div>
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
      <div style={{maxWidth:1200,margin:"0 auto",padding:"134px 40px 80px"}}>
        <div style={{...S.tag(),marginBottom:12}}><span style={{width:24,height:1,background:C.PL,display:"inline-block"}} />Journal</div>
        <h1 style={{fontSize:"clamp(32px,4.5vw,56px)",fontWeight:700,letterSpacing:1,margin:"0 0 32px"}}>Photography Journal</h1>
        <div style={{display:"flex",gap:24,flexWrap:"wrap",marginBottom:48}}>
          <span onClick={()=>setBlogFilterCat("All")} style={{fontSize:10,letterSpacing:3,textTransform:"uppercase",cursor:"pointer",color:blogFilterCat==="All"?C.PL:C.MID,borderBottom:blogFilterCat==="All"?`1px solid ${C.PL}`:"1px solid transparent",paddingBottom:4,transition:"color 0.2s"}}>All ({blog.length})</span>
          {blogCats.map(c=>{ const cnt=blog.filter(b=>b.category===c).length; if(!cnt) return null; return <span key={c} onClick={()=>setBlogFilterCat(c)} style={{fontSize:10,letterSpacing:3,textTransform:"uppercase",cursor:"pointer",color:blogFilterCat===c?C.PL:C.MID,borderBottom:blogFilterCat===c?`1px solid ${C.PL}`:"1px solid transparent",paddingBottom:4,transition:"color 0.2s"}}>{c} ({cnt})</span>; })}
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
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:24}}>
          {settings.services.map(sv=>(
            <div key={sv.id} className="tcard" style={{background:C.DARK,border:`1px solid ${C.BORDER}`,borderRadius:4,padding:32,display:"flex",flexDirection:"column"}}>
              <div style={{width:44,height:44,borderRadius:4,background:"rgba(139,92,246,0.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,marginBottom:20}}>{sv.icon}</div>
              <h3 style={{fontSize:19,fontWeight:700,letterSpacing:0.3,margin:"0 0 8px"}}>{sv.title}</h3>
              <p style={{color:C.MID,fontSize:13,lineHeight:1.7,margin:"0 0 20px"}}>{sv.desc}</p>
              <div style={{flex:1,marginBottom:24}}>
                {sv.deliverables.map((d,j)=>(
                  <div key={j} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"7px 0",fontSize:13,color:C.FG}}>
                    <span style={{color:C.PL,flexShrink:0}}>✓</span>{d}
                  </div>
                ))}
              </div>
              <div style={{display:"flex",gap:10,flexWrap:"wrap",paddingTop:20,borderTop:`1px solid ${C.BORDER}`}}>
                <a href={`https://wa.me/${WA}?text=${encodeURIComponent(`Hello ${settings.siteName}! I'd like to enquire about your ${sv.title} package.`)}`} target="_blank" rel="noopener noreferrer" style={{...S.btnP,padding:"10px 18px",fontSize:11,textDecoration:"none"}}>Enquire Now</a>
                <button onClick={()=>goTo("booking")} style={{...S.btnO,padding:"10px 18px",fontSize:11}}>Book Now</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Footer /><FloatingWA num={WA} msg={WA_MSG} />
      <ConsultPopup open={popupOpen} onClose={closePopup} title={settings.popupTitle} text={settings.popupText} ctaLabel={settings.popupCtaLabel} waNumber={WA} />
    </div>
  );

  // ── CV ──
  if(page==="cv") return(
    <div key={page} className="pg-fade" style={{...S.base,animation:"pgFadeIn 0.55s cubic-bezier(.16,.84,.44,1) both"}}>
      <Nav />
      <PageBanner eyebrow={settings.uiText.cvBannerEyebrow} title={settings.uiText.cvBannerTitle} image={settings.sectionBg.cv} />
      <div style={{maxWidth:900,margin:"0 auto",padding:"40px 40px 80px"}}>
        <div style={{textAlign:"center",marginBottom:64}}>
          <div style={{...S.tag(true),marginBottom:16}}><span style={{width:32,height:1,background:C.PL,display:"inline-block"}} />Curriculum Vitae<span style={{width:32,height:1,background:C.PL,display:"inline-block"}} /></div>
          <h1 style={{fontSize:"clamp(36px,5.5vw,64px)",fontWeight:700,letterSpacing:1,margin:"0 0 12px"}}>{settings.aboutName}</h1>
          <p style={{color:C.MID,fontSize:14,letterSpacing:2}}>{settings.aboutTitle}</p>
          <p style={{color:C.MID,fontSize:13,marginTop:8}}>{settings.phone} · {settings.email}</p>
          <div style={{display:"flex",justifyContent:"center",gap:16,marginTop:24}}>
            <a href={`https://wa.me/${WA}`} target="_blank" style={{...S.btnP,textDecoration:"none"}}>WhatsApp</a>
            <button onClick={()=>goTo("booking")} style={S.btnO}>Book Now</button>
          </div>
        </div>
        {settings.cvSections.map((sec,i)=>(
          <div key={i} style={{marginBottom:40,paddingBottom:40,borderBottom:`1px solid ${C.BORDER}`}}>
            <div style={{...S.tag(),marginBottom:12}}><span style={{width:20,height:1,background:C.PL,display:"inline-block"}} />{sec.title}</div>
            <p style={{color:C.MID,fontSize:14,lineHeight:1.9,margin:0}}>{sec.content}</p>
          </div>
        ))}
        {settings.skills.length>0&&(
          <div style={{marginBottom:40,paddingBottom:40,borderBottom:`1px solid ${C.BORDER}`}}>
            <div style={{...S.tag(),marginBottom:24}}><span style={{width:20,height:1,background:C.PL,display:"inline-block"}} />Skills by Department</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:24}}>
              {settings.skills.map((sk,i)=>(
                <div key={i}>
                  <div style={{fontSize:11,letterSpacing:3,color:C.PL,textTransform:"uppercase",marginBottom:12}}>{sk.dept}</div>
                  {sk.items.map((item,j)=><div key={j} style={{fontSize:13,color:C.MID,padding:"6px 0",borderBottom:`1px solid ${C.BORDER}`}}>→ {item}</div>)}
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{textAlign:"center",paddingTop:16,display:"flex",justifyContent:"center",gap:16}}>
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
      <PageBanner eyebrow={settings.uiText.bookingBannerEyebrow} title={settings.uiText.bookingBannerTitle} image={settings.sectionBg.booking} />
      <div style={{maxWidth:720,margin:"0 auto",padding:"40px 40px 80px"}}>
        <div style={{textAlign:"center",marginBottom:56}}>
          <div style={{...S.tag(true),marginBottom:16}}><span style={{width:32,height:1,background:C.PL,display:"inline-block"}} />Book a Session</div>
          <h1 style={{fontSize:"clamp(32px,4.5vw,56px)",fontWeight:700,letterSpacing:1,margin:"0 0 12px"}}>Let's Create Together</h1>
          <p style={{color:C.MID,fontSize:14}}>Fill in the details below or message directly on WhatsApp</p>
        </div>
        {bookingDone?(
          <div style={{textAlign:"center",padding:64}}>
            <div style={{fontSize:48,color:C.PL,marginBottom:16}}>✓</div>
            <h2 style={{fontWeight:700,letterSpacing:0.5,marginBottom:12}}>Request Sent!</h2>
            <p style={{color:C.MID}}>Your booking request has been sent via WhatsApp. Naveed will respond shortly.</p>
            <button onClick={()=>{setBookingDone(false);setBooking({name:"",email:"",phone:"",service:"",date:"",time:"",location:"",details:"",budget:"",agreed:false});}} style={{...S.btnO,marginTop:24}}>New Request</button>
          </div>
        ):(
          <div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
              <div><label style={S.lbl}>Full Name *</label><input style={S.inp} value={booking.name} onChange={e=>setBooking(b=>({...b,name:e.target.value}))} /></div>
              <div><label style={S.lbl}>Email</label><input type="email" style={S.inp} value={booking.email} onChange={e=>setBooking(b=>({...b,email:e.target.value}))} /></div>
              <div><label style={S.lbl}>Phone / WhatsApp</label><input style={S.inp} value={booking.phone} onChange={e=>setBooking(b=>({...b,phone:e.target.value}))} /></div>
              <div><label style={S.lbl}>Service *</label><select style={S.inp} value={booking.service} onChange={e=>setBooking(b=>({...b,service:e.target.value}))}><option value="">Select...</option>{BOOKING_SERVICES.map(sv=><option key={sv}>{sv}</option>)}</select></div>
              <div><label style={S.lbl}>Preferred Date *</label><input type="date" style={S.inp} value={booking.date} onChange={e=>setBooking(b=>({...b,date:e.target.value}))} /></div>
              <div><label style={S.lbl}>Preferred Time</label><select style={S.inp} value={booking.time} onChange={e=>setBooking(b=>({...b,time:e.target.value}))}><option value="">Select...</option>{TIMES.map(t=><option key={t}>{t}</option>)}</select></div>
            </div>
            <div style={{marginBottom:16}}><label style={S.lbl}>Location / Venue</label><input style={S.inp} value={booking.location} onChange={e=>setBooking(b=>({...b,location:e.target.value}))} placeholder="Dubai Marina, Studio, etc." /></div>
            <div style={{marginBottom:16}}><label style={S.lbl}>Budget (AED)</label><input style={S.inp} value={booking.budget} onChange={e=>setBooking(b=>({...b,budget:e.target.value}))} placeholder="e.g. 2000–5000 AED" /></div>
            <div style={{marginBottom:24}}><label style={S.lbl}>Project Details</label><textarea style={{...S.inp,height:100,resize:"vertical" as const}} value={booking.details} onChange={e=>setBooking(b=>({...b,details:e.target.value}))} placeholder="Describe your project..." /></div>
            <div style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:32}}>
              <input type="checkbox" checked={booking.agreed} onChange={e=>setBooking(b=>({...b,agreed:e.target.checked}))} style={{marginTop:2}} />
              <span style={{fontSize:12,color:C.MID,lineHeight:1.6}}>I agree to the Terms & Conditions and Booking Agreement.</span>
            </div>
            <div style={{display:"flex",gap:12}}>
              <button onClick={submitBooking} disabled={!booking.name||!booking.service||!booking.date||!booking.agreed} style={{...S.btnP,opacity:(!booking.name||!booking.service||!booking.date||!booking.agreed)?0.4:1}}>Send via WhatsApp</button>
              <a href={`https://wa.me/${WA}?text=${encodeURIComponent(WA_MSG)}`} target="_blank" style={{...S.btnO,textDecoration:"none"}}>Direct WhatsApp</a>
            </div>
          </div>
        )}
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
            <h1 style={{fontSize:"clamp(32px,4.5vw,56px)",fontWeight:700,letterSpacing:1,margin:"0 0 16px"}}>{settings.aboutName}</h1>
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
              <img src={settings.aboutPhoto} alt={settings.aboutName} style={{width:"100%",height:"100%",objectFit:"cover"}} />
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
      <PageBanner eyebrow={settings.uiText.workBannerEyebrow} title={settings.uiText.workBannerTitle} image={settings.sectionBg.work} />
      <div style={{maxWidth:1400,margin:"0 auto",padding:"40px 32px 80px"}}>
        <div style={{marginBottom:48}}>
          <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
            <span onClick={()=>setFilterCat("All")} style={{fontSize:10,letterSpacing:3,textTransform:"uppercase",cursor:"pointer",color:filterCat==="All"?C.PL:C.MID,borderBottom:filterCat==="All"?`1px solid ${C.PL}`:"1px solid transparent",paddingBottom:4,transition:"color 0.2s"}}>All ({projects.length})</span>
            {cats.map(c=>{ const cnt=projects.filter(p=>p.categories?.includes(c)).length; if(!cnt) return null; return <span key={c} onClick={()=>setFilterCat(c)} style={{fontSize:10,letterSpacing:3,textTransform:"uppercase",cursor:"pointer",color:filterCat===c?C.PL:C.MID,borderBottom:filterCat===c?`1px solid ${C.PL}`:"1px solid transparent",paddingBottom:4,transition:"color 0.2s"}}>{c} ({cnt})</span>; })}
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(360px,1fr))",gap:3}}>
          {filtered.map(p=>(
            <div key={p.id} onClick={()=>openProj(p)} style={{position:"relative",cursor:"pointer",overflow:"hidden",aspectRatio:"4/3",background:C.DARK}}
              onMouseEnter={e=>{ (e.currentTarget.querySelector("img") as HTMLElement).style.transform="scale(1.06)"; (e.currentTarget.querySelector(".ov") as HTMLElement).style.opacity="1"; }}
              onMouseLeave={e=>{ (e.currentTarget.querySelector("img") as HTMLElement).style.transform="scale(1)"; (e.currentTarget.querySelector(".ov") as HTMLElement).style.opacity="0"; }}>
              <img src={p.coverImage||p.images?.[0]?.url||""} alt={p.title} loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover",display:"block",transition:"transform 0.6s"}} />
              <div className="ov" style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(9,6,14,0.92) 0%,transparent 55%)",opacity:0,transition:"opacity 0.3s",display:"flex",flexDirection:"column",justifyContent:"flex-end",padding:24}}>
                <div style={{fontSize:10,letterSpacing:3,color:C.PL,textTransform:"uppercase",marginBottom:6}}>{p.categories?.join(" · ")}</div>
                <div style={{fontSize:18,letterSpacing:2,color:"#fff"}}>{p.title}</div>
                {p.location&&<div style={{fontSize:11,color:C.MID,marginTop:4}}>📍 {p.location}</div>}
              </div>
              {p.featured&&<div style={{position:"absolute",top:14,right:14,background:C.P,color:"#fff",fontSize:9,letterSpacing:2,padding:"3px 8px",textTransform:"uppercase"}}>Featured</div>}
            </div>
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
      <Nav />
      <Hero slides={settings.heroSlides} onNav={goTo} waNumber={WA} typography={settings.heroTypography} />

      {/* INTRO STRIP */}
      <div style={{background:C.DARK,padding:"24px 40px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:16}}>
        <div>
          <div style={{fontSize:14,letterSpacing:4,textTransform:"uppercase",color:C.FG}}>{settings.siteName}</div>
          <div style={{fontSize:12,color:C.MID,letterSpacing:1,marginTop:4}}>{settings.aboutTitle} · {settings.location}</div>
        </div>
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

      {/* FEATURED WORK */}
      {featured.length>0&&(
        <div style={{maxWidth:1400,margin:"0 auto",padding:"64px 32px"}}>
          <Reveal style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:36}}>
            <div>
              <div style={{...S.tag(),marginBottom:8}}><span style={{width:24,height:1,background:C.PL,display:"inline-block"}} />{settings.uiText.homeWorkEyebrow}</div>
              <h2 style={{fontSize:"clamp(28px,4vw,56px)",fontWeight:700,letterSpacing:1,margin:0}}>{settings.uiText.homeWorkTitle}</h2>
            </div>
            <span onClick={()=>goTo("work")} style={{fontSize:10,letterSpacing:3,color:C.PL,textTransform:"uppercase",cursor:"pointer",borderBottom:`1px solid ${C.PL}`,paddingBottom:2}}>{settings.uiText.homeWorkViewAll}</span>
          </Reveal>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:3}}>
            {featured.slice(0,1).map(p=>(
              <Reveal key={p.id} style={{gridColumn:"1/3"}}>
              <div onClick={()=>openProj(p)} style={{position:"relative",cursor:"pointer",overflow:"hidden",aspectRatio:"16/9",background:C.DARK}}
                onMouseEnter={e=>{ (e.currentTarget.querySelector("img") as HTMLElement).style.transform="scale(1.04)"; (e.currentTarget.querySelector(".ov") as HTMLElement).style.opacity="1"; }}
                onMouseLeave={e=>{ (e.currentTarget.querySelector("img") as HTMLElement).style.transform="scale(1)"; (e.currentTarget.querySelector(".ov") as HTMLElement).style.opacity="0"; }}>
                <img src={p.coverImage||""} alt={p.title} style={{width:"100%",height:"100%",objectFit:"cover",transition:"transform 0.7s cubic-bezier(.16,.84,.44,1)"}} />
                <div className="ov" style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(9,6,14,0.9),transparent 50%)",opacity:0,transition:"opacity 0.3s",display:"flex",flexDirection:"column",justifyContent:"flex-end",padding:32}}>
                  <div style={{fontSize:10,letterSpacing:4,color:C.PL,textTransform:"uppercase",marginBottom:8}}>{p.categories?.join(" · ")}</div>
                  <div style={{fontSize:22,letterSpacing:2,color:"#fff"}}>{p.title}</div>
                </div>
              </div>
              </Reveal>
            ))}
            {featured.slice(1,4).map((p,idx)=>(
              <Reveal key={p.id} delay={0.1+idx*0.08}>
              <div onClick={()=>openProj(p)} style={{position:"relative",cursor:"pointer",overflow:"hidden",aspectRatio:"4/3",background:C.DARK}}
                onMouseEnter={e=>{ (e.currentTarget.querySelector("img") as HTMLElement).style.transform="scale(1.05)"; (e.currentTarget.querySelector(".ov") as HTMLElement).style.opacity="1"; }}
                onMouseLeave={e=>{ (e.currentTarget.querySelector("img") as HTMLElement).style.transform="scale(1)"; (e.currentTarget.querySelector(".ov") as HTMLElement).style.opacity="0"; }}>
                <img src={p.coverImage||""} alt={p.title} loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover",transition:"transform 0.6s cubic-bezier(.16,.84,.44,1)"}} />
                <div className="ov" style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(9,6,14,0.9),transparent 50%)",opacity:0,transition:"opacity 0.3s",display:"flex",flexDirection:"column",justifyContent:"flex-end",padding:20}}>
                  <div style={{fontSize:9,letterSpacing:3,color:C.PL,textTransform:"uppercase",marginBottom:4}}>{p.categories?.[0]}</div>
                  <div style={{fontSize:15,letterSpacing:1,color:"#fff"}}>{p.title}</div>
                </div>
              </div>
              </Reveal>
            ))}
          </div>
        </div>
      )}

      {/* SERVICES -- editorial index list, but each row is bookended by a solid-DARK chip
          (number + arrow). The chips are the same DARK used in the hero/nav, so the light
          section reads as this site's light register, not a different site pasted in --
          exactly how creativefusion.llc threads its dark charcoal through its white sections
          via repeated dark card elements. */}
      <div style={{background:C.LT,padding:"110px 40px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:"-10%",right:"-8%",width:480,height:480,borderRadius:"50%",background:"radial-gradient(circle,rgba(139,92,246,0.16),transparent 70%)",filter:"blur(10px)",pointerEvents:"none"}} />
        <div style={{maxWidth:1160,margin:"0 auto",position:"relative"}}>
          <Reveal style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",gap:24,flexWrap:"wrap",marginBottom:64}}>
            <div>
              <div style={{...S.tag(),marginBottom:14,color:C.P}}><span style={{width:24,height:1,background:C.P,display:"inline-block"}} />{settings.uiText.homeServicesEyebrow}</div>
              <h2 style={{fontSize:"clamp(30px,4vw,52px)",fontWeight:700,letterSpacing:0.5,margin:0,color:C.DARK}}>{settings.uiText.homeServicesTitle}</h2>
            </div>
            <p style={{maxWidth:340,fontSize:13,color:C.INKMID,lineHeight:1.8,margin:0}}>{settings.uiText.homeServicesIntro}</p>
          </Reveal>
          <div>
            {settings.services.map((sv,i)=>(
              <Reveal key={sv.id} delay={i*0.07}>
              <div className="svc-row" onClick={()=>goTo("packages")} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:28,padding:"28px 6px",borderTop:i===0?`1px solid ${C.LTBORDER}`:"none",borderBottom:`1px solid ${C.LTBORDER}`,cursor:"pointer"}}>
                <div style={{display:"flex",alignItems:"center",gap:26,minWidth:0}}>
                  <span style={{width:42,height:42,borderRadius:4,background:C.DARK,color:C.P,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,letterSpacing:0.5,flexShrink:0}}>{String(i+1).padStart(2,"0")}</span>
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

      {/* TESTIMONIALS -- a pull-quote spotlight held inside a bordered panel (not bare floating
          text) with a solid-DARK quote badge, echoing the Services chips so this section reads
          as part of the same design language. Auto-rotates like the Hero slideshow. */}
      {featuredTesti.length>0&&(
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

      {/* BLOG PREVIEW */}
      {blog.length>0&&(
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
      <Reveal style={{textAlign:"center",padding:"64px 32px",background:`linear-gradient(135deg,${C.BG} 0%,${C.DARK} 50%,${C.BG} 100%)`}}>
        <div style={{...S.tag(true),marginBottom:12}}><span style={{width:32,height:1,background:C.PL,display:"inline-block"}} />{settings.uiText.homeCtaEyebrow}</div>
        <h2 style={{fontSize:"clamp(26px,3.5vw,44px)",fontWeight:700,letterSpacing:1,margin:"0 0 12px"}}>{settings.uiText.homeCtaTitle}</h2>
        <p style={{color:C.MID,fontSize:14,marginBottom:36}}>Based in {settings.location} · Available across UAE, GCC & internationally</p>
        <div style={{display:"flex",gap:16,justifyContent:"center",flexWrap:"wrap"}}>
          <button onClick={()=>goTo("booking")} style={S.btnP} onMouseEnter={e=>(e.currentTarget.style.background=C.PD)} onMouseLeave={e=>(e.currentTarget.style.background=C.P)}>{settings.uiText.homeCtaBookBtn}</button>
          <a href={`https://wa.me/${WA}?text=${encodeURIComponent(WA_MSG)}`} target="_blank" style={{...S.btnO,textDecoration:"none"}}>{settings.uiText.homeCtaWaBtn}</a>
        </div>
      </Reveal>

      <Footer />
      <FloatingWA num={WA} msg={WA_MSG} />
      <ConsultPopup open={popupOpen} onClose={closePopup} title={settings.popupTitle} text={settings.popupText} ctaLabel={settings.popupCtaLabel} waNumber={WA} />
    </div>
  );
}