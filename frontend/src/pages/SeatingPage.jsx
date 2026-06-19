import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../supabase'
import './SeatingPage.css'

export default function SeatingPage() {
  const [guests, setGuests] = useState([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('guests').select('*').then(({ data }) => {
      setGuests(data || [])
      setLoading(false)
    })
  }, [])

  const filtered = guests.filter(g => {
    const q = search.toLowerCase()
    return (g.nameEn || '').toLowerCase().includes(q) || (g.nameAr || '').toLowerCase().includes(q)
  })

  const tableLabel = (n) => n ? `Table ${n}` : 'Not assigned yet'

  return (
    <div className="seating-page">
      <div className="seating-page-header">
        <img src="/images/1_Watercolor_banner_with_green_olive.png" alt="" className="seating-page-olive" />
        <h1 className="seating-page-title">Find Your Seat</h1>
        <p className="seating-page-sub">ابحث عن طاولتك</p>
      </div>

      <div className="seating-search-wrapper">
        <input
          className="seating-search-input"
          type="text"
          placeholder="Search your name... / ابحث عن اسمك"
          value={search}
          onChange={e => { setSearch(e.target.value); setSelected(null) }}
          autoFocus
        />
      </div>

      {loading && <div className="seating-loading">Loading...</div>}

      <div className="seating-results">
        {search.length > 0 && filtered.map(g => (
          <motion.div
            key={g.token}
            className="seating-result-item"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setSelected(selected?.token === g.token ? null : g)}
          >
            <span className="seating-result-name">{g.nameEn || g.name}</span>
            {g.nameAr && <span className="seating-result-name-ar">{g.nameAr}</span>}
            <span className="seating-result-table">{tableLabel(g.tableNumber)}</span>
          </motion.div>
        ))}
        {search.length === 0 && (
          <div className="seating-browse">
            {guests.filter(g => g.tableNumber).sort((a,b) => a.tableNumber - b.tableNumber).map(g => (
              <motion.div
                key={g.token}
                className="seating-result-item"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setSelected(selected?.token === g.token ? null : g)}
              >
                <span className="seating-result-name">{g.nameEn || g.name}</span>
                {g.nameAr && <span className="seating-result-name-ar">{g.nameAr}</span>}
                <span className="seating-result-table">{tableLabel(g.tableNumber)}</span>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            className="seating-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
          >
            <motion.div
  className="seating-modal"
  initial={{ opacity: 0, scale: 0.9, y: 20 }}
  animate={{ opacity: 1, scale: 1, y: 0 }}
  exit={{ opacity: 0, scale: 0.9 }}
  onClick={e => e.stopPropagation()}
>
  <img src="/images/1_Watercolor_banner_with_green_olive.png" alt="" className="seating-modal-olive" />
  <p className="seating-modal-welcome">Welcome</p>
  <h2 className="seating-modal-name">{selected.nameEn || selected.name}</h2>
  {selected.nameAr && <h2 className="seating-modal-name-ar">{selected.nameAr}</h2>}

  {selected.tableNumber ? (
    <>
      <div className="seating-modal-table">
        <span className="seating-modal-table-label">Your table</span>
        <span className="seating-modal-table-num">Table {selected.tableNumber}</span>
        <span className="seating-modal-table-type">
          {[5,6,7,8,13].includes(selected.tableNumber)
            ? 'Round table · up to 10 guests'
            : 'Rectangular table · up to 8 guests'}
        </span>
      </div>
      <img
        src={`/images/seating/table-${selected.tableNumber}.jpg`}
        alt={`Table ${selected.tableNumber}`}
        className="seating-modal-map"
        onError={e => e.currentTarget.style.display='none'}
      />
    </>
  ) : (
    <div className="seating-modal-table">
      <span className="seating-modal-table-label">Table not assigned yet</span>
      <span className="seating-modal-table-type">Please check with the host</span>
    </div>
  )}

  <button className="seating-modal-close" onClick={() => setSelected(null)}>Close</button>
</motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}