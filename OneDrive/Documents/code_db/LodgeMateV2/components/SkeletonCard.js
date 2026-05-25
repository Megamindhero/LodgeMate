'use client';
import { useState, useEffect, memo } from 'react';

export function SkeletonCard() {
  return (
    <div style={{ background:'var(--card-bg)', border:'1px solid var(--border)', borderRadius:'1.25rem', overflow:'hidden', boxShadow:'var(--card-shadow)' }}>
      <div className="skeleton" style={{ height:'220px', borderRadius:0 }} />
      <div style={{ padding:'1rem 1.125rem', display:'flex', flexDirection:'column', gap:'0.75rem' }}>
        <div className="skeleton" style={{ height:'0.7rem', width:'45%', borderRadius:'9999px' }} />
        <div className="skeleton" style={{ height:'1rem', width:'80%' }} />
        <div style={{ display:'flex', gap:'0.4rem' }}>
          <div className="skeleton" style={{ height:'1rem', width:'4rem', borderRadius:'9999px' }} />
          <div className="skeleton" style={{ height:'1rem', width:'4rem', borderRadius:'9999px' }} />
        </div>
        <div style={{ display:'flex', gap:'0.5rem', marginTop:'0.25rem' }}>
          <div className="skeleton" style={{ height:'2.375rem', flex:1 }} />
          <div className="skeleton" style={{ height:'2.375rem', width:'5rem' }} />
        </div>
      </div>
    </div>
  );
}

export default SkeletonCard;

export const LazyImg = memo(function LazyImg({ src, alt, style, className }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  return (
    <div style={{ position:'relative', width:'100%', height:'100%', overflow:'hidden' }}>
      {!loaded && !error && <div className="skeleton" style={{ position:'absolute', inset:0, borderRadius:0 }} />}
      {!error && (
        <img src={src} alt={alt} loading="lazy" decoding="async" className={className}
          style={{ ...style, opacity: loaded ? 1 : 0, transition:'opacity 0.35s ease' }}
          onLoad={() => setLoaded(true)} onError={() => setError(true)} />
      )}
      {error && (
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-3)', color:'var(--text-3)', flexDirection:'column', gap:'0.5rem' }}>
          <i className="fas fa-image" style={{ fontSize:'1.75rem' }}></i>
          <span style={{ fontSize:'0.75rem' }}>No image</span>
        </div>
      )}
    </div>
  );
});

export const Lightbox = memo(function Lightbox({ images, index, onClose, onNext, onPrev }) {
  useEffect(() => {
    const fn = e => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'ArrowLeft') onPrev();
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose, onNext, onPrev]);

  const NavBtn = ({ onClick, icon, side }) => (
    <button onClick={onClick}
      style={{ position:'absolute', [side]:'1.25rem', top:'50%', transform:'translateY(-50%)', width:'3rem', height:'3rem', borderRadius:'9999px', background:'rgba(255,255,255,0.95)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', zIndex:10, boxShadow:'0 4px 16px rgba(0,0,0,0.3)', transition:'transform 0.15s' }}
      onMouseEnter={e=>e.currentTarget.style.transform='translateY(-50%) scale(1.08)'}
      onMouseLeave={e=>e.currentTarget.style.transform='translateY(-50%) scale(1)'}>
      <i className={`fas ${icon}`} style={{ fontSize:'0.875rem', color:'#111' }}></i>
    </button>
  );

  return (
    <div style={{ position:'fixed', inset:0, zIndex:70, background:'rgba(0,0,0,0.97)', backdropFilter:'blur(12px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem', animation:'fadeIn 0.2s ease' }}
      onClick={onClose}>
      <button onClick={onClose}
        style={{ position:'absolute', top:'1.25rem', right:'1.25rem', width:'2.75rem', height:'2.75rem', borderRadius:'9999px', background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.15)', color:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1rem', zIndex:10 }}>
        ×
      </button>
      {images.length > 1 && (
        <>
          <NavBtn onClick={e=>{e.stopPropagation();onPrev();}} icon="fa-chevron-left" side="left" />
          <NavBtn onClick={e=>{e.stopPropagation();onNext();}} icon="fa-chevron-right" side="right" />
        </>
      )}
      <img src={images[index]} alt="Full size" decoding="async"
        style={{ maxWidth:'100%', maxHeight:'90vh', objectFit:'contain', borderRadius:'0.75rem', animation:'slideUp 0.25s ease', boxShadow:'0 32px 80px rgba(0,0,0,0.6)' }}
        onClick={e=>e.stopPropagation()} />
      {images.length > 1 && (
        <div style={{ position:'absolute', bottom:'1.5rem', left:'50%', transform:'translateX(-50%)', background:'rgba(255,255,255,0.1)', color:'white', padding:'0.3rem 1.25rem', borderRadius:'9999px', fontSize:'0.8125rem', fontWeight:600, backdropFilter:'blur(8px)', border:'1px solid rgba(255,255,255,0.1)' }}>
          {index+1} / {images.length}
        </div>
      )}
    </div>
  );
});

export function ConfirmModal({ title, message, onConfirm, onCancel }) {
  return (
    <div className="modal-back" onClick={e=>{if(e.target===e.currentTarget)onCancel();}}>
      <div className="modal-box" style={{ maxWidth:'22rem', padding:'2rem', textAlign:'center' }}>
        <div style={{ width:'3.5rem', height:'3.5rem', borderRadius:'1rem', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.18)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1.25rem' }}>
          <i className="fas fa-trash" style={{ fontSize:'1.125rem', color:'#ef4444' }}></i>
        </div>
        <h3 style={{ fontWeight:800, fontSize:'1.0625rem', color:'var(--text)', margin:'0 0 0.5rem', letterSpacing:'-0.025em' }}>{title}</h3>
        <p style={{ fontSize:'0.875rem', color:'var(--text-2)', margin:'0 0 1.75rem', lineHeight:1.6 }}>{message}</p>
        <div style={{ display:'flex', gap:'0.75rem' }}>
          <button onClick={onCancel} className="btn btn-ghost" style={{ flex:1, height:'2.75rem' }}>Cancel</button>
          <button onClick={onConfirm} className="btn" style={{ flex:1, height:'2.75rem', background:'#ef4444', color:'white', borderRadius:'0.875rem' }}>Delete</button>
        </div>
      </div>
    </div>
  );
}
