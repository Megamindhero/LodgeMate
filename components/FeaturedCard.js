'use client';
import { memo } from 'react';

const FeaturedCard = memo(function FeaturedCard({ property, onView, onWhatsApp }) {
  if (!property) return null;
  const rawPrice = Number(property.price);
  const price = property.price && isFinite(rawPrice) && rawPrice > 0
    ? `₦${rawPrice.toLocaleString()}/yr` : null;

  return (
    <div className="featured-card-wrap" style={{
      width: '100%', maxWidth: '28rem',
      borderRadius: '1.5rem', overflow: 'hidden',
      background: 'var(--card-bg)',
      border: '1px solid var(--border)',
      boxShadow: 'var(--card-shadow)',
      transition: 'transform 0.35s cubic-bezier(0.22,1,0.36,1), box-shadow 0.35s ease',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = 'var(--card-shadow-hover)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)';    e.currentTarget.style.boxShadow = 'var(--card-shadow)'; }}>

      {/* Image */}
      <div style={{ position: 'relative', height: '340px', overflow: 'hidden', background: 'var(--bg-3)' }}>
        <img src={property.images[0]} alt={property.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.5s ease' }}
          loading="eager" decoding="async"
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 45%, rgba(0,0,0,0.75) 100%)' }} />

        {/* Top badges */}
        <div style={{ position: 'absolute', top: '0.875rem', left: '0.875rem', right: '0.875rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <span className="prop-tag prop-tag-feat">
            <i className="fas fa-star" style={{ fontSize: '0.5rem' }} />Featured
          </span>
          {price && <span className="prop-tag prop-tag-price">{price}</span>}
        </div>

        {/* Bottom info overlay */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '1rem 1.25rem' }}>
          <p style={{ color: 'white', fontWeight: 800, fontSize: '1.125rem', margin: '0 0 0.3rem', letterSpacing: '-0.025em', lineHeight: 1.2 }}>
            {property.title}
          </p>
          {property.location && (
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.8rem', margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <i className="fas fa-map-marker-alt" style={{ fontSize: '0.6rem', color: '#a78bfa' }} />
              {property.location}
            </p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {property.available === false ? (
              <>
                <span style={{ width:'7px', height:'7px', borderRadius:'9999px', background:'#ef4444', flexShrink:0 }} />
                <span style={{ color:'rgba(255,100,100,0.85)', fontSize:'0.75rem', fontWeight:600 }}>Not Available</span>
              </>
            ) : (
              <>
                <div className="live-dot" />
                <span style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.75rem', fontWeight:500 }}>Available now</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Action row */}
      <div style={{ padding: '1rem 1.125rem', display: 'flex', gap: '0.625rem', alignItems: 'center', background: 'var(--card-bg)', borderTop: '1px solid var(--border)' }}>
        <button onClick={() => onView(property)} className="view-btn">
          <i className="fas fa-eye" style={{ fontSize: '0.75rem' }} />
          View Details
        </button>
        <button
          onClick={() => onWhatsApp(property)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            background: 'var(--whatsapp)', border: 'none',
            borderRadius: '0.75rem', padding: '0.6rem 1rem',
            color: 'white', fontWeight: 700, fontSize: '0.875rem',
            cursor: 'pointer', fontFamily: 'inherit',
            transition: 'all 0.15s', flexShrink: 0,
            boxShadow: '0 2px 10px rgba(37,211,102,0.3)',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#20b858'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--whatsapp)'}
        >
          <i className="fab fa-whatsapp" style={{ fontSize: '1rem' }} />
          Chat
        </button>
      </div>
    </div>
  );
});

export default FeaturedCard;
