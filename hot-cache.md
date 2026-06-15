# Siplor — Hot Cache

## Session 2026-06-15

### ทำอะไร
- เพิ่ม 4 ฟีเจอร์ + ยืนยันทำงานครบ:
  1. **เหตุผลยกเลิก** (col P) — dropdown ใน cancel modal, required, 4 ค่า: จองซ้ำ/ยกเลิกในวัน/ยกเลิกล่วงหน้า/no show
  2. **ช่องทางการจอง** (col Q) — dropdown ในฟอร์มจอง, required, 3 ค่า: Meta/Call/Line, แสดง badge ม่วงบน card
  3. **tab ❌ ยกเลิก มี chip filter ตามเหตุผล** — `renderReasonFilter()` / `cancelReasonFilter`
  4. **Export CSV รายวัน** (ทีมเชฟ) — ปุ่ม 📥 ใน day-nav, `exportDayCSV()`, คอลัมน์ เวลา/ชื่อ/เบอร์/จำนวนคน/แพ้อาหาร/หมายเหตุ, UTF-8 BOM
- ก่อนหน้านี้: calendar "ดูคิวว่าง" คลิกวันเพื่อไป day mode (`navigateToDay`)

### Decisions
- **เลิกใช้ Google Form แล้ว 100%** — จองผ่านเว็บอย่างเดียว. `createBookingForm/setupTuesdayBlock/blockTuesdayBookings` = dead code ยุค Form (เก็บไว้เฉยๆ). บล็อกวันอังคารใช้ validation ใน `submitBookingForm` แทน
- Export = CSV ก่อน (ไม่ทำ .xlsx)
- channel + cancelReason = required ทั้งคู่
- worker.js ไม่ต้องแก้ — forward field ใหม่ผ่านอัตโนมัติ

### Manual ที่ทำไปแล้ว
- เพิ่ม col P=เหตุผลยกเลิก, Q=ช่องทางการจอง ใน Sheet ✅
- Redeploy Code.gs (New version) ✅

### ไฟล์ที่แก้ + push แล้ว (commit 3ff5623)
- dashboard.html, Code.gs, SKILL.md (ทุกอย่าง push ขึ้น main, Vercel auto-deploy)

### Next steps / blockers
- ไม่มี blocker. ฟีเจอร์ทั้งหมดทดสอบผ่านแล้ว
- ถ้าจะเพิ่ม/ลด ตัวเลือก channel หรือ reason: แก้ทั้ง const (`CHANNELS`/`CANCEL_REASONS`) **และ** `<option>` ใน HTML modal (เป็น static)
