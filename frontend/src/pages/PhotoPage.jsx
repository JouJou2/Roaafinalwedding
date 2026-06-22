import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../supabase'

const MAX_PHOTOS = 25
const IMGBB_KEY = import.meta.env.VITE_IMGBB_API_KEY

export default function PhotoPage() {
  const [step, setStep] = useState('name') // name | camera | done
  const [guestName, setGuestName] = useState('')
  const [guestToken, setGuestToken] = useState('')
  const [guests, setGuests] = useState([])
  const [loadingGuests, setLoadingGuests] = useState(false)
  const [photos, setPhotos] = useState([]) // { file, preview, status, url }
  const [uploading, setUploading] = useState(false)
  const [uploadedCount, setUploadedCount] = useState(0)
  const fileRef = useRef(null)

  const searchGuests = async (q) => {
    if (q.length < 2) { setGuests([]); return }
    setLoadingGuests(true)
    const { data } = await supabase.from('guests').select('token, nameEn, nameAr, name')
      .or(`nameEn.ilike.%${q}%,nameAr.ilike.%${q}%,name.ilike.%${q}%`)
    setGuests(data || [])
    setLoadingGuests(false)
  }

  const selectGuest = (g) => {
    setGuestName(g.nameEn || g.name)
    setGuestToken(g.token)
    setGuests([])
  }

  const handleCapture = (e) => {
    const files = Array.from(e.target.files)
    const remaining = MAX_PHOTOS - photos.length
    const toAdd = files.slice(0, remaining).map(file => ({
      file,
      preview: URL.createObjectURL(file),
      status: 'pending',
      url: null
    }))
    setPhotos(prev => [...prev, ...toAdd])
    e.target.value = ''
  }

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index))
  }

  const uploadAll = async () => {
    if (photos.length === 0) return
    setUploading(true)
    let count = 0

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i]
      if (photo.status === 'done') continue

      try {
        const formData = new FormData()
        formData.append('image', photo.file)
        formData.append('key', IMGBB_KEY)
        formData.append('name', `${guestName}-${Date.now()}-${i}`)

        const res = await fetch('https://api.imgbb.com/1/upload', {
          method: 'POST',
          body: formData
        })
        const data = await res.json()

        if (data.success) {
          await supabase.from('photos').insert({
            guest_token: guestToken,
            guest_name: guestName,
            imgbb_url: data.data.url,
            imgbb_delete_url: data.data.delete_url,
            createdAt: new Date().toISOString()
          })

          setPhotos(prev => prev.map((p, idx) =>
            idx === i ? { ...p, status: 'done', url: data.data.url } : p
          ))
          count++
          setUploadedCount(count)
        } else {
          setPhotos(prev => prev.map((p, idx) =>
            idx === i ? { ...p, status: 'error' } : p
          ))
        }
      } catch {
        setPhotos(prev => prev.map((p, idx) =>
          idx === i ? { ...p, status: 'error' } : p
        ))
      }
    }

    setUploading(false)
    setStep('done')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fdfcf8', fontFamily: "'Josefin Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&family=Josefin+Sans:wght@300;400;500;600&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&display=swap');
      `}</style>

      {/* Header */}
      <div style={{ textAlign: 'center', padding: '48px 24px 32px' }}>
        <img src="/images/1_Watercolor_banner_with_green_olive.png" alt="" style={{ width: 200, opacity: 0.45, marginBottom: 16, pointerEvents: 'none', userSelect: 'none' }} />
        <h1 style={{ fontFamily: "'Great Vibes', cursive", fontSize: '3rem', color: '#3a4a2e', margin: '0 0 6px' }}>Share a Memory</h1>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: '#8a9070', fontStyle: 'italic', margin: 0 }}>شاركنا لحظاتك</p>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 24px 80px' }}>

        {/* Step 1 — Name */}
        {step === 'name' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <p style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#9aad78', marginBottom: 12, textAlign: 'center' }}>First, who are you?</p>
            <input
              type="text"
              placeholder="Search your name..."
              onChange={e => { setGuestName(e.target.value); searchGuests(e.target.value) }}
              value={guestName}
              style={{ width: '100%', padding: '14px 18px', border: '1.5px solid #c8d4b0', borderRadius: 50, fontSize: '1rem', fontFamily: "'Cormorant Garamond', serif", color: '#3a4a2e', background: 'white', outline: 'none', boxSizing: 'border-box', textAlign: 'center' }}
            />

            {/* Guest suggestions */}
            {guests.length > 0 && (
              <div style={{ background: 'white', border: '1px solid #e0ddd4', borderRadius: 12, marginTop: 8, overflow: 'hidden' }}>
                {guests.map(g => (
                  <div key={g.token} onClick={() => selectGuest(g)}
                    style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #f0ede8', fontSize: '0.95rem', color: '#3a4a2e', fontFamily: "'Cormorant Garamond', serif" }}>
                    {g.nameEn || g.name} {g.nameAr && <span style={{ color: '#9aad78', fontSize: '0.85rem' }}>· {g.nameAr}</span>}
                  </div>
                ))}
              </div>
            )}

            {loadingGuests && <p style={{ textAlign: 'center', color: '#9aad78', fontSize: '0.82rem', marginTop: 8 }}>Searching...</p>}

            <motion.button
              onClick={() => { if (guestName.trim()) setStep('camera') }}
              disabled={!guestName.trim()}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              style={{ width: '100%', marginTop: 20, padding: '14px', borderRadius: 50, border: 'none', background: guestName.trim() ? '#6b7f4e' : '#c8d4b0', color: 'white', fontSize: '0.82rem', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: guestName.trim() ? 'pointer' : 'not-allowed', fontFamily: "'Josefin Sans', sans-serif", fontWeight: 600 }}>
              Continue →
            </motion.button>
          </motion.div>
        )}

        {/* Step 2 — Camera */}
        {step === 'camera' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <p style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#9aad78', margin: '0 0 4px' }}>Welcome, {guestName}</p>
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: '#8a9070', fontStyle: 'italic', margin: 0 }}>Take up to {MAX_PHOTOS} photos · {photos.length}/{MAX_PHOTOS} taken</p>
            </div>

            {/* Photo grid */}
            {photos.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
                {photos.map((p, i) => (
                  <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', border: '2px solid', borderColor: p.status === 'done' ? '#8b9d6e' : p.status === 'error' ? '#e63946' : '#e0ddd4' }}>
                    <img src={p.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {p.status === 'done' && <div style={{ position: 'absolute', top: 4, right: 4, background: '#6b7f4e', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'white' }}>✓</div>}
                    {p.status === 'error' && <div style={{ position: 'absolute', top: 4, right: 4, background: '#e63946', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'white' }}>✕</div>}
                    {p.status === 'pending' && !uploading && (
                      <button onClick={() => removePhoto(i)} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'white', cursor: 'pointer' }}>✕</button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Take photo button */}
            {photos.length < MAX_PHOTOS && !uploading && (
              <>
                <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple onChange={handleCapture} style={{ display: 'none' }} />
                <motion.button onClick={() => fileRef.current.click()}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  style={{ width: '100%', padding: '16px', borderRadius: 50, border: '2px dashed #c8d4b0', background: 'transparent', color: '#6b7f4e', fontSize: '0.82rem', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: "'Josefin Sans', sans-serif", fontWeight: 600, marginBottom: 12 }}>
                  📷 Take Photo ({MAX_PHOTOS - photos.length} remaining)
                </motion.button>
              </>
            )}

            {/* Upload button */}
            {photos.length > 0 && !uploading && (
              <motion.button onClick={uploadAll}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                style={{ width: '100%', padding: '14px', borderRadius: 50, border: 'none', background: '#6b7f4e', color: 'white', fontSize: '0.82rem', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: "'Josefin Sans', sans-serif", fontWeight: 600 }}>
                Upload {photos.length} Photo{photos.length > 1 ? 's' : ''} →
              </motion.button>
            )}

            {/* Uploading progress */}
            {uploading && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.1rem', color: '#3a4a2e', fontStyle: 'italic' }}>Uploading... {uploadedCount}/{photos.length}</p>
                <div style={{ height: 4, background: '#e0ddd4', borderRadius: 2, marginTop: 12 }}>
                  <div style={{ height: '100%', background: '#6b7f4e', borderRadius: 2, width: `${(uploadedCount / photos.length) * 100}%`, transition: 'width 0.3s ease' }} />
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Step 3 — Done */}
        {step === 'done' && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🌿</div>
            <h2 style={{ fontFamily: "'Great Vibes', cursive", fontSize: '2.5rem', color: '#3a4a2e', margin: '0 0 8px' }}>Thank You!</h2>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: '#8a9070', fontStyle: 'italic' }}>Your {uploadedCount} photo{uploadedCount > 1 ? 's' : ''} have been shared with us</p>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.9rem', color: '#b5c49a', fontStyle: 'italic', marginTop: 4 }}>شكراً لمشاركتنا لحظاتك</p>
          </motion.div>
        )}

      </div>
    </div>
  )
}