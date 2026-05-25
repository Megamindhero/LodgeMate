'use client';
import { useState } from 'react';
import { ref, get, update } from 'firebase/database';
import { db } from '@/lib/firebase';
import { stripLandlordCode, formatLandlordCode } from '@/lib/codes';

// Landlords log in with a 10-digit code issued by admin
// On first use they enter their name + email, which gets saved to their record
export default function LandlordLoginModal({ onLogin, onClose }) {
  const [step, setStep]     = useState('code');  // 'code' | 'profile'
  const [code, setCode]     = useState('');
  const [name, setName]     = useState('');
  const [email, setEmail]   = useState('');
  const [record, setRecord] = useState(null);    // DB record after code verified
  const [err, setErr]       = useState('');
  const [busy, setBusy]     = useState(false);

  const handleCodeInput = (e) => {
    const raw = stripLandlordCode(e.target.value);
    setCode(raw);
    setErr('');
  };

  const displayCode = code
    ? code.length > 7 ? `${code.slice(0,4)}-${code.slice(4,7)}-${code.slice(7)}`
    : code.length > 4 ? `${code.slice(0,4)}-${code.slice(4)}`
    : code
    : '';

  const verifyCode = async () => {
    if (code.length !== 10) { setErr('Enter your full 10-digit code.'); return; }
    setBusy(true); setErr('');
    try {
      const snap = await get(ref(db, `landlordCodes/${code}`));
      if (!snap.exists()) {
        setErr('Invalid code. Check with LodgeMate admin.');
        setBusy(false); return;
      }
      const data = snap.val();
      if (data.revoked) {
        setErr('This code has been revoked. Contact LodgeMate admin.');
        setBusy(false); return;
      }

      // RETURNING landlord — already has name+email, skip profile step
      if (data.activated && data.name && data.email) {
        await update(ref(db, `landlordCodes/${code}`), { lastLogin: new Date().toISOString() });
        const session = { code, landlordId: data.landlordId, name: data.name, email: data.email };
        sessionStorage.setItem('lm_landlord', JSON.stringify(session));
        onLogin(session);
        setBusy(false);
        return;
      }

      // NEW landlord — needs to set name+email
      setRecord({ code, ...data });
      setName(data.name || '');
      setEmail(data.email || '');
      setStep('profile');
    } catch { setErr('Something went wrong. Try again.'); }
    setBusy(false);
  };

  const confirmProfile = async () => {
    const cleanName  = String(name).replace(/<[^>]*>/g,'').replace(/[<>'"\\]/g,'').trim().slice(0,60);
    const cleanEmail = String(email).trim().toLowerCase().slice(0,100);
    if (!cleanName || cleanName.length < 2) { setErr('Enter your full name (at least 2 characters).'); return; }
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErr('Enter a valid email address.'); return;
    }
    setBusy(true); setErr('');
    try {
      const updates = {
        name:      cleanName,
        email:     cleanEmail,
        lastLogin: new Date().toISOString(),
        activated: true,
      };
      await update(ref(db, `landlordCodes/${code}`), updates);
      const session = { code, landlordId: record.landlordId, name: cleanName, email: cleanEmail };
      sessionStorage.setItem('lm_landlord', JSON.stringify(session));
      onLogin(session);
    } catch { setErr('Something went wrong. Try again.'); }
    setBusy(false);
  };

  return (
    <div className="modal-back" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box" style={{ maxWidth:'24rem', padding:'2.25rem' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:'1rem', marginBottom:'1.75rem' }}>
          <div style={{ width:'3rem', height:'3rem', borderRadius:'0.875rem', background:'linear-gradient(135deg,#5b21b6,#7c3aed)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 4px 16px rgba(91,33,182,0.3)' }}>
            <i className={`fas ${step === 'code' ? 'fa-building' : 'fa-user-tie'}`} style={{ fontSize:'1rem', color:'white' }}></i>
          </div>
          <div>
            <h2 style={{ fontWeight:900, fontSize:'1.125rem', color:'var(--text)', margin:'0 0 0.125rem', letterSpacing:'-0.03em' }}>
              {step === 'code' ? 'Landlord Portal' : 'Your Profile'}
            </h2>
            <p style={{ fontSize:'0.8125rem', color:'var(--text-2)', margin:0 }}>
              {step === 'code' ? 'Enter the code given to you by LodgeMate' : 'Set your name and email to continue'}
            </p>
          </div>
        </div>

        {/* Step dots */}
        <div style={{ display:'flex', gap:'0.375rem', marginBottom:'1.5rem' }}>
          {['code','profile'].map((s, i) => (
            <div key={s} style={{ flex:1, height:'3px', borderRadius:'9999px', background: i === 0 || step === 'profile' ? 'var(--violet)' : 'var(--border-2)', transition:'all 0.3s' }} />
          ))}
        </div>

        {/* Code step */}
        {step === 'code' && (
          <form onSubmit={e => { e.preventDefault(); verifyCode(); }} style={{ marginBottom:'1.25rem' }}>
            <label className="lm-label">Your 10-Digit Access Code</label>
            <input
              type="text"
              inputMode="numeric"
              value={displayCode}
              onChange={handleCodeInput}
              autoFocus
              autoComplete="one-time-code"
              id="landlord-code"
              name="landlord-code"
              placeholder="1234-567-890"
              className="lm-input"
              style={{ letterSpacing:'0.2em', fontWeight:700, fontSize:'1.125rem', textAlign:'center', borderColor: err ? '#ef4444' : undefined }}
            />
            <p style={{ fontSize:'0.75rem', color:'var(--text-3)', marginTop:'0.5rem', lineHeight:1.5 }}>
              <i className="fas fa-info-circle" style={{ marginRight:'0.35rem' }}></i>
              This code was given to you by LodgeMate admin. Contact us if you lost it.
            </p>
            <button type="submit" style={{ display:'none' }} aria-hidden="true">Continue</button>
          </form>
        )}

        {/* Profile step */}
        {step === 'profile' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'0.875rem', marginBottom:'1.25rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', background:'rgba(91,33,182,0.06)', border:'1px solid rgba(91,33,182,0.2)', borderRadius:'0.75rem', padding:'0.625rem 0.875rem' }}>
              <i className="fas fa-check-circle" style={{ color:'var(--violet)', fontSize:'0.85rem' }}></i>
              <p style={{ color:'var(--violet)', fontSize:'0.8125rem', margin:0, fontWeight:600 }}>
                Code verified — <span style={{ fontFamily:'monospace', letterSpacing:'0.1em' }}>{formatLandlordCode(code)}</span>
              </p>
            </div>
            <div>
              <label className="lm-label">Your Full Name</label>
              <input type="text" value={name} onChange={e=>{setName(e.target.value);setErr('');}}
                onKeyDown={e=>e.key==='Enter'&&confirmProfile()} autoFocus
                placeholder="e.g. Alhaji Suleiman" className="lm-input" maxLength={60} />
            </div>
            <div>
              <label className="lm-label">Your Email Address</label>
              <input type="email" value={email} onChange={e=>{setEmail(e.target.value);setErr('');}}
                onKeyDown={e=>e.key==='Enter'&&confirmProfile()}
                placeholder="e.g. suleiman@gmail.com" className="lm-input" />
            </div>
            <p style={{ fontSize:'0.75rem', color:'var(--text-3)', lineHeight:1.5, margin:0 }}>
              <i className="fas fa-eye" style={{ marginRight:'0.35rem', color:'var(--violet)' }}></i>
              Your name and email will be visible to the LodgeMate admin only.
            </p>
          </div>
        )}

        {/* Error */}
        {err && (
          <div style={{ display:'flex', alignItems:'flex-start', gap:'0.5rem', background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:'0.75rem', padding:'0.625rem 0.875rem', marginBottom:'1rem' }}>
            <i className="fas fa-exclamation-circle" style={{ color:'#ef4444', fontSize:'0.8rem', flexShrink:0, marginTop:'0.125rem' }}></i>
            <p style={{ color:'#ef4444', fontSize:'0.8125rem', margin:0, lineHeight:1.5 }}>{err}</p>
          </div>
        )}

        {/* Actions */}
        <div style={{ display:'flex', gap:'0.75rem' }}>
          {step === 'code' ? (
            <>
              <button onClick={verifyCode} disabled={busy || code.length !== 10}
                className="btn btn-primary" style={{ flex:2, height:'3rem', opacity:(busy||code.length!==10)?0.6:1 }}>
                {busy ? <><span className="spinner" style={{ marginRight:'0.5rem' }}></span>Verifying…</> : <><i className="fas fa-arrow-right"></i>Continue</>}
              </button>
              <button onClick={onClose} className="btn btn-ghost" style={{ flex:1, height:'3rem' }}>Cancel</button>
            </>
          ) : (
            <>
              <button onClick={() => { setStep('code'); setErr(''); }} className="btn btn-ghost" style={{ flex:1, height:'3rem' }}>
                <i className="fas fa-arrow-left" style={{ fontSize:'0.7rem' }}></i>Back
              </button>
              <button onClick={confirmProfile} disabled={busy || !name.trim() || !email.trim()}
                className="btn btn-primary" style={{ flex:2, height:'3rem', opacity:(busy||!name.trim()||!email.trim())?0.6:1 }}>
                {busy ? <><span className="spinner" style={{ marginRight:'0.5rem' }}></span>Entering…</> : <><i className="fas fa-sign-in-alt"></i>Enter Portal</>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
