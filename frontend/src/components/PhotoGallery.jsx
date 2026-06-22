import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function PhotoGallery() {
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState(null)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [filterGuest, setFilterGuest] = useState('all')
  const [view, setView] = useState('grouped') // grouped | grid

  useEffect(() => {
    supabase.from('photos').select('*').order('createdAt', { ascending: false }).then(({ data }) => {
      setPhotos(data || [])
      setLoading(false)
    })
  }, [])

  const deletePhoto = async (photo) => {
    if (!window.confirm('Delete this photo?')) return
    await supabase.from('photos').delete().eq('id', photo.id)
    setPhotos(prev => prev.filter(p => p.id !== photo.id))
    if (lightbox?.id === photo.id) setLightbox(null)
  }

  const guestNames = ['all', ...new Set(photos.map(p => p.guest_name).filter(Boolean))]
  const filtered = filterGuest === 'all' ? photos : photos.filter(p => p.guest_name === filterGuest)

  const grouped = filtered.reduce((acc, p) => {
    const key = p.guest_name || 'Unknown'
    if (!acc[key]) acc[key] = []
    acc[key].push(p)
    return acc
  }, {})

  const openLightbox = (photo, allPhotos) => {
    setLightbox(photo)
    setLightboxIndex(allPhotos.findIndex(p => p.id === photo.id))
  }

  const lightboxPhotos = filterGuest === 'all' ? photos : filtered

  const prevPhoto = () => {
    const newIdx = (lightboxIndex - 1 + lightboxPhotos.length) % lightboxPhotos.length
    setLightbox(lightboxPhotos[newIdx])
    setLightboxIndex(newIdx)
  }

  const nextPhoto = () => {
    const newIdx = (lightboxIndex + 1) % lightboxPhotos.length
    setLightbox(lightboxPhotos[newIdx])
    setLightboxIndex(newIdx)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 32, height: 32, border: '2px solid #c8d4b0', borderTopColor: '#6b7f4e', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--soft-gray)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>Loading photos</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  return (
    <div style={{ padding: '32px 40px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 600, color: 'var(--olive-dark)', letterSpacing: '-0.01em' }}>
            Wedding Photos
          </h2>
          <p style={{ margin: '5px 0 0', fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--soft-gray)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {photos.length} photos · {guestNames.length - 1} guests
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* View toggle */}
          <div style={{ display: 'flex', border: '1.5px solid var(--olive-wash)', borderRadius: 8, overflow: 'hidden' }}>
            {[['grouped', '⊞ By Guest'], ['grid', '⊟ All']].map(([v, label]) => (
              <button key={v} onClick={() => setView(v)}
                style={{ padding: '7px 14px', border: 'none', background: view === v ? 'var(--olive-medium)' : 'transparent', color: view === v ? 'white' : 'var(--soft-gray)', fontFamily: 'var(--font-sans)', fontSize: 11, letterSpacing: '0.06em', cursor: 'pointer', transition: 'all 0.2s' }}>
                {label}
              </button>
            ))}
          </div>

          {/* Guest filter */}
          <select value={filterGuest} onChange={e => setFilterGuest(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: 8, border: '1.5px solid var(--olive-wash)', background: 'white', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--charcoal)', cursor: 'pointer', outline: 'none' }}>
            {guestNames.map(n => <option key={n} value={n}>{n === 'all' ? 'All Guests' : n}</option>)}
          </select>
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--olive-wash)', marginBottom: 28 }} />

      {photos.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--soft-gray)', fontFamily: 'var(--font-sans)', fontSize: 13 }}>
          <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.4 }}>📷</div>
          <p style={{ margin: 0, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: 11 }}>No photos yet</p>
        </div>
      )}

      {/* Grouped view */}
      {view === 'grouped' && Object.entries(grouped).map(([name, gPhotos]) => (
        <div key={name} style={{ marginBottom: 44 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--olive-wash)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--olive-medium)', flexShrink: 0 }}>
              {name.charAt(0).toUpperCase()}
            </div>
            <div>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 600, color: 'var(--olive-dark)' }}>{name}</span>
              <span style={{ marginLeft: 10, fontFamily: 'var(--font-sans)', fontSize: 10, color: 'var(--soft-gray)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{gPhotos.length} photo{gPhotos.length > 1 ? 's' : ''}</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
            {gPhotos.map(p => (
              <PhotoThumb key={p.id} photo={p} onClick={() => openLightbox(p, filtered)} onDelete={() => deletePhoto(p)} />
            ))}
          </div>
        </div>
      ))}

      {/* Grid view */}
      {view === 'grid' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
          {filtered.map(p => (
            <PhotoThumb key={p.id} photo={p} onClick={() => openLightbox(p, filtered)} onDelete={() => deletePhoto(p)} showGuest />
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>

          {/* Top bar */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)' }}>
            <div>
              <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{lightbox.guest_name}</p>
              <p style={{ margin: '2px 0 0', fontFamily: 'var(--font-sans)', fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em' }}>
                {lightboxIndex + 1} / {lightboxPhotos.length}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }} onClick={e => e.stopPropagation()}>
              <a href={lightbox.imgbb_url} target="_blank" rel="noreferrer"
                style={{ padding: '7px 16px', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 20, color: 'white', fontFamily: 'var(--font-sans)', fontSize: 11, letterSpacing: '0.08em', textDecoration: 'none', cursor: 'pointer' }}>
                ↓ Download
              </a>
              <button onClick={() => deletePhoto(lightbox)}
                style={{ padding: '7px 14px', border: '1px solid rgba(230,57,70,0.4)', borderRadius: 20, background: 'transparent', color: 'rgba(230,57,70,0.8)', fontFamily: 'var(--font-sans)', fontSize: 11, cursor: 'pointer' }}>
                Delete
              </button>
              <button onClick={() => setLightbox(null)}
                style={{ padding: '7px 16px', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 20, background: 'transparent', color: 'white', fontFamily: 'var(--font-sans)', fontSize: 11, cursor: 'pointer' }}>
                ✕ Close
              </button>
            </div>
          </div>

          {/* Image */}
          <img src={lightbox.imgbb_url} alt="" onClick={e => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '80vh', borderRadius: 8, objectFit: 'contain', boxShadow: '0 0 80px rgba(0,0,0,0.5)' }} />

          {/* Nav arrows */}
          {lightboxPhotos.length > 1 && (
            <>
              <button onClick={e => { e.stopPropagation(); prevPhoto() }}
                style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', width: 44, height: 44, color: 'white', fontSize: 18, cursor: 'pointer', backdropFilter: 'blur(4px)' }}>
                ‹
              </button>
              <button onClick={e => { e.stopPropagation(); nextPhoto() }}
                style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', width: 44, height: 44, color: 'white', fontSize: 18, cursor: 'pointer', backdropFilter: 'blur(4px)' }}>
                ›
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function PhotoThumb({ photo, onClick, onDelete, showGuest }) {
  const [hover, setHover] = useState(false)
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--olive-wash)', cursor: 'pointer', boxShadow: hover ? '0 6px 20px rgba(0,0,0,0.15)' : '0 2px 8px rgba(0,0,0,0.06)', transition: 'box-shadow 0.2s, transform 0.2s', transform: hover ? 'translateY(-2px)' : 'none' }}
      onClick={onClick}>
      <img src={photo.imgbb_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.3s', transform: hover ? 'scale(1.04)' : 'scale(1)' }} />

      {/* Hover overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 50%)', opacity: hover ? 1 : 0, transition: 'opacity 0.2s', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 10 }}>
        {showGuest && <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 10, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.06em', textTransform: 'uppercase', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>{photo.guest_name}</p>}
      </div>

      {/* Delete btn */}
      <button onClick={e => { e.stopPropagation(); onDelete() }}
        style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%', width: 26, height: 26, color: 'white', fontSize: 11, cursor: 'pointer', display: hover ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
        ✕
      </button>
    </div>
  )
}