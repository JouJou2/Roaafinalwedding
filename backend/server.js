const express = require('express')
const fs = require('fs')
const path = require('path')
const cors = require('cors')
const crypto = require('crypto')

const DATA_DIR = path.join(__dirname, 'data')
const INVITES_FILE = path.join(DATA_DIR, 'invites.json')

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
if (!fs.existsSync(INVITES_FILE)) fs.writeFileSync(INVITES_FILE, '[]')

const readInvites = () => {
  try {
    const raw = fs.readFileSync(INVITES_FILE, 'utf8')
    return JSON.parse(raw || '[]')
  } catch (e) {
    return []
  }
}

const writeInvites = (arr) => {
  fs.writeFileSync(INVITES_FILE, JSON.stringify(arr, null, 2))
}

const app = express()
app.use(cors())
app.use(express.json())

// health
app.get('/health', (req, res) => res.json({ ok: true }))

// Create invite
app.post('/api/invite', (req, res) => {
  const { nameEn, nameAr, email, allowsPlusOne } = req.body || {}
  if (!nameEn && !nameAr) return res.status(400).json({ error: 'nameEn or nameAr required' })

  const token = crypto.randomBytes(16).toString('hex')
  const name = (nameEn && nameEn.trim()) || (nameAr && nameAr.trim()) || 'Guest'
  const firstName = (name.split(/\s+/)[0])

  const invite = {
    id: Date.now(),
    token,
    name,
    nameEn: nameEn || '',
    nameAr: nameAr || '',
    firstName,
    email: email || '',
    rsvpStatus: null,
    rsvpFinalized: false,
    plusOneName: '',
    opened: false,
    createdAt: new Date().toISOString(),
    allowsPlusOne: !!allowsPlusOne,
    customMessage: 'We are honored to celebrate with you!',
    customMessageAr: ' فرحتنا تكبر بكم!',
  }

  const invites = readInvites()
  invites.push(invite)
  writeInvites(invites)

  res.json(invite)
})

// Get invite by token
app.get('/api/invite/:token', (req, res) => {
  const token = req.params.token
  const invites = readInvites()
  const found = invites.find(i => i.token === token)
  if (!found) return res.status(404).json({ error: 'Not found' })
  // mark opened
  found.opened = true
  writeInvites(invites)
  res.json(found)
})

// List all invites
app.get('/api/invites', (req, res) => {
  const invites = readInvites()
  res.json(invites)
})

// Update invite fields (PATCH)
app.patch('/api/invite/:token', (req, res) => {
  const token = req.params.token
  const updates = req.body || {}
  const invites = readInvites()
  const idx = invites.findIndex(i => i.token === token)
  if (idx === -1) return res.status(404).json({ error: 'Not found' })

  const invite = invites[idx]
  // allow updating specific fields
  const allowed = ['rsvpStatus', 'rsvpFinalized', 'plusOneName', 'opened', 'rsvpDate', 'nameEn', 'nameAr', 'email', 'allowsPlusOne']
  Object.keys(updates).forEach(k => {
    if (allowed.includes(k)) invite[k] = updates[k]
  })

  invites[idx] = invite
  writeInvites(invites)
  res.json(invite)
})

// Delete invite by token
app.delete('/api/invite/:token', (req, res) => {
  const token = req.params.token
  const invites = readInvites()
  const nextInvites = invites.filter(i => i.token !== token)

  if (nextInvites.length === invites.length) {
    return res.status(404).json({ error: 'Not found' })
  }

  writeInvites(nextInvites)
  res.json({ ok: true, token })
})

const PORT = process.env.PORT || 4000
app.listen(PORT, () => console.log(`Local invite API listening on http://localhost:${PORT}`))
