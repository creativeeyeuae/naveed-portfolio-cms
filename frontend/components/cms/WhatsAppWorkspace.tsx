"use client";
// ─── WHATSAPP BUSINESS CRM / COMMUNICATION CENTER ───────────────────────────────────────────
// Upgrade of the former inline "WhatsApp" tab (previously ~210 lines inside HomeClient.tsx).
// Pulled into its own component because the full spec (14-section workspace) would have made
// an already-7900-line file unmanageable -- the architecture, endpoints, migrations (0008-0012)
// and database are completely untouched; this file only reorganizes/extends the UI that reads
// and writes them.
//
// REAL vs UI-ONLY, at a glance (see each section's own comments for the exact reasoning):
//   REAL (reuses existing admin endpoints, same as before):
//     Inbox (conversations/messages/search/filters), Quick Replies, Connection, Overview,
//     Contacts/Companies (derived from real conversations), and -- new this pass -- the right
//     CRM panel's Lead Status / Notes / Tasks / Meetings / Tags, which reuse the exact same
//     /api/admin/clients/:id/* endpoints the Client Directory tab already uses.
//   UI/STATE ONLY, clearly marked, nothing faked as real/sent/delivered:
//     Templates & Message Designer (saved to this browser only via localStorage -- no
//     database table exists for them yet), Broadcasts, Campaigns, Automations, Media Library,
//     Scheduled, and the message-level delivery-funnel half of Reports.
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

// Draws the bridge's raw qr_code string as an actual scannable black/white QR image,
// the same way web.whatsapp.com does -- replaces having to read it off the VPS console.
// Re-renders whenever `data` changes (the bridge posts a fresh one roughly every 20-60s
// until it's scanned, driven by the polling in the Connection section below).
function WhatsAppQrCode({ data, size = 260 }: { data: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!data || !canvasRef.current) return;
    setError(null);
    QRCode.toCanvas(canvasRef.current, data, { width: size, margin: 2 }, (err) => {
      if (err) setError("Could not draw the QR code image.");
    });
  }, [data, size]);
  return (
    <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 10 }}>
      <div style={{ background: "#fff", padding: 16, borderRadius: 8, display: "inline-block" }}>
        <canvas ref={canvasRef} width={size} height={size} />
      </div>
      {error && <div style={{ fontSize: 12, color: "#f87171" }}>{error}</div>}
    </div>
  );
}

// ─── THEME (local copy of HomeClient.tsx's C/S/CARD_STYLE/StatusPill tokens, kept in sync by
// value so this workspace matches the rest of the CMS pixel-for-pixel, without importing from
// -- and so coupling this component's module graph to -- the giant HomeClient.tsx file) ──────
const C = { P:"var(--c-p,#8B5CF6)",PL:"var(--c-pl,#E2D9F3)",PD:"var(--c-pd,#A855F7)",GOLD:"var(--c-gold,#8B5CF6)",GOLDL:"var(--c-goldl,#A855F7)",BG:"var(--c-bg,#170F28)",FG:"var(--c-fg,#FFFFFF)",MID:"var(--c-mid,#A892C6)",DARK:"var(--c-dark,#221640)",BORDER:"var(--c-border,#3D2A5E)",
  LT:"var(--c-lt,#F8F6FC)",LTCARD:"var(--c-ltcard,#FFFFFF)",LTBORDER:"var(--c-ltborder,rgba(139,92,246,0.14))",INKMID:"var(--c-inkmid,#6E6480)" };
const S = {
  inp:{background:"#1C1330",border:"1px solid rgba(255,255,255,0.08)",color:C.FG,padding:"12px 16px",fontSize:13,width:"100%",outline:"none",boxSizing:"border-box"} as React.CSSProperties,
  btnP:{background:C.P,border:"none",color:C.BG,padding:"13px 36px",fontSize:13,fontWeight:700,letterSpacing:3,textTransform:"uppercase" as const,cursor:"pointer",borderRadius:2},
  btnO:{background:"none",border:"1px solid rgba(255,255,255,0.18)",color:C.FG,padding:"13px 36px",fontSize:13,fontWeight:700,letterSpacing:3,textTransform:"uppercase" as const,cursor:"pointer",borderRadius:2},
  btnSm:{background:C.P,border:"none",color:C.BG,padding:"8px 18px",fontSize:10,letterSpacing:2,textTransform:"uppercase" as const,cursor:"pointer",borderRadius:2},
  lbl:{fontSize:11,letterSpacing:3,color:C.MID,textTransform:"uppercase" as const,display:"block" as const,marginBottom:6},
};
const CARD_STYLE:React.CSSProperties = {background:C.DARK,border:`1px solid ${C.BORDER}`,borderRadius:12,boxShadow:"0 2px 10px rgba(0,0,0,0.35)"};
const STATUS_PILL_COLORS: Record<string,{bg:string;fg:string}> = {
  open:{bg:"rgba(34,197,94,0.16)",fg:"#4ade80"}, connected:{bg:"rgba(34,197,94,0.16)",fg:"#4ade80"}, approved:{bg:"rgba(34,197,94,0.16)",fg:"#4ade80"},
  pending:{bg:"rgba(245,158,11,0.18)",fg:"#fbbf24"}, connecting:{bg:"rgba(245,158,11,0.18)",fg:"#fbbf24"}, draft:{bg:"rgba(148,163,184,0.16)",fg:"#94a3b8"},
  closed:{bg:"rgba(148,163,184,0.16)",fg:"#94a3b8"}, not_connected:{bg:"rgba(239,68,68,0.16)",fg:"#f87171"}, failed:{bg:"rgba(239,68,68,0.16)",fg:"#f87171"},
  rejected:{bg:"rgba(239,68,68,0.16)",fg:"#f87171"}, error:{bg:"rgba(239,68,68,0.16)",fg:"#f87171"}, disabled:{bg:"rgba(148,163,184,0.16)",fg:"#94a3b8"},
  archived:{bg:"rgba(148,163,184,0.16)",fg:"#94a3b8"}, read:{bg:"rgba(34,197,94,0.16)",fg:"#4ade80"}, delivered:{bg:"rgba(139,92,246,0.18)",fg:"#c4b5fd"},
  sent:{bg:"rgba(139,92,246,0.18)",fg:"#c4b5fd"}, queued:{bg:"rgba(245,158,11,0.18)",fg:"#fbbf24"},
};
function StatusPill({status}:{status:string}) {
  const key = String(status||"").trim().toLowerCase().replace(/\s+/g,"_");
  const c = STATUS_PILL_COLORS[key] || {bg:"rgba(139,92,246,0.18)",fg:"#c4b5fd"};
  return <span style={{display:"inline-block",fontSize:10,fontWeight:700,letterSpacing:0.4,textTransform:"uppercase" as const,padding:"3px 9px",borderRadius:20,background:c.bg,color:c.fg,whiteSpace:"nowrap" as const}}>{String(status||"—").replace(/_/g," ")}</span>;
}
// Small amber tag used everywhere a control is real UI/state but has no backend behind it yet
// -- never a fake success state, always an honest "this needs backend work" label.
function NeedsBackend({label}:{label:string}) {
  return <span title={label} style={{fontSize:9.5,fontWeight:700,letterSpacing:0.5,textTransform:"uppercase" as const,padding:"2px 7px",borderRadius:20,background:"rgba(245,158,11,0.14)",color:"#fbbf24",border:"1px solid rgba(245,158,11,0.3)",whiteSpace:"nowrap" as const}}>needs backend</span>;
}
function ComingSoonPanel({icon,title,blurb,needs}:{icon:string;title:string;blurb:string;needs:string[]}) {
  return (
    <div style={{...CARD_STYLE,padding:"48px 32px",textAlign:"center" as const,maxWidth:620,margin:"0 auto"}}>
      <div style={{fontSize:34,marginBottom:14,opacity:0.85}}>{icon}</div>
      <div style={{fontSize:15,fontWeight:700,color:C.FG,marginBottom:10}}>{title}</div>
      <div style={{fontSize:13,color:C.MID,lineHeight:1.7,marginBottom:18}}>{blurb}</div>
      <div style={{display:"flex",flexDirection:"column" as const,gap:6,alignItems:"center"}}>
        {needs.map((n,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:C.MID}}>
            <NeedsBackend label={n} /> <span>{n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── CRM variables available to Templates / Message Designer (exact set requested) ──────────
const WA_VARIABLES:[string,string][] = [["first_name","First name"],["company","Company"],["service","Service"],["price","Price"],["date","Date"],["agent_name","Agent name"],["website","Website"]];
const WA_VAR_SAMPLE:Record<string,string> = {first_name:"Sarah",company:"Acme Events",service:"Wedding Photography",price:"AED 4,500",date:"12 Dec 2026",agent_name:"Naveed",website:"bynaveedanjum.com"};
function substituteVars(text:string){ return String(text||"").replace(/\{\{(\w+)\}\}/g,(_,k)=>WA_VAR_SAMPLE[k]??`{{${k}}}`); }

const TEMPLATE_STATUSES = ["draft","pending","approved","rejected","disabled","archived"] as const;
const DESIGNER_BLOCK_TYPES:{type:string;label:string;icon:string;needsBackend?:boolean}[] = [
  {type:"heading",label:"Heading",icon:"🔤"},
  {type:"text",label:"Text",icon:"📝"},
  {type:"price",label:"Price",icon:"💰"},
  {type:"offer",label:"Offer",icon:"🎁"},
  {type:"cta",label:"CTA Button",icon:"👉"},
  {type:"website",label:"Website",icon:"🌐"},
  {type:"phone",label:"Phone",icon:"📞"},
  {type:"image",label:"Logo / Image",icon:"🖼",needsBackend:true},
];

const NAV_ITEMS:{key:string;icon:string;label:string}[] = [
  {key:"overview",icon:"📊",label:"Overview"},
  {key:"inbox",icon:"💬",label:"Inbox"},
  {key:"contacts",icon:"👤",label:"Contacts"},
  {key:"companies",icon:"🏢",label:"Companies"},
  {key:"broadcasts",icon:"📣",label:"Broadcasts"},
  {key:"campaigns",icon:"🚀",label:"Campaigns"},
  {key:"templates",icon:"🧩",label:"Templates"},
  {key:"designer",icon:"🎨",label:"Message Designer"},
  {key:"automations",icon:"🤖",label:"Automations"},
  {key:"quickreplies",icon:"⚡",label:"Quick Replies"},
  {key:"media",icon:"🗂",label:"Media Library"},
  {key:"scheduled",icon:"🕒",label:"Scheduled"},
  {key:"reports",icon:"📈",label:"Reports"},
  {key:"settings",icon:"🔧",label:"Settings"},
];

type Props = {
  adminSession:any;
  isMobile:boolean;
  customersList?:any[]|null;
  onConversationsChange?:(list:any[])=>void;
  onOpenCrmProfile?:(customerId:string)=>void;
};

export default function WhatsAppWorkspace({adminSession,isMobile,customersList,onConversationsChange,onOpenCrmProfile}:Props){
  const [section,setSection]=useState<string>("overview");
  const [navOpenMobile,setNavOpenMobile]=useState(false);

  // ── Inbox: conversations ──────────────────────────────────────────────────────────────────
  const [conversations,setConversations]=useState<any[]|null>(null);
  const [conversationsLoading,setConversationsLoading]=useState(false);
  const [search,setSearch]=useState("");
  const [statusFilter,setStatusFilter]=useState<"all"|"open"|"pending"|"closed">("all");
  const [quickFilter,setQuickFilter]=useState<"all"|"unread"|"mine"|"unassigned">("all");
  const [openConversationId,setOpenConversationId]=useState<string|null>(null);
  const [conversationDetail,setConversationDetail]=useState<any>(null);
  const [conversationLoading,setConversationLoading]=useState(false);
  const [composeText,setComposeText]=useState("");
  const [busy,setBusy]=useState(false);
  const [newConvOpen,setNewConvOpen]=useState(false);
  const NEW_CONV_EMPTY={customer_id:"",wa_phone:"",wa_name:""};
  const [newConvForm,setNewConvForm]=useState<any>(NEW_CONV_EMPTY);
  const [mobileInfoOpen,setMobileInfoOpen]=useState(false);

  // ── Quick Replies ─────────────────────────────────────────────────────────────────────────
  const [quickReplies,setQuickReplies]=useState<any[]|null>(null);
  const [quickRepliesLoading,setQuickRepliesLoading]=useState(false);
  const QUICK_REPLY_EMPTY={title:"",body:"",category:""};
  const [quickReplyForm,setQuickReplyForm]=useState<any>(QUICK_REPLY_EMPTY);
  const [quickReplyEditId,setQuickReplyEditId]=useState<string|null>(null);
  const [quickPickerOpen,setQuickPickerOpen]=useState(false);

  // ── Connection ─────────────────────────────────────────────────────────────────────────────
  const [connection,setConnection]=useState<any>(null);
  const [connectionLoading,setConnectionLoading]=useState(false);

  // ── Right CRM panel (reuses /api/admin/clients/:id/* -- same endpoints the Client Directory
  // tab already uses, so every write here shows up there too, and vice versa) ─────────────────
  const [crmDetail,setCrmDetail]=useState<any>(null);
  const [crmLoading,setCrmLoading]=useState(false);
  const [crmBusy,setCrmBusy]=useState(false);
  const [noteText,setNoteText]=useState("");
  const [taskForm,setTaskForm]=useState({title:"",due_date:"",assigned_to:""});
  const [meetingForm,setMeetingForm]=useState({event:"",meeting_date:"",location:"",notes:""});
  const [newTag,setNewTag]=useState("");

  // ── Templates (local-only -- no database table exists yet; see file header) ────────────────
  const [templates,setTemplates]=useState<any[]>([]);
  const TEMPLATE_EMPTY={title:"",status:"draft",body:""};
  const [templateForm,setTemplateForm]=useState<any>(TEMPLATE_EMPTY);
  const [templateEditId,setTemplateEditId]=useState<string|null>(null);

  // ── Message Designer (local-only) ───────────────────────────────────────────────────────────
  const [designerBlocks,setDesignerBlocks]=useState<{id:string;type:string;text:string}[]>([]);
  const [designerName,setDesignerName]=useState("");
  const [designerPreview,setDesignerPreview]=useState<"desktop"|"mobile">("mobile");
  const [insertedNotice,setInsertedNotice]=useState("");

  function authHeaders(json=true):Record<string,string>{
    const h:Record<string,string>={Authorization:`Bearer ${adminSession?.access_token||""}`};
    if(json) h["Content-Type"]="application/json";
    return h;
  }

  // ── Loaders / actions -- every one of these hits a real, already-existing admin endpoint ───
  async function loadConversations(){
    if(!adminSession) return;
    setConversationsLoading(true);
    try{
      const res=await fetch("/api/admin/whatsapp/conversations",{headers:authHeaders(false)});
      const data=await res.json();
      if(res.ok){ setConversations(data.conversations||[]); onConversationsChange?.(data.conversations||[]); }
    }catch{}
    setConversationsLoading(false);
  }
  async function loadConversationDetail(id:string){
    if(!adminSession) return;
    setOpenConversationId(id); setConversationDetail(null); setCrmDetail(null); setConversationLoading(true); setMobileInfoOpen(false);
    try{
      const res=await fetch(`/api/admin/whatsapp/conversations/${id}`,{headers:authHeaders(false)});
      const data=await res.json();
      if(res.ok){
        setConversationDetail(data);
        if(data.conversation?.customers?.id) loadCrmDetail(data.conversation.customers.id);
      }
      await fetch(`/api/admin/whatsapp/conversations/${id}/read`,{method:"POST",headers:authHeaders(false)});
      await loadConversations();
    }catch{}
    setConversationLoading(false);
  }
  async function createConversation(){
    if(!adminSession) return;
    if(!newConvForm.wa_phone.trim()){ alert("A WhatsApp phone number is required."); return; }
    setBusy(true);
    try{
      const res=await fetch("/api/admin/whatsapp/conversations",{method:"POST",headers:authHeaders(),body:JSON.stringify(newConvForm)});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||"Could not create conversation");
      setNewConvForm(NEW_CONV_EMPTY); setNewConvOpen(false);
      await loadConversations();
      if(data.conversation?.id) await loadConversationDetail(data.conversation.id);
    }catch(e:any){ alert(e.message||"Could not create conversation"); }
    setBusy(false);
  }
  async function sendMessage(){
    if(!adminSession||!openConversationId||!composeText.trim()) return;
    setBusy(true);
    try{
      const res=await fetch(`/api/admin/whatsapp/conversations/${openConversationId}/messages`,{method:"POST",headers:authHeaders(),body:JSON.stringify({body:composeText.trim()})});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||"Could not save message");
      setComposeText(""); setInsertedNotice("");
      await loadConversationDetail(openConversationId);
    }catch(e:any){ alert(e.message||"Could not save message"); }
    setBusy(false);
  }
  async function updateConversation(fields:any){
    if(!adminSession||!openConversationId) return;
    setBusy(true);
    try{
      const res=await fetch(`/api/admin/whatsapp/conversations/${openConversationId}`,{method:"PATCH",headers:authHeaders(),body:JSON.stringify(fields)});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||"Could not update conversation");
      await loadConversationDetail(openConversationId);
    }catch(e:any){ alert(e.message||"Could not update conversation"); }
    setBusy(false);
  }
  async function loadQuickReplies(){
    if(!adminSession) return;
    setQuickRepliesLoading(true);
    try{ const res=await fetch("/api/admin/whatsapp/quick-replies",{headers:authHeaders(false)}); const data=await res.json(); if(res.ok) setQuickReplies(data.quick_replies||[]); }catch{}
    setQuickRepliesLoading(false);
  }
  async function saveQuickReply(){
    if(!adminSession) return;
    if(!quickReplyForm.title.trim()||!quickReplyForm.body.trim()){ alert("A title and body are required."); return; }
    setBusy(true);
    try{
      const isNew=!quickReplyEditId;
      const url=isNew?"/api/admin/whatsapp/quick-replies":`/api/admin/whatsapp/quick-replies/${quickReplyEditId}`;
      const res=await fetch(url,{method:isNew?"POST":"PATCH",headers:authHeaders(),body:JSON.stringify(quickReplyForm)});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||"Could not save quick reply");
      setQuickReplyForm(QUICK_REPLY_EMPTY); setQuickReplyEditId(null);
      await loadQuickReplies();
    }catch(e:any){ alert(e.message||"Could not save quick reply"); }
    setBusy(false);
  }
  async function deleteQuickReply(id:string){
    if(!adminSession) return;
    if(!confirm("Delete this quick reply?")) return;
    setBusy(true);
    try{
      const res=await fetch(`/api/admin/whatsapp/quick-replies/${id}`,{method:"DELETE",headers:authHeaders(false)});
      const data=await res.json().catch(()=>({} as any));
      if(!res.ok) throw new Error(data.error||"Could not delete quick reply");
      await loadQuickReplies();
    }catch(e:any){ alert(e.message||"Could not delete quick reply"); }
    setBusy(false);
  }
  async function loadConnection(){
    if(!adminSession) return;
    setConnectionLoading(true);
    try{ const res=await fetch("/api/admin/whatsapp/connection",{headers:authHeaders(false)}); const data=await res.json(); if(res.ok) setConnection(data.connection); }catch{}
    setConnectionLoading(false);
  }
  // Manual disconnect/reconnect (migration 0018) -- logs the bridge out cleanly and the next
  // auto-connect attempt shows a brand-new QR, same as scanning in for the first time.
  const [connectionDisconnecting,setConnectionDisconnecting]=useState(false);
  async function disconnectWhatsApp(){
    if(!adminSession) return;
    if(!confirm("Disconnect WhatsApp? You'll need to scan a new QR code to reconnect.")) return;
    setConnectionDisconnecting(true);
    try{
      const res=await fetch("/api/admin/whatsapp/disconnect",{method:"POST",headers:authHeaders(false)});
      const data=await res.json().catch(()=>({} as any));
      if(!res.ok) throw new Error(data.error||"Could not disconnect");
      await loadConnection();
    }catch(e:any){ alert(e.message||"Could not disconnect"); }
    setConnectionDisconnecting(false);
  }

  // ── Broadcasts (migration 0019) -- recipients are always existing conversations (people
  // who've already exchanged a real message), never a pasted number list; sending is
  // staggered server-side (see broadcasts/[id]/start.ts) so this can never fire all at once.
  const BROADCAST_MAX_RECIPIENTS=250;
  const [broadcasts,setBroadcasts]=useState<any[]|null>(null);
  const [broadcastsLoading,setBroadcastsLoading]=useState(false);
  const [broadcastName,setBroadcastName]=useState("");
  const [broadcastBody,setBroadcastBody]=useState("");
  const [broadcastRecipientIds,setBroadcastRecipientIds]=useState<string[]>([]);
  const [broadcastBusy,setBroadcastBusy]=useState(false);
  async function loadBroadcasts(){
    if(!adminSession) return;
    setBroadcastsLoading(true);
    try{ const res=await fetch("/api/admin/whatsapp/broadcasts",{headers:authHeaders(false)}); const data=await res.json(); if(res.ok) setBroadcasts(data.broadcasts||[]); }catch{}
    setBroadcastsLoading(false);
  }
  function toggleBroadcastRecipient(id:string){
    setBroadcastRecipientIds(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);
  }
  async function createBroadcast(){
    if(!broadcastName.trim()||!broadcastBody.trim()||broadcastRecipientIds.length===0) return;
    setBroadcastBusy(true);
    try{
      const res=await fetch("/api/admin/whatsapp/broadcasts",{method:"POST",headers:authHeaders(),body:JSON.stringify({name:broadcastName.trim(),body:broadcastBody.trim(),conversationIds:broadcastRecipientIds})});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||"Could not create broadcast");
      setBroadcastName(""); setBroadcastBody(""); setBroadcastRecipientIds([]);
      await loadBroadcasts();
    }catch(e:any){ alert(e.message||"Could not create broadcast"); }
    setBroadcastBusy(false);
  }
  async function startBroadcast(id:string){
    if(!confirm("Start sending? Messages will go out gradually (not all at once) to reduce the risk of this number getting flagged.")) return;
    setBroadcastBusy(true);
    try{
      const res=await fetch(`/api/admin/whatsapp/broadcasts/${id}/start`,{method:"POST",headers:authHeaders(false)});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||"Could not start broadcast");
      alert(`Sending to ${data.recipients} people, spread out over roughly ${data.eta_minutes} minute(s).`);
      await loadBroadcasts();
    }catch(e:any){ alert(e.message||"Could not start broadcast"); }
    setBroadcastBusy(false);
  }
  async function cancelBroadcast(id:string){
    if(!confirm("Cancel this broadcast? Anything already sent stays sent; everything still waiting will be stopped.")) return;
    setBroadcastBusy(true);
    try{
      const res=await fetch(`/api/admin/whatsapp/broadcasts/${id}/cancel`,{method:"POST",headers:authHeaders(false)});
      const data=await res.json().catch(()=>({} as any));
      if(!res.ok) throw new Error(data.error||"Could not cancel broadcast");
      await loadBroadcasts();
    }catch(e:any){ alert(e.message||"Could not cancel broadcast"); }
    setBroadcastBusy(false);
  }

  // Right CRM panel -- same /api/admin/clients/:id family the Client Directory tab uses.
  async function loadCrmDetail(customerId:string){
    if(!adminSession) return;
    setCrmLoading(true);
    try{ const res=await fetch(`/api/admin/clients/${customerId}`,{headers:authHeaders(false)}); const data=await res.json(); if(res.ok) setCrmDetail(data); }catch{}
    setCrmLoading(false);
  }
  async function crmPost(path:string,body:any){
    const customerId=conversationDetail?.conversation?.customers?.id;
    if(!adminSession||!customerId) return null;
    setCrmBusy(true);
    try{
      const res=await fetch(`/api/admin/clients/${customerId}/${path}`,{method:"POST",headers:authHeaders(),body:JSON.stringify(body)});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||"Request failed");
      await loadCrmDetail(customerId);
      return data;
    }catch(e:any){ alert(e.message||"Request failed"); return null; }
    finally{ setCrmBusy(false); }
  }
  async function crmUpdateLeadStatus(lead_status:string){
    const customerId=conversationDetail?.conversation?.customers?.id;
    if(!adminSession||!customerId) return;
    setCrmBusy(true);
    try{
      const res=await fetch(`/api/admin/clients/${customerId}/update`,{method:"PATCH",headers:authHeaders(),body:JSON.stringify({lead_status})});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||"Could not save");
      await loadCrmDetail(customerId);
    }catch(e:any){ alert(e.message||"Could not save"); }
    setCrmBusy(false);
  }
  async function crmAddNote(){ if(!noteText.trim()) return; const ok=await crmPost("notes",{body:noteText.trim()}); if(ok) setNoteText(""); }
  async function crmAddTask(){ if(!taskForm.title.trim()){ alert("Task title is required."); return; } const ok=await crmPost("tasks",taskForm); if(ok) setTaskForm({title:"",due_date:"",assigned_to:""}); }
  async function crmAddMeeting(){ if(!meetingForm.event.trim()&&!meetingForm.meeting_date){ alert("Add at least an event or a date."); return; } const ok=await crmPost("meetings",meetingForm); if(ok) setMeetingForm({event:"",meeting_date:"",location:"",notes:""}); }
  async function crmAddTag(){ if(!newTag.trim()) return; const ok=await crmPost("tags",{name:newTag.trim()}); if(ok) setNewTag(""); }
  async function crmRemoveTag(tagId:string){
    const customerId=conversationDetail?.conversation?.customers?.id;
    if(!adminSession||!customerId) return;
    setCrmBusy(true);
    try{ const res=await fetch(`/api/admin/clients/${customerId}/tags?tag_id=${tagId}`,{method:"DELETE",headers:authHeaders(false)}); if(!res.ok) throw new Error("Could not remove tag"); await loadCrmDetail(customerId); }
    catch(e:any){ alert(e.message||"Could not remove tag"); }
    setCrmBusy(false);
  }
  async function crmCompleteTask(taskId:string){
    if(!adminSession) return;
    setCrmBusy(true);
    try{
      const res=await fetch(`/api/admin/tasks/${taskId}/complete`,{method:"POST",headers:authHeaders(false)});
      if(!res.ok) throw new Error("Could not complete task");
      const customerId=conversationDetail?.conversation?.customers?.id;
      if(customerId) await loadCrmDetail(customerId);
    }catch(e:any){ alert(e.message||"Could not complete task"); }
    setCrmBusy(false);
  }

  useEffect(()=>{ if(adminSession){ loadConversations(); loadQuickReplies(); loadConnection(); loadBroadcasts(); } },[adminSession]);

  // Auto-refresh the Connection status every 4s while it's not yet connected, so a freshly
  // generated QR code (the bridge rotates it roughly every 20-60s until scanned) shows up
  // here on its own -- exactly like web.whatsapp.com, no manual "Refresh" clicks needed.
  // Stops polling once connected (or once this tab/section isn't the active one).
  useEffect(()=>{
    if(!adminSession) return;
    if(section!=="settings") return;
    if(connection&&connection.status==="connected") return;
    const id=setInterval(()=>{ loadConnection(); },4000);
    return ()=>clearInterval(id);
  },[adminSession,section,connection?.status]);

  // Templates / Designer: this browser only (localStorage) -- see file header. Guarded in
  // try/catch throughout since this must never break the rest of the workspace if storage is
  // blocked (private window, locked-down browser policy, etc).
  useEffect(()=>{
    try{ const raw=localStorage.getItem("nap_wa_templates"); if(raw) setTemplates(JSON.parse(raw)); }catch{}
  },[]);
  function persistTemplates(list:any[]){ setTemplates(list); try{ localStorage.setItem("nap_wa_templates",JSON.stringify(list)); }catch{} }
  function saveTemplate(){
    if(!templateForm.title.trim()||!templateForm.body.trim()){ alert("A title and body are required."); return; }
    if(templateEditId){
      persistTemplates(templates.map(t=>t.id===templateEditId?{...t,...templateForm}:t));
    }else{
      persistTemplates([...templates,{id:`tpl_${Date.now()}`,...templateForm,createdAt:new Date().toISOString()}]);
    }
    setTemplateForm(TEMPLATE_EMPTY); setTemplateEditId(null);
  }
  function deleteTemplate(id:string){ if(confirm("Delete this template draft?")) persistTemplates(templates.filter(t=>t.id!==id)); }
  function useTemplateInConversation(body:string){
    if(!openConversationId){ setSection("inbox"); alert("Open a conversation first, then use this template -- it will drop into the composer."); return; }
    setComposeText(t=>t?`${t}\n${substituteVars(body)}`:substituteVars(body));
    setSection("inbox"); setInsertedNotice("Template inserted into the composer below.");
  }
  function addDesignerBlock(type:string){ setDesignerBlocks(b=>[...b,{id:`blk_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,type,text:""}]); }
  function updateDesignerBlock(id:string,text:string){ setDesignerBlocks(b=>b.map(x=>x.id===id?{...x,text}:x)); }
  function removeDesignerBlock(id:string){ setDesignerBlocks(b=>b.filter(x=>x.id!==id)); }
  function moveDesignerBlock(id:string,dir:-1|1){
    setDesignerBlocks(b=>{
      const i=b.findIndex(x=>x.id===id); const j=i+dir;
      if(i<0||j<0||j>=b.length) return b;
      const copy=[...b]; const [item]=copy.splice(i,1); copy.splice(j,0,item); return copy;
    });
  }
  // Composes a plain-text, real-WhatsApp-deliverable message: *bold* headings/price/offer,
  // plain lines for everything else, a 👉 marker for the CTA label. No HTML, no custom layout,
  // no colors/backgrounds -- WhatsApp text messages don't support any of that, so this designer
  // never pretends they do.
  function composeDesignerMessage(){
    return designerBlocks.map(b=>{
      const t=b.text||"";
      if(b.type==="heading") return `*${t}*`;
      if(b.type==="price"||b.type==="offer") return t?`*${t}*`:"";
      if(b.type==="cta") return t?`👉 ${t}`:"";
      if(b.type==="website") return t?`🌐 ${t}`:"";
      if(b.type==="phone") return t?`📞 ${t}`:"";
      if(b.type==="image") return t?`[image: ${t}]`:"[image attached]";
      return t;
    }).filter(Boolean).join("\n");
  }
  function saveDesignAsTemplate(){
    const body=composeDesignerMessage();
    if(!body.trim()){ alert("Add at least one block with text first."); return; }
    persistTemplates([...templates,{id:`tpl_${Date.now()}`,title:designerName.trim()||"Untitled design",status:"draft",body,createdAt:new Date().toISOString()}]);
    alert("Saved to Templates (this browser only -- see the Templates section).");
  }

  const adminEmail=adminSession?.user?.email||"";

  // ── Derived data (all computed from the real `conversations` already fetched above) ───────
  const filteredConversations=(()=>{
    let list=conversations||[];
    if(statusFilter!=="all") list=list.filter((c:any)=>c.status===statusFilter);
    if(quickFilter==="unread") list=list.filter((c:any)=>Number(c.unread_count||0)>0);
    else if(quickFilter==="mine") list=list.filter((c:any)=>c.assigned_to&&c.assigned_to===adminEmail);
    else if(quickFilter==="unassigned") list=list.filter((c:any)=>!c.assigned_to);
    const q=search.trim().toLowerCase();
    if(q) list=list.filter((c:any)=>(c.wa_name||"").toLowerCase().includes(q)||(c.wa_phone||"").toLowerCase().includes(q)||(c.customers?.full_name||"").toLowerCase().includes(q));
    return list;
  })();
  const stats=(()=>{
    const list=conversations||[];
    const unread=list.reduce((a:number,c:any)=>a+Number(c.unread_count||0),0);
    return {
      total:list.length,
      open:list.filter((c:any)=>c.status==="open").length,
      pending:list.filter((c:any)=>c.status==="pending").length,
      closed:list.filter((c:any)=>c.status==="closed").length,
      unread,
      linked:list.filter((c:any)=>c.customer_id).length,
      unlinked:list.filter((c:any)=>!c.customer_id).length,
    };
  })();
  // Unique WA contacts, derived from real conversations -- feeds the "Contacts" nav section
  // without creating a second, duplicate contacts system (that already exists, for the
  // outreach side, in the Contacts/Companies tabs -- this is just "who am I WhatsApping with").
  const waContacts=(conversations||[]).map((c:any)=>({id:c.id,name:c.wa_name||c.customers?.full_name||c.wa_phone,phone:c.wa_phone,company:c.customers?.company||"",status:c.status,unread:c.unread_count||0}));
  const waCompanies=(()=>{
    const map=new Map<string,{name:string;contacts:number}>();
    for(const c of conversations||[]){
      const name=c.customers?.company; if(!name) continue;
      const row=map.get(name)||{name,contacts:0}; row.contacts++; map.set(name,row);
    }
    return Array.from(map.values()).sort((a,b)=>b.contacts-a.contacts);
  })();

  // ── Unified timeline (real): WhatsApp messages + CRM notes/meetings/tasks + bookings, all
  // for the customer linked to the currently open conversation, merged by timestamp. ──────────
  const timeline=(()=>{
    if(!conversationDetail) return [] as any[];
    const items:any[]=[];
    for(const m of conversationDetail.messages||[]) items.push({at:m.created_at,kind:"message",data:m});
    if(crmDetail){
      for(const n of crmDetail.notes||[]) items.push({at:n.created_at,kind:"note",data:n});
      for(const t of crmDetail.tasks||[]) items.push({at:t.created_at||t.due_date,kind:"task",data:t});
      for(const mt of crmDetail.meetings||[]) items.push({at:mt.meeting_date||mt.created_at,kind:"meeting",data:mt});
      for(const b of crmDetail.bookings||[]) items.push({at:b.created_at,kind:"booking",data:b});
    }
    return items.filter(i=>i.at).sort((a,b)=>new Date(b.at).getTime()-new Date(a.at).getTime());
  })();

  const navList=(
    <div style={{display:"flex",flexDirection:isMobile?"row":"column" as const,gap:isMobile?6:2,overflowX:isMobile?"auto" as const:"visible" as const,paddingBottom:isMobile?4:0}}>
      {NAV_ITEMS.map(n=>(
        <button key={n.key} onClick={()=>{setSection(n.key);setNavOpenMobile(false);}} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderRadius:8,border:"none",cursor:"pointer",whiteSpace:"nowrap" as const,fontSize:12.5,fontWeight:section===n.key?700:500,background:section===n.key?"rgba(139,92,246,0.16)":"transparent",color:section===n.key?C.PL:C.MID,flexShrink:0,textAlign:"left" as const}}>
          <span style={{fontSize:14}}>{n.icon}</span>{n.label}
          {n.key==="inbox"&&stats.unread>0&&<span style={{marginLeft:"auto",fontSize:10,padding:"2px 7px",borderRadius:20,background:C.P,color:"#fff"}}>{stats.unread}</span>}
        </button>
      ))}
    </div>
  );

  return (
    <div style={{display:"flex",flexDirection:isMobile?"column" as const:"row" as const,gap:isMobile?14:24,maxWidth:1400,margin:"24px auto",padding:"0 24px 48px"}}>
      {!isMobile&&<div style={{width:210,flexShrink:0,...CARD_STYLE,padding:10,alignSelf:"flex-start",position:"sticky" as const,top:24}}>{navList}</div>}
      {isMobile&&(
        <div style={{...CARD_STYLE,padding:8}}>
          <button onClick={()=>setNavOpenMobile(o=>!o)} style={{...S.btnO,width:"100%",padding:"9px 12px",fontSize:11}}>{NAV_ITEMS.find(n=>n.key===section)?.icon} {NAV_ITEMS.find(n=>n.key===section)?.label} {navOpenMobile?"▲":"▼"}</button>
          {navOpenMobile&&<div style={{marginTop:8}}>{navList}</div>}
        </div>
      )}

      <div style={{flex:1,minWidth:0}}>
        {/* ── OVERVIEW -- real aggregate stats from the conversations already loaded ───────── */}
        {section==="overview"&&(
          <div>
            <div style={{fontSize:11,letterSpacing:4,color:C.MID,textTransform:"uppercase" as const,marginBottom:16}}>WhatsApp Overview</div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(5,1fr)",gap:12,marginBottom:20}}>
              {[["Conversations",stats.total],["Open",stats.open],["Pending",stats.pending],["Closed",stats.closed],["Unread",stats.unread]].map(([label,val])=>(
                <div key={label as string} style={{...CARD_STYLE,padding:16}}>
                  <div style={{fontSize:22,fontWeight:700,color:C.FG}}>{val as number}</div>
                  <div style={{fontSize:10.5,letterSpacing:1,textTransform:"uppercase" as const,color:C.MID,marginTop:4}}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>
              <div style={{...CARD_STYLE,padding:18}}>
                <div style={{fontSize:11,letterSpacing:1,textTransform:"uppercase" as const,color:C.MID,marginBottom:10}}>Connection</div>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <StatusPill status={(connection&&connection.status)||"not_connected"} />
                  <span style={{fontSize:12,color:C.MID}}>{connection?.phone_number?`Number: ${connection.phone_number}`:"No WhatsApp number connected yet."}</span>
                </div>
                <button onClick={()=>setSection("settings")} style={{...S.btnO,marginTop:14,padding:"8px 16px",fontSize:10.5}}>Open Settings</button>
              </div>
              <div style={{...CARD_STYLE,padding:18}}>
                <div style={{fontSize:11,letterSpacing:1,textTransform:"uppercase" as const,color:C.MID,marginBottom:10}}>Contacts</div>
                <div style={{fontSize:12.5,color:C.MID,lineHeight:1.7}}>{stats.linked} linked to a CRM contact · {stats.unlinked} WhatsApp-only · {(quickReplies||[]).length} saved quick replies</div>
                <button onClick={()=>setSection("inbox")} style={{...S.btnO,marginTop:14,padding:"8px 16px",fontSize:10.5}}>Open Inbox</button>
              </div>
            </div>
          </div>
        )}

        {/* ── INBOX ─────────────────────────────────────────────────────────────────────────── */}
        {section==="inbox"&&(
          <div>
            {(!connection||connection.status!=="connected")&&(
              <div style={{...CARD_STYLE,padding:"10px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:10,background:"rgba(239,68,68,0.08)",borderColor:"rgba(239,68,68,0.3)"} as any}>
                <span style={{fontSize:16}}>⚠️</span>
                <span style={{fontSize:12.5,color:C.FG}}>WhatsApp is <strong>Not Connected</strong>. Messages sent from here are saved and queued only -- nothing is delivered to a real phone yet.</span>
              </div>
            )}
            {openConversationId?(
              conversationLoading?(
                <div style={{color:C.MID,fontSize:13}}>Loading…</div>
              ):!conversationDetail?(
                <div style={{color:C.MID,fontSize:13,fontStyle:"italic"}}>Could not load this conversation.</div>
              ):(
                <div>
                  <button onClick={()=>{setOpenConversationId(null);setConversationDetail(null);setCrmDetail(null);}} style={{...S.btnO,marginBottom:16,padding:"9px 20px",fontSize:11}}>← Back to inbox</button>
                  <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 340px",gap:20}}>
                    <div style={{...CARD_STYLE,display:"flex",flexDirection:"column" as const,height:isMobile?460:600,overflow:"hidden" as const}}>
                      <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.BORDER}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap" as const,gap:8}}>
                        <div>
                          <div style={{fontSize:14,color:C.FG,fontWeight:700}}>{conversationDetail.conversation.wa_name||conversationDetail.conversation.wa_phone}</div>
                          <div style={{fontSize:11.5,color:C.MID}}>{conversationDetail.conversation.wa_phone}</div>
                        </div>
                        <div style={{display:"flex",gap:8,alignItems:"center"}}>
                          <StatusPill status={conversationDetail.conversation.status} />
                          {isMobile&&<button onClick={()=>setMobileInfoOpen(o=>!o)} style={{...S.btnO,padding:"6px 12px",fontSize:10.5}}>{mobileInfoOpen?"Hide Info":"Info"}</button>}
                        </div>
                      </div>
                      <div style={{flex:1,overflowY:"auto" as const,padding:"14px 18px",display:"flex",flexDirection:"column" as const,gap:10}}>
                        {(conversationDetail.messages||[]).length===0?(
                          <div style={{color:C.MID,fontSize:12.5,fontStyle:"italic"}}>No messages yet.</div>
                        ):conversationDetail.messages.map((m:any)=>{
                          const out=m.direction==="outbound";
                          const tick=m.status==="failed"?"⚠️ Failed":m.status==="read"?"✓✓ Read":m.status==="delivered"?"✓✓ Delivered":m.status==="sent"?"✓ Sent":"⏳ Queued";
                          return(
                            <div key={m.id} style={{alignSelf:out?"flex-end":"flex-start",maxWidth:"78%",background:out?"rgba(139,92,246,0.18)":"rgba(255,255,255,0.06)",borderRadius:10,padding:"9px 13px"}}>
                              <div style={{fontSize:13,color:C.FG,whiteSpace:"pre-wrap" as const}}>{m.body}</div>
                              <div style={{fontSize:10,color:C.MID,marginTop:4,textAlign:(out?"right":"left") as "left"|"right"}}>{out?tick+" · ":""}{new Date(m.created_at).toLocaleString()}</div>
                            </div>
                          );
                        })}
                      </div>
                      {insertedNotice&&<div style={{padding:"0 16px",fontSize:11,color:"#4ade80"}}>{insertedNotice}</div>}
                      <div style={{padding:"12px 16px",borderTop:`1px solid ${C.BORDER}`,position:"relative" as const}}>
                        {quickPickerOpen&&(
                          <div style={{position:"absolute" as const,bottom:"100%",left:16,right:16,maxHeight:220,overflowY:"auto" as const,background:C.DARK,border:`1px solid ${C.BORDER}`,borderRadius:8,marginBottom:6,boxShadow:"0 -4px 14px rgba(0,0,0,0.4)"}}>
                            {(!quickReplies||quickReplies.length===0)?(
                              <div style={{padding:12,fontSize:12,color:C.MID,fontStyle:"italic"}}>No quick replies yet.</div>
                            ):quickReplies.map((q:any)=>(
                              <div key={q.id} onClick={()=>{setComposeText(t=>t?`${t}\n${q.body}`:q.body);setQuickPickerOpen(false);}} style={{padding:"9px 14px",fontSize:12.5,color:C.FG,cursor:"pointer",borderBottom:`1px solid ${C.BORDER}`}}>
                                <div style={{fontWeight:600,fontSize:11.5}}>{q.title}</div>
                                <div style={{color:C.MID,marginTop:2}}>{String(q.body).slice(0,80)}</div>
                              </div>
                            ))}
                          </div>
                        )}
                        <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap" as const}}>
                          <button onClick={()=>setQuickPickerOpen(o=>!o)} style={{...S.btnO,padding:"8px 10px",fontSize:11}} title="Quick replies">⚡</button>
                          {[["📎","Attachments"],["📷","Camera"],["👤","Contact card"],["📍","Location"],["🕒","Schedule send"]].map(([icon,label])=>(
                            <button key={label} onClick={()=>alert(`${label}: requires backend integration (media upload + WhatsApp Business API) -- not available in this phase.`)} style={{...S.btnO,padding:"8px 10px",fontSize:11,opacity:0.6}} title={`${label} -- requires backend integration`}>{icon}</button>
                          ))}
                        </div>
                        <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
                          <textarea style={{...S.inp,flex:1,minHeight:44,maxHeight:120}} placeholder="Type a message… (saved as queued, not sent)" value={composeText} onChange={e=>setComposeText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();}}} />
                          <button onClick={sendMessage} disabled={busy||!composeText.trim()} style={S.btnP}>Send</button>
                        </div>
                      </div>
                    </div>

                    {(!isMobile||mobileInfoOpen)&&(
                      <div style={{...CARD_STYLE,padding:16,display:"flex",flexDirection:"column" as const,gap:16,alignSelf:"flex-start"}}>
                        <div>
                          <div style={{fontSize:11,letterSpacing:1,textTransform:"uppercase" as const,color:C.MID,marginBottom:8}}>Contact</div>
                          {conversationDetail.conversation.customers?(
                            <div>
                              <div style={{fontSize:14,color:C.FG,fontWeight:700}}>{conversationDetail.conversation.customers.full_name||"Unknown"}</div>
                              {conversationDetail.conversation.customers.email&&<div style={{fontSize:12,color:C.MID,marginTop:2}}>{conversationDetail.conversation.customers.email}</div>}
                              {conversationDetail.conversation.customers.phone&&<div style={{fontSize:12,color:C.MID,marginTop:2}}>{conversationDetail.conversation.customers.phone}</div>}
                              {conversationDetail.conversation.customers.company&&<div style={{fontSize:12,color:C.MID,marginTop:2}}>{conversationDetail.conversation.customers.company}</div>}
                              <div style={{display:"flex",flexWrap:"wrap" as const,gap:6,marginTop:8}}>
                                {(conversationDetail.conversation.customers.tags||[]).map((t:any)=>(
                                  <span key={t.id} style={{fontSize:10.5,padding:"3px 9px",borderRadius:20,background:"rgba(139,92,246,0.14)",color:C.PL,border:`1px solid ${C.PL}`,display:"flex",alignItems:"center",gap:5}}>{t.name}<span onClick={()=>crmRemoveTag(t.id)} style={{cursor:"pointer",opacity:0.7}}>✕</span></span>
                                ))}
                              </div>
                              <div style={{display:"flex",gap:6,marginTop:8}}>
                                <input style={{...S.inp,fontSize:11,padding:"7px 10px"}} placeholder="+ tag" value={newTag} onChange={e=>setNewTag(e.target.value)} onKeyDown={e=>e.key==="Enter"&&crmAddTag()} />
                                <button onClick={crmAddTag} disabled={crmBusy} style={{...S.btnSm,padding:"7px 12px"}}>Add</button>
                              </div>
                              <button onClick={()=>onOpenCrmProfile?.(conversationDetail.conversation.customers.id)} style={{...S.btnO,marginTop:10,padding:"7px 14px",fontSize:10.5,width:"100%"}}>Open Full CRM Profile →</button>
                            </div>
                          ):(
                            <div style={{fontSize:12.5,color:C.MID,fontStyle:"italic"}}>No linked CRM contact -- this is a WhatsApp-only conversation.</div>
                          )}
                        </div>

                        <div>
                          <div style={{fontSize:11,letterSpacing:1,textTransform:"uppercase" as const,color:C.MID,marginBottom:6}}>Status</div>
                          <select style={S.inp} value={conversationDetail.conversation.status} onChange={e=>updateConversation({status:e.target.value})} disabled={busy}>
                            {["open","pending","closed"].map(v=><option key={v} value={v}>{v}</option>)}
                          </select>
                        </div>
                        <div>
                          <div style={{fontSize:11,letterSpacing:1,textTransform:"uppercase" as const,color:C.MID,marginBottom:6}}>Assigned To</div>
                          <input style={S.inp} defaultValue={conversationDetail.conversation.assigned_to||""} placeholder="Unassigned" onBlur={e=>{ if(e.target.value!==(conversationDetail.conversation.assigned_to||"")) updateConversation({assigned_to:e.target.value||null}); }} />
                          <button onClick={()=>updateConversation({assigned_to:adminEmail})} style={{...S.btnO,marginTop:8,padding:"6px 12px",fontSize:10}}>Assign to me</button>
                        </div>

                        {conversationDetail.conversation.customers&&(
                          <div>
                            <div style={{fontSize:11,letterSpacing:1,textTransform:"uppercase" as const,color:C.MID,marginBottom:6}}>Lead Status</div>
                            <select style={S.inp} value={crmDetail?.customer?.lead_status||"lead"} onChange={e=>crmUpdateLeadStatus(e.target.value)} disabled={crmBusy||crmLoading}>
                              {["lead","warm","hot","customer","cold","vendor","partner"].map(v=><option key={v} value={v}>{v}</option>)}
                            </select>
                          </div>
                        )}

                        <div style={{display:"flex",gap:8}}>
                          <div style={{flex:1,fontSize:11,color:C.MID}}><NeedsBackend label="needs backend" /> Deals</div>
                          <div style={{flex:1,fontSize:11,color:C.MID}}><NeedsBackend label="needs backend" /> Custom Fields</div>
                        </div>

                        {conversationDetail.conversation.customers&&(
                          <div>
                            <div style={{fontSize:11,letterSpacing:1,textTransform:"uppercase" as const,color:C.MID,marginBottom:8}}>Quick Note</div>
                            <textarea style={{...S.inp,minHeight:50,fontSize:12}} placeholder="Add a note…" value={noteText} onChange={e=>setNoteText(e.target.value)} />
                            <button onClick={crmAddNote} disabled={crmBusy} style={{...S.btnSm,marginTop:6}}>+ Add Note</button>
                          </div>
                        )}

                        {conversationDetail.conversation.customers&&(
                          <div>
                            <div style={{fontSize:11,letterSpacing:1,textTransform:"uppercase" as const,color:C.MID,marginBottom:8}}>Follow-up Task</div>
                            <input style={{...S.inp,fontSize:12,marginBottom:6}} placeholder="Task title" value={taskForm.title} onChange={e=>setTaskForm(f=>({...f,title:e.target.value}))} />
                            <input type="date" style={{...S.inp,fontSize:12,marginBottom:6}} value={taskForm.due_date} onChange={e=>setTaskForm(f=>({...f,due_date:e.target.value}))} />
                            <button onClick={crmAddTask} disabled={crmBusy} style={{...S.btnSm}}>+ Add Task</button>
                          </div>
                        )}

                        {conversationDetail.conversation.customers&&(
                          <div>
                            <div style={{fontSize:11,letterSpacing:1,textTransform:"uppercase" as const,color:C.MID,marginBottom:8}}>Schedule Meeting</div>
                            <input style={{...S.inp,fontSize:12,marginBottom:6}} placeholder="Event / occasion" value={meetingForm.event} onChange={e=>setMeetingForm(f=>({...f,event:e.target.value}))} />
                            <input type="date" style={{...S.inp,fontSize:12,marginBottom:6}} value={meetingForm.meeting_date} onChange={e=>setMeetingForm(f=>({...f,meeting_date:e.target.value}))} />
                            <button onClick={crmAddMeeting} disabled={crmBusy} style={{...S.btnSm}}>+ Add Meeting</button>
                          </div>
                        )}

                        <div>
                          <div style={{fontSize:11,letterSpacing:1,textTransform:"uppercase" as const,color:C.MID,marginBottom:8}}>Timeline</div>
                          {!conversationDetail.conversation.customers?(
                            <div style={{fontSize:11.5,color:C.MID,fontStyle:"italic",lineHeight:1.6}}>This WhatsApp-only conversation has no linked CRM contact, so there's no CRM/booking history to merge in here -- just the message thread above.</div>
                          ):crmLoading?(
                            <div style={{fontSize:11.5,color:C.MID}}>Loading…</div>
                          ):(
                            <div style={{display:"flex",flexDirection:"column" as const,gap:8,maxHeight:220,overflowY:"auto" as const}}>
                              {timeline.length===0?(
                                <div style={{fontSize:11.5,color:C.MID,fontStyle:"italic"}}>Nothing yet.</div>
                              ):timeline.slice(0,30).map((item,i)=>{
                                const icon=item.kind==="message"?"💬":item.kind==="note"?"📝":item.kind==="task"?"✅":item.kind==="meeting"?"🗓":"📅";
                                const label=item.kind==="message"?(item.data.direction==="outbound"?"You: ":"Them: ")+String(item.data.body||"").slice(0,60):item.kind==="note"?String(item.data.body||"").slice(0,60):item.kind==="task"?`Task: ${item.data.title}`:item.kind==="meeting"?`Meeting: ${item.data.event||"—"}`:`Booking created`;
                                return (
                                  <div key={i} style={{fontSize:11,color:C.MID,display:"flex",gap:6}}>
                                    <span>{icon}</span>
                                    <span style={{flex:1}}>{label}</span>
                                    <span style={{whiteSpace:"nowrap" as const}}>{new Date(item.at).toLocaleDateString()}</span>
                                  </div>
                                );
                              })}
                              <div style={{fontSize:10.5,color:C.MID,fontStyle:"italic",marginTop:4}}>Business-card scans aren't shown here -- they're tracked in the separate Contacts/Companies (outreach) system, which isn't linked to CRM customers yet.</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            ):(
              <div>
                <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap" as const}}>
                  {(["all","open","pending","closed"] as const).map(v=>(
                    <button key={v} onClick={()=>setStatusFilter(v)} style={statusFilter===v?S.btnSm:{...S.btnO,padding:"8px 14px",fontSize:10}}>{v}</button>
                  ))}
                  <span style={{width:1,background:C.BORDER,margin:"0 4px"}} />
                  {([["all","All"],["unread","Unread"],["mine","Mine"],["unassigned","Unassigned"]] as const).map(([v,label])=>(
                    <button key={v} onClick={()=>setQuickFilter(v as any)} style={quickFilter===v?S.btnSm:{...S.btnO,padding:"8px 14px",fontSize:10}}>{label}</button>
                  ))}
                </div>
                <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap" as const}}>
                  <input style={{...S.inp,flex:1,minWidth:200}} placeholder="Search conversations…" value={search} onChange={e=>setSearch(e.target.value)} />
                  <button onClick={()=>setNewConvOpen(o=>!o)} style={S.btnP}>+ New Conversation</button>
                </div>
                {newConvOpen&&(
                  <div style={{...CARD_STYLE,padding:16,marginBottom:16,display:"flex",flexDirection:"column" as const,gap:10}}>
                    <select style={S.inp} value={newConvForm.customer_id} onChange={e=>{
                      const cid=e.target.value;
                      const c=(customersList||[]).find((x:any)=>x.id===cid);
                      setNewConvForm((f:any)=>({...f,customer_id:cid,wa_phone:(c&&(c.whatsapp||c.phone))||f.wa_phone,wa_name:(c&&c.full_name)||f.wa_name}));
                    }}>
                      <option value="">— Link to an existing CRM contact (optional) —</option>
                      {(customersList||[]).map((c:any)=>(<option key={c.id} value={c.id}>{c.full_name||c.email}</option>))}
                    </select>
                    <div style={{display:"flex",gap:10,flexWrap:"wrap" as const}}>
                      <input style={{...S.inp,flex:1,minWidth:180}} placeholder="WhatsApp phone number (required)" value={newConvForm.wa_phone} onChange={e=>setNewConvForm((f:any)=>({...f,wa_phone:e.target.value}))} />
                      <input style={{...S.inp,flex:1,minWidth:180}} placeholder="Display name (optional)" value={newConvForm.wa_name} onChange={e=>setNewConvForm((f:any)=>({...f,wa_name:e.target.value}))} />
                    </div>
                    <div><button onClick={createConversation} disabled={busy} style={S.btnP}>Create Conversation</button></div>
                  </div>
                )}
                {conversationsLoading?(
                  <div style={{color:C.MID,fontSize:13}}>Loading…</div>
                ):filteredConversations.length===0?(
                  <div style={{color:C.MID,fontSize:13,fontStyle:"italic"}}>No conversations match this view.</div>
                ):(
                  <div style={{display:"flex",flexDirection:"column" as const,gap:8}}>
                    {filteredConversations.map((c:any)=>(
                      <div key={c.id} onClick={()=>loadConversationDetail(c.id)} style={{...CARD_STYLE,padding:14,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap" as const}}>
                        <div>
                          <div style={{fontSize:13,color:C.FG,fontWeight:600}}>{c.wa_name||c.customers?.full_name||c.wa_phone}{Number(c.unread_count||0)>0&&<span style={{marginLeft:8,fontSize:10.5,padding:"2px 8px",borderRadius:20,background:C.P,color:"#fff"}}>{c.unread_count}</span>}</div>
                          <div style={{fontSize:11.5,color:C.MID,marginTop:2}}>{c.wa_phone}{c.last_message_preview?` · ${String(c.last_message_preview).slice(0,50)}`:""}</div>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          {c.assigned_to&&<span style={{fontSize:10.5,color:C.MID}}>{c.assigned_to}</span>}
                          <StatusPill status={c.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── CONTACTS -- derived from real conversations, not a second contacts database ───── */}
        {section==="contacts"&&(
          <div>
            <div style={{fontSize:11,letterSpacing:4,color:C.MID,textTransform:"uppercase" as const,marginBottom:4}}>WhatsApp Contacts</div>
            <div style={{fontSize:11.5,color:C.MID,marginBottom:16}}>Everyone you've WhatsApped with, drawn from your real conversations. For the full CRM/outreach contact list, use the Contacts tab in the main sidebar.</div>
            {waContacts.length===0?(
              <div style={{color:C.MID,fontSize:13,fontStyle:"italic"}}>No WhatsApp conversations yet.</div>
            ):(
              <div style={{display:"flex",flexDirection:"column" as const,gap:8}}>
                {waContacts.map(c=>(
                  <div key={c.id} onClick={()=>{setSection("inbox");loadConversationDetail(c.id);}} style={{...CARD_STYLE,padding:14,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap" as const}}>
                    <div>
                      <div style={{fontSize:13,color:C.FG,fontWeight:600}}>{c.name}</div>
                      <div style={{fontSize:11.5,color:C.MID,marginTop:2}}>{c.phone}{c.company?` · ${c.company}`:""}</div>
                    </div>
                    <StatusPill status={c.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── COMPANIES -- grouped from the same real customer.company field ──────────────────── */}
        {section==="companies"&&(
          <div>
            <div style={{fontSize:11,letterSpacing:4,color:C.MID,textTransform:"uppercase" as const,marginBottom:4}}>Companies in your WhatsApp inbox</div>
            <div style={{fontSize:11.5,color:C.MID,marginBottom:16}}>Grouped from linked CRM contacts' Company field. For full company management, use the Companies tab in the main sidebar.</div>
            {waCompanies.length===0?(
              <div style={{color:C.MID,fontSize:13,fontStyle:"italic"}}>No company info on any linked contact yet.</div>
            ):(
              <div style={{display:"flex",flexDirection:"column" as const,gap:8}}>
                {waCompanies.map(co=>(
                  <div key={co.name} style={{...CARD_STYLE,padding:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{fontSize:13,color:C.FG,fontWeight:600}}>{co.name}</div>
                    <div style={{fontSize:11.5,color:C.MID}}>{co.contacts} contact{co.contacts===1?"":"s"}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── BROADCASTS -- real: migration 0019 + broadcasts.ts/[id]/start.ts/[id]/cancel.ts.
             Recipients are only ever existing conversations (no arbitrary number list). Starting
             a broadcast queues one whatsapp_messages row per recipient with a staggered send_after
             (15-35s apart, see pending.ts) so the existing bridge drip-feeds sends naturally. ────── */}
        {section==="broadcasts"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4,flexWrap:"wrap" as const,gap:8}}>
              <div style={{fontSize:11,letterSpacing:4,color:C.MID,textTransform:"uppercase" as const}}>Broadcasts</div>
              <NeedsBackend label="real sends -- staggered 15-35s apart per recipient to reduce ban risk, but still real WhatsApp messages" />
            </div>
            <div style={{fontSize:11.5,color:C.MID,marginBottom:16}}>Send one message to many existing conversations at once. Recipients can only be people who've already messaged on WhatsApp -- no pasted number lists. Once started, messages queue with a randomized delay between each send so nothing fires all at once. Max {BROADCAST_MAX_RECIPIENTS} recipients per broadcast.</div>

            <div style={{...CARD_STYLE,padding:16,marginBottom:20,display:"flex",flexDirection:"column" as const,gap:10}}>
              <div style={{fontSize:11,letterSpacing:1,textTransform:"uppercase" as const,color:C.MID}}>New Broadcast</div>
              <input style={S.inp} placeholder='Broadcast name (internal, e.g. "Oct hot leads follow-up")' value={broadcastName} onChange={e=>setBroadcastName(e.target.value)} />
              <textarea style={{...S.inp,minHeight:90,resize:"vertical" as const,fontFamily:"inherit"}} placeholder="Message to send..." value={broadcastBody} onChange={e=>setBroadcastBody(e.target.value)} />
              <div style={{fontSize:11,letterSpacing:1,textTransform:"uppercase" as const,color:C.MID,marginTop:6}}>Recipients ({broadcastRecipientIds.length}/{BROADCAST_MAX_RECIPIENTS})</div>
              <div style={{maxHeight:220,overflowY:"auto" as const,border:`1px solid ${C.BORDER}`,borderRadius:8,padding:8,display:"flex",flexDirection:"column" as const,gap:2}}>
                {waContacts.length===0?(
                  <div style={{color:C.MID,fontSize:12.5,fontStyle:"italic",padding:8}}>No WhatsApp conversations yet to pick recipients from.</div>
                ):waContacts.map((c:any)=>{
                  const checked=broadcastRecipientIds.includes(c.id);
                  const disabled=!checked&&broadcastRecipientIds.length>=BROADCAST_MAX_RECIPIENTS;
                  return (
                    <label key={c.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 6px",borderRadius:6,cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.4:1,background:checked?"rgba(139,92,246,0.1)":"transparent"}}>
                      <input type="checkbox" checked={checked} disabled={disabled} onChange={()=>toggleBroadcastRecipient(c.id)} />
                      <span style={{fontSize:12.5,color:C.FG,flex:1}}>{c.name}</span>
                      <span style={{fontSize:11,color:C.MID}}>{c.phone}</span>
                    </label>
                  );
                })}
              </div>
              <div style={{display:"flex",justifyContent:"flex-end",marginTop:4}}>
                <button style={{...S.btnSm,opacity:(broadcastBusy||!broadcastName.trim()||!broadcastBody.trim()||broadcastRecipientIds.length===0)?0.5:1}} disabled={broadcastBusy||!broadcastName.trim()||!broadcastBody.trim()||broadcastRecipientIds.length===0} onClick={createBroadcast}>{broadcastBusy?"Saving...":"Save as Draft"}</button>
              </div>
            </div>

            <div style={{fontSize:11,letterSpacing:1,textTransform:"uppercase" as const,color:C.MID,marginBottom:8}}>Existing Broadcasts</div>
            {broadcastsLoading?(
              <div style={{color:C.MID,fontSize:13}}>Loading...</div>
            ):!broadcasts||broadcasts.length===0?(
              <div style={{color:C.MID,fontSize:13,fontStyle:"italic"}}>No broadcasts yet. Create one above.</div>
            ):(
              <div style={{display:"flex",flexDirection:"column" as const,gap:10}}>
                {broadcasts.map((b:any)=>(
                  <div key={b.id} style={{...CARD_STYLE,padding:14}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,flexWrap:"wrap" as const}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:700,color:C.FG,marginBottom:2}}>{b.name}</div>
                        <div style={{fontSize:11.5,color:C.MID}}>{b.total_recipients||0} recipient{(b.total_recipients||0)===1?"":"s"}</div>
                      </div>
                      <StatusPill status={b.status} />
                    </div>
                    <div style={{fontSize:12.5,color:C.MID,margin:"8px 0",lineHeight:1.5,whiteSpace:"pre-wrap" as const}}>{b.body}</div>
                    <div style={{display:"flex",gap:14,fontSize:11,color:C.MID,marginBottom:10,flexWrap:"wrap" as const}}>
                      <span>✓ Sent: {b.sent_count||0}</span>
                      <span>⏳ Pending: {b.pending_count||0}</span>
                      <span style={{color:(b.failed_count||0)>0?"#f87171":C.MID}}>✕ Failed: {b.failed_count||0}</span>
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      {b.status==="draft"&&<button style={S.btnSm} disabled={broadcastBusy} onClick={()=>startBroadcast(b.id)}>Start Sending</button>}
                      {(b.status==="draft"||b.status==="sending")&&<button style={{...S.btnO,padding:"8px 18px",fontSize:10,letterSpacing:2}} disabled={broadcastBusy} onClick={()=>cancelBroadcast(b.id)}>Cancel</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {section==="campaigns"&&<ComingSoonPanel icon="🚀" title="Campaigns" blurb="Multi-step WhatsApp sequences (like the existing Email Designer's campaigns, but for WhatsApp). The Email Designer's campaign model is a close reference for how this would be built once a campaigns table and send-step endpoint exist for WhatsApp." needs={["whatsapp_campaigns table + endpoints","WhatsApp Business API / approved sender"]} />}
        {section==="automations"&&<ComingSoonPanel icon="🤖" title="Automations" blurb="Rule-based auto-replies and follow-ups (e.g. 'if no reply in 48h, send this quick reply'). Needs a rules engine and a worker that can act without an admin clicking anything." needs={["Automation rules table + endpoints","Background worker / cron"]} />}
        {section==="media"&&<ComingSoonPanel icon="🗂" title="Media Library" blurb="A shared place to upload and reuse images/videos as WhatsApp attachments. No WhatsApp media storage or listing endpoint exists yet, so nothing is uploaded or shown here until one does -- this screen intentionally doesn't show a fake file grid." needs={["WhatsApp media storage bucket","Media list/upload endpoint"]} />}
        {section==="scheduled"&&<ComingSoonPanel icon="🕒" title="Scheduled Messages" blurb="Queue a message or broadcast to go out at a future time. The data model (whatsapp_messages.status) already supports a 'queued' state, but there's no scheduler/worker yet to hold a message until its send time and no UI-reachable field for it today." needs={["Scheduled-send column + worker/cron"]} />}

        {/* ── TEMPLATES -- real UI/state, saved to this browser only (localStorage) ──────────── */}
        {section==="templates"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4,flexWrap:"wrap" as const,gap:8}}>
              <div style={{fontSize:11,letterSpacing:4,color:C.MID,textTransform:"uppercase" as const}}>Templates</div>
              <NeedsBackend label="saved locally only -- needs a database table to sync across admins/devices" />
            </div>
            <div style={{fontSize:11.5,color:C.MID,marginBottom:16}}>Drafts live in this browser only right now. "Use in conversation" works for real today; "Use in campaign"/"Schedule" need the Campaigns/Scheduled backend above.</div>
            <div style={{...CARD_STYLE,padding:16,marginBottom:16,display:"flex",flexDirection:"column" as const,gap:10}}>
              <div style={{fontSize:11,letterSpacing:1,textTransform:"uppercase" as const,color:C.MID}}>{templateEditId?"Edit Template":"New Template"}</div>
              <div style={{display:"flex",gap:10,flexWrap:"wrap" as const}}>
                <input style={{...S.inp,flex:1,minWidth:160}} placeholder="Title" value={templateForm.title} onChange={e=>setTemplateForm((f:any)=>({...f,title:e.target.value}))} />
                <select style={{...S.inp,maxWidth:160}} value={templateForm.status} onChange={e=>setTemplateForm((f:any)=>({...f,status:e.target.value}))}>
                  {TEMPLATE_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <textarea style={{...S.inp,minHeight:80}} placeholder="Message body -- use {{first_name}}, {{company}}, {{service}}, {{price}}, {{date}}, {{agent_name}}, {{website}}" value={templateForm.body} onChange={e=>setTemplateForm((f:any)=>({...f,body:e.target.value}))} />
              {templateForm.body&&<div style={{fontSize:11.5,color:C.MID,background:"rgba(255,255,255,0.04)",borderRadius:8,padding:10,whiteSpace:"pre-wrap" as const}}>{substituteVars(templateForm.body)}</div>}
              <div style={{display:"flex",gap:8}}>
                <button onClick={saveTemplate} style={S.btnP}>{templateEditId?"Save Changes":"+ Add Template"}</button>
                {templateEditId&&<button onClick={()=>{setTemplateEditId(null);setTemplateForm(TEMPLATE_EMPTY);}} style={S.btnO}>Cancel</button>}
              </div>
            </div>
            {templates.length===0?(
              <div style={{color:C.MID,fontSize:13,fontStyle:"italic"}}>No templates yet.</div>
            ):(
              <div style={{display:"flex",flexDirection:"column" as const,gap:8}}>
                {templates.map(t=>(
                  <div key={t.id} style={{...CARD_STYLE,padding:14,display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,flexWrap:"wrap" as const}}>
                    <div style={{flex:1,minWidth:200}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{fontSize:13,color:C.FG,fontWeight:600}}>{t.title}</div><StatusPill status={t.status} /></div>
                      <div style={{fontSize:11.5,color:C.MID,marginTop:4,whiteSpace:"pre-wrap" as const}}>{t.body}</div>
                    </div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap" as const}}>
                      <button onClick={()=>useTemplateInConversation(t.body)} style={{...S.btnSm,padding:"6px 12px",fontSize:10}}>Use in conversation</button>
                      <button onClick={()=>alert("Use in campaign: requires the Campaigns backend above.")} style={{...S.btnO,padding:"6px 12px",fontSize:10,opacity:0.6}}>Use in campaign</button>
                      <button onClick={()=>{setTemplateEditId(t.id);setTemplateForm({title:t.title,status:t.status,body:t.body});}} style={{...S.btnO,padding:"6px 12px",fontSize:10}}>Edit</button>
                      <button onClick={()=>deleteTemplate(t.id)} style={{...S.btnO,padding:"6px 12px",fontSize:10,color:"#e74c3c"}}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── MESSAGE DESIGNER -- composes a real, WhatsApp-deliverable plain-text message ──── */}
        {section==="designer"&&(
          <div>
            <div style={{fontSize:11,letterSpacing:4,color:C.MID,textTransform:"uppercase" as const,marginBottom:4}}>Message Designer</div>
            <div style={{fontSize:11.5,color:C.MID,marginBottom:16,lineHeight:1.6}}>WhatsApp text messages only support plain text with *bold*/_italic_ and line breaks (plus one image, once media upload is connected) -- this designer composes exactly that, never an HTML/email layout that WhatsApp can't actually send.</div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"260px 1fr 1fr",gap:16}}>
              <div style={{...CARD_STYLE,padding:14}}>
                <div style={{fontSize:10.5,letterSpacing:1,textTransform:"uppercase" as const,color:C.MID,marginBottom:10}}>Add Block</div>
                <div style={{display:"flex",flexDirection:"column" as const,gap:6}}>
                  {DESIGNER_BLOCK_TYPES.map(b=>(
                    <button key={b.type} onClick={()=>addDesignerBlock(b.type)} style={{...S.btnO,padding:"8px 10px",fontSize:11,textAlign:"left" as const,display:"flex",alignItems:"center",gap:8}}>
                      <span>{b.icon}</span>{b.label}{b.needsBackend&&<NeedsBackend label="upload" />}
                    </button>
                  ))}
                </div>
                <div style={{fontSize:10.5,letterSpacing:1,textTransform:"uppercase" as const,color:C.MID,marginTop:16,marginBottom:8}}>Variables</div>
                <div style={{display:"flex",flexWrap:"wrap" as const,gap:6}}>
                  {WA_VARIABLES.map(([k,label])=>(<span key={k} title={label} style={{fontSize:10,padding:"3px 8px",borderRadius:20,background:"rgba(139,92,246,0.14)",color:C.PL,border:`1px solid ${C.PL}`}}>{`{{${k}}}`}</span>))}
                </div>
              </div>
              <div style={{...CARD_STYLE,padding:14}}>
                <div style={{fontSize:10.5,letterSpacing:1,textTransform:"uppercase" as const,color:C.MID,marginBottom:10}}>Blocks</div>
                <input style={{...S.inp,marginBottom:10,fontSize:12}} placeholder="Design name" value={designerName} onChange={e=>setDesignerName(e.target.value)} />
                {designerBlocks.length===0?(
                  <div style={{fontSize:12,color:C.MID,fontStyle:"italic"}}>Add a block from the left to start.</div>
                ):(
                  <div style={{display:"flex",flexDirection:"column" as const,gap:8}}>
                    {designerBlocks.map((b,i)=>(
                      <div key={b.id} style={{background:"rgba(255,255,255,0.04)",borderRadius:8,padding:10}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                          <span style={{fontSize:10.5,color:C.MID,textTransform:"uppercase" as const}}>{DESIGNER_BLOCK_TYPES.find(x=>x.type===b.type)?.icon} {b.type}</span>
                          <div style={{display:"flex",gap:4}}>
                            <button onClick={()=>moveDesignerBlock(b.id,-1)} disabled={i===0} style={{...S.btnO,padding:"2px 8px",fontSize:10}}>↑</button>
                            <button onClick={()=>moveDesignerBlock(b.id,1)} disabled={i===designerBlocks.length-1} style={{...S.btnO,padding:"2px 8px",fontSize:10}}>↓</button>
                            <button onClick={()=>removeDesignerBlock(b.id)} style={{...S.btnO,padding:"2px 8px",fontSize:10,color:"#e74c3c"}}>✕</button>
                          </div>
                        </div>
                        <input style={{...S.inp,fontSize:12,padding:"8px 10px"}} placeholder={b.type==="image"?"Caption (upload needs backend)":"Text, or {{variable}}"} value={b.text} onChange={e=>updateDesignerBlock(b.id,e.target.value)} />
                      </div>
                    ))}
                  </div>
                )}
                <div style={{display:"flex",gap:8,marginTop:14}}>
                  <button onClick={saveDesignAsTemplate} style={S.btnP}>Save as Template</button>
                  <button onClick={()=>useTemplateInConversation(composeDesignerMessage())} style={S.btnO}>Use in Conversation</button>
                </div>
              </div>
              <div style={{...CARD_STYLE,padding:14}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div style={{fontSize:10.5,letterSpacing:1,textTransform:"uppercase" as const,color:C.MID}}>Preview</div>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>setDesignerPreview("desktop")} style={designerPreview==="desktop"?S.btnSm:{...S.btnO,padding:"5px 10px",fontSize:10}}>Desktop</button>
                    <button onClick={()=>setDesignerPreview("mobile")} style={designerPreview==="mobile"?S.btnSm:{...S.btnO,padding:"5px 10px",fontSize:10}}>Mobile</button>
                  </div>
                </div>
                <div style={{maxWidth:designerPreview==="mobile"?260:420,margin:"0 auto"}}>
                  <div style={{background:"rgba(34,197,94,0.14)",borderRadius:10,padding:"10px 14px",fontSize:12.5,color:C.FG,whiteSpace:"pre-wrap" as const,minHeight:60}}>
                    {substituteVars(composeDesignerMessage())||<span style={{color:C.MID,fontStyle:"italic"}}>Nothing to preview yet.</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── QUICK REPLIES -- unchanged behavior from before, just relocated ─────────────────── */}
        {section==="quickreplies"&&(
          <div>
            <div style={{fontSize:11,letterSpacing:4,color:C.MID,textTransform:"uppercase" as const,marginBottom:16}}>Quick Replies</div>
            <div style={{...CARD_STYLE,padding:16,marginBottom:16,display:"flex",flexDirection:"column" as const,gap:10}}>
              <div style={{fontSize:11,letterSpacing:1,textTransform:"uppercase" as const,color:C.MID}}>{quickReplyEditId?"Edit Quick Reply":"New Quick Reply"}</div>
              <div style={{display:"flex",gap:10,flexWrap:"wrap" as const}}>
                <input style={{...S.inp,flex:1,minWidth:160}} placeholder="Title" value={quickReplyForm.title} onChange={e=>setQuickReplyForm((f:any)=>({...f,title:e.target.value}))} />
                <input style={{...S.inp,flex:1,minWidth:160}} placeholder="Category (optional)" value={quickReplyForm.category} onChange={e=>setQuickReplyForm((f:any)=>({...f,category:e.target.value}))} />
              </div>
              <textarea style={{...S.inp,minHeight:70}} placeholder="Reply text" value={quickReplyForm.body} onChange={e=>setQuickReplyForm((f:any)=>({...f,body:e.target.value}))} />
              <div style={{display:"flex",gap:8}}>
                <button onClick={saveQuickReply} disabled={busy} style={S.btnP}>{quickReplyEditId?"Save Changes":"+ Add Quick Reply"}</button>
                {quickReplyEditId&&<button onClick={()=>{setQuickReplyEditId(null);setQuickReplyForm(QUICK_REPLY_EMPTY);}} style={S.btnO}>Cancel</button>}
              </div>
            </div>
            {quickRepliesLoading?(
              <div style={{color:C.MID,fontSize:13}}>Loading…</div>
            ):!quickReplies||quickReplies.length===0?(
              <div style={{color:C.MID,fontSize:13,fontStyle:"italic"}}>No quick replies yet.</div>
            ):(
              <div style={{display:"flex",flexDirection:"column" as const,gap:8}}>
                {quickReplies.map((q:any)=>(
                  <div key={q.id} style={{...CARD_STYLE,padding:14,display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,flexWrap:"wrap" as const}}>
                    <div>
                      <div style={{fontSize:13,color:C.FG,fontWeight:600}}>{q.title}{q.category?<span style={{color:C.MID,fontWeight:400}}> · {q.category}</span>:null}</div>
                      <div style={{fontSize:11.5,color:C.MID,marginTop:2,whiteSpace:"pre-wrap" as const}}>{q.body}</div>
                    </div>
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={()=>{setQuickReplyEditId(q.id);setQuickReplyForm({title:q.title,body:q.body,category:q.category||""});}} style={{...S.btnO,padding:"5px 12px",fontSize:11}}>Edit</button>
                      <button onClick={()=>deleteQuickReply(q.id)} style={{...S.btnO,padding:"5px 12px",fontSize:11,color:"#e74c3c"}}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── REPORTS -- real conversation-level stats; message-level funnel needs backend ──── */}
        {section==="reports"&&(
          <div>
            <div style={{fontSize:11,letterSpacing:4,color:C.MID,textTransform:"uppercase" as const,marginBottom:16}}>Reports</div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:12,marginBottom:20}}>
              {[["Total Conversations",stats.total],["Open",stats.open],["Pending",stats.pending],["Closed",stats.closed]].map(([label,val])=>(
                <div key={label as string} style={{...CARD_STYLE,padding:16}}>
                  <div style={{fontSize:22,fontWeight:700,color:C.FG}}>{val as number}</div>
                  <div style={{fontSize:10.5,letterSpacing:1,textTransform:"uppercase" as const,color:C.MID,marginTop:4}}>{label}</div>
                </div>
              ))}
            </div>
            <ComingSoonPanel icon="📈" title="Message Delivery Funnel" blurb={`Queued → Sent → Delivered → Read, and Failed, with real timestamps -- the whatsapp_messages.status column already stores exactly this lifecycle for every message. What's missing is a read-only aggregation endpoint that totals it across every conversation (today's endpoints only return one conversation's messages at a time); this report will use sent_at/delivered_at/read_at/failed_at the moment it exists, and will never show a made-up number before then.`} needs={["A read-only /api/admin/whatsapp/reports aggregation endpoint"]} />
          </div>
        )}

        {/* ── SETTINGS (Connection) -- unchanged behavior from before, just relocated ─────────── */}
        {section==="settings"&&(
          <div style={{...CARD_STYLE,padding:24,maxWidth:560}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={{fontSize:11,letterSpacing:1,textTransform:"uppercase" as const,color:C.MID}}>WhatsApp Connection</div>
              <div style={{display:"flex",gap:8}}>
                {connection&&connection.status==="connected"&&(
                  <button onClick={disconnectWhatsApp} disabled={connectionDisconnecting} style={{...S.btnO,padding:"6px 14px",fontSize:11,color:"#f87171",borderColor:"rgba(248,113,113,0.4)"}}>{connectionDisconnecting?"Disconnecting…":"Disconnect"}</button>
                )}
                <button onClick={loadConnection} disabled={connectionLoading} style={{...S.btnO,padding:"6px 14px",fontSize:11}}>{connectionLoading?"Refreshing…":"Refresh"}</button>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
              <StatusPill status={(connection&&connection.status)||"not_connected"} />
              <span style={{fontSize:12.5,color:C.MID}}>{connection&&connection.phone_number?`Number: ${connection.phone_number}`:"No WhatsApp number connected yet."}</span>
            </div>
            {connection&&connection.error&&<div style={{fontSize:12,color:"#f87171",marginBottom:16}}>{connection.error}</div>}

            {connection&&connection.status==="connecting"&&connection.qr_code&&(
              <div style={{marginBottom:20,textAlign:"center" as const}}>
                <div style={{fontSize:12.5,color:C.MID,marginBottom:14}}>
                  Open WhatsApp on the phone you're connecting &rarr; <strong>Settings &rarr; Linked Devices &rarr; Link a Device</strong> &rarr; scan this:
                </div>
                <WhatsAppQrCode data={connection.qr_code} />
                <div style={{fontSize:11,color:C.MID,marginTop:12}}>
                  This refreshes on its own every few seconds, same as web.whatsapp.com -- if it looks stale just wait a moment for the next one.
                </div>
              </div>
            )}

            <div style={{fontSize:12.5,color:C.MID,lineHeight:1.7}}>
              This page always reads the real connection status from the database, and it always reports <strong>Not Connected</strong> until the future WhatsApp bridge (running on your VPS) reports in for the first time -- nothing here can be switched to "connected" by clicking anything on this page. The database, the API layer, and this whole inbox are ready and waiting for it: once the bridge is installed and scans in through a QR code, it will start pushing real incoming messages into this same inbox and pulling queued outbound messages back out of it -- with no changes needed to this screen.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
