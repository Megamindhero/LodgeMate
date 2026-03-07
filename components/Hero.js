'use client';
import { memo } from 'react';
import FeaturedCard from './FeaturedCard';

const Hero = memo(function Hero({ featuredProperty, onScrollToListings, onView, onWhatsApp }) {
  return (
    <section className="hero-bg">
      {/* Purple grid overlay — visible in both modes */}
      <div className="hero-grid" aria-hidden="true" />

      <div style={{
        maxWidth: '90rem', margin: '0 auto',
        padding: '4.5rem 1.5rem 4.5rem',
        position: 'relative', zIndex: 1,
        display: 'grid',
        gridTemplateColumns: featuredProperty ? 'minmax(0,1fr) minmax(0,420px)' : '1fr',
        gap: '3.5rem',
        alignItems: 'center',
      }}>
        {/* ── Left copy ── */}
        <div>
          {/* Location pill */}
          <div className="anim-up-0" style={{ marginBottom: '1.5rem' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)',
              color: 'var(--violet)', padding: '0.3rem 0.875rem',
              borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700,
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
              <i className="fas fa-map-marker-alt" style={{ fontSize: '0.6rem' }} />
              Minna, Niger State
            </span>
          </div>

          {/* Headline */}
          <h1 className="anim-up-1" style={{
            fontWeight: 900, lineHeight: 1.0, letterSpacing: '-0.05em',
            fontSize: 'clamp(3rem,6vw,5.5rem)',
            margin: '0 0 1.375rem',
          }}>
            <span style={{ display: 'block', color: 'var(--text)' }}>Find Your <span className='shimmer-text'>Dream</span> </span>
            {/* <span className="shimmer-text" style={{ display: 'block', fontStyle: 'italic' }}>Dream</span> */}
            <span className="shimmer-text" style={{ display: 'block', fontStyle: 'italic' }}>Apartment</span>
            <span style={{ display: 'block', color: 'var(--text)' }}>in Minna.</span>
          </h1>

          {/* Sub */}
          <p className="anim-up-2" style={{
            fontSize: '1rem', lineHeight: 1.8,
            color: 'var(--text-2)', marginBottom: '2.25rem', maxWidth: '30rem',
          }}>
            Verified listings across Gidan-Kwano, Gidan-Mango, Kpakungun &amp; Gurara.
            No middlemen. No hidden fees.
          </p>

          {/* CTAs */}
          <div className="anim-up-3" style={{ display: 'flex', gap: '0.875rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '2.75rem' }}>
            <button onClick={onScrollToListings} className="btn btn-primary"
              style={{ fontSize: '1rem', height: '3.25rem', paddingLeft: '2rem', paddingRight: '2rem', borderRadius: '1rem' }}>
              Browse Listings
              <i className="fas fa-arrow-right" style={{ fontSize: '0.85rem' }} />
            </button>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-3)', fontWeight: 500 }}>
              <i className="fas fa-shield-alt" style={{ marginRight: '0.35rem', color: 'var(--violet)' }} />
              All listings verified
            </span>
          </div>

          {/* Stats row */}
          {/* <div className="anim-up-4" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {[
              { val: '', label: 'Listings' },
              { val: '5★',   label: 'Rated' },
              { val: '₦0',   label: 'Agent Fee' },
            ].map(({ val, label }) => (
              <div key={label} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '0.75rem 1.25rem',
                background: 'var(--bg-2)', border: '1px solid var(--border)',
                borderRadius: '1rem', boxShadow: 'var(--card-shadow)',
                minWidth: '5.5rem',
              }}>
                <span style={{ fontWeight: 900, fontSize: '1.25rem', letterSpacing: '-0.04em', color: 'var(--text)', lineHeight: 1 }}>{val}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 600, marginTop: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
              </div>
            ))}
          </div> */}
        </div>

        {/* ── Right: Featured card — straight, no rotation ── */}
        {featuredProperty && (
          <div className="anim-up-2" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <FeaturedCard property={featuredProperty} onView={onView} onWhatsApp={onWhatsApp} />
          </div>
        )}
      </div>
    </section>
  );
});

export default Hero;
