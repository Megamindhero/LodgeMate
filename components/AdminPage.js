'use client';
import { useState, useCallback, memo } from 'react';
import Header from './Header';
import { compressImage } from '@/lib/compressImage';
import { validatePropertyForm, buildSafeProperty, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE_MB } from '@/lib/validation';

function AdminForm({ onSave }) {
  const [form, setForm] = useState({ title:'', location:'', description:'', price:'', videoLink:'', images:[], whatsappNumber:'+234' });
  const [saving, setSaving] = useState(false);
  const set = useCallback((k, v) => setForm(p => ({ ...p, [k]: v })), []);

  const onFiles = useCallback((e) => {
    Array.from(e.target.files).forEach(file => {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) { alert(`"${file.name}" is not allowed. Use JPG, PNG, WebP.`); return; }
      if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) { alert(`"${file.name}" is too large (max ${MAX_IMAGE_SIZE_MB}MB).`); return; }
      const reader = new FileReader();
      reader.onload = ev => {
        const result = ev.target.result;
        if (!result.startsWith('data:image/')) { alert(`"${file.name}" is not a valid image.`); return; }
        compressImage(result, 1024, 768, 0.65).then(compressed => {
          setForm(p => p.images.length >= 10 ? p : { ...p, images: [...p.images, compressed] });
        });
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const removeImg = useCallback(i => setForm(p => ({ ...p, images: p.images.filter((_,j) => j !== i) })), []);

  const submit = async e => {
    e.preventDefault();
    const err = validatePropertyForm(form);
    if (err) { alert(err); return; }
    try {
      setSaving(true);
      await onSave(form);
      setForm({ title:'', location:'', description:'', price:'', videoLink:'', images:[], whatsappNumber:'+234' });
      alert('Property added successfully!');
    } catch (err) { alert('Error: ' + err.message); }
    finally { setSaving(false); }
  };

  const Field = ({ label, optional, children }) => (
    <div>
      <label className="lm-label">
        {label}{optional && <span style={{ fontWeight:400, color:'var(--text-3)', marginLeft:'0.35rem' }}>(optional)</span>}
      </label>
      {children}
    </div>
  );

  return (
    <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
      <div className="admin-form-grid">
        <div style={{ gridColumn:'1/-1' }}>
          <Field label="Property Title *">
            <input type="text" value={form.title} onChange={e=>set('title',e.target.value)} className="lm-input" placeholder="e.g. 3-Bed Flat, Gidan-Mango" autoComplete="off" autoCorrect="off" spellCheck="false" />
          </Field>
        </div>
        <Field label="📍 Location *">
          <input type="text" value={form.location} onChange={e=>set('location',e.target.value)} className="lm-input" placeholder="Gidan-Mango, Minna" autoComplete="off" />
        </Field>
        <Field label="💰 Price (₦/year)" optional>
          <input type="number" value={form.price} onChange={e=>set('price',e.target.value)} className="lm-input" placeholder="e.g. 500000" />
        </Field>
      </div>

      <Field label="📝 Description *">
        <textarea value={form.description} onChange={e=>set('description',e.target.value)} maxLength={300} rows={4} className="lm-textarea" placeholder="Describe the property, number of rooms, features, access..." />
        <p style={{ fontSize:'0.75rem', color: form.description.length > 270 ? '#ef4444' : 'var(--text-3)', marginTop:'0.25rem', textAlign:'right' }}>{form.description.length}/300</p>
      </Field>

      <div className="admin-form-grid">
        <Field label="📱 WhatsApp Number *">
          <input type="tel" value={form.whatsappNumber} onChange={e=>set('whatsappNumber',e.target.value)} className="lm-input" placeholder="+2348012345678" autoComplete="tel" />
        </Field>
        <Field label="🎬 Video Tour URL" optional>
          <input type="url" value={form.videoLink} onChange={e=>set('videoLink',e.target.value)} className="lm-input" placeholder="https://youtube.com/..." />
        </Field>
      </div>

      <Field label={`📸 Photos * (${form.images.length}/10)`}>
        <label style={{ display:'flex', alignItems:'center', gap:'0.625rem', padding:'0.875rem 1rem', background:'var(--bg-3)', border:'1.5px dashed var(--border-2)', borderRadius:'0.875rem', cursor:'pointer', transition:'border-color 0.15s' }}
          onMouseEnter={e=>e.currentTarget.style.borderColor='var(--violet)'}
          onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border-2)'}>
          <i className="fas fa-cloud-upload-alt" style={{ fontSize:'1.25rem', color:'var(--violet)' }}></i>
          <span style={{ fontSize:'0.875rem', color:'var(--text-2)', fontWeight:500 }}>Click to upload images</span>
          <input type="file" multiple accept="image/*" onChange={onFiles} style={{ display:'none' }} />
        </label>
        {form.images.length > 0 && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'0.5rem', marginTop:'0.75rem' }}>
            {form.images.map((img, i) => (
              <div key={i} style={{ position:'relative', aspectRatio:'1', borderRadius:'0.625rem', overflow:'hidden', border:'1px solid var(--border)' }}>
                <img src={img} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} loading="lazy" decoding="async" />
                <button type="button" onClick={() => removeImg(i)}
                  style={{ position:'absolute', top:'0.2rem', right:'0.2rem', width:'1.375rem', height:'1.375rem', background:'rgba(239,68,68,0.9)', border:'none', borderRadius:'9999px', color:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <i className="fas fa-times" style={{ fontSize:'0.5rem' }}></i>
                </button>
              </div>
            ))}
          </div>
        )}
      </Field>

      <button type="submit" disabled={saving} className="btn btn-primary"
        style={{ width:'100%', height:'3rem', marginTop:'0.5rem', opacity:saving?0.7:1 }}>
        {saving ? <><span className="spinner" style={{ marginRight:'0.5rem' }}></span>Adding Property...</> : <><i className="fas fa-plus-circle"></i>Add Property</>}
      </button>
    </form>
  );
}

const AdminPage = memo(function AdminPage({ properties, darkMode, toggleDarkMode, onLogout, onSave, onDelete, onEdit, onToggleFeatured, onToggleAvailable, onOpenLightbox, onOpenAdminLogin }) {
  const [search, setSearch] = useState('');
  const filtered = properties.filter(p =>
    !search || p.title?.toLowerCase().includes(search.toLowerCase()) || p.location?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
      <Header currentPage="admin" darkMode={darkMode} toggleDarkMode={toggleDarkMode} onNavigateHome={onLogout} onOpenAdminLogin={onOpenAdminLogin} />

      <div style={{ maxWidth:'84rem', margin:'0 auto', padding:'2rem 1.5rem 5rem' }}>
        {/* Page header */}
        <div className="anim-up" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'2rem', flexWrap:'wrap', gap:'1rem' }}>
          <div>
            <div className="section-label"><i className="fas fa-cog" style={{ fontSize:'0.65rem' }}></i>Control Panel</div>
            <h1 style={{ fontWeight:900, fontSize:'clamp(1.5rem,3vw,2rem)', letterSpacing:'-0.04em', color:'var(--text)', margin:0 }}>Admin Dashboard</h1>
            <p style={{ fontSize:'0.875rem', color:'var(--text-2)', marginTop:'0.25rem' }}>{properties.length} listing{properties.length !== 1 ? 's' : ''} total</p>
          </div>
          <button onClick={onLogout} className="btn btn-danger btn-sm">
            <i className="fas fa-sign-out-alt" style={{ fontSize:'0.75rem' }}></i>Sign Out
          </button>
        </div>

        {/* Tip banner */}
        <div className="anim-up-1" style={{ background:'rgba(251,191,36,0.06)', border:'1px solid rgba(251,191,36,0.2)', borderRadius:'1rem', padding:'0.875rem 1.125rem', marginBottom:'1.75rem', display:'flex', alignItems:'center', gap:'0.75rem' }}>
          <i className="fas fa-star" style={{ color:'#d97706', fontSize:'0.8rem', flexShrink:0 }}></i>
          <p style={{ fontSize:'0.8125rem', color:'var(--text)', margin:0, lineHeight:1.5 }}>
            <strong>Featured listing</strong> — tap the ⭐ star icon on any listing to pin it in the hero section. Only one listing is featured at a time.
          </p>
        </div>

        {/* Two-column layout */}
        <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1.1fr) minmax(0,1fr)', gap:'1.5rem', alignItems:'start' }} className="admin-grid">
          {/* Add form */}
          <div className="admin-card anim-up-2" style={{ padding:'1.75rem' }}>
            <div style={{ marginBottom:'1.5rem' }}>
              <h2 style={{ fontWeight:800, fontSize:'1.0625rem', color:'var(--text)', margin:'0 0 0.25rem', letterSpacing:'-0.025em' }}>Add New Listing</h2>
              <p style={{ fontSize:'0.8125rem', color:'var(--text-2)', margin:0 }}>Fill in the details to publish a new property.</p>
            </div>
            <AdminForm onSave={onSave} />
          </div>

          {/* Listings list */}
          <div className="admin-card anim-up-3" style={{ padding:'1.75rem' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.125rem', gap:'0.75rem', flexWrap:'wrap' }}>
              <h2 style={{ fontWeight:800, fontSize:'1.0625rem', color:'var(--text)', margin:0, letterSpacing:'-0.025em' }}>
                Listings <span style={{ fontWeight:500, color:'var(--text-3)', fontSize:'0.9rem' }}>({filtered.length})</span>
              </h2>
              <input value={search} onChange={e=>setSearch(e.target.value)} className="lm-input"
                placeholder="Search listings…" style={{ width:'auto', minWidth:'10rem', height:'2.375rem', fontSize:'0.8125rem' }} />
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem', maxHeight:'640px', overflowY:'auto', marginRight:'-0.5rem', paddingRight:'0.5rem' }}>
              {filtered.length === 0 ? (
                <div style={{ textAlign:'center', padding:'3.5rem 1rem' }}>
                  <i className="fas fa-home" style={{ fontSize:'2rem', color:'var(--text-3)', display:'block', marginBottom:'0.75rem' }}></i>
                  <p style={{ color:'var(--text-2)', fontWeight:600, margin:'0 0 0.25rem' }}>{search ? 'No results' : 'No listings yet'}</p>
                  <p style={{ color:'var(--text-3)', fontSize:'0.8125rem', margin:0 }}>{search ? 'Try a different search term' : 'Add your first property using the form'}</p>
                </div>
              ) : filtered.map(p => (
                <div key={p.id}
                  style={{ display:'flex', alignItems:'center', gap:'0.875rem', padding:'0.875rem', borderRadius:'0.875rem', border:'1px solid transparent', transition:'background 0.15s, border-color 0.15s', background:'transparent' }}
                  onMouseEnter={e=>{e.currentTarget.style.background='var(--bg-3)';e.currentTarget.style.borderColor='var(--border)';}}
                  onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.borderColor='transparent';}}>
                  <img src={p.images[0]} alt={p.title} loading="lazy" decoding="async"
                    onClick={() => onOpenLightbox(p.images, 0)}
                    style={{ width:'3.75rem', height:'3.75rem', objectFit:'cover', borderRadius:'0.625rem', flexShrink:0, cursor:'pointer', border:'1px solid var(--border)', transition:'opacity 0.15s' }}
                    onMouseEnter={e=>e.currentTarget.style.opacity='0.75'}
                    onMouseLeave={e=>e.currentTarget.style.opacity='1'} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.375rem', marginBottom:'0.2rem', flexWrap:'wrap' }}>
                      <p style={{ fontWeight:700, fontSize:'0.875rem', color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', margin:0 }}>{p.title}</p>
                      {p.featured && <span style={{ background:'rgba(251,191,36,0.12)', border:'1px solid rgba(251,191,36,0.35)', color:'#d97706', fontSize:'0.6rem', fontWeight:700, padding:'0.1rem 0.4rem', borderRadius:'9999px', flexShrink:0 }}>★ Featured</span>}
                    </div>
                    {p.location && <p style={{ fontSize:'0.75rem', color:'var(--violet)', fontWeight:600, margin:'0 0 0.2rem', display:'flex', alignItems:'center', gap:'0.25rem' }}><i className="fas fa-map-marker-alt" style={{ fontSize:'0.55rem' }}></i>{p.location}</p>}
                    {p.price && <p style={{ fontSize:'0.75rem', color:'var(--text-2)', margin:0 }}>₦{Number(p.price).toLocaleString()}/yr</p>}
                  </div>
                  <div style={{ display:'flex', gap:'0.375rem', flexShrink:0, alignItems:'center', flexWrap:'wrap' }}>
                    {/* Availability toggle */}
                    <button
                      onClick={() => onToggleAvailable(p)}
                      title={p.available === false ? 'Mark as Available' : 'Mark as Not Available'}
                      style={{
                        display:'flex', alignItems:'center', gap:'0.3rem',
                        padding:'0.25rem 0.625rem', borderRadius:'9999px',
                        border:'1.5px solid', cursor:'pointer',
                        fontSize:'0.6875rem', fontWeight:700, fontFamily:'inherit',
                        transition:'all 0.15s', whiteSpace:'nowrap',
                        background: p.available === false
                          ? 'rgba(239,68,68,0.08)' : 'rgba(22,163,74,0.08)',
                        borderColor: p.available === false
                          ? 'rgba(239,68,68,0.35)' : 'rgba(22,163,74,0.35)',
                        color: p.available === false ? '#ef4444' : '#16a34a',
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                    >
                      <span style={{
                        width:'6px', height:'6px', borderRadius:'9999px', flexShrink:0,
                        background: p.available === false ? '#ef4444' : '#22c55e',
                      }} />
                      {p.available === false ? 'Not Available' : 'Available'}
                    </button>
                    <button className="icon-btn violet" onClick={() => onEdit(p)} title="Edit" style={{ width:'2rem', height:'2rem' }}>
                      <i className="fas fa-pen" style={{ fontSize:'0.625rem' }}></i>
                    </button>
                    <button className={`icon-btn gold ${p.featured ? 'active' : ''}`} onClick={() => onToggleFeatured(p)} title={p.featured ? 'Remove featured' : 'Feature'} style={{ width:'2rem', height:'2rem' }}>
                      <i className="fas fa-star" style={{ fontSize:'0.625rem' }}></i>
                    </button>
                    <button className="icon-btn red" onClick={() => onDelete(p.id)} title="Delete" style={{ width:'2rem', height:'2rem' }}>
                      <i className="fas fa-trash" style={{ fontSize:'0.625rem' }}></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media(max-width:860px) {
          .admin-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
});

export default AdminPage;
