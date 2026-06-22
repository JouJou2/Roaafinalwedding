import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../supabase'

const MAX_PHOTOS = 25
const IMGBB_KEY = import.meta.env.VITE_IMGBB_API_KEY
const FILTER = 'sepia(40%) contrast(1.1) brightness(1.05) saturate(0.85)'

export default function PhotoPage() {
  const [step, setStep] = useState('name')
  const [guestName, setGuestName] = useState('')
  const [guestToken, setGuestToken] = useState('')
  const [guests, setGuests] = useState([])
  const [loadingGuests, setLoadingGuests] = useState(false)
  const [photos, setPhotos] = useState([])
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
        const baked = await new Promise((resolve) => {
          const img = new Image()
          img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = img.naturalWidth
            canvas.height = img.naturalHeight
            const ctx = canvas.getContext('2d')
            ctx.filter = FILTER
            ctx.drawImage(img, 0, 0)
            canvas.toBlob(resolve, 'image/jpeg', 0.95)
          }
          img.src = photo.preview
        })
        formData.append('image', baked)
        formData.append('key', IMGBB_KEY)
        formData.append('name', `${guestName}-${Date.now()}-${i}`)

        const res = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: formData })
        const data = await res.json()

        if (data.success) {
          await supabase.from('photos').insert({
            guest_token: guestToken,
            guest_name: guestName,
            imgbb_url: data.data.url,
            imgbb_delete_url: data.data.delete_url,
            createdAt: new Date().toISOString()
          })
          setPhotos(prev => prev.map((p, idx) => idx === i ? { ...p, status: 'done', url: data.data.url } : p))
          count++
          setUploadedCount(count)
        } else {
          setPhotos(prev => prev.map((p, idx) => idx === i ? { ...p, status: 'error' } : p))
        }
      } catch {
        setPhotos(prev => prev.map((p, idx) => idx === i ? { ...p, status: 'error' } : p))
      }
    }
    setUploading(false)
    setStep('done')
  }

  const progress = photos.length > 0 ? (uploadedCount / photos.length) * 100 : 0

  return (
    <div style={{ minHeight: '100vh', background: '#fdfcf8', fontFamily: "'Josefin Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&family=Josefin+Sans:wght@300;400;500;600&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&display=swap');
        * { box-sizing: border-box; }
        .photo-input:focus { border-color: #8b9d6e !important; box-shadow: 0 0 0 3px rgba(139,157,110,0.12) !important; }
        .guest-row:hover { background: #f5f9f0 !important; }
        .take-btn:hover { border-color: #8b9d6e !important; background: #f5f9f0 !important; }
      `}</style>

      {/* Olive header bar */}
      <div style={{ height: 3, background: 'linear-gradient(to right, #b5c49a, #6b7f4e, #b5c49a)' }} />

      {/* Header */}
      <div style={{ textAlign: 'center', padding: '52px 24px 40px', position: 'relative' }}>
        <img src="/images/1_Watercolor_banner_with_green_olive.png" alt=""
          style={{ width: 220, opacity: 0.4, marginBottom: 20, pointerEvents: 'none', userSelect: 'none', display: 'block', margin: '0 auto 20px' }} />
        <h1 style={{ fontFamily: "'Great Vibes', cursive", fontSize: 'clamp(2.8rem, 8vw, 4rem)', color: '#3a4a2e', margin: '0 0 8px', lineHeight: 1.1 }}>
          Share a Memory
        </h1>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.05rem', color: '#9aad78', fontStyle: 'italic', margin: 0, letterSpacing: '0.02em' }}>
          شاركنا لحظاتك
        </p>

        {/* Step indicator */}
        {step !== 'done' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 28 }}>
            {['name', 'camera'].map((s, i) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', background: step === s ? '#6b7f4e' : (step === 'camera' && s === 'name') ? '#b5c49a' : '#e8edd8', color: step === s ? 'white' : (step === 'camera' && s === 'name') ? 'white' : '#9aad78', transition: 'all 0.3s' }}>
                  {step === 'camera' && s === 'name' ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: step === s ? '#3a4a2e' : '#b5c49a' }}>
                  {s === 'name' ? 'Identity' : 'Photos'}
                </span>
                {i === 0 && <div style={{ width: 32, height: 1, background: '#c8d4b0', margin: '0 4px' }} />}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ maxWidth: 500, margin: '0 auto', padding: '0 24px 100px' }}>

        {/* ── Step 1: Name ── */}
        <AnimatePresence mode="wait">
          {step === 'name' && (
            <motion.div key="name" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.4 }}>
              <div style={{ background: 'white', borderRadius: 20, border: '1px solid #e8edd8', padding: '36px 32px', boxShadow: '0 4px 32px rgba(74,93,58,0.07)' }}>
                <p style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.18em', color: '#9aad78', marginBottom: 20, textAlign: 'center', margin: '0 0 20px' }}>
                  First, who are you?
                </p>

                <div style={{ position: 'relative' }}>
                  <input
                    className="photo-input"
                    type="text"
                    placeholder="Search your name..."
                    onChange={e => { setGuestName(e.target.value); searchGuests(e.target.value) }}
                    value={guestName}
                    style={{ width: '100%', padding: '14px 20px', border: '1.5px solid #c8d4b0', borderRadius: 12, fontSize: '1rem', fontFamily: "'Cormorant Garamond', serif", color: '#3a4a2e', background: '#fdfcf8', outline: 'none', transition: 'all 0.2s' }}
                  />
                  {loadingGuests && (
                    <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#9aad78' }}>...</div>
                  )}
                </div>

                <AnimatePresence>
                  {guests.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      style={{ background: 'white', border: '1px solid #e8edd8', borderRadius: 12, marginTop: 6, overflow: 'hidden', boxShadow: '0 8px 24px rgba(74,93,58,0.1)' }}>
                      {guests.map((g, i) => (
                        <div key={g.token} className="guest-row" onClick={() => selectGuest(g)}
                          style={{ padding: '13px 18px', cursor: 'pointer', borderBottom: i < guests.length - 1 ? '1px solid #f0ede8' : 'none', fontSize: '1rem', color: '#3a4a2e', fontFamily: "'Cormorant Garamond', serif", display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'background 0.15s' }}>
                          <span>{g.nameEn || g.name}</span>
                          {g.nameAr && <span style={{ color: '#9aad78', fontSize: '0.88rem', direction: 'rtl' }}>{g.nameAr}</span>}
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button
                  onClick={() => { if (guestName.trim()) setStep('camera') }}
                  disabled={!guestName.trim()}
                  whileHover={guestName.trim() ? { scale: 1.02 } : {}}
                  whileTap={guestName.trim() ? { scale: 0.98 } : {}}
                  style={{ width: '100%', marginTop: 24, padding: '15px', borderRadius: 12, border: 'none', background: guestName.trim() ? 'linear-gradient(135deg, #6b7f4e, #4a5c35)' : '#e8edd8', color: guestName.trim() ? 'white' : '#b5c49a', fontSize: '0.78rem', letterSpacing: '0.14em', textTransform: 'uppercase', cursor: guestName.trim() ? 'pointer' : 'not-allowed', fontFamily: "'Josefin Sans', sans-serif", fontWeight: 600, transition: 'all 0.2s', boxShadow: guestName.trim() ? '0 4px 16px rgba(74,93,58,0.22)' : 'none' }}>
                  Continue →
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ── Step 2: Camera ── */}
          {step === 'camera' && (
            <motion.div key="camera" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.4 }}>

              {/* Guest badge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', border: '1px solid #e8edd8', borderRadius: 12, padding: '14px 20px', marginBottom: 20, boxShadow: '0 2px 12px rgba(74,93,58,0.06)' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.14em', color: '#9aad78' }}>Capturing as</p>
                  <p style={{ margin: '2px 0 0', fontFamily: "'Cormorant Garamond', serif", fontSize: '1.2rem', color: '#3a4a2e', fontWeight: 500 }}>{guestName}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9aad78' }}>Photos</p>
                  <p style={{ margin: '2px 0 0', fontFamily: "'Cormorant Garamond', serif", fontSize: '1.4rem', color: '#3a4a2e', fontWeight: 500 }}>{photos.length}<span style={{ fontSize: '0.9rem', color: '#b5c49a' }}>/{MAX_PHOTOS}</span></p>
                </div>
              </div>

              {/* Photo grid */}
              {photos.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
                  {photos.map((p, i) => (
                    <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                      style={{ position: 'relative', aspectRatio: '1', borderRadius: 12, overflow: 'hidden', border: '2px solid', borderColor: p.status === 'done' ? '#8b9d6e' : p.status === 'error' ? '#e63946' : '#e8edd8', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                      <img src={p.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: FILTER }} />
                      {/* Status badge */}
                      {p.status === 'done' && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(107,127,78,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ background: '#6b7f4e', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>✓</div>
                        </div>
                      )}
                      {p.status === 'error' && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(230,57,70,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ background: '#e63946', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'white' }}>✕</div>
                        </div>
                      )}
                      {p.status === 'pending' && !uploading && (
                        <button onClick={() => removePhoto(i)}
                          style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'white', cursor: 'pointer', backdropFilter: 'blur(4px)' }}>✕</button>
                      )}
                    </motion.div>
                  ))}

                  {/* Add more slot */}
                  {photos.length < MAX_PHOTOS && !uploading && (
                    <div onClick={() => fileRef.current.click()}
                      style={{ aspectRatio: '1', borderRadius: 12, border: '2px dashed #c8d4b0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#fdfcf8', gap: 6, transition: 'all 0.2s' }}>
                      <span style={{ fontSize: 22, opacity: 0.5 }}>📷</span>
                      <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9aad78' }}>Add</span>
                    </div>
                  )}
                </div>
              )}

              <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple onChange={handleCapture} style={{ display: 'none' }} />

              {/* Take photo CTA (when no photos yet) */}
              {photos.length === 0 && !uploading && (
                <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                  <div onClick={() => fileRef.current.click()}
                    style={{ border: '2px dashed #c8d4b0', borderRadius: 20, padding: '52px 24px', textAlign: 'center', cursor: 'pointer', background: 'white', transition: 'all 0.2s', marginBottom: 16 }}>
                    <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.6 }}>📷</div>
                    <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.3rem', color: '#3a4a2e', margin: '0 0 6px', fontStyle: 'italic' }}>Open Camera</p>
                    <p style={{ fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#b5c49a', margin: 0 }}>Up to {MAX_PHOTOS} photos</p>
                  </div>
                </motion.div>
              )}

              {/* Take more button when photos exist */}
              {photos.length > 0 && photos.length < MAX_PHOTOS && !uploading && (
                <button onClick={() => fileRef.current.click()} className="take-btn"
                  style={{ width: '100%', padding: '13px', borderRadius: 12, border: '1.5px dashed #c8d4b0', background: 'transparent', color: '#6b7f4e', fontSize: '0.78rem', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: "'Josefin Sans', sans-serif", fontWeight: 600, marginBottom: 10, transition: 'all 0.2s' }}>
                  + Add More ({MAX_PHOTOS - photos.length} remaining)
                </button>
              )}

              {/* Upload progress */}
              {uploading && (
                <div style={{ background: 'white', border: '1px solid #e8edd8', borderRadius: 16, padding: '24px 28px', marginBottom: 16, textAlign: 'center' }}>
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.1rem', color: '#3a4a2e', fontStyle: 'italic', margin: '0 0 16px' }}>
                    Uploading your memories... {uploadedCount}/{photos.length}
                  </p>
                  <div style={{ height: 6, background: '#e8edd8', borderRadius: 3, overflow: 'hidden' }}>
                    <motion.div animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }}
                      style={{ height: '100%', background: 'linear-gradient(to right, #8b9d6e, #6b7f4e)', borderRadius: 3 }} />
                  </div>
                  <p style={{ fontSize: '0.72rem', color: '#9aad78', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '10px 0 0' }}>
                    {Math.round(progress)}% complete
                  </p>
                </div>
              )}

              {/* Upload button */}
              {photos.length > 0 && !uploading && (
                <motion.button onClick={uploadAll} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  style={{ width: '100%', padding: '15px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #6b7f4e, #4a5c35)', color: 'white', fontSize: '0.78rem', letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: "'Josefin Sans', sans-serif", fontWeight: 600, boxShadow: '0 4px 16px rgba(74,93,58,0.25)' }}>
                  Share {photos.length} Photo{photos.length > 1 ? 's' : ''} →
                </motion.button>
              )}
            </motion.div>
          )}

          {/* ── Step 3: Done ── */}
          {step === 'done' && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease: 'easeOut' }}>
              <div style={{ background: 'white', border: '1px solid #e8edd8', borderRadius: 24, padding: '52px 32px', textAlign: 'center', boxShadow: '0 8px 40px rgba(74,93,58,0.1)' }}>
                <img src="/images/1_Watercolor_banner_with_green_olive.png" alt=""
                  style={{ width: 160, opacity: 0.4, marginBottom: 24, pointerEvents: 'none', userSelect: 'none' }} />
                <h2 style={{ fontFamily: "'Great Vibes', cursive", fontSize: '3rem', color: '#3a4a2e', margin: '0 0 10px', lineHeight: 1.1 }}>
                  Thank You!
                </h2>
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.05rem', color: '#6b7f4e', fontStyle: 'italic', margin: '0 0 4px' }}>
                  {uploadedCount} photo{uploadedCount > 1 ? 's' : ''} shared with Abdullah & Roaa
                </p>
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.95rem', color: '#b5c49a', fontStyle: 'italic', margin: '0 0 32px' }}>
                  شكراً لمشاركتنا لحظاتك
                </p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button onClick={() => { setStep('camera'); setPhotos([]); setUploadedCount(0) }}
                    style={{ padding: '11px 24px', borderRadius: 10, border: '1.5px solid #c8d4b0', background: 'transparent', color: '#6b7f4e', fontSize: '0.78rem', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: "'Josefin Sans', sans-serif", fontWeight: 600 }}>
                    Take More Photos
                  </button>
                  <button onClick={() => { setStep('name'); setGuestName(''); setGuestToken(''); setPhotos([]); setUploadedCount(0) }}
                    style={{ padding: '11px 24px', borderRadius: 10, border: 'none', background: '#f5f9f0', color: '#8a9070', fontSize: '0.78rem', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: "'Josefin Sans', sans-serif" }}>
                    Different Guest
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}