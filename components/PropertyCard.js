'use client';
import { memo } from 'react';

const PropertyCard = memo(function PropertyCard({ property, onView, onWhatsApp, onOpenLightbox, delay, isAdmin, onToggleFeatured }) {
  const rawPrice = Number(property.price);
  const price = property.price && isFinite(rawPrice) && rawPrice > 0 ? rawPrice : null;
  const priceStr = price ? `₦${price.toLocaleString()}` : null;

  const bedsMatch = (property.title + ' ' + (property.description || '')).match(/(\d+)[\s-]?(?:bed|bedroom)/i);
  const beds = bedsMatch ? bedsMatch[1] : null;

  const titleLow = property.title?.toLowerCase() || '';
  const propType = titleLow.includes('flat') ? 'Flat'
    : titleLow.includes('house') ? 'House'
    : titleLow.includes('room') ? 'Room'
    : titleLow.includes('self') ? 'Self-Contain'
    : titleLow.includes('duplex') ? 'Duplex'
    : null;

  return (
    <article className="prop-card anim-up" style={{ animationDelay: `${delay * 0.06}s` }}>

      {/* ── Image — click opens lightbox ── */}
      <div className="card-img-wrap" onClick={e => { e.stopPropagation(); onOpenLightbox(property.images, 0); }}
        style={{ cursor: 'zoom-in' }}>
        {/* Not available overlay */}
        {property.available === false && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
            zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            <span style={{
              background: '#ef4444', color: 'white',
              fontWeight: 800, fontSize: '0.8125rem', letterSpacing: '0.06em',
              textTransform: 'uppercase', padding: '0.4rem 1.25rem',
              borderRadius: '9999px', boxShadow: '0 2px 12px rgba(239,68,68,0.5)',
            }}>Not Available</span>
          </div>
        )}
        <img src={property.images[0]} alt={property.title} className="card-img"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          loading="lazy" decoding="async" />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0) 45%, rgba(0,0,0,0.55) 100%)' }} />

        {/* Top-left: Featured + Type badges only */}
        <div style={{ position: 'absolute', top: '0.75rem', left: '0.75rem', display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {property.featured && (
            <span className="prop-tag prop-tag-feat">
              <i className="fas fa-star" style={{ fontSize: '0.5rem' }} />Featured
            </span>
          )}
          {propType && <span className="prop-tag prop-tag-type">{propType}</span>}
        </div>

        {/* Top-right: photo count only */}
        {property.images.length > 1 && (
          <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem' }}>
            <span className="prop-tag prop-tag-loc" style={{ fontSize: '0.65rem' }}>
              <i className="fas fa-images" style={{ fontSize: '0.55rem' }} />{property.images.length}
            </span>
          </div>
        )}

        {/* Bottom: price badge */}
        {priceStr && (
          <div style={{ position: 'absolute', bottom: '0.75rem', left: '0.75rem' }}>
            <span className="prop-tag prop-tag-price" style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem', borderRadius: '0.5rem' }}>
              {priceStr}<span style={{ fontWeight: 400, opacity: 0.75, fontSize: '0.7rem' }}>/yr</span>
            </span>
          </div>
        )}
      </div>

      {/* ── Info — click opens detail ── */}
      <div style={{ padding: '1rem 1.125rem', cursor: 'pointer' }} onClick={() => onView(property)}>
        {/* Location */}
        {property.location && (
          <p style={{ fontSize: '0.75rem', color: 'var(--violet)', fontWeight: 700, margin: '0 0 0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <i className="fas fa-map-marker-alt" style={{ fontSize: '0.6rem' }} />
            {property.location}
          </p>
        )}

        {/* Title */}
        <h3 style={{ fontWeight: 800, fontSize: '0.9375rem', letterSpacing: '-0.025em', color: 'var(--text)', margin: '0 0 0.625rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
          {property.title}
        </h3>

        {/* Meta */}
        <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'center', marginBottom: '0.875rem', flexWrap: 'wrap' }}>
          {beds && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: 'var(--text-2)' }}>
              <i className="fas fa-bed" style={{ fontSize: '0.7rem', color: 'var(--text-3)' }} />
              {beds} Bed{beds !== '1' ? 's' : ''}
            </span>
          )}
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', fontWeight: 600,
            color: property.available === false ? '#ef4444' : 'var(--green)' }}>
            <span style={{
              width: '7px', height: '7px', borderRadius: '9999px', flexShrink: 0,
              background: property.available === false ? '#ef4444' : 'var(--green)',
              boxShadow: property.available === false
                ? '0 0 0 2px rgba(239,68,68,0.2)'
                : '0 0 0 2px rgba(34,197,94,0.2)',
            }} />
            {property.available === false ? 'Not Available' : 'Available'}
          </span>
          {property.videoLink && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: 'var(--text-2)' }}>
              <i className="fas fa-video" style={{ fontSize: '0.7rem', color: 'var(--text-3)' }} />
              Video
            </span>
          )}
        </div>

        {/* ── Actions — stopPropagation so card click doesn't trigger ── */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
          <button className="view-btn" onClick={() => onView(property)}>
            <i className="fas fa-arrow-right" style={{ fontSize: '0.7rem' }} />
            View Details
          </button>
          <button
            onClick={() => property.available !== false && onWhatsApp(property)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.375rem',
              background: property.available === false ? 'var(--bg-4)' : 'var(--whatsapp)',
              border: 'none', borderRadius: '0.625rem', padding: '0.5rem 0.875rem',
              color: property.available === false ? 'var(--text-3)' : 'white',
              fontWeight: 700, fontSize: '0.8125rem',
              cursor: property.available === false ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', transition: 'all 0.15s', flexShrink: 0,
              boxShadow: property.available === false ? 'none' : '0 2px 8px rgba(37,211,102,0.3)',
              opacity: property.available === false ? 0.6 : 1,
            }}
            onMouseEnter={e => { if (property.available !== false) e.currentTarget.style.background = '#20b858'; }}
            onMouseLeave={e => { if (property.available !== false) e.currentTarget.style.background = 'var(--whatsapp)'; }}>
            <i className="fab fa-whatsapp" style={{ fontSize: '0.9375rem' }} />
            Chat
          </button>
          {isAdmin && onToggleFeatured && (
            <button className={`icon-btn gold ${property.featured ? 'active' : ''}`}
              onClick={e => { e.stopPropagation(); onToggleFeatured(property); }}
              title={property.featured ? 'Remove featured' : 'Set as featured'}
              style={{ border: 'none' }}>
              <i className="fas fa-star" style={{ fontSize: '0.7rem' }} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
});

export default PropertyCard;
