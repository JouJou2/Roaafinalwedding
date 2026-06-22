import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function PhotoGallery() {
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState(null)
  const [filterGuest, setFilterGuest] = useState('all')

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
  }

  const guestNames = ['all', ...new Set(photos.map(p => p.guest_name).filter(Boolean))]
  const filtered = filterGuest === 'all' ? photos : photos.filter(p => p.guest_name === filterGuest)

  const grouped = filtered.reduce((acc, p) => {
    const key = p.guest_name || 'Unknown'
    if (!acc[key]) acc[key] = []
    acc[key].push(p)
    return acc
  }, {})

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9aad78', fontFamily: 'var(--font-sans)', fontSize: 13 }}>Loading photos...</div>

  return (
    <div style={{ padding: '32px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 600, color: 'var(--olive-dark)' }}>Wedding Photos</h2>
          <p style={{ margin: '4px 0 0', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--soft-gray)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{photos.length} photos from {guestNames.length - 1} guests</p>
        </div>

        {/* Filter by guest */}
        <select value={filterGuest} onChange={e => setFilterGuest(e.target.value)}
          style={{ padding: '8px 14px', borderRadius: 8, border: '1.5px solid var(--olive-wash)', background: 'white', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--charcoal)', cursor: 'pointer' }}>
          {guestNames.map(n => <option key={n} value={n}>{n === 'all' ? 'All Guests' : n}</option>)}
        </select>
      </div>

      {photos.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--soft-gray)', fontFamily: 'var(--font-sans)', fontSize: 13 }}>No photos yet</div>
      )}

      {Object.entries(grouped).map(([name, gPhotos]) => (
        <div key={name} style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 600, color: 'var(--olive-dark)' }}>{name}</span>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--soft-gray)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{gPhotos.length} photo{gPhotos.length > 1 ? 's' : ''}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
            {gPhotos.map(p => (
              <div key={p.id} style={{ position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--olive-wash)', cursor: 'pointer' }} onClick={() => setLightbox(p)}>
                <img src={p.imgbb_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                <button onClick={e => { e.stopPropagation(); deletePhoto(p) }}
                  style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%', width: 24, height: 24, color: 'white', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <img src={lightbox.imgbb_url} alt="" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 12, objectFit: 'contain' }} />
          <button onClick={() => setLightbox(null)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: '1px solid rgba(255,255,255,0.3)', color: 'white', borderRadius: 20, padding: '6px 16px', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 12 }}>✕ Close</button>
          <a href={lightbox.imgbb_url} download target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
  style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', borderRadius: 20, padding: '8px 20px', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 12, letterSpacing: '0.08em', textDecoration: 'none' }}>↓ Download</a>
            
        </div>
      )}
    </div>
  )
}