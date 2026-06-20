import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../supabase'
import './SeatingPage.css'

const CIRC_TABLES = [5,6,7,8,13]
const TABLE_W = 70
const TABLE_H = 45
const CIRC_R = 35
const CANVAS_W = 980
const CANVAS_H = 700

const defaultTablePositions = {
  1:{x:80,y:100},2:{x:240,y:100},3:{x:400,y:100},4:{x:560,y:100},
  5:{x:160,y:280},6:{x:320,y:280},7:{x:480,y:280},8:{x:640,y:280},
  9:{x:80,y:460},10:{x:240,y:460},11:{x:400,y:460},12:{x:560,y:460},
  13:{x:320,y:460}
}
const defaultEntrancePos = { x: 320, y: 540 }

const getSetting = async (key) => {
  const { data } = await supabase.from('settings').select('value').eq('key', key).single()
  return data?.value ?? null
}

const isCirc = (n) => CIRC_TABLES.includes(n)
const getRotation = (n) => {
  if (isCirc(n)) return 0
  if ([9,10,11,12].includes(n)) return -45
  return 45
}

function buildPath(points) {
  if (!points || points.length < 2) return ''
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i], p1 = points[i+1]
    if (i === points.length - 2) {
      d += ` L ${p1.x} ${p1.y}`
    } else {
      const t = 0.35
      const cx = p1.x * (1-t) + p0.x * t
      const cy = p1.y * (1-t) + p0.y * t
      d += ` Q ${cx} ${cy} ${(p0.x+p1.x)/2} ${(p0.y+p1.y)/2}`
      const p2 = points[i+2]
      const mx = (p1.x+p2.x)/2, my = (p1.y+p2.y)/2
      d += ` Q ${p1.x} ${p1.y} ${mx} ${my}`
    }
  }
  return d
}

function VenueMap({ tablePositions, entrancePos, bgImage, tablePaths, highlightTable, onClose }) {
  const containerRef = useRef(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        const w = containerRef.current.offsetWidth
        const h = containerRef.current.offsetHeight
        const scaleW = w / CANVAS_W
        const scaleH = h / CANVAS_H
        setScale(Math.min(scaleW, scaleH, 1.4))
      }
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const path = highlightTable ? tablePaths[highlightTable] : null
  const hasPath = path && path.length >= 2

  return (
    <div style={{ position:'fixed', inset:0, zIndex:2000, backgroundColor:'rgba(0,0,0,0.92)', display:'flex', flexDirection:'column', alignItems:'stretch', justifyContent:'flex-start' }}>
      {/* Header */}
      <div style={{ width:'100%', boxSizing:'border-box', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', flexShrink:0 }}>
        <div>
          <span style={{ fontFamily:"'Josefin Sans',sans-serif", fontSize:'11px', textTransform:'uppercase', letterSpacing:'0.12em', color:'rgba(255,255,255,0.5)' }}>Venue Map</span>
          {highlightTable && <span style={{ marginLeft:'10px', fontFamily:"'Josefin Sans',sans-serif", fontSize:'13px', fontWeight:700, color:'#e63946', letterSpacing:'0.06em' }}>Table {highlightTable} ↑</span>}
        </div>
        <button onClick={onClose} style={{ background:'none', border:'1px solid rgba(255,255,255,0.3)', color:'white', borderRadius:'20px', padding:'6px 16px', cursor:'pointer', fontFamily:"'Josefin Sans',sans-serif", fontSize:'12px', letterSpacing:'0.08em' }}>✕ Close</button>
      </div>

      {/* Canvas */}
      <div ref={containerRef} style={{ flex:1, minHeight:0, width:'100%', display:'flex', alignItems:'center', justifyContent:'center', padding:'0 12px 12px', boxSizing:'border-box', overflow:'hidden' }}>
        <div style={{ width: CANVAS_W, height: CANVAS_H, transform:`scale(${scale})`, position:'relative', borderRadius:'12px', overflow:'hidden', backgroundImage: bgImage ? `url(${bgImage})` : `radial-gradient(circle, #c8d4b0 1px, transparent 1px)`, backgroundSize: bgImage ? 'cover' : '28px 28px', backgroundPosition: bgImage ? 'center' : '0 0', backgroundColor: bgImage ? 'transparent' : '#f5f0e8', border:'1.5px solid rgba(255,255,255,0.15)', flexShrink:0 }}>

          {/* SVG: path + arrow */}
          <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none', zIndex:5 }}>
            <defs>
              <marker id="guest-arrow" markerWidth="9" markerHeight="9" refX="4.5" refY="4.5" orient="auto">
                <path d="M0,0 L0,9 L9,4.5 z" fill="#e63946" />
              </marker>
            </defs>

            {hasPath && (
              <path d={buildPath(path)} stroke="#e63946" strokeWidth="6" fill="none" opacity="0.2" strokeLinecap="round" strokeLinejoin="round" />
            )}
            {hasPath && (
              <path d={buildPath(path)} stroke="#e63946" strokeWidth="2.5" strokeDasharray="10 6" fill="none" strokeLinecap="round" strokeLinejoin="round" markerEnd="url(#guest-arrow)" />
            )}
          </svg>

          {/* Tables */}
          {[1,2,3,4,5,6,7,8,9,10,11,12,13].map(n => {
            const pos = tablePositions[n]
            const circ = isCirc(n)
            const highlight = highlightTable === n
            const w = circ ? CIRC_R*2 : TABLE_W
            const h = circ ? CIRC_R*2 : TABLE_H
            const rot = getRotation(n)
            return (
              <div key={n} style={{ position:'absolute', left:pos.x, top:pos.y, width:w, height:h, borderRadius: circ ? '50%' : '8px', transform: rot ? `rotate(${rot}deg)` : 'none', transformOrigin:'center', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', userSelect:'none', backgroundColor: highlight ? 'rgba(230,57,70,0.18)' : 'rgba(107,127,78,0.6)', border: highlight ? '2.5px solid #e63946' : '2px solid #3a4a2e', boxShadow: highlight ? '0 0 0 5px rgba(230,57,70,0.2), 0 0 24px rgba(230,57,70,0.5)' : '0 2px 6px rgba(0,0,0,0.2)', zIndex: highlight ? 4 : 2, animation: highlight ? 'tablePulse 1.8s ease-in-out infinite' : 'none' }}>
                <span style={{ fontFamily:"'Josefin Sans',sans-serif", fontSize:'11px', fontWeight:700, color: highlight ? '#e63946' : 'white', transform: rot ? `rotate(${-rot}deg)` : 'none' }}>T{n}</span>
              </div>
            )
          })}

          {/* Entrance Pin */}
          <div style={{ position:'absolute', left:entrancePos.x, top:entrancePos.y, transform:'translate(-50%,-100%)', zIndex:6, display:'flex', flexDirection:'column', alignItems:'center', filter:'drop-shadow(0 2px 6px rgba(0,0,0,0.4))', pointerEvents:'none' }}>
            <div style={{ backgroundColor:'#e63946', color:'white', borderRadius:'50% 50% 50% 0', width:'30px', height:'30px', transform:'rotate(-45deg)', display:'flex', alignItems:'center', justifyContent:'center', border:'2.5px solid white' }}>
              <span style={{ transform:'rotate(45deg)', fontSize:'13px' }}>📍</span>
            </div>
            <div style={{ backgroundColor:'rgba(230,57,70,0.92)', color:'white', borderRadius:'4px', padding:'2px 7px', fontSize:'9px', fontFamily:"'Josefin Sans',sans-serif", letterSpacing:'0.1em', textTransform:'uppercase', marginTop:'4px', whiteSpace:'nowrap', border:'1px solid rgba(255,255,255,0.3)' }}>
              You are here
            </div>
          </div>

        </div>
      </div>

      {/* Legend */}
      <div style={{ display:'flex', gap:'20px', padding:'0 16px 16px', flexWrap:'wrap', justifyContent:'center', flexShrink:0 }}>
        {[['#e63946','Your table'],['rgba(255,255,255,0.6)','Other tables'],['#e63946','Walking path']].map(([color, label]) => (
          <div key={label} style={{ display:'flex', alignItems:'center', gap:'6px' }}>
            <div style={{ width:'10px', height:'10px', borderRadius:'50%', backgroundColor:color }} />
            <span style={{ fontFamily:"'Josefin Sans',sans-serif", fontSize:'11px', color:'rgba(255,255,255,0.6)', letterSpacing:'0.06em' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function SeatingPage() {
  const [guests, setGuests] = useState([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tablePositions, setTablePositions] = useState(defaultTablePositions)
  const [entrancePos, setEntrancePos] = useState(defaultEntrancePos)
  const [bgImage, setBgImage] = useState(null)
  const [tablePaths, setTablePaths] = useState({})
  const [mapLoading, setMapLoading] = useState(true)
  const [showMap, setShowMap] = useState(false)

  useEffect(() => {
    supabase.from('guests').select('*').then(({ data }) => {
      setGuests(data || [])
      setLoading(false)
    })
    const loadSettings = async () => {
      const [posJson, bg, entrJson, pathsJson] = await Promise.all([
        getSetting('seating-table-positions'),
        getSetting('seating-bg'),
        getSetting('seating-entrance-pos'),
        getSetting('seating-table-paths'),
      ])
      if (posJson) { try { setTablePositions(JSON.parse(posJson)) } catch {} }
      if (bg) setBgImage(bg)
      if (entrJson) { try { setEntrancePos(JSON.parse(entrJson)) } catch {} }
      if (pathsJson) { try { setTablePaths(JSON.parse(pathsJson)) } catch {} }
      setMapLoading(false)
    }
    loadSettings()
  }, [])

  const filtered = guests.filter(g => {
    const q = search.toLowerCase()
    return (g.nameEn || '').toLowerCase().includes(q) || (g.nameAr || '').toLowerCase().includes(q)
  })

  const tableLabel = (n) => n ? `Table ${n}` : 'Not assigned yet'

  return (
    <div className="seating-page">
      <style>{`
        @keyframes tablePulse {
          0%,100% { box-shadow: 0 0 0 5px rgba(230,57,70,0.2), 0 0 24px rgba(230,57,70,0.5); }
          50% { box-shadow: 0 0 0 10px rgba(230,57,70,0.08), 0 0 40px rgba(230,57,70,0.7); }
        }
      `}</style>

      <div className="seating-page-header">
        <img src="/images/1_Watercolor_banner_with_green_olive.png" alt="" className="seating-page-olive" />
        <h1 className="seating-page-title">Find Your Seat</h1>
        <p className="seating-page-sub">ابحث عن طاولتك</p>
      </div>

      <div className="seating-search-wrapper">
        <input className="seating-search-input" type="text"
          placeholder="Search your name... / ابحث عن اسمك"
          value={search}
          onChange={e => { setSearch(e.target.value); setSelected(null) }}
          autoFocus />
      </div>

      {loading && <div className="seating-loading">Loading...</div>}

      <div className="seating-results">
        {search.length > 0 && filtered.map(g => (
          <motion.div key={g.token} className="seating-result-item"
            initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
            onClick={() => { setSelected(selected?.token === g.token ? null : g); setShowMap(false) }}>
            <span className="seating-result-name">{g.nameEn || g.name}</span>
            {g.nameAr && <span className="seating-result-name-ar">{g.nameAr}</span>}
            <span className="seating-result-table">{tableLabel(g.tableNumber)}</span>
          </motion.div>
        ))}
        {search.length === 0 && (
          <div className="seating-browse">
            {guests.filter(g => g.tableNumber).sort((a,b) => a.tableNumber - b.tableNumber).map(g => (
              <motion.div key={g.token} className="seating-result-item"
                initial={{ opacity:0 }} animate={{ opacity:1 }}
                onClick={() => { setSelected(selected?.token === g.token ? null : g); setShowMap(false) }}>
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
          <motion.div className="seating-modal-backdrop"
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            onClick={() => setSelected(null)}>
            <motion.div className="seating-modal"
              initial={{ opacity:0, scale:0.9, y:20 }}
              animate={{ opacity:1, scale:1, y:0 }}
              exit={{ opacity:0, scale:0.9 }}
              onClick={e => e.stopPropagation()}>

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
                      {CIRC_TABLES.includes(selected.tableNumber) ? 'Round table · up to 10 guests' : 'Rectangular table · up to 8 guests'}
                    </span>
                  </div>

                  {!mapLoading && (
                    <button onClick={() => setShowMap(true)}
                      style={{ marginTop:'14px', width:'100%', padding:'12px', borderRadius:'10px', border:'1.5px solid #c8d4b0', backgroundColor:'#f5f9f0', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', fontFamily:"'Josefin Sans',sans-serif", fontSize:'12px', letterSpacing:'0.1em', textTransform:'uppercase', color:'#3a4a2e', fontWeight:600 }}>
                      🗺 View Venue Map
                    </button>
                  )}
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

      {/* Fullscreen map */}
      <AnimatePresence>
        {showMap && selected && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
            <VenueMap
              tablePositions={tablePositions}
              entrancePos={entrancePos}
              bgImage={bgImage}
              tablePaths={tablePaths}
              highlightTable={selected.tableNumber}
              onClose={() => setShowMap(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}