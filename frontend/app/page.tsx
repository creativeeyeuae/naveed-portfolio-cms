"use client";
import { useState, useEffect, useRef } from "react";

// ─── TYPES ──────────────────────────────────────────────────────────────────
type Img = { url: string; orientation: string };
type Project = { id:string;title:string;slug:string;categories:string[];description:string;fullDescription:string;clientName:string;location:string;projectDate:string;tags:string[];featured:boolean;coverImage:string;images:Img[];videos:string[];reels:string[];youtubeUrl:string; };
type Testimonial = { id:string;name:string;role:string;company:string;quote:string;featured:boolean; };
type BlogPost = { id:string;title:string;slug:string;excerpt:string;date:string;category:string;coverImage:string;content:string; };
type Service = { id:string;icon:string;title:string;desc:string;detail:string;deliverables:string[]; };
type SiteSettings = {
  pin:string; siteName:string; siteTagline:string; siteDescription:string;
  heroSlides:HeroSlide[]; aboutName:string; aboutTitle:string; aboutBio:string; aboutPhoto:string;
  statsYears:string; statsProjects:string; statsClients:string;
  phone:string; email:string; waNumber:string; waMsg:string; location:string;
  instagram:string; youtube:string; linkedin:string; tiktok:string;
  footerCopyright:string; footerLinks:{label:string;page:string}[];
  seoTitle:string; seoDesc:string; googlePlaceId:string;
  services:Service[];
  cvSections:{title:string;content:string}[];
  skills:{dept:string;items:string[]}[];
};
type HeroSlide = { label:string;headline:string;sub:string;btn1:string;btn2:string;img:string;page:string; };

// ─── DEFAULTS ───────────────────────────────────────────────────────────────
const DEF_SETTINGS: SiteSettings = {
  pin:"1913", siteName:"Naveed Anjum", siteTagline:"Photography & Cinematography",
  siteDescription:"Dubai-based photographer and cinematographer specializing in portrait, landscape, commercial and cinematography.",
  heroSlides:[
    {label:"Photography",headline:"Capturing Images\nWith Purpose.",sub:"Professional photography for brands, businesses, people and memorable moments.",btn1:"View Photography",btn2:"Start a Project",img:"https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1600&q=90",page:"work"},
    {label:"Videography",headline:"Stories Told\nThrough Motion.",sub:"Professional video production for corporate, commercial, events and social media.",btn1:"View Videography",btn2:"Book a Session",img:"https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1600&q=90",page:"work"},
    {label:"Commercial",headline:"Visuals Designed\nto Elevate Your Brand.",sub:"Creative photography and video content for modern businesses and campaigns.",btn1:"Explore Projects",btn2:"",img:"https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=1600&q=90",page:"work"},
    {label:"Events",headline:"Professional Coverage.\nPowerful Visuals.",sub:"Photography and videography for corporate events, exhibitions and conferences.",btn1:"View Events",btn2:"",img:"https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1600&q=90",page:"work"},
  ],
  aboutName:"Naveed Anjum", aboutTitle:"Photographer · Cinematographer · Creative Director",
  aboutBio:"A Dubai-based photographer and cinematographer with over 20 years of experience creating powerful visual stories for brands, businesses and people. Specializing in luxury photography, commercial cinematography, portrait sessions and creative visual content for the UAE and international markets.",
  aboutPhoto:"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80",
  statsYears:"20+", statsProjects:"500+", statsClients:"200+",
  phone:"+971 581 174 911", email:"creativeeyeuae@gmail.com", waNumber:"971581174911",
  waMsg:"Hello Naveed, I visited your portfolio and would like to discuss a project.",
  location:"Dubai, UAE",
  instagram:"https://instagram.com/creativeeyeuae", youtube:"https://youtube.com/@creativeeyeuae", linkedin:"", tiktok:"",
  footerCopyright:"© 2026 Naveed Anjum · Creative Fusion · Dubai, UAE",
  footerLinks:[{label:"Work",page:"work"},{label:"About",page:"about"},{label:"CV",page:"cv"},{label:"Booking",page:"booking"},{label:"Contact",page:"contact"}],
  seoTitle:"Naveed Anjum — Professional Photographer & Videographer Dubai",
  seoDesc:"Professional photographer and videographer in Dubai, UAE. 20+ years experience in portrait, commercial, real estate, events and cinematography.",
  googlePlaceId:"",
  services:[
    {id:"s1",icon:"📷",title:"Photography",desc:"Commercial, corporate, real estate, product, events and lifestyle photography.",detail:"From concept to final delivery, every shoot is approached with precision, creativity and an eye for storytelling.",deliverables:["High-resolution edited images","Color graded gallery","Commercial license","Fast turnaround"]},
    {id:"s2",icon:"🎬",title:"Videography",desc:"Corporate films, commercial videos, events, social media and promotional content.",detail:"Professional video production with cinematic quality for corporate and commercial clients.",deliverables:["4K video footage","Professional editing","Color grading","Music licensing"]},
    {id:"s3",icon:"✨",title:"Content Creation",desc:"Professional photography and video content for brands and social media.",detail:"Consistent, high-quality content packages designed to elevate your brand across all platforms.",deliverables:["Monthly content packages","Social media formats","Brand guidelines adherence","Quick turnaround"]},
    {id:"s4",icon:"🎨",title:"Creative Production",desc:"Complete visual content from concept and shooting to editing and delivery.",detail:"End-to-end creative production from initial concept development through to final delivery.",deliverables:["Concept development","Full production","Post-production","Multiple formats"]},
  ],
  cvSections:[
    {title:"Professional Profile",content:"Naveed Anjum is a Dubai-based professional photographer and cinematographer with over 20 years of experience crafting compelling visual narratives for brands, businesses and individuals across the UAE, GCC and internationally."},
    {title:"Photography",content:"Portrait · Landscape · Fashion · Commercial · Real Estate · Architecture & Interior · Events · Wedding · Editorial · Product · Food · Automotive · Travel"},
    {title:"Cinematography",content:"Commercial Films · Documentaries · Fashion Films · Automotive · Social Media · Instagram Reels · Corporate Videos · Event Videography"},
  ],
  skills:[
    {dept:"Creative Skills",items:["Video Editing","Color Grading","Motion Graphics","Creative Direction","Art Direction","Graphic Design"]},
    {dept:"Technical Skills",items:["Studio Lighting","Drone Photography","Location Scouting","Post Production"]},
    {dept:"Equipment",items:["Sony Alpha Series","Canon EOS R","DJI Drone Systems","Profoto Studio Lighting","Godox Location Lighting","Gimbals","Aputure LED"]},
    {dept:"Software",items:["Adobe Lightroom","Photoshop","Premiere Pro","DaVinci Resolve","After Effects","Final Cut Pro","Capture One"]},
  ],
};

const DEF_PROJECTS: Project[] = [
  {id:"p1",title:"Golden Hour Dubai",slug:"golden-hour-dubai",categories:["Landscape Photography"],description:"Aerial and ground-level captures of Dubai at dusk.",fullDescription:"",clientName:"Visit Dubai",location:"Dubai, UAE",projectDate:"2026-01-15",tags:["dubai","landscape"],featured:true,coverImage:"https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&q=80",images:[{url:"https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&q=80",orientation:"landscape"},{url:"https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80",orientation:"portrait"},{url:"https://images.unsplash.com/photo-1582672060674-bc2bd808a8b5?w=1200&q=80",orientation:"landscape"}],videos:[],reels:[],youtubeUrl:""},
  {id:"p2",title:"Bridal Portraits",slug:"bridal-portraits",categories:["Wedding","Portrait Photography"],description:"Intimate bridal portraits in natural light.",fullDescription:"",clientName:"Private Client",location:"Abu Dhabi",projectDate:"2026-02-20",tags:["wedding","portrait"],featured:true,coverImage:"https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=80",images:[{url:"https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=80",orientation:"landscape"}],videos:[],reels:[],youtubeUrl:""},
  {id:"p3",title:"Corporate Excellence",slug:"corporate-excellence",categories:["Commercial","Editorial"],description:"Premium corporate photography for UAE brands.",fullDescription:"",clientName:"UAE Corporate",location:"DIFC, Dubai",projectDate:"2026-03-10",tags:["corporate","commercial"],featured:true,coverImage:"https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=1200&q=80",images:[{url:"https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=1200&q=80",orientation:"landscape"}],videos:[],reels:[],youtubeUrl:""},
];

const DEF_TESTIMONIALS: Testimonial[] = [
  {id:"t1",name:"Sarah Al Mansoori",role:"Marketing Director",company:"Emaar Properties",quote:"Naveed's work exceeded our expectations. His ability to capture the essence of our brand through photography is truly exceptional.",featured:true},
  {id:"t2",name:"Ahmed Hassan",role:"CEO",company:"Dubai Ventures",quote:"Professional, creative, and always delivers on time. Our corporate event coverage was absolutely stunning.",featured:true},
  {id:"t3",name:"Layla Khalid",role:"Brand Manager",company:"Luxury Retail UAE",quote:"Working with Naveed transformed our product photography. The quality speaks for itself.",featured:true},
];

const DEF_BLOG: BlogPost[] = [
  {id:"b1",title:"Best Photography Locations in Dubai 2026",slug:"best-photography-locations-dubai",excerpt:"A professional photographer's guide to the most stunning and photogenic locations across Dubai.",date:"2026-08-01",category:"Photography Tips",coverImage:"https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80",content:""},
  {id:"b2",title:"How to Choose a Professional Photographer in Dubai",slug:"choose-photographer-dubai",excerpt:"Everything you need to know before hiring a professional photographer in Dubai.",date:"2026-07-15",category:"Guides",coverImage:"https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&q=80",content:""},
];

const DEF_CATS = ["Portrait Photography","Landscape Photography","Fashion","Commercial","Real Estate","Architecture & Interior","Events","Wedding","Editorial","Product Photography","Food Photography","Automotive","Travel","Cinematography","Social Media Reels"];
const BOOKING_SERVICES = ["Photography","Videography","Photography + Videography","Cinematography","Social Media Content","Event Coverage","Real Estate Photography","Product Photography","Fashion Photography","Corporate Photography"];
const TIMES = ["9:00 AM","10:00 AM","11:00 AM","12:00 PM","1:00 PM","2:00 PM","3:00 PM","4:00 PM","5:00 PM","6:00 PM"];

// ─── HELPERS ────────────────────────────────────────────────────────────────
const getYTId = (url:string) => { if(!url) return null; const m=url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([^&\n?#]+)/); return m?.[1]??null; };
const slugify = (s:string) => s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
const detectOrientation = (url:string):Promise<string> => new Promise(res=>{ const i=new Image(); i.onload=()=>res(i.width>=i.height?"landscape":"portrait"); i.onerror=()=>res("landscape"); i.src=url; });
const ls = <T,>(k:string,d:T):T => { if(typeof window==="undefined") return d; try{ const s=localStorage.getItem(k); return s?JSON.parse(s):d; }catch{ return d; } };

// ─── COLORS ─────────────────────────────────────────────────────────────────
// Shams-inspired obsidian system: near-black surfaces, white/silver text, and a single
// restrained gold accent reserved for CTAs and rare focus moments (kept under ~3% of the
// page). P/PD carry the gold CTA fill; PL is a neutral near-white used for active/hover
// states and structural labels -- never a second color.
const C = { P:"#C5A059",PL:"#E4E4E7",PD:"#D4AF37",GOLD:"#C5A059",GOLDL:"#D4AF37",BG:"#080809",FG:"#FFFFFF",MID:"#A1A1AA",DARK:"#111113",BORDER:"rgba(255,255,255,0.08)" };

const S = {
  base:{background:C.BG,color:C.FG,minHeight:"100vh"} as React.CSSProperties,
  inp:{background:"#18181B",border:"1px solid rgba(255,255,255,0.08)",color:C.FG,padding:"12px 16px",fontSize:13,width:"100%",outline:"none",boxSizing:"border-box"} as React.CSSProperties,
  btnP:{background:C.P,border:"none",color:C.BG,padding:"13px 36px",fontSize:11,letterSpacing:3,textTransform:"uppercase" as const,cursor:"pointer",borderRadius:2},
  btnO:{background:"none",border:"1px solid rgba(255,255,255,0.18)",color:C.FG,padding:"13px 36px",fontSize:11,letterSpacing:3,textTransform:"uppercase" as const,cursor:"pointer",borderRadius:2},
  btnSm:{background:C.P,border:"none",color:C.BG,padding:"8px 18px",fontSize:10,letterSpacing:2,textTransform:"uppercase" as const,cursor:"pointer",borderRadius:2},
  lbl:{fontSize:10,letterSpacing:3,color:C.MID,textTransform:"uppercase" as const,display:"block" as const,marginBottom:6},
  tag:(center=false)=>({fontSize:10,letterSpacing:6,color:C.MID,textTransform:"uppercase" as const,display:"flex",alignItems:"center",gap:12,marginBottom:12,justifyContent:center?"center":"flex-start"} as React.CSSProperties),
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
      const url = await new Promise<string>((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result as string); r.onerror=rej; r.readAsDataURL(f); });
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
    const url = await new Promise<string>((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result as string); r.onerror=rej; r.readAsDataURL(f); });
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

// ─── SMART GRID ──────────────────────────────────────────────────────────────
function SmartGrid({images,onClick}:{images:Img[];onClick:(i:number)=>void}) {
  if(!images?.length) return null;
  const groups:{type:string;imgs:Img[];idxs:number[]}[]=[];
  let i=0;
  while(i<images.length){ const c=images[i],n=images[i+1]; if(c.orientation==="portrait"&&n?.orientation==="portrait"){groups.push({type:"pair",imgs:[c,n],idxs:[i,i+1]});i+=2;}else{groups.push({type:"full",imgs:[c],idxs:[i]});i++;} }
  return(
    <div style={{display:"flex",flexDirection:"column",gap:3}}>
      {groups.map((g,gi)=>(
        <div key={gi} style={{display:"flex",gap:3}}>
          {g.imgs.map((img,ii)=>(
            <div key={ii} onClick={()=>onClick(g.idxs[ii])} style={{flex:g.type==="pair"?1:"none",width:g.type==="full"?"100%":undefined,cursor:"pointer",overflow:"hidden",background:C.DARK,aspectRatio:g.type==="pair"?"2/3":img.orientation==="landscape"?"16/9":"2/3"}}>
              <img src={img.url} alt="" loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover",display:"block",transition:"transform 0.6s"}} onMouseEnter={e=>(e.currentTarget.style.transform="scale(1.05)")} onMouseLeave={e=>(e.currentTarget.style.transform="scale(1)")} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── LIGHTBOX ────────────────────────────────────────────────────────────────
function Lightbox({images,index,onClose,onPrev,onNext}:{images:Img[];index:number;onClose:()=>void;onPrev:()=>void;onNext:()=>void}) {
  useEffect(()=>{ const h=(e:KeyboardEvent)=>{if(e.key==="Escape")onClose();if(e.key==="ArrowLeft")onPrev();if(e.key==="ArrowRight")onNext();}; window.addEventListener("keydown",h); return()=>window.removeEventListener("keydown",h); },[]);
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.98)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <button onClick={e=>{e.stopPropagation();onPrev();}} style={{position:"absolute",left:16,color:"#fff",background:"none",border:"none",fontSize:48,cursor:"pointer",opacity:0.5}}>‹</button>
      <img onClick={e=>e.stopPropagation()} src={images[index]?.url} alt="" style={{maxWidth:"92vw",maxHeight:"92vh",objectFit:"contain"}} />
      <button onClick={e=>{e.stopPropagation();onNext();}} style={{position:"absolute",right:16,color:"#fff",background:"none",border:"none",fontSize:48,cursor:"pointer",opacity:0.5}}>›</button>
      <button onClick={onClose} style={{position:"absolute",top:16,right:16,color:"#fff",background:"none",border:"none",fontSize:24,cursor:"pointer"}}>✕</button>
      <div style={{position:"absolute",bottom:16,color:"#555",fontSize:12,letterSpacing:3}}>{index+1} / {images.length}</div>
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

// ─── HERO ────────────────────────────────────────────────────────────────────
function Hero({slides,onNav}:{slides:HeroSlide[];onNav:(p:string)=>void}) {
  const [slide,setSlide]=useState(0); const [prog,setProg]=useState(0);
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
      <div style={{position:"absolute",inset:0,background:"linear-gradient(105deg,rgba(8,8,9,0.88) 0%,rgba(8,8,9,0.45) 60%,rgba(8,8,9,0.2) 100%)",zIndex:2}} />
      <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(8,8,9,0.95) 0%,transparent 35%)",zIndex:2}} />
      <div style={{position:"absolute",top:96,right:48,color:"rgba(255,255,255,0.3)",fontSize:11,letterSpacing:4,zIndex:3}}>0{slide+1} / 0{slides.length}</div>
      <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",justifyContent:"center",padding:"0 6vw",zIndex:3}}>
        <div style={{maxWidth:680}}>
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:28}}><div style={{width:36,height:1,background:C.PL}} /><span style={{fontSize:11,letterSpacing:6,color:C.PL,textTransform:"uppercase"}}>{sl.label}</span></div>
          <h1 style={{fontSize:"clamp(36px,6vw,76px)",fontWeight:400,letterSpacing:0.5,color:"#fff",margin:"0 0 20px",lineHeight:1.15,whiteSpace:"pre-line"}}>{sl.headline}</h1>
          <p style={{fontSize:"clamp(13px,1.3vw,15px)",color:"rgba(255,255,255,0.55)",lineHeight:1.85,maxWidth:460,marginBottom:40}}>{sl.sub}</p>
          <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
            <button onClick={()=>onNav(sl.page)} style={{...S.btnP}} onMouseEnter={e=>(e.currentTarget.style.background=C.PD)} onMouseLeave={e=>(e.currentTarget.style.background=C.P)}>{sl.btn1}</button>
            {sl.btn2&&<button onClick={()=>onNav("booking")} style={{background:"none",border:"1px solid rgba(255,255,255,0.25)",color:"rgba(255,255,255,0.75)",padding:"13px 36px",fontSize:11,letterSpacing:3,textTransform:"uppercase",cursor:"pointer"}}>{sl.btn2}</button>}
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
  const [settings,setSettings]=useState<SiteSettings>(()=>ls("nap_settings",DEF_SETTINGS));
  const [projects,setProjects]=useState<Project[]>(()=>ls("nap_projects",DEF_PROJECTS));
  const [cats,setCats]=useState<string[]>(()=>ls("nap_cats",DEF_CATS));
  const [testimonials,setTestimonials]=useState<Testimonial[]>(()=>ls("nap_testimonials",DEF_TESTIMONIALS));
  const [blog,setBlog]=useState<BlogPost[]>(()=>ls("nap_blog",DEF_BLOG));
  const [page,setPage]=useState("home");
  const [selProj,setSelProj]=useState<Project|null>(null);
  const [selBlog,setSelBlog]=useState<BlogPost|null>(null);
  const [filterCat,setFilterCat]=useState("All");
  const [lb,setLb]=useState({open:false,index:0});
  const [cms,setCms]=useState(false);
  const [authed,setAuthed]=useState(false);
  const [pin,setPin]=useState(""); const [pinErr,setPinErr]=useState(false);
  const [pinLockUntil,setPinLockUntil]=useState(0);
  const [pinAttempts,setPinAttempts]=useState(0);
  const [mobileNavOpen,setMobileNavOpen]=useState(false);
  const [isMobile,setIsMobile]=useState(false);

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
  const [form,setForm]=useState<Partial<Project>&{images:Img[];reels:string[];videos:string[];categories:string[]}>({title:"",slug:"",categories:[],description:"",fullDescription:"",clientName:"",location:"",projectDate:"",tags:[],featured:false,coverImage:"",images:[],videos:[],reels:[],youtubeUrl:""});
  const [newImg,setNewImg]=useState(""); const [addingImg,setAddingImg]=useState(false);
  const [newReel,setNewReel]=useState(""); const [newCat,setNewCat]=useState("");
  const [booking,setBooking]=useState({name:"",email:"",phone:"",service:"",date:"",time:"",location:"",details:"",budget:"",agreed:false});
  const [bookingDone,setBookingDone]=useState(false);
  const [settingsDraft,setSettingsDraft]=useState<SiteSettings>(settings);
  const [settingsTab,setSettingsTab]=useState("general");

  useEffect(()=>{try{localStorage.setItem("nap_settings",JSON.stringify(settings));}catch{}},[settings]);
  useEffect(()=>{try{localStorage.setItem("nap_projects",JSON.stringify(projects));}catch{}},[projects]);
  useEffect(()=>{try{localStorage.setItem("nap_cats",JSON.stringify(cats));}catch{}},[cats]);
  useEffect(()=>{try{localStorage.setItem("nap_testimonials",JSON.stringify(testimonials));}catch{}},[testimonials]);
  useEffect(()=>{try{localStorage.setItem("nap_blog",JSON.stringify(blog));}catch{}},[blog]);

  const filtered=filterCat==="All"?projects:projects.filter(p=>p.categories?.includes(filterCat));
  const featured=projects.filter(p=>p.featured);
  const WA=settings.waNumber; const WA_MSG=settings.waMsg;

  function goTo(p:string){setPage(p);window.scrollTo(0,0);}
  function openProj(p:Project){setSelProj(p);setPage("project");window.scrollTo(0,0);}
  function openBlog(b:BlogPost){setSelBlog(b);setPage("blog-post");window.scrollTo(0,0);}
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
  const NAV_LINKS:[string,string][]=[["home","Home"],["work","Work"],["about","About"],["cv","CV"],["blog","Journal"],["contact","Contact"]];

  const Nav=()=>(
    <nav role="navigation" aria-label="Main navigation" style={{position:"fixed",top:0,left:0,right:0,zIndex:500,padding:isMobile?"14px 20px":"16px 40px",display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(8,8,9,0.85)",backdropFilter:"blur(16px)",borderBottom:`1px solid ${C.BORDER}`}}>
      <div onClick={()=>{goTo("home");setMobileNavOpen(false);}} style={{fontSize:15,letterSpacing:4,textTransform:"uppercase",cursor:"pointer",color:C.FG,fontFamily:"var(--font-serif),'DM Serif Display',serif"}}>{settings.siteName}</div>

      {isMobile?(
        <button aria-label={mobileNavOpen?"Close menu":"Open menu"} onClick={()=>setMobileNavOpen(o=>!o)} style={{background:"none",border:`1px solid ${C.BORDER}`,color:C.FG,width:40,height:36,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,cursor:"pointer"}}>
          <span style={{display:"block",width:18,height:1,background:C.FG}} />
          <span style={{display:"block",width:18,height:1,background:C.FG}} />
          <span style={{display:"block",width:18,height:1,background:C.FG}} />
        </button>
      ):(
        <div style={{display:"flex",gap:22,alignItems:"center"}}>
          {NAV_LINKS.map(([k,l])=>(
            <span key={k} onClick={()=>goTo(k)} style={{fontSize:11,letterSpacing:3,color:page===k?C.PL:C.MID,textTransform:"uppercase",cursor:"pointer",transition:"color 0.2s",borderBottom:page===k?`1px solid ${C.PL}`:"1px solid transparent",paddingBottom:2}}>{l}</span>
          ))}
          <button onClick={()=>goTo("booking")} style={{...S.btnP,padding:"9px 20px",fontSize:10}} onMouseEnter={e=>(e.currentTarget.style.background=C.PD)} onMouseLeave={e=>(e.currentTarget.style.background=C.P)}>Book a Project</button>
        </div>
      )}

      {isMobile&&mobileNavOpen&&(
        <div style={{position:"fixed",top:64,left:0,right:0,bottom:0,background:"rgba(8,8,9,0.97)",zIndex:499,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:26}}>
          {NAV_LINKS.map(([k,l])=>(
            <span key={k} onClick={()=>{goTo(k);setMobileNavOpen(false);}} style={{fontSize:15,letterSpacing:3,color:page===k?C.PL:C.FG,textTransform:"uppercase",cursor:"pointer"}}>{l}</span>
          ))}
          <button onClick={()=>{goTo("booking");setMobileNavOpen(false);}} style={{...S.btnP,padding:"13px 32px",fontSize:11}}>Book a Project</button>
        </div>
      )}
    </nav>
  );

  // ── FOOTER ──
  const Footer=()=>(
    <footer style={{background:"#050506",borderTop:`1px solid ${C.BORDER}`}}>
      <div style={{maxWidth:1200,margin:"0 auto",padding:"48px 40px 24px",display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:40}}>
        <div>
          <div style={{fontSize:14,letterSpacing:4,textTransform:"uppercase",color:C.FG,marginBottom:12}}>{settings.siteName}</div>
          <p style={{color:C.MID,fontSize:13,lineHeight:1.7,marginBottom:16,maxWidth:280}}>{settings.siteTagline}</p>
          <div style={{fontSize:13,color:C.MID,marginBottom:6}}>{settings.phone}</div>
          <div style={{fontSize:13,color:C.MID,marginBottom:6}}>{settings.email}</div>
          <div style={{fontSize:13,color:C.MID,marginBottom:16}}>{settings.location}</div>
          <a href={`https://wa.me/${WA}?text=${encodeURIComponent(WA_MSG)}`} target="_blank" style={{...S.btnP,textDecoration:"none",fontSize:10,padding:"8px 20px",display:"inline-block"}}>WhatsApp Us</a>
        </div>
        <div>
          <div style={{fontSize:10,letterSpacing:4,color:C.PL,textTransform:"uppercase",marginBottom:16}}>Services</div>
          {settings.services.map(sv=><div key={sv.id} onClick={()=>{setPage("work");window.scrollTo(0,0);}} style={{fontSize:13,color:C.MID,marginBottom:10,cursor:"pointer",transition:"color 0.2s"}} onMouseEnter={e=>(e.currentTarget.style.color=C.PL)} onMouseLeave={e=>(e.currentTarget.style.color=C.MID)}>{sv.title}</div>)}
        </div>
        <div>
          <div style={{fontSize:10,letterSpacing:4,color:C.PL,textTransform:"uppercase",marginBottom:16}}>Quick Links</div>
          {settings.footerLinks.map((l,i)=><div key={i} onClick={()=>goTo(l.page)} style={{fontSize:13,color:C.MID,marginBottom:10,cursor:"pointer",transition:"color 0.2s"}} onMouseEnter={e=>(e.currentTarget.style.color=C.PL)} onMouseLeave={e=>(e.currentTarget.style.color=C.MID)}>{l.label}</div>)}
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
          {["work","about","booking","contact"].map(l=><span key={l} onClick={()=>goTo(l)} style={{fontSize:10,letterSpacing:2,color:"#2a2a3a",textTransform:"uppercase",cursor:"pointer",transition:"color 0.2s"}} onMouseEnter={e=>(e.currentTarget.style.color=C.PL)} onMouseLeave={e=>(e.currentTarget.style.color="#2a2a3a")}>{l}</span>)}
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

    const TABS=[["projects","📁 Projects"],["categories","🏷 Categories"],["testimonials","⭐ Testimonials"],["blog","📝 Blog"],["settings","⚙️ Settings"]];

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

        {/* SETTINGS TAB */}
        {cmsTab==="settings"&&(
          <div style={{maxWidth:800,margin:"0 auto",padding:"32px 24px"}}>
            <div style={{display:"flex",gap:8,marginBottom:24,flexWrap:"wrap"}}>
              {[["general","General"],["hero","Hero Slides"],["about","About"],["services","Services"],["cv","CV & Skills"],["footer","Footer"],["seo","SEO"],["contact","Contact"]].map(([k,l])=>(
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
              </div>
            )}

            {settingsTab==="hero"&&(
              <div>
                <div style={{fontSize:11,letterSpacing:4,color:C.MID,marginBottom:20,textTransform:"uppercase"}}>Hero Slides ({settingsDraft.heroSlides.length})</div>
                <button onClick={()=>updateSD({heroSlides:[...settingsDraft.heroSlides,{label:"New Slide",headline:"Headline\nHere.",sub:"Supporting text.",btn1:"View Work",btn2:"",img:"",page:"work"}]})} style={{...S.btnSm,marginBottom:16}}>+ Add Slide</button>
                {settingsDraft.heroSlides.map((sl,i)=>(
                  <div key={i} style={{background:"#10101c",padding:20,marginBottom:12,border:`1px solid ${C.BORDER}`}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                      <div><label style={S.lbl}>Label</label><input style={S.inp} value={sl.label} onChange={e=>updateSD({heroSlides:settingsDraft.heroSlides.map((x,idx)=>idx===i?{...x,label:e.target.value}:x)})} /></div>
                      <div><label style={S.lbl}>Button 1</label><input style={S.inp} value={sl.btn1} onChange={e=>updateSD({heroSlides:settingsDraft.heroSlides.map((x,idx)=>idx===i?{...x,btn1:e.target.value}:x)})} /></div>
                      <div style={{gridColumn:"1/3"}}><label style={S.lbl}>Headline (use \n for line break)</label><input style={S.inp} value={sl.headline} onChange={e=>updateSD({heroSlides:settingsDraft.heroSlides.map((x,idx)=>idx===i?{...x,headline:e.target.value}:x)})} /></div>
                      <div style={{gridColumn:"1/3"}}><label style={S.lbl}>Sub Text</label><input style={S.inp} value={sl.sub} onChange={e=>updateSD({heroSlides:settingsDraft.heroSlides.map((x,idx)=>idx===i?{...x,sub:e.target.value}:x)})} /></div>
                      <div style={{gridColumn:"1/3"}}><label style={S.lbl}>Background Image URL</label><input style={S.inp} value={sl.img} onChange={e=>updateSD({heroSlides:settingsDraft.heroSlides.map((x,idx)=>idx===i?{...x,img:e.target.value}:x)})} placeholder="https://..." /></div>
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
              <button onClick={()=>setBlog(bs=>[...bs,{id:Date.now().toString(),title:"New Post",slug:"new-post",excerpt:"",date:new Date().toISOString().split("T")[0],category:"",coverImage:"",content:""}])} style={S.btnP}>+ New Post</button>
            </div>
            {blog.map((b,i)=>(
              <div key={b.id} style={{background:"#10101c",padding:20,marginBottom:12,border:`1px solid ${C.BORDER}`}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                  <div><label style={S.lbl}>Title</label><input style={S.inp} value={b.title} onChange={e=>setBlog(bs=>bs.map((x,idx)=>idx===i?{...x,title:e.target.value,slug:slugify(e.target.value)}:x))} /></div>
                  <div><label style={S.lbl}>Category</label><input style={S.inp} value={b.category} onChange={e=>setBlog(bs=>bs.map((x,idx)=>idx===i?{...x,category:e.target.value}:x))} /></div>
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
      </div>
    );
  }

  // ── PROJECT PAGE ──
  if(page==="project"&&selProj){
    const ytId=getYTId(selProj.youtubeUrl);
    return(
      <div style={S.base}>
        <Nav />
        <div style={{maxWidth:1200,margin:"0 auto",padding:"120px 40px 80px"}}>
          <span onClick={()=>goTo("work")} style={{fontSize:11,letterSpacing:3,color:C.MID,textTransform:"uppercase",cursor:"pointer",display:"inline-block",marginBottom:40}}>← All Work</span>
          <div style={{fontSize:10,letterSpacing:5,color:C.PL,textTransform:"uppercase",marginBottom:10}}>{selProj.categories?.join(" · ")}</div>
          <h1 style={{fontSize:"clamp(28px,5vw,56px)",fontWeight:300,letterSpacing:3,margin:"0 0 16px"}}>{selProj.title}</h1>
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
                  <div style={{position:"absolute",bottom:0,left:0,right:0,padding:16,background:"linear-gradient(to top,rgba(8,8,9,0.9),transparent)"}}><div style={{fontSize:13,color:"#fff"}}>{p.title}</div></div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {lb.open&&<Lightbox images={selProj.images||[]} index={lb.index} onClose={()=>setLb({open:false,index:0})} onPrev={()=>setLb(l=>({...l,index:Math.max(0,l.index-1)}))} onNext={()=>setLb(l=>({...l,index:Math.min((selProj.images?.length||1)-1,l.index+1)}))} />}
        <FloatingWA num={WA} msg={WA_MSG} />
      </div>
    );
  }

  // ── BLOG POST ──
  if(page==="blog-post"&&selBlog) return(
    <div style={S.base}>
      <Nav />
      <div style={{maxWidth:800,margin:"0 auto",padding:"120px 40px 80px"}}>
        <span onClick={()=>goTo("blog")} style={{fontSize:11,letterSpacing:3,color:C.MID,textTransform:"uppercase",cursor:"pointer",display:"inline-block",marginBottom:40}}>← Journal</span>
        <div style={{fontSize:10,letterSpacing:5,color:C.PL,textTransform:"uppercase",marginBottom:10}}>{selBlog.category}</div>
        <h1 style={{fontSize:"clamp(24px,4vw,48px)",fontWeight:300,letterSpacing:2,margin:"0 0 16px"}}>{selBlog.title}</h1>
        <div style={{color:C.MID,fontSize:12,marginBottom:32}}>📅 {selBlog.date}</div>
        {selBlog.coverImage&&<div style={{aspectRatio:"16/9",overflow:"hidden",marginBottom:48}}><img src={selBlog.coverImage} alt={selBlog.title} style={{width:"100%",height:"100%",objectFit:"cover"}} /></div>}
        <p style={{color:C.MID,fontSize:15,lineHeight:1.9,marginBottom:24}}>{selBlog.excerpt}</p>
        {selBlog.content?<div style={{color:C.MID,fontSize:14,lineHeight:1.9,whiteSpace:"pre-wrap"}}>{selBlog.content}</div>:<p style={{color:"#444",fontSize:13,fontStyle:"italic"}}>Full article coming soon.</p>}
      </div>
      <Footer /><FloatingWA num={WA} msg={WA_MSG} />
    </div>
  );

  // ── BLOG ──
  if(page==="blog") return(
    <div style={S.base}>
      <Nav />
      <div style={{maxWidth:1200,margin:"0 auto",padding:"120px 40px 80px"}}>
        <div style={{...S.tag(),marginBottom:12}}><span style={{width:24,height:1,background:C.PL,display:"inline-block"}} />Journal</div>
        <h1 style={{fontSize:"clamp(28px,4vw,48px)",fontWeight:300,letterSpacing:3,margin:"0 0 48px"}}>Photography Journal</h1>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",gap:24}}>
          {blog.map(b=>(
            <div key={b.id} className="tcard" onClick={()=>openBlog(b)} style={{cursor:"pointer",background:C.DARK,border:`1px solid ${C.BORDER}`,borderRadius:4,overflow:"hidden"}}>
              {b.coverImage&&<div style={{aspectRatio:"16/9",overflow:"hidden"}}><img src={b.coverImage} alt={b.title} loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover",transition:"transform 0.5s"}} onMouseEnter={e=>(e.currentTarget.style.transform="scale(1.04)")} onMouseLeave={e=>(e.currentTarget.style.transform="scale(1)")} /></div>}
              <div style={{padding:24}}>
                <div style={{fontSize:10,letterSpacing:3,color:C.PL,textTransform:"uppercase",marginBottom:8}}>{b.category} · {b.date}</div>
                <h3 style={{fontSize:18,fontWeight:300,letterSpacing:1,margin:"0 0 12px"}}>{b.title}</h3>
                <p style={{color:C.MID,fontSize:13,lineHeight:1.7}}>{b.excerpt}</p>
                <div style={{marginTop:16,fontSize:11,letterSpacing:2,color:C.PL,textTransform:"uppercase"}}>Read More →</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Footer /><FloatingWA num={WA} msg={WA_MSG} />
    </div>
  );

  // ── CV ──
  if(page==="cv") return(
    <div style={S.base}>
      <Nav />
      <div style={{maxWidth:900,margin:"0 auto",padding:"120px 40px 80px"}}>
        <div style={{textAlign:"center",marginBottom:64}}>
          <div style={{...S.tag(true),marginBottom:16}}><span style={{width:32,height:1,background:C.PL,display:"inline-block"}} />Curriculum Vitae<span style={{width:32,height:1,background:C.PL,display:"inline-block"}} /></div>
          <h1 style={{fontSize:"clamp(32px,5vw,56px)",fontWeight:300,letterSpacing:4,margin:"0 0 12px"}}>{settings.aboutName}</h1>
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
    </div>
  );

  // ── BOOKING ──
  if(page==="booking") return(
    <div style={S.base}>
      <Nav />
      <div style={{maxWidth:720,margin:"0 auto",padding:"120px 40px 80px"}}>
        <div style={{textAlign:"center",marginBottom:56}}>
          <div style={{...S.tag(true),marginBottom:16}}><span style={{width:32,height:1,background:C.PL,display:"inline-block"}} />Book a Session</div>
          <h1 style={{fontSize:"clamp(28px,4vw,48px)",fontWeight:300,letterSpacing:3,margin:"0 0 12px"}}>Let's Create Together</h1>
          <p style={{color:C.MID,fontSize:14}}>Fill in the details below or message directly on WhatsApp</p>
        </div>
        {bookingDone?(
          <div style={{textAlign:"center",padding:64}}>
            <div style={{fontSize:48,color:C.PL,marginBottom:16}}>✓</div>
            <h2 style={{fontWeight:300,letterSpacing:2,marginBottom:12}}>Request Sent!</h2>
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
    </div>
  );

  // ── ABOUT ──
  if(page==="about") return(
    <div style={S.base}>
      <Nav />
      <div style={{maxWidth:1000,margin:"0 auto",padding:"120px 40px 80px"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:64,alignItems:"start"}}>
          <div>
            <div style={{...S.tag(),marginBottom:20}}><span style={{width:24,height:1,background:C.PL,display:"inline-block"}} />About</div>
            <h1 style={{fontSize:"clamp(28px,4vw,48px)",fontWeight:300,letterSpacing:3,margin:"0 0 16px"}}>{settings.aboutName}</h1>
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
                  <div style={{fontSize:28,color:C.PL,fontWeight:300}}>{n}</div>
                  <div style={{fontSize:9,letterSpacing:3,color:C.MID,textTransform:"uppercase",marginTop:4}}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <Footer /><FloatingWA num={WA} msg={WA_MSG} />
    </div>
  );

  // ── CONTACT ──
  if(page==="contact") return(
    <div style={S.base}>
      <Nav />
      <div style={{maxWidth:700,margin:"0 auto",padding:"120px 40px 80px",textAlign:"center"}}>
        <div style={{...S.tag(true),marginBottom:16}}><span style={{width:32,height:1,background:C.PL,display:"inline-block"}} />Get In Touch</div>
        <h1 style={{fontSize:"clamp(28px,4vw,48px)",fontWeight:300,letterSpacing:3,margin:"0 0 48px"}}>Let's Work Together</h1>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:24,marginBottom:48}}>
          {[{label:"WhatsApp",value:settings.phone,href:`https://wa.me/${WA}`},{label:"Email",value:settings.email,href:`mailto:${settings.email}`},{label:"Location",value:settings.location,href:null}].map((c,i)=>(
            <div key={i} className="tcard" style={{padding:24,borderRadius:4,border:`1px solid ${C.BORDER}`,background:C.DARK}}>
              <div style={{fontSize:10,letterSpacing:3,color:C.MID,textTransform:"uppercase",marginBottom:12}}>{c.label}</div>
              {c.href?<a href={c.href} target="_blank" style={{color:C.PL,fontSize:13,textDecoration:"none"}}>{c.value}</a>:<div style={{color:C.PL,fontSize:13}}>{c.value}</div>}
            </div>
          ))}
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
    </div>
  );

  // ── WORK ──
  if(page==="work") return(
    <div style={S.base}>
      <Nav />
      <div style={{maxWidth:1400,margin:"0 auto",padding:"100px 32px 80px"}}>
        <div style={{marginBottom:48}}>
          <div style={{...S.tag(),marginBottom:12}}><span style={{width:24,height:1,background:C.PL,display:"inline-block"}} />Portfolio</div>
          <h1 style={{fontSize:"clamp(28px,4vw,48px)",fontWeight:300,letterSpacing:3,margin:"0 0 32px"}}>Selected Work</h1>
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
              <div className="ov" style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(8,8,9,0.92) 0%,transparent 55%)",opacity:0,transition:"opacity 0.3s",display:"flex",flexDirection:"column",justifyContent:"flex-end",padding:24}}>
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
    </div>
  );

  // ── HOME ──
  return(
    <div style={S.base}>
      <Nav />
      <Hero slides={settings.heroSlides} onNav={goTo} />

      {/* INTRO STRIP */}
      <div style={{background:C.DARK,padding:"24px 40px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:16}}>
        <div>
          <div style={{fontSize:14,letterSpacing:4,textTransform:"uppercase",color:C.FG}}>{settings.siteName}</div>
          <div style={{fontSize:12,color:C.MID,letterSpacing:1,marginTop:4}}>{settings.aboutTitle} · {settings.location}</div>
        </div>
        <div style={{display:"flex",gap:28}}>
          {[[settings.statsYears,"Years"],[settings.statsProjects,"Projects"],[settings.statsClients,"Clients"]].map(([n,l])=>(
            <div key={l} style={{textAlign:"left",borderLeft:`2px solid ${C.GOLD}`,paddingLeft:14}}>
              <div style={{fontSize:20,color:C.FG,fontWeight:300}}>{n}</div>
              <div style={{fontSize:9,letterSpacing:3,color:C.MID,textTransform:"uppercase"}}>{l}</div>
            </div>
          ))}
        </div>
        <button onClick={()=>goTo("booking")} style={S.btnP} onMouseEnter={e=>(e.currentTarget.style.background=C.PD)} onMouseLeave={e=>(e.currentTarget.style.background=C.P)}>Book a Project</button>
      </div>

      {/* FEATURED WORK */}
      {featured.length>0&&(
        <div style={{maxWidth:1400,margin:"0 auto",padding:"64px 32px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:36}}>
            <div>
              <div style={{...S.tag(),marginBottom:8}}><span style={{width:24,height:1,background:C.PL,display:"inline-block"}} />Selected Work</div>
              <h2 style={{fontSize:"clamp(20px,3vw,36px)",fontWeight:300,letterSpacing:3,margin:0}}>Featured Projects</h2>
            </div>
            <span onClick={()=>goTo("work")} style={{fontSize:10,letterSpacing:3,color:C.PL,textTransform:"uppercase",cursor:"pointer",borderBottom:`1px solid ${C.PL}`,paddingBottom:2}}>View All →</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:3}}>
            {featured.slice(0,1).map(p=>(
              <div key={p.id} onClick={()=>openProj(p)} style={{gridColumn:"1/3",position:"relative",cursor:"pointer",overflow:"hidden",aspectRatio:"16/9",background:C.DARK}}
                onMouseEnter={e=>{ (e.currentTarget.querySelector("img") as HTMLElement).style.transform="scale(1.04)"; (e.currentTarget.querySelector(".ov") as HTMLElement).style.opacity="1"; }}
                onMouseLeave={e=>{ (e.currentTarget.querySelector("img") as HTMLElement).style.transform="scale(1)"; (e.currentTarget.querySelector(".ov") as HTMLElement).style.opacity="0"; }}>
                <img src={p.coverImage||""} alt={p.title} style={{width:"100%",height:"100%",objectFit:"cover",transition:"transform 0.7s"}} />
                <div className="ov" style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(8,8,9,0.9),transparent 50%)",opacity:0,transition:"opacity 0.3s",display:"flex",flexDirection:"column",justifyContent:"flex-end",padding:32}}>
                  <div style={{fontSize:10,letterSpacing:4,color:C.PL,textTransform:"uppercase",marginBottom:8}}>{p.categories?.join(" · ")}</div>
                  <div style={{fontSize:22,letterSpacing:2,color:"#fff"}}>{p.title}</div>
                </div>
              </div>
            ))}
            {featured.slice(1,4).map(p=>(
              <div key={p.id} onClick={()=>openProj(p)} style={{position:"relative",cursor:"pointer",overflow:"hidden",aspectRatio:"4/3",background:C.DARK}}
                onMouseEnter={e=>{ (e.currentTarget.querySelector("img") as HTMLElement).style.transform="scale(1.05)"; (e.currentTarget.querySelector(".ov") as HTMLElement).style.opacity="1"; }}
                onMouseLeave={e=>{ (e.currentTarget.querySelector("img") as HTMLElement).style.transform="scale(1)"; (e.currentTarget.querySelector(".ov") as HTMLElement).style.opacity="0"; }}>
                <img src={p.coverImage||""} alt={p.title} loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover",transition:"transform 0.6s"}} />
                <div className="ov" style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(8,8,9,0.9),transparent 50%)",opacity:0,transition:"opacity 0.3s",display:"flex",flexDirection:"column",justifyContent:"flex-end",padding:20}}>
                  <div style={{fontSize:9,letterSpacing:3,color:C.PL,textTransform:"uppercase",marginBottom:4}}>{p.categories?.[0]}</div>
                  <div style={{fontSize:15,letterSpacing:1,color:"#fff"}}>{p.title}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SERVICES */}
      <div style={{background:C.DARK,padding:"60px 40px"}}>
        <div style={{maxWidth:1200,margin:"0 auto"}}>
          <div style={{...S.tag(),marginBottom:36}}><span style={{width:24,height:1,background:C.PL,display:"inline-block"}} />Services</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:20}}>
            {settings.services.map((sv,i)=>(
              <div key={sv.id} className="tcard" style={{padding:"32px 28px",borderRadius:4,border:`1px solid ${C.BORDER}`,background:"#18181B",cursor:"pointer"}}>
                <div style={{fontSize:11,fontWeight:600,color:C.GOLD,letterSpacing:2,marginBottom:14}}>{String(i+1).padStart(2,"0")}</div>
                <div style={{fontSize:26,marginBottom:16}}>{sv.icon}</div>
                <div style={{fontSize:12,letterSpacing:3,color:C.FG,textTransform:"uppercase",marginBottom:10}}>{sv.title}</div>
                <div style={{fontSize:13,color:C.MID,lineHeight:1.7}}>{sv.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TESTIMONIALS */}
      {testimonials.filter(t=>t.featured).length>0&&(
        <div style={{maxWidth:1200,margin:"0 auto",padding:"64px 40px"}}>
          <div style={{...S.tag(),marginBottom:36}}><span style={{width:24,height:1,background:C.PL,display:"inline-block"}} />Client Testimonials</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:24}}>
            {testimonials.filter(t=>t.featured).map(t=>(
              <div key={t.id} className="tcard" style={{position:"relative",overflow:"hidden",padding:32,borderRadius:4,border:`1px solid ${C.BORDER}`,background:C.DARK,boxShadow:"0 4px 20px rgba(0,0,0,0.3)"}}>
                <div style={{position:"absolute",top:14,right:20,fontSize:64,color:C.GOLD,opacity:0.14,lineHeight:1,fontFamily:"var(--font-serif),'DM Serif Display',serif"}}>"</div>
                <p style={{position:"relative",color:C.MID,fontSize:14,lineHeight:1.85,marginBottom:24,fontStyle:"italic"}}>{t.quote}</p>
                <div style={{borderTop:`1px solid ${C.BORDER}`,paddingTop:16}}>
                  <div style={{fontSize:13,color:C.FG,letterSpacing:1}}>{t.name}</div>
                  <div style={{fontSize:11,color:C.MID,marginTop:4}}>{t.role} · {t.company}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BLOG PREVIEW */}
      {blog.length>0&&(
        <div style={{background:C.DARK,padding:"60px 40px"}}>
          <div style={{maxWidth:1200,margin:"0 auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:36}}>
              <div>
                <div style={{...S.tag(),marginBottom:8}}><span style={{width:24,height:1,background:C.PL,display:"inline-block"}} />Journal</div>
                <h2 style={{fontSize:"clamp(20px,2.5vw,32px)",fontWeight:300,letterSpacing:3,margin:0}}>Photography Journal</h2>
              </div>
              <span onClick={()=>goTo("blog")} style={{fontSize:10,letterSpacing:3,color:C.PL,textTransform:"uppercase",cursor:"pointer",borderBottom:`1px solid ${C.PL}`,paddingBottom:2}}>All Posts →</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",gap:24}}>
              {blog.slice(0,2).map(b=>(
                <div key={b.id} className="tcard" onClick={()=>openBlog(b)} style={{cursor:"pointer",borderRadius:4,overflow:"hidden",border:`1px solid ${C.BORDER}`,background:C.DARK}}>
                  {b.coverImage&&<div style={{aspectRatio:"16/9",overflow:"hidden"}}><img src={b.coverImage} alt={b.title} loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover",transition:"transform 0.5s"}} onMouseEnter={e=>(e.currentTarget.style.transform="scale(1.04)")} onMouseLeave={e=>(e.currentTarget.style.transform="scale(1)")} /></div>}
                  <div style={{padding:24}}>
                    <div style={{fontSize:10,letterSpacing:3,color:C.PL,textTransform:"uppercase",marginBottom:8}}>{b.category} · {b.date}</div>
                    <h3 style={{fontSize:16,fontWeight:300,letterSpacing:1,margin:"0 0 10px"}}>{b.title}</h3>
                    <p style={{color:C.MID,fontSize:13,lineHeight:1.7}}>{b.excerpt}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CTA */}
      <div style={{textAlign:"center",padding:"64px 32px",background:`linear-gradient(135deg,${C.BG} 0%,${C.DARK} 50%,${C.BG} 100%)`}}>
        <div style={{...S.tag(true),marginBottom:12}}><span style={{width:32,height:1,background:C.PL,display:"inline-block"}} />Ready to create?</div>
        <h2 style={{fontSize:"clamp(22px,3vw,38px)",fontWeight:300,letterSpacing:3,margin:"0 0 12px"}}>Book Your Session</h2>
        <p style={{color:C.MID,fontSize:14,marginBottom:36}}>Based in {settings.location} · Available across UAE, GCC & internationally</p>
        <div style={{display:"flex",gap:16,justifyContent:"center",flexWrap:"wrap"}}>
          <button onClick={()=>goTo("booking")} style={S.btnP} onMouseEnter={e=>(e.currentTarget.style.background=C.PD)} onMouseLeave={e=>(e.currentTarget.style.background=C.P)}>Book Now</button>
          <a href={`https://wa.me/${WA}?text=${encodeURIComponent(WA_MSG)}`} target="_blank" style={{...S.btnO,textDecoration:"none"}}>WhatsApp</a>
        </div>
      </div>

      <Footer />
      <FloatingWA num={WA} msg={WA_MSG} />
    </div>
  );
}