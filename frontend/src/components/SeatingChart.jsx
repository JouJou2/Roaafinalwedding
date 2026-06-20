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
  const tableDragOffset = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true)
      const [posJson, bg] = await Promise.all([
        getSetting('seating-table-positions'),
        getSetting('seating-bg')
      ])
      if (posJson) { try { setTablePositions(JSON.parse(posJson)) } catch {} }
      if (bg) setBgImage(bg)
      setLoading(false)
    }
    loadSettings()
  }, [])

  const unassigned = guests.filter(g => g.inviteType === 'real' && !g.tableNumber)
  const getTableGuests = (n) => guests.filter(g => g.inviteType === 'real' && g.tableNumber === n)

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
  const getRotation = (n) => {
    if (CIRC_TABLES.includes(n)) return 'none'
    if ([9,10,11,12].includes(n)) return 'rotate(-45deg)'
    return 'rotate(45deg)'
  }

  const totalReal = guests.filter(g => g.inviteType === 'real').length
  const assigned = guests.filter(g => g.inviteType === 'real' && g.tableNumber).length

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '300px', color: 'var(--olive-medium)',
        fontFamily: 'var(--font-sans)', letterSpacing: '0.1em', fontSize: '13px'
      }}>
        Loading seating chart…
      </div>
    )
  }

  return (
    <div style={{ padding: '32px 40px', boxSizing: 'border-box', maxWidth: '100%' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '24px', flexWrap: 'wrap', gap: '12px'
      }}>
        <div>
          <h2 style={{
            margin: 0, fontFamily: 'var(--font-serif)', fontSize: '26px',
            fontWeight: 600, color: 'var(--olive-dark)', letterSpacing: '0.02em'
          }}>
            Seating Chart
          </h2>
          <p style={{
            margin: '4px 0 0', fontFamily: 'var(--font-sans)', fontSize: '12px',
            color: 'var(--soft-gray)', letterSpacing: '0.08em', textTransform: 'uppercase'
          }}>
            {assigned} of {totalReal} guests placed
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {saving && (
            <span style={{
              fontFamily: 'var(--font-sans)', fontSize: '12px',
              color: 'var(--olive-medium)', letterSpacing: '0.06em'
            }}>
              Saving…
            </span>
          )}
          <label style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '8px 16px', borderRadius: '6px', cursor: 'pointer',
            border: '1.5px solid var(--olive-pale)', backgroundColor: 'var(--warm-white)',
            fontFamily: 'var(--font-sans)', fontSize: '12px', letterSpacing: '0.08em',
            color: 'var(--olive-dark)', textTransform: 'uppercase', fontWeight: 600,
            transition: 'background 0.2s'
          }}>
            <input type="file" accept="image/*" onChange={handleBgUpload} style={{ display: 'none' }} />
            ↑ Upload Floor Plan
          </label>
          {bgImage && (
            <button onClick={handleClearBg} style={{
              padding: '8px 14px', borderRadius: '6px', cursor: 'pointer',
              border: '1.5px solid #ddd', backgroundColor: 'transparent',
              fontFamily: 'var(--font-sans)', fontSize: '12px', letterSpacing: '0.08em',
              color: 'var(--soft-gray)', textTransform: 'uppercase'
            }}>
              Clear Image
            </button>
          )}
        </div>
      </div>

      {/* Thin divider */}
      <div style={{ height: '1px', backgroundColor: 'var(--olive-wash)', marginBottom: '24px' }} />

      {/* Main layout */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>

        {/* Sidebar */}
        <div style={{
          width: '200px', flexShrink: 0,
          backgroundColor: 'var(--warm-white)',
          border: '1.5px solid var(--olive-wash)',
          borderRadius: '10px', overflow: 'hidden'
        }}>
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--olive-wash)',
            backgroundColor: 'var(--cream)',
            fontFamily: 'var(--font-sans)', fontSize: '11px',
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'var(--olive-medium)', fontWeight: 600
          }}>
            Unassigned · {unassigned.length}
          </div>
          <div style={{ maxHeight: '520px', overflowY: 'auto', padding: '10px 10px' }}>
            {unassigned.map(g => (
              <div
                key={g.token}
                draggable
                onDragStart={() => setDraggingGuest(g)}
                onDragEnd={() => setDraggingGuest(null)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '7px 10px', marginBottom: '5px',
                  borderRadius: '6px', cursor: 'grab',
                  backgroundColor: 'var(--cream)',
                  border: '1px solid var(--olive-wash)',
                  fontFamily: 'var(--font-sans)', fontSize: '12px',
                  color: 'var(--charcoal)', letterSpacing: '0.02em',
                  transition: 'background 0.15s'
                }}
              >
                <span style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  backgroundColor: 'var(--olive-medium)', flexShrink: 0
                }} />
                {g.nameEn || g.name}
              </div>
            ))}
            {unassigned.length === 0 && (
              <div style={{
                padding: '20px 10px', textAlign: 'center',
                fontFamily: 'var(--font-sans)', fontSize: '12px',
                color: 'var(--soft-gray)', letterSpacing: '0.06em'
              }}>
                All guests placed ✓
              </div>
            )}
          </div>
        </div>

        {/* Canvas */}
        <div
          ref={canvasRef}
          style={{
            flex: 1, height: '580px', position: 'relative',
            borderRadius: '10px', overflow: 'hidden',
            border: '1.5px solid var(--olive-wash)',
            backgroundColor: bgImage ? 'transparent' : 'var(--cream)',
            backgroundImage: bgImage ? `url(${bgImage})` : `radial-gradient(circle, var(--olive-wash) 1px, transparent 1px)`,
            backgroundSize: bgImage ? 'cover' : '28px 28px',
            backgroundPosition: bgImage ? 'center' : '0 0',
          }}
        >
          {[1,2,3,4,5,6,7,8,9,10,11,12,13].map(n => {
            const pos = tablePositions[n]
            const circ = isCirc(n)
            const tGuests = getTableGuests(n)
            const full = tGuests.length >= maxSeats(n)
            const isOver = dragOver === n
            const isSelected = selectedTable === n
            const w = circ ? CIRC_R * 2 : TABLE_W
            const h = circ ? CIRC_R * 2 : TABLE_H

            return (
              <div
                key={n}
                style={{
                  position: 'absolute',
                  left: pos.x, top: pos.y,
                  width: w, height: h,
                  borderRadius: circ ? '50%' : '8px',
                  transform: getRotation(n),
                  transformOrigin: 'center',
                  cursor: 'grab',
                  backgroundColor: isSelected
                    ? 'var(--olive-dark)'
                    : full
                    ? '#c8a96e22'
                    : isOver
                    ? 'var(--olive-light)'
                    : 'var(--olive-medium)',
                  border: isSelected
                    ? '2px solid var(--gold)'
                    : isOver
                    ? '2px solid var(--olive-dark)'
                    : full
                    ? '2px solid var(--gold)'
                    : '2px solid var(--olive-dark)',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  userSelect: 'none',
                  boxShadow: isSelected ? '0 0 0 3px var(--gold)44' : '0 2px 6px rgba(0,0,0,0.15)',
                  transition: 'background 0.15s, box-shadow 0.15s'
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
                <span style={{
                  fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 700,
                  color: full && !isSelected ? 'var(--gold)' : 'var(--warm-white)',
                  letterSpacing: '0.04em',
                  transform: getRotation(n) !== 'none' ? `rotate(${[9,10,11,12].includes(n) ? '45deg' : '-45deg'})` : 'none'
                }}>
                  T{n}
                </span>
                <span style={{
                  fontFamily: 'var(--font-sans)', fontSize: '9px',
                  color: full && !isSelected ? 'var(--gold)' : 'rgba(255,255,255,0.75)',
                  letterSpacing: '0.03em',
                  transform: getRotation(n) !== 'none' ? `rotate(${[9,10,11,12].includes(n) ? '45deg' : '-45deg'})` : 'none'
                }}>
                  {tGuests.length}/{maxSeats(n)}
                </span>
              </div>
            )
          })}
        </div>

        {/* Right panel */}
        <div style={{
          width: '200px', flexShrink: 0,
          backgroundColor: 'var(--warm-white)',
          border: '1.5px solid var(--olive-wash)',
          borderRadius: '10px', overflow: 'hidden',
          minHeight: '200px'
        }}>
          {selectedTable ? (
            <>
              <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--olive-wash)',
                backgroundColor: 'var(--cream)',
              }}>
                <div style={{
                  fontFamily: 'var(--font-serif)', fontSize: '18px',
                  fontWeight: 600, color: 'var(--olive-dark)'
                }}>
                  Table {selectedTable}
                </div>
                <div style={{
                  fontFamily: 'var(--font-sans)', fontSize: '11px',
                  color: 'var(--soft-gray)', letterSpacing: '0.08em',
                  textTransform: 'uppercase', marginTop: '2px'
                }}>
                  {isCirc(selectedTable) ? 'Round · 10 seats' : 'Rectangular · 8 seats'}
                </div>
              </div>

              <div style={{ padding: '10px', maxHeight: '380px', overflowY: 'auto' }}>
                {getTableGuests(selectedTable).map(g => (
                  <div key={g.token} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '7px 10px', marginBottom: '5px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--cream)',
                    border: '1px solid var(--olive-wash)',
                  }}>
                    <span style={{
                      fontFamily: 'var(--font-sans)', fontSize: '12px',
                      color: 'var(--charcoal)', flex: 1, marginRight: '6px'
                    }}>
                      {g.nameEn || g.name}
                    </span>
                    <button onClick={() => unassignGuest(g.token)} style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--soft-gray)', fontSize: '13px', padding: '0 2px',
                      lineHeight: 1, flexShrink: 0
                    }}>✕</button>
                  </div>
                ))}
                {getTableGuests(selectedTable).length === 0 && (
                  <div style={{
                    padding: '20px 10px', textAlign: 'center',
                    fontFamily: 'var(--font-sans)', fontSize: '12px',
                    color: 'var(--soft-gray)', letterSpacing: '0.06em'
                  }}>
                    No guests yet
                  </div>
                )}
              </div>

              <div style={{ padding: '10px 10px 14px' }}>
                <button onClick={() => setSelectedTable(null)} style={{
                  width: '100%', padding: '8px', borderRadius: '6px',
                  border: '1.5px solid var(--olive-pale)',
                  backgroundColor: 'transparent', cursor: 'pointer',
                  fontFamily: 'var(--font-sans)', fontSize: '11px',
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: 'var(--soft-gray)'
                }}>
                  Deselect
                </button>
              </div>
            </>
          ) : (
            <div style={{
              padding: '30px 16px', textAlign: 'center',
              fontFamily: 'var(--font-sans)', fontSize: '12px',
              color: 'var(--soft-gray)', letterSpacing: '0.06em',
              lineHeight: 1.6
            }}>
              Click a table to view & manage guests
            </div>
          )}
        </div>

      </div>

      {/* ── Guest Assignment Summary (card grid) ── */}
      <div style={{ marginTop: '40px' }}>
        <div style={{ height: '1px', backgroundColor: 'var(--olive-wash)', marginBottom: '28px' }} />
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{
            margin: 0, fontFamily: 'var(--font-serif)', fontSize: '20px',
            fontWeight: 600, color: 'var(--olive-dark)', letterSpacing: '0.02em'
          }}>
            Guest Assignment Summary
          </h3>
          <span style={{
            fontFamily: 'var(--font-sans)', fontSize: '11px',
            color: 'var(--soft-gray)', letterSpacing: '0.08em', textTransform: 'uppercase'
          }}>
            {guests.filter(g => g.inviteType === 'real' && g.tableNumber).length} of {guests.filter(g => g.inviteType === 'real').length} placed
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '14px'
        }}>
          {[1,2,3,4,5,6,7,8,9,10,11,12,13].map(n => {
            const tGuests = getTableGuests(n)
            const seats = maxSeats(n)
            const full = tGuests.length >= seats
            const empty = tGuests.length === 0

            return (
              <div key={n} style={{
                borderRadius: '10px',
                border: `1.5px solid ${full ? 'var(--gold)' : 'var(--olive-wash)'}`,
                backgroundColor: 'var(--warm-white)',
                overflow: 'hidden'
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px',
                  backgroundColor: full ? '#c8a96e18' : 'var(--cream)',
                  borderBottom: `1px solid ${full ? '#c8a96e44' : 'var(--olive-wash)'}`
                }}>
                  <div>
                    <span style={{
                      fontFamily: 'var(--font-sans)', fontSize: '14px',
                      fontWeight: 700, color: 'var(--olive-dark)', letterSpacing: '0.04em'
                    }}>
                      Table {n}
                    </span>
                    <span style={{
                      marginLeft: '8px',
                      fontFamily: 'var(--font-sans)', fontSize: '10px',
                      color: 'var(--soft-gray)', letterSpacing: '0.06em', textTransform: 'uppercase'
                    }}>
                      {isCirc(n) ? 'Round' : 'Rect'}
                    </span>
                  </div>
                  <span style={{
                    fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 600,
                    color: full ? 'var(--gold)' : 'var(--olive-medium)',
                    letterSpacing: '0.04em'
                  }}>
                    {tGuests.length}/{seats}
                  </span>
                </div>

                <div style={{ padding: '10px 14px' }}>
                  {empty ? (
                    <span style={{
                      fontFamily: 'var(--font-sans)', fontSize: '12px',
                      color: 'var(--soft-gray)', fontStyle: 'italic'
                    }}>
                      Empty
                    </span>
                  ) : (
                    tGuests.map((g, i) => (
                      <div key={g.token} style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        paddingTop: i === 0 ? 0 : '7px',
                        marginTop: i === 0 ? 0 : '7px',
                        borderTop: i === 0 ? 'none' : '1px solid var(--olive-wash)'
                      }}>
                        <span style={{
                          width: '5px', height: '5px', borderRadius: '50%',
                          backgroundColor: 'var(--olive-pale)', flexShrink: 0
                        }} />
                        <span style={{
                          fontFamily: 'var(--font-sans)', fontSize: '12px',
                          color: 'var(--charcoal)', lineHeight: 1.3
                        }}>
                          {g.nameEn || g.name}
                          {g.nameAr && (
                            <span style={{ display: 'block', fontSize: '11px', color: 'var(--soft-gray)', direction: 'rtl' }}>
                              {g.nameAr}
                            </span>
                          )}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}