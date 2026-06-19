  import { useState, useEffect } from 'react'
  import { motion, AnimatePresence } from 'framer-motion'
  import { Lock, Eye, EyeOff, Check, X, UserPlus, Users, Link2, Copy, CheckCircle, Search, Filter, Heart } from 'lucide-react'
  import './AdminPage.css'
  import { supabase } from '../supabase'
  import SeatingChart from '../components/SeatingChart'

  const generatedGuestsStorageKey = 'olivekimi-generated-guests'

  const readGeneratedGuests = () => {
    if (typeof window === 'undefined') return []

    try {
      const storedGuests = window.localStorage.getItem(generatedGuestsStorageKey)
      return storedGuests ? JSON.parse(storedGuests) : []
    } catch {
      return []
    }
  }

  const saveGeneratedGuests = (guests) => {
    if (typeof window === 'undefined') return

    window.localStorage.setItem(generatedGuestsStorageKey, JSON.stringify(guests))
  }

  const mergeGuests = (baseGuests, generatedGuests) => {
    // Ensure server/base guests override locally-generated guests so server state is authoritative
    const mergedGuests = new Map((generatedGuests || []).map((guest) => [guest.token, guest]))

    (baseGuests || []).forEach((guest) => {
      mergedGuests.set(guest.token, guest)
    })

    return Array.from(mergedGuests.values())
  }

  const createGuestRecord = (nameEn = '', nameAr = '', allowsPlusOne = false) => {
    const trimmedEn = (nameEn || '').trim()
    const trimmedAr = (nameAr || '').trim()
    const primaryName = trimmedEn || trimmedAr || 'Guest'
    const firstName = trimmedEn || trimmedAr || primaryName
    // Generate a strong random token. Prefer crypto.randomUUID() where available.
    let token = ''
    try {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        token = crypto.randomUUID()
      } else if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
        // fallback: generate 16 random bytes and hex-encode
        const arr = new Uint8Array(16)
        window.crypto.getRandomValues(arr)
        token = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
      } else {
        token = Math.random().toString(36).substring(2, 12)
      }
    } catch (e) {
      token = Math.random().toString(36).substring(2, 12)
    }
    return {
      id: Date.now(),
      name: primaryName,
      nameEn: trimmedEn,
      nameAr: trimmedAr,
      firstName,
      token,
      rsvpStatus: null,
      plusOneName: '',
      email: '',
      opened: false,
      rsvpDate: null,
      allowsPlusOne: !!allowsPlusOne,
      customMessage: 'are honored to celebrate with you!',
      customMessageAr: 'يسعدنا كثيراً أن نحتفل معك!',
    }
  }

  // No mock data: Admin will fetch invites from the local backend when available

  function AdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
      try {
        return typeof window !== 'undefined' && window.localStorage.getItem('olivekimi-admin-auth') === '1'
      } catch (e) {
        return false
      }
    })
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loginError, setLoginError] = useState('')
    const [newGuestInviteType, setNewGuestInviteType] = useState('real')
    const [guests, setGuests] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [filterStatus, setFilterStatus] = useState('all')
    const [copiedToken, setCopiedToken] = useState(null)
    const [showAddModal, setShowAddModal] = useState(false)
    const [newGuestNameEn, setNewGuestNameEn] = useState('')
    const [newGuestNameAr, setNewGuestNameAr] = useState('')
    const [newGuestAllowsPlusOne, setNewGuestAllowsPlusOne] = useState(false)
    const [lastGeneratedLink, setLastGeneratedLink] = useState('')
    const [lastGeneratedGuestName, setLastGeneratedGuestName] = useState('')
    const [lastLinkCopied, setLastLinkCopied] = useState(false)
    const [generatedGuests, setGeneratedGuests] = useState([])
    const [newGuestSide, setNewGuestSide] = useState('bride')
    const [showGeneratedList, setShowGeneratedList] = useState(true)
    const [activeTab, setActiveTab] = useState('guests')
    

    // Fetch invites from backend and merge with locally generated ones
    const fetchInvites = async () => {
    try {
      const { data } = await supabase
        .from('guests')
        .select('*')
      if (data) {
        setGuests(data)
        setGeneratedGuests(data)
      }
    } catch (e) {
      // ignore
    }
  }

    const handleLogin = (e) => {
      e.preventDefault()
      // In production: validate against your backend
      if (password === '20Roaabed26') {
        setIsAuthenticated(true)
        try { window.localStorage.setItem('olivekimi-admin-auth', '1') } catch (e) {}
        setLoginError('')
      } else {
        setLoginError('Incorrect password. Please try again.')
      }
    }

    const copyLink = (token) => {
      const link = `${window.location.origin}/invite/${token}`
      navigator.clipboard.writeText(link)
      setCopiedToken(token)
      setTimeout(() => setCopiedToken(null), 2000)
      return link
    }

    const copyGeneratedLink = () => {
      if (!lastGeneratedLink) return

      navigator.clipboard.writeText(lastGeneratedLink)
      setLastLinkCopied(true)
      setTimeout(() => setLastLinkCopied(false), 2000)
    }

    const deleteGeneratedGuest = (token) => {
      const removeLocally = () => {
        const remaining = generatedGuests.filter(g => g.token !== token)
        saveGeneratedGuests(remaining)
        setGeneratedGuests(remaining)
        setGuests((prev) => prev.filter(g => g.token !== token))
        fetchInvites()
        if (lastGeneratedLink.includes(token)) {
          setLastGeneratedLink('')
          setLastGeneratedGuestName('')
        }
      }

      try {
        const stored = readGeneratedGuests().filter(g => g.token !== token)
        saveGeneratedGuests(stored)
      } catch (e) {}

      supabase
    .from('guests')
    .delete()
    .eq('token', token)
    .then(({ error }) => {
      if (error) console.error(error)
      removeLocally()
    })
    .catch(() => {
      removeLocally()
    })
    }

    // Fetch invites from local backend on mount and merge with locally generated ones
    useEffect(() => {
      let cancelled = false
      const runner = async () => {
        await fetchInvites()
      }

      runner()
      const id = setInterval(fetchInvites, 1000)
      return () => { cancelled = true; clearInterval(id) }
    }, [])

    // Listen for RSVP updates from other tabs/clients
    useEffect(() => {
      const handleStorage = (event) => {
        if (event.key === 'olivekimi-rsvp-ping') {
          fetchInvites()
        }
      }

      window.addEventListener('storage', handleStorage)

      let bc = null
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          bc = new BroadcastChannel('olivekimi-invites')
          bc.onmessage = (ev) => {
            if (ev.data && ev.data.type === 'rsvp') {
              fetchInvites()
            }
          }
        }
      } catch (e) {}

      return () => {
        window.removeEventListener('storage', handleStorage)
        if (bc) bc.close()
      }
    }, [])

    const getFilteredGuests = () => {
      return guests
        .slice()
        .sort((a, b) => {
          const aAnswered = a.rsvpStatus !== null && a.rsvpStatus !== undefined
          const bAnswered = b.rsvpStatus !== null && b.rsvpStatus !== undefined
          if (aAnswered !== bAnswered) return aAnswered ? -1 : 1
          const aDate = a.rsvpDate ? new Date(a.rsvpDate).getTime() : 0
          const bDate = b.rsvpDate ? new Date(b.rsvpDate).getTime() : 0
          return bDate - aDate
        })
        .filter(guest => {
        const nameVal = (guest.name || guest.nameEn || guest.nameAr || '').toLowerCase()
        const emailVal = (guest.email || '').toLowerCase()
        const matchesSearch = nameVal.includes(searchTerm.toLowerCase()) || emailVal.includes(searchTerm.toLowerCase())
        const matchesFilter = filterStatus === 'all' || 
  (filterStatus === 'yes' && guest.rsvpStatus === 'yes') ||
  (filterStatus === 'no' && guest.rsvpStatus === 'no') ||
  (filterStatus === 'pending' && guest.rsvpStatus === null) ||
  (filterStatus === 'bride' && guest.side === 'bride') ||
  (filterStatus === 'groom' && guest.side === 'groom') ||
  (filterStatus === 'gesture' && guest.inviteType === 'gesture')
        return matchesSearch && matchesFilter
        })
    }

    const stats = {
  total: guests.filter(g => g.inviteType !== 'gesture').length,
  yes: guests.filter(g => g.rsvpStatus === 'yes' && g.inviteType !== 'gesture').length,
  no: guests.filter(g => g.rsvpStatus === 'no' && g.inviteType !== 'gesture').length,
  pending: guests.filter(g => g.rsvpStatus === null && g.inviteType !== 'gesture').length,
  totalAttending: guests.filter(g => g.rsvpStatus === 'yes' && g.inviteType !== 'gesture').length +
    guests.filter(g => g.rsvpStatus === 'yes' && g.plusOneName && g.inviteType !== 'gesture').length,
}

    const filteredGuests = getFilteredGuests()
    const displayedGeneratedGuests = guests.filter(g => {
      const q = searchTerm.trim().toLowerCase()
      if (!q) return true
      return (
        g.name.toLowerCase().includes(q) ||
        (g.email && g.email.toLowerCase().includes(q)) ||
        g.token.toLowerCase().includes(q)
      )
    })

    if (!isAuthenticated) {
      return (
        <div className="admin-login-page">
          <div className="login-card">
            <div className="login-olive-decoration">
              <svg viewBox="0 0 100 60" width="80" height="48">
                <path d="M10 30 Q30 10 50 30 Q70 50 90 30" stroke="#b5c49a" strokeWidth="1.5" fill="none" />
                <ellipse cx="25" cy="25" rx="6" ry="9" fill="#d4dcc4" opacity="0.6" />
                <ellipse cx="40" cy="32" rx="5" ry="8" fill="#b5c49a" opacity="0.6" />
                <ellipse cx="55" cy="28" rx="7" ry="10" fill="#8b9d6e" opacity="0.6" />
              </svg>
            </div>

            <h1 className="login-title">Admin Access</h1>
            <p className="login-subtitle">Wedding Invitation Dashboard</p>

            <form onSubmit={handleLogin} className="login-form">
              <div className="password-field">
                <Lock size={18} className="password-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="password-input"
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {loginError && (
                <motion.p 
                  className="login-error"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {loginError}
                </motion.p>
              )}

              <motion.button
                type="submit"
                className="login-btn"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Enter Dashboard
              </motion.button>
            </form>
          </div>
        </div>
      )
    }

    return (
      <div className="admin-dashboard">
        {/* Header */}
        <header className="admin-header">
          <div className="header-content">
            <div className="header-brand">
              <svg viewBox="0 0 100 60" width="40" height="24">
                <path d="M10 30 Q30 10 50 30 Q70 50 90 30" stroke="#8b9d6e" strokeWidth="1.5" fill="none" />
                <ellipse cx="30" cy="25" rx="5" ry="8" fill="#b5c49a" opacity="0.6" />
                <ellipse cx="50" cy="32" rx="6" ry="9" fill="#8b9d6e" opacity="0.6" />
                <ellipse cx="70" cy="28" rx="5" ry="7" fill="#b5c49a" opacity="0.6" />
              </svg>
              <h1>Wedding Dashboard</h1>
            </div>
            <button 
              className="logout-btn"
              onClick={() => { setIsAuthenticated(false); try { window.localStorage.removeItem('olivekimi-admin-auth') } catch (e) {} }}
            >
              Log Out
            </button>
          </div>
        </header>
         <div className="admin-tabs">
      <button className={activeTab === 'guests' ? 'active' : ''} onClick={() => setActiveTab('guests')}>Guests</button>
      <button className={activeTab === 'seating' ? 'active' : ''} onClick={() => setActiveTab('seating')}>Seating Chart</button>
    </div>

        {activeTab === 'guests' && <>
      {/* Stats Cards */}
      <section className="stats-section">
          <div className="stats-grid">
            <motion.div 
              className="stat-card total"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Users size={24} />
              <div className="stat-info">
                <span className="stat-number">{stats.total}</span>
                <span className="stat-label">Total Guests</span>
              </div>
            </motion.div>

            <motion.div 
              className="stat-card attending"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Check size={24} />
              <div className="stat-info">
                <span className="stat-number">{stats.yes}</span>
                <span className="stat-label">Attending</span>
              </div>
            </motion.div>

            <motion.div 
              className="stat-card declined"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <X size={24} />
              <div className="stat-info">
                <span className="stat-number">{stats.no}</span>
                <span className="stat-label">Declined</span>
              </div>
            </motion.div>

            <motion.div 
              className="stat-card pending"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <UserPlus size={24} />
              <div className="stat-info">
                <span className="stat-number">{stats.pending}</span>
                <span className="stat-label">Pending</span>
              </div>
            </motion.div>
          </div>

          <motion.div 
            className="total-attending-banner"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Heart size={18} />
            <span>Total attending (including plus ones): <strong>{stats.totalAttending}</strong> people</span>
          </motion.div>
        </section>

        {/* Guest List */}
        <section className="guest-list-section">
          <div className="guest-list-header">
            <h2>Guest List</h2>
            <motion.button
              className="add-guest-btn"
              onClick={() => setShowAddModal(true)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <UserPlus size={16} />
              Add Guest
            </motion.button>
          </div>

          {lastGeneratedLink && (
            <motion.div
              className="invite-link-panel"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="invite-link-copy-text">
                <span className="invite-link-label">New invite link{lastGeneratedGuestName ? ` for ${lastGeneratedGuestName}` : ''}</span>
                <span className="invite-link-helper">Share this URL with the guest directly.</span>
              </div>
              <div className="invite-link-row">
                <input
                  className="invite-link-input"
                  type="text"
                  value={lastGeneratedLink}
                  readOnly
                />
                <motion.button
                  className="invite-link-copy-btn"
                  onClick={copyGeneratedLink}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {lastLinkCopied ? 'Copied' : 'Copy Link'}
                </motion.button>
              </div>
            </motion.div>
          )}

          {displayedGeneratedGuests.length > 0 && (
            <section className="generated-invites">
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
    <h3 className="generated-title" style={{ margin: 0 }}>Generated Invites</h3>
    <button className="toggle-list-btn" onClick={() => setShowGeneratedList(!showGeneratedList)}>
      {showGeneratedList ? 'Hide Links' : 'Show Links'}
    </button>
  </div>
  <p className="generated-title" style={{ marginTop: '0', marginBottom: '10px' }}>Answered invites appear first.</p>
              
              {showGeneratedList && (
  <div className="generated-list">
    {displayedGeneratedGuests.map((g) => {
      const link = `${window.location.origin}/invite/${g.token}`
      return (
        <div key={g.token} className="generated-item">
          <div className="generated-info">
            <span className="gen-name">{(g.nameEn || g.name) + (g.nameAr ? ' / ' + g.nameAr : '')}</span>
            <span className={`rsvp-badge ${g.rsvpStatus || 'pending'}`} style={{ width: 'fit-content' }}>
              {g.rsvpStatus === 'yes' ? 'Yes' : g.rsvpStatus === 'no' ? 'No' : 'Pending'}
            </span>
            <input className="gen-link-input" type="text" value={link} readOnly />
          </div>
          <div className="generated-actions">
            <button className="gen-copy" onClick={() => { const l = copyLink(g.token); setLastGeneratedLink(l); setLastGeneratedGuestName(g.name) }}>Copy</button>
            <button className="gen-delete" onClick={() => deleteGeneratedGuest(g.token)}>Delete</button>
          </div>
        </div>
      )
    })}
  </div>
)}
              </section>
          )}

          <div className="filters-bar">
            <div className="search-field">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search guests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="filter-tabs">
  <button className={filterStatus === 'all' ? 'active' : ''} onClick={() => setFilterStatus('all')}>All</button>
  <button className={filterStatus === 'yes' ? 'active' : ''} onClick={() => setFilterStatus('yes')}>Yes</button>
  <button className={filterStatus === 'no' ? 'active' : ''} onClick={() => setFilterStatus('no')}>No</button>
  <button className={filterStatus === 'pending' ? 'active' : ''} onClick={() => setFilterStatus('pending')}>Pending</button>
  <button className={filterStatus === 'bride' ? 'active' : ''} onClick={() => setFilterStatus('bride')}>Bride's Side</button>
  <button className={filterStatus === 'groom' ? 'active' : ''} onClick={() => setFilterStatus('groom')}>Groom's Side</button>
  <button className={filterStatus === 'gesture' ? 'active' : ''} onClick={() => setFilterStatus('gesture')}>Gesture</button>
</div>
          </div>

          <div className="guest-table-container">
            <table className="guest-table">
              <thead>
                <tr>
                  <th>Guest</th>
                  <th>RSVP</th>
                  <th>Plus One</th>
                  <th>Link</th>
                  <th>Type</th>
                  <th>Opened</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filteredGuests.map((guest) => (
                    <motion.tr
                      key={guest.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      layout
                    >
                      <td>
                        <div className="guest-info">
                          <span className="guest-name">{guest.name}</span>
                                  <span className="guest-email">{guest.email || 'Generated invite'}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`rsvp-badge ${guest.rsvpStatus || 'pending'}`}>
                          {guest.rsvpStatus === 'yes' && <Check size={12} />}
                          {guest.rsvpStatus === 'no' && <X size={12} />}
                          {guest.rsvpStatus === null && <Filter size={12} />}
                          {guest.rsvpStatus === 'yes' ? 'Yes' : guest.rsvpStatus === 'no' ? 'No' : 'Pending'}
                        </span>
                      </td>
                      <td>
  {guest.plusOneName ? (
    <span className="plus-one-tag">{guest.plusOneName}</span>
  ) : guest.allowsPlusOne ? (
    <span className="plus-one-tag" style={{ opacity: 0.5, fontStyle: 'italic' }}>Allowed</span>
  ) : (
    <span className="no-plus-one">—</span>
  )}
</td>
<td>
  <button
    className={`side-btn ${guest.inviteType === 'gesture' ? 'active' : ''}`}
    style={{ fontSize: '12px', padding: '4px 8px' }}
    onClick={async () => {
      const newType = guest.inviteType === 'gesture' ? 'real' : 'gesture'
      await supabase.from('guests').update({ inviteType: newType }).eq('token', guest.token)
      setGuests(prev => prev.map(g => g.token === guest.token ? { ...g, inviteType: newType } : g))
    }}
  >
    {guest.inviteType === 'gesture' ? 'Gesture' : 'Real'}
  </button>
</td>
                      <td>
                        <button
                          className="copy-link-btn"
                          onClick={() => copyLink(guest.token)}
                        >
                          {copiedToken === guest.token ? (
                            <CheckCircle size={14} />
                          ) : (
                            <Link2 size={14} />
                          )}
                          <span>{copiedToken === guest.token ? 'Copied!' : 'Copy'}</span>
                        </button>
                      </td>
                      <td>
                        <span className={`opened-status ${guest.opened ? 'yes' : 'no'}`}>
                          {guest.opened ? 'Yes' : 'No'}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>

            {filteredGuests.length === 0 && (
              <div className="no-results">
                <p>No guests found matching your search.</p>
              </div>
            )}
          </div>
        </section>

        {/* Add Guest Modal */}
        <AnimatePresence>
          {showAddModal && (
            <motion.div
              className="modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
            >
              <motion.div
                className="modal-content"
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3>Add New Guest</h3>

                <div className="modal-form">
                  <div className="form-field">
                    <label>Full Name (English)</label>
                    <input
                      type="text"
                      value={newGuestNameEn}
                      onChange={(e) => setNewGuestNameEn(e.target.value)}
                      placeholder="e.g. Sarah Johnson"
                    />
                  </div>

                  <div className="form-field">
                    <label>Full Name (Arabic)</label>
                    <input
                      type="text"
                      value={newGuestNameAr}
                      onChange={(e) => setNewGuestNameAr(e.target.value)}
                      placeholder="مثال: سارة جونسون"
                    />
                  </div>

                  <div className="form-field checkbox">
                    <label className="checkbox-label">
                      <input type="checkbox" checked={newGuestAllowsPlusOne} onChange={(e) => setNewGuestAllowsPlusOne(e.target.checked)} />
                      <span>Allow plus one</span>
                    </label>
                  </div>
                </div>
                <div className="form-field" style={{ marginTop: '20px' }}>
  <label>Side</label>
  <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
    <button
      type="button"
      className={`side-btn ${newGuestSide === 'bride' ? 'active' : ''}`}
      onClick={() => setNewGuestSide('bride')}
    >
      Bride's Side
    </button>
    <button
      type="button"
      className={`side-btn ${newGuestSide === 'groom' ? 'active' : ''}`}
      onClick={() => setNewGuestSide('groom')}
    >
      Groom's Side
    </button>
  </div>
</div>
<div className="form-field" style={{ marginTop: '20px' }}>
  <label>Invite Type</label>
  <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
    <button
      type="button"
      className={`side-btn ${newGuestInviteType === 'real' ? 'active' : ''}`}
      onClick={() => setNewGuestInviteType('real')}
    >
      Real
    </button>
    <button
      type="button"
      className={`side-btn ${newGuestInviteType === 'gesture' ? 'active' : ''}`}
      onClick={() => setNewGuestInviteType('gesture')}
    >
      Gesture
    </button>
  </div>
</div>

                <div className="modal-actions">
                  <button 
                    className="modal-cancel"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </button>
                  <motion.button
                    className="modal-confirm"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={async () => {
                      const token = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2)
  const payload = {
    token,
    name: newGuestNameEn.trim() || newGuestNameAr.trim(),
    nameEn: newGuestNameEn.trim(),
    nameAr: newGuestNameAr.trim(),
    firstName: newGuestNameEn.trim() || newGuestNameAr.trim(),
    email: '',
    inviteType: newGuestInviteType,
    rsvpStatus: null,
    rsvpFinalized: false,
    plusOneName: '',
    side: newGuestSide,
    opened: false,
    createdAt: new Date().toISOString(),
    allowsPlusOne: !!newGuestAllowsPlusOne,
    customMessage: 'are honored to celebrate with you!',
    customMessageAr: 'فرحتنا تكبر بكم!',
  }
                      try {
    const { data: newGuest, error } = await supabase
      .from('guests')
      .insert([payload])
      .select()
      .single()
    if (error) throw error

    const generatedGuestsArr = [...readGeneratedGuests(), newGuest]
    saveGeneratedGuests(generatedGuestsArr)
    setGeneratedGuests(generatedGuestsArr)
    setGuests((currentGuests) => [...currentGuests, newGuest])
    fetchInvites()

    const generatedLink = copyLink(newGuest.token)
    setLastGeneratedLink(generatedLink)
    setLastGeneratedGuestName(newGuest.nameEn || newGuest.nameAr || newGuest.name)
    setLastLinkCopied(true)
    setTimeout(() => setLastLinkCopied(false), 2000)
    setNewGuestNameEn('')
    setNewGuestNameAr('')
    setNewGuestInviteType('real')
    setShowAddModal(false)
  } catch (err) {
    console.error(err)
  }
                    }}
                    disabled={!newGuestNameEn.trim() && !newGuestNameAr.trim()}
                  >
                    Add Guest
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
       </AnimatePresence>
      </>}

      {activeTab === 'seating' && <SeatingChart guests={guests} onUpdate={fetchInvites} />}

    </div>
  )
}

export default AdminPage