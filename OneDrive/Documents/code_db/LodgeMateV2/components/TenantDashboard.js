'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { ref, onValue, push, set, get, update } from 'firebase/database';
import { db } from '@/lib/firebase';
import { formatExpiry, isOTPValid } from '@/lib/otp';
import { compressImage } from '@/lib/compressImage';
import Header from './Header';

// Strip HTML tags and dangerous chars from user input
function sanitize(str, maxLen = 500) {
  return String(str).replace(/<[^>]*>/g, '').replace(/[<>'"\\]/g, '').trim().slice(0, maxLen);
}

export default function TenantDashboard({ tenantSession, darkMode, toggleDarkMode, onLogout, onOpenAdminLogin }) {
  const { otp, landlordId, aptId, expiresAt } = tenantSession;

  const [apt, setApt]               = useState(null);
  const [lodge, setLodge]           = useState(null);
  const [tickets, setTickets]       = useState([]);
  const [landlord, setLandlord]     = useState(null);
  const [view, setView]             = useState('home');
  const [selTicket, setSelTicket]   = useState(null);
  const [form, setForm]             = useState({ title:'', description:'', image:null });
  const [msg, setMsg]               = useState('');
  const [busy, setBusy]             = useState(false);
  const [loading, setLoading]       = useState(true);
  const [tenantName, setTenantName] = useState(tenantSession.tenantName || '');
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput]   = useState(tenantSession.tenantName || '');
  const [savingName, setSavingName] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const u1 = onValue(ref(db, `apartments/${landlordId}/${aptId}`), snap => {
      const data = snap.val();
      setApt(data);
      if (data?.lodgeId) {
        get(ref(db, `lodges/${landlordId}/${data.lodgeId}`)).then(s => setLodge(s.val()));
      }
      setLoading(false);
    });
    get(ref(db, `landlordCodes`)).then(snap => {
      const data = snap.val() || {};
      const match = Object.values(data).find(l => l.landlordId === landlordId);
      if (match) setLandlord(match);
    });
    return () => u1();
  }, [landlordId, aptId]);

  useEffect(() => {
    const unsub = onValue(ref(db, `tickets/${landlordId}`), snap => {
      const data = snap.val() || {};
      setTickets(
        Object.keys(data).map(k => ({ id:k, ...data[k] }))
          .filter(t => t.aptId === aptId)
          .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
      );
    });
    return () => unsub();
  }, [landlordId, aptId]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (view === 'ticket') chatEndRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [view, tickets]);

  const handleImagePick = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please select an image file.'); return; }
    setUploadingImg(true);
    const reader = new FileReader();
    reader.onload = async ev => {
      const compressed = await compressImage(ev.target.result, 800, 600, 0.6);
      setForm(p => ({ ...p, image: compressed }));
      setUploadingImg(false);
    };
    reader.readAsDataURL(file);
  }, []);

  const submitTicket = useCallback(async () => {
    const title = sanitize(form.title, 80);
    const description = sanitize(form.description, 500);
    if (!title || !description) return;
    if (title.length < 3) { alert('Title is too short.'); return; }
    setBusy(true);
    try {
      const ticketRef = push(ref(db, `tickets/${landlordId}`));
      await set(ticketRef, {
        landlordId, aptId,
        tenantOtp:   otp,
        tenantName:  sanitize(tenantName, 60) || '',
        lodgeId:     apt?.lodgeId || null,
        status:      'open',
        title,
        description,
        image:       form.image || null,
        messages:    [],
        createdAt:   new Date().toISOString(),
      });
      await set(ref(db, `apartments/${landlordId}/${aptId}/hasOpenTicket`), true);
      setForm({ title:'', description:'', image:null });
      setView('home');
    } catch { alert('Failed to submit. Try again.'); }
    setBusy(false);
  }, [form, landlordId, aptId, otp, tenantName, apt]);

  const sendMessage = useCallback(async (ticketId) => {
    const text = sanitize(msg, 1000);
    if (!text) return;
    const msgRef = push(ref(db, `tickets/${landlordId}/${ticketId}/messages`));
    await set(msgRef, { from:'tenant', text, timestamp:new Date().toISOString() });
    setMsg('');
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior:'smooth' }), 100);
  }, [msg, landlordId]);

  const saveName = useCallback(async () => {
    if (!nameInput.trim()) return;
    setSavingName(true);
    const trimmed = nameInput.trim();
    await set(ref(db, `tenants/${otp}/tenantName`), trimmed);
    try {
      const stored = JSON.parse(sessionStorage.getItem('lm_tenant') || '{}');
      sessionStorage.setItem('lm_tenant', JSON.stringify({ ...stored, tenantName: trimmed }));
    } catch {}
    setTenantName(trimmed);
    setEditingName(false);
    setSavingName(false);
  }, [nameInput, otp]);

  const expired = !isOTPValid(expiresAt);

  if (expired) return <ExpiredScreen expiresAt={expiresAt} onLogout={onLogout} otp={otp} />;
  if (loading) return <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center' }}><span className="spinner-dark"></span></div>;

  // ── Ticket thread ──────────────────────────────────────────────────────────
  if (view === 'ticket' && selTicket) {
    const t = tickets.find(t => t.id === selTicket);
    if (!t) { setView('home'); return null; }
    const messages = t.messages ? Object.values(t.messages).sort((a,b) => new Date(a.timestamp)-new Date(b.timestamp)) : [];
    return (
      <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', flexDirection:'column' }}>
        <Header currentPage="home" darkMode={darkMode} toggleDarkMode={toggleDarkMode} onNavigateHome={onLogout} onOpenAdminLogin={onOpenAdminLogin} />
        <div style={{ flex:1, maxWidth:'42rem', margin:'0 auto', padding:'1.5rem 1rem 2rem', width:'100%', display:'flex', flexDirection:'column', boxSizing:'border-box' }}>
          <button onClick={() => setView('home')} className="btn btn-ghost btn-sm" style={{ marginBottom:'1rem', alignSelf:'flex-start' }}>
            <i className="fas fa-arrow-left" style={{ fontSize:'0.7rem' }}></i>Back
          </button>

          {/* Ticket header */}
          <div className="admin-card" style={{ padding:'1.25rem', marginBottom:'0.75rem', flexShrink:0 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'0.75rem' }}>
              <div style={{ minWidth:0 }}>
                <h2 style={{ fontWeight:800, fontSize:'1rem', color:'var(--text)', margin:'0 0 0.25rem' }}>{t.title}</h2>
                <p style={{ color:'var(--text-2)', fontSize:'0.8125rem', margin:0, lineHeight:1.5 }}>{t.description}</p>
              </div>
              <StatusBadge status={t.status} />
            </div>
            {t.image && <img src={t.image} alt="Complaint" style={{ marginTop:'0.75rem', width:'100%', maxHeight:'200px', objectFit:'cover', borderRadius:'0.625rem', border:'1px solid var(--border)' }} />}
          </div>

          {/* Chat area — fixed height, scrollable */}
          <div className="admin-card" style={{ padding:'1rem', marginBottom:'0.75rem', display:'flex', flexDirection:'column', flex:1, minHeight:0, maxHeight:'55vh' }}>
            <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:'0.75rem', paddingBottom:'0.5rem' }}>
              {messages.length === 0 && <p style={{ color:'var(--text-3)', fontSize:'0.875rem', textAlign:'center', padding:'2rem 0' }}>No messages yet.</p>}
              {messages.map((m, i) => <ChatBubble key={i} msg={m} isOwn={m.from === 'tenant'} />)}
              <div ref={chatEndRef} />
            </div>
            {t.status === 'open' && (
              <div style={{ display:'flex', gap:'0.5rem', marginTop:'0.75rem', flexShrink:0, borderTop:'1px solid var(--border)', paddingTop:'0.75rem' }}>
                <input value={msg} onChange={e=>setMsg(e.target.value)}
                  onKeyDown={e => e.key==='Enter' && !e.shiftKey && sendMessage(t.id)}
                  placeholder="Add a note…" className="lm-input" style={{ flex:1 }} />
                <button onClick={() => sendMessage(t.id)} disabled={!msg.trim()}
                  style={{ width:'2.75rem', height:'2.75rem', borderRadius:'0.75rem', background:'var(--violet)', color:'white', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, opacity:!msg.trim()?0.4:1 }}>
                  <i className="fas fa-paper-plane" style={{ fontSize:'0.75rem' }}></i>
                </button>
              </div>
            )}
            {t.status === 'closed' && (
              <div style={{ marginTop:'0.75rem', borderTop:'1px solid var(--border)', paddingTop:'0.75rem', display:'flex', alignItems:'center', gap:'0.5rem' }}>
                <i className="fas fa-check-circle" style={{ color:'var(--green)', fontSize:'0.85rem' }}></i>
                <p style={{ color:'var(--green)', fontSize:'0.8125rem', fontWeight:600, margin:0 }}>Resolved and closed</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── New complaint form ─────────────────────────────────────────────────────
  if (view === 'new-ticket') {
    return (
      <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
        <Header currentPage="home" darkMode={darkMode} toggleDarkMode={toggleDarkMode} onNavigateHome={onLogout} onOpenAdminLogin={onOpenAdminLogin} />
        <div style={{ maxWidth:'36rem', margin:'0 auto', padding:'1.5rem 1rem 4rem' }}>
          <button onClick={() => setView('home')} className="btn btn-ghost btn-sm" style={{ marginBottom:'1.25rem' }}>
            <i className="fas fa-arrow-left" style={{ fontSize:'0.7rem' }}></i>Back
          </button>
          <div className="admin-card" style={{ padding:'1.5rem' }}>
            <div className="section-label" style={{ marginBottom:'0.5rem' }}><i className="fas fa-ticket-alt" style={{ fontSize:'0.65rem' }}></i>New Complaint</div>
            <h2 style={{ fontWeight:900, fontSize:'1.25rem', color:'var(--text)', margin:'0 0 1.5rem', letterSpacing:'-0.04em' }}>Report an Issue</h2>
            <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              <div>
                <label className="lm-label">Issue Title *</label>
                <input type="text" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))}
                  placeholder="e.g. Leaking roof, broken lock…" className="lm-input" maxLength={80} />
              </div>
              <div>
                <label className="lm-label">Description *</label>
                <textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))}
                  rows={4} maxLength={500} className="lm-textarea"
                  placeholder="Describe the issue — when it started, how severe, what help is needed…" />
                <p style={{ fontSize:'0.75rem', color:form.description.length>460?'#ef4444':'var(--text-3)', marginTop:'0.25rem', textAlign:'right' }}>{form.description.length}/500</p>
              </div>

              {/* Image upload */}
              <div>
                <label className="lm-label">Attach Photo <span style={{ fontWeight:400, color:'var(--text-3)' }}>(optional, max 1)</span></label>
                {form.image ? (
                  <div style={{ position:'relative', display:'inline-block', width:'100%' }}>
                    <img src={form.image} alt="Preview" style={{ width:'100%', maxHeight:'180px', objectFit:'cover', borderRadius:'0.75rem', border:'1px solid var(--border)' }} />
                    <button onClick={() => setForm(p=>({...p,image:null}))}
                      style={{ position:'absolute', top:'0.5rem', right:'0.5rem', width:'1.75rem', height:'1.75rem', borderRadius:'9999px', background:'rgba(0,0,0,0.6)', border:'none', color:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.65rem' }}>
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                ) : (
                  <label style={{ display:'flex', alignItems:'center', gap:'0.625rem', padding:'0.875rem 1rem', borderRadius:'0.875rem', border:'2px dashed var(--border-2)', cursor:'pointer', background:'var(--bg-3)', transition:'border-color 0.15s' }}
                    onMouseEnter={e=>e.currentTarget.style.borderColor='var(--violet)'}
                    onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border-2)'}>
                    {uploadingImg
                      ? <><span className="spinner-dark" style={{ width:'1rem', height:'1rem' }}></span><span style={{ fontSize:'0.875rem', color:'var(--text-2)' }}>Compressing…</span></>
                      : <><i className="fas fa-camera" style={{ color:'var(--violet)', fontSize:'1rem' }}></i><span style={{ fontSize:'0.875rem', color:'var(--text-2)', fontWeight:500 }}>Tap to add a photo</span></>
                    }
                    <input type="file" accept="image/*" onChange={handleImagePick} style={{ display:'none' }} />
                  </label>
                )}
              </div>

              <button onClick={submitTicket} disabled={busy || !form.title.trim() || !form.description.trim()} className="btn btn-primary"
                style={{ width:'100%', height:'3rem', opacity:(busy||!form.title.trim()||!form.description.trim())?0.6:1 }}>
                {busy ? <><span className="spinner" style={{ marginRight:'0.5rem' }}></span>Submitting…</> : <><i className="fas fa-paper-plane"></i>Submit Complaint</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Home ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
      <Header currentPage="home" darkMode={darkMode} toggleDarkMode={toggleDarkMode} onNavigateHome={onLogout} onOpenAdminLogin={onOpenAdminLogin} />
      <div style={{ maxWidth:'42rem', margin:'0 auto', padding:'1.5rem 1rem 5rem' }}>

        {/* Top bar with sign out */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
          <p style={{ fontSize:'0.8125rem', color:'var(--text-2)', margin:0 }}>
            <i className="fas fa-home" style={{ marginRight:'0.35rem', color:'var(--violet)' }}></i>
            Tenant Portal
          </p>
          <button onClick={() => {
            sessionStorage.removeItem('lm_tenant');
            onLogout();
          }}
            style={{ display:'flex', alignItems:'center', gap:'0.4rem', padding:'0.4rem 0.875rem', borderRadius:'0.75rem', border:'1px solid var(--border-2)', background:'transparent', color:'var(--text-2)', fontFamily:'inherit', fontSize:'0.8125rem', fontWeight:600, cursor:'pointer', transition:'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor='#ef4444'; e.currentTarget.style.color='#ef4444'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border-2)'; e.currentTarget.style.color='var(--text-2)'; }}>
            <i className="fas fa-sign-out-alt" style={{ fontSize:'0.7rem' }}></i>Sign Out
          </button>
        </div>
        <div className="admin-card anim-up" style={{ padding:'1.5rem', marginBottom:'1.25rem' }}>
          <div className="section-label" style={{ marginBottom:'0.625rem' }}><i className="fas fa-home" style={{ fontSize:'0.65rem' }}></i>Your Apartment</div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'1rem', flexWrap:'wrap', marginBottom:'1rem' }}>
            <div>
              <h1 style={{ fontWeight:900, fontSize:'clamp(1.375rem,4vw,1.875rem)', letterSpacing:'-0.04em', color:'var(--text)', margin:'0 0 0.125rem' }}>
                {apt?.number || `Apartment ${aptId}`}
              </h1>
              {lodge && <p style={{ fontSize:'0.8125rem', color:'var(--violet)', fontWeight:700, margin:'0 0 0.125rem' }}><i className="fas fa-building" style={{ marginRight:'0.35rem', fontSize:'0.6rem' }}></i>{lodge.name}</p>}
              {landlord?.name && <p style={{ color:'var(--text-2)', fontSize:'0.8125rem', margin:0 }}>Managed by <strong style={{ color:'var(--text)' }}>{landlord.name}</strong></p>}
            </div>
            <div style={{ background:'rgba(21,128,61,0.08)', border:'1px solid rgba(21,128,61,0.2)', borderRadius:'0.75rem', padding:'0.4rem 0.75rem', flexShrink:0 }}>
              <p style={{ fontSize:'0.75rem', fontWeight:700, color:'var(--green)', margin:0 }}><i className="fas fa-calendar-check" style={{ marginRight:'0.35rem' }}></i>Expires {formatExpiry(expiresAt)}</p>
            </div>
          </div>

          {/* Name section */}
          <div style={{ borderTop:'1px solid var(--border)', paddingTop:'0.875rem' }}>
            <p style={{ fontSize:'0.7rem', fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.08em', margin:'0 0 0.375rem' }}>Your Name</p>
            {editingName ? (
              <div style={{ display:'flex', gap:'0.5rem' }}>
                <input type="text" value={nameInput} onChange={e=>setNameInput(e.target.value)}
                  onKeyDown={e=>{if(e.key==='Enter')saveName();if(e.key==='Escape'){setEditingName(false);setNameInput(tenantName);}}}
                  autoFocus maxLength={60} placeholder="Your full name…" className="lm-input" style={{ flex:1 }} />
                <button onClick={saveName} disabled={savingName||!nameInput.trim()}
                  style={{ height:'2.75rem', padding:'0 1rem', borderRadius:'0.75rem', background:'var(--violet)', color:'white', border:'none', fontFamily:'inherit', fontWeight:700, cursor:'pointer', opacity:(savingName||!nameInput.trim())?0.6:1 }}>
                  {savingName ? '…' : 'Save'}
                </button>
                <button onClick={()=>{setEditingName(false);setNameInput(tenantName);}} className="btn btn-ghost" style={{ height:'2.75rem', padding:'0 0.75rem' }}>✕</button>
              </div>
            ) : (
              <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                <p style={{ fontWeight:700, fontSize:'0.9375rem', color:'var(--text)', margin:0 }}>
                  {tenantName || <span style={{ color:'var(--text-3)', fontWeight:400, fontStyle:'italic' }}>Not set</span>}
                </p>
                <button onClick={()=>{setEditingName(true);setNameInput(tenantName);}}
                  style={{ display:'flex', alignItems:'center', gap:'0.3rem', background:'none', border:'1px solid var(--border-2)', borderRadius:'0.5rem', padding:'0.2rem 0.5rem', cursor:'pointer', color:'var(--text-3)', fontFamily:'inherit', fontSize:'0.75rem', fontWeight:600 }}>
                  <i className="fas fa-pen" style={{ fontSize:'0.5rem' }}></i>{tenantName ? 'Edit' : 'Add'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Report button */}
        <button onClick={() => setView('new-ticket')}
          style={{ width:'100%', height:'3.25rem', borderRadius:'1rem', border:'none', background:'var(--violet)', color:'white', fontFamily:'inherit', fontSize:'0.9375rem', fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.625rem', marginBottom:'1.25rem', boxShadow:'0 4px 20px var(--violet-glow)' }}>
          <i className="fas fa-plus-circle"></i>Report an Issue
        </button>

        {/* Tickets list */}
        <h2 style={{ fontWeight:800, fontSize:'1rem', color:'var(--text)', margin:'0 0 0.875rem', letterSpacing:'-0.025em' }}>
          My Complaints <span style={{ fontWeight:500, color:'var(--text-3)', fontSize:'0.875rem' }}>({tickets.length})</span>
        </h2>
        {tickets.length === 0 ? (
          <div className="admin-card" style={{ padding:'2.5rem 1.5rem', textAlign:'center' }}>
            <i className="fas fa-clipboard-check" style={{ fontSize:'1.75rem', color:'var(--text-3)', display:'block', marginBottom:'0.625rem' }}></i>
            <p style={{ fontWeight:700, color:'var(--text-2)', margin:'0 0 0.2rem' }}>No complaints yet</p>
            <p style={{ color:'var(--text-3)', fontSize:'0.8125rem', margin:0 }}>Use the button above to report an issue</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'0.625rem' }}>
            {tickets.map(t => (
              <button key={t.id} onClick={() => { setSelTicket(t.id); setView('ticket'); }}
                className="admin-card"
                style={{ padding:'1rem 1.125rem', cursor:'pointer', border:'1px solid var(--border)', borderRadius:'0.875rem', textAlign:'left', width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', gap:'0.75rem', background:'var(--card-bg)' }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--violet)';e.currentTarget.style.transform='translateY(-1px)';}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.transform='none';}}>
                <div style={{ minWidth:0 }}>
                  <p style={{ fontWeight:700, color:'var(--text)', margin:'0 0 0.2rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:'0.9rem' }}>{t.title}</p>
                  <p style={{ color:'var(--text-2)', fontSize:'0.75rem', margin:0 }}>{new Date(t.createdAt).toLocaleDateString('en-NG')}{t.image && ' · 📷'}</p>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', flexShrink:0 }}>
                  <StatusBadge status={t.status} />
                  <i className="fas fa-chevron-right" style={{ color:'var(--text-3)', fontSize:'0.65rem' }}></i>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const open = status === 'open';
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:'0.35rem', padding:'0.2rem 0.5rem', borderRadius:'9999px', fontSize:'0.6875rem', fontWeight:700, flexShrink:0,
      background:open?'rgba(239,68,68,0.08)':'rgba(21,128,61,0.08)',
      border:`1px solid ${open?'rgba(239,68,68,0.25)':'rgba(21,128,61,0.25)'}`,
      color:open?'#ef4444':'var(--green)' }}>
      <span style={{ width:'5px', height:'5px', borderRadius:'9999px', background:open?'#ef4444':'var(--green)' }} />
      {open ? 'Open' : 'Resolved'}
    </span>
  );
}

function ChatBubble({ msg, isOwn }) {
  const label = msg.from==='tenant'?'You':msg.from==='landlord'?'Landlord':'LodgeMate';
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:isOwn?'flex-end':'flex-start' }}>
      <p style={{ fontSize:'0.6875rem', color:'var(--text-3)', margin:'0 0 0.2rem', fontWeight:600 }}>{label}</p>
      <div style={{ maxWidth:'80%', padding:'0.625rem 0.875rem', borderRadius:isOwn?'1rem 1rem 0.25rem 1rem':'1rem 1rem 1rem 0.25rem',
        background:isOwn?'var(--violet)':'var(--bg-3)', color:isOwn?'white':'var(--text)', fontSize:'0.875rem', lineHeight:1.5, wordBreak:'break-word' }}>
        {msg.text}
      </div>
      <p style={{ fontSize:'0.6rem', color:'var(--text-3)', margin:'0.2rem 0 0' }}>
        {new Date(msg.timestamp).toLocaleTimeString('en-NG',{hour:'2-digit',minute:'2-digit'})}
      </p>
    </div>
  );
}

function ExpiredScreen({ expiresAt, onLogout, otp }) {
  const [code, setCode]   = useState('');
  const [busy, setBusy]   = useState(false);
  const [err, setErr]     = useState('');
  const [done, setDone]   = useState(false);

  const renew = async () => {
    const raw = code.trim().toUpperCase();
    if (raw.length < 6) { setErr('Enter your full OTP code.'); return; }
    setBusy(true); setErr('');
    try {
      const snap = await get(ref(db, `tenants/${raw}`));
      if (!snap.exists()) { setErr('Invalid OTP code. Check with your landlord.'); setBusy(false); return; }
      const data = snap.val();
      // Reset expiry for 1 more year
      const newExpiry = new Date(); newExpiry.setFullYear(newExpiry.getFullYear()+1);
      await update(ref(db, `tenants/${raw}`), { expiresAt:newExpiry.toISOString(), renewedAt:new Date().toISOString() });
      setDone(true);
      setTimeout(onLogout, 2000);
    } catch { setErr('Something went wrong.'); }
    setBusy(false);
  };

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', padding:'1.5rem' }}>
      <div style={{ maxWidth:'26rem', width:'100%', textAlign:'center' }}>
        <div style={{ width:'4rem', height:'4rem', borderRadius:'1.25rem', background:'rgba(239,68,68,0.1)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1.25rem', fontSize:'1.75rem' }}>
          <i className="fas fa-clock" style={{ color:'#ef4444' }}></i>
        </div>
        <h2 style={{ fontWeight:900, fontSize:'1.375rem', color:'var(--text)', margin:'0 0 0.625rem' }}>Access Expired</h2>
        <p style={{ color:'var(--text-2)', marginBottom:'1.75rem', lineHeight:1.6, fontSize:'0.9rem' }}>
          Your OTP expired on <strong>{new Date(expiresAt).toLocaleDateString('en-NG')}</strong>. Contact your landlord to renew.
        </p>
        {done ? (
          <div style={{ background:'rgba(21,128,61,0.08)', border:'1px solid rgba(21,128,61,0.25)', borderRadius:'0.875rem', padding:'1rem' }}>
            <i className="fas fa-check-circle" style={{ color:'var(--green)', fontSize:'1.25rem', display:'block', marginBottom:'0.4rem' }}></i>
            <p style={{ color:'var(--green)', fontWeight:700, margin:0 }}>Renewed! Redirecting…</p>
          </div>
        ) : (
          <div className="admin-card" style={{ padding:'1.25rem', textAlign:'left' }}>
            <p style={{ fontWeight:700, color:'var(--text)', margin:'0 0 0.625rem', fontSize:'0.9375rem' }}>Renew Access</p>
            <div style={{ display:'flex', gap:'0.5rem' }}>
              <input type="text" value={code} onChange={e=>setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,''))}
                placeholder="Enter OTP…" className="lm-input" style={{ flex:1, letterSpacing:'0.12em', fontWeight:700 }} />
              <button onClick={renew} disabled={busy||code.length<6}
                style={{ padding:'0 1rem', height:'2.875rem', borderRadius:'0.75rem', background:'var(--violet)', color:'white', border:'none', fontFamily:'inherit', fontWeight:700, cursor:'pointer', opacity:(busy||code.length<6)?0.6:1 }}>
                {busy?'…':'Renew'}
              </button>
            </div>
            {err && <p style={{ color:'#ef4444', fontSize:'0.8125rem', margin:'0.5rem 0 0' }}>{err}</p>}
          </div>
        )}
        <button onClick={onLogout} className="btn btn-ghost" style={{ marginTop:'0.875rem', width:'100%' }}>Back to Home</button>
      </div>
    </div>
  );
}
