'use client';
import { useState, useCallback } from 'react';
import { compressImage } from '@/lib/compressImage';
import { validatePropertyForm, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE_MB } from '@/lib/validation';

export default function EditModal({ property, onSave, onClose }) {
  const [form, setForm] = useState({
    title:          property.title          || '',
    location:       property.location       || '',
    price:          property.price          || '',
    description:    property.description    || '',
    videoLink:      property.videoLink      || '',
    whatsappNumber: property.whatsappNumber || '+234',
    images:         property.images         || [],
  });
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState('');

  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const onFiles = useCallback((e) => {
    Array.from(e.target.files).forEach((file) => {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) { alert(`"${file.name}" is not an allowed type.`); return; }
      if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) { alert(`"${file.name}" is too large (max ${MAX_IMAGE_SIZE_MB}MB).`); return; }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target.result;
        if (!result.startsWith('data:image/')) { alert('Invalid image file.'); return; }
        compressImage(result, 1024, 768, 0.65).then((compressed) => {
          setForm((prev) => prev.images.length >= 10 ? prev : { ...prev, images: [...prev.images, compressed] });
        });
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const removeImg = (i) => setForm((prev) => ({ ...prev, images: prev.images.filter((_, j) => j !== i) }));

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    const error = validatePropertyForm(form);
    if (error) { setErr(error); return; }

    const clean = {
      ...form,
      featured:  property.featured  || false,
      createdAt: property.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      setSaving(true);
      await onSave(property.id, clean);
      onClose();
    } catch (e) { setErr('Save failed: ' + e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-back"
      style={{ background:'rgba(0,0,0,0.7)',overflowY:'auto' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box" style={{ width:'100%',maxWidth:'32rem',padding:'1.75rem',margin:'auto',maxHeight:'90vh',overflowY:'auto' }}>

        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.5rem' }}>
          <div>
            <h2 style={{ fontWeight:700,fontSize:'1.125rem',letterSpacing:'-0.025em',color:'var(--foreground)',margin:0 }}>Edit Property</h2>
            <p  style={{ marginTop:'0.2rem' }}>Update listing details</p>
          </div>
          <button onClick={onClose} style={{ width:'2rem',height:'2rem',borderRadius:'0.5rem',background:'var(--muted)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--foreground)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--muted)'}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        </div>

        {err && <div style={{ background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.25)',borderRadius:'0.5rem',padding:'0.625rem 0.875rem',marginBottom:'1rem',color:'#ef4444',fontSize:'0.8125rem' }}>{err}</div>}

        <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          <div><label className="lm-label">Title *</label><input value={form.title} onChange={(e) => set('title', e.target.value)} className="lm-input" placeholder="e.g. 3-Bed Flat, Gidan-Mango" /></div>
          <div><label className="lm-label">📍 Location *</label><input value={form.location} onChange={(e) => set('location', e.target.value)} className="lm-input" placeholder="e.g. Gidan-Mango, Minna" /></div>
          <div><label className="lm-label">Price (₦/yr) <span >(optional)</span></label><input type="number" value={form.price} onChange={(e) => set('price', e.target.value)} className="lm-input" placeholder="e.g. 500000" /></div>
          <div>
            <label className="lm-label">Description * <span >(max 300)</span></label>
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} maxLength={300} rows={4} className="lm-textarea" placeholder="Describe the property..." />
            <p  style={{ marginTop:'0.25rem', color: form.description.length > 270 ? '#ef4444' : undefined }}>{form.description.length}/300</p>
          </div>
          <div><label className="lm-label">Video Link <span >(optional)</span></label><input type="url" value={form.videoLink} onChange={(e) => set('videoLink', e.target.value)} className="lm-input" placeholder="https://youtube.com/..." /></div>
          <div><label className="lm-label">WhatsApp Number *</label><input value={form.whatsappNumber} onChange={(e) => set('whatsappNumber', e.target.value)} className="lm-input" placeholder="+2348012345678" /></div>

          <div>
            <label className="lm-label">Images <span >({form.images.length}/10)</span></label>
            <input type="file" multiple accept="image/*" onChange={onFiles} className="lm-input" style={{ height:'auto',padding:'0.375rem',cursor:'pointer' }} />
            {form.images.length > 0 && (
              <div style={{ display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'0.375rem',marginTop:'0.625rem' }}>
                {form.images.map((img, i) => (
                  <div key={i} style={{ position:'relative',aspectRatio:'1',borderRadius:'0.5rem',overflow:'hidden' }}
                    onMouseEnter={(e) => e.currentTarget.querySelector('button').style.opacity = '1'}
                    onMouseLeave={(e) => e.currentTarget.querySelector('button').style.opacity = '0'}>
                    <img src={img} alt="" style={{ width:'100%',height:'100%',objectFit:'cover' }} loading="lazy" />
                    <button type="button" onClick={() => removeImg(i)}
                      style={{ position:'absolute',top:'0.2rem',right:'0.2rem',width:'1.25rem',height:'1.25rem',background:'#ef4444',border:'none',borderRadius:'9999px',color:'white',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',opacity:0,transition:'opacity 0.15s',fontSize:'0.5rem' }}>
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display:'flex', gap:'0.5rem', paddingTop:'0.25rem' }}>
            <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex:1,height:'2.75rem',borderRadius:'0.625rem' }}>Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary" style={{ flex:2,height:'2.75rem',borderRadius:'0.625rem',opacity:saving?0.7:1 }}>
              {saving ? <><span className="spinner" style={{ marginRight:'0.5rem' }}></span>Saving...</> : <><i className="fas fa-check" style={{ marginRight:'0.375rem' }}></i>Save Changes</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
