# Running Orange Tree LMS on your Wi‑Fi network

How to open the LMS from a phone or another laptop on the same Wi‑Fi as the PC that runs it.

```
                    SAME WI-FI NETWORK
                           |
                    Windows PC
                  LAN IP: 192.168.x.x
                           |
              +------------+------------+
              |                         |
        Next.js Frontend          Express Backend
          Port 3000                 Port 5000
              |                         |
              +------------+------------+
                           |
                     PostgreSQL
                       Port 5432
                       localhost          <-- never leaves the PC
```

---

## There is no IP address to configure

This is the part worth reading once.

`NEXT_PUBLIC_API_URL` is compiled into the browser bundle as a single fixed
string, but every device that opens the app runs that same string. `localhost`
means a different machine in each of them — on the PC it is the API, on a phone
it is the phone. Writing the PC's LAN IP into `.env` instead only moves the
problem: DHCP hands out that address and it changes when you join a different
network, and `localhost` on the PC stops working.

So the frontend resolves the API host **per browser**, in
[src/lib/apiOrigin.js](src/lib/apiOrigin.js): when `NEXT_PUBLIC_API_URL` points
at loopback and the page was served from some other host, the API host becomes
the host the page came from. The port and protocol are kept.

| Page opened at | API calls go to |
| --- | --- |
| `http://localhost:3000` | `http://localhost:5000` |
| `http://192.168.1.105:3000` | `http://192.168.1.105:5000` |
| `http://192.168.4.22:3000` (different Wi-Fi, next week) | `http://192.168.4.22:5000` |

**Nothing to edit when your IP changes.** Both work at the same time.

A non-loopback `NEXT_PUBLIC_API_URL` is never rewritten, so a deployed build
pointing at a real API host behaves exactly as before.

### If you ever want to pin an explicit address

Set it in `frontend/lms-web/.env` and restart `npm run dev`:

```env
NEXT_PUBLIC_API_URL=http://192.168.1.105:5000
```

Any non-loopback value is used verbatim. **This is the only place that IP would
live.** You do not need it for normal LAN use.

---

## Step 1 — Find the PC's LAN IP

```powershell
ipconfig
```

Look under your Wi-Fi adapter for **IPv4 Address**, e.g. `192.168.1.105`.

You do not have to remember it: the backend prints it on startup.

```
🚀 Server running on port 5000
   Local:   http://localhost:5000
   Network: http://192.168.1.2:5000
   Open the LMS from another device on this Wi-Fi at http://192.168.1.2:3000
```

---

## Step 2 — Windows Firewall

Inbound connections from other devices are blocked by default. Open **ports
3000 and 5000 only**. Run these in **PowerShell as Administrator** (right-click
Start → Terminal (Admin)):

```powershell
New-NetFirewallRule -DisplayName "Orange LMS frontend (3000)" `
  -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow `
  -Profile Private,Public

New-NetFirewallRule -DisplayName "Orange LMS backend (5000)" `
  -Direction Inbound -Protocol TCP -LocalPort 5000 -Action Allow `
  -Profile Private,Public
```

`-Profile` must include the category your Wi-Fi is in. Check it with:

```powershell
Get-NetConnectionProfile | Select-Object Name, NetworkCategory
```

**Do not open 5432.** PostgreSQL must stay unreachable from the network.

To remove the rules again:

```powershell
Remove-NetFirewallRule -DisplayName "Orange LMS frontend (3000)"
Remove-NetFirewallRule -DisplayName "Orange LMS backend (5000)"
```

---

## Step 3 — Start it

### Terminal 1 — backend

```bash
cd "C:\Orange Tree LMS\backend\lms-api"
npm install
npx prisma generate
npm run dev        # or: npm start
```

### Terminal 2 — frontend

```bash
cd "C:\Orange Tree LMS\frontend\lms-web"
npm install
npm run dev
```

Both `dev` scripts now bind to all network interfaces.

---

## Step 4 — Open it

| Where | URL |
| --- | --- |
| On the PC | `http://localhost:3000` |
| Another laptop / phone on the same Wi-Fi | `http://<PC-LAN-IP>:3000` |

Both keep working at the same time.

---

## Environment variables

### Frontend — `frontend/lms-web/.env`

```env
NEXT_PUBLIC_API_URL=http://localhost:5000     # leave as-is; resolved per device
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000  # same
```

Only `NEXT_PUBLIC_*` values reach the browser. **Never put a secret here** — no
JWT secret, no database URL, no SMTP password.

### Backend — `backend/lms-api/.env`

```env
PORT=5000
HOST=0.0.0.0             # all interfaces; set 127.0.0.1 to make the API PC-only
ALLOW_LAN_ORIGINS=true   # accept browser origins from private LAN ranges

DATABASE_URL="postgresql://postgres:<password>@localhost:5432/<database>"
```

`DATABASE_URL` stays on `localhost`. That is what keeps the database private.

---

## PostgreSQL stays off the network

Nothing in this setup exposes the database. Prisma connects over
`DATABASE_URL` to `localhost:5432` from the API process only, and port 5432 is
never opened in the firewall.

```
Other device  ->  Next.js  ->  Express  ->  Prisma  ->  PostgreSQL
```

A phone on the Wi-Fi can reach ports 3000 and 5000. It cannot reach 5432.

---

## Testing checklist

**On the PC**

- [ ] `http://localhost:3000` loads
- [ ] `http://localhost:5000` returns `{"success":true,"message":"Orange LMS API Running"}`
- [ ] `http://<PC-LAN-IP>:3000` loads
- [ ] `http://<PC-LAN-IP>:5000` returns the same JSON

**On another laptop and on a phone, same Wi-Fi, at `http://<PC-LAN-IP>:3000`**

- [ ] Landing page loads, styles and images render
- [ ] Register
- [ ] Login (all three roles: ADMIN, INSTRUCTOR, STUDENT)
- [ ] Dashboard loads for each role
- [ ] Course listing and course details
- [ ] Pricing shows real Store price, or `Pricing unavailable`
- [ ] Enrollment
- [ ] Lessons open; topics/subtopics/concepts navigate
- [ ] Videos play
- [ ] PDF and DOC/DOCX lesson content renders (PPTX shows an Open Document link — see Troubleshooting)
- [ ] Quizzes: start, answer, submit, see result
- [ ] Assignments: view and submit
- [ ] Messages / chat send and arrive live (this is the Socket.io path)
- [ ] Notifications arrive live
- [ ] Session survives a page refresh (JWT refresh)
- [ ] Logout, then a protected URL redirects away
- [ ] Instructor sees no pricing and no publish controls
- [ ] Admin pricing and publishing work

---

## Troubleshooting

**Works on `localhost:3000`, not on `<PC-LAN-IP>:3000`**

1. Same Wi-Fi? Phones silently fall back to mobile data — turn it off to be sure.
2. Firewall rules for 3000 and 5000 created, on the right profile (Step 2)?
3. Is the Wi-Fi "Guest" mode / AP isolation on? Guest networks block
   device-to-device traffic entirely; the router setting is usually called
   *AP isolation* or *client isolation*. Use the normal network instead.
4. Has the PC's IP changed? Re-run `ipconfig` — DHCP reassigns on reconnect.
5. Is the backend actually running? Check its startup banner.

**Pages load but every API call fails**

- Open the browser console on the device. A request to `localhost:5000` means
  a stale bundle — restart `npm run dev` and hard-refresh the device.
- A CORS error means the origin was rejected: confirm `ALLOW_LAN_ORIGINS` is
  not set to `false`, and that the device's IP really is in a private range
  (`10.x`, `172.16–31.x`, `192.168.x`).

**Chat / notifications dead on the LAN, everything else fine**

That is the Socket.io origin check. Confirm `ALLOW_LAN_ORIGINS=true` in the
backend `.env` and restart the backend.

**Hot reload doesn't work on the other device**

Expected to work via `allowedDevOrigins` in
[next.config.ts](next.config.ts). If the device is on an unusual range, add it
there and restart.

**PPT/PPTX lesson files show "Document preview unavailable"**

Intentional. Those render through Microsoft's Office Web Viewer, which fetches
the file from Microsoft's servers and so cannot reach a private LAN address.
The app now detects that and shows its honest "preview unavailable" panel with
an **Open Document** link, instead of an iframe that spins forever.

PDF and DOC/DOCX are unaffected — they render natively in the browser.
