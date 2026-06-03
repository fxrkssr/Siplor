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
| Input | Google Forms | แอดมินกรอกข้อมูลการจอง |
| DB | Google Sheets | เก็บข้อมูลการจอง |
| API | Google Apps Script | doGet / doPost อ่าน-เขียน Sheets |
| Proxy | Cloudflare Worker | CORS proxy, forward GET/POST |
| Frontend | dashboard.html → Vercel | หน้าเว็บพนักงาน |
| Source | GitHub (fxrkssr/Siplor) | เก็บ code ทั้งหมด |

**ทำไมต้องมี Cloudflare Worker?**
Browser เรียก Apps Script URL ตรงๆ ไม่ได้เพราะ CORS — Worker inject header `Access-Control-Allow-Origin: *` ให้

---

## Data Flow

```
แอดมินกรอก Google Form
  → Google Sheets (บันทึกอัตโนมัติ)
  → Apps Script doGet (อ่านข้อมูล JSON)
  → Cloudflare Worker (CORS proxy)
  → Dashboard บน Vercel

กรอก/แก้ไข/ยกเลิก/ลบจากเว็บ
  → Cloudflare Worker (forward POST)
  → Apps Script doPost
  → Google Sheets (เขียนข้อมูล)
```

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

- แต่ละ booking return field: `_row`, `date`, `time`, `name`, `phone`, `count`, `allergy`, `hasAllergy`, `notes`, `addedBy`, `addedAt`, `editedBy`, `editedAt`, `cancelledBy`, `cancelledAt`, `cancelled`
- `_row` = row index ใน Sheets (1-based) — ใช้สำหรับ edit/cancel/delete

### doPost — actions ที่รับได้
| action | หน้าที่ |
|---|---|
| `"add"` | เพิ่ม row ใหม่ + upsert Customers sheet |
| `"edit"` | แก้ข้อมูล; ถ้า `body.restore=true` → clear สถานะ/cancelledBy/At + upsert Customers (+1) |
| `"cancel"` | เขียน `"ยกเลิก"` + cancelledBy/At ลง column N/O — upsert Customers (-1) |
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

### Trigger
- `setupTuesdayBlock()` — รันครั้งเดียวเพื่อติดตั้ง onFormSubmit trigger
- `blockTuesdayBookings()` — ลบ row อัตโนมัติถ้าจองวันอังคาร

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
- 2 accounts: `const USERS = { "7777@": "แอดมิน 1", "2608@": "แอดมิน 2" }`
- กดปุ่ม 🔒 → ใส่รหัส → `authed = true` → แสดงปุ่ม ✏️❌🗑️ + ปุ่มเพิ่ม + audit
- Refresh หน้า = ต้องใส่รหัสใหม่ (ไม่มี persist)
- ปุ่มแก้ไข/ยกเลิก/ลบ แสดงเฉพาะ `authed && !isPast(b) && !b.cancelled`
- ปุ่ม 🔄 กู้คืน แสดงเฉพาะ `authed && b.cancelled` — เปิด form กู้คืน+ย้ายวัน

### Modes
- **รายวัน (day)** — เลือกวันที่ด้วย Flatpickr, ปุ่ม ⊞ toggle compact
- **รายเดือน (month)** — มี 5 sub-tab:
  - 📌 ยังไม่ได้มา — `!isPast(b)`
  - ✅ ใช้บริการแล้ว — `isPast(b)`
  - 📋 ทั้งหมด — ทุก booking (ยกเว้นที่ยกเลิก)
  - ❌ ยกเลิก — fetch `?cancelled=1&month=` แยก → `_allCancelledBookings`
  - ดูคิวว่าง — แสดง calendar grid รายเดือน ไม่ fetch เพิ่ม ใช้ข้อมูลจาก `_allBookings` / capacity MAX=15/วัน / สีเขียว ≤10, ส้ม 11-14, แดง ≥15 / วันอังคาร = "ปิด"

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
| `_customerList` | customer list จาก Customers sheet | `loadCustomers()` |

> ⚠️ **`_bookingsByRow` reset ทุกครั้งที่ `loadBookings()` รัน** — lookup จาก `_row` ต้อง fallback ไปหาใน `_allSearchBookings` ด้วยเสมอ

### isPast(b)
```js
function isPast(b) {
  const today = todayISO();
  if (b.date < today) return true;
  if (b.date > today) return false;
  return b.time <= nowTimeBKK();
}
```

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
| **ยกเลิก (❌)** | เขียน `"ยกเลิก"` + cancelledBy/At | totalVisits -1 | ซ่อนจาก normal view, ดูได้ใน tab ❌ ยกเลิก |
| **ลบ (🗑️)** | ลบ row ถาวร | totalVisits -1 (ถ้าไม่ใช่ cancelled) | หายไปเลย |
| **กู้คืน (🔄)** | clear สถานะ/cancelledBy/At + แก้วันที่ | totalVisits +1 | กลับมาใน normal view |

- ยกเลิก/ลบ แสดงเฉพาะ `authed && !isPast(b) && !b.cancelled`
- กู้คืน แสดงเฉพาะ `authed && b.cancelled`
- `openBookingForm(row, restore=true)` — lookup จาก `_bookingsByRow ?? _allSearchBookings ?? _allCancelledBookings`

---

## Known Issues / Notes

- `_row` index ใช้ตอน load หน้า — ถ้ามีคนลบ row พร้อมกัน อาจ edit ผิด row (edge case, low risk)
- ไม่มี auth ที่ API level — ใครรู้ Worker URL ก็ POST ได้ (acceptable สำหรับ internal tool)
- วันอังคารบล็อก 2 ชั้น: trigger ใน Apps Script (form) + validation ใน dashboard (web form)

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
