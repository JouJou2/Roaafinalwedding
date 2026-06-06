# Wedding Invitation — Olive Watercolor Theme

A beautiful, professional wedding invitation frontend built with **React + Vite**.

## Features

### Guest Invitation Page (`/invite/:token`)
- **Personalized greeting** — "Dear [First Name],"
- **Soft watercolor olive branches** — floating, parallax-scrolling decorations on all sides
- **Parallax layers** — branches move at different speeds as you scroll
- **Love story timeline** — engagement milestones with watercolor-style photo placeholders blended into the content
- **Date & venue section** — with one-click "Add to Calendar" (.ics download)
- **Embedded venue map** — Google Maps iframe with muted olive tones
- **RSVP system** — Yes/No buttons with smooth animations
- **Plus-one handling** — max 1 extra guest, with name input
- **Music toggle** — placeholder button for background music
- **Responsive design** — works beautifully on mobile and desktop
- **Elegant typography** — Great Vibes (script), Cormorant Garamond (serif), Josefin Sans (sans)
- **Olive color palette** — warm greens, creams, and soft grays

### Admin Dashboard (`/admin`)
- **Password-protected login** — clean, elegant login card
- **Guest statistics** — total, attending, declined, pending
- **Total attendance count** — including plus ones
- **Guest list table** — with RSVP status, plus-one names, invitation links
- **Copy invitation link** — one-click copy to clipboard
- **Search & filter** — by name/email and RSVP status
- **Add new guest** — modal with name, email, plus-one toggle
- **Link generation** — each guest gets a unique token-based URL

## Tech Stack

- React 18
- Vite
- React Router DOM
- Framer Motion (animations & parallax)
- Lucide React (icons)
- CSS custom properties (design tokens)

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Routes

| Route | Purpose |
|-------|---------|
| `/` | Default invitation (uses mock guest data) |
| `/invite/:token` | Personalized invitation for a specific guest |
| `/admin` | Admin dashboard (password: `wedding2026`) |

## Integration with Your Backend

The frontend uses mock data. To connect to your backend:

1. **Guest data fetch** — In `InvitationPage.jsx`, replace the `setTimeout` mock with a real API call:
   ```js
   const response = await fetch(`/api/guests/${token}`)
   const guestData = await response.json()
   ```

2. **RSVP submission** — In the `submitRSVP` function, POST to your API:
   ```js
   await fetch(`/api/guests/${token}/rsvp`, {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ status, plusOne })
   })
   ```

3. **Admin authentication** — Replace the hardcoded password check with your auth endpoint.

4. **Guest list** — Fetch from `/api/guests` instead of using `mockGuests`.

5. **Add guest** — POST to `/api/guests` to create a new guest with a generated token.

## Customization

- **Couple names** — Edit in `InvitationPage.jsx` (search for "Elena" & "Marco")
- **Wedding date** — Change `weddingDate` constant
- **Venue details** — Update `venueName` and `venueAddress`
- **Colors** — Modify CSS custom properties in `index.css`
- **Images** — Replace images in `/public/images/` with your own watercolor olive branches
- **Admin password** — Change in `AdminPage.jsx` (currently `wedding2026`)

## File Structure

```
wedding-invite/
├── index.html
├── package.json
├── vite.config.js
├── public/
│   └── images/          # Olive branch watercolor images
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── index.css        # Design tokens & global styles
│   └── pages/
│       ├── InvitationPage.jsx    # Guest invitation
│       ├── InvitationPage.css    # Invitation styles
│       ├── AdminPage.jsx         # Admin dashboard
│       └── AdminPage.css         # Admin styles
```

## Design Notes

- The olive branches are positioned as fixed decorative elements with parallax scroll effects
- All animations use Framer Motion for smooth, natural motion
- The color palette is carefully chosen to evoke a Mediterranean, painterly feel
- Typography hierarchy: script for names, serif for headings, sans for body
- The timeline photos are styled as watercolor-washed placeholders — replace with real engagement photos
