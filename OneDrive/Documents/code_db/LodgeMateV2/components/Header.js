'use client';
import { useState, useEffect, useRef, memo, useCallback } from 'react';
import { createPortal } from 'react-dom';

// ── All sub-components defined OUTSIDE to prevent remount on re-render ─────────

function ThemeToggle({ darkMode, toggleDarkMode }) {
  return (
    <button
      onClick={toggleDarkMode}
      title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        width:'2.25rem', height:'2.25rem',
        borderRadius:'0.625rem',
        border:'1.5px solid var(--border-2)',
        background:'var(--bg-3)',
        cursor:'pointer', flexShrink:0,
        display:'flex', alignItems:'center', justifyContent:'center',
        transition:'background 0.18s, border-color 0.18s, transform 0.18s',
        position:'relative', overflow:'hidden',
      }}
      onMouseEnter={e => { e.currentTarget.style.background='var(--bg-4)'; e.currentTarget.style.borderColor='var(--violet)'; }}
      onMouseLeave={e => { e.currentTarget.style.background='var(--bg-3)'; e.currentTarget.style.borderColor='var(--border-2)'; }}>
      {/* Sun icon */}
      <svg
        style={{ position:'absolute', transition:'opacity 0.2s, transform 0.2s', opacity:darkMode?0:1, transform:darkMode?'rotate(90deg) scale(0.5)':'rotate(0deg) scale(1)' }}
        width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
      </svg>
      {/* Moon icon */}
      <svg
        style={{ position:'absolute', transition:'opacity 0.2s, transform 0.2s', opacity:darkMode?1:0, transform:darkMode?'rotate(0deg) scale(1)':'rotate(-90deg) scale(0.5)', color:'#a78bfa' }}
        width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
      </svg>
    </button>
  );
}

function DdItem({ icon, label, sub, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{ width:'100%', display:'flex', alignItems:'center', gap:'0.625rem', padding:'0.625rem 0.75rem', borderRadius:'0.75rem', border:'none', background:'transparent', cursor:'pointer', textAlign:'left', transition:'background 0.14s' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      <div style={{ width:'2rem', height:'2rem', borderRadius:'0.5625rem', background:`${color}18`, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <i className={`fas ${icon}`} style={{ fontSize:'0.75rem', color }} />
      </div>
      <div style={{ minWidth:0 }}>
        <p style={{ fontWeight:700, color:'var(--text)', margin:0, fontSize:'0.875rem', lineHeight:1.25 }}>{label}</p>
        {sub && <p style={{ fontSize:'0.7rem', color:'var(--text-3)', margin:'0.1rem 0 0' }}>{sub}</p>}
      </div>
    </button>
  );
}

function MobItem({ icon, label, sub, color, onClick }) {
  return (
    <button onClick={onClick}
      style={{ width:'100%', display:'flex', alignItems:'center', gap:'0.75rem', padding:'0.75rem 0.875rem', borderRadius:'0.875rem', border:'none', background:'transparent', cursor:'pointer', textAlign:'left', transition:'background 0.14s' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      <div style={{ width:'2rem', height:'2rem', borderRadius:'0.625rem', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
        background: color ? `${color}16` : 'var(--bg-3)' }}>
        <i className={`fas ${icon}`} style={{ fontSize:'0.8rem', color: color || 'var(--text-2)' }} />
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontWeight:700, color:'var(--text)', margin:0, fontSize:'0.9rem', lineHeight:1.25 }}>{label}</p>
        {sub && <p style={{ fontSize:'0.7rem', color:'var(--text-3)', margin:'0.1rem 0 0' }}>{sub}</p>}
      </div>
      <i className="fas fa-chevron-right" style={{ fontSize:'0.55rem', color:'var(--text-3)', flexShrink:0 }} />
    </button>
  );
}

// ── Main Header ────────────────────────────────────────────────────────────────
const Header = memo(function Header({
  currentPage, darkMode, toggleDarkMode, onNavigateHome,
  onOpenAdminLogin, onOpenLandlordLogin, onOpenTenantLogin,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [closing,    setClosing]    = useState(false);
  const [portalOpen, setPortalOpen] = useState(false);
  const [mounted,    setMounted]    = useState(false);
  const ddRef      = useRef(null);
  const hoverTimer = useRef(null);

  useEffect(() => { setMounted(true); }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const fn = e => { if (ddRef.current && !ddRef.current.contains(e.target)) setPortalOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const openPortal  = useCallback(() => { clearTimeout(hoverTimer.current); setPortalOpen(true); }, []);
  const closePortal = useCallback(() => { hoverTimer.current = setTimeout(() => setPortalOpen(false), 220); }, []);

  const closeDrawer = useCallback(() => {
    setClosing(true);
    setTimeout(() => { setMobileOpen(false); setClosing(false); }, 260);
  }, []);

  const handleLandlord = useCallback(() => {
    clearTimeout(hoverTimer.current);
    setPortalOpen(false);
    if (onOpenLandlordLogin) onOpenLandlordLogin();
  }, [onOpenLandlordLogin]);

  const handleTenant = useCallback(() => {
    clearTimeout(hoverTimer.current);
    setPortalOpen(false);
    if (onOpenTenantLogin) onOpenTenantLogin();
  }, [onOpenTenantLogin]);

  const handleAdmin = useCallback(() => {
    clearTimeout(hoverTimer.current);
    setPortalOpen(false);
    if (onOpenAdminLogin) onOpenAdminLogin();
  }, [onOpenAdminLogin]);

  return (
    <>
      {/* ── Header bar ────────────────────────────────────────────────────── */}
      <header style={{
        position:'sticky', top:0, zIndex:50,
        background:'var(--bg-2)',
        borderBottom:'1px solid var(--border)',
        backdropFilter:'blur(20px) saturate(160%)',
        WebkitBackdropFilter:'blur(20px) saturate(160%)',
      }}>
        <div style={{ maxWidth:'90rem', margin:'0 auto', padding:'0 1.25rem', height:'56px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'0.75rem' }}>

          {/* Logo */}
          <button onClick={onNavigateHome}
            style={{ display:'flex', alignItems:'center', gap:'0.5rem', background:'none', border:'none', cursor:'pointer', padding:0, flexShrink:0 }}>
            <div style={{ width:'1.875rem', height:'1.875rem', background:'linear-gradient(135deg,#5b21b6,#7c3aed)', borderRadius:'0.5rem', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 8px rgba(91,33,182,0.3)' }}>
              <span style={{ fontSize:'0.8rem' }}>🏠</span>
            </div>
            <span style={{ fontWeight:900, fontSize:'1rem', letterSpacing:'-0.04em', color:'var(--text)', whiteSpace:'nowrap' }}>LodgeMate</span>
          </button>

          {/* ── Desktop nav ── */}
          <div className="desktop-nav" style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
            {/* Portals dropdown */}
            <div
              ref={ddRef}
              style={{ position:'relative' }}
              onMouseEnter={openPortal}
              onMouseLeave={closePortal}>
              <button
                onClick={() => setPortalOpen(p => !p)}
                style={{
                  display:'flex', alignItems:'center', gap:'0.4rem',
                  padding:'0.4375rem 0.875rem', borderRadius:'0.75rem', border:'none',
                  background: portalOpen ? 'var(--violet)' : 'var(--bg-3)',
                  color: portalOpen ? 'white' : 'var(--text)',
                  fontFamily:'inherit', fontSize:'0.8125rem', fontWeight:700,
                  cursor:'pointer', transition:'all 0.18s', whiteSpace:'nowrap',
                  boxShadow: portalOpen ? '0 3px 12px rgba(124,58,237,0.3)' : 'none',
                }}>
                <i className="fas fa-th-large" style={{ fontSize:'0.65rem', opacity:0.85 }} />
                Portals
                <i className={`fas fa-chevron-${portalOpen ? 'up' : 'down'}`} style={{ fontSize:'0.5rem', opacity:0.75 }} />
              </button>

              {/* Dropdown */}
              <div
                onMouseEnter={openPortal}
                onMouseLeave={closePortal}
                style={{
                  position:'absolute', top:'calc(100% + 0.25rem)', right:0,
                  width:'15.5rem', background:'var(--bg)',
                  border:'1.5px solid var(--border)', borderRadius:'0.875rem',
                  boxShadow:'0 10px 40px rgba(0,0,0,0.13)',
                  zIndex:300,
                  opacity: portalOpen ? 1 : 0,
                  transform: portalOpen ? 'translateY(0) scale(1)' : 'translateY(-6px) scale(0.97)',
                  pointerEvents: portalOpen ? 'auto' : 'none',
                  transition:'opacity 0.16s ease, transform 0.16s cubic-bezier(0.34,1.56,0.64,1)',
                  transformOrigin:'top right',
                }}>
                <div style={{ padding:'0.375rem' }}>
                  <DdItem icon="fa-building" label="Landlord Portal" sub="Manage apartments & tenants" color="var(--violet)" onClick={handleLandlord} />
                  <DdItem icon="fa-key"      label="Tenant Access"   sub="Enter with your OTP code"   color="var(--green)"  onClick={handleTenant} />
                </div>
                <div style={{ borderTop:'1px solid var(--border)', padding:'0.375rem' }}>
                  <DdItem icon="fa-lock" label="Admin Login" sub="LodgeMate staff only" color="#6366f1" onClick={handleAdmin} />
                </div>
              </div>
            </div>

            <ThemeToggle darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
          </div>

          {/* ── Mobile nav ── */}
          <div className="mobile-nav" style={{ display:'none', alignItems:'center', gap:'0.5rem' }}>
            <ThemeToggle darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
            {/* Hamburger */}
            <button
              onClick={() => mobileOpen ? closeDrawer() : setMobileOpen(true)}
              style={{
                width:'2.25rem', height:'2.25rem', borderRadius:'0.625rem',
                border:`1.5px solid ${mobileOpen ? 'var(--violet)' : 'var(--border-2)'}`,
                background: mobileOpen ? 'var(--violet)' : 'var(--bg-3)',
                cursor:'pointer', flexShrink:0, padding:'0.4375rem',
                display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'3.5px',
                transition:'background 0.2s, border-color 0.2s',
              }}>
              <span style={{ display:'block', width:'14px', height:'1.5px', borderRadius:'9999px', background:mobileOpen?'white':'var(--text)', transition:'transform 0.25s', transform:mobileOpen?'translateY(5px) rotate(45deg)':'none' }} />
              <span style={{ display:'block', width:'9px', height:'1.5px', borderRadius:'9999px', background:mobileOpen?'white':'var(--text)', opacity:mobileOpen?0:1, transition:'opacity 0.15s', alignSelf:'flex-start' }} />
              <span style={{ display:'block', width:'14px', height:'1.5px', borderRadius:'9999px', background:mobileOpen?'white':'var(--text)', transition:'transform 0.25s', transform:mobileOpen?'translateY(-5px) rotate(-45deg)':'none' }} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile drawer ── */}
      {mounted && mobileOpen && createPortal(
        <div style={{ position:'fixed', inset:0, zIndex:9999 }}>
          <div onClick={closeDrawer}
            style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(3px)', animation:'fadeIn 0.18s ease both' }} />
          <nav className={closing ? 'drawer-out' : 'drawer-in'}
            style={{ position:'absolute', top:0, right:0, bottom:0, width:'min(18rem,86vw)', background:'var(--bg)', borderLeft:'1px solid var(--border)', boxShadow:'-12px 0 48px rgba(0,0,0,0.18)', display:'flex', flexDirection:'column' }}>

            <div style={{ height:'56px', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 1rem', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                <div style={{ width:'1.625rem', height:'1.625rem', background:'linear-gradient(135deg,#5b21b6,#7c3aed)', borderRadius:'0.4375rem', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ fontSize:'0.75rem' }}>🏠</span>
                </div>
                <span style={{ fontWeight:900, fontSize:'0.9375rem', letterSpacing:'-0.04em', color:'var(--text)' }}>LodgeMate</span>
              </div>
              <button onClick={closeDrawer}
                style={{ width:'1.875rem', height:'1.875rem', borderRadius:'50%', border:'none', background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-3)', transition:'all 0.18s' }}
                onMouseEnter={e => { e.currentTarget.style.background='rgba(239,68,68,0.1)'; e.currentTarget.style.color='#ef4444'; }}
                onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--text-3)'; }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/></svg>
              </button>
            </div>

            <div style={{ flex:1, overflowY:'auto', padding:'0.5rem 0.5rem', display:'flex', flexDirection:'column', gap:'0.125rem' }}>
              <MobItem icon="fa-home" label="Home" onClick={() => { onNavigateHome(); closeDrawer(); }} />
              <p style={{ fontSize:'0.6rem', fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.1em', margin:'0.75rem 0.75rem 0.25rem', lineHeight:1 }}>Portals</p>
              <MobItem icon="fa-building" label="Landlord Portal" sub="Manage apartments & tenants" color="var(--violet)"
                onClick={() => { if (onOpenLandlordLogin) { onOpenLandlordLogin(); closeDrawer(); } }} />
              <MobItem icon="fa-key" label="Tenant Access" sub="Enter with your OTP code" color="var(--green)"
                onClick={() => { if (onOpenTenantLogin) { onOpenTenantLogin(); closeDrawer(); } }} />
              <p style={{ fontSize:'0.6rem', fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.1em', margin:'0.75rem 0.75rem 0.25rem', lineHeight:1 }}>System</p>
              <MobItem icon="fa-lock" label="Admin Login" sub="LodgeMate staff only" color="#6366f1"
                onClick={() => { if (onOpenAdminLogin) { onOpenAdminLogin(); closeDrawer(); } }} />
            </div>

            <div style={{ padding:'0.875rem 1rem', borderTop:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
              <div>
                <p style={{ fontWeight:700, fontSize:'0.875rem', color:'var(--text)', margin:'0 0 0.1rem' }}>{darkMode ? 'Dark mode' : 'Light mode'}</p>
                <p style={{ fontSize:'0.7rem', color:'var(--text-3)', margin:0 }}>Tap to switch</p>
              </div>
              <ThemeToggle darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
            </div>
          </nav>
        </div>,
        document.body
      )}
    </>
  );
});

export default Header;
