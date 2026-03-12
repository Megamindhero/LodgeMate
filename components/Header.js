'use client';
import { useState, memo } from 'react';
import { createPortal } from 'react-dom';

const Header = memo(function Header({ currentPage, darkMode, toggleDarkMode, onNavigateHome, onOpenAdminLogin }) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const close = () => { setClosing(true); setTimeout(() => { setOpen(false); setClosing(false); }, 240); };

  const ThemeSwitch = () => (
    <button onClick={toggleDarkMode} aria-label="Toggle theme"
      style={{ display:'flex', alignItems:'center', gap:'0.5rem', background:'none', border:'none', cursor:'pointer', padding:0 }}>
      <div className={`toggle-track ${darkMode ? 'on' : ''}`}>
        <div className={`toggle-thumb ${darkMode ? 'on' : ''}`} />
      </div>
      <span style={{ fontSize:'0.8125rem', color:'var(--text-2)', fontWeight:500, userSelect:'none' }}>
        {darkMode ? '🌙' : '☀️'}
      </span>
    </button>
  );

  /* Animated hamburger → X button */
  const HamburgerBtn = () => (
    <button
      onClick={() => open ? close() : setOpen(true)}
      aria-label={open ? 'Close menu' : 'Open menu'}
      style={{
        width:'2.25rem', height:'2.25rem',
        background:'none', border:'none', cursor:'pointer',
        display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        gap:'5px', padding:'4px',
        borderRadius:'0.5rem',
        transition:'background 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}
    >
      <span style={{
        display:'block', width:'20px', height:'2px',
        background:'var(--text)', borderRadius:'9999px',
        transition:'transform 0.3s cubic-bezier(0.23,1,0.32,1), opacity 0.2s',
        transform: open ? 'translateY(7px) rotate(45deg)' : 'none',
      }} />
      <span style={{
        display:'block', width:'20px', height:'2px',
        background:'var(--text)', borderRadius:'9999px',
        transition:'opacity 0.2s, transform 0.2s',
        opacity: open ? 0 : 1,
        transform: open ? 'scaleX(0)' : 'scaleX(1)',
      }} />
      <span style={{
        display:'block', width:'20px', height:'2px',
        background:'var(--text)', borderRadius:'9999px',
        transition:'transform 0.3s cubic-bezier(0.23,1,0.32,1), opacity 0.2s',
        transform: open ? 'translateY(-7px) rotate(-45deg)' : 'none',
      }} />
    </button>
  );

  return (
    <header className="site-header anim-down">
      <div style={{ maxWidth:'90rem', margin:'0 auto', padding:'0 1.5rem', display:'flex', alignItems:'center', justifyContent:'space-between', height:'64px' }}>
        {/* Logo */}
        <button onClick={onNavigateHome} style={{ display:'flex', alignItems:'center', gap:'0.625rem', background:'none', border:'none', cursor:'pointer', padding:0 }}>
          <div style={{ width:'2.125rem', height:'2.125rem', background:'linear-gradient(135deg,#5b21b6,#7c3aed)', borderRadius:'0.625rem', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 4px 12px rgba(91,33,182,0.35)' }}>
            <span style={{ fontSize:'0.95rem' }}>🏠</span>
          </div>
          <span style={{ fontWeight:900, fontSize:'1.125rem', letterSpacing:'-0.04em', color:'var(--text)' }}>LodgeMate</span>
        </button>

        {/* Desktop right */}
        <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
          <div className="desktop-nav" style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
            <button onClick={onNavigateHome}
              style={{ background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:'0.9rem', fontWeight:600, color: currentPage==='home' ? 'var(--text)' : 'var(--text-2)', padding:'0.4rem 0.75rem', borderRadius:'0.625rem', transition:'all 0.15s' }}
              onMouseEnter={e=>e.currentTarget.style.background='var(--bg-3)'}
              onMouseLeave={e=>e.currentTarget.style.background='none'}>
              Home
            </button>
            <ThemeSwitch />
            <button onClick={onOpenAdminLogin}
              style={{ display:'flex', alignItems:'center', gap:'0.375rem', background:'var(--bg-3)', border:'1.5px solid var(--border-2)', borderRadius:'0.75rem', padding:'0.45rem 0.875rem', cursor:'pointer', color:'var(--text-2)', fontFamily:'inherit', fontSize:'0.8125rem', fontWeight:600, transition:'all 0.15s' }}
              onMouseEnter={e=>{e.currentTarget.style.background='var(--bg-4)';e.currentTarget.style.color='var(--text)';}}
              onMouseLeave={e=>{e.currentTarget.style.background='var(--bg-3)';e.currentTarget.style.color='var(--text-2)';}}>
              <i className="fas fa-lock" style={{ fontSize:'0.7rem' }}></i>
              Admin
            </button>
          </div>

          {/* Mobile: theme + animated hamburger */}
          <div className="mobile-nav" style={{ display:'none', alignItems:'center', gap:'0.75rem' }}>
            <ThemeSwitch />
            <HamburgerBtn />
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && typeof document !== 'undefined' && createPortal(
        <div style={{ position:'fixed', inset:0, zIndex:9999 }}>
          <div onClick={close} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.5)', animation:'fadeIn 0.2s ease both' }} />
          <nav className={closing ? 'drawer-out' : 'drawer-in'}
            style={{ position:'absolute', top:0, left:0, bottom:0, width:'17rem', background:'var(--bg-2)', borderRight:'1px solid var(--border)', boxShadow:'16px 0 48px rgba(0,0,0,0.12)', display:'flex', flexDirection:'column' }}>
            <div style={{ padding:'1.25rem 1.125rem', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid var(--border)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                <div style={{ width:'1.75rem', height:'1.75rem', background:'linear-gradient(135deg,#5b21b6,#7c3aed)', borderRadius:'0.5rem', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ fontSize:'0.8rem' }}>🏠</span>
                </div>
                <span style={{ fontWeight:900, letterSpacing:'-0.04em', color:'var(--text)', fontSize:'1rem' }}>LodgeMate</span>
              </div>
              {/* X button in drawer header — matches animated hamburger */}
              <button onClick={close}
                style={{ width:'2rem', height:'2rem', borderRadius:'0.5rem', background:'var(--bg-3)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text)', transition:'background 0.15s' }}
                onMouseEnter={e=>e.currentTarget.style.background='var(--bg-4)'}
                onMouseLeave={e=>e.currentTarget.style.background='var(--bg-3)'}>
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1 1L10 10M10 1L1 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div style={{ padding:'0.75rem', flex:1, display:'flex', flexDirection:'column', gap:'0.125rem' }}>
              {[
                { icon:'🏠', label:'Home',        fn: () => { onNavigateHome();    close(); } },
                { icon:'🔐', label:'Admin Login', fn: () => { onOpenAdminLogin(); close(); } },
              ].map(item => (
                <button key={item.label} onClick={item.fn}
                  style={{ width:'100%', display:'flex', alignItems:'center', gap:'0.875rem', padding:'0.75rem 1rem', borderRadius:'0.75rem', background:'transparent', border:'none', cursor:'pointer', color:'var(--text)', fontFamily:'inherit', fontSize:'0.9375rem', fontWeight:600, textAlign:'left', transition:'background 0.15s' }}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--bg-3)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <span style={{ fontSize:'1rem' }}>{item.icon}</span>{item.label}
                </button>
              ))}
            </div>
            <div style={{ padding:'1rem 1.125rem', borderTop:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:'0.875rem', fontWeight:600, color:'var(--text-2)' }}>{darkMode ? 'Dark Mode' : 'Light Mode'}</span>
              <button onClick={toggleDarkMode} style={{ background:'none', border:'none', cursor:'pointer', padding:0 }}>
                <div className={`toggle-track ${darkMode ? 'on' : ''}`} style={{ display:'inline-block' }}>
                  <div className={`toggle-thumb ${darkMode ? 'on' : ''}`} />
                </div>
              </button>
            </div>
          </nav>
        </div>,
        document.body
      )}
    </header>
  );
});

export default Header;
