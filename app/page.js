'use client';
import { useState, useEffect, useCallback } from 'react';
import { ref, onValue, push, set, update, remove } from 'firebase/database';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { buildSafeProperty } from '@/lib/validation';

import Header          from '@/components/Header';
import Hero            from '@/components/Hero';
import PropertyCard    from '@/components/PropertyCard';
import SkeletonCard    from '@/components/SkeletonCard';
import { Lightbox, ConfirmModal } from '@/components/SkeletonCard';
import AdminLoginModal from '@/components/AdminLoginModal';
import AdminPage       from '@/components/AdminPage';
import DetailPage      from '@/components/DetailPage';
import EditModal       from '@/components/EditModal';

export default function App() {
  const [page,          setPage]          = useState('home');
  const [selProp,       setSelProp]       = useState(null);
  const [isAdmin,       setIsAdmin]       = useState(false);
  const [properties,    setProperties]    = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [showLogin,     setShowLogin]     = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [editProp,      setEditProp]      = useState(null);
  const [lb,            setLb]            = useState({ open:false, images:[], index:0 });
  const [darkMode,      setDarkMode]      = useState(false); // light default

  // Read preference on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('lm_dark');
      setDarkMode(saved !== null ? JSON.parse(saved) : false);
    } catch {}
  }, []);

  // Apply dark class
  useEffect(() => {
    try { localStorage.setItem('lm_dark', JSON.stringify(darkMode)); } catch {}
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // Firebase properties
  useEffect(() => {
    const unsub = onValue(ref(db, 'properties'), snap => {
      const data = snap.val();
      setProperties(data
        ? Object.keys(data).map(k => ({ id:k, ...data[k] }))
            .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
        : []);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Firebase auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      setIsAdmin(!!user);
      if (!user) setPage(p => p === 'admin' ? 'home' : p);
    });
    return () => unsub();
  }, []);

  const toggleDark   = useCallback(() => setDarkMode(d => !d), []);
  const openLb       = useCallback((images, index) => { setLb({ open:true, images, index }); document.body.style.overflow='hidden'; }, []);
  const closeLb      = useCallback(() => { setLb(l => ({ ...l, open:false })); document.body.style.overflow=''; }, []);
  const nextLb       = useCallback(() => setLb(l => ({ ...l, index:(l.index+1)%l.images.length })), []);
  const prevLb       = useCallback(() => setLb(l => ({ ...l, index:(l.index-1+l.images.length)%l.images.length })), []);
  const whatsApp     = useCallback(prop => {
    const raw = (prop.whatsappNumber||'').replace(/[^\d]/g,'');
    if (!raw || raw.length < 7) { alert('Invalid WhatsApp number.'); return; }
    window.open(`https://wa.me/${raw}?text=${encodeURIComponent("Hi! I'm interested in: "+String(prop.title).substring(0,100))}`,'_blank','noopener,noreferrer');
  }, []);
  const viewDetails  = useCallback(prop => { setSelProp(prop); setPage('details'); window.scrollTo({top:0,behavior:'smooth'}); }, []);
  const goHome       = useCallback(() => { setPage('home'); window.scrollTo({top:0,behavior:'smooth'}); }, []);
  const saveProp     = useCallback(async form => { const r = push(ref(db,'properties')); await set(r, buildSafeProperty(form,{featured:false,available:true,createdAt:new Date().toISOString()})); }, []);
  const updateProp   = useCallback(async (id,data) => { await update(ref(db,`properties/${id}`), buildSafeProperty(data,{featured:data.featured||false,createdAt:data.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()})); }, []);
  const delProp      = useCallback(id => { const p = properties.find(p => p.id===id); setConfirmDelete({id,title:p?.title||'this property'}); }, [properties]);
  const confirmDel   = useCallback(async () => { if (!confirmDelete) return; try { await remove(ref(db,`properties/${confirmDelete.id}`)); } catch(e){ alert('Delete failed: '+e.message); } setConfirmDelete(null); }, [confirmDelete]);
  const toggleFeat   = useCallback(async prop => {
    const ups = {}; properties.forEach(p => { if (p.featured && p.id!==prop.id) ups[`/properties/${p.id}/featured`]=false; });
    ups[`/properties/${prop.id}/featured`] = !prop.featured;
    await update(ref(db), ups);
  }, [properties]);
  const toggleAvail  = useCallback(async prop => {
    await update(ref(db, `properties/${prop.id}`), { available: prop.available === false ? true : false });
  }, []);
  const handleLogin  = useCallback(() => { setIsAdmin(true); setShowLogin(false); setPage('admin'); }, []);
  const handleLogout = useCallback(() => { signOut(auth); setIsAdmin(false); setPage('home'); }, []);

  return (
    <>
      {page==='home'    && <HomePage properties={properties} loading={loading} darkMode={darkMode} toggleDarkMode={toggleDark} onView={viewDetails} onWhatsApp={whatsApp} onOpenLightbox={openLb} onOpenAdminLogin={()=>setShowLogin(true)} />}
      {page==='details' && selProp && <DetailPage property={selProp} darkMode={darkMode} toggleDarkMode={toggleDark} onBack={goHome} onWhatsApp={whatsApp} onOpenLightbox={openLb} onOpenAdminLogin={()=>setShowLogin(true)} />}
      {page==='admin'   && isAdmin  && <AdminPage properties={properties} darkMode={darkMode} toggleDarkMode={toggleDark} onLogout={handleLogout} onSave={saveProp} onDelete={delProp} onEdit={p=>setEditProp(p)} onToggleFeatured={toggleFeat} onToggleAvailable={toggleAvail} onOpenLightbox={openLb} onOpenAdminLogin={()=>setShowLogin(true)} />}



      {lb.open        && <Lightbox images={lb.images} index={lb.index} onClose={closeLb} onNext={nextLb} onPrev={prevLb} />}
      {showLogin      && <AdminLoginModal onLogin={handleLogin} onClose={()=>setShowLogin(false)} />}
      {editProp       && <EditModal property={editProp} onSave={updateProp} onClose={()=>setEditProp(null)} />}
      {confirmDelete  && <ConfirmModal title="Delete Property" message={`Delete "${confirmDelete.title}"? This cannot be undone.`} onConfirm={confirmDel} onCancel={()=>setConfirmDelete(null)} />}
    </>
  );
}

function HomePage({ properties, loading, darkMode, toggleDarkMode, onView, onWhatsApp, onOpenLightbox, onOpenAdminLogin }) {
  const featured = properties.find(p => p.featured) || null;
  const scroll   = useCallback(() => document.getElementById('listings')?.scrollIntoView({behavior:'smooth',block:'start'}), []);
  return (
    <div style={{minHeight:'100vh',background:'var(--bg)'}}>
      <Header currentPage="home" darkMode={darkMode} toggleDarkMode={toggleDarkMode} onNavigateHome={()=>{}} onOpenAdminLogin={onOpenAdminLogin} />
      <Hero featuredProperty={featured} onScrollToListings={scroll} onView={onView} onWhatsApp={onWhatsApp} />
      <ListingsSection properties={properties} loading={loading} onView={onView} onWhatsApp={onWhatsApp} onOpenLightbox={onOpenLightbox} />
      <footer style={{borderTop:'1px solid var(--border)',padding:'2.5rem 1.5rem',textAlign:'center'}}>
        <div style={{maxWidth:'88rem',margin:'0 auto',display:'flex',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',gap:'1rem'}}>
          <div style={{display:'flex',alignItems:'center',gap:'0.625rem'}}>
            <div style={{width:'0rem',height:'0rem',borderRadius:'0.5rem',background:'var(--violet-2)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <span style={{fontSize:'0.8rem'}}></span>
            </div>
            <span style={{fontWeight:700,fontSize:'0.9375rem',color:'var(--text)',letterSpacing:'-0.02em'}}></span>
          </div>
          <p style={{fontSize:'0.8125rem',color:'var(--text-3)'}}>© {new Date().getFullYear()} LodgeMate · Minna, Niger State · All rights reserved</p>
        </div>
      </footer>
    </div>
  );
}

function ListingsSection({ properties, loading, onView, onWhatsApp, onOpenLightbox }) {
  return (
    <section id="listings" style={{ background:'var(--bg-3)', padding:'5rem 1.5rem' }}>
      <div style={{ maxWidth:'90rem', margin:'0 auto' }}>
        {/* Section header */}
        <div className="anim-up" style={{ marginBottom:'3rem' }}>
          <div className="section-label" style={{ marginBottom:'0.75rem' }}>
            <i className="fas fa-home" style={{ fontSize:'0.65rem' }}></i>
            Available Now
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:'1rem' }}>
            <div>
              <h2 style={{ fontSize:'clamp(1.75rem,3.5vw,2.5rem)', fontWeight:900, letterSpacing:'-0.04em', color:'var(--text)', margin:0, lineHeight:1.1 }}>
                  Listings
              </h2>
              <p style={{ color:'var(--text-2)', marginTop:'0.5rem', fontSize:'0.9375rem' }}>
                Handpicked across Gidan-Kwano, Gidan-Mango, Kpakungun &amp; Gurara
              </p>
            </div>
            {!loading && properties.length > 0 && (
              <div style={{ display:'flex', alignItems:'center', gap:'0.625rem', background:'var(--bg-2)', border:'1px solid var(--border)', borderRadius:'9999px', padding:'0.35rem 0.875rem' }}>
                <div className="live-dot" />
                <span style={{ fontSize:'0.8125rem', fontWeight:700, color:'var(--text)' }}>{properties.length} Available</span>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:'1.5rem' }}>
            {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : properties.length === 0 ? (
          <div style={{ textAlign:'center', padding:'6rem 1rem', background:'var(--bg-2)', borderRadius:'1.5rem', border:'1px solid var(--border)' }}>
            <div style={{ width:'5rem', height:'5rem', borderRadius:'1.25rem', background:'var(--bg-3)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1.5rem', fontSize:'2rem' }}>🏘️</div>
            <h3 style={{ fontWeight:800, fontSize:'1.125rem', color:'var(--text)', margin:'0 0 0.5rem', letterSpacing:'-0.025em' }}>No listings yet</h3>
            <p style={{ color:'var(--text-2)', fontSize:'0.9375rem', margin:0 }}>Check back soon — new properties are added regularly.</p>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:'1.5rem' }}>
            {properties.map((p,i) => (
              <PropertyCard key={p.id} property={p} onView={onView} onWhatsApp={onWhatsApp} onOpenLightbox={onOpenLightbox} delay={i} isAdmin={false} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
