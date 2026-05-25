'use client';
import { useState } from 'react';
import { ref, get, update } from 'firebase/database';
import { db } from '@/lib/firebase';
import { isOTPValid, formatExpiry } from '@/lib/otp';

// Sanitize text — strip HTML/script injection attempts
function sanitize(str) {
  return String(str).replace(/<[^>]*>/g, '').replace(/[<>'"]/g, '').trim().slice(0, 200);
}

export default function TenantLoginModal({ onLogin, onClose }) {
  const [step, setStep]       = useState('otp');
  const [code, setCode]       = useState('');
  const [name, setName]       = useState('');
  const [verified, setVerified] = useState(null);
  const [err, setErr]         = useState('');
  const [busy, setBusy]       = useState(false);

  const handleCodeInput = (e) => {
    // Only allow alphanumeric, auto-uppercase, max 10 chars
    setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10));
    setErr('');
  };

  const verifyOTP = async () => {
    const otp = code.trim().toUpperCase();
    if (otp.length < 6) { setErr('Enter your full OTP code.'); return; }
    // Block obviously malformed codes (all same char, sequential)
    if (/^(.)\1+$/.test(otp)) { setErr('Invalid OTP code.'); return; }
    setBusy(true); setErr('');
    try {
      const snap = await get(ref(db, `tenants/${otp}`));
      if (!snap.exists()) {
        setErr('Invalid OTP code. Check with your landlord or LodgeMate.');
        setBusy(false); return;
      }
      const data = snap.val();

      // Validate record has required fields
      if (!data.landlordId || !data.aptId || !data.expiresAt) {
        setErr('Invalid OTP record. Contact LodgeMate admin.');
        setBusy(false); return;
      }

      if (!isOTPValid(data.expiresAt)) {
        setErr(`This OTP expired on ${formatExpiry(data.expiresAt)}. Contact your landlord for renewal.`);
        setBusy(false); return;
      }

      // Check apartment still exists
      const aptSnap = await get(ref(db, `apartments/${data.landlordId}/${data.aptId}`));
      if (!aptSnap.exists()) {
        setErr('This apartment no longer exists. Contact LodgeMate for a new code.');
        setBusy(false); return;
      }

      const session = {
        otp,
        landlordId: data.landlordId,
        aptId:      data.aptId,
        expiresAt:  data.expiresAt,
        tenantName: data.tenantName || '',
        loginAt:    new Date().toISOString(),
      };

      // RETURNING tenant — skip name step, log them in directly
      if (data.tenantName && data.tenantName.trim().length > 0) {
        // Update lastLogin timestamp silently
        await update(ref(db, `tenants/${otp}`), { lastLogin: new Date().toISOString() });
        sessionStorage.setItem('lm_tenant', JSON.stringify(session));
        onLogin(session);
        setBusy(false);
        return;
      }

      // NEW tenant — go to name step
      setVerified({ otp, ...data });
      setName('');
      setStep('name');
    } catch {
      setErr('Something went wrong. Try again.');
    }
    setBusy(false);
  };

  const confirmName = async () => {
    const trimmedName = sanitize(name);
    if (!trimmedName || trimmedName.length < 2) { setErr('Please enter your full name (at least 2 characters).'); return; }
    if (trimmedName.length > 60) { setErr('Name is too long (max 60 characters).'); return; }
    // Block names that look like code injection
    if (/[{}[\]\\|^`]/.test(trimmedName)) { setErr('Name contains invalid characters.'); return; }
    setBusy(true); setErr('');
    try {
      await update(ref(db, `tenants/${verified.otp}`), {
        tenantName: trimmedName,
        lastLogin:  new Date().toISOString(),
      });
      const session = {
        otp:        verified.otp,
        landlordId: verified.landlordId,
        aptId:      verified.aptId,
        expiresAt:  verified.expiresAt,
        tenantName: trimmedName,
        loginAt:    new Date().toISOString(),
      };
      sessionStorage.setItem('lm_tenant', JSON.stringify(session));
      onLogin(session);
    } catch {
      setErr('Something went wrong. Try again.');
    }
    setBusy(false);
  };

  return (
    <div className="modal-back" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box" style={{ maxWidth:'24rem', padding:'2.25rem' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:'1rem', marginBottom:'1.75rem' }}>
          <div style={{ width:'3rem', height:'3rem', borderRadius:'0.875rem', background:'linear-gradient(135deg,#0f6e56,#1d9e75)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 4px 16px rgba(29,158,117,0.3)' }}>
            <i className={`fas ${step === 'otp' ? 'fa-key' : 'fa-user'}`} style={{ fontSize:'1rem', color:'white' }}></i>
          </div>
          <div>
            <h2 style={{ fontWeight:900, fontSize:'1.125rem', color:'var(--text)', margin:'0 0 0.125rem', letterSpacing:'-0.03em' }}>
              {step === 'otp' ? 'Tenant Access' : 'One last thing'}
            </h2>
            <p style={{ fontSize:'0.8125rem', color:'var(--text-2)', margin:0 }}>
              {step === 'otp' ? 'Enter the OTP your landlord gave you' : 'What should we call you?'}
            </p>
          </div>
        </div>

        {/* OTP step */}
        {step === 'otp' && (
          <form onSubmit={e => { e.preventDefault(); verifyOTP(); }} style={{ marginBottom:'1.25rem' }}>
            <label className="lm-label">OTP Code</label>
            <input type="text" value={code} onChange={handleCodeInput}
              autoFocus autoComplete="one-time-code" id="tenant-otp" name="tenant-otp"
              autoCorrect="off" spellCheck="false"
              placeholder="e.g. ABC12345" className="lm-input"
              style={{ letterSpacing:'0.2em', fontWeight:700, fontSize:'1.1rem', textAlign:'center', borderColor: err ? '#ef4444' : undefined }} />
            <p style={{ fontSize:'0.75rem', color:'var(--text-3)', marginTop:'0.5rem', lineHeight:1.5 }}>
              <i className="fas fa-info-circle" style={{ marginRight:'0.35rem' }}></i>
              Given to you physically by your landlord or LodgeMate.
            </p>
            {/* Hidden submit for password manager */}
            <button type="submit" style={{ display:'none' }} aria-hidden="true">Verify</button>
          </form>
        )}

        {/* Name step — only for new tenants */}
        {step === 'name' && (
          <div style={{ marginBottom:'1.25rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', background:'rgba(21,128,61,0.07)', border:'1px solid rgba(21,128,61,0.2)', borderRadius:'0.75rem', padding:'0.625rem 0.875rem', marginBottom:'1.25rem' }}>
              <i className="fas fa-check-circle" style={{ color:'var(--green)', fontSize:'0.85rem', flexShrink:0 }}></i>
              <p style={{ color:'var(--green)', fontSize:'0.8125rem', margin:0, fontWeight:600 }}>
                Code verified — <span style={{ fontFamily:'monospace', letterSpacing:'0.1em' }}>{verified?.otp}</span>
              </p>
            </div>
            <label className="lm-label">Your Full Name</label>
            <input type="text" value={name} onChange={e => { setName(e.target.value); setErr(''); }}
              onKeyDown={e => e.key === 'Enter' && confirmName()}
              autoFocus placeholder="e.g. Aminu Bello" className="lm-input"
              maxLength={60} style={{ borderColor: err ? '#ef4444' : undefined }} />
            <p style={{ fontSize:'0.75rem', color:'var(--text-3)', marginTop:'0.5rem', lineHeight:1.5 }}>
              <i className="fas fa-info-circle" style={{ marginRight:'0.35rem' }}></i>
              Visible to your landlord only. You can update it anytime from your dashboard.
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
          {step === 'otp' ? (
            <>
              <button onClick={verifyOTP} disabled={busy || code.length < 6}
                style={{ flex:2, height:'3rem', borderRadius:'0.875rem', border:'none', background:'var(--green-2)', color:'white', fontFamily:'inherit', fontSize:'0.9rem', fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem', opacity:(busy||code.length<6)?0.6:1 }}>
                {busy ? <><span className="spinner" style={{ marginRight:'0.5rem' }}></span>Verifying…</> : <><i className="fas fa-unlock-alt"></i>Verify Code</>}
              </button>
              <button onClick={onClose} className="btn btn-ghost" style={{ flex:1, height:'3rem' }}>Cancel</button>
            </>
          ) : (
            <>
              <button onClick={() => { setStep('otp'); setErr(''); }} className="btn btn-ghost" style={{ flex:1, height:'3rem' }}>
                <i className="fas fa-arrow-left" style={{ fontSize:'0.7rem' }}></i>Back
              </button>
              <button onClick={confirmName} disabled={busy || name.trim().length < 2}
                style={{ flex:2, height:'3rem', borderRadius:'0.875rem', border:'none', background:'var(--green-2)', color:'white', fontFamily:'inherit', fontSize:'0.9rem', fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem', opacity:(busy||name.trim().length<2)?0.6:1 }}>
                {busy ? <><span className="spinner" style={{ marginRight:'0.5rem' }}></span>Saving…</> : <><i className="fas fa-sign-in-alt"></i>Enter My Portal</>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
