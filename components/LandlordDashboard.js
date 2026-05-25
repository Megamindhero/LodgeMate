'use client';
import { useState, useEffect, useCallback, memo, useRef } from 'react';
import { ref, onValue, push, set, update, remove, get } from 'firebase/database';
import { db } from '@/lib/firebase';
import { generateOTP, getOTPExpiry, formatExpiry, isOTPValid } from '@/lib/otp';
import { formatLandlordCode } from '@/lib/codes';
import Header from './Header';

function sanitize(str, maxLen = 200) {
  return String(str).replace(/<[^>]*>/g, '').replace(/[<>'"\\]/g, '').trim().slice(0, maxLen);
}

export default function LandlordDashboard({ landlordSession, darkMode, toggleDarkMode, onLogout, onOpenAdminLogin }) {
  const { code, landlordId, name } = landlordSession;

  const [lodges, setLodges]         = useState([]);       // houses/buildings
  const [apartments, setApartments] = useState([]);
  const [tickets, setTickets]       = useState([]);
  const [tenantNames, setTenantNames] = useState({});
  const [tab, setTab]               = useState('lodges'); // lodges | tickets | history
  const [selLodge, setSelLodge]     = useState(null);     // expanded lodge
  const [selTicket, setSelTicket]   = useState(null);
  const [viewTicket, setViewTicket] = useState(false);
  const [newLodgeName, setNewLodgeName] = useState('');
  const [addingLodge, setAddingLodge]   = useState(false);
  const [newAptName, setNewAptName] = useState('');
  const [addingApt, setAddingApt]   = useState(false);
  const [msg, setMsg]               = useState('');
  const [loading, setLoading]       = useState(true);
  const [copiedOtp, setCopiedOtp]   = useState(null);
  const [history, setHistory]       = useState([]);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const u1 = onValue(ref(db, `lodges/${landlordId}`), snap => {
      const data = snap.val() || {};
      setLodges(Object.keys(data).map(k => ({ id:k, ...data[k] })).sort((a,b) => new Date(a.createdAt)-new Date(b.createdAt)));
    });
    const u2 = onValue(ref(db, `apartments/${landlordId}`), snap => {
      const data = snap.val() || {};
      setApartments(Object.keys(data).map(k => ({ id:k, ...data[k] })));
      setLoading(false);
    });
    const u3 = onValue(ref(db, `tickets/${landlordId}`), snap => {
      const data = snap.val() || {};
      setTickets(Object.keys(data).map(k => ({ id:k, ...data[k] })).sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt)));
    });
    const u4 = onValue(ref(db, `ticketHistory/${landlordId}`), snap => {
      const data = snap.val() || {};
      setHistory(Object.keys(data).map(k => ({ id:k, ...data[k] })).sort((a,b) => new Date(b.deletedAt)-new Date(a.deletedAt)));
    });
    return () => { u1(); u2(); u3(); u4(); };
  }, [landlordId]);

  // Live tenant names
  useEffect(() => {
    if (!apartments.length) return;
    const unsubs = apartments.filter(a=>a.otp).map(a =>
      onValue(ref(db, `tenants/${a.otp}/tenantName`), snap => {
        setTenantNames(prev => ({ ...prev, [a.otp]: snap.val() || '' }));
      })
    );
    return () => unsubs.forEach(u=>u());
  }, [apartments]);

  // Auto-scroll chat
  useEffect(() => {
    if (viewTicket) setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior:'smooth' }), 80);
  }, [viewTicket, tickets]);

  const openTickets = tickets.filter(t => t.status === 'open');

  const addLodge = useCallback(async () => {
    const name = sanitize(newLodgeName, 100);
    if (!name || name.length < 2) return;
    setAddingLodge(true);
    const r = push(ref(db, `lodges/${landlordId}`));
    await set(r, { name, createdAt: new Date().toISOString() });
    setNewLodgeName('');
    setAddingLodge(false);
    setSelLodge(r.key);
  }, [newLodgeName, landlordId]);

  const deleteLodge = useCallback(async (lodgeId) => {
    const hasApts = apartments.some(a => a.lodgeId === lodgeId);
    if (hasApts) { alert('Remove all apartments from this house first.'); return; }
    if (!confirm('Delete this house?')) return;
    await remove(ref(db, `lodges/${landlordId}/${lodgeId}`));
    if (selLodge === lodgeId) setSelLodge(null);
  }, [apartments, landlordId, selLodge]);

  const addApartment = useCallback(async (lodgeId) => {
    const number = sanitize(newAptName, 80);
    if (!number || number.length < 1) return;
    setAddingApt(true);
    const r = push(ref(db, `apartments/${landlordId}`));
    await set(r, { number, lodgeId, createdAt: new Date().toISOString(), hasOpenTicket: false });
    setNewAptName('');
    setAddingApt(false);
  }, [newAptName, landlordId]);

  const generateAptOTP = useCallback(async (aptId) => {
    const apt = apartments.find(a => a.id === aptId);
    const hasExisting = !!apt?.otp;

    if (hasExisting) {
      const tenantName = apt.otp ? (tenantNames[apt.otp] || '') : '';
      const confirmed = confirm(
        `⚠️ Regenerate OTP for ${apt.number}?\n\n` +
        `${tenantName ? `Current tenant: ${tenantName}\n` : ''}` +
        `Current OTP: ${apt.otp}\n\n` +
        `This will invalidate the old code immediately. Only do this if the tenant has renewed/paid and needs a fresh code.\n\nProceed?`
      );
      if (!confirmed) return;
      // Delete old OTP record to avoid orphan tenant entries
      await remove(ref(db, `tenants/${apt.otp}`));
    }

    const otp = generateOTP(8);
    const expiry = getOTPExpiry();
    // Carry over existing tenant name if regenerating for same tenant
    const existingName = apt?.otp ? (tenantNames[apt.otp] || '') : '';
    await set(ref(db, `tenants/${otp}`), {
      landlordId,
      aptId,
      issuedAt:   new Date().toISOString(),
      expiresAt:  expiry,
      tenantName: existingName, // preserve name so it doesn't show as new tenant
    });
    await update(ref(db, `apartments/${landlordId}/${aptId}`), { otp, otpExpiry: expiry });
  }, [landlordId, apartments, tenantNames]);

  const copyOTP = useCallback((otp) => {
    navigator.clipboard.writeText(otp).catch(()=>{});
    setCopiedOtp(otp);
    setTimeout(() => setCopiedOtp(null), 2000);
  }, []);

  const deleteApartment = useCallback(async (aptId, otp) => {
    if (!confirm('Delete this apartment? Removes tenant OTP and all tickets.')) return;
    await remove(ref(db, `apartments/${landlordId}/${aptId}`));
    if (otp) await remove(ref(db, `tenants/${otp}`));
    const aptTickets = tickets.filter(t => t.aptId === aptId);
    await Promise.all(aptTickets.map(t => remove(ref(db, `tickets/${landlordId}/${t.id}`))));
  }, [landlordId, tickets]);

  const closeTicket = useCallback(async (ticketId, aptId) => {
    await update(ref(db, `tickets/${landlordId}/${ticketId}`), { status:'closed', closedAt: new Date().toISOString() });
    const remaining = tickets.filter(t => t.id!==ticketId && t.aptId===aptId && t.status==='open');
    if (!remaining.length) await update(ref(db, `apartments/${landlordId}/${aptId}`), { hasOpenTicket:false });
  }, [tickets, landlordId]);

  const deleteTicket = useCallback(async (ticket) => {
    if (!confirm(`Delete this ticket "${ticket.title}"? It will be archived in history but chats will be removed.`)) return;
    // Archive to history (no messages, just summary)
    const histRef = push(ref(db, `ticketHistory/${landlordId}`));
    await set(histRef, {
      title:       ticket.title,
      description: ticket.description,
      aptId:       ticket.aptId,
      tenantName:  ticket.tenantName || '',
      status:      ticket.status,
      createdAt:   ticket.createdAt,
      closedAt:    ticket.closedAt || null,
      deletedAt:   new Date().toISOString(),
      msgCount:    ticket.messages ? Object.keys(ticket.messages).length : 0,
    });
    await remove(ref(db, `tickets/${landlordId}/${ticket.id}`));
    if (ticket.aptId) {
      const remaining = tickets.filter(t => t.id!==ticket.id && t.aptId===ticket.aptId && t.status==='open');
      if (!remaining.length) await update(ref(db, `apartments/${landlordId}/${ticket.aptId}`), { hasOpenTicket:false });
    }
    if (viewTicket && selTicket === ticket.id) { setViewTicket(false); setSelTicket(null); }
  }, [tickets, landlordId, viewTicket, selTicket]);

  const sendMessage = useCallback(async (ticketId) => {
    const text = sanitize(msg, 1000);
    if (!text) return;
    const msgRef = push(ref(db, `tickets/${landlordId}/${ticketId}/messages`));
    await set(msgRef, { from:'landlord', text, timestamp:new Date().toISOString() });
    setMsg('');
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior:'smooth' }), 100);
  }, [msg, landlordId]);

  const handleLogout = () => { sessionStorage.removeItem('lm_landlord'); onLogout(); };

  // ── Ticket thread ──────────────────────────────────────────────────────────
  if (viewTicket && selTicket) {
    const t = tickets.find(t => t.id === selTicket);
    if (!t) { setViewTicket(false); return null; }
    const messages = t.messages ? Object.values(t.messages).sort((a,b) => new Date(a.timestamp)-new Date(b.timestamp)) : [];
    const apt = apartments.find(a => a.id === t.aptId);
    const lodge = lodges.find(l => l.id === apt?.lodgeId);

    return (
      <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', flexDirection:'column' }}>
        <Header currentPage="admin" darkMode={darkMode} toggleDarkMode={toggleDarkMode} onNavigateHome={handleLogout} onOpenAdminLogin={onOpenAdminLogin} />
        <div style={{ flex:1, maxWidth:'42rem', margin:'0 auto', padding:'1.5rem 1rem 2rem', width:'100%', display:'flex', flexDirection:'column', boxSizing:'border-box' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
            <button onClick={() => { setViewTicket(false); setSelTicket(null); }} className="btn btn-ghost btn-sm">
              <i className="fas fa-arrow-left" style={{ fontSize:'0.7rem' }}></i>Back
            </button>
            <button onClick={() => deleteTicket(t)} className="btn btn-ghost btn-sm" style={{ color:'#ef4444', borderColor:'rgba(239,68,68,0.3)' }}>
              <i className="fas fa-trash" style={{ fontSize:'0.65rem' }}></i>Delete
            </button>
          </div>

          <div className="admin-card" style={{ padding:'1.25rem', marginBottom:'0.75rem', flexShrink:0 }}>
            <div style={{ display:'flex', justifyContent:'space-between', gap:'0.75rem', flexWrap:'wrap' }}>
              <div style={{ minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.25rem', flexWrap:'wrap' }}>
                  {lodge && <span style={{ fontSize:'0.7rem', fontWeight:700, color:'var(--violet)' }}>{lodge.name}</span>}
                  {apt && <span style={{ fontSize:'0.7rem', color:'var(--text-3)' }}>· {apt.number}</span>}
                  {t.tenantName && <span style={{ fontSize:'0.7rem', color:'var(--text-3)' }}>· {t.tenantName}</span>}
                </div>
                <h2 style={{ fontWeight:800, fontSize:'1rem', color:'var(--text)', margin:'0 0 0.25rem' }}>{t.title}</h2>
                <p style={{ color:'var(--text-2)', fontSize:'0.8125rem', margin:0, lineHeight:1.5 }}>{t.description}</p>
              </div>
              <StatusBadge status={t.status} />
            </div>
            {t.image && <img src={t.image} alt="Complaint" style={{ marginTop:'0.75rem', width:'100%', maxHeight:'200px', objectFit:'cover', borderRadius:'0.625rem', border:'1px solid var(--border)' }} />}
          </div>

          <div className="admin-card" style={{ padding:'1rem', marginBottom:'0.75rem', display:'flex', flexDirection:'column', flex:1, minHeight:0, maxHeight:'55vh' }}>
            <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:'0.75rem', paddingBottom:'0.5rem' }}>
              {messages.length === 0 && <p style={{ color:'var(--text-3)', fontSize:'0.875rem', textAlign:'center', padding:'2rem 0' }}>No messages yet.</p>}
              {messages.map((m, i) => <ChatBubble key={i} msg={m} isOwn={m.from === 'landlord'} />)}
              <div ref={chatEndRef} />
            </div>
            {t.status === 'open' && (
              <div style={{ display:'flex', gap:'0.5rem', marginTop:'0.75rem', flexShrink:0, borderTop:'1px solid var(--border)', paddingTop:'0.75rem' }}>
                <input value={msg} onChange={e=>setMsg(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&sendMessage(t.id)}
                  placeholder="Reply to tenant…" className="lm-input" style={{ flex:1 }} />
                <button onClick={()=>sendMessage(t.id)} disabled={!msg.trim()}
                  style={{ width:'2.75rem', height:'2.75rem', borderRadius:'0.75rem', background:'var(--violet)', color:'white', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, opacity:!msg.trim()?0.4:1 }}>
                  <i className="fas fa-paper-plane" style={{ fontSize:'0.75rem' }}></i>
                </button>
              </div>
            )}
          </div>

          {t.status === 'open' && (
            <button onClick={() => closeTicket(t.id, t.aptId)} className="btn btn-ghost"
              style={{ width:'100%', borderColor:'rgba(21,128,61,0.3)', color:'var(--green)' }}>
              <i className="fas fa-check-circle"></i>Mark Resolved & Close
            </button>
          )}
          {t.status === 'closed' && (
            <div style={{ background:'rgba(21,128,61,0.06)', border:'1px solid rgba(21,128,61,0.2)', borderRadius:'0.875rem', padding:'0.75rem 1rem', display:'flex', alignItems:'center', gap:'0.5rem' }}>
              <i className="fas fa-check-circle" style={{ color:'var(--green)' }}></i>
              <p style={{ color:'var(--green)', fontWeight:600, fontSize:'0.875rem', margin:0 }}>Closed {t.closedAt ? new Date(t.closedAt).toLocaleDateString('en-NG') : ''}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Main dashboard ─────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
      <Header currentPage="admin" darkMode={darkMode} toggleDarkMode={toggleDarkMode} onNavigateHome={handleLogout} onOpenAdminLogin={onOpenAdminLogin} />
      <div style={{ maxWidth:'80rem', margin:'0 auto', padding:'1.5rem 1rem 5rem' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.5rem', flexWrap:'wrap', gap:'0.75rem' }}>
          <div>
            <div className="section-label"><i className="fas fa-building" style={{ fontSize:'0.65rem' }}></i>Landlord Portal</div>
            <h1 style={{ fontWeight:900, fontSize:'clamp(1.375rem,3vw,1.875rem)', letterSpacing:'-0.04em', color:'var(--text)', margin:'0 0 0.2rem' }}>{name || 'Dashboard'}</h1>
            <p style={{ fontSize:'0.8125rem', color:'var(--text-2)', margin:0 }}>
              {lodges.length} house{lodges.length!==1?'s':''} · {apartments.length} apt{apartments.length!==1?'s':''} · {openTickets.length} open ticket{openTickets.length!==1?'s':''}
              <span style={{ marginLeft:'0.625rem', fontFamily:'monospace', color:'var(--text-3)' }}>#{formatLandlordCode(code)}</span>
            </p>
          </div>
          <button onClick={handleLogout} className="btn btn-danger btn-sm"><i className="fas fa-sign-out-alt" style={{ fontSize:'0.7rem' }}></i>Sign Out</button>
        </div>

        {openTickets.length > 0 && (
          <div style={{ background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:'0.875rem', padding:'0.75rem 1rem', marginBottom:'1.25rem', display:'flex', alignItems:'center', gap:'0.625rem' }}>
            <span style={{ width:'9px', height:'9px', borderRadius:'9999px', background:'#ef4444', flexShrink:0, animation:'breathe 1.5s ease-in-out infinite' }} />
            <p style={{ fontSize:'0.875rem', color:'var(--text)', margin:0, fontWeight:600 }}>{openTickets.length} open complaint{openTickets.length!==1?'s':''} need attention</p>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display:'flex', gap:'0.375rem', marginBottom:'1.5rem', background:'var(--bg-3)', padding:'0.25rem', borderRadius:'0.875rem', width:'fit-content' }}>
          {[['lodges','fa-building','Houses'],['tickets','fa-ticket-alt','Complaints'],['history','fa-history','History']].map(([id,icon,label]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ display:'flex', alignItems:'center', gap:'0.4rem', padding:'0.5rem 0.875rem', borderRadius:'0.625rem', border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:'0.8125rem', fontWeight:700, transition:'all 0.15s',
                background:tab===id?'var(--bg-2)':'transparent', color:tab===id?'var(--text)':'var(--text-2)',
                boxShadow:tab===id?'var(--card-shadow)':'none' }}>
              <i className={`fas ${icon}`} style={{ fontSize:'0.7rem' }}></i>{label}
              {id==='tickets' && openTickets.length>0 && <span style={{ background:'#ef4444', color:'white', borderRadius:'9999px', fontSize:'0.6rem', fontWeight:800, padding:'0.05rem 0.375rem', minWidth:'1rem', textAlign:'center' }}>{openTickets.length}</span>}
            </button>
          ))}
        </div>

        {/* ── HOUSES TAB ── */}
        {tab === 'lodges' && (
          <div>
            {/* Add house */}
            <div className="admin-card" style={{ padding:'1.25rem', marginBottom:'1.25rem' }}>
              <h3 style={{ fontWeight:800, fontSize:'0.9375rem', color:'var(--text)', margin:'0 0 0.875rem' }}>Add a House / Building</h3>
              <div style={{ display:'flex', gap:'0.5rem' }}>
                <input value={newLodgeName} onChange={e=>setNewLodgeName(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&addLodge()}
                  placeholder="e.g. No. 12 Bosso Road, Gidan-Kwano Block B…" className="lm-input" style={{ flex:1 }} />
                <button onClick={addLodge} disabled={addingLodge||!newLodgeName.trim()} className="btn btn-primary" style={{ flexShrink:0, padding:'0 1.125rem', opacity:(addingLodge||!newLodgeName.trim())?0.6:1 }}>
                  {addingLodge ? <span className="spinner"></span> : <i className="fas fa-plus"></i>}
                </button>
              </div>
            </div>

            {loading ? <div style={{ textAlign:'center', padding:'3rem' }}><span className="spinner-dark"></span></div>
            : lodges.length === 0 ? (
              <div className="admin-card" style={{ padding:'3rem', textAlign:'center' }}>
                <i className="fas fa-building" style={{ fontSize:'2rem', color:'var(--text-3)', display:'block', marginBottom:'0.75rem' }}></i>
                <p style={{ fontWeight:700, color:'var(--text-2)', margin:'0 0 0.25rem' }}>No houses yet</p>
                <p style={{ color:'var(--text-3)', fontSize:'0.8125rem' }}>Add your first building above</p>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
                {lodges.map(lodge => {
                  const lodgeApts = apartments.filter(a => a.lodgeId === lodge.id);
                  const lodgeOpenTickets = tickets.filter(t => lodgeApts.some(a=>a.id===t.aptId) && t.status==='open').length;
                  const expanded = selLodge === lodge.id;
                  return (
                    <div key={lodge.id} className="admin-card" style={{ overflow:'hidden' }}>
                      {/* Lodge header */}
                      <div style={{ padding:'1.125rem 1.25rem', display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer' }}
                        onClick={() => setSelLodge(expanded ? null : lodge.id)}>
                        <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                          {lodgeOpenTickets > 0 && <span style={{ width:'9px', height:'9px', borderRadius:'9999px', background:'#ef4444', flexShrink:0, animation:'breathe 1.5s ease-in-out infinite' }} />}
                          <div>
                            <p style={{ fontWeight:800, color:'var(--text)', margin:'0 0 0.1rem', fontSize:'1rem' }}>{lodge.name}</p>
                            <p style={{ fontSize:'0.75rem', color:'var(--text-3)', margin:0 }}>
                              {lodgeApts.length} apartment{lodgeApts.length!==1?'s':''}
                              {lodgeOpenTickets>0 && <span style={{ color:'#ef4444', fontWeight:700 }}> · {lodgeOpenTickets} open issue{lodgeOpenTickets!==1?'s':''}</span>}
                            </p>
                          </div>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:'0.625rem' }}>
                          <button onClick={e=>{e.stopPropagation();deleteLodge(lodge.id);}} className="icon-btn red" style={{ width:'1.75rem', height:'1.75rem' }}>
                            <i className="fas fa-trash" style={{ fontSize:'0.5rem' }}></i>
                          </button>
                          <i className={`fas fa-chevron-${expanded?'up':'down'}`} style={{ color:'var(--text-3)', fontSize:'0.7rem' }}></i>
                        </div>
                      </div>

                      {/* Lodge content */}
                      {expanded && (
                        <div style={{ borderTop:'1px solid var(--border)', padding:'1.125rem 1.25rem' }}>
                          {/* Add apartment inside this lodge */}
                          <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1rem' }}>
                            <input value={newAptName} onChange={e=>setNewAptName(e.target.value)}
                              onKeyDown={e=>e.key==='Enter'&&addApartment(lodge.id)}
                              placeholder="Add apartment e.g. Room 1, Flat A…" className="lm-input" style={{ flex:1 }} />
                            <button onClick={()=>addApartment(lodge.id)} disabled={addingApt||!newAptName.trim()} className="btn btn-primary" style={{ flexShrink:0, padding:'0 1rem', opacity:(addingApt||!newAptName.trim())?0.6:1 }}>
                              {addingApt ? <span className="spinner"></span> : <i className="fas fa-plus"></i>}
                            </button>
                          </div>

                          {lodgeApts.length === 0 ? (
                            <p style={{ color:'var(--text-3)', fontSize:'0.8125rem', textAlign:'center', padding:'1rem 0' }}>No apartments yet in this building</p>
                          ) : (
                            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:'0.75rem' }}>
                              {lodgeApts.map(apt => (
                                <ApartmentCard key={apt.id} apt={apt} landlordId={landlordId}
                                  onGenerateOTP={generateAptOTP} onCopy={copyOTP} copiedOtp={copiedOtp}
                                  onDelete={deleteApartment} 
                                  tenantName={apt.otp ? (tenantNames[apt.otp]||'') : ''}
                                  openTicketCount={tickets.filter(t=>t.aptId===apt.id&&t.status==='open').length}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Apartments without a lodge */}
            {apartments.filter(a=>!a.lodgeId).length > 0 && (
              <div style={{ marginTop:'1.25rem' }}>
                <p style={{ fontSize:'0.75rem', fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.08em', margin:'0 0 0.75rem' }}>Unassigned Apartments</p>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:'0.75rem' }}>
                  {apartments.filter(a=>!a.lodgeId).map(apt => (
                    <ApartmentCard key={apt.id} apt={apt} landlordId={landlordId}
                      onGenerateOTP={generateAptOTP} onCopy={copyOTP} copiedOtp={copiedOtp}
                      onDelete={deleteApartment} 
                      tenantName={apt.otp?(tenantNames[apt.otp]||''):''}
                      openTicketCount={tickets.filter(t=>t.aptId===apt.id&&t.status==='open').length}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TICKETS TAB ── */}
        {tab === 'tickets' && (
          <div>
            {tickets.length === 0 ? (
              <div className="admin-card" style={{ padding:'3rem', textAlign:'center' }}>
                <i className="fas fa-clipboard-check" style={{ fontSize:'2rem', color:'var(--text-3)', display:'block', marginBottom:'0.75rem' }}></i>
                <p style={{ fontWeight:700, color:'var(--text-2)', margin:'0 0 0.25rem' }}>No complaints</p>
                <p style={{ color:'var(--text-3)', fontSize:'0.8125rem' }}>Tenants will appear here when they report an issue</p>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'0.625rem' }}>
                {[...tickets.filter(t=>t.status==='open'), ...tickets.filter(t=>t.status!=='open')].map(t => {
                  const apt = apartments.find(a => a.id===t.aptId);
                  const lodge = lodges.find(l => l.id===apt?.lodgeId);
                  const msgCount = t.messages ? Object.keys(t.messages).length : 0;
                  return (
                    <div key={t.id} className="admin-card" style={{ padding:'1rem 1.125rem', display:'flex', justifyContent:'space-between', alignItems:'center', gap:'0.75rem', flexWrap:'wrap' }}>
                      <button onClick={() => { setSelTicket(t.id); setViewTicket(true); }}
                        style={{ flex:1, minWidth:0, background:'none', border:'none', cursor:'pointer', textAlign:'left', padding:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.2rem' }}>
                          {t.status==='open' && <span style={{ width:'7px', height:'7px', borderRadius:'9999px', background:'#ef4444', flexShrink:0, animation:'breathe 1.5s ease-in-out infinite' }} />}
                          <p style={{ fontWeight:700, color:'var(--text)', margin:0, fontSize:'0.9rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.title}</p>
                        </div>
                        <p style={{ color:'var(--text-3)', fontSize:'0.75rem', margin:0 }}>
                          {lodge?.name && `${lodge.name} · `}{apt?.number || t.aptId} {t.tenantName && `· ${t.tenantName}`} · {msgCount} msg{msgCount!==1?'s':''}{t.image ? ' · 📷' : ''}
                        </p>
                      </button>
                      <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', flexShrink:0 }}>
                        <StatusBadge status={t.status} />
                        <button onClick={() => deleteTicket(t)} className="icon-btn red" style={{ width:'1.75rem', height:'1.75rem' }} title="Delete ticket">
                          <i className="fas fa-trash" style={{ fontSize:'0.5rem' }}></i>
                        </button>
                        <i className="fas fa-chevron-right" style={{ color:'var(--text-3)', fontSize:'0.65rem', cursor:'pointer' }} onClick={() => { setSelTicket(t.id); setViewTicket(true); }}></i>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {tab === 'history' && (
          <div>
            <p style={{ fontSize:'0.8125rem', color:'var(--text-2)', margin:'0 0 1.25rem', lineHeight:1.5 }}>
              <i className="fas fa-info-circle" style={{ marginRight:'0.35rem', color:'var(--violet)' }}></i>
              Deleted complaints are archived here. Chats are removed to save space.
            </p>
            {history.length === 0 ? (
              <div className="admin-card" style={{ padding:'3rem', textAlign:'center' }}>
                <i className="fas fa-history" style={{ fontSize:'2rem', color:'var(--text-3)', display:'block', marginBottom:'0.75rem' }}></i>
                <p style={{ fontWeight:700, color:'var(--text-2)', margin:0 }}>No history yet</p>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'0.625rem' }}>
                {history.map(h => {
                  const apt = apartments.find(a => a.id === h.aptId);
                  return (
                    <div key={h.id} className="admin-card" style={{ padding:'1rem 1.25rem', opacity:0.75 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'0.75rem', flexWrap:'wrap' }}>
                        <div>
                          <p style={{ fontWeight:700, color:'var(--text)', margin:'0 0 0.2rem', fontSize:'0.9rem' }}>{h.title}</p>
                          <p style={{ color:'var(--text-2)', fontSize:'0.8125rem', margin:'0 0 0.2rem', lineHeight:1.4 }}>{h.description}</p>
                          <p style={{ color:'var(--text-3)', fontSize:'0.75rem', margin:0 }}>
                            {apt?.number || h.aptId}{h.tenantName ? ` · ${h.tenantName}` : ''} · {h.msgCount} msg{h.msgCount!==1?'s':''} · Deleted {new Date(h.deletedAt).toLocaleDateString('en-NG')}
                          </p>
                        </div>
                        <span style={{ display:'inline-flex', alignItems:'center', gap:'0.3rem', padding:'0.2rem 0.5rem', borderRadius:'9999px', fontSize:'0.6875rem', fontWeight:700, background:'var(--bg-3)', border:'1px solid var(--border)', color:'var(--text-3)' }}>
                          <i className="fas fa-archive" style={{ fontSize:'0.55rem' }}></i>Archived
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const ApartmentCard = memo(function ApartmentCard({ apt, landlordId, onGenerateOTP, onCopy, copiedOtp, onDelete, openTicketCount, tenantName }) {
  const [generating, setGenerating] = useState(false);
  const hasOTP   = !!apt.otp;
  const otpValid = hasOTP && isOTPValid(apt.otpExpiry);

  const gen = async () => { setGenerating(true); await onGenerateOTP(apt.id); setGenerating(false); };

  return (
    <div style={{ padding:'0.875rem 1rem', borderRadius:'0.875rem', border:`1.5px solid ${openTicketCount>0?'rgba(239,68,68,0.35)':'var(--border)'}`, background:openTicketCount>0?'rgba(239,68,68,0.02)':'var(--bg-3)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'0.5rem', marginBottom: hasOTP?'0.75rem':0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
          {openTicketCount>0 && <span style={{ width:'8px', height:'8px', borderRadius:'9999px', background:'#ef4444', flexShrink:0, animation:'breathe 1.5s ease-in-out infinite' }} />}
          <p style={{ fontWeight:800, color:'var(--text)', margin:0, fontSize:'0.9rem' }}>{apt.number}</p>
          {openTicketCount>0 && <span style={{ fontSize:'0.6rem', fontWeight:700, color:'#ef4444', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', padding:'0.1rem 0.4rem', borderRadius:'9999px' }}>{openTicketCount} issue{openTicketCount>1?'s':''}</span>}
        </div>
        <div style={{ display:'flex', gap:'0.3rem' }}>
          <button onClick={gen} disabled={generating} title="Generate OTP" className="icon-btn violet" style={{ width:'1.75rem', height:'1.75rem' }}>
            {generating ? <span className="spinner-dark" style={{ width:'0.65rem', height:'0.65rem' }}></span> : <i className="fas fa-key" style={{ fontSize:'0.5rem' }}></i>}
          </button>
          <button onClick={()=>onDelete(apt.id,apt.otp)} className="icon-btn red" title="Delete" style={{ width:'1.75rem', height:'1.75rem' }}>
            <i className="fas fa-trash" style={{ fontSize:'0.5rem' }}></i>
          </button>
        </div>
      </div>

      {hasOTP && (
        <>
          <div style={{ background:'var(--bg-2)', border:'1px solid var(--border)', borderRadius:'0.5rem', padding:'0.5rem 0.75rem', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'0.5rem' }}>
            <div style={{ minWidth:0 }}>
              <p style={{ fontSize:'0.625rem', color:'var(--text-3)', margin:'0 0 0.1rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em' }}>Tenant OTP</p>
              <p style={{ fontFamily:'monospace', fontWeight:800, fontSize:'0.9375rem', color:otpValid?'var(--text)':'#ef4444', margin:0, letterSpacing:'0.12em' }}>{apt.otp}</p>
              <p style={{ fontSize:'0.625rem', color:otpValid?'var(--text-3)':'#ef4444', margin:'0.1rem 0 0' }}>
                {otpValid ? `Expires ${formatExpiry(apt.otpExpiry)}` : 'Expired — generate new OTP'}
              </p>
              {tenantName
                ? <p style={{ fontSize:'0.75rem', color:'var(--text)', fontWeight:700, margin:'0.25rem 0 0', display:'flex', alignItems:'center', gap:'0.3rem' }}><i className="fas fa-user" style={{ fontSize:'0.55rem', color:'var(--violet)' }}></i>{tenantName}</p>
                : <p style={{ fontSize:'0.625rem', color:'var(--text-3)', margin:'0.25rem 0 0', fontStyle:'italic' }}>Tenant hasn't logged in yet</p>
              }
            </div>
            <button onClick={()=>onCopy(apt.otp)} title="Copy"
              style={{ width:'1.875rem', height:'1.875rem', borderRadius:'0.5rem', background:'transparent', border:'1px solid var(--border-2)', color:'var(--text-2)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <i className={`fas ${copiedOtp===apt.otp?'fa-check':'fa-copy'}`} style={{ fontSize:'0.6rem', color:copiedOtp===apt.otp?'var(--green)':'inherit' }}></i>
            </button>
          </div>
          {otpValid && (
            <p style={{ fontSize:'0.625rem', color:'var(--text-3)', margin:'0.375rem 0 0', fontStyle:'italic' }}>
              <i className="fas fa-info-circle" style={{ marginRight:'0.3rem' }}></i>
              Give this code to the tenant to access their portal
            </p>
          )}
        </>
      )}
      {!hasOTP && <p style={{ fontSize:'0.75rem', color:'var(--text-3)', margin:0 }}><i className="fas fa-key" style={{ marginRight:'0.3rem' }}></i>Click key icon to generate OTP</p>}
    </div>
  );
});

function StatusBadge({ status }) {
  const open = status==='open';
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:'0.3rem', padding:'0.2rem 0.5rem', borderRadius:'9999px', fontSize:'0.6875rem', fontWeight:700, flexShrink:0,
      background:open?'rgba(239,68,68,0.08)':'rgba(21,128,61,0.08)',
      border:`1px solid ${open?'rgba(239,68,68,0.25)':'rgba(21,128,61,0.25)'}`,
      color:open?'#ef4444':'var(--green)' }}>
      <span style={{ width:'5px', height:'5px', borderRadius:'9999px', background:open?'#ef4444':'var(--green)' }} />
      {open?'Open':'Resolved'}
    </span>
  );
}

function ChatBubble({ msg, isOwn }) {
  const label = msg.from==='landlord'?'You':msg.from==='tenant'?'Tenant':'LodgeMate';
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
