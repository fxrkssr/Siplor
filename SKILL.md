# Siplor — Dev Notes & Skill Reference

ระบบจองโต๊ะร้าน Siplor สร้างด้วย Google Sheets + Apps Script + Cloudflare Worker + Vercel

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

---

## ไฟล์ในโปรเจกต์

| ไฟล์ | อยู่ที่ | หน้าที่ |
|---|---|---|
| `Code.gs` | Google Apps Script | API หลัก (doGet + doPost) |
| `worker.js` | Cloudflare Worker | Proxy + CORS |
| `dashboard.html` | GitHub → Vercel | หน้าเว็บพนักงาน |
| `vercel.json` | GitHub | route / → dashboard.html |

---

## Data Flow

```
แอดมินกรอก Google Form
  → Google Sheets (บันทึกอัตโนมัติ)
  → Apps Script doGet (อ่านข้อมูล JSON)
  → Cloudflare Worker (CORS proxy)
  → Dashboard บน Vercel

กรอก/แก้ไข/ลบจากเว็บ
  → Cloudflare Worker (forward POST)
  → Apps Script doPost
  → Google Sheets (เขียนข้อมูล)
```

---

## Apps Script (Code.gs)

### doGet
- รับ parameter `?date=YYYY-MM-DD` หรือ `?month=YYYY-MM`
- หา column จาก header name (ไม่ใช้ index ตายตัว) ผ่าน `getColMap()`
- Return JSON array ของ bookings
- แต่ละ booking มี field: `_row`, `date`, `time`, `name`, `phone`, `count`, `allergy`, `hasAllergy`, `notes`
- `_row` = row index ใน Sheets (1-based) สำหรับ edit/delete
- `formatTime()` — handle กรณี time column เป็น Date object (หลัง edit) → format เป็น `HH:mm`
- `formatPhone()` — handle กรณี phone เป็น number → เติม `"0"` นำหน้า

### doPost
- รับ JSON body: `{ action, _row, date, time, name, phone, count, allergy, notes }`
- `action: "add"` → `sheet.appendRow()`
- `action: "edit"` → `sheet.getRange(rowIdx).setValues()`
- `action: "delete"` → `sheet.deleteRow(rowIdx)`

### Trigger
- `setupTuesdayBlock()` — รันครั้งเดียวเพื่อติดตั้ง onFormSubmit trigger
- `blockTuesdayBookings()` — trigger ลบ row อัตโนมัติถ้าจองวันอังคาร

### Helper Functions
- `getColMap(headers)` — map ชื่อ header → index column
- `formatTime(val)` — Date object หรือ string → `"HH:mm"`
- `formatPhone(val)` — number → prepend `"0"`, string → ใช้ตรงๆ

---

## Cloudflare Worker (worker.js)

- GET → forward `?date=` หรือ `?month=` ไปยัง Apps Script URL
- POST → forward body JSON ไปยัง Apps Script URL
- CORS headers: `Access-Control-Allow-Origin: *`, Methods: `GET, POST, OPTIONS`
- **ต้อง Save & Deploy ทุกครั้งที่แก้ Apps Script URL**

---

## Dashboard (dashboard.html)

### Auth
- 2 accounts เก็บใน `const USERS = { "7777@": "แอดมิน 1", "2608@": "แอดมิน 2" }`
- กดปุ่ม 🔒 มุมขวาบน → ใส่รหัส → เข้า edit mode, แสดงชื่อ account เป็น badge สีทอง
- Refresh หน้า = ต้องใส่รหัสใหม่ (ไม่มี persist)
- `authed = true` → แสดงปุ่ม ✏️🗑️ บน card + ปุ่ม "+ เพิ่มการจอง" + audit info
- ปุ่มแก้ไข/ลบ **ไม่แสดง** สำหรับ booking ที่ผ่านแล้ว (`isPast(b)`)
- `currentUser` — ชื่อ account ที่ login อยู่ ใช้บันทึก audit

### Modes
- **รายวัน (day)** — เลือกวันที่ด้วย Flatpickr, ปุ่ม ⊞ toggle compact 3-column
- **รายเดือน (month)** — มี 3 sub-tab:
  - 📌 ยังไม่ได้มา — `!isPast(b)`
  - ✅ ใช้บริการแล้ว — `isPast(b)`
  - 📋 ทั้งหมด — ทุก booking

### isPast(b)
```js
function isPast(b) {
  const today = todayISO();
  if (b.date < today) return true;
  if (b.date > today) return false;
  return b.time <= nowTimeBKK(); // วันเดียวกัน เทียบเวลา
}
```

### Allergy Tags
| ค่า | สี | แสดง |
|---|---|---|
| มีค่า (ไม่ใช่ ไม่แพ้/ไม่ได้แจ้ง) | แดง | ⚠ แพ้ ... |
| `"ไม่แพ้"` | เขียว | ✓ ไม่แพ้อาหาร |
| `"ไม่ได้แจ้ง"` หรือ `""` | เหลือง | — ไม่ได้แจ้ง |

### Compact View (⊞)
- 3 column grid
- แสดง: เวลา, จำนวน, ชื่อ, เบอร์, แพ้อาหาร, หมายเหตุ
- ซ่อน: ปุ่มแก้ไข/ลบ
- ใช้สำหรับแคปหน้าจอให้ครบทุก booking

### เวลาที่เลือกได้
`17:00 – 22:00` ทุก 30 นาที (11 ช่วง)

---

## Deploy Checklist — บอก requirement ทุกครั้งที่แก้ไข

> ⚠️ **Claude ต้องบอก requirement นี้ทุกครั้งหลังแก้ไข** — อย่าสรุปว่าเสร็จโดยไม่แจ้ง

| ไฟล์ที่แก้ | สิ่งที่ต้องทำ | อัตโนมัติ? |
|---|---|---|
| `Code.gs` | Apps Script → Deploy → Manage deployments → New version → Deploy | ❌ ต้องทำเอง |
| `worker.js` | Cloudflare Workers → Edit code → วาง code ใหม่ → Save & Deploy | ❌ ต้องทำเอง |
| `dashboard.html` | `git push` → Vercel deploy อัตโนมัติ | ✅ อัตโนมัติ |
| `vercel.json` | `git push` → Vercel deploy อัตโนมัติ | ✅ อัตโนมัติ |

### วิธี deploy Apps Script (Code.gs)
1. เปิด [script.google.com](https://script.google.com) → เลือกโปรเจกต์
2. วาง code ใหม่ทับของเดิม
3. Deploy → **Manage deployments** → ✏️ แก้ไข → **New version** → Deploy

### วิธี deploy Cloudflare Worker (worker.js)
1. เปิด [dash.cloudflare.com](https://dash.cloudflare.com) → Workers & Pages → siplor
2. Edit code → วาง code ใหม่ทับของเดิม
3. **Save & Deploy**

### ผลถ้าไม่ deploy
- ไม่ deploy **Code.gs** → API ยังรันโค้ดเก่า (เช่น ฟิลด์ใหม่จะหายไป / format ผิด)
- ไม่ deploy **worker.js** → parameter ใหม่ที่เพิ่มจะไม่ถูกส่งผ่าน (เช่น `?all=1` → search ไม่ทำงาน)

---

## Search (🔍)

- กดปุ่ม 🔍 มุมขวาบน → ช่องค้นหาปรากฏ + โหลด data ทุกวัน (`?all=1`) อัตโนมัติ
- พิมพ์ทันที → ผลลัพธ์ขึ้น real-time ไม่ต้องกดปุ่ม
- ค้นหาได้จาก: ชื่อ, เบอร์โทร (ตัดขีดออก), หมายเหตุ
- ผลลัพธ์แสดงเป็น flat list — แต่ละ card มีป้าย 📅 วันที่ชัดเจน
- **ไม่ถูก filter วัน/เดือน** — แสดงทุก booking ที่ match ไม่ว่าจะเลือกวันไหนอยู่

### Variables ที่เกี่ยวกับ Search
| Variable | หน้าที่ |
|---|---|
| `_allBookings` | ข้อมูล day/month view (โหลดจาก `?date=` หรือ `?month=`) |
| `_allSearchBookings` | ข้อมูลทุก booking สำหรับ search โดยเฉพาะ (โหลดจาก `?all=1`) |
| `searchQuery` | string ที่ผู้ใช้พิมพ์ (lowercase, trimmed) |

> ⚠️ **สำคัญ**: `_allBookings` และ `_allSearchBookings` ต้องแยกกัน — ถ้าใช้ตัวเดียวกัน จะเกิด bug ที่ `loadBookings()` ทับข้อมูล all-bookings ด้วยข้อมูลรายวัน ทำให้ search filter ติดวัน/เดือนที่เลือกอยู่

### Logic ใน renderFromCache()
```js
const sourceData = searchQuery ? _allSearchBookings : _allBookings;
let filtered = filterBookings(sourceData);
```
- มี `searchQuery` → ใช้ `_allSearchBookings` (ข้อมูลทั้งหมด)
- ไม่มี `searchQuery` → ใช้ `_allBookings` (รายวัน/เดือนตามปกติ)

### Functions
- `loadMonthForSearch()` — fetch `?all=1`, เก็บใน `_allSearchBookings` (ไม่แตะ `_allBookings`), render loading ระหว่างรอ
- `filterBookings(bookings)` — filter จาก `searchQuery`, normalize phone (ตัด `-` ออก)
- `renderCard(b, showDate)` — `showDate=true` จะแสดง `.card-date` badge บน card
- เมื่อปิด search → `_allSearchBookings = []` และ เรียก `loadBookings()` คืนสภาพปกติ

### worker.js — ต้องส่ง `?all=1` ผ่านด้วย
```js
const all = url.searchParams.get("all");
const upstream = all
  ? `${APPS_SCRIPT_URL}?all=1`
  : month
  ? `${APPS_SCRIPT_URL}?month=${month}`
  : `${APPS_SCRIPT_URL}?date=${date || todayBKK()}`;
```
> ⚠️ ถ้าไม่อัปเดต Worker จะ default เป็น `?date=วันนี้` ทำให้ search คืนข้อมูลแค่วันนี้

---

## Audit Trail (เพิ่มโดย / แก้ไขโดย)

- แสดงเฉพาะตอน `authed = true` (login แล้ว)
- ข้อมูลเก่าที่มีก่อน feature นี้จะไม่มี audit — แสดงเฉพาะที่เพิ่ม/แก้หลังจาก deploy
- **Google Sheet** ต้องมี 4 column header: `เพิ่มโดย`, `เพิ่มเมื่อ`, `แก้ไขโดย`, `แก้ไขเมื่อ`
- `addedBy` / `addedAt` — บันทึกตอน action `"add"` เท่านั้น
- `editedBy` / `editedAt` — บันทึกตอน action `"edit"` เท่านั้น (ไม่ทับ addedBy)
- `formatDateTime(val)` ใน Code.gs — handle กรณี Sheets แปลง string เป็น Date object → ใช้ `Utilities.formatDate`
- `formatAuditTime(dt)` ใน dashboard.html — parse "YYYY-MM-DD HH:MM" หรือ JS Date string (fallback กรณียังไม่ redeploy Apps Script)

> ⚠️ ถ้าแก้ Code.gs แล้วไม่ redeploy → Apps Script ส่งค่า Date object กลับมาเป็น string รูปแบบ "Thu May 28..." ทำให้ format วันที่ผิด

---

## Known Issues / Notes

- `_row` index ใช้ตอน load หน้า ถ้ามีคนลบ row พร้อมกัน อาจ edit ผิด row (edge case, low risk)
- ไม่มี auth ที่ API level — ใครรู้ Cloudflare Worker URL ก็ POST ได้ (acceptable สำหรับ internal tool)
- วันอังคารถูกบล็อก 2 ชั้น: trigger ใน Apps Script (form) + validation ใน dashboard (web form)

### _bookingsByRow reset bug (fixed)
- **Bug:** กด แก้ไข จากหน้า search แล้ว form เปิดว่าง ต้องกรอกใหม่หมด
- **สาเหตุ:** `loadBookings()` reset `_bookingsByRow = {}` ทุกครั้งที่รัน (เช่น เปลี่ยนวัน, กดวันนี้, เปลี่ยน mode) ทำให้ `_row` ของ booking ที่ไม่อยู่ใน view ปัจจุบันหายออกจาก map
- **Fix:** `openBookingForm` และ `openDeleteConfirm` fallback ไปหาใน `_allSearchBookings` ถ้าหาใน `_bookingsByRow` ไม่เจอ
  ```js
  const b = _bookingsByRow[row] ?? _allSearchBookings.find(x => x._row === row) ?? null;
  ```
- **หลักการ:** `_allSearchBookings` ไม่ถูกแตะโดย `loadBookings()` จึงเป็น fallback ที่ปลอดภัยเสมอเมื่ออยู่ใน search mode

---

## Backup

Local backup: `C:\Users\KssR\Documents\Siplor\`
Remote: `https://github.com/fxrkssr/Siplor`
