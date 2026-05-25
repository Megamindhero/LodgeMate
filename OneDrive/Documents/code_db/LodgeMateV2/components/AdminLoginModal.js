'use client';
import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function AdminLoginModal({ onLogin, onClose }) {
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c-1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const attempt = async () => {
    if (cooldown > 0) return;
    if (!email.trim() || !pwd.trim()) { setErr('Enter both email and password.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setErr('Enter a valid email address.'); return; }
    setBusy(true); setErr('');
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pwd);
      onLogin();
    } catch (e) {
      const code = e.code || '';
      const n = attempts + 1; setAttempts(n);
      if (['auth/wrong-password','auth/invalid-credential','auth/user-not-found'].includes(code))
        setErr(`Incorrect credentials.${n >= 3 ? ` (${n} attempts)` : ''}`);
      else if (code === 'auth/too-many-requests') { setErr('Account locked. Try again later.'); setCooldown(60); }
      else setErr('Login failed. Try again.');
      if (n >= 5) { setCooldown(30); setErr('Too many attempts. Wait 30s.'); }
    }
    setBusy(false);
  };

  return (
    <div className="modal-back" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="modal-box" style={{ maxWidth:'24rem', padding:'2.25rem' }}>
        {/* Icon */}
        <div style={{ display:'flex', alignItems:'center', gap:'1rem', marginBottom:'1.75rem' }}>
          <div style={{ width:'3rem', height:'3rem', borderRadius:'0.875rem', background:'linear-gradient(135deg,#5b21b6,#7c3aed)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 4px 16px rgba(91,33,182,0.3)' }}>
            <i className="fas fa-lock" style={{ fontSize:'1rem', color:'white' }}></i>
          </div>
          <div>
            <h2 style={{ fontWeight:900, fontSize:'1.125rem', color:'var(--text)', margin:'0 0 0.125rem', letterSpacing:'-0.03em' }}>Admin Sign In</h2>
            <p style={{ fontSize:'0.8125rem', color:'var(--text-2)', margin:0 }}>Manage your property listings</p>
          </div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:'0.875rem', marginBottom:'1.125rem' }}>
          <div>
            <label className="lm-label">Email address</label>
            <input type="email" value={email} onChange={e=>{setEmail(e.target.value);setErr('');}}
              onKeyDown={e=>e.key==='Enter'&&attempt()} autoFocus
              placeholder="admin@example.com" className="lm-input"
              style={{ borderColor:err?'#ef4444':undefined }} />
          </div>
          <div>
            <label className="lm-label">Password</label>
            <div style={{ position:'relative' }}>
              <input type={showPwd?'text':'password'} value={pwd} onChange={e=>{setPwd(e.target.value);setErr('');}}
                onKeyDown={e=>e.key==='Enter'&&attempt()}
                placeholder="••••••••" className="lm-input"
                style={{ borderColor:err?'#ef4444':undefined, paddingRight:'2.75rem' }} />
              <button type="button" onClick={()=>setShowPwd(s=>!s)}
                style={{ position:'absolute', right:'0.75rem', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--text-3)', padding:0, display:'flex', alignItems:'center' }}>
                <i className={`fas ${showPwd?'fa-eye-slash':'fa-eye'}`} style={{ fontSize:'0.875rem' }}></i>
              </button>
            </div>
          </div>
        </div>

        {err && (
          <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:'0.75rem', padding:'0.625rem 0.875rem', marginBottom:'1rem' }}>
            <i className="fas fa-exclamation-circle" style={{ color:'#ef4444', fontSize:'0.8rem', flexShrink:0 }}></i>
            <p style={{ color:'#ef4444', fontSize:'0.8125rem', margin:0, lineHeight:1.4 }}>{err}</p>
          </div>
        )}
        {cooldown > 0 && (
          <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', background:'rgba(251,191,36,0.06)', border:'1px solid rgba(251,191,36,0.2)', borderRadius:'0.75rem', padding:'0.625rem 0.875rem', marginBottom:'1rem' }}>
            <i className="fas fa-clock" style={{ color:'#d97706', fontSize:'0.8rem', flexShrink:0 }}></i>
            <p style={{ color:'#d97706', fontSize:'0.8125rem', margin:0 }}>Wait {cooldown}s before retrying</p>
          </div>
        )}

        <div style={{ display:'flex', gap:'0.75rem' }}>
          <button onClick={attempt} disabled={busy||cooldown>0} className="btn btn-primary"
            style={{ flex:2, height:'3rem', opacity:(busy||cooldown>0)?0.65:1 }}>
            {busy ? <><span className="spinner" style={{ marginRight:'0.5rem' }}></span>Signing in…</> : 'Sign In'}
          </button>
          <button onClick={onClose} className="btn btn-ghost" style={{ flex:1, height:'3rem' }}>Cancel</button>
        </div>

        <p style={{ fontSize:'0.6875rem', color:'var(--text-3)', textAlign:'center', marginTop:'1.25rem', margin:'1.25rem 0 0', lineHeight:1.5 }}>
          <i className="fas fa-shield-alt" style={{ marginRight:'0.3rem', color:'var(--violet)' }}></i>
          Secured with Firebase Authentication
        </p>
      </div>
    </div>
  );
}
