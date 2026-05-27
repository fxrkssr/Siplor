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
- รหัสผ่าน: `7777@` (เก็บใน `const PASSWORD` ใน JS)
- กดปุ่ม 🔒 มุมขวาบน → ใส่รหัส → เข้า edit mode
- Refresh หน้า = ต้องใส่รหัสใหม่ (ไม่มี persist)
- `authed = true` → แสดงปุ่ม ✏️🗑️ บน card + ปุ่ม "+ เพิ่มการจอง"
- ปุ่มแก้ไข/ลบ **ไม่แสดง** สำหรับ booking ที่ผ่านแล้ว (`isPast(b)`)

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

## Deploy Checklist

เมื่อแก้ไข code ต้องทำตามลำดับ:

1. **Code.gs** → Apps Script → Deploy → Manage → New Version → Deploy
2. **worker.js** → Cloudflare Workers → Edit → วาง code → Save & Deploy
3. **dashboard.html** → push GitHub → Vercel deploy อัตโนมัติ

> ⚠️ Apps Script และ Cloudflare Worker **ไม่ได้ deploy อัตโนมัติ** ต้องทำเองทุกครั้ง

---

## Known Issues / Notes

- `_row` index ใช้ตอน load หน้า ถ้ามีคนลบ row พร้อมกัน อาจ edit ผิด row (edge case, low risk)
- ไม่มี auth ที่ API level — ใครรู้ Cloudflare Worker URL ก็ POST ได้ (acceptable สำหรับ internal tool)
- วันอังคารถูกบล็อก 2 ชั้น: trigger ใน Apps Script (form) + validation ใน dashboard (web form)

---

## Backup

Local backup: `C:\Users\KssR\Documents\Siplor\`
Remote: `https://github.com/fxrkssr/Siplor`
