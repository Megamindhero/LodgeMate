'use client';
import { useState, useCallback, memo, useEffect, useRef } from 'react';
import { ref, onValue, push, set, update, remove } from 'firebase/database';
import { db } from '@/lib/firebase';
import Header from './Header';
import { compressImage } from '@/lib/compressImage';
import { validatePropertyForm, buildSafeProperty, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE_MB } from '@/lib/validation';
import { generateLandlordCode, formatLandlordCode } from '@/lib/codes';

// ─── Main AdminPage ────────────────────────────────────────────────────────────
const AdminPage = memo(function AdminPage({ properties, darkMode, toggleDarkMode, onLogout, onSave, onDelete, onEdit, onToggleFeatured, onToggleAvailable, onOpenLightbox, onOpenAdminLogin }) {
  const [section, setSection] = useState('properties');

  const navItems = [
    { id:'properties', icon:'fa-home',        label:'Properties' },
    { id:'landlords',  icon:'fa-building',     label:'Landlords'  },
    { id:'tenants',    icon:'fa-users',        label:'Tenants'    },
    { id:'tickets',    icon:'fa-ticket-alt',   label:'Tickets'    },
    { id:'metrics',    icon:'fa-chart-line',   label:'Metrics'    },
  ];

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', flexDirection:'column' }}>
      <Header currentPage="admin" darkMode={darkMode} toggleDarkMode={toggleDarkMode} onNavigateHome={onLogout} onOpenAdminLogin={onOpenAdminLogin} />

      <div style={{ display:'flex', flex:1, minHeight:0 }}>
        {/* ── Desktop sidebar ── */}
        <aside className="admin-sidebar" style={{ width:'13rem', flexShrink:0, background:'var(--bg-2)', borderRight:'1px solid var(--border)', padding:'1.25rem 0.625rem', display:'flex', flexDirection:'column', gap:'0.25rem', position:'sticky', top:'60px', height:'calc(100vh - 60px)', overflowY:'auto' }}>
          <p style={{ fontSize:'0.625rem', fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 0.5rem 0.5rem' }}>Dashboard</p>
          {navItems.map(n => (
            <button key={n.id} onClick={() => setSection(n.id)}
              style={{ display:'flex', alignItems:'center', gap:'0.625rem', padding:'0.575rem 0.75rem', borderRadius:'0.75rem', border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:'0.8125rem', fontWeight:section===n.id?700:500, textAlign:'left', transition:'all 0.15s',
                background:section===n.id?'var(--violet)':'transparent', color:section===n.id?'white':'var(--text-2)' }}
              onMouseEnter={e=>{if(section!==n.id)e.currentTarget.style.background='var(--bg-3)';}}
              onMouseLeave={e=>{if(section!==n.id)e.currentTarget.style.background='transparent';}}>
              <i className={`fas ${n.icon}`} style={{ fontSize:'0.75rem', width:'0.875rem', textAlign:'center', flexShrink:0 }}></i>
              {n.label}
            </button>
          ))}
          <div style={{ marginTop:'auto', paddingTop:'1.25rem' }}>
            <button onClick={onLogout}
              style={{ display:'flex', alignItems:'center', gap:'0.625rem', padding:'0.575rem 0.75rem', borderRadius:'0.75rem', border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:'0.8125rem', fontWeight:500, color:'#ef4444', background:'transparent', width:'100%' }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(239,68,68,0.07)'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <i className="fas fa-sign-out-alt" style={{ fontSize:'0.75rem', width:'0.875rem', textAlign:'center' }}></i>Sign Out
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main style={{ flex:1, overflowY:'auto', padding:'1.75rem 1.25rem 5rem', minWidth:0 }}>
          {section==='properties' && <PropertiesSection properties={properties} onSave={onSave} onDelete={onDelete} onEdit={onEdit} onToggleFeatured={onToggleFeatured} onToggleAvailable={onToggleAvailable} onOpenLightbox={onOpenLightbox} />}
          {section==='landlords'  && <LandlordsSection />}
          {section==='tenants'    && <TenantsSection />}
          {section==='tickets'    && <TicketsSection />}
          {section==='metrics'    && <MetricsSection properties={properties} />}
        </main>
      </div>

      {/* ── Mobile bottom tab bar ── */}
      <nav className="admin-mobile-tabs">
        {navItems.map(n => (
          <button key={n.id} onClick={() => setSection(n.id)}
            style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'3px', padding:'0.5rem 0.25rem', border:'none', background:'transparent', cursor:'pointer', fontFamily:'inherit', transition:'color 0.15s',
              color:section===n.id?'var(--violet)':'var(--text-3)' }}>
            <i className={`fas ${n.icon}`} style={{ fontSize:'1.0625rem' }}></i>
            <span style={{ fontSize:'0.5625rem', fontWeight:700, letterSpacing:'0.01em' }}>{n.label}</span>
            {section===n.id && <span style={{ width:'4px', height:'4px', borderRadius:'9999px', background:'var(--violet)' }} />}
          </button>
        ))}
        <button onClick={onLogout}
          style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'3px', padding:'0.5rem 0.25rem', border:'none', background:'transparent', cursor:'pointer', fontFamily:'inherit', color:'#ef4444' }}>
          <i className="fas fa-sign-out-alt" style={{ fontSize:'1.0625rem' }}></i>
          <span style={{ fontSize:'0.5625rem', fontWeight:700 }}>Exit</span>
        </button>
      </nav>

      <style>{`
        .admin-mobile-tabs { display:none; }
        .admin-sidebar { display:flex; }
        @media(max-width:768px){
          .admin-sidebar { display:none !important; }
          .admin-mobile-tabs { display:flex !important; position:fixed; bottom:0; left:0; right:0; background:var(--bg-2); border-top:1.5px solid var(--border); z-index:40; padding:0.25rem 0 max(env(safe-area-inset-bottom,0px),0.25rem); }
          main { padding-bottom:5.5rem !important; }
        }
      `}</style>
    </div>
  );
});

// ─── Shared helpers ────────────────────────────────────────────────────────────
function SectionHead({ icon, label, title, subtitle }) {
  return (
    <div className="anim-up" style={{ marginBottom:'2rem' }}>
      <div className="section-label" style={{ marginBottom:'0.75rem' }}><i className={`fas ${icon}`} style={{ fontSize:'0.65rem' }}></i>{label}</div>
      <h1 style={{ fontWeight:900, fontSize:'clamp(1.5rem,3vw,2rem)', letterSpacing:'-0.04em', color:'var(--text)', margin:'0 0 0.25rem' }}>{title}</h1>
      {subtitle && <p style={{ fontSize:'0.875rem', color:'var(--text-2)', margin:0 }}>{subtitle}</p>}
    </div>
  );
}

function StatusBadge({ status }) {
  const open = status === 'open';
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:'0.35rem', padding:'0.25rem 0.625rem', borderRadius:'9999px', fontSize:'0.6875rem', fontWeight:700, flexShrink:0,
      background:open?'rgba(239,68,68,0.08)':'rgba(21,128,61,0.08)',
      border:`1px solid ${open?'rgba(239,68,68,0.25)':'rgba(21,128,61,0.25)'}`,
      color:open?'#ef4444':'var(--green)' }}>
      <span style={{ width:'5px', height:'5px', borderRadius:'9999px', background:open?'#ef4444':'var(--green)' }} />
      {open?'Open':'Resolved'}
    </span>
  );
}

function ChatBubble({ msg }) {
  const isAdmin = msg.from === 'admin';
  const label = isAdmin ? 'You (Admin)' : msg.from === 'landlord' ? 'Landlord' : 'Tenant';
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:isAdmin?'flex-end':'flex-start' }}>
      <p style={{ fontSize:'0.6875rem', color:'var(--text-3)', margin:'0 0 0.2rem', fontWeight:600 }}>{label}</p>
      <div style={{ maxWidth:'80%', padding:'0.625rem 0.875rem', borderRadius:isAdmin?'1rem 1rem 0.25rem 1rem':'1rem 1rem 1rem 0.25rem',
        background:isAdmin?'#4f46e5':'var(--bg-3)', color:isAdmin?'white':'var(--text)', fontSize:'0.875rem', lineHeight:1.5, wordBreak:'break-word' }}>
        {msg.text}
      </div>
      <p style={{ fontSize:'0.6rem', color:'var(--text-3)', margin:'0.2rem 0 0' }}>
        {new Date(msg.timestamp).toLocaleTimeString('en-NG',{hour:'2-digit',minute:'2-digit'})}
      </p>
    </div>
  );
}

// Strip HTML/injection from user text
function sanitize(str, maxLen = 1000) {
  return String(str).replace(/<[^>]*>/g, '').replace(/[<>'"\\]/g, '').trim().slice(0, maxLen);
}

// ─── Tickets Section ────────────────────────────────────────────────────────────
function TicketsSection() {
  const [allTickets, setAllTickets]   = useState([]);
  const [landlords, setLandlords]     = useState({});
  const [apartments, setApartments]   = useState({});
  const [lodges, setLodges]           = useState({});
  const [filter, setFilter]           = useState('all');
  const [selTicket, setSelTicket]     = useState(null);
  const [msg, setMsg]                 = useState('');
  const [closing, setClosing]         = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    // Load landlord codes for name lookup
    const u1 = onValue(ref(db, 'landlordCodes'), snap => {
      const data = snap.val() || {};
      const map = {};
      Object.values(data).forEach(l => { if (l.landlordId) map[l.landlordId] = l; });
      setLandlords(map);
    });

    // Load ALL tickets — nested as tickets/{landlordId}/{ticketId}
    const u2 = onValue(ref(db, 'tickets'), snap => {
      const raw = snap.val();
      if (!raw) { setAllTickets([]); return; }
      const flat = [];
      Object.entries(raw).forEach(([lid, landlordTickets]) => {
        if (!landlordTickets || typeof landlordTickets !== 'object') return;
        Object.entries(landlordTickets).forEach(([tid, t]) => {
          if (!t || typeof t !== 'object') return;
          flat.push({ id: tid, landlordId: lid, ...t });
        });
      });
      setAllTickets(flat.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    });

    // Load all apartments for context
    const u3 = onValue(ref(db, 'apartments'), snap => {
      setApartments(snap.val() || {});
    });

    // Load all lodges for context
    const u4 = onValue(ref(db, 'lodges'), snap => {
      setLodges(snap.val() || {});
    });

    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  useEffect(() => {
    if (selTicket) setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior:'smooth' }), 80);
  }, [selTicket, allTickets]);

  const sendMessage = useCallback(async () => {
    const text = sanitize(msg, 1000);
    if (!text || !selTicket) return;
    const msgRef = push(ref(db, `tickets/${selTicket.landlordId}/${selTicket.id}/messages`));
    await set(msgRef, { from:'admin', text, timestamp:new Date().toISOString() });
    setMsg('');
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior:'smooth' }), 100);
  }, [msg, selTicket]);

  const closeTicket = useCallback(async () => {
    if (!selTicket) return;
    setClosing(true);
    await update(ref(db, `tickets/${selTicket.landlordId}/${selTicket.id}`), { status:'closed', closedAt:new Date().toISOString() });
    // Update hasOpenTicket on apartment
    if (selTicket.aptId) {
      const remaining = allTickets.filter(t => t.id!==selTicket.id && t.aptId===selTicket.aptId && t.landlordId===selTicket.landlordId && t.status==='open');
      if (!remaining.length) await update(ref(db, `apartments/${selTicket.landlordId}/${selTicket.aptId}`), { hasOpenTicket:false });
    }
    setClosing(false);
  }, [selTicket, allTickets]);

  const openCount = allTickets.filter(t => t.status === 'open').length;
  const filtered  = allTickets.filter(t => filter==='all' || t.status===filter);

  // Live-update selTicket from allTickets
  const liveTicket = selTicket ? allTickets.find(t => t.id===selTicket.id && t.landlordId===selTicket.landlordId) : null;

  // ── Thread view ──────────────────────────────────────────────────────────
  if (liveTicket) {
    const t = liveTicket;
    const landlord = landlords[t.landlordId];
    const apt      = apartments[t.landlordId]?.[t.aptId];
    const lodge    = apt?.lodgeId ? lodges[t.landlordId]?.[apt.lodgeId] : null;
    const messages = t.messages ? Object.values(t.messages).sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp)) : [];

    return (
      <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.5rem' }}>
          <button onClick={()=>setSelTicket(null)} className="btn btn-ghost btn-sm">
            <i className="fas fa-arrow-left" style={{ fontSize:'0.7rem' }}></i>All Tickets
          </button>
          <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
            {t.status==='open' && (
              <button onClick={closeTicket} disabled={closing} className="btn btn-ghost btn-sm"
                style={{ color:'var(--green)', borderColor:'rgba(21,128,61,0.3)', opacity:closing?0.6:1 }}>
                <i className="fas fa-check-circle" style={{ fontSize:'0.65rem' }}></i>
                {closing?'Closing…':'Close Ticket'}
              </button>
            )}
            <StatusBadge status={t.status} />
          </div>
        </div>

        {/* Ticket info */}
        <div className="admin-card" style={{ padding:'1.125rem 1.375rem' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'0.75rem', flexWrap:'wrap' }}>
            <div style={{ minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.25rem', flexWrap:'wrap' }}>
                {lodge && <span style={{ fontSize:'0.7rem', fontWeight:700, color:'var(--violet)' }}>{lodge.name}</span>}
                {apt && <span style={{ fontSize:'0.7rem', color:'var(--text-3)' }}>· {apt.number}</span>}
                {t.tenantName && <span style={{ fontSize:'0.7rem', color:'var(--text-3)' }}>· {t.tenantName}</span>}
                {landlord && <span style={{ fontSize:'0.7rem', color:'var(--text-2)', fontWeight:600 }}>· {landlord.name}</span>}
              </div>
              <h2 style={{ fontWeight:800, fontSize:'1rem', color:'var(--text)', margin:'0 0 0.25rem' }}>{t.title}</h2>
              <p style={{ color:'var(--text-2)', fontSize:'0.8125rem', margin:0, lineHeight:1.5 }}>{t.description}</p>
            </div>
          </div>
          {t.image && <img src={t.image} alt="Complaint" style={{ marginTop:'0.75rem', width:'100%', maxHeight:'200px', objectFit:'cover', borderRadius:'0.625rem', border:'1px solid var(--border)' }} />}
        </div>

        {/* Chat — fixed height scrollable box */}
        <div className="admin-card" style={{ padding:'1rem' }}>
          <div style={{ height:'min(50vh, 400px)', overflowY:'auto', display:'flex', flexDirection:'column', gap:'0.75rem', paddingBottom:'0.5rem', marginBottom:'0.75rem' }}>
            {messages.length===0 && <p style={{ color:'var(--text-3)', fontSize:'0.875rem', textAlign:'center', padding:'2rem 0' }}>No messages yet — start the conversation below.</p>}
            {messages.map((m,i) => <ChatBubble key={i} msg={m} />)}
            <div ref={chatEndRef} />
          </div>
          {t.status==='open' && (
            <div style={{ display:'flex', gap:'0.5rem', borderTop:'1px solid var(--border)', paddingTop:'0.75rem' }}>
              <input value={msg} onChange={e=>setMsg(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&sendMessage()}
                placeholder="Message as admin…"
                className="lm-input" style={{ flex:1 }} />
              <button onClick={sendMessage} disabled={!msg.trim()}
                style={{ width:'2.75rem', height:'2.75rem', borderRadius:'0.75rem', background:'#4f46e5', color:'white', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, opacity:!msg.trim()?0.4:1 }}>
                <i className="fas fa-paper-plane" style={{ fontSize:'0.75rem' }}></i>
              </button>
            </div>
          )}
          {t.status==='closed' && (
            <div style={{ borderTop:'1px solid var(--border)', paddingTop:'0.75rem', display:'flex', alignItems:'center', gap:'0.5rem' }}>
              <i className="fas fa-check-circle" style={{ color:'var(--green)' }}></i>
              <p style={{ color:'var(--green)', fontWeight:600, fontSize:'0.875rem', margin:0 }}>
                Resolved {t.closedAt ? new Date(t.closedAt).toLocaleDateString('en-NG') : ''}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Ticket list ────────────────────────────────────────────────────────────
  return (
    <div>
      <SectionHead icon="fa-ticket-alt" label="Tickets" title="All Complaints"
        subtitle={`${openCount} open · ${allTickets.length - openCount} resolved`} />

      <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1.5rem', flexWrap:'wrap' }}>
        {['all','open','closed'].map(f => (
          <button key={f} onClick={()=>setFilter(f)}
            style={{ padding:'0.375rem 1rem', borderRadius:'9999px', border:'1.5px solid', cursor:'pointer', fontFamily:'inherit', fontSize:'0.8125rem', fontWeight:700, transition:'all 0.15s',
              background:filter===f?'var(--violet)':'transparent',
              borderColor:filter===f?'var(--violet)':'var(--border-2)',
              color:filter===f?'white':'var(--text-2)' }}>
            {f==='all'?`All (${allTickets.length})`:f==='open'?`Open (${openCount})`:`Resolved (${allTickets.length-openCount})`}
          </button>
        ))}
      </div>

      {filtered.length===0 ? (
        <div className="admin-card" style={{ padding:'3rem', textAlign:'center' }}>
          <i className="fas fa-clipboard-check" style={{ fontSize:'2rem', color:'var(--text-3)', display:'block', marginBottom:'0.75rem' }}></i>
          <p style={{ fontWeight:700, color:'var(--text-2)', margin:'0 0 0.25rem' }}>No tickets yet</p>
          <p style={{ color:'var(--text-3)', fontSize:'0.875rem', margin:0 }}>Tenant complaints will appear here in real-time</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'0.625rem' }}>
          {filtered.map(t => {
            const landlord = landlords[t.landlordId];
            const apt      = apartments[t.landlordId]?.[t.aptId];
            const lodge    = apt?.lodgeId ? lodges[t.landlordId]?.[apt.lodgeId] : null;
            const msgCount = t.messages ? Object.keys(t.messages).length : 0;
            return (
              <button key={`${t.landlordId}__${t.id}`} onClick={()=>setSelTicket(t)}
                className="admin-card"
                style={{ padding:'1rem 1.25rem', cursor:'pointer', textAlign:'left', width:'100%', border:t.status==='open'?'1px solid rgba(239,68,68,0.2)':undefined, display:'flex', justifyContent:'space-between', alignItems:'center', gap:'1rem' }}
                onMouseEnter={e=>e.currentTarget.style.transform='translateY(-1px)'}
                onMouseLeave={e=>e.currentTarget.style.transform='none'}>
                <div style={{ minWidth:0, flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.25rem' }}>
                    {t.status==='open' && <span style={{ width:'7px', height:'7px', borderRadius:'9999px', background:'#ef4444', flexShrink:0, animation:'breathe 1.5s ease-in-out infinite' }} />}
                    <p style={{ fontWeight:700, color:'var(--text)', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.title || '(no title)'}</p>
                  </div>
                  <p style={{ color:'var(--text-3)', fontSize:'0.75rem', margin:0 }}>
                    {landlord?.name||'?'}{lodge?` · ${lodge.name}`:''}{apt?` · ${apt.number}`:''}{t.tenantName?` · ${t.tenantName}`:''} · {msgCount} msg{msgCount!==1?'s':''}{t.image?' · 📷':''}
                  </p>
                  <p style={{ color:'var(--text-3)', fontSize:'0.7rem', margin:'0.125rem 0 0' }}>{new Date(t.createdAt).toLocaleDateString('en-NG')}</p>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', flexShrink:0 }}>
                  <StatusBadge status={t.status} />
                  <i className="fas fa-chevron-right" style={{ color:'var(--text-3)', fontSize:'0.65rem' }}></i>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Properties Section ────────────────────────────────────────────────────────
function PropertiesSection({ properties, onSave, onDelete, onEdit, onToggleFeatured, onToggleAvailable, onOpenLightbox }) {
  const [search, setSearch] = useState('');
  const filtered = properties.filter(p =>
    !search || p.title?.toLowerCase().includes(search.toLowerCase()) || p.location?.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div>
      <SectionHead icon="fa-home" label="Properties" title="Manage Listings" subtitle={`${properties.length} total`} />
      <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1.1fr) minmax(0,1fr)', gap:'1.5rem', alignItems:'start' }} className="admin-grid">
        <div className="admin-card" style={{ padding:'1.75rem' }}>
          <h3 style={{ fontWeight:800, fontSize:'1.0625rem', color:'var(--text)', margin:'0 0 1.25rem' }}>Add New Listing</h3>
          <AdminForm onSave={onSave} />
        </div>
        <div className="admin-card" style={{ padding:'1.5rem' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem', gap:'0.75rem', flexWrap:'wrap' }}>
            <h3 style={{ fontWeight:800, fontSize:'1.0625rem', color:'var(--text)', margin:0 }}>Listings ({properties.length})</h3>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…"
              style={{ padding:'0.4rem 0.75rem', borderRadius:'0.75rem', border:'1.5px solid var(--border-2)', background:'var(--bg-3)', color:'var(--text)', fontFamily:'inherit', fontSize:'0.8125rem', outline:'none', width:'10rem' }} />
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem', maxHeight:'640px', overflowY:'auto' }}>
            {filtered.length===0 ? (
              <div style={{ textAlign:'center', padding:'3.5rem 1rem' }}>
                <i className="fas fa-home" style={{ fontSize:'2rem', color:'var(--text-3)', display:'block', marginBottom:'0.75rem' }}></i>
                <p style={{ color:'var(--text-2)', fontWeight:600, margin:0 }}>{search?'No results':'No listings yet'}</p>
              </div>
            ) : filtered.map(p => (
              <div key={p.id} style={{ display:'flex', alignItems:'center', gap:'0.875rem', padding:'0.875rem', borderRadius:'0.875rem', border:'1px solid transparent', transition:'all 0.15s' }}
                onMouseEnter={e=>{e.currentTarget.style.background='var(--bg-3)';e.currentTarget.style.borderColor='var(--border)';}}
                onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.borderColor='transparent';}}>
                <img src={p.images[0]} alt={p.title} loading="lazy" onClick={()=>onOpenLightbox(p.images,0)}
                  style={{ width:'3.75rem', height:'3.75rem', objectFit:'cover', borderRadius:'0.625rem', flexShrink:0, cursor:'pointer', border:'1px solid var(--border)' }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'0.375rem', marginBottom:'0.2rem', flexWrap:'wrap' }}>
                    <p style={{ fontWeight:700, fontSize:'0.875rem', color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', margin:0 }}>{p.title}</p>
                    {p.featured && <span style={{ background:'rgba(251,191,36,0.12)', border:'1px solid rgba(251,191,36,0.35)', color:'#d97706', fontSize:'0.6rem', fontWeight:700, padding:'0.1rem 0.4rem', borderRadius:'9999px' }}>★ Featured</span>}
                  </div>
                  {p.location && <p style={{ fontSize:'0.75rem', color:'var(--violet)', fontWeight:600, margin:'0 0 0.2rem' }}><i className="fas fa-map-marker-alt" style={{ fontSize:'0.55rem', marginRight:'0.25rem' }}></i>{p.location}</p>}
                  {p.price && <p style={{ fontSize:'0.75rem', color:'var(--text-2)', margin:0 }}>₦{Number(p.price).toLocaleString()}/yr</p>}
                </div>
                <div style={{ display:'flex', gap:'0.375rem', flexShrink:0, alignItems:'center', flexWrap:'wrap' }}>
                  <button onClick={()=>onToggleAvailable(p)}
                    style={{ display:'flex', alignItems:'center', gap:'0.3rem', padding:'0.25rem 0.625rem', borderRadius:'9999px', border:'1.5px solid', cursor:'pointer', fontSize:'0.6875rem', fontWeight:700, fontFamily:'inherit', transition:'all 0.15s', whiteSpace:'nowrap',
                      background:p.available===false?'rgba(239,68,68,0.08)':'rgba(22,163,74,0.08)',
                      borderColor:p.available===false?'rgba(239,68,68,0.35)':'rgba(22,163,74,0.35)',
                      color:p.available===false?'#ef4444':'#16a34a' }}>
                    <span style={{ width:'6px', height:'6px', borderRadius:'9999px', flexShrink:0, background:p.available===false?'#ef4444':'#22c55e' }} />
                    {p.available===false?'Not Available':'Available'}
                  </button>
                  <button className="icon-btn violet" onClick={()=>onEdit(p)} style={{ width:'2rem', height:'2rem' }}><i className="fas fa-pen" style={{ fontSize:'0.625rem' }}></i></button>
                  <button className={`icon-btn gold ${p.featured?'active':''}`} onClick={()=>onToggleFeatured(p)} style={{ width:'2rem', height:'2rem' }}><i className="fas fa-star" style={{ fontSize:'0.625rem' }}></i></button>
                  <button className="icon-btn red" onClick={()=>onDelete(p.id)} style={{ width:'2rem', height:'2rem' }}><i className="fas fa-trash" style={{ fontSize:'0.625rem' }}></i></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`@media(max-width:860px){.admin-grid{grid-template-columns:1fr!important;}}`}</style>
    </div>
  );
}

// ─── Landlords Section ─────────────────────────────────────────────────────────
function LandlordsSection() {
  const [codes, setCodes]         = useState([]);
  const [generating, setGenerating] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);
  const [revoking, setRevoking]   = useState(null);

  useEffect(() => {
    const unsub = onValue(ref(db, 'landlordCodes'), snap => {
      const data = snap.val() || {};
      setCodes(Object.keys(data).map(k=>({code:k,...data[k]})).sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0)));
    });
    return () => unsub();
  }, []);

  const createCode = async () => {
    setGenerating(true);
    const code = generateLandlordCode();
    const landlordId = push(ref(db,'apartments')).key;
    await set(ref(db,`landlordCodes/${code}`), { landlordId, code, createdAt:new Date().toISOString(), activated:false, revoked:false, name:'', email:'' });
    setGenerating(false);
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code).catch(()=>{});
    setCopiedCode(code);
    setTimeout(()=>setCopiedCode(null),2000);
  };

  const revokeCode = async (code) => {
    if (!confirm('Revoke this landlord code? They will lose access immediately.')) return;
    setRevoking(code);
    await update(ref(db,`landlordCodes/${code}`),{revoked:true});
    setRevoking(null);
  };

  const restoreCode = async (code) => {
    await update(ref(db,`landlordCodes/${code}`),{revoked:false});
  };

  return (
    <div>
      <SectionHead icon="fa-building" label="Landlords" title="Manage Landlords" subtitle={`${codes.filter(c=>!c.revoked).length} active · ${codes.filter(c=>c.revoked).length} revoked`} />
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'1.5rem' }}>
        <button onClick={createCode} disabled={generating} className="btn btn-primary" style={{ opacity:generating?0.6:1 }}>
          {generating?<><span className="spinner" style={{ marginRight:'0.5rem' }}></span>Generating…</>:<><i className="fas fa-plus"></i>Generate New Code</>}
        </button>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
        {codes.length===0 && (
          <div className="admin-card" style={{ padding:'3rem', textAlign:'center' }}>
            <i className="fas fa-building" style={{ fontSize:'2rem', color:'var(--text-3)', display:'block', marginBottom:'0.75rem' }}></i>
            <p style={{ fontWeight:700, color:'var(--text-2)', margin:'0 0 0.25rem' }}>No landlord codes yet</p>
            <p style={{ color:'var(--text-3)', fontSize:'0.875rem' }}>Click "Generate New Code" to create the first one</p>
          </div>
        )}
        {codes.map(c => (
          <div key={c.code} className="admin-card" style={{ padding:'1.25rem 1.5rem', opacity:c.revoked?0.65:1, borderColor:c.revoked?'rgba(239,68,68,0.2)':undefined }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'1rem', flexWrap:'wrap' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'1rem', flexWrap:'wrap' }}>
                <div style={{ background:'var(--bg-3)', border:'1px solid var(--border)', borderRadius:'0.75rem', padding:'0.5rem 1rem' }}>
                  <p style={{ fontFamily:'monospace', fontWeight:800, fontSize:'1.1rem', color:c.revoked?'#ef4444':'var(--text)', margin:0, letterSpacing:'0.15em' }}>{formatLandlordCode(c.code)}</p>
                </div>
                <div>
                  {c.name ? <>
                    <p style={{ fontWeight:700, color:'var(--text)', margin:'0 0 0.125rem', fontSize:'0.9375rem' }}>{c.name}</p>
                    <p style={{ color:'var(--text-2)', fontSize:'0.8125rem', margin:0 }}>{c.email}</p>
                  </> : <p style={{ color:'var(--text-3)', fontSize:'0.875rem', margin:0, fontStyle:'italic' }}>Not activated yet</p>}
                  <p style={{ fontSize:'0.75rem', color:'var(--text-3)', margin:'0.25rem 0 0' }}>Created {new Date(c.createdAt).toLocaleDateString('en-NG')}{c.lastLogin&&` · Last login ${new Date(c.lastLogin).toLocaleDateString('en-NG')}`}</p>
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'0.625rem', flexShrink:0 }}>
                <span style={{ display:'inline-flex', alignItems:'center', gap:'0.35rem', padding:'0.25rem 0.625rem', borderRadius:'9999px', fontSize:'0.6875rem', fontWeight:700,
                  background:c.revoked?'rgba(239,68,68,0.08)':c.activated?'rgba(21,128,61,0.08)':'rgba(251,191,36,0.08)',
                  border:`1px solid ${c.revoked?'rgba(239,68,68,0.25)':c.activated?'rgba(21,128,61,0.25)':'rgba(251,191,36,0.35)'}`,
                  color:c.revoked?'#ef4444':c.activated?'var(--green)':'#d97706' }}>
                  <span style={{ width:'5px', height:'5px', borderRadius:'9999px', background:c.revoked?'#ef4444':c.activated?'var(--green)':'#d97706' }} />
                  {c.revoked?'Revoked':c.activated?'Active':'Pending'}
                </span>
                <button onClick={()=>copyCode(c.code)} style={{ width:'2rem', height:'2rem', borderRadius:'0.5rem', background:'transparent', border:'1px solid var(--border-2)', color:'var(--text-2)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <i className={`fas ${copiedCode===c.code?'fa-check':'fa-copy'}`} style={{ fontSize:'0.65rem', color:copiedCode===c.code?'var(--green)':'inherit' }}></i>
                </button>
                {c.revoked
                  ? <button onClick={()=>restoreCode(c.code)} className="btn btn-ghost btn-sm" style={{ color:'var(--green)', borderColor:'rgba(21,128,61,0.3)' }}>Restore</button>
                  : <button onClick={()=>revokeCode(c.code)} disabled={revoking===c.code} className="btn btn-ghost btn-sm" style={{ color:'#ef4444', borderColor:'rgba(239,68,68,0.3)', opacity:revoking===c.code?0.6:1 }}>Revoke</button>
                }
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tenants Section ───────────────────────────────────────────────────────────
function TenantsSection() {
  const [tenants, setTenants]             = useState([]);
  const [allTenantRaw, setAllTenantRaw]   = useState({});
  const [landlords, setLandlords]         = useState({});
  const [apts, setApts]                   = useState({});
  const [search, setSearch]               = useState('');
  const [filterLandlord, setFilterLandlord] = useState('all');
  const [cleaning, setCleaning]           = useState(false);
  const [orphanCount, setOrphanCount]     = useState(0);

  useEffect(() => {
    const u1 = onValue(ref(db,'tenants'), snap => {
      const data = snap.val() || {};
      setAllTenantRaw(data);
      const latest = {};
      Object.keys(data).forEach(otp => {
        const t = data[otp];
        if (!t?.landlordId || !t?.aptId) return;
        const key = `${t.landlordId}__${t.aptId}`;
        if (!latest[key] || new Date(t.issuedAt)>new Date(latest[key].issuedAt)) latest[key]={otp,...t};
      });
      setTenants(Object.values(latest).sort((a,b)=>new Date(b.issuedAt||0)-new Date(a.issuedAt||0)));
    });
    const u2 = onValue(ref(db,'landlordCodes'), snap => {
      const data = snap.val() || {}; const map = {};
      Object.values(data).forEach(l=>{if(l.landlordId)map[l.landlordId]=l;});
      setLandlords(map);
    });
    return ()=>{u1();u2();};
  },[]);

  useEffect(() => {
    if (!tenants.length) return;
    const ids=[...new Set(tenants.map(t=>t.landlordId).filter(Boolean))];
    const unsubs=ids.map(lid=>onValue(ref(db,`apartments/${lid}`),snap=>{
      setApts(prev=>({...prev,[lid]:snap.val()||{}}));
    }));
    return ()=>unsubs.forEach(u=>u());
  },[tenants]);

  useEffect(() => {
    if (!Object.keys(allTenantRaw).length||!Object.keys(apts).length) return;
    let count=0;
    Object.keys(allTenantRaw).forEach(otp=>{
      const t=allTenantRaw[otp];
      if(!t?.landlordId||!t?.aptId){count++;return;}
      if(!apts[t.landlordId]?.[t.aptId])count++;
    });
    setOrphanCount(count);
  },[allTenantRaw,apts]);

  const cleanOrphans = async () => {
    if (!confirm(`Delete ${orphanCount} orphaned OTP record${orphanCount!==1?'s':''}?`)) return;
    setCleaning(true);
    const dels=[];
    Object.keys(allTenantRaw).forEach(otp=>{
      const t=allTenantRaw[otp];
      if(!t?.landlordId||!t?.aptId){dels.push(remove(ref(db,`tenants/${otp}`)));return;}
      if(!apts[t.landlordId]?.[t.aptId])dels.push(remove(ref(db,`tenants/${otp}`)));
    });
    await Promise.all(dels);
    setCleaning(false);
  };

  const landlordOptions=Object.values(landlords).filter(l=>l.activated&&!l.revoked);
  const filtered=tenants.filter(t=>{
    const ll=landlords[t.landlordId]; const apt=apts[t.landlordId]?.[t.aptId];
    const s=search.toLowerCase();
    return (!search||t.tenantName?.toLowerCase().includes(s)||t.otp?.toLowerCase().includes(s)||apt?.number?.toLowerCase().includes(s)||ll?.name?.toLowerCase().includes(s))
      &&(filterLandlord==='all'||t.landlordId===filterLandlord);
  });
  const active=tenants.filter(t=>t.tenantName&&new Date(t.expiresAt)>new Date()).length;
  const pending=tenants.filter(t=>!t.tenantName).length;
  const expired=tenants.filter(t=>t.tenantName&&new Date(t.expiresAt)<=new Date()).length;

  return (
    <div>
      <SectionHead icon="fa-users" label="Tenants" title="All Tenants" subtitle={`${active} active · ${pending} pending · ${expired} expired`} />
      {orphanCount>0&&(
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'1rem', flexWrap:'wrap', background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:'0.875rem', padding:'0.875rem 1.125rem', marginBottom:'1.25rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'0.625rem' }}>
            <i className="fas fa-exclamation-triangle" style={{ color:'#ef4444', fontSize:'0.9rem' }}></i>
            <div>
              <p style={{ fontWeight:700, color:'var(--text)', margin:'0 0 0.125rem', fontSize:'0.875rem' }}>{orphanCount} orphaned OTP{orphanCount!==1?'s':''} — apartment deleted but OTP still works</p>
              <p style={{ color:'var(--text-2)', fontSize:'0.8125rem', margin:0 }}>Clean up to invalidate these codes immediately.</p>
            </div>
          </div>
          <button onClick={cleanOrphans} disabled={cleaning} style={{ padding:'0.5rem 1rem', borderRadius:'0.75rem', border:'none', background:'#ef4444', color:'white', fontFamily:'inherit', fontSize:'0.8125rem', fontWeight:700, cursor:'pointer', opacity:cleaning?0.6:1 }}>
            {cleaning?'Cleaning…':'Clean Up'}
          </button>
        </div>
      )}
      <div style={{ display:'flex', gap:'0.75rem', marginBottom:'1.5rem', flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:1, minWidth:'200px' }}>
          <i className="fas fa-search" style={{ position:'absolute', left:'0.875rem', top:'50%', transform:'translateY(-50%)', color:'var(--text-3)', fontSize:'0.8rem' }}></i>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name, OTP, apartment…"
            style={{ width:'100%', paddingLeft:'2.25rem', height:'2.625rem', borderRadius:'0.875rem', border:'1.5px solid var(--border-2)', background:'var(--bg-3)', color:'var(--text)', fontFamily:'inherit', fontSize:'0.875rem', outline:'none', boxSizing:'border-box' }} />
        </div>
        <select value={filterLandlord} onChange={e=>setFilterLandlord(e.target.value)}
          style={{ height:'2.625rem', padding:'0 1rem', borderRadius:'0.875rem', border:'1.5px solid var(--border-2)', background:'var(--bg-3)', color:'var(--text)', fontFamily:'inherit', fontSize:'0.875rem', cursor:'pointer' }}>
          <option value="all">All Landlords</option>
          {landlordOptions.map(l=><option key={l.landlordId} value={l.landlordId}>{l.name}</option>)}
        </select>
      </div>
      {filtered.length===0?(
        <div className="admin-card" style={{ padding:'3rem', textAlign:'center' }}>
          <i className="fas fa-users" style={{ fontSize:'2rem', color:'var(--text-3)', display:'block', marginBottom:'0.75rem' }}></i>
          <p style={{ fontWeight:700, color:'var(--text-2)', margin:'0 0 0.25rem' }}>{search||filterLandlord!=='all'?'No results':'No tenants yet'}</p>
        </div>
      ):(()=>{
        const grouped={};
        filtered.forEach(t=>{const lid=t.landlordId||'unknown';if(!grouped[lid])grouped[lid]=[];grouped[lid].push(t);});
        return Object.keys(grouped).map(lid=>{
          const ll=landlords[lid]; const group=grouped[lid];
          return (
            <div key={lid} style={{ marginBottom:'1.5rem' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'0.625rem', marginBottom:'0.75rem' }}>
                <div style={{ width:'2rem', height:'2rem', borderRadius:'0.625rem', background:'var(--violet)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <i className="fas fa-building" style={{ fontSize:'0.75rem', color:'white' }}></i>
                </div>
                <div>
                  <p style={{ fontWeight:800, color:'var(--text)', margin:0 }}>{ll?.name||'Unknown Landlord'}</p>
                  <p style={{ fontSize:'0.75rem', color:'var(--text-3)', margin:0 }}>{ll?.email||''} · {group.length} tenant{group.length!==1?'s':''}</p>
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem', paddingLeft:'0.5rem' }}>
                {group.map(t=>{
                  const apt=apts[t.landlordId]?.[t.aptId];
                  const isOrphan=!apt;
                  const isActive=!isOrphan&&t.tenantName&&new Date(t.expiresAt)>new Date();
                  const isExpired=!isOrphan&&t.tenantName&&new Date(t.expiresAt)<=new Date();
                  const color=isOrphan?'#ef4444':!t.tenantName?'#d97706':isExpired?'#ef4444':'var(--green)';
                  const label=isOrphan?'Orphaned':!t.tenantName?'Pending':isExpired?'Expired':'Active';
                  return (
                    <div key={t.otp} className="admin-card" style={{ padding:'1rem 1.25rem', display:'flex', justifyContent:'space-between', alignItems:'center', gap:'1rem', flexWrap:'wrap', opacity:isOrphan?0.8:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'0.875rem' }}>
                        <div style={{ width:'2.25rem', height:'2.25rem', borderRadius:'0.625rem', background:isActive?'rgba(21,128,61,0.1)':isOrphan?'rgba(239,68,68,0.08)':'var(--bg-3)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <i className={`fas ${isOrphan?'fa-unlink':'fa-user'}`} style={{ fontSize:'0.8rem', color:isActive?'var(--green)':isOrphan?'#ef4444':'var(--text-3)' }}></i>
                        </div>
                        <div>
                          <p style={{ fontWeight:700, color:isOrphan?'#ef4444':'var(--text)', margin:'0 0 0.125rem' }}>
                            {t.tenantName||<span style={{ color:'var(--text-3)', fontStyle:'italic', fontWeight:400 }}>Not logged in yet</span>}
                          </p>
                          <p style={{ fontSize:'0.75rem', color:'var(--text-3)', margin:0, display:'flex', alignItems:'center', gap:'0.375rem', flexWrap:'wrap' }}>
                            <span style={{ fontFamily:'monospace', fontWeight:600, background:'var(--bg-3)', padding:'0 0.25rem', borderRadius:'0.25rem' }}>{t.otp}</span>
                            {isOrphan?<span style={{ color:'#ef4444', fontWeight:600 }}>· Apartment deleted</span>:apt&&<span>· {apt.number}</span>}
                            {!isOrphan&&<span style={{ color:isExpired?'#ef4444':'var(--text-3)' }}>· {isExpired?'Expired':'Expires'} {new Date(t.expiresAt).toLocaleDateString('en-NG')}</span>}
                          </p>
                        </div>
                      </div>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:'0.35rem', padding:'0.25rem 0.625rem', borderRadius:'9999px', fontSize:'0.6875rem', fontWeight:700, flexShrink:0,
                        background:isOrphan?'rgba(239,68,68,0.08)':!t.tenantName?'rgba(251,191,36,0.08)':isExpired?'rgba(239,68,68,0.08)':'rgba(21,128,61,0.08)',
                        border:`1px solid ${isOrphan?'rgba(239,68,68,0.25)':!t.tenantName?'rgba(251,191,36,0.3)':isExpired?'rgba(239,68,68,0.25)':'rgba(21,128,61,0.25)'}`,
                        color }}>
                        <span style={{ width:'5px', height:'5px', borderRadius:'9999px', background:color }} />{label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        });
      })()}
    </div>
  );
}

// ─── Metrics Section ───────────────────────────────────────────────────────────
function MetricsSection({ properties }) {
  const [landlordCount, setLandlordCount] = useState(0);
  const [tenantCount, setTenantCount]     = useState(0);
  const [aptCount, setAptCount]           = useState(0);
  const [lodgeCount, setLodgeCount]       = useState(0);
  const [ticketStats, setTicketStats]     = useState({ open:0, closed:0 });

  useEffect(() => {
    const u1=onValue(ref(db,'landlordCodes'),s=>{const d=s.val()||{};setLandlordCount(Object.values(d).filter(l=>l.activated&&!l.revoked).length);});
    const u2=onValue(ref(db,'tenants'),s=>{
      const d=s.val()||{};
      const seen=new Set();
      let count=0;
      Object.values(d).forEach(t=>{
        if(!t?.landlordId||!t?.aptId||!t?.tenantName)return;
        const k=`${t.landlordId}__${t.aptId}`;
        if(!seen.has(k)){seen.add(k);count++;}
      });
      setTenantCount(count);
    });
    const u3=onValue(ref(db,'apartments'),s=>{const d=s.val()||{};let c=0;Object.values(d).forEach(l=>{if(typeof l==='object')c+=Object.keys(l).length;});setAptCount(c);});
    const u4=onValue(ref(db,'tickets'),s=>{
      const d=s.val()||{};let open=0,closed=0;
      Object.values(d).forEach(lt=>{
        if(!lt||typeof lt!=='object')return;
        Object.values(lt).forEach(t=>{if(!t||typeof t!=='object'||!t.status)return;if(t.status==='open')open++;else closed++;});
      });
      setTicketStats({open,closed});
    });
    const u5=onValue(ref(db,'lodges'),s=>{const d=s.val()||{};let c=0;Object.values(d).forEach(l=>{if(typeof l==='object')c+=Object.keys(l).length;});setLodgeCount(c);});
    return()=>{u1();u2();u3();u4();u5();};
  },[]);

  const available=properties.filter(p=>p.available!==false).length;
  const stats=[
    {label:'Active Landlords',   value:landlordCount,       icon:'fa-building',          color:'var(--violet)'},
    {label:'Houses / Buildings', value:lodgeCount,          icon:'fa-city',               color:'#8b5cf6'},
    {label:'Active Tenants',     value:tenantCount,         icon:'fa-users',              color:'var(--green)'},
    {label:'Total Apartments',   value:aptCount,            icon:'fa-door-open',          color:'#0ea5e9'},
    {label:'Listings',           value:properties.length,   icon:'fa-home',               color:'#f59e0b'},
    {label:'Available Now',      value:available,           icon:'fa-check-circle',       color:'var(--green)'},
    {label:'Open Complaints',    value:ticketStats.open,    icon:'fa-exclamation-circle', color:'#ef4444'},
    {label:'Resolved Tickets',   value:ticketStats.closed,  icon:'fa-clipboard-check',    color:'#6366f1'},
  ];
  return (
    <div>
      <SectionHead icon="fa-chart-line" label="Metrics" title="Growth & Overview" subtitle="Live snapshot of the LodgeMate ecosystem" />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:'1rem' }}>
        {stats.map(s=>(
          <div key={s.label} className="admin-card" style={{ padding:'1.25rem 1.5rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'0.75rem' }}>
              <div style={{ width:'2.25rem', height:'2.25rem', borderRadius:'0.625rem', background:`${s.color}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <i className={`fas ${s.icon}`} style={{ fontSize:'0.875rem', color:s.color }}></i>
              </div>
              <p style={{ fontSize:'0.8rem', color:'var(--text-2)', margin:0, fontWeight:600, lineHeight:1.3 }}>{s.label}</p>
            </div>
            <p style={{ fontWeight:900, fontSize:'2rem', color:'var(--text)', margin:0, letterSpacing:'-0.04em' }}>{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Field wrapper — must be OUTSIDE AdminForm to prevent remount on keystroke ─
function Field({ label, optional, children }) {
  return (
    <div>
      <label className="lm-label">
        {label}
        {optional && <span style={{ fontWeight:400, color:'var(--text-3)', marginLeft:'0.35rem' }}>(optional)</span>}
      </label>
      {children}
    </div>
  );
}

// ─── AdminForm ─────────────────────────────────────────────────────────────────
function AdminForm({ onSave }) {
  const [form, setForm] = useState({ title:'', location:'', description:'', price:'', videoLink:'', images:[], whatsappNumber:'+234' });
  const [saving, setSaving] = useState(false);
  const setF = useCallback((k,v)=>setForm(p=>({...p,[k]:v})),[]);

  const onFiles = useCallback((e) => {
    Array.from(e.target.files).forEach(file => {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)){alert(`"${file.name}" not allowed.`);return;}
      if (file.size>MAX_IMAGE_SIZE_MB*1024*1024){alert(`"${file.name}" too large.`);return;}
      const reader=new FileReader();
      reader.onload=ev=>{
        const r=ev.target.result;
        if(!r.startsWith('data:image/')){alert(`"${file.name}" not a valid image.`);return;}
        compressImage(r,1024,768,0.65).then(c=>setForm(p=>p.images.length>=10?p:{...p,images:[...p.images,c]}));
      };
      reader.readAsDataURL(file);
    });
  },[]);

  const removeImg=useCallback(i=>setForm(p=>({...p,images:p.images.filter((_,j)=>j!==i)})),[]);

  const submit=async e=>{
    e.preventDefault();
    const err=validatePropertyForm(form);
    if(err){alert(err);return;}
    try{setSaving(true);await onSave(form);setForm({title:'',location:'',description:'',price:'',videoLink:'',images:[],whatsappNumber:'+234'});alert('Property added!');}
    catch(err){alert('Error: '+err.message);}
    finally{setSaving(false);}
  };

  return (
    <form onSubmit={submit} style={{ display:'flex',flexDirection:'column',gap:'1rem' }}>
      <div className="admin-form-grid">
        <div style={{ gridColumn:'1/-1' }}><Field label="Property Title *"><input type="text" value={form.title} onChange={e=>setF('title',e.target.value)} className="lm-input" placeholder="e.g. 3-Bed Flat, Gidan-Mango" /></Field></div>
        <Field label="📍 Location *"><input type="text" value={form.location} onChange={e=>setF('location',e.target.value)} className="lm-input" placeholder="Gidan-Mango, Minna" /></Field>
        <Field label="💰 Price (₦/year)" optional><input type="number" value={form.price} onChange={e=>setF('price',e.target.value)} className="lm-input" placeholder="500000" /></Field>
      </div>
      <Field label="📝 Description *">
        <textarea value={form.description} onChange={e=>setF('description',e.target.value)} maxLength={300} rows={4} className="lm-textarea" placeholder="Describe the property…" />
        <p style={{ fontSize:'0.75rem',color:form.description.length>270?'#ef4444':'var(--text-3)',marginTop:'0.25rem',textAlign:'right' }}>{form.description.length}/300</p>
      </Field>
      <div className="admin-form-grid">
        <Field label="📱 WhatsApp Number *"><input type="tel" value={form.whatsappNumber} onChange={e=>setF('whatsappNumber',e.target.value)} className="lm-input" placeholder="+2348012345678" /></Field>
        <Field label="🎬 Video Tour URL" optional><input type="url" value={form.videoLink} onChange={e=>setF('videoLink',e.target.value)} className="lm-input" placeholder="https://youtube.com/…" /></Field>
      </div>
      <Field label="📸 Photos">
        <label style={{ display:'flex',alignItems:'center',gap:'0.5rem',padding:'0.75rem 1rem',borderRadius:'0.875rem',border:'2px dashed var(--border-2)',cursor:'pointer',background:'var(--bg-3)' }}
          onMouseEnter={e=>e.currentTarget.style.borderColor='var(--violet)'}
          onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border-2)'}>
          <i className="fas fa-cloud-upload-alt" style={{ color:'var(--violet)',fontSize:'1rem' }}></i>
          <span style={{ fontSize:'0.875rem',color:'var(--text-2)',fontWeight:500 }}>Upload photos (max 10)</span>
          <input type="file" multiple accept="image/*" onChange={onFiles} style={{ display:'none' }} />
        </label>
        {form.images.length>0&&(
          <div style={{ display:'flex',flexWrap:'wrap',gap:'0.5rem',marginTop:'0.75rem' }}>
            {form.images.map((img,i)=>(
              <div key={i} style={{ position:'relative' }}>
                <img src={img} alt="" style={{ width:'4rem',height:'4rem',objectFit:'cover',borderRadius:'0.5rem',border:'1px solid var(--border)' }} />
                <button type="button" onClick={()=>removeImg(i)}
                  style={{ position:'absolute',top:'-0.375rem',right:'-0.375rem',width:'1.25rem',height:'1.25rem',borderRadius:'9999px',background:'#ef4444',border:'none',color:'white',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.6rem' }}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
            ))}
          </div>
        )}
      </Field>
      <button type="submit" disabled={saving} className="btn btn-primary" style={{ height:'3rem',opacity:saving?0.6:1 }}>
        {saving?<><span className="spinner" style={{ marginRight:'0.5rem' }}></span>Adding…</>:<><i className="fas fa-plus"></i>Add Property</>}
      </button>
    </form>
  );
}

export default AdminPage;
