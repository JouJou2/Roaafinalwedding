import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from 'framer-motion'
import { Calendar, MapPin, Heart, Check, X, Plus, Music, Music2, ChevronDown } from 'lucide-react'
import './InvitationPage.css'
import { supabase } from '../supabase'

const generatedGuestsStorageKey = 'olivekimi-generated-guests'

const readGeneratedGuests = () => {
  if (typeof window === 'undefined') return []
  try {
    const stored = window.localStorage.getItem(generatedGuestsStorageKey)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

const saveGeneratedGuests = (guests) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(generatedGuestsStorageKey, JSON.stringify(guests))
  } catch (e) {}
}

const resolveGuestData = (token) => {
  if (!token) return null
  const generated = readGeneratedGuests().find(g => g.token === token)
  if (generated) return generated
  return null
}

// ===== TRANSLATIONS =====
const t = {
  en: {
    dir: 'ltr',
    loading: 'Preparing your invitation...',
    dear: 'Dear',
    togetherWith: 'Together with our families, we invite you to join us in celebrating our new chapter.',
    theDate: 'Don\'t Be Late!',
    theVenue: 'Meet Us Here',
    addToCalendar: 'Mark Your Calendar',
    ourStory: 'Our Story',
       brideName: 'Abdullah',
       groomName: 'Roaa',
    willYouJoin: 'Shall We Reserve Your Seat?',
    accept: 'Joyfully Accept',
    decline: 'Regretfully Decline',
    bringPlusOne: 'Bring a Plus One',
    guestName: 'Guest Name (max 1)',
    enterName: 'Enter their full name',
    cancel: 'Cancel',
    confirmRsvp: 'Confirm RSVP',
    confirmSolo: 'Confirm Solo Attendance',
    confirmAttendance: 'Confirm Attendance',
    thankYou: 'Thank You!',
    cantWait: (plusOne) => `We can't wait to celebrate with you${plusOne ? ' and ' + plusOne : ''}!`,
    understand: 'We understand and appreciate you letting us know.',
       withLove: 'With love, Abdullah & Roaa',
    timeline: [
      { year: '2021', title: 'A Promise Begins', desc: '' },
      { year: '2024', title: 'A Promise is Written', desc: '' },
      { year: '2026', title: 'A Promise Prepares Forever', desc: '' },
    ],
  },
  ar: {
    dir: 'rtl',
    loading: 'جارٍ تحضير دعوتك...',
    dear: ' عزيزي/عزيزتي',
    togetherWith: ' ندعوكم بحب للاحتفال معنا بـفرحة عمرنا',
    theDate: 'ما تتأخر!',
    theVenue: 'لاقينا هون',
    addToCalendar: 'فضّي حالك',
    ourStory: 'قصتنا',
    brideName: 'عبدالله',
    groomName: 'رؤى',
    willYouJoin: 'هل سيكون لنا الشرف بحضوركم ؟',
    accept: 'بكل سرور أقبل',
    decline: 'آسف، لن أتمكن من الحضور',
    bringPlusOne: 'إحضار مرافق',
    guestName: 'اسم المرافق',
    enterName: 'أدخل الاسم الكامل',
    cancel: 'إلغاء',
    confirmRsvp: 'تأكيد الحضور',
    confirmSolo: 'تأكيد الحضور منفرداً',
    confirmAttendance: 'تأكيد الحضور',
    thankYou: 'شكراً لك',
    cantWait: (plusOne) => `لا يسعنا الانتظار للاحتفال معك${plusOne ? ' ومع ' + plusOne : ''}!`,
    understand: 'نتفهم ذلك ونقدر إخبارنا.',
    withLove: '  بكل محبة، عبدالله  ورؤى ',
    timeline: [
      { year: '٢٠٢١', title: 'خطوة ', desc: '' },
      { year: '٢٠٢٤', title: 'بخطوة', desc: '' },
      { year: '٢٠٢٦', title: 'نحو الأبد', desc: '' },
    ],
  },
}

// Note: mock data removed — InvitationPage will fetch invite data from local API (/api/invite/:token)
// asdoiajsdjajsdiojaisjdjaisdjoiajsdjajsdiasjdio
// Derive first name from full name
const getFirstName = (name) => name.trim().split(' ')[0]

const getDisplayGuestName = (guestObj, isRTL) => {
  if (!guestObj) return ''
  if (isRTL) return guestObj.nameAr || guestObj.nameEn || guestObj.name || ''
  return guestObj.nameEn || guestObj.name || guestObj.nameAr || ''
}

const weddingDate = new Date('2026-07-24T19:00:00')
const venueName = 'Jisr Al Samir'
const venueAddress = 'Jisr Al Samir , Lebanon, Baysour'


// ===== LANGUAGE SPLASH =====
function LanguageSplash({ onSelect }) {
  return (
    <motion.div
      className="lang-splash"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.6 }}
    >
      <div className="lang-splash-inner">
        <motion.div
          className="lang-olive-top"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          <img src="/images/1_Watercolor_banner_with_green_olive.png" alt="" />
        </motion.div>

        <motion.div
          className="lang-names"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.9 }}
        >
          Abdullah & Roaa
        </motion.div>

        <motion.p
          className="lang-prompt-en"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.7 }}
        >
          Wedding Invitation
        </motion.p>

        <motion.p
          className="lang-prompt-ar"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.7 }}
        >
          دعوة زفاف
        </motion.p>

        <motion.div
          className="lang-buttons"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.7 }}
        >
          <motion.button
            className="lang-btn"
            onClick={() => onSelect('en')}
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97 }}
          >
            
            <span className="lang-label">English</span>
          </motion.button>

          <div className="lang-divider" />

          <motion.button
            className="lang-btn lang-btn-ar"
            onClick={() => onSelect('ar')}
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97 }}
          >
            
            <span className="lang-label">العربية</span>
          </motion.button>
        </motion.div>

        <motion.div
          className="lang-olive-bottom"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          <img src="/images/1_Watercolor_banner_with_green_olive.png" alt="" style={{ transform: 'rotate(180deg)' }} />
        </motion.div>
      </div>
    </motion.div>
  )
}
// <span className="lang-flag">🇬🇧</span>
// <span className="lang-flag">🇱🇧</span>
// ===== MAIN PAGE =====
function InvitationPage() {
  const { token } = useParams()
  const [lang, setLang] = useState(null) // null = splash showing
  const [guest, setGuest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [rsvpStatus, setRsvpStatus] = useState(null)
  const [plusOneName, setPlusOneName] = useState('')
  const [showPlusOne, setShowPlusOne] = useState(false)
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [musicPlaying, setMusicPlaying] = useState(true)
  const [toast, setToast] = useState(null)
  const [showPlusOneNotice, setShowPlusOneNotice] = useState(false)
  const [giftModal, setGiftModal] = useState(null)
  const audioRef = useRef(null)

  const containerRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: containerRef })

  const y1 = useTransform(scrollYProgress, [0, 1], [0, -150])
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -80])
  const y3 = useTransform(scrollYProgress, [0, 1], [0, -200])
  const opacity = useTransform(scrollYProgress, [0, 0.3], [1, 0])
  const scale = useTransform(scrollYProgress, [0, 0.3], [1, 0.95])

  const springY1 = useSpring(y1, { stiffness: 100, damping: 30 })
  const springY2 = useSpring(y2, { stiffness: 100, damping: 30 })
  const springY3 = useSpring(y3, { stiffness: 100, damping: 30 })

  const showToast = (message, type = 'info') => {
    setToast({ message, type })
    window.clearTimeout(showToast._timer)
    showToast._timer = window.setTimeout(() => setToast(null), 2600)
  }

  useEffect(() => {
    setTimeout(async () => {
      let guestData = null
      try {
  const { data } = await supabase
    .from('guests')
    .select('*')
    .eq('token', token)
    .single()
  guestData = data
} catch (e) {
  // not found or network error
}
      if (!guestData) {
        setGuest(null)
        setLoading(false)
        return
      }

      setGuest(guestData)
      setRsvpStatus(guestData.rsvpStatus)
      setPlusOneName(guestData.plusOneName || '')
       setSubmitted(guestData.rsvpStatus !== null && guestData.rsvpStatus !== undefined)
      setLoading(false)
    }, 800)
  }, [token])
  useEffect(() => {
  window.scrollTo(0, 1)
  setTimeout(() => window.scrollTo(0, 0), 50)
}, [lang])
  // Attempt to autoplay when language is chosen or when musicPlaying changes
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    audio.volume = 0.35
    if (musicPlaying) {
      const playPromise = audio.play()
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise.catch(() => {
          // Autoplay blocked — stop the visual state so user can press to enable
          setMusicPlaying(false)
        })
      }
    } else {
      try { audio.pause() } catch (e) { /* ignore */ }
    }
  }, [musicPlaying, lang])

  const handleRSVP = (status) => {
    if (status === 'no') {
      setShowDeclineConfirm(true)
      setShowPlusOne(false)
      showToast('Please confirm your decline below.', 'warning')
      return
    }

    setRsvpStatus(status)
    setShowDeclineConfirm(false)

    // Keep the RSVP open if this guest can add a plus one.
    triggerCelebration()
    submitRSVP('yes', '', allowsPlusOne ? false : true)
  }

  const submitRSVP = async (status, plusOne, finalized = true) => {
    console.log('RSVP submitted:', { status, plusOne, lang })
    setSubmitted(false)
    // Update backend if available
    let updated = null
    try {
  if (token) {
    const { data } = await supabase
      .from('guests')
      .update({ 
        rsvpStatus: status, 
        rsvpFinalized: finalized, 
        plusOneName: plusOne, 
        rsvpDate: new Date().toISOString() 
      })
      .eq('token', token)
      .select()
      .single()
    if (data) updated = data
  }
} catch (e) {
  // network error — will fallback to localStorage
}

    if (!updated) {
      // fallback: update locally generated guests in localStorage
      const stored = readGeneratedGuests()
      const idx = stored.findIndex(g => g.token === token)
      if (idx !== -1) {
        stored[idx] = { ...stored[idx], rsvpStatus: status, rsvpFinalized: finalized, plusOneName: plusOne, rsvpDate: new Date().toISOString() }
        try { saveGeneratedGuests(stored) } catch (e) {}
        updated = stored[idx]
      }
    }

    if (updated) {
      setGuest(updated)
      setRsvpStatus(updated.rsvpStatus)
      setPlusOneName(updated.plusOneName || '')
      setSubmitted(updated.rsvpStatus !== null && updated.rsvpStatus !== undefined)
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('olivekimi-invites')
          bc.postMessage({ type: 'rsvp', token })
          bc.close()
        }
      } catch (e) {}
      try {
        window.localStorage.setItem('olivekimi-rsvp-ping', JSON.stringify({ token, at: Date.now() }))
      } catch (e) {}
      // Debug feedback
      console.log('RSVP saved on server:', updated)
      showToast(status === 'no' ? 'Decline saved.' : 'RSVP saved successfully', status === 'no' ? 'warning' : 'success')
    } else {
      // final fallback: just set state so UI updates
      setRsvpStatus(status)
      setPlusOneName(plusOne)
      setSubmitted(status !== null && status !== undefined)
      console.warn('RSVP not saved on server; saved locally if possible')
      showToast('RSVP saved locally in this browser.', 'warning')
    }
  }

  const handlePlusOneSubmit = () => {
    submitRSVP('yes', plusOneName, true)
  }

  const changeAnswer = () => {
    setSubmitted(false)
    setShowPlusOne(false)
    setShowDeclineConfirm(false)
    setPlusOneName('')
    setRsvpStatus(null)
    submitRSVP(null, '', false)
  }

  const addToCalendar = () => {
    // Deprecated: replaced by addToPhoneCalendar
  }

  // Format date as YYYYMMDDTHHMMSSZ (UTC)
  const formatForCalendar = (d) => {
    const pad = (n) => String(n).padStart(2, '0')
    const y = d.getUTCFullYear()
    const m = pad(d.getUTCMonth() + 1)
    const day = pad(d.getUTCDate())
    const hh = pad(d.getUTCHours())
    const mm = pad(d.getUTCMinutes())
    const ss = pad(d.getUTCSeconds())
    return `${y}${m}${day}T${hh}${mm}${ss}Z`
  }

  const buildIcsContent = () => {
    const endTime = new Date(weddingDate.getTime() + 6 * 60 * 60 * 1000)
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `UID:${Date.now()}@olivekimi`,
      `DTSTAMP:${formatForCalendar(new Date())}`,
      `DTSTART:${formatForCalendar(weddingDate)}`,
      `DTEND:${formatForCalendar(endTime)}`,
      `SUMMARY:${tr.brideName} & ${tr.groomName} Wedding`,
      `DESCRIPTION:${tr.togetherWith}`,
      `LOCATION:${venueAddress}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ]
    return lines.join('\r\n')
  }

  const addToCalendarICS = () => {
    const icsContent = buildIcsContent()
    const blob = new Blob([icsContent], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'wedding-invitation.ics'
    // Attempt to open in new tab to let mobile handle the file
    a.target = '_blank'
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const addToGoogleCalendar = () => {
    const start = formatForCalendar(weddingDate)
    const end = formatForCalendar(new Date(weddingDate.getTime() + 6 * 60 * 60 * 1000))
    const title = `${tr.brideName} & ${tr.groomName} Wedding`
    const details = `${tr.togetherWith}\n${guest?.customMessage || ''}`
    const location = venueAddress

    const url =
      'https://calendar.google.com/calendar/r/eventedit' +
      `?text=${encodeURIComponent(title)}` +
      `&dates=${start}/${end}` +
      `&details=${encodeURIComponent(details)}` +
      `&location=${encodeURIComponent(location)}`

    window.open(url, '_blank')
  }
  const triggerCelebration = () => {
    if (allowsPlusOne) {
  setTimeout(() => setShowPlusOneNotice(true), 1200)
}
  const container = document.createElement('div')
  container.style.cssText = `
    position: fixed; inset: 0; pointer-events: none; z-index: 9999; overflow: hidden;
  `
  document.body.appendChild(container)

  const colors = ['#6b7f4e', '#8b9d6e', '#b5c49a', '#d4dcc4', '#c8b89a', '#e8dfd0']
  const symbols = ['✦', '·', '◦', '❋', '✿', '○']

  for (let i = 0; i < 60; i++) {
    const el = document.createElement('div')
    const color = colors[Math.floor(Math.random() * colors.length)]
    const symbol = symbols[Math.floor(Math.random() * symbols.length)]
    const left = Math.random() * 100
    const duration = 1.5 + Math.random() * 2
    const delay = Math.random() * 0.8
    const size = 10 + Math.random() * 16

    el.innerText = symbol
    el.style.cssText = `
      position: absolute;
      left: ${left}%;
      top: -20px;
      color: ${color};
      font-size: ${size}px;
      opacity: 0;
      animation: fall ${duration}s ease-in ${delay}s forwards;
    `
    container.appendChild(el)
  }

  const style = document.createElement('style')
  style.innerText = `
    @keyframes fall {
      0% { transform: translateY(0) rotate(0deg); opacity: 1; }
      100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
    }
  `
  document.head.appendChild(style)
  setTimeout(() => { container.remove(); style.remove() }, 4000)
}
  const addToPhoneCalendar = () => {
    const ua = navigator.userAgent || navigator.vendor || window.opera
    const isAndroid = /android/i.test(ua)
    const isiOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream

    // Android: try Google Calendar link (often opens app)
    if (isAndroid) {
      addToGoogleCalendar()
      return
    }

    // iOS: trigger .ics download which usually opens Calendar
    if (isiOS) {
      addToCalendarICS()
      return
    }

    // Fallback: open Google Calendar in new tab
    addToGoogleCalendar()
  }

  // Show splash until language is chosen
  if (lang === null) {
    return (
      <AnimatePresence>
        <LanguageSplash onSelect={setLang} />
      </AnimatePresence>
    )
  }

  const tr = t[lang]
  const isRTL = tr.dir === 'rtl'

  const mapSrc = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d106085.64856937615!2d35.30633646052805!3d33.80775755047801!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x151f2214911397b9%3A0xb92012b59bf9f233!2sJisr%20Al%20Samir!5e0!3m2!1sen!2slb!4v1780264034435!5m2!1sen!2slb"

  const guestDisplayName = getDisplayGuestName(guest, isRTL)
  const guestGreetingName = isRTL ? guestDisplayName : getFirstName(guestDisplayName)

  if (loading) {
    return (
      <div className="loading-screen" dir={tr.dir}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="loading-olive"
        >
          <svg viewBox="0 0 100 100" width="60" height="60">
            <path d="M50 10 Q60 30 50 50 Q40 70 50 90" stroke="#6b7f4e" strokeWidth="2" fill="none" />
            <ellipse cx="45" cy="35" rx="8" ry="12" fill="#8b9d6e" opacity="0.6" />
            <ellipse cx="55" cy="45" rx="7" ry="10" fill="#6b7f4e" opacity="0.6" />
            <ellipse cx="48" cy="60" rx="9" ry="13" fill="#b5c49a" opacity="0.6" />
          </svg>
        </motion.div>
        <p className="loading-text">{tr.loading}</p>
      </div>
    )
  }

  if (!guest) {
    return (
      <div className="loading-screen" dir={tr.dir}>
        <p className="loading-text">Invitation not found.</p>
      </div>
    )
  }

  const customMessage = isRTL
    ? (guest.customMessageAr || guest.customMessage)
    : guest.customMessage

  const allowsPlusOne = !!(guest && guest.allowsPlusOne)
  const isFinalizedRsvp = !!(guest && guest.rsvpFinalized)
  const canAddPlusOne = allowsPlusOne && rsvpStatus === 'yes'

  return (
    <div ref={containerRef} className={`invitation-container${isRTL ? ' rtl' : ''}`} dir={tr.dir}>

      <audio ref={audioRef} src="/music/River.mp3" loop preload="auto" />

      {/* Floating Olive Branches */}
      <motion.div className="olive-branch branch-left-top" style={{ y: springY1 }}>
        <img src="/images/2_Watercolour_Olive_Branch_Images_Free.png" alt="" />
      </motion.div>
      <motion.div className="olive-branch branch-right-mid" style={{ y: springY2 }}>
        <img src="/images/3_Watercolor_hand_drawn_olive_branch.png" alt="" />
      </motion.div>
      <motion.div className="olive-branch branch-left-bottom" style={{ y: springY3 }}>
  <img src="/images/5_Watercolor_Olive_Tree_Images_Browse.png" alt="" style={{ transform: 'scaleX(-1)' }} />
</motion.div>
      <motion.div className="olive-branch branch-right-bottom" style={{ y: springY1 }}>
        <img src="/images/4_Watercolor_hand_drawn_green_olive.png" alt="" />
      </motion.div>

      {/* Music Toggle */}
      <motion.button
        className="music-toggle"
        onClick={() => setMusicPlaying(!musicPlaying)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {musicPlaying ? <Music2 size={20} /> : <Music size={20} />}
      </motion.button>

      {/* Language switch button */}
      <motion.button
        className="lang-switch-btn"
        onClick={() => setLang(null)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title="Change language"
      >
        {isRTL ? 'EN' : 'ع'}
      </motion.button>

      {/* Hero Section */}
      <motion.section className="hero-section" style={{ opacity, scale }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="hero-content"
        >
          <div className="olive-divider top">
            <img src="/images/1_Watercolor_banner_with_green_olive.png" alt="" />
          </div>

          <motion.p className="dear-guest" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 1 }}>
            {tr.dear} {guestGreetingName},
          </motion.p>

          <motion.h1 className="couple-names" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 1 }}>
            <span className="name">{tr.brideName}</span>
            <span className="ampersand">&</span>
            <span className="name">{tr.groomName}</span>
          </motion.h1>

          <motion.p className="invite-text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 1 }}>
            {customMessage}
          </motion.p>

          <motion.p className="invite-text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5, duration: 1 }}>
            {tr.togetherWith}
          </motion.p>

          <div className="olive-divider bottom">
            <img src="/images/1_Watercolor_banner_with_green_olive.png" alt="" />
          </div>
        </motion.div>

        <motion.div className="scroll-indicator" animate={{ y: [0, 10, 0] }} transition={{ duration: 2, repeat: Infinity }}>
          <ChevronDown size={45} strokeWidth={3} />
        </motion.div>
      </motion.section>

      <AnimatePresence>
  {toast && (
    <motion.div
      className={`invite-toast ${toast.type}`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      {toast.message}
    </motion.div>
  )}
  {showPlusOneNotice && (
  <motion.div
    className="plus-one-notice-wrapper"
    initial={{ opacity: 0, scale: 0.85, y: 20 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.9 }}
    transition={{ type: 'spring', stiffness: 300, damping: 22 }}
    onClick={() => setShowPlusOneNotice(false)}
  >
    <div className="plus-one-notice">
      <img src="/images/1_Watercolor_banner_with_green_olive.png" alt="" className="plus-one-notice-bg" />
      <p className="plus-one-notice-en">Feel free to bring your partner or spouse along</p>
      <p className="plus-one-notice-ar">يسعدنا أن تحضر برفقة شريكك </p>
      <p className="plus-one-notice-sub">Tap to dismiss · اضغط للإغلاق</p>
    </div>
  </motion.div>
)}
</AnimatePresence>

      {/* Date & Venue */}
      <section className="date-venue-section">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8 }}
          className="date-venue-content"
        >
          <div className="date-block">
            <p className="section-label">{tr.theDate}</p>
            <h2 className="date-display">
              {weddingDate.toLocaleDateString(isRTL ? 'ar-LB' : 'en-US', {
                weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
              })}
            </h2>
            <p className="time-display">
              {weddingDate.toLocaleTimeString(isRTL ? 'ar-LB' : 'en-US', {
                hour: 'numeric', minute: '2-digit'
              })}
            </p>
            <motion.button className="calendar-btn" onClick={addToPhoneCalendar} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Calendar size={16} />
              <span>{tr.addToCalendar}</span>
            </motion.button>
          </div>

          <div className="venue-block">
            <p className="section-label">{tr.theVenue}</p>
            <h2 className="venue-name">{venueName}</h2>
            <p className="venue-address">
              <MapPin size={14} />
              {venueAddress}
            </p>
            <div className="map-container">
              <iframe
                src={mapSrc}
                width="100%" height="250"
                style={{ border: 0, borderRadius: '12px' }}
                allowFullScreen loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Venue Map"
              />
            </div>
          </div>
        </motion.div>
      </section>

      {/* Story */}
      <section className="story-section">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: '-50px' }} transition={{ duration: 1 }}>
          <p className="section-label center">{tr.ourStory}</p>
          <div className="timeline">
            {tr.timeline.map((item, index) => (
              <div key={item.year} className="timeline-item">
                {/* Full-bleed background image / placeholder */}
<div className="timeline-photo">
  <div className="photo-placeholder" style={{
    background: `linear-gradient(135deg, ${['#c8d4b0', '#9aad78', '#6b8a52'][index]} 0%, ${['#7a9458', '#527a3e', '#3d6030'][index]} 100%)`
  }} />
  <img
    src={`/images/story-${index + 1}.jpg`}
    alt={item.title}
    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
    onError={(e) => {
      e.currentTarget.style.display = 'none'
    }}
  />
</div>

                {/* Overlay fades + slides up into view */}
                <motion.div
                  className="timeline-overlay"
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
                >
                  <div className="timeline-content">
                    <motion.span
                      className="timeline-year"
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: 0.25 }}
                    >
                      {item.year}
                    </motion.span>
                    <motion.h3
                      className="timeline-title"
                      initial={{ opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: 0.35 }}
                    >
                      {item.title}
                    </motion.h3>
                    <motion.p
                      className="timeline-desc"
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: 0.45 }}
                    >
                      {item.desc}
                    </motion.p>
                  </div>
                </motion.div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* RSVP */}
      <section className="rsvp-section">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8 }}
          className="rsvp-content"
        >
          <div className="olive-divider top small">
            <img src="/images/1_Watercolor_banner_with_green_olive.png" alt="" />
          </div>

          <p className="section-label center">{tr.willYouJoin}</p>
          <h2 className="rsvp-heading">RSVP</h2>

          {!submitted ? (
            <>
              <div className="rsvp-buttons">
                <motion.button className={`rsvp-btn ${rsvpStatus === 'yes' ? 'active' : ''}`} onClick={() => handleRSVP('yes')} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Check size={20} /><span>{tr.accept}</span>
                </motion.button>
                <motion.button className={`rsvp-btn decline ${rsvpStatus === 'no' ? 'active' : ''}`} onClick={() => handleRSVP('no')} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <X size={20} /><span>{tr.decline}</span>
                </motion.button>
              </div>

              {showDeclineConfirm && (
                <motion.div
                  className="decline-confirmation-panel"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <p>Are you sure you want to decline?</p>
                  <div className="plus-one-actions">
                    <button className="cancel-btn" onClick={() => setShowDeclineConfirm(false)}>{tr.cancel}</button>
                    <motion.button
                      className="confirm-btn"
                      onClick={() => {
                        setRsvpStatus('no')
                        setShowDeclineConfirm(false)
                        submitRSVP('no', '', true)
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Confirm Decline
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </>
          ) : canAddPlusOne && !isFinalizedRsvp ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rsvp-confirmation">
              <div className="confirmation-olive">
                <svg viewBox="0 0 100 100" width="80" height="80">
                  <path d="M50 20 Q60 40 50 60 Q40 80 50 95" stroke="#6b7f4e" strokeWidth="2" fill="none" />
                  <ellipse cx="45" cy="40" rx="10" ry="14" fill="#8b9d6e" opacity="0.7" />
                  <ellipse cx="58" cy="50" rx="9" ry="12" fill="#6b7f4e" opacity="0.7" />
                  <ellipse cx="48" cy="70" rx="11" ry="15" fill="#b5c49a" opacity="0.7" />
                </svg>
              </div>
              <h3>{tr.thankYou}</h3>
              <p>{tr.bringPlusOne}</p>
              {!showPlusOne ? (
                <motion.button className="add-plus-one-btn" onClick={() => setShowPlusOne(true)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Plus size={16} /><span>{tr.bringPlusOne}</span>
                </motion.button>
              ) : (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="plus-one-form">
                  <label>{tr.guestName}</label>
                  <input type="text" value={plusOneName} onChange={(e) => setPlusOneName(e.target.value)} placeholder={tr.enterName} maxLength={50} />
                  <div className="plus-one-actions">
                    <button className="cancel-btn" onClick={() => { setShowPlusOne(false); setPlusOneName('') }}>{tr.cancel}</button>
                    <motion.button className="confirm-btn" onClick={handlePlusOneSubmit} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={!plusOneName.trim()}>{tr.confirmRsvp}</motion.button>
                  </div>
                </motion.div>
              )}
              <motion.button className="cancel-btn" onClick={changeAnswer} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} style={{ marginTop: '14px' }}>
                Change answer
              </motion.button>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="rsvp-confirmation">
              <div className="confirmation-olive">
                <svg viewBox="0 0 100 100" width="80" height="80">
                  <path d="M50 20 Q60 40 50 60 Q40 80 50 95" stroke="#6b7f4e" strokeWidth="2" fill="none" />
                  <ellipse cx="45" cy="40" rx="10" ry="14" fill="#8b9d6e" opacity="0.7" />
                  <ellipse cx="58" cy="50" rx="9" ry="12" fill="#6b7f4e" opacity="0.7" />
                  <ellipse cx="48" cy="70" rx="11" ry="15" fill="#b5c49a" opacity="0.7" />
                </svg>
              </div>
              <h3>{tr.thankYou}</h3>
              <p>{rsvpStatus === 'yes' ? tr.cantWait(plusOneName) : tr.understand}</p>
              <motion.button className="cancel-btn" onClick={changeAnswer} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} style={{ marginTop: '14px' }}>
                Change answer
              </motion.button>
            </motion.div>
          )}

          <div className="olive-divider bottom small">
            <img src="/images/1_Watercolor_banner_with_green_olive.png" alt="" />
          </div>
        </motion.div>
      </section>
      {/* Gift Section */}
<section className="gift-section">
  <motion.div
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-80px' }}
    transition={{ duration: 0.8 }}
    className="gift-content"
  >
    <div className="olive-divider top small">
      <img src="/images/1_Watercolor_banner_with_green_olive.png" alt="" />
    </div>

    <p className="section-label center gift-label-en">Your presence is our greatest gift</p>
    <p className="section-label center gift-label-ar" dir="rtl">حضوركم هو أغلى هدية</p>
    <p className="gift-sub">If you wish to send a gift, you're welcome to use either option below</p>
    <p className="gift-sub" dir="rtl">إن أردتم إرسال هدية، يسعدنا استقبالها عبر الخيارات التالية</p>

    <div className="gift-cards">
      {/* Whish Card */}
      <motion.button
        className="gift-card whish-card"
        onClick={() => setGiftModal('whish')}
        whileHover={{ scale: 1.05, rotate: -1 }}
        whileTap={{ scale: 0.97 }}
        animate={{ y: [0, -6, 0] }}
        transition={{ y: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }, scale: { type: 'spring' } }}
      >
        <img src="/images/whishlogo.jpg" alt="Whish Money" className="gift-logo" />
      </motion.button>

      {/* IBAN Card */}
      <motion.button
        className="gift-card iban-card"
        onClick={() => setGiftModal('iban')}
        whileHover={{ scale: 1.05, rotate: 1 }}
        whileTap={{ scale: 0.97 }}
        animate={{ y: [0, -6, 0] }}
        transition={{ y: { duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }, scale: { type: 'spring' } }}
      >
        <img src="/images/ibanlogo.png" alt="Bank Transfer" className="gift-logo" />
      </motion.button>
    </div>

    <div className="olive-divider bottom small">
      <img src="/images/1_Watercolor_banner_with_green_olive.png" alt="" />
    </div>
  </motion.div>
</section>

{/* Gift Modals */}
<AnimatePresence>
  {giftModal && (
    <motion.div
      className="gift-modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={() => setGiftModal(null)}
    >
      <motion.div
        className={`gift-modal ${giftModal}`}
        initial={{ opacity: 0, scale: 0.85, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        onClick={(e) => e.stopPropagation()}
      >
        {giftModal === 'whish' ? (
          <>
            <img src="/images/whishlogo.jpg" alt="Whish" className="modal-logo" />
            <h3 className="modal-title">Whish Money</h3>
            <p className="modal-label">Send to this number</p>
            <div className="modal-value" dir="ltr">+961 78 822 178</div>
            <p className="modal-note">Copy the number and open your Whish app</p>
          </>
        ) : (
          <>
            <img src="/images/ibanlogo.png" alt="IBAN" className="modal-logo iban-modal-logo" />
            <h3 className="modal-title">Bank Transfer</h3>
            <div className="modal-row"><span className="modal-label">Account Name</span><span className="modal-value">ABDALLAH HILAL EL CHAMI</span></div>
            <div className="modal-row"><span className="modal-label">IBAN</span><span className="modal-value mono">LB 63 0056 9984 0103 5006 8862 0002</span></div>
            <div className="modal-row"><span className="modal-label">SWIFT / BIC</span><span className="modal-value mono">AUDBLBBX</span></div>
          </>
        )}
        <motion.button
          className="modal-close"
          onClick={() => setGiftModal(null)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <X size={18} />
        </motion.button>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>

      {/* Footer */}
      <footer className="invitation-footer">
        <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          {tr.withLove}
        </motion.p>
        <motion.div className="footer-olive" animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}>
          <svg viewBox="0 0 100 60" width="60" height="36">
            <path d="M10 30 Q30 10 50 30 Q70 50 90 30" stroke="#b5c49a" strokeWidth="1.5" fill="none" />
            <ellipse cx="25" cy="25" rx="6" ry="9" fill="#d4dcc4" opacity="0.6" />
            <ellipse cx="40" cy="32" rx="5" ry="8" fill="#b5c49a" opacity="0.6" />
            <ellipse cx="55" cy="28" rx="7" ry="10" fill="#8b9d6e" opacity="0.6" />
            <ellipse cx="70" cy="33" rx="5" ry="7" fill="#b5c49a" opacity="0.6" />
          </svg>
        </motion.div>
      </footer>
    </div>
  )
}

export default InvitationPage