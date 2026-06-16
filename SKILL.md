# Siplor — Dev Notes & Skill Reference

ระบบจองโต๊ะร้าน Siplor สร้างด้วย Google Sheets + Apps Script + Cloudflare Worker + Vercel

---

## Claude Behavior Rules

> ⚠️ **ทุกครั้งที่แก้ไขเสร็จ ให้ถามว่า "จะให้ push ไหม?" เสมอ — ก่อนจบการสนทนา**

---

## ที่อยู่ไฟล์ทั้งหมด

| ไฟล์ | Local Path | Remote |
|---|---|---|
| `Code.gs` | `C:\Users\KssR\Documents\Siplor\Code.gs` | Google Apps Script (วาง manual) |
| `worker.js` | `C:\Users\KssR\Documents\Siplor\worker.js` | Cloudflare Worker: siplor.fxrkssr.workers.dev |
| `wrangler.toml` | `C:\Users\KssR\Documents\Siplor\wrangler.toml` | GitHub (config สำหรับ deploy worker) |
| `dashboard.html` | `C:\Users\KssR\Documents\Siplor\dashboard.html` | Vercel (auto-deploy จาก GitHub) |
| `vercel.json` | `C:\Users\KssR\Documents\Siplor\vercel.json` | GitHub |
| `SKILL.md` | `C:\Users\KssR\Documents\Siplor\SKILL.md` | GitHub |

> GitHub repo: `https://github.com/fxrkssr/Siplor`
> Working directory: `C:\Users\KssR\Documents\Siplor\`

---

## Deploy Checklist

> ⚠️ **Claude ต้องถามให้ push ทุกครั้งหลังแก้ไขเสร็จ**

| ไฟล์ที่แก้ | คำสั่ง / วิธี | อัตโนมัติ? |
|---|---|---|
| `Code.gs` | วาง code ใน Apps Script → Manage deployments → New version | ❌ ต้องทำเอง |
| `worker.js` | `cd C:\Users\KssR\Documents\Siplor` แล้ว `npx wrangler deploy` | ✅ CLI |
| `dashboard.html` | `git push` → Vercel deploy อัตโนมัติ | ✅ อัตโนมัติ |
| `vercel.json` | `git push` → Vercel deploy อัตโนมัติ | ✅ อัตโนมัติ |
| `SKILL.md` | `git push` | ✅ อัตโนมัติ |

### วิธี deploy Apps Script (Code.gs) — ทำเองเท่านั้น
1. เปิด [script.google.com](https://script.google.com) → เลือกโปรเจกต์ Siplor
2. คัดลอก code จาก `C:\Users\KssR\Documents\Siplor\Code.gs` วางทับของเดิม
3. Deploy → **Manage deployments** → ✏️ แก้ไข → **New version** → Deploy

### วิธี deploy Cloudflare Worker (worker.js) — ใช้ CLI
```
cd C:\Users\KssR\Documents\Siplor
npx wrangler deploy
```
> login อยู่แล้วด้วย fxrkssr@gmail.com — ถ้า token หมดอายุให้รัน `npx wrangler login` ก่อน

### ผลถ้าไม่ deploy
- ไม่ deploy **Code.gs** → API รันโค้ดเก่า (field ใหม่หาย / format ผิด)
- ไม่ deploy **worker.js** → parameter ใหม่ไม่ถูกส่งผ่าน (เช่น `?cancelled=1`)

---

## Tech Stack

| ชั้น | เครื่องมือ | หน้าที่ |
|---|---|---|
| Input | **dashboard.html (เว็บ)** | แอดมินกรอก/แก้/ยกเลิก/ลบ การจอง — ทางเข้าข้อมูลเดียวที่ใช้จริง |
| DB | Google Sheets | เก็บข้อมูลการจอง (sheet ชื่อ `"Form Responses 1"`) |
| API | Google Apps Script | doGet / doPost อ่าน-เขียน Sheets |
| Proxy | Cloudflare Worker | CORS proxy, forward GET/POST |
| Frontend | dashboard.html → Vercel | หน้าเว็บพนักงาน |
| Source | GitHub (fxrkssr/Siplor) | เก็บ code ทั้งหมด |

**ทำไมต้องมี Cloudflare Worker?**
Browser เรียก Apps Script URL ตรงๆ ไม่ได้เพราะ CORS — Worker inject header `Access-Control-Allow-Origin: *` ให้

> ⚠️ **เลิกใช้ Google Form แล้ว (ตั้งแต่ 2026-06-15)**
> โปรเจกต์เริ่มจาก Google Form เป็นทางเข้าข้อมูล (ชื่อ sheet `"Form Responses 1"` คือร่องรอยจากยุคนั้น) **แต่ตอนนี้จองผ่านหน้าเว็บอย่างเดียว 100%**
> - การจองทุกรายการมาจาก dashboard → Worker → `doPost`
> - `createBookingForm()` / `setupTuesdayBlock()` / `blockTuesdayBookings()` ใน Code.gs = ฟังก์ชันยุค Form **ไม่ได้ใช้แล้ว** (เก็บไว้เฉยๆ ไม่ต้องรัน ไม่ต้องลบ)
> - ฟีเจอร์ "ช่องทางการจอง" จึงอยู่ในฟอร์มเว็บเท่านั้น — **ไม่ต้องไปแตะ Google Form**
> - การบล็อกวันอังคารใช้ validation ในฟอร์มเว็บ (`submitBookingForm`) แทน trigger `blockTuesdayBookings` (ซึ่งจะทำงานก็ต่อเมื่อมีคนจองผ่าน Form เท่านั้น = ไม่เกิดขึ้นแล้ว)

---

## Data Flow

```
แอดมินกรอก/แก้ไข/ยกเลิก/ลบ จากหน้าเว็บ (dashboard.html)
  → Cloudflare Worker (forward POST → doPost / forward GET → doGet)
  → Apps Script (เขียน/อ่าน Google Sheets)
  → ส่ง JSON กลับ → Worker (CORS) → Dashboard แสดงผล
```

> ทางเข้าข้อมูลทั้งหมดผ่านหน้าเว็บ — ไม่มี Google Form อีกต่อไป

---

## Google Sheets — โครงสร้าง Column

Column header ที่ต้องมีใน Sheet (ชื่อใช้ map ใน `getColMap()` ใน `Code.gs`):

**Sheet หลัก: "Form Responses 1"** (`SHEET_NAME` constant ใน Code.gs)

| Column | Header | หน้าที่ |
|---|---|---|
| A | Timestamp | กรอกอัตโนมัติโดย Form |
| B | วันที่จอง | YYYY-MM-DD |
| C | เวลาที่จอง | HH:mm |
| D | ชื่อลูกค้า | ชื่อ-นามสกุล |
| E | เบอร์โทรศัพท์ | อาจเป็น number → `formatPhone()` จัดการ |
| F | จำนวนลูกค้า (คน) | ตัวเลข |
| G | ข้อมูลแพ้อาหาร | string |
| H | หมายเหตุเพิ่มเติม | string |
| I | เพิ่มโดย | audit |
| J | เพิ่มเมื่อ | audit |
| K | แก้ไขโดย | audit |
| L | แก้ไขเมื่อ | audit |
| M | สถานะ | `"ยกเลิก"` = ถูกยกเลิก, ว่าง = ปกติ |
| N | ยกเลิกโดย | audit — บันทึกตอน cancel |
| O | ยกเลิกเมื่อ | audit — บันทึกตอน cancel |
| P | เหตุผลยกเลิก | จองซ้ำ / ยกเลิกในวัน / ยกเลิกล่วงหน้า / no show — บันทึกตอน cancel |
| Q | ช่องทางการจอง | Meta / Call / Line — บันทึกตอน add/edit |

**Sheet Customers** — ข้อมูลลูกค้า (เบอร์ unique key)

| Column | Header | หน้าที่ |
|---|---|---|
| A | phone | เบอร์โทร (text format เพื่อรักษา 0 นำหน้า) |
| B | name | ชื่อลูกค้า |
| C | allergy | ข้อมูลแพ้อาหาร |
| D | notes | หมายเหตุ |
| E | lastVisit | วันจองล่าสุด |
| F | totalVisits | จำนวนครั้งที่จอง (ไม่นับที่ยกเลิก) |

> ⚠️ Column A ต้อง format เป็น Text — ถ้าเป็น Number จะตัด 0 นำหน้า
> สร้าง/migrate ได้ด้วย `createAndMigrateCustomers()` ใน Apps Script

> `getColMap()` หา index จากชื่อ header — ไม่ hardcode index → เพิ่ม column ได้โดยไม่พัง

---

## Apps Script (Code.gs)

**File:** `C:\Users\KssR\Documents\Siplor\Code.gs`

### doGet — parameters ที่รับได้
| Parameter | หน้าที่ |
|---|---|
| `?date=YYYY-MM-DD` | ดึง booking วันนั้น (ยกเว้นที่ยกเลิก) |
| `?month=YYYY-MM` | ดึง booking เดือนนั้น (ยกเว้นที่ยกเลิก) |
| `?all=1` | ดึงทุก booking (ยกเว้นที่ยกเลิก) — ใช้สำหรับ search |
| `?cancelled=1&month=YYYY-MM` | ดึงเฉพาะที่ยกเลิก ของเดือนนั้น |
| `?customers=1` | ดึงข้อมูลลูกค้าทั้งหมดจาก Customers sheet |

- แต่ละ booking return field: `_row`, `date`, `time`, `name`, `phone`, `count`, `allergy`, `hasAllergy`, `notes`, `addedBy`, `addedAt`, `editedBy`, `editedAt`, `cancelledBy`, `cancelledAt`, `cancelReason`, `channel`, `cancelled`
- `_row` = row index ใน Sheets (1-based) — ใช้สำหรับ edit/cancel/delete

### doPost — actions ที่รับได้
| action | หน้าที่ |
|---|---|
| `"add"` | เพิ่ม row ใหม่ (+ `channel` col Q) + upsert Customers sheet |
| `"edit"` | แก้ข้อมูล (+ `channel`); ถ้า `body.restore=true` → clear สถานะ/cancelledBy/At/cancelReason + upsert Customers (+1) |
| `"cancel"` | เขียน `"ยกเลิก"` + cancelledBy/At + `cancelReason` ลง column N/O/P — upsert Customers (-1) |
| `"delete"` | ลบ row ถาวร + upsert Customers (-1) ถ้า booking ไม่ใช่ cancelled |

### Helper Functions
- `getColMap(headers)` — map ชื่อ header → index column
- `formatTime(val)` — Date object หรือ string → `"HH:mm"`
- `formatPhone(val)` — number หรือ 9-digit string → prepend `"0"`, อื่นๆ → ใช้ตรงๆ
- `formatDateTime(val)` — Sheets Date object → `"YYYY-MM-DD HH:MM"`
- `isRealPhone(phone)` — false ถ้าเป็น `""`, `"0"`, `"00"`
- `upsertCustomer(custSheet, phone, name, allergy, notes, date, delta)` — upsert Customers sheet by phone; delta=+1/-1 สำหรับ totalVisits
- `syncAllCustomers()` — backfill Customers sheet จาก booking ทั้งหมด (รันเองจาก Apps Script)
- `createAndMigrateCustomers()` — สร้าง Customers sheet ใหม่ + migrate (รันครั้งเดียว)

### Trigger (DEPRECATED — ยุค Google Form, ไม่ใช้แล้ว)
- `setupTuesdayBlock()` — รันครั้งเดียวเพื่อติดตั้ง onFormSubmit trigger
- `blockTuesdayBookings()` — ลบ row อัตโนมัติถ้าจองวันอังคาร
- ⚠️ ทำงานเฉพาะตอนจองผ่าน **Google Form** ซึ่งเลิกใช้แล้ว → การบล็อกวันอังคารตอนนี้พึ่ง validation ใน `submitBookingForm()` ฝั่งเว็บแทน

---

## Cloudflare Worker (worker.js)

**File:** `C:\Users\KssR\Documents\Siplor\worker.js`
**URL:** `https://siplor.fxrkssr.workers.dev`
**Config:** `C:\Users\KssR\Documents\Siplor\wrangler.toml`

- GET requests → forward parameter ไปยัง Apps Script URL
- POST requests → forward body JSON ไปยัง Apps Script URL
- CORS headers: `Access-Control-Allow-Origin: *`

### Parameter forwarding logic
```js
if (customers)      → ?customers=1
else if (cancelled) → ?cancelled=1[&month=...]
else if (all)       → ?all=1
else if (month)     → ?month=YYYY-MM
else                → ?date=YYYY-MM-DD (default: วันนี้ BKK)
```

> ทุกครั้งที่เพิ่ม parameter ใหม่ใน Apps Script ต้อง update worker.js ด้วย แล้ว `npx wrangler deploy`

---

## Dashboard (dashboard.html)

**File:** `C:\Users\KssR\Documents\Siplor\dashboard.html`
**URL:** Vercel (auto-deploy จาก GitHub main branch)

### Auth
- รหัสผ่าน **ไม่อยู่ใน dashboard.html อีกแล้ว** — เก็บเป็น secret `USERS_JSON` ฝั่ง Worker (ดู "API Auth")
- กดปุ่ม 🔒 → ใส่รหัส → `submitPassword()` ยิง `apiPost({action:"auth", token})` ไป Worker → ถ้า ok เก็บ `authToken` + `currentUser` (จาก response) → `authed = true` → แสดงปุ่ม ✏️❌🗑️ + ปุ่มเพิ่ม + audit
- Refresh หน้า = ต้องใส่รหัสใหม่ (ไม่มี persist; `authToken` อยู่ใน memory)
- `currentUser` (ชื่อจาก Worker) ใช้เป็น audit addedBy/editedBy/cancelledBy
- ปุ่มแก้ไข/ยกเลิก/ลบ แสดงเฉพาะ `authed && !isPast(b) && !b.cancelled` (isPast = วันก่อนหน้าเท่านั้น — วันนี้ยังแก้ได้เสมอ)
- ปุ่ม 🔄 กู้คืน แสดงเฉพาะ `authed && b.cancelled` — เปิด form กู้คืน+ย้ายวัน

### Modes
- **รายวัน (day)** — เลือกวันที่ด้วย Flatpickr, ปุ่ม ⊞ toggle compact, **ปุ่ม 📥 ดาวน์โหลด Excel** (ในเนื้อหาใต้ section-label, `exportDayCSV()` — ดูได้ไม่ต้อง login)
- **รายเดือน (month)** — มี 5 sub-tab:
  - 📌 ยังไม่ได้มา — `!isPast(b)`
  - ✅ ใช้บริการแล้ว — `isPast(b)`
  - 📋 ทั้งหมด — ทุก booking (ยกเว้นที่ยกเลิก)
  - ❌ ยกเลิก — fetch `?cancelled=1&month=` แยก → `_allCancelledBookings` + **chip filter ตามเหตุผล** (`cancelReasonFilter`)
  - ดูคิวว่าง — calendar grid รายเดือน (คลิกวันเพื่อไป day mode), capacity MAX=15/วัน / เขียว ≤10, ส้ม 11-14, แดง ≥15 / อังคาร = "ปิด"

### State Variables (สำคัญมาก)

| Variable | หน้าที่ | ถูก reset โดย |
|---|---|---|
| `_allBookings` | bookings วัน/เดือนปัจจุบัน | `loadBookings()` |
| `_allSearchBookings` | bookings ทุกวัน (สำหรับ search) | `toggleSearch()` ตอนปิด |
| `_allCancelledBookings` | bookings ที่ยกเลิก ของเดือนที่เลือก | `loadCancelledBookings()` |
| `_bookingsByRow` | map `_row → booking` สำหรับ lookup edit/cancel/delete | `loadBookings()` (reset `{}`) |
| `searchQuery` | คำค้นหาปัจจุบัน | `onSearch("")` |
| `mode` | `"day"` หรือ `"month"` | `setMode()` |
| `monthTab` | `"upcoming"/"visited"/"all"/"cancelled"/"queue"` | `setMonthTab()` |
| `editingRow` | `_row` ที่กำลัง edit (null = add ใหม่) | `closeBookingForm()` |
| `isRestoring` | true = เปิด form จาก cancelled booking (กู้คืน) | `closeBookingForm()` |
| `cancelTarget` | `_row` ที่กำลังจะยกเลิก | `closeCancelConfirm()` |
| `cancelReasonFilter` | เหตุผลที่เลือก filter ใน tab ❌ (`""` = ทุกเหตุผล) | `setMonthTab()` |
| `_customerList` | customer list จาก Customers sheet | `loadCustomers()` |

> ⚠️ **`_bookingsByRow` reset ทุกครั้งที่ `loadBookings()` รัน** — lookup จาก `_row` ต้อง fallback ไปหาใน `_allSearchBookings` ด้วยเสมอ

### isPast(b)
```js
function isPast(b) {
  return b.date < todayISO();
}
```
> วันนี้ไม่ถือว่า past — แก้ไขได้ทั้งวันไม่ว่าเวลาจองจะผ่านไปแล้วหรือยัง

### Allergy Tags
| ค่า | สี | แสดง |
|---|---|---|
| มีค่า (ไม่ใช่ ไม่แพ้/ไม่ได้แจ้ง) | แดง | ⚠ แพ้ ... |
| `"ไม่แพ้"` | เขียว | ✓ ไม่แพ้อาหาร |
| `"ไม่ได้แจ้ง"` หรือ `""` | เหลือง | — ไม่ได้แจ้ง |

### เวลาที่เลือกได้
`17:00 – 22:00` ทุก 30 นาที (11 ช่วง)

---

## Search (🔍)

- กดปุ่ม 🔍 มุมขวาบน → โหลด `?all=1` อัตโนมัติ
- พิมพ์ทันที → real-time, ค้นหาจาก: ชื่อ, เบอร์, หมายเหตุ
- ไม่ filter ตามวัน/เดือน — แสดงทุก booking ที่ match

### Variables แยก search ออกจาก normal view
| Variable | โหลดจาก | ไม่ถูกแตะโดย |
|---|---|---|
| `_allBookings` | `?date=` หรือ `?month=` | — |
| `_allSearchBookings` | `?all=1` | `loadBookings()` ← สำคัญ |

> ⚠️ ต้องแยก 2 ตัวนี้ออกจากกัน — ถ้าใช้ตัวเดียวกัน `loadBookings()` จะทับข้อมูล all ด้วยข้อมูลรายวัน ทำให้ search filter ติดวัน

---

## Customer Autocomplete

- โหลด `?customers=1` ตอน `initDashboard()` → เก็บใน `_customerList`
- หลังโหลดเสร็จเรียก `renderFromCache()` เพื่ออัปเดต badge โดยไม่ต้อง login
- **ช่องชื่อ** — พิมพ์ขึ้น dropdown, ค้นจากชื่อหรือเบอร์ (`onNameInput`)
- **ช่องเบอร์** — พิมพ์ 3 ตัวขึ้นไปขึ้น dropdown, ค้นจากเบอร์ (`onPhoneInput`) → `ac-phone-dropdown`
- เลือกจาก dropdown → `autofillCustomer(c)` เติมชื่อ/เบอร์/แพ้/หมายเหตุ
- เบอร์ exact match → auto-fill โดยไม่ต้องเลือก; prefix match → ต้องเลือกเอง
- **Visit badge** ⭐ แสดงทุก mode (ไม่ต้อง login) — lookup จาก `_customerList` โดย phone

---

## Audit Trail

- แสดงเฉพาะตอน `authed = true`
- Sheet ต้องมี column: `เพิ่มโดย`, `เพิ่มเมื่อ`, `แก้ไขโดย`, `แก้ไขเมื่อ`, `ยกเลิกโดย`, `ยกเลิกเมื่อ`
- `addedBy/addedAt` — บันทึกตอน `action:"add"` เท่านั้น
- `editedBy/editedAt` — บันทึกตอน `action:"edit"` เท่านั้น (ไม่ทับ addedBy)
- `cancelledBy/cancelledAt` — บันทึกตอน `action:"cancel"`; restore จะ clear ค่าเหล่านี้

> ⚠️ ถ้าแก้ Code.gs แล้วไม่ redeploy → format วันที่ audit จะผิด (ได้ "Thu May 28..." แทน)

---

## Cancel vs Delete vs Restore

| action | ผลใน Sheets | ผลใน Customers sheet | มองเห็นใน dashboard |
|---|---|---|---|
| **ยกเลิก (❌)** | เขียน `"ยกเลิก"` + cancelledBy/At + **cancelReason (col P)** | totalVisits -1 | ซ่อนจาก normal view, ดูได้ใน tab ❌ ยกเลิก |
| **ลบ (🗑️)** | ลบ row ถาวร | totalVisits -1 (ถ้าไม่ใช่ cancelled) | หายไปเลย |
| **กู้คืน (🔄)** | clear สถานะ/cancelledBy/At + **cancelReason** + แก้วันที่ | totalVisits +1 | กลับมาใน normal view |

- ยกเลิก/ลบ แสดงเฉพาะ `authed && !isPast(b) && !b.cancelled`
- กู้คืน แสดงเฉพาะ `authed && b.cancelled`
- ยกเลิก = **ต้องเลือกเหตุผลก่อน** (`f-cancel-reason` required ใน `confirmCancel()`)
- tab ❌ ยกเลิก: เลือกดูตามเหตุผลได้ด้วย chip filter (`renderReasonFilter()` / `cancelReasonFilter`)
- `openBookingForm(row, restore=true)` — lookup จาก `_bookingsByRow ?? _allSearchBookings ?? _allCancelledBookings`

---

## API Auth (added 2026-06-16)

ป้องกัน POST เขียน Sheet — เดิมใครรู้ Worker URL ก็ยิงได้ ตอนนี้ต้องมี token

```
dashboard → POST {action, ..., token: รหัสที่พิมพ์}
   Worker  → เช็ค token ∈ USERS_JSON ? ถ้าไม่ = 401
           → ตัด token ออก + ฉีด secret: SHARED_SECRET แล้ว forward
Apps Script→ เช็ค body.secret === Script Property "SHARED_SECRET" ? ถ้าไม่ = unauthorized
```

| ชั้น | เก็บ secret ที่ไหน | เช็คอะไร |
|---|---|---|
| dashboard.html | ไม่เก็บ (พิมพ์ตอน login → `authToken` ใน memory) | — |
| worker.js | Cloudflare secret `USERS_JSON`, `SHARED_SECRET` | token ตรง user ไหม |
| Code.gs | Script Property `SHARED_SECRET` | secret จาก Worker ตรงไหม |

- **login:** `apiPost({action:"auth", token})` → Worker คืน `{ok:true, user}` หรือ 401
- **write:** `apiPost()` แนบ `token: authToken` อัตโนมัติ (ยกเว้น body ที่มี token อยู่แล้ว)
- **GET (อ่าน) ไม่เช็ค** — badge ลูกค้ายังโชว์ได้ไม่ต้อง login (ตั้งใจ)
- Code.gs เช็คเฉพาะเมื่อตั้ง Script Property `SHARED_SECRET` แล้ว (ถ้ายังไม่ตั้ง = ข้าม ไม่ lockout)
- ⚠️ ค่า `USERS_JSON` = `{"7777@":"restaurant","2608@":"home"}` (รหัสเดิม) — เปลี่ยนรหัสทำที่ Cloudflare secret ไม่ต้องแก้ code

### Setup (ทำครั้งเดียว — ต้องทำเองก่อนใช้งานจริง)
```bash
# 1. ที่ worker (cd Siplor)
npx wrangler secret put USERS_JSON
#   วาง: {"7777@":"restaurant","2608@":"home"}
npx wrangler secret put SHARED_SECRET
#   วาง: สุ่มยาวๆ (uuid)
npx wrangler deploy

# 2. Apps Script: Project Settings ⚙️ → Script Properties → Add
#    Property = SHARED_SECRET, Value = (ค่าเดียวกับข้อ 1)
#    แล้ว Deploy → Manage deployments → New version
```
> ลำดับสำคัญ: ตั้ง secret + deploy worker **และ** ตั้ง Script Property + deploy Code.gs ให้ครบ **ก่อน** ที่ dashboard เวอร์ชันใหม่จะใช้งานได้ปกติ (ไม่งั้น login ไม่ผ่าน)

---

## Known Issues / Notes

- `_row` index ใช้ตอน load หน้า — ถ้ามีคนลบ row พร้อมกัน อาจ edit ผิด row (edge case, low risk)
- **มี auth ที่ API level แล้ว (added 2026-06-16)** — ดูหัวข้อ "API Auth" ด้านล่าง (POST เขียนต้องมี token; GET อ่านยังเปิด)
- วันอังคารบล็อก: ปัจจุบันใช้ validation ใน dashboard (`submitBookingForm`) เป็นหลัก — trigger `blockTuesdayBookings` (ยุค Form) ตายแล้วเพราะเลิกใช้ Form
- **ทางเข้าข้อมูลเดียว = หน้าเว็บ** (ไม่มี Google Form แล้ว — ดู Tech Stack)
- **ช่องทางการจอง + เหตุผลยกเลิก = required** ทั้งคู่ ตั้งแต่ 2026-06-15

### _bookingsByRow reset bug (fixed 2026-05-29)
- **Bug:** กดแก้ไขจากหน้า search แล้ว form เปิดว่าง
- **สาเหตุ:** `loadBookings()` reset `_bookingsByRow = {}` ทำให้ booking นอก view ปัจจุบันหายออกจาก map
- **Fix:** fallback ไปหาใน `_allSearchBookings` ถ้าหาใน `_bookingsByRow` ไม่เจอ
  ```js
  const b = _bookingsByRow[row] ?? _allSearchBookings.find(x => x._row === row) ?? null;
  ```

### cancelled booking โผล่ใน main view (fixed 2026-06-01)
- **Bug:** ยกเลิกแล้วแต่ booking ยังโผล่ใน tab upcoming/visited/all และ day mode
- **สาเหตุ:** filter ใน `renderFromCache` กรองแค่ `isPast()` ไม่กรอง `b.cancelled`
- **Fix:** เพิ่ม `.filter(b => !b.cancelled)` ที่ `sourceData` ก่อน tab filter ทุก mode
  ```js
  let filtered = filterBookings(sourceData).filter(b => !b.cancelled);
  ```

### cancel action ไม่เขียน Sheet (fixed 2026-06-01)
- **Bug:** กดยกเลิก → frontend คิดว่าสำเร็จ แต่ column สถานะใน Sheet ไม่เปลี่ยน
- **สาเหตุ:** Code.gs cancel block มี `if (col.status >= 0)` guard — ถ้า column ไม่เจอจะ skip เงียบๆ แล้วคืน `ok:true`; อีกสาเหตุ: Apps Script ไม่ได้ redeploy
- **Fix:** เปลี่ยนเป็น return error ทันทีถ้า `col.status < 0` แทนที่จะ skip
  ```js
  if (col.status < 0) return jsonResponse({ error: "ไม่พบ column สถานะ ใน Sheet" });
  ```
- **หมายเหตุ:** ต้อง redeploy Code.gs ทุกครั้งที่แก้ไข — Apps Script ไม่ auto-deploy

### cancelledBy/At + restore (added 2026-06-03)
- cancel action ส่ง `cancelledBy/cancelledAt` → Code.gs บันทึกลง column ยกเลิกโดย/เมื่อ
- restore = `action:"edit"` + `body.restore:true` → Code.gs clear สถานะ + cancelledBy/At
- audit line แสดง "ยกเลิกโดย ..." เฉพาะตอน `authed = true`

### Customers sheet auto-sync (added 2026-06-03)
- `upsertCustomer()` ถูกเรียกจากทุก doPost action
- phone normalize ด้วย `formatPhone()` ทั้งตอนอ่านและเขียน — รองรับ number, 9-digit string, 10-digit string
- `isRealPhone()` skip phone `""/"0"/"00"` ไม่เขียนลง Customers
- `appendRow()` ไม่ inherit column format → ต้อง `setNumberFormat("@").setValue(phone)` หลัง append ทุกครั้ง
- migration: `createAndMigrateCustomers()` สร้าง sheet + backfill ครั้งเดียว; ต้องใช้ `SHEET_NAME` ไม่ใช่ `getSheets()[0]`

### ปุ่มลบไม่มี CSS background (fixed 2026-06-04)
- **Bug:** `.btn-delete` ไม่มี style → ปุ่ม 🗑️ แสดงโดยไม่มี background
- **Fix:** เพิ่ม `.btn-delete { background: #fee2e2; color: #b91c1c; }` ใน CSS

### edit วันนี้ไม่ได้หลังเวลาผ่านไปแล้ว (fixed 2026-06-04)
- **Bug:** `isPast()` คืน true ถ้า `b.date === today && b.time <= nowTimeBKK()` → ปุ่ม edit/cancel/delete หายไป
- **Fix:** เปลี่ยน `isPast()` ให้เปรียบเทียบแค่วันที่ — วันนี้ไม่ถือว่า past ทั้งวัน

### เหตุผลยกเลิก + ช่องทางจอง + export CSV (added 2026-06-15)
- **เหตุผลยกเลิก (col P):** cancel modal มี `<select id="f-cancel-reason">` (จองซ้ำ/ยกเลิกในวัน/ยกเลิกล่วงหน้า/no show) — **บังคับเลือก** → `confirmCancel()` ส่ง `cancelReason` → Code.gs เขียน col P; restore เคลียร์ค่า
- **ช่องทางจอง (col Q):** booking form มี `<select id="f-channel">` (Meta/Call/Line) — **บังคับเลือก** → add/edit ส่ง `channel` → Code.gs เขียน col Q; แสดง `.channel-badge` ม่วง ใต้เบอร์บน card
- **tab ❌ ยกเลิก มี reason filter:** chip row (`renderReasonFilter()` + `setCancelReasonFilter()`) filter `_allCancelledBookings` ตาม `cancelReasonFilter`; reset ใน `setMonthTab()`; เหตุผลแสดงต่อท้าย cancelled-tag
- **Export CSV (ทีมเชฟ):** ปุ่ม 📥 (ไอคอนล้วน) อยู่ในเนื้อหา ใต้ section-label (`#export-btn`) — แสดงเฉพาะ day mode ที่มีรายการ (toggle ใน `renderFromCache()`); `exportDayCSV()` gen CSV จาก `_allBookings` คอลัมน์ เวลา/ชื่อ/เบอร์/จำนวนคน/แพ้อาหาร/หมายเหตุ เรียงตามเวลา + UTF-8 BOM กันภาษาไทยเพี้ยน → `siplor-YYYY-MM-DD.csv`
  - ⚠️ เคยวางใน day-nav แล้ว**ตกขอบจอมือถือ** (row แน่นเกิน) → ย้ายมาเป็นปุ่มในเนื้อหาแทน (fixed 2026-06-15)
- **constants:** `CHANNELS` (Meta/Call/Line), `CANCEL_REASONS` (จองซ้ำ/ยกเลิกในวัน/ยกเลิกล่วงหน้า/no show) ที่หัว `<script>` — แก้ที่นี่ที่เดียวถ้าจะเพิ่ม/ลดตัวเลือก (แต่ต้องอัปเดต `<option>` ใน HTML modal ทั้ง 2 ที่ด้วย เพราะ option เป็น static)
- **state ใหม่:** `cancelReasonFilter` (`""` = ทุกเหตุผล) — reset ใน `setMonthTab()`
- **CSV detail:** ใช้ `_allBookings` (day mode = วันนั้น, ไม่รวม cancelled, เรียงเวลาจาก Code.gs แล้ว), escape comma/quote/newline, prepend BOM `﻿`
- ✅ **ยืนยันทำงานครบทั้ง 4 ฟีเจอร์แล้ว (2026-06-15):** add channel เขียน col Q, cancel reason เขียน col P, reason filter ใน tab ❌, CSV เปิด Excel ภาษาไทยไม่เพี้ยน
- ⚠️ worker.js **ไม่ต้องแก้** — forward body/response ผ่าน field ใหม่อัตโนมัติ
- ⚠️ **manual ที่ทำไปแล้ว:** เพิ่ม col P=`เหตุผลยกเลิก`, Q=`ช่องทางการจอง` ใน Sheet + redeploy Code.gs (New version)
- ❌ **ไม่ต้องแตะ Google Form** — เลิกใช้แล้ว (ดู Tech Stack)

### calendar click-to-navigate (added 2026-06-08)
- กดวันใน tab "ดูคิวว่าง" → ข้ามไปหน้า รายวัน วันนั้นทันที
- `renderQueueCalendar()` เพิ่ม `onclick="navigateToDay('${dateStr}')"` + `cursor:pointer` บน cell ที่ไม่ใช่วันอังคาร
- `navigateToDay(dateStr)` → `fp.setDate(dateStr, false)` (ไม่ trigger onChange) แล้ว `setMode('day')` ซึ่ง call `loadBookings()` ครั้งเดียว

### form-overlay ปิดตอนแตะขอบบนมือถือ (fixed 2026-06-01)
- **Bug:** กรอกข้อมูลจองบนมือถือแล้วแตะขอบนอก modal → form ปิดทันที ข้อมูลที่พิมพ์หายหมด
- **สาเหตุ:** `form-overlay` มี `onclick="if(event.target===this)closeBookingForm()"` — แตะ overlay พื้นหลัง = ปิด form
- **Fix:** ลบ `onclick` ออกจาก `#form-overlay` — ปิดได้แค่กดปุ่ม "ยกเลิก" ข้างล่างเท่านั้น
  ```html
  <!-- ก่อน -->
  <div id="form-overlay" class="overlay" style="display:none" onclick="if(event.target===this)closeBookingForm()">
  <!-- หลัง -->
  <div id="form-overlay" class="overlay" style="display:none">
  ```
