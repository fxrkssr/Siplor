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

| Column | Header | หน้าที่ |
|---|---|---|
| A | Timestamp | กรอกอัตโนมัติโดย Form |
| B | วันที่จอง | YYYY-MM-DD |
| C | เวลาที่จอง | HH:mm |
| D | ชื่อลูกค้า | ชื่อ-นามสกุล |
| E | เบอร์โทรศัพท์ | อาจเป็น number → Code.gs จัดการ |
| F | จำนวนลูกค้า (คน) | ตัวเลข |
| G | ข้อมูลแพ้อาหาร | string |
| H | หมายเหตุเพิ่มเติม | string |
| I | เพิ่มโดย | audit |
| J | เพิ่มเมื่อ | audit |
| K | แก้ไขโดย | audit |
| L | แก้ไขเมื่อ | audit |
| M | สถานะ | `"ยกเลิก"` = ถูกยกเลิก, ว่าง = ปกติ |

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

- แต่ละ booking return field: `_row`, `date`, `time`, `name`, `phone`, `count`, `allergy`, `hasAllergy`, `notes`, `addedBy`, `addedAt`, `editedBy`, `editedAt`, `cancelled`
- `_row` = row index ใน Sheets (1-based) — ใช้สำหรับ edit/cancel/delete

### doPost — actions ที่รับได้
| action | หน้าที่ |
|---|---|
| `"add"` | `sheet.appendRow()` — เพิ่ม row ใหม่ |
| `"edit"` | `sheet.getRange(rowIdx).setValues()` — แก้ข้อมูล |
| `"cancel"` | เขียน `"ยกเลิก"` ลง column `สถานะ` (M) — soft delete |
| `"delete"` | `sheet.deleteRow(rowIdx)` — ลบออกจาก Sheets ถาวร |

### Helper Functions
- `getColMap(headers)` — map ชื่อ header → index column
- `formatTime(val)` — Date object หรือ string → `"HH:mm"`
- `formatPhone(val)` — number → prepend `"0"`, string → ใช้ตรงๆ
- `formatDateTime(val)` — Sheets Date object → `"YYYY-MM-DD HH:MM"`

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
if (cancelled)      → ?cancelled=1[&month=...]
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
- ปุ่มแก้ไข/ยกเลิก/ลบ **ไม่แสดง** สำหรับ booking ที่ผ่านแล้ว (`isPast(b)`) หรือที่ยกเลิกแล้ว

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
| `cancelTarget` | `_row` ที่กำลังจะยกเลิก | `closeCancelConfirm()` |

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

## Audit Trail

- แสดงเฉพาะตอน `authed = true`
- Sheet ต้องมี column: `เพิ่มโดย`, `เพิ่มเมื่อ`, `แก้ไขโดย`, `แก้ไขเมื่อ`
- `addedBy/addedAt` — บันทึกตอน `action:"add"` เท่านั้น
- `editedBy/editedAt` — บันทึกตอน `action:"edit"` เท่านั้น (ไม่ทับ addedBy)

> ⚠️ ถ้าแก้ Code.gs แล้วไม่ redeploy → format วันที่ audit จะผิด (ได้ "Thu May 28..." แทน)

---

## Cancel vs Delete

| action | ผลใน Sheets | มองเห็นใน dashboard |
|---|---|---|
| **ยกเลิก (❌)** | เขียน `"ยกเลิก"` ลง column M (สถานะ) | ซ่อนจาก normal view, ดูได้ใน tab ❌ ยกเลิก |
| **ลบ (🗑️)** | ลบ row ออกถาวร | หายไปเลย |

ทั้งสองปุ่มแสดงเฉพาะตอน login (`authed = true`) และ booking ยังไม่ผ่าน (`!isPast(b)`) และยังไม่ถูกยกเลิก (`!b.cancelled`)

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
