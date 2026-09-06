"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";

type Project = { id:string; title:string; slug:string; cover_image_url:string; description:string; client_name:string; location:string; project_date:string; is_featured:boolean; is_published:boolean; category_id:string; tags:string[]; };
type Category = { id:string; name:string; slug:string; type:string; };
type Testimonial = { id:string; client_name:string; client_title:string; client_company:string; content:string; rating:number; is_active:boolean; };
type Service = { id:string; title:string; description:string; icon_name:string; category:string; is_active:boolean; display_order:number; };
type Booking = { id:string; client_name:string; client_email:string; client_phone:string; service_type:string; event_date:string; budget_range:string; message:string; status:string; created_at:string; };
type Video = { id:string; title:string; youtube_url:string; youtube_id:string; description:string; client_name:string; category:string; is_featured:boolean; display_order:number; };
type Setting = { key:string; value:string; };

const getYTId = (url:string) => { const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([^&\n?#]+)/); return m?.[1] ?? ""; };
const slugify = (s:string) => s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");

const C = { P:"#7c5cbf", PL:"#a78bdc", BG:"#070710", FG:"#f0eef8", MID:"#9490a8", DARK:"#0c0c1a", BORDER:"rgba(124,92,191,0.15)", SUCCESS:"#27ae60", ERROR:"#e74c3c" };
const inp: React.CSSProperties = { background:"#10101c", border:"1px solid rgba(124,92,191,0.15)", color:"#f0eef8", padding:"10px 14px", fontSize:13, width:"100%", fontFamily:"Georgia,serif", outline:"none", boxSizing:"border-box" };
const btnP: React.CSSProperties = { background:"#7c5cbf", border:"none", color:"#fff", padding:"10px 24px", fontSize:11, letterSpacing:2, textTransform:"uppercase", cursor:"pointer", fontFamily:"Georgia,serif" };
const btnSm: React.CSSProperties = { background:"#7c5cbf", border:"none", color:"#fff", padding:"6px 14px", fontSize:10, letterSpacing:2, textTransform:"uppercase", cursor:"pointer" };
const btnO: React.CSSProperties = { background:"none", border:"1px solid #a78bdc", color:"#a78bdc", padding:"10px 24px", fontSize:11, letterSpacing:2, textTransform:"uppercase", cursor:"pointer" };
const btnD: React.CSSProperties = { background:"#c0392b", border:"none", color:"#fff", padding:"6px 14px", fontSize:10, cursor:"pointer" };
const lbl: React.CSSProperties = { fontSize:10, letterSpacing:3, color:"#9490a8", textTransform:"uppercase", display:"block", marginBottom:6 };
const card: React.CSSProperties = { background:"#0c0c1a", border:"1px solid rgba(124,92,191,0.15)", padding:20, marginBottom:12 };

async function uploadFile(file: File): Promise<string> {
  const ext = file.name.split(".").pop();
  const key = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from("portfolio").upload(key, file, { contentType: file.type });
  if (error) {
    return new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(file); });
  }
  return supabase.storage.from("portfolio").getPublicUrl(key).data.publicUrl;
}

function ImgUpload({ value, onChange, label="Image" }: { value:string; onChange:(u:string)=>void; label?:string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div style={{ marginBottom:16 }}>
      <label style={lbl}>{label}</label>
      <div style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
        {value && <img src={value} alt="" style={{ width:80, height:60, objectFit:"cover", border:"1px solid rgba(124,92,191,0.15)" }} />}
        <div style={{ flex:1 }}>
          <input ref={ref} type="file" accept="image/*" style={{ display:"none" }} onChange={async e => { if(e.target.files?.[0]){ setBusy(true); onChange(await uploadFile(e.target.files[0])); setBusy(false); }}} />
          <button onClick={() => ref.current?.click()} style={{ ...btnSm, display:"block", marginBottom:6 }}>{busy?"Uploading...":"📁 Upload"}</button>
          <input style={{ ...inp, fontSize:11 }} value={value} onChange={e=>onChange(e.target.value)} placeholder="or paste URL..." />
        </div>
      </div>
    </div>
  );
}

function MultiUpload({ onAdd }: { onAdd:(url:string,o:string)=>void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [prog, setProg] = useState(0);
  return (
    <div style={{ marginBottom:8 }}>
      <input ref={ref} type="file" accept="image/*" multiple style={{ display:"none" }} onChange={async e => {
        if(!e.target.files) return; setBusy(true);
        const files = Array.from(e.target.files);
        for(let i=0;i<files.length;i++){
          setProg(Math.round(i/files.length*100));
          const url = await uploadFile(files[i]);
          const o = await new Promise<string>(res=>{ const img=new Image(); img.onload=()=>res(img.width>=img.height?"landscape":"portrait"); img.onerror=()=>res("landscape"); img.src=url; });
          onAdd(url,o);
        }
        setBusy(false); setProg(0);
      }} />
      <button onClick={()=>ref.current?.click()} style={btnP}>{busy?`Uploading ${prog}%...`:"📁 Upload Multiple Photos"}</button>
    </div>
  );
}

function Toast({ msg, type }: { msg:string; type:"success"|"error" }) {
  return <div style={{ position:"fixed", top:16, right:16, zIndex:9999, background:type==="success"?"#27ae60":"#e74c3c", color:"#fff", padding:"12px 24px", fontSize:13, borderRadius:4 }}>{msg}</div>;
}

export default function AdminCMS() {
  const [authed, setAuthed] = useState(false);
  const [pin, setPin] = useState(""); const [pinErr, setPinErr] = useState(false);
  const [tab, setTab] = useState("dashboard");
  const [toast, setToast] = useState<{msg:string;type:"success"|"error"}|null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(false);
  const [editProj, setEditProj] = useState<Partial<Project>|null>(null);
  const [projImgs, setProjImgs] = useState<{url:string;orientation:string;is_cover:boolean}[]>([]);
  const [editT, setEditT] = useState<Partial<Testimonial>|null>(null);
  const [editSv, setEditSv] = useState<Partial<Service>|null>(null);
  const [editVid, setEditVid] = useState<Partial<Video>|null>(null);
  const [newCat, setNewCat] = useState("");

  const show = (msg:string, type:"success"|"error"="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  async function doLogin() {
    // PIN is verified server-side (backend/routes/admin-auth.ts) against a Worker
    // secret. No PIN value is ever fetched into or compared within the browser,
    // and there is no hardcoded fallback -- a missing server-side PIN fails closed.
    try {
      await api.adminAuth.verifyPin(pin);
      setAuthed(true); setPinErr(false); load();
    } catch {
      setPinErr(true);
    }
  }

  async function load() {
    setLoading(true);
    const [p,c,t,sv,b,v,st] = await Promise.all([
      supabase.from("portfolio_projects").select("*").order("created_at",{ascending:false}),
      supabase.from("portfolio_categories").select("*").order("display_order"),
      supabase.from("testimonials").select("*").order("display_order"),
      supabase.from("services").select("*").order("display_order"),
      supabase.from("bookings").select("*").order("created_at",{ascending:false}),
      supabase.from("videos").select("*").order("display_order"),
      supabase.from("site_settings").select("*"),
    ]);
    if(p.data) setProjects(p.data);
    if(c.data) setCategories(c.data);
    if(t.data) setTestimonials(t.data);
    if(sv.data) setServices(sv.data);
    if(b.data) setBookings(b.data);
    if(v.data) setVideos(v.data);
    if(st.data) setSettings(st.data.map((s:any)=>({key:s.key,value:typeof s.value==="string"?s.value.replace(/^"|"$/g,""):String(s.value)})));
    setLoading(false);
  }

  const getSt = (k:string) => settings.find(s=>s.key===k)?.value||"";
  const updSt = (k:string,v:string) => setSettings(s=>{const ex=s.find(x=>x.key===k); return ex?s.map(x=>x.key===k?{...x,value:v}:x):[...s,{key:k,value:v}];});

  async function saveSt() {
    for(const s of settings) await supabase.from("site_settings").upsert({key:s.key,value:JSON.stringify(s.value)},{onConflict:"key"});
    show("Settings saved!");
  }

  async function saveProj() {
    if(!editProj?.title) return;
    const p = {...editProj, slug:editProj.slug||slugify(editProj.title||"")};
    let pid = editProj.id;
    if(editProj.id){ await supabase.from("portfolio_projects").update(p).eq("id",editProj.id); }
    else { const {data} = await supabase.from("portfolio_projects").insert(p).select().single(); pid=data?.id; }
    if(pid && projImgs.length>0){
      await supabase.from("portfolio_images").delete().eq("project_id",pid);
      await supabase.from("portfolio_images").insert(projImgs.map((img,i)=>({project_id:pid,image_url:img.url,orientation:img.orientation,is_cover:img.is_cover,display_order:i})));
    }
    show("Project saved!"); setEditProj(null); setProjImgs([]); load();
  }

  async function loadProjImgs(id:string) {
    const {data} = await supabase.from("portfolio_images").select("*").eq("project_id",id).order("display_order");
    if(data) setProjImgs(data.map(d=>({url:d.image_url,orientation:d.orientation||"landscape",is_cover:d.is_cover||false})));
  }

  async function delProj(id:string) {
    if(!confirm("Delete?")) return;
    await supabase.from("portfolio_images").delete().eq("project_id",id);
    await supabase.from("portfolio_projects").delete().eq("id",id);
    show("Deleted!"); load();
  }

  async function saveT() {
    if(!editT?.client_name) return;
    if(editT.id) await supabase.from("testimonials").update(editT).eq("id",editT.id);
    else await supabase.from("testimonials").insert(editT);
    show("Saved!"); setEditT(null); load();
  }

  async function saveSv() {
    if(!editSv?.title) return;
    if(editSv.id) await supabase.from("services").update(editSv).eq("id",editSv.id);
    else await supabase.from("services").insert(editSv);
    show("Saved!"); setEditSv(null); load();
  }

  async function saveVid() {
    if(!editVid?.title||!editVid?.youtube_url) return;
    const v={...editVid,youtube_id:getYTId(editVid.youtube_url||"")};
    if(editVid.id) await supabase.from("videos").update(v).eq("id",editVid.id);
    else await supabase.from("videos").insert(v);
    show("Saved!"); setEditVid(null); load();
  }

  if(!authed) return (
    <div style={{background:C.BG,color:C.FG,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Georgia,serif"}}>
      <div style={{textAlign:"center",width:320}}>
        <div style={{fontSize:11,letterSpacing:6,color:C.MID,marginBottom:8,textTransform:"uppercase"}}>Naveed Anjum</div>
        <div style={{fontSize:11,letterSpacing:6,color:C.MID,marginBottom:32,textTransform:"uppercase"}}>Admin CMS</div>
        <input type="password" value={pin} onChange={e=>setPin(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doLogin()} placeholder="PIN" style={{...inp,textAlign:"center",fontSize:28,letterSpacing:10,marginBottom:16}} />
        {pinErr&&<div style={{color:C.ERROR,fontSize:12,marginBottom:12}}>Incorrect PIN</div>}
        <button onClick={doLogin} style={{...btnP,width:"100%"}}>Login</button>
        <a href="/" style={{display:"block",marginTop:20,color:"#444",fontSize:11,letterSpacing:2,textDecoration:"none",textTransform:"uppercase"}}>← Back to Site</a>
      </div>
    </div>
  );

  const TABS=[["dashboard","📊 Dashboard"],["projects","📷 Portfolio"],["videos","🎬 Videos"],["services","⚡ Services"],["testimonials","⭐ Testimonials"],["categories","🏷 Categories"],["bookings","📋 Bookings"],["settings","⚙️ Settings"]];

  return (
    <div style={{background:C.BG,color:C.FG,minHeight:"100vh",fontFamily:"Georgia,serif",display:"flex"}}>
      {toast&&<Toast msg={toast.msg} type={toast.type} />}

      {/* SIDEBAR */}
      <div style={{width:220,background:"#05050f",borderRight:`1px solid ${C.BORDER}`,padding:"24px 0",position:"fixed",top:0,bottom:0,overflowY:"auto",zIndex:100}}>
        <div style={{padding:"0 20px 24px",borderBottom:`1px solid ${C.BORDER}`}}>
          <div style={{fontSize:12,letterSpacing:4,textTransform:"uppercase",color:C.PL}}>CMS Admin</div>
          <div style={{fontSize:11,color:C.MID,marginTop:4}}>Naveed Anjum</div>
        </div>
        <div style={{padding:"16px 0"}}>
          {TABS.map(([k,l])=>(
            <div key={k} onClick={()=>setTab(k)} style={{padding:"12px 20px",cursor:"pointer",background:tab===k?"rgba(124,92,191,0.15)":"none",borderLeft:tab===k?`3px solid ${C.PL}`:"3px solid transparent",fontSize:12,color:tab===k?C.PL:C.MID,transition:"all 0.2s"}}>{l}</div>
          ))}
          <div style={{borderTop:`1px solid ${C.BORDER}`,margin:"16px 0"}} />
          <a href="/" style={{display:"block",padding:"12px 20px",fontSize:12,color:C.MID,textDecoration:"none"}}>🌐 View Site</a>
          <div onClick={()=>setAuthed(false)} style={{padding:"12px 20px",fontSize:12,color:"#c0392b",cursor:"pointer"}}>🚪 Logout</div>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{marginLeft:220,flex:1,padding:32}}>
        {loading&&<div style={{textAlign:"center",padding:48,color:C.MID}}>Loading...</div>}

        {/* DASHBOARD */}
        {tab==="dashboard"&&(
          <div>
            <h1 style={{fontSize:24,fontWeight:300,letterSpacing:3,marginBottom:32}}>Dashboard</h1>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:16,marginBottom:32}}>
              {[["Projects",projects.length,C.PL],["Published",projects.filter(p=>p.is_published).length,C.SUCCESS],["Videos",videos.length,"#e67e22"],["New Bookings",bookings.filter(b=>b.status==="new").length,C.ERROR],["Testimonials",testimonials.length,"#3498db"],["Services",services.length,C.P]].map(([l,n,col])=>(
                <div key={l as string} style={{...card,textAlign:"center",padding:24}}>
                  <div style={{fontSize:32,fontWeight:300,color:col as string}}>{n as number}</div>
                  <div style={{fontSize:10,letterSpacing:3,color:C.MID,textTransform:"uppercase",marginTop:8}}>{l as string}</div>
                </div>
              ))}
            </div>
            {bookings.filter(b=>b.status==="new").length>0&&(
              <div style={{...card,border:`1px solid ${C.ERROR}`}}>
                <div style={{fontSize:11,letterSpacing:3,color:C.ERROR,textTransform:"uppercase",marginBottom:16}}>New Bookings</div>
                {bookings.filter(b=>b.status==="new").slice(0,5).map(b=>(
                  <div key={b.id} style={{padding:"10px 0",borderBottom:`1px solid ${C.BORDER}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div><div style={{fontSize:13}}>{b.client_name}</div><div style={{fontSize:11,color:C.MID}}>{b.service_type} · {b.created_at?.slice(0,10)}</div></div>
                    <button onClick={()=>setTab("bookings")} style={btnSm}>View</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PROJECTS */}
        {tab==="projects"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
              <h1 style={{fontSize:24,fontWeight:300,letterSpacing:3}}>Portfolio Projects</h1>
              <button onClick={()=>{setEditProj({title:"",is_featured:false,is_published:true,tags:[]});setProjImgs([]);}} style={btnP}>+ New Project</button>
            </div>
            {editProj&&(
              <div style={{...card,marginBottom:24}}>
                <div style={{fontSize:11,letterSpacing:4,color:C.PL,textTransform:"uppercase",marginBottom:20}}>{editProj.id?"Edit":"New"} Project</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
                  <div><label style={lbl}>Title *</label><input style={inp} value={editProj.title||""} onChange={e=>setEditProj(p=>({...p,title:e.target.value,slug:slugify(e.target.value)}))} /></div>
                  <div><label style={lbl}>Slug</label><input style={inp} value={editProj.slug||""} onChange={e=>setEditProj(p=>({...p,slug:e.target.value}))} /></div>
                  <div><label style={lbl}>Client</label><input style={inp} value={editProj.client_name||""} onChange={e=>setEditProj(p=>({...p,client_name:e.target.value}))} /></div>
                  <div><label style={lbl}>Location</label><input style={inp} value={editProj.location||""} onChange={e=>setEditProj(p=>({...p,location:e.target.value}))} /></div>
                  <div><label style={lbl}>Date</label><input type="date" style={inp} value={editProj.project_date||""} onChange={e=>setEditProj(p=>({...p,project_date:e.target.value}))} /></div>
                  <div><label style={lbl}>Category</label>
                    <select style={inp} value={editProj.category_id||""} onChange={e=>setEditProj(p=>({...p,category_id:e.target.value}))}>
                      <option value="">Select...</option>
                      {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{marginBottom:16}}><label style={lbl}>Description</label><textarea style={{...inp,height:80,resize:"vertical" as const}} value={editProj.description||""} onChange={e=>setEditProj(p=>({...p,description:e.target.value}))} /></div>
                <div style={{display:"flex",gap:24,marginBottom:20}}>
                  <label style={{display:"flex",gap:8,alignItems:"center",fontSize:12,color:C.MID,cursor:"pointer"}}><input type="checkbox" checked={!!editProj.is_featured} onChange={e=>setEditProj(p=>({...p,is_featured:e.target.checked}))} />Featured</label>
                  <label style={{display:"flex",gap:8,alignItems:"center",fontSize:12,color:C.MID,cursor:"pointer"}}><input type="checkbox" checked={!!editProj.is_published} onChange={e=>setEditProj(p=>({...p,is_published:e.target.checked}))} />Published</label>
                </div>
                <ImgUpload value={editProj.cover_image_url||""} onChange={url=>setEditProj(p=>({...p,cover_image_url:url}))} label="Cover Image" />
                <div style={{marginBottom:16}}>
                  <label style={lbl}>Gallery ({projImgs.length} photos)</label>
                  <MultiUpload onAdd={(url,o)=>setProjImgs(imgs=>[...imgs,{url,orientation:o,is_cover:imgs.length===0}])} />
                  <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:6,marginTop:12}}>
                    {projImgs.map((img,i)=>(
                      <div key={i} style={{position:"relative",aspectRatio:"1",overflow:"hidden",background:"#0d0d18"}}>
                        <img src={img.url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} />
                        <div style={{position:"absolute",top:2,right:2,background:"rgba(0,0,0,0.8)",color:img.orientation==="portrait"?C.PL:"#7ec8e3",fontSize:8,padding:"1px 4px"}}>{img.orientation==="portrait"?"P":"L"}</div>
                        <button onClick={()=>setProjImgs(imgs=>imgs.filter((_,idx)=>idx!==i))} style={{position:"absolute",top:2,left:2,background:"rgba(0,0,0,0.8)",border:"none",color:"#fff",cursor:"pointer",fontSize:10}}>✕</button>
                        <button onClick={()=>setProjImgs(imgs=>imgs.map((x,idx)=>({...x,is_cover:idx===i})))} style={{position:"absolute",bottom:2,left:2,background:img.is_cover?C.P:"rgba(0,0,0,0.8)",border:"none",color:"#fff",cursor:"pointer",fontSize:8,padding:"1px 4px"}}>Cover</button>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{display:"flex",gap:12}}>
                  <button onClick={saveProj} style={btnP}>Save Project</button>
                  <button onClick={()=>{setEditProj(null);setProjImgs([]);}} style={btnO}>Cancel</button>
                </div>
              </div>
            )}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:16}}>
              {projects.map(p=>(
                <div key={p.id} style={{...card,padding:16}}>
                  {p.cover_image_url&&<img src={p.cover_image_url} alt={p.title} style={{width:"100%",aspectRatio:"4/3",objectFit:"cover",marginBottom:12}} />}
                  <div style={{fontSize:13,marginBottom:4}}>{p.title}</div>
                  <div style={{fontSize:11,color:C.MID,marginBottom:12}}>{p.client_name} · {p.location}</div>
                  <div style={{display:"flex",gap:6,marginBottom:12}}>
                    <span style={{fontSize:9,padding:"2px 8px",background:p.is_published?"rgba(39,174,96,0.2)":"rgba(192,57,43,0.2)",color:p.is_published?C.SUCCESS:C.ERROR,letterSpacing:2}}>{p.is_published?"LIVE":"DRAFT"}</span>
                    {p.is_featured&&<span style={{fontSize:9,padding:"2px 8px",background:"rgba(124,92,191,0.2)",color:C.PL,letterSpacing:2}}>FEATURED</span>}
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={async()=>{setEditProj(p);await loadProjImgs(p.id);}} style={btnSm}>Edit</button>
                    <button onClick={()=>delProj(p.id)} style={btnD}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIDEOS */}
        {tab==="videos"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
              <h1 style={{fontSize:24,fontWeight:300,letterSpacing:3}}>Videos & Reels</h1>
              <button onClick={()=>setEditVid({title:"",youtube_url:"",is_featured:false,display_order:0})} style={btnP}>+ Add Video</button>
            </div>
            {editVid&&(
              <div style={{...card,marginBottom:24}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
                  <div><label style={lbl}>Title *</label><input style={inp} value={editVid.title||""} onChange={e=>setEditVid(v=>({...v,title:e.target.value}))} /></div>
                  <div><label style={lbl}>Category</label><input style={inp} value={editVid.category||""} onChange={e=>setEditVid(v=>({...v,category:e.target.value}))} /></div>
                  <div style={{gridColumn:"1/3"}}><label style={lbl}>YouTube URL *</label><input style={inp} value={editVid.youtube_url||""} onChange={e=>setEditVid(v=>({...v,youtube_url:e.target.value}))} placeholder="https://youtube.com/watch?v=..." /></div>
                  <div><label style={lbl}>Client</label><input style={inp} value={editVid.client_name||""} onChange={e=>setEditVid(v=>({...v,client_name:e.target.value}))} /></div>
                  <div><label style={lbl}>Order</label><input type="number" style={inp} value={editVid.display_order||0} onChange={e=>setEditVid(v=>({...v,display_order:parseInt(e.target.value)}))} /></div>
                  <div style={{gridColumn:"1/3"}}><label style={lbl}>Description</label><textarea style={{...inp,height:70,resize:"vertical" as const}} value={editVid.description||""} onChange={e=>setEditVid(v=>({...v,description:e.target.value}))} /></div>
                </div>
                <label style={{display:"flex",gap:8,alignItems:"center",fontSize:12,color:C.MID,cursor:"pointer",marginBottom:16}}><input type="checkbox" checked={!!editVid.is_featured} onChange={e=>setEditVid(v=>({...v,is_featured:e.target.checked}))} />Featured</label>
                {editVid.youtube_url&&getYTId(editVid.youtube_url)&&<img src={`https://img.youtube.com/vi/${getYTId(editVid.youtube_url)}/maxresdefault.jpg`} alt="" style={{width:240,height:135,objectFit:"cover",marginBottom:16}} />}
                <div style={{display:"flex",gap:12}}>
                  <button onClick={saveVid} style={btnP}>Save</button>
                  <button onClick={()=>setEditVid(null)} style={btnO}>Cancel</button>
                </div>
              </div>
            )}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:16}}>
              {videos.map(v=>(
                <div key={v.id} style={{...card,padding:16}}>
                  {v.youtube_id&&<img src={`https://img.youtube.com/vi/${v.youtube_id}/maxresdefault.jpg`} alt={v.title} style={{width:"100%",aspectRatio:"16/9",objectFit:"cover",marginBottom:12}} />}
                  <div style={{fontSize:13,marginBottom:4}}>{v.title}</div>
                  <div style={{fontSize:11,color:C.MID,marginBottom:12}}>{v.category}</div>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>setEditVid(v)} style={btnSm}>Edit</button>
                    <button onClick={async()=>{if(confirm("Delete?")){await supabase.from("videos").delete().eq("id",v.id);show("Deleted!");load();}}} style={btnD}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SERVICES */}
        {tab==="services"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
              <h1 style={{fontSize:24,fontWeight:300,letterSpacing:3}}>Services</h1>
              <button onClick={()=>setEditSv({title:"",is_active:true,display_order:0})} style={btnP}>+ Add</button>
            </div>
            {editSv&&(
              <div style={{...card,marginBottom:24}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
                  <div><label style={lbl}>Icon</label><input style={inp} value={editSv.icon_name||""} onChange={e=>setEditSv(s=>({...s,icon_name:e.target.value}))} placeholder="📷" /></div>
                  <div><label style={lbl}>Title *</label><input style={inp} value={editSv.title||""} onChange={e=>setEditSv(s=>({...s,title:e.target.value}))} /></div>
                  <div style={{gridColumn:"1/3"}}><label style={lbl}>Description</label><input style={inp} value={editSv.description||""} onChange={e=>setEditSv(s=>({...s,description:e.target.value}))} /></div>
                  <div><label style={lbl}>Order</label><input type="number" style={inp} value={editSv.display_order||0} onChange={e=>setEditSv(s=>({...s,display_order:parseInt(e.target.value)}))} /></div>
                  <label style={{display:"flex",gap:8,alignItems:"center",fontSize:12,color:C.MID,cursor:"pointer",paddingTop:20}}><input type="checkbox" checked={!!editSv.is_active} onChange={e=>setEditSv(s=>({...s,is_active:e.target.checked}))} />Active</label>
                </div>
                <div style={{display:"flex",gap:12}}>
                  <button onClick={saveSv} style={btnP}>Save</button>
                  <button onClick={()=>setEditSv(null)} style={btnO}>Cancel</button>
                </div>
              </div>
            )}
            {services.map(sv=>(
              <div key={sv.id} style={{...card,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{display:"flex",alignItems:"center",gap:16}}>
                  <div style={{fontSize:24}}>{sv.icon_name}</div>
                  <div><div style={{fontSize:13}}>{sv.title}</div><div style={{fontSize:11,color:C.MID}}>{sv.description}</div></div>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>setEditSv(sv)} style={btnSm}>Edit</button>
                  <button onClick={async()=>{if(confirm("Delete?")){await supabase.from("services").delete().eq("id",sv.id);show("Deleted!");load();}}} style={btnD}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TESTIMONIALS */}
        {tab==="testimonials"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
              <h1 style={{fontSize:24,fontWeight:300,letterSpacing:3}}>Testimonials</h1>
              <button onClick={()=>setEditT({client_name:"",rating:5,is_active:true})} style={btnP}>+ Add</button>
            </div>
            {editT&&(
              <div style={{...card,marginBottom:24}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
                  <div><label style={lbl}>Name *</label><input style={inp} value={editT.client_name||""} onChange={e=>setEditT(t=>({...t,client_name:e.target.value}))} /></div>
                  <div><label style={lbl}>Title/Role</label><input style={inp} value={editT.client_title||""} onChange={e=>setEditT(t=>({...t,client_title:e.target.value}))} /></div>
                  <div><label style={lbl}>Company</label><input style={inp} value={editT.client_company||""} onChange={e=>setEditT(t=>({...t,client_company:e.target.value}))} /></div>
                  <div><label style={lbl}>Rating</label><input type="number" min={1} max={5} style={inp} value={editT.rating||5} onChange={e=>setEditT(t=>({...t,rating:parseInt(e.target.value)}))} /></div>
                  <div style={{gridColumn:"1/3"}}><label style={lbl}>Quote *</label><textarea style={{...inp,height:90,resize:"vertical" as const}} value={editT.content||""} onChange={e=>setEditT(t=>({...t,content:e.target.value}))} /></div>
                </div>
                <div style={{display:"flex",gap:12}}>
                  <button onClick={saveT} style={btnP}>Save</button>
                  <button onClick={()=>setEditT(null)} style={btnO}>Cancel</button>
                </div>
              </div>
            )}
            {testimonials.map(t=>(
              <div key={t.id} style={{...card,display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div>
                  <div style={{fontSize:13,marginBottom:4}}>{t.client_name} — {t.client_title} · {t.client_company}</div>
                  <div style={{fontSize:12,color:C.MID,maxWidth:500}}>{t.content}</div>
                </div>
                <div style={{display:"flex",gap:8,flexShrink:0}}>
                  <button onClick={()=>setEditT(t)} style={btnSm}>Edit</button>
                  <button onClick={async()=>{if(confirm("Delete?")){await supabase.from("testimonials").delete().eq("id",t.id);show("Deleted!");load();}}} style={btnD}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CATEGORIES */}
        {tab==="categories"&&(
          <div>
            <h1 style={{fontSize:24,fontWeight:300,letterSpacing:3,marginBottom:24}}>Categories</h1>
            <div style={{display:"flex",gap:8,marginBottom:24}}>
              <input style={{...inp,flex:1}} value={newCat} onChange={e=>setNewCat(e.target.value)} onKeyDown={async e=>{if(e.key==="Enter"&&newCat.trim()){await supabase.from("portfolio_categories").insert({name:newCat,slug:slugify(newCat),type:"photography"});setNewCat("");show("Added!");load();}}} placeholder="New category..." />
              <button onClick={async()=>{if(newCat.trim()){await supabase.from("portfolio_categories").insert({name:newCat,slug:slugify(newCat),type:"photography"});setNewCat("");show("Added!");load();}}} style={btnP}>Add</button>
            </div>
            {categories.map(c=>(
              <div key={c.id} style={{...card,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px"}}>
                <div><span style={{fontSize:13}}>{c.name}</span><span style={{fontSize:11,color:C.MID,marginLeft:12}}>{c.slug}</span></div>
                <button onClick={async()=>{if(confirm("Delete?")){await supabase.from("portfolio_categories").delete().eq("id",c.id);show("Deleted!");load();}}} style={btnD}>Delete</button>
              </div>
            ))}
          </div>
        )}

        {/* BOOKINGS */}
        {tab==="bookings"&&(
          <div>
            <h1 style={{fontSize:24,fontWeight:300,letterSpacing:3,marginBottom:24}}>Bookings</h1>
            {bookings.map(b=>(
              <div key={b.id} style={{...card,marginBottom:16}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,marginBottom:12}}>
                  <div><label style={lbl}>Client</label><div style={{fontSize:13}}>{b.client_name}</div></div>
                  <div><label style={lbl}>Email</label><div style={{fontSize:13}}>{b.client_email}</div></div>
                  <div><label style={lbl}>Phone</label><div style={{fontSize:13}}>{b.client_phone}</div></div>
                  <div><label style={lbl}>Service</label><div style={{fontSize:13}}>{b.service_type}</div></div>
                  <div><label style={lbl}>Date</label><div style={{fontSize:13}}>{b.event_date}</div></div>
                  <div><label style={lbl}>Budget</label><div style={{fontSize:13}}>{b.budget_range}</div></div>
                </div>
                {b.message&&<div style={{marginBottom:12}}><label style={lbl}>Message</label><div style={{fontSize:13,color:C.MID}}>{b.message}</div></div>}
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <label style={lbl}>Status:</label>
                  <select style={{...inp,width:"auto",padding:"6px 12px"}} value={b.status} onChange={async e=>{await supabase.from("bookings").update({status:e.target.value}).eq("id",b.id);show("Updated!");load();}}>
                    {["new","contacted","in_progress","confirmed","completed","cancelled"].map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                  <span style={{fontSize:10,color:C.MID}}>{b.created_at?.slice(0,10)}</span>
                </div>
              </div>
            ))}
            {bookings.length===0&&<div style={{color:C.MID,textAlign:"center",padding:48}}>No bookings yet.</div>}
          </div>
        )}

        {/* SETTINGS */}
        {tab==="settings"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
              <h1 style={{fontSize:24,fontWeight:300,letterSpacing:3}}>Site Settings</h1>
              <button onClick={saveSt} style={btnP}>💾 Save All</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24}}>
              <div style={card}>
                <div style={{fontSize:11,letterSpacing:4,color:C.PL,textTransform:"uppercase",marginBottom:16}}>General</div>
                {[["site_name","Site Name"],["site_tagline","Tagline"],["stats_years","Years"],["stats_projects","Projects"],["stats_clients","Clients"]].map(([k,l])=>(
                  <div key={k} style={{marginBottom:12}}><label style={lbl}>{l}</label><input style={inp} value={getSt(k)} onChange={e=>updSt(k,e.target.value)} /></div>
                ))}
              </div>
              <div style={card}>
                <div style={{fontSize:11,letterSpacing:4,color:C.PL,textTransform:"uppercase",marginBottom:16}}>Contact</div>
                {[["phone","Phone"],["email","Email"],["whatsapp","WhatsApp Number"],["location","Location"]].map(([k,l])=>(
                  <div key={k} style={{marginBottom:12}}><label style={lbl}>{l}</label><input style={inp} value={getSt(k)} onChange={e=>updSt(k,e.target.value)} /></div>
                ))}
              </div>
              <div style={card}>
                <div style={{fontSize:11,letterSpacing:4,color:C.PL,textTransform:"uppercase",marginBottom:16}}>Social Media</div>
                {[["instagram","Instagram"],["youtube","YouTube"],["linkedin","LinkedIn"],["tiktok","TikTok"]].map(([k,l])=>(
                  <div key={k} style={{marginBottom:12}}><label style={lbl}>{l}</label><input style={inp} value={getSt(k)} onChange={e=>updSt(k,e.target.value)} /></div>
                ))}
              </div>
              <div style={card}>
                <div style={{fontSize:11,letterSpacing:4,color:C.PL,textTransform:"uppercase",marginBottom:16}}>SEO & Admin</div>
                {[["seo_title","SEO Title"],["seo_description","SEO Description"],["footer_copyright","Footer Copyright"]].map(([k,l])=>(
                  <div key={k} style={{marginBottom:12}}><label style={lbl}>{l}</label><input style={inp} value={getSt(k)} onChange={e=>updSt(k,e.target.value)} /></div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}