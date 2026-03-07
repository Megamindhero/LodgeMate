'use client';
import { useState, useCallback } from 'react';
import Header from './Header';
import { LazyImg } from './SkeletonCard';

const SAFE_DOMAINS = /^(www\.)?(youtube\.com|youtu\.be|vimeo\.com|maps\.google\.com|google\.com)$/;

function linkify(text) {
  if (!text) return null;
  return text.split(/(https?:\/\/[^\s]+)/g).map((p, i) => {
    if (!/^https?:\/\//.test(p)) return p;
    try {
      const u = new URL(p);
      if (u.protocol !== 'https:' || !SAFE_DOMAINS.test(u.hostname)) return p;
    } catch { return p; }
    return <a key={i} href={p} target="_blank" rel="noopener noreferrer" style={{ color:'var(--violet)', textDecoration:'underline' }}>{p}</a>;
  });
}

export default function DetailPage({ property, darkMode, toggleDarkMode, onBack, onWhatsApp, onOpenLightbox, onOpenAdminLogin }) {
  const [idx, setIdx] = useState(0);
  const goNext = useCallback(() => setIdx(i => (i+1) % property.images.length), [property.images.length]);
  const goPrev = useCallback(() => setIdx(i => (i-1+property.images.length) % property.images.length), [property.images.length]);

  const rawPrice = Number(property.price);
  const price = property.price && isFinite(rawPrice) && rawPrice > 0 ? rawPrice : null;
  const priceStr = price ? `₦${price.toLocaleString()}/yr` : null;

  const bedsMatch = (property.title + ' ' + (property.description || '')).match(/(\d+)[\s-]?(?:bed|bedroom)/i);
  const beds = bedsMatch ? bedsMatch[1] : null;
  const titleLow = property.title?.toLowerCase() || '';
  const propType = titleLow.includes('flat') ? 'Flat' : titleLow.includes('house') ? 'House' : titleLow.includes('room') ? 'Room' : titleLow.includes('self') ? 'Self-Contain' : titleLow.includes('duplex') ? 'Duplex' : 'Property';

  let safeVideo = null;
  if (property.videoLink) {
    try {
      const u = new URL(property.videoLink);
      if (u.protocol === 'https:' && /^(www\.)?(youtube\.com|youtu\.be|vimeo\.com)$/.test(u.hostname)) safeVideo = property.videoLink;
    } catch {}
  }

  return (
    <div className="anim-fade" style={{ minHeight:'100vh', background:'var(--bg)' }}>
      <Header currentPage="details" darkMode={darkMode} toggleDarkMode={toggleDarkMode} onNavigateHome={onBack} onOpenAdminLogin={onOpenAdminLogin} />

      <div style={{ maxWidth:'56rem', margin:'0 auto', padding:'1.5rem 1rem 5rem' }}>
        {/* Back */}
        <button onClick={onBack} className="btn btn-ghost btn-sm"
          style={{ marginBottom:'1.5rem', paddingLeft:'0.5rem', color:'var(--text-2)' }}>
          <i className="fas fa-arrow-left" style={{ fontSize:'0.75rem' }}></i>
          Back to listings
        </button>

        {/* Card wrapper */}
        <div style={{ background:'var(--card-bg)', border:'1px solid var(--border)', borderRadius:'1.5rem', overflow:'hidden', boxShadow:'var(--card-shadow)' }}>

          {/* Gallery */}
          <div className="gallery-main" style={{ cursor:'zoom-in' }} onClick={() => onOpenLightbox(property.images, idx)}>
            <LazyImg src={property.images[idx]} alt={property.title}
              style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
            {/* nav arrows */}
            {property.images.length > 1 && (<>
              <button onClick={e=>{e.stopPropagation();goPrev();}}
                style={{ position:'absolute', left:'1rem', top:'50%', transform:'translateY(-50%)', width:'2.75rem', height:'2.75rem', borderRadius:'9999px', background:'rgba(255,255,255,0.9)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 8px rgba(0,0,0,0.15)', zIndex:2 }}>
                <i className="fas fa-chevron-left" style={{ fontSize:'0.8rem', color:'#111' }}></i>
              </button>
              <button onClick={e=>{e.stopPropagation();goNext();}}
                style={{ position:'absolute', right:'1rem', top:'50%', transform:'translateY(-50%)', width:'2.75rem', height:'2.75rem', borderRadius:'9999px', background:'rgba(255,255,255,0.9)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 8px rgba(0,0,0,0.15)', zIndex:2 }}>
                <i className="fas fa-chevron-right" style={{ fontSize:'0.8rem', color:'#111' }}></i>
              </button>
              <div style={{ position:'absolute', bottom:'1rem', left:'50%', transform:'translateX(-50%)', background:'rgba(0,0,0,0.6)', color:'white', padding:'0.25rem 0.875rem', borderRadius:'9999px', fontSize:'0.75rem', fontWeight:600, backdropFilter:'blur(6px)' }}>
                {idx+1} / {property.images.length}
              </div>
            </>)}
          </div>

          {/* Thumbnails */}
          {property.images.length > 1 && (
            <div style={{ padding:'0.875rem 1.25rem', borderBottom:'1px solid var(--border)', background:'var(--bg-3)', display:'flex', flexWrap:'wrap', gap:'0.375rem', overflowX:'auto' }}>
              {property.images.map((img, i) => (
                <div key={i} className={`thumb ${idx===i?'active':''}`} onClick={() => setIdx(i)}>
                  <img src={img} alt={`Photo ${i+1}`} />
                </div>
              ))}
            </div>
          )}

          {/* Details */}
          <div style={{ padding:'1.75rem 2rem 2rem' }}>
            {/* Header row */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'1rem', flexWrap:'wrap', marginBottom:'1.5rem' }}>
              <div style={{ flex:1, minWidth:0 }}>
                {property.location && (
                  <p style={{ fontSize:'0.8rem', color:'var(--violet)', fontWeight:700, margin:'0 0 0.375rem', display:'flex', alignItems:'center', gap:'0.3rem', letterSpacing:'0.01em' }}>
                    <i className="fas fa-map-marker-alt" style={{ fontSize:'0.65rem' }}></i>
                    {property.location}
                  </p>
                )}
                <h1 style={{ fontWeight:900, fontSize:'clamp(1.25rem,3vw,1.75rem)', letterSpacing:'-0.035em', color:'var(--text)', margin:0, lineHeight:1.2 }}>
                  {property.title}
                </h1>
              </div>
              {priceStr && (
                <div style={{ background:'var(--violet)', color:'white', fontWeight:900, fontSize:'1.125rem', padding:'0.5rem 1.25rem', borderRadius:'0.875rem', letterSpacing:'-0.02em', flexShrink:0, boxShadow:'0 4px 16px var(--violet-glow)' }}>
                  {priceStr}
                </div>
              )}
            </div>

            {/* Info grid */}
            <div className="detail-info-grid" style={{ marginBottom:'1.5rem' }}>
              <div className="detail-info-item">
                <span style={{ fontSize:'0.7rem', fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Type</span>
                <span style={{ fontSize:'0.9375rem', fontWeight:700, color:'var(--text)' }}>{propType}</span>
              </div>
              {beds && (
                <div className="detail-info-item">
                  <span style={{ fontSize:'0.7rem', fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Bedrooms</span>
                  <span style={{ fontSize:'0.9375rem', fontWeight:700, color:'var(--text)' }}>{beds} Bedroom{beds !== '1' ? 's' : ''}</span>
                </div>
              )}
              <div className="detail-info-item" style={{
                borderColor: property.available === false ? 'rgba(239,68,68,0.2)' : undefined,
                background:  property.available === false ? 'rgba(239,68,68,0.04)' : undefined,
              }}>
                <span style={{ fontSize:'0.7rem', fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Status</span>
                <span style={{ fontSize:'0.9375rem', fontWeight:700, display:'flex', alignItems:'center', gap:'0.375rem',
                  color: property.available === false ? '#ef4444' : 'var(--green)' }}>
                  {property.available === false ? (
                    <span style={{ width:'7px', height:'7px', borderRadius:'9999px', background:'#ef4444', flexShrink:0 }} />
                  ) : (
                    <div className="live-dot" />
                  )}
                  {property.available === false ? 'Not Available' : 'Available'}
                </span>
              </div>
              <div className="detail-info-item">
                <span style={{ fontSize:'0.7rem', fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Photos</span>
                <span style={{ fontSize:'0.9375rem', fontWeight:700, color:'var(--text)' }}>{property.images.length} Photo{property.images.length !== 1 ? 's' : ''}</span>
              </div>
              {property.featured && (
                <div className="detail-info-item" style={{ background:'rgba(251,191,36,0.08)', borderColor:'rgba(251,191,36,0.25)' }}>
                  <span style={{ fontSize:'0.7rem', fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Listing</span>
                  <span style={{ fontSize:'0.9375rem', fontWeight:700, color:'#d97706' }}>⭐ Featured</span>
                </div>
              )}
            </div>

            {/* Description */}
            <div style={{ marginBottom:'1.5rem' }}>
              <p className="lm-label" style={{ marginBottom:'0.625rem' }}>About this property</p>
              <p style={{ fontSize:'0.9375rem', lineHeight:1.8, color:'var(--text-2)', whiteSpace:'pre-wrap', margin:0 }}>
                {linkify(property.description)}
              </p>
            </div>

            {/* Video */}
            {safeVideo && (
              <div style={{ marginBottom:'1.5rem', padding:'1rem', background:'var(--bg-3)', borderRadius:'1rem', border:'1px solid var(--border)' }}>
                <p className="lm-label" style={{ marginBottom:'0.625rem' }}>Video Tour</p>
                <a href={safeVideo} target="_blank" rel="noopener noreferrer"
                  style={{ display:'inline-flex', alignItems:'center', gap:'0.5rem', color:'#ef4444', fontWeight:700, fontSize:'0.9rem', textDecoration:'none', padding:'0.5rem 1rem', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:'0.75rem', transition:'all 0.15s' }}>
                  <i className="fab fa-youtube" style={{ fontSize:'1.1rem' }}></i>Watch Video Tour
                </a>
              </div>
            )}

            {/* WhatsApp CTA */}
            <div style={{
              background: property.available === false
                ? 'linear-gradient(135deg, rgba(239,68,68,0.06) 0%, rgba(239,68,68,0.02) 100%)'
                : 'linear-gradient(135deg, rgba(37,211,102,0.07) 0%, rgba(37,211,102,0.03) 100%)',
              border: property.available === false
                ? '1.5px solid rgba(239,68,68,0.2)'
                : '1.5px solid rgba(37,211,102,0.2)',
              borderRadius:'1.25rem', padding:'1.5rem', textAlign:'center', position:'relative', zIndex:1 }}>
              <p style={{ fontWeight:800, fontSize:'1.0625rem', color:'var(--text)', margin:'0 0 0.375rem', letterSpacing:'-0.02em' }}>
                {property.available === false ? 'This property is not available' : 'Interested in this property?'}
              </p>
              <p style={{ fontSize:'0.875rem', color:'var(--text-2)', margin:'0 0 1.25rem' }}>
                {property.available === false
                  ? 'The landlord has marked this listing as currently unavailable.'
                  : 'Reach the landlord directly — no agent fees'}
              </p>
              <button
                onClick={() => onWhatsApp(property)}
                style={{
                  display:'inline-flex', alignItems:'center', gap:'0.625rem',
                  background:'var(--whatsapp)', color:'white',
                  fontWeight:700, fontSize:'1rem',
                  border:'none', borderRadius:'0.875rem',
                  cursor:'pointer', fontFamily:'inherit',
                  padding:'0 2rem', height:'3.25rem',
                  boxShadow:'0 4px 20px rgba(37,211,102,0.35)',
                  transition:'all 0.18s ease',
                }}
                onMouseEnter={e=>{e.currentTarget.style.background='#20b858';e.currentTarget.style.transform='translateY(-1px)';}}
                onMouseLeave={e=>{e.currentTarget.style.background='var(--whatsapp)';e.currentTarget.style.transform='translateY(0)';}}>
                <i className="fab fa-whatsapp" style={{ fontSize:'1.25rem' }}></i>
                Contact on WhatsApp
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
