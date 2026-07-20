import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'

const CIRC_TABLES = [5,6,7,8,13,14]
const TABLE_NUMS = [1,2,3,4,5,6,7,8,9,10,11,12,13,14]
const TABLE_W = 70
const TABLE_H = 45
const CIRC_R = 35

const TABLE_NAMES = {
  1: 'رمّان',
  2: 'زيتون',
  3: 'زعفران',
  4: 'حبق',
  5: 'زعتر',
  6: 'صنوبر',
  7: 'تين',
  8: 'ياسمين',
  9: 'زهر اللوز',
  10: 'زهر الليمون',
  11: 'إكليل الجبل',
  12: 'خرّوب',
  13: 'حامض',
  14: 'نعنع',
}

const defaultTablePositions = {
  1:{x:80,y:100},2:{x:240,y:100},3:{x:400,y:100},4:{x:560,y:100},
  5:{x:160,y:280},6:{x:320,y:280},7:{x:480,y:280},8:{x:640,y:280},
  9:{x:80,y:460},10:{x:240,y:460},11:{x:400,y:460},12:{x:560,y:460},
  13:{x:320,y:460},14:{x:760,y:460}
}
const defaultEntrancePos = { x: 320, y: 540 }

const getSetting = async (key) => {
  const { data } = await supabase.from('settings').select('value').eq('key', key).single()
  return data?.value ?? null
}
const setSetting = async (key, value) => {
  await supabase.from('settings').upsert({ key, value }, { onConflict: 'key' })
}

const isCirc = (n) => CIRC_TABLES.includes(n)
const getRotation = (n) => {
  if (isCirc(n)) return 'none'
  if ([9,10,11,12].includes(n)) return 'rotate(-45deg)'
  return 'rotate(45deg)'
}
const maxSeats = (n) => isCirc(n) ? 10 : 8
const tableCenterX = (n, pos) => pos.x + (isCirc(n) ? CIRC_R : TABLE_W / 2)
const tableCenterY = (n, pos) => pos.y + (isCirc(n) ? CIRC_R : TABLE_H / 2)

function buildPath(points) {
  if (!points || points.length < 2) return ''
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`
  }
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i]
    const p1 = points[i + 1]
    if (i === points.length - 2) {
      d += ` L ${p1.x} ${p1.y}`
    } else {
      const p2 = points[i + 2]
      const mx = (p1.x + p2.x) / 2
      const my = (p1.y + p2.y) / 2
      const t = 0.35
      const cx = p1.x * (1 - t) + p0.x * t
      const cy = p1.y * (1 - t) + p0.y * t
      d += ` Q ${cx} ${cy} ${(p0.x + p1.x) / 2} ${(p0.y + p1.y) / 2}`
      d += ` Q ${p1.x} ${p1.y} ${mx} ${my}`
    }
  }
  return d
}

function flattenGuests(guests) {
  const flat = []
  for (const g of guests) {
    if (g.inviteType === 'real' && g.rsvpStatus === 'yes') {
      flat.push({ ...g, _isPlusOne: false, _parentToken: null })
      if (g.plusOneName) {
        flat.push({
          ...g,
          token: `${g.token}:plusone`,
          name: g.plusOneName,
          nameEn: g.plusOneName,
          plusOneName: null,
          tableNumber: g.plusOneTableNumber ?? null,
          _isPlusOne: true,
          _parentToken: g.token,
          _parentName: g.nameEn || g.name,
        })
      }
    }
  }
  return flat
}

export default function SeatingChart({ guests, onUpdate }) {
  const canvasRef = useRef(null)
  const [tablePositions, setTablePositions] = useState(defaultTablePositions)
  const [entrancePos, setEntrancePos] = useState(defaultEntrancePos)
  const [tablePaths, setTablePaths] = useState({})
  const [draggingTable, setDraggingTable] = useState(null)
  const [draggingEntrance, setDraggingEntrance] = useState(false)
  const [draggingWaypoint, setDraggingWaypoint] = useState(null)
  const [draggingGuest, setDraggingGuest] = useState(null)
  const [dragOver, setDragOver] = useState(null)
  const [bgImage, setBgImage] = useState(null)
  const [saving, setSaving] = useState(false)
  const [selectedTable, setSelectedTable] = useState(null)
  const [editingPathFor, setEditingPathFor] = useState(null)
  const [loading, setLoading] = useState(true)
  const dragOffset = useRef({ x: 0, y: 0 })

  const flatGuests = flattenGuests(guests)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [posJson, bg, entrJson, pathsJson] = await Promise.all([
        getSetting('seating-table-positions'),
        getSetting('seating-bg'),
        getSetting('seating-entrance-pos'),
        getSetting('seating-table-paths'),
      ])
      if (posJson) { try { setTablePositions(prev => ({ ...prev, ...JSON.parse(posJson) })) } catch {} }
      if (bg) setBgImage(bg)
      if (entrJson) { try { setEntrancePos(JSON.parse(entrJson)) } catch {} }
      if (pathsJson) { try { setTablePaths(JSON.parse(pathsJson)) } catch {} }
      setLoading(false)
    }
    load()
  }, [])

  const unassigned = flatGuests.filter(g => !g.tableNumber)
  const getTableGuests = (n) => flatGuests.filter(g => g.tableNumber === n)

  const unassignedPrimary = unassigned.filter(g => !g._isPlusOne)
  const unassignedPlusOnes = unassigned.filter(g => g._isPlusOne)

  const saveTablePositions = async (pos) => {
    setTablePositions(pos)
    await setSetting('seating-table-positions', JSON.stringify(pos))
  }
  const saveEntrancePos = async (pos) => {
    setEntrancePos(pos)
    await setSetting('seating-entrance-pos', JSON.stringify(pos))
  }
  const saveTablePaths = async (paths) => {
    setTablePaths(paths)
    await setSetting('seating-table-paths', JSON.stringify(paths))
  }

  const assignGuest = async (token, tableNumber) => {
    setSaving(true)
    if (token.includes(':plusone')) {
      const parentToken = token.split(':plusone')[0]
      await supabase.from('guests').update({ plusOneTableNumber: tableNumber }).eq('token', parentToken)
    } else {
      await supabase.from('guests').update({ tableNumber }).eq('token', token)
    }
    onUpdate()
    setSaving(false)
  }
  
  const unassignGuest = async (token) => {
    setSaving(true)
    if (token.includes(':plusone')) {
      const parentToken = token.split(':plusone')[0]
      await supabase.from('guests').update({ plusOneTableNumber: null }).eq('token', parentToken)
    } else {
      await supabase.from('guests').update({ tableNumber: null }).eq('token', token)
    }
    onUpdate()
    setSaving(false)
  }

  const handleBgUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      setBgImage(ev.target.result); setSaving(true)
      await setSetting('seating-bg', ev.target.result); setSaving(false)
    }
    reader.readAsDataURL(file)
  }
  const handleClearBg = async () => {
    setBgImage(null); setSaving(true)
    await setSetting('seating-bg', ''); setSaving(false)
  }

  const getCanvasPoint = (e) => {
    const canvas = canvasRef.current.getBoundingClientRect()
    return { x: e.clientX - canvas.left, y: e.clientY - canvas.top }
  }

  const handleCanvasClick = (e) => {
    if (!editingPathFor) return
    if (e.target !== canvasRef.current && !e.target.classList?.contains?.('canvas-bg')) return
    const pt = getCanvasPoint(e)
    const current = tablePaths[editingPathFor] || []
    const newPaths = { ...tablePaths, [editingPathFor]: [...current, pt] }
    saveTablePaths(newPaths)
  }

  const handleTableMouseDown = (e, tableNum) => {
    if (editingPathFor) return
    e.preventDefault()
    const pos = tablePositions[tableNum]
    const canvas = canvasRef.current.getBoundingClientRect()
    dragOffset.current = { x: e.clientX - canvas.left - pos.x, y: e.clientY - canvas.top - pos.y }
    setDraggingTable(tableNum)
  }
  const handleEntranceMouseDown = (e) => {
    if (editingPathFor) return
    e.preventDefault(); e.stopPropagation()
    const canvas = canvasRef.current.getBoundingClientRect()
    dragOffset.current = { x: e.clientX - canvas.left - entrancePos.x, y: e.clientY - canvas.top - entrancePos.y }
    setDraggingEntrance(true)
  }
  const handleWaypointMouseDown = (e, tableNum, index) => {
    e.preventDefault(); e.stopPropagation()
    const canvas = canvasRef.current.getBoundingClientRect()
    const pt = tablePaths[tableNum][index]
    dragOffset.current = { x: e.clientX - canvas.left - pt.x, y: e.clientY - canvas.top - pt.y }
    setDraggingWaypoint({ tableNum, index })
  }

  const handleMouseMove = useCallback((e) => {
    const canvas = canvasRef.current?.getBoundingClientRect(); if (!canvas) return
    const cx = e.clientX - canvas.left
    const cy = e.clientY - canvas.top
    if (draggingTable) {
      const x = Math.max(0, Math.min(cx - dragOffset.current.x, canvas.width - TABLE_W))
      const y = Math.max(0, Math.min(cy - dragOffset.current.y, canvas.height - TABLE_H))
      setTablePositions(prev => ({ ...prev, [draggingTable]: { x, y } }))
    }
    if (draggingEntrance) {
      setEntrancePos({ x: Math.max(0, Math.min(cx - dragOffset.current.x, canvas.width)), y: Math.max(0, Math.min(cy - dragOffset.current.y, canvas.height)) })
    }
    if (draggingWaypoint) {
      const { tableNum, index } = draggingWaypoint
      const x = Math.max(0, Math.min(cx - dragOffset.current.x, canvas.width))
      const y = Math.max(0, Math.min(cy - dragOffset.current.y, canvas.height))
      setTablePaths(prev => {
        const pts = [...(prev[tableNum] || [])]
        pts[index] = { x, y }
        return { ...prev, [tableNum]: pts }
      })
    }
  }, [draggingTable, draggingEntrance, draggingWaypoint])

  const handleMouseUp = useCallback(() => {
    if (draggingTable) { saveTablePositions(tablePositions); setDraggingTable(null) }
    if (draggingEntrance) { saveEntrancePos(entrancePos); setDraggingEntrance(false) }
    if (draggingWaypoint) {
      setSaving(true)
      setSetting('seating-table-paths', JSON.stringify(tablePaths)).then(() => setSaving(false))
      setDraggingWaypoint(null)
    }
  }, [draggingTable, draggingEntrance, draggingWaypoint, tablePositions, entrancePos, tablePaths])

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp) }
  }, [handleMouseMove, handleMouseUp])

  const deleteLastWaypoint = () => {
    if (!editingPathFor) return
    const current = tablePaths[editingPathFor] || []
    if (current.length === 0) return
    const newPaths = { ...tablePaths, [editingPathFor]: current.slice(0, -1) }
    saveTablePaths(newPaths)
  }
  const clearPath = () => {
    if (!editingPathFor) return
    const newPaths = { ...tablePaths, [editingPathFor]: [] }
    saveTablePaths(newPaths)
  }

  const totalReal = guests.filter(g => g.inviteType === 'real' && g.rsvpStatus === 'yes').length
  const assigned = flatGuests.filter(g => g.tableNumber).length
  const totalSeated = flatGuests.length

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'300px', color:'var(--olive-medium)', fontFamily:'var(--font-sans)', fontSize:'13px', letterSpacing:'0.1em' }}>
      Loading seating chart…
    </div>
  )

  return (
    <div style={{ padding: '32px 40px', boxSizing: 'border-box', maxWidth: '100%' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'24px', flexWrap:'wrap', gap:'12px' }}>
        <div>
          <h2 style={{ margin:0, fontFamily:'var(--font-serif)', fontSize:'26px', fontWeight:600, color:'var(--olive-dark)' }}>Seating Chart</h2>
          <p style={{ margin:'4px 0 0', fontFamily:'var(--font-sans)', fontSize:'12px', color:'var(--soft-gray)', letterSpacing:'0.08em', textTransform:'uppercase' }}>
            {assigned} of {totalSeated} guests placed
          </p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap' }}>
          {saving && <span style={{ fontFamily:'var(--font-sans)', fontSize:'12px', color:'var(--olive-medium)' }}>Saving…</span>}
          <label style={{ display:'inline-flex', alignItems:'center', gap:'6px', padding:'8px 16px', borderRadius:'6px', cursor:'pointer', border:'1.5px solid var(--olive-pale)', backgroundColor:'var(--warm-white)', fontFamily:'var(--font-sans)', fontSize:'12px', letterSpacing:'0.08em', color:'var(--olive-dark)', textTransform:'uppercase', fontWeight:600 }}>
            <input type="file" accept="image/*" onChange={handleBgUpload} style={{ display:'none' }} />
            ↑ Upload Floor Plan
          </label>
          {bgImage && <button onClick={handleClearBg} style={{ padding:'8px 14px', borderRadius:'6px', cursor:'pointer', border:'1.5px solid #ddd', backgroundColor:'transparent', fontFamily:'var(--font-sans)', fontSize:'12px', color:'var(--soft-gray)', textTransform:'uppercase' }}>Clear Image</button>}
        </div>
      </div>

      {/* Path edit toolbar */}
      {editingPathFor && (
        <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'12px 16px', marginBottom:'16px', borderRadius:'8px', backgroundColor:'#fff3cd', border:'1.5px solid #f0c040', flexWrap:'wrap' }}>
          <span style={{ fontFamily:'var(--font-sans)', fontSize:'12px', fontWeight:700, color:'#7a5c00', letterSpacing:'0.06em' }}>
            ✏️ EDITING PATH — {TABLE_NAMES[editingPathFor]}
          </span>
          <span style={{ fontFamily:'var(--font-sans)', fontSize:'12px', color:'#7a5c00' }}>
            Click the canvas to add waypoints. Drag waypoints to adjust.
          </span>
          <div style={{ display:'flex', gap:'8px', marginLeft:'auto' }}>
            <button onClick={deleteLastWaypoint} style={{ padding:'6px 12px', borderRadius:'6px', border:'1px solid #f0c040', backgroundColor:'transparent', cursor:'pointer', fontFamily:'var(--font-sans)', fontSize:'11px', color:'#7a5c00' }}>← Undo Last</button>
            <button onClick={clearPath} style={{ padding:'6px 12px', borderRadius:'6px', border:'1px solid #e07070', backgroundColor:'transparent', cursor:'pointer', fontFamily:'var(--font-sans)', fontSize:'11px', color:'#c00' }}>Clear Path</button>
            <button onClick={() => setEditingPathFor(null)} style={{ padding:'6px 14px', borderRadius:'6px', border:'none', backgroundColor:'var(--olive-medium)', cursor:'pointer', fontFamily:'var(--font-sans)', fontSize:'11px', color:'white', fontWeight:600 }}>Done ✓</button>
          </div>
        </div>
      )}

      <div style={{ height:'1px', backgroundColor:'var(--olive-wash)', marginBottom:'24px' }} />

      {/* Main layout */}
      <div style={{ display:'flex', gap:'20px', alignItems:'flex-start' }}>

        {/* Sidebar */}
        <div style={{ width:'220px', flexShrink:0, display:'flex', flexDirection:'column', gap:'14px' }}>
          <div style={{ backgroundColor:'var(--warm-white)', border:'1.5px solid var(--olive-wash)', borderRadius:'10px', overflow:'hidden' }}>
            <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--olive-wash)', backgroundColor:'var(--cream)', fontFamily:'var(--font-sans)', fontSize:'11px', letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--olive-medium)', fontWeight:600 }}>
              Unassigned · {unassignedPrimary.length}
            </div>
            <div style={{ maxHeight:'260px', overflowY:'auto', padding:'10px' }}>
              {unassignedPrimary.map(g => (
                <div key={g.token} draggable onDragStart={() => setDraggingGuest(g)} onDragEnd={() => setDraggingGuest(null)}
                  style={{ display:'flex', alignItems:'center', gap:'8px', padding:'7px 10px', marginBottom:'5px', borderRadius:'6px', cursor:'grab', backgroundColor:'var(--cream)', border:'1px solid var(--olive-wash)', fontFamily:'var(--font-sans)', fontSize:'12px', color:'var(--charcoal)' }}>
                  <span style={{ width:'6px', height:'6px', borderRadius:'50%', backgroundColor:'var(--olive-medium)', flexShrink:0 }} />
                  {g.nameEn || g.name}
                </div>
              ))}
              {unassignedPrimary.length === 0 && <div style={{ padding:'20px 10px', textAlign:'center', fontFamily:'var(--font-sans)', fontSize:'12px', color:'var(--soft-gray)' }}>All guests placed ✓</div>}
            </div>
          </div>

          <div style={{ backgroundColor:'var(--warm-white)', border:'1.5px solid var(--olive-wash)', borderRadius:'10px', overflow:'hidden' }}>
            <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--olive-wash)', backgroundColor:'var(--cream)', fontFamily:'var(--font-sans)', fontSize:'11px', letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--olive-medium)', fontWeight:600 }}>
              Plus-Ones · {unassignedPlusOnes.length}
            </div>
            <div style={{ maxHeight:'240px', overflowY:'auto', padding:'10px' }}>
              {unassignedPlusOnes.map(g => (
                <div key={g.token} draggable onDragStart={() => setDraggingGuest(g)} onDragEnd={() => setDraggingGuest(null)}
                  style={{ display:'flex', flexDirection:'column', gap:'2px', padding:'7px 10px', marginBottom:'5px', borderRadius:'6px', cursor:'grab', backgroundColor:'var(--cream)', border:'1px solid var(--olive-wash)', fontFamily:'var(--font-sans)', fontSize:'12px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                    <span style={{ width:'6px', height:'6px', borderRadius:'50%', backgroundColor:'#c8a96e', flexShrink:0 }} />
                    <span style={{ color:'var(--charcoal)' }}>{g.name}</span>
                  </div>
                  <span style={{ fontSize:'10px', color:'var(--soft-gray)', paddingLeft:'14px' }}>
                    via {g._parentName || g.nameEn || g.name}
                  </span>
                </div>
              ))}
              {unassignedPlusOnes.length === 0 && <div style={{ padding:'20px 10px', textAlign:'center', fontFamily:'var(--font-sans)', fontSize:'12px', color:'var(--soft-gray)' }}>No unassigned plus-ones</div>}
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div style={{ flex: 1, overflowX: 'auto', borderRadius: '10px' }}>
        <div ref={canvasRef}
          onClick={handleCanvasClick}
         style={{ width:'980px', height:'700px', flexShrink:0, position:'relative', borderRadius:'10px', overflow:'hidden', border: editingPathFor ? '2px solid #f0c040' : '1.5px solid var(--olive-wash)', cursor: editingPathFor ? 'crosshair' : 'default', backgroundColor: bgImage ? 'transparent' : 'var(--cream)', backgroundImage: bgImage ? `url(${bgImage})` : `radial-gradient(circle, var(--olive-wash) 1px, transparent 1px)`, backgroundSize: bgImage ? 'cover' : '28px 28px', backgroundPosition: bgImage ? 'center' : '0 0' }}>

          <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none', zIndex:3 }}>
            <defs>
              <marker id="admin-arrow" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
                <path d="M0,0 L0,7 L7,3.5 z" fill="#f0c040" opacity="0.9" />
              </marker>
            </defs>
            {TABLE_NUMS.map(n => {
              const pts = tablePaths[n]
              if (!pts || pts.length < 2) return null
              const isEditing = editingPathFor === n
              const d = buildPath(pts)
              return (
                <path key={n} d={d}
                  stroke={isEditing ? '#f0c040' : 'rgba(139,157,110,0.5)'}
                  strokeWidth={isEditing ? 2.5 : 1.5}
                  strokeDasharray="6 4"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  markerEnd={isEditing ? 'url(#admin-arrow)' : ''}
                />
              )
            })}
          </svg>

          {editingPathFor && (tablePaths[editingPathFor] || []).map((pt, i) => (
            <div key={i} onMouseDown={(e) => handleWaypointMouseDown(e, editingPathFor, i)}
              style={{ position:'absolute', left: pt.x - 8, top: pt.y - 8, width:16, height:16, borderRadius:'50%', backgroundColor: i === 0 ? '#e63946' : '#f0c040', border:'2px solid white', cursor:'grab', zIndex:8, boxShadow:'0 1px 4px rgba(0,0,0,0.3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span style={{ fontSize:'8px', color:'white', fontWeight:700, fontFamily:'monospace' }}>{i+1}</span>
            </div>
          ))}

          {TABLE_NUMS.map(n => {
            const pos = tablePositions[n]
            const circ = isCirc(n)
            const tGuests = getTableGuests(n)
            const full = tGuests.length >= maxSeats(n)
            const isOver = dragOver === n
            const isSelected = selectedTable === n
            const isEditingThis = editingPathFor === n
            const w = circ ? CIRC_R*2 : TABLE_W
            const h = circ ? CIRC_R*2 : TABLE_H
            const name = TABLE_NAMES[n]
            return (
              <div key={n}
                style={{ position:'absolute', left:pos.x, top:pos.y, width:w, height:h, borderRadius: circ ? '50%' : '8px', transform:getRotation(n), transformOrigin:'center', cursor: editingPathFor ? 'default' : 'grab', backgroundColor: isEditingThis ? '#fff3cd' : isSelected ? 'var(--olive-dark)' : full ? '#c8a96e22' : isOver ? 'var(--olive-light)' : 'var(--olive-medium)', border: isEditingThis ? '2px solid #f0c040' : isSelected ? '2px solid var(--gold)' : isOver ? '2px solid var(--olive-dark)' : full ? '2px solid var(--gold)' : '2px solid var(--olive-dark)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', userSelect:'none', zIndex:4, boxShadow: isSelected ? '0 0 0 3px #c8a96e44' : '0 2px 6px rgba(0,0,0,0.15)' }}
                onMouseDown={(e) => handleTableMouseDown(e, n)}
                onDragOver={(e) => { e.preventDefault(); setDragOver(n) }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => { e.preventDefault(); setDragOver(null); if (draggingGuest && !full) assignGuest(draggingGuest.token, n) }}
                onClick={(e) => { e.stopPropagation(); if (!editingPathFor) setSelectedTable(selectedTable === n ? null : n) }}
              >
                <span style={{ fontFamily:'var(--font-sans)', fontSize:'10px', fontWeight:700, color: isEditingThis ? '#7a5c00' : full && !isSelected ? 'var(--gold)' : 'var(--warm-white)', letterSpacing:'0.04em', transform: getRotation(n) !== 'none' ? `rotate(${[9,10,11,12].includes(n) ? '45deg' : '-45deg'})` : 'none', whiteSpace:'nowrap', maxWidth:'90%', overflow:'hidden', textOverflow:'ellipsis' }}>{name}</span>
                <span style={{ fontFamily:'var(--font-sans)', fontSize:'8px', color: isEditingThis ? '#7a5c00' : full && !isSelected ? 'var(--gold)' : 'rgba(255,255,255,0.75)', transform: getRotation(n) !== 'none' ? `rotate(${[9,10,11,12].includes(n) ? '45deg' : '-45deg'})` : 'none' }}>{tGuests.length}/{maxSeats(n)}</span>
              </div>
            )
          })}

          <div onMouseDown={handleEntranceMouseDown} title="Drag to reposition entrance"
            style={{ position:'absolute', left:entrancePos.x, top:entrancePos.y, cursor:'grab', userSelect:'none', transform:'translate(-50%, -100%)', zIndex:10, display:'flex', flexDirection:'column', alignItems:'center', filter:'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>
            <div style={{ backgroundColor:'#e63946', color:'white', borderRadius:'50% 50% 50% 0', width:'32px', height:'32px', transform:'rotate(-45deg)', display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid white' }}>
              <span style={{ transform:'rotate(45deg)', fontSize:'14px' }}>📍</span>
            </div>
            <div style={{ backgroundColor:'rgba(230,57,70,0.9)', color:'white', borderRadius:'4px', padding:'2px 6px', fontSize:'9px', fontFamily:'var(--font-sans)', letterSpacing:'0.08em', textTransform:'uppercase', marginTop:'4px', whiteSpace:'nowrap' }}>Entrance</div>
          </div>

        </div>
        </div>

        {/* Right panel */}
        <div style={{ width:'220px', flexShrink:0, backgroundColor:'var(--warm-white)', border:'1.5px solid var(--olive-wash)', borderRadius:'10px', overflow:'hidden', minHeight:'200px' }}>
          {selectedTable ? (
            <>
              <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--olive-wash)', backgroundColor:'var(--cream)' }}>
                <div style={{ fontFamily:'var(--font-serif)', fontSize:'18px', fontWeight:600, color:'var(--olive-dark)' }}>{TABLE_NAMES[selectedTable]}</div>
                <div style={{ fontFamily:'var(--font-sans)', fontSize:'11px', color:'var(--soft-gray)', letterSpacing:'0.08em', textTransform:'uppercase', marginTop:'2px' }}>{isCirc(selectedTable) ? 'Round · 10 seats' : 'Rectangular · 8 seats'}</div>
              </div>
              <div style={{ padding:'10px', maxHeight:'300px', overflowY:'auto' }}>
                {getTableGuests(selectedTable).map(g => (
                  <div key={g.token} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 10px', marginBottom:'5px', borderRadius:'6px', backgroundColor:'var(--cream)', border:'1px solid var(--olive-wash)' }}>
                    <span style={{ fontFamily:'var(--font-sans)', fontSize:'12px', color:'var(--charcoal)', flex:1, marginRight:'6px' }}>
                      {g.nameEn || g.name}
                      {g._isPlusOne && <span style={{ fontSize:'10px', color:'var(--soft-gray)', marginLeft:'6px' }}>(+1)</span>}
                    </span>
                    <button onClick={() => unassignGuest(g.token)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--soft-gray)', fontSize:'13px', padding:'0 2px' }}>✕</button>
                  </div>
                ))}
                {getTableGuests(selectedTable).length === 0 && <div style={{ padding:'16px 10px', textAlign:'center', fontFamily:'var(--font-sans)', fontSize:'12px', color:'var(--soft-gray)' }}>No guests yet</div>}
              </div>
              <div style={{ padding:'10px' }}>
                <button onClick={() => { setEditingPathFor(editingPathFor === selectedTable ? null : selectedTable) }}
                  style={{ width:'100%', padding:'8px', borderRadius:'6px', border:'1.5px solid #f0c040', backgroundColor: editingPathFor === selectedTable ? '#fff3cd' : 'transparent', cursor:'pointer', fontFamily:'var(--font-sans)', fontSize:'11px', letterSpacing:'0.06em', textTransform:'uppercase', color:'#7a5c00', marginBottom:'6px', fontWeight: editingPathFor === selectedTable ? 700 : 400 }}>
                  {editingPathFor === selectedTable ? '✓ Done Editing Path' : '✏️ Edit Walking Path'}
                </button>
                <button onClick={() => setSelectedTable(null)} style={{ width:'100%', padding:'8px', borderRadius:'6px', border:'1.5px solid var(--olive-pale)', backgroundColor:'transparent', cursor:'pointer', fontFamily:'var(--font-sans)', fontSize:'11px', letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--soft-gray)' }}>Deselect</button>
              </div>
            </>
          ) : (
            <div style={{ padding:'30px 16px', textAlign:'center', fontFamily:'var(--font-sans)', fontSize:'12px', color:'var(--soft-gray)', lineHeight:1.6 }}>
              Click a table to manage guests & edit walking path
            </div>
          )}
        </div>

      </div>

      {/* Guest Assignment Summary */}
      <div style={{ marginTop: '40px' }}>
        <div style={{ height: '1px', backgroundColor: 'var(--olive-wash)', marginBottom: '28px' }} />
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: '20px', fontWeight: 600, color: 'var(--olive-dark)' }}>Guest Assignment Summary</h3>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--soft-gray)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {flatGuests.filter(g => g.tableNumber).length} of {flatGuests.length} placed
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px' }}>
          {TABLE_NUMS.map(n => {
            const tGuests = getTableGuests(n)
            const seats = maxSeats(n)
            const full = tGuests.length >= seats
            return (
              <div key={n} style={{ borderRadius: '10px', border: `1.5px solid ${full ? 'var(--gold)' : 'var(--olive-wash)'}`, backgroundColor: 'var(--warm-white)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: full ? '#c8a96e18' : 'var(--cream)', borderBottom: `1px solid ${full ? '#c8a96e44' : 'var(--olive-wash)'}` }}>
                  <div>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 700, color: 'var(--olive-dark)' }}>{TABLE_NAMES[n]}</span>
                    <span style={{ marginLeft: '8px', fontFamily: 'var(--font-sans)', fontSize: '10px', color: 'var(--soft-gray)', textTransform: 'uppercase' }}>{isCirc(n) ? 'Round' : 'Rect'}</span>
                  </div>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 600, color: full ? 'var(--gold)' : 'var(--olive-medium)' }}>{tGuests.length}/{seats}</span>
                </div>
                <div style={{ padding: '10px 14px' }}>
                  {tGuests.length === 0
                    ? <span style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--soft-gray)', fontStyle: 'italic' }}>Empty</span>
                    : tGuests.map((g, i) => (
                      <div key={g.token} style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: i === 0 ? 0 : '7px', marginTop: i === 0 ? 0 : '7px', borderTop: i === 0 ? 'none' : '1px solid var(--olive-wash)' }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: g._isPlusOne ? '#c8a96e' : 'var(--olive-pale)', flexShrink: 0 }} />
                        <span style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--charcoal)', lineHeight: 1.3 }}>
                          {g.nameEn || g.name}
                          {g._isPlusOne && <span style={{ fontSize:'10px', color:'var(--soft-gray)', marginLeft:'4px' }}>(+1)</span>}
                        </span>
                      </div>
                    ))
                  }
                </div>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}