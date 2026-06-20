import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'

const RECT_TABLES = [1,2,3,4,9,10,11,12]
const CIRC_TABLES = [5,6,7,8,13]

const defaultTablePositions = {
  1:{x:80,y:100},2:{x:240,y:100},3:{x:400,y:100},4:{x:560,y:100},
  5:{x:160,y:280},6:{x:320,y:280},7:{x:480,y:280},8:{x:640,y:280},
  9:{x:80,y:460},10:{x:240,y:460},11:{x:400,y:460},12:{x:560,y:460},
  13:{x:320,y:460}
}

const TABLE_W = 70
const TABLE_H = 45
const CIRC_R = 35

// --- Supabase settings helpers ---
const getSetting = async (key) => {
  const { data } = await supabase.from('settings').select('value').eq('key', key).single()
  return data?.value ?? null
}

const setSetting = async (key, value) => {
  await supabase.from('settings').upsert({ key, value }, { onConflict: 'key' })
}

export default function SeatingChart({ guests, onUpdate }) {
  const canvasRef = useRef(null)
  const [tablePositions, setTablePositions] = useState(defaultTablePositions)
  const [draggingTable, setDraggingTable] = useState(null)
  const [draggingGuest, setDraggingGuest] = useState(null)
  const [dragOver, setDragOver] = useState(null)
  const [bgImage, setBgImage] = useState(null)
  const [saving, setSaving] = useState(false)
  const [selectedTable, setSelectedTable] = useState(null)
  const [loading, setLoading] = useState(true)
  const tableDragOffset = useRef({x:0,y:0})

  // Load persisted settings from Supabase on mount
  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true)
      const [posJson, bg] = await Promise.all([
        getSetting('seating-table-positions'),
        getSetting('seating-bg')
      ])
      if (posJson) {
        try { setTablePositions(JSON.parse(posJson)) } catch {}
      }
      if (bg) setBgImage(bg)
      setLoading(false)
    }
    loadSettings()
  }, [])

  const unassigned = guests.filter(g => g.rsvpStatus === 'yes' && !g.tableNumber)
  const getTableGuests = (n) => guests.filter(g => g.rsvpStatus === 'yes' && g.tableNumber === n)

  const saveTablePositions = async (pos) => {
    setTablePositions(pos)
    await setSetting('seating-table-positions', JSON.stringify(pos))
  }

  const assignGuest = async (token, tableNumber) => {
    setSaving(true)
    await supabase.from('guests').update({ tableNumber }).eq('token', token)
    onUpdate()
    setSaving(false)
  }

  const unassignGuest = async (token) => {
    setSaving(true)
    await supabase.from('guests').update({ tableNumber: null }).eq('token', token)
    onUpdate()
    setSaving(false)
  }

  const handleBgUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = ev.target.result
      setBgImage(base64)
      setSaving(true)
      await setSetting('seating-bg', base64)
      setSaving(false)
    }
    reader.readAsDataURL(file)
  }

  const handleClearBg = async () => {
    setBgImage(null)
    setSaving(true)
    await setSetting('seating-bg', '')
    setSaving(false)
  }

  const handleTableMouseDown = (e, tableNum) => {
    e.preventDefault()
    const canvas = canvasRef.current.getBoundingClientRect()
    const pos = tablePositions[tableNum]
    tableDragOffset.current = {
      x: e.clientX - canvas.left - pos.x,
      y: e.clientY - canvas.top - pos.y
    }
    setDraggingTable(tableNum)
  }

  const handleMouseMove = useCallback((e) => {
    if (!draggingTable) return
    const canvas = canvasRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(e.clientX - canvas.left - tableDragOffset.current.x, canvas.width - TABLE_W))
    const y = Math.max(0, Math.min(e.clientY - canvas.top - tableDragOffset.current.y, canvas.height - TABLE_H))
    setTablePositions(prev => ({ ...prev, [draggingTable]: { x, y } }))
  }, [draggingTable])

  const handleMouseUp = useCallback(() => {
    if (draggingTable) {
      saveTablePositions(tablePositions)
      setDraggingTable(null)
    }
  }, [draggingTable, tablePositions])

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  const maxSeats = (n) => CIRC_TABLES.includes(n) ? 10 : 8
  const isCirc = (n) => CIRC_TABLES.includes(n)

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--olive-medium)' }}>Loading seating chart...</div>
  }

  return (
    <div className="seating-chart-wrapper">
      <div className="seating-toolbar">
        <span className="seating-toolbar-title">Seating Chart</span>
        <label className="seating-upload-btn">
          <input type="file" accept="image/*" onChange={handleBgUpload} style={{display:'none'}} />
          Upload Venue Image
        </label>
        {bgImage && <button className="seating-clear-bg" onClick={handleClearBg}>Clear Image</button>}
        {saving && <span className="seating-saving">Saving...</span>}
      </div>

      <div className="seating-layout">
        <div className="seating-sidebar">
          <div className="seating-sidebar-title">Unassigned ({unassigned.length})</div>
          <div className="seating-unassigned-list">
            {unassigned.map(g => (
              <div
                key={g.token}
                className="seating-guest-pill"
                draggable
                onDragStart={() => setDraggingGuest(g)}
                onDragEnd={() => setDraggingGuest(null)}
              >
                <span className="seating-pill-dot" />
                {g.nameEn || g.name}
              </div>
            ))}
            {unassigned.length === 0 && <div className="seating-all-assigned">All guests assigned!</div>}
          </div>
        </div>

        <div
          className="seating-canvas"
          ref={canvasRef}
          style={{ backgroundImage: bgImage ? `url(${bgImage})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}
        >
          {[1,2,3,4,5,6,7,8,9,10,11,12,13].map(n => {
            const pos = tablePositions[n]
            const circ = isCirc(n)
            const tGuests = getTableGuests(n)
            const full = tGuests.length >= maxSeats(n)
            const isOver = dragOver === n
            const w = circ ? CIRC_R*2 : TABLE_W
            const h = circ ? CIRC_R*2 : TABLE_H

            return (
              <div
                key={n}
                className={`seating-table ${circ ? 'circ' : 'rect'} ${full ? 'full' : ''} ${isOver ? 'drag-over' : ''} ${selectedTable === n ? 'selected' : ''}`}
                style={{
                  left: pos.x,
                  top: pos.y,
                  width: w,
                  height: h,
                  borderRadius: circ ? '50%' : '8px',
                  transform: 'rotate(45deg)',
                  transformOrigin: 'center'
                }}
                onMouseDown={(e) => handleTableMouseDown(e, n)}
                onDragOver={(e) => { e.preventDefault(); setDragOver(n) }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragOver(null)
                  if (draggingGuest && !full) assignGuest(draggingGuest.token, n)
                }}
                onClick={() => setSelectedTable(selectedTable === n ? null : n)}
              >
                <span className="st-num">T{n}</span>
                <span className="st-count">{tGuests.length}/{maxSeats(n)}</span>
              </div>
            )
          })}
        </div>

        <div className="seating-table-panel">
          {selectedTable ? (
            <>
              <div className="seating-panel-title">Table {selectedTable}</div>
              <div className="seating-panel-type">{isCirc(selectedTable) ? 'Round · 10 seats' : 'Rectangular · 8 seats'}</div>
              <div className="seating-panel-guests">
                {getTableGuests(selectedTable).map(g => (
                  <div key={g.token} className="seating-panel-guest">
                    <span>{g.nameEn || g.name}</span>
                    <button onClick={() => unassignGuest(g.token)}>✕</button>
                  </div>
                ))}
                {getTableGuests(selectedTable).length === 0 && <div className="seating-panel-empty">No guests yet</div>}
              </div>
              <button className="seating-panel-close" onClick={() => setSelectedTable(null)}>Close</button>
            </>
          ) : (
            <div className="seating-panel-empty" style={{ marginTop: '20px' }}>Click a table to see guests</div>
          )}
        </div>
      </div>
    </div>
  )
}