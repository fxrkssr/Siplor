// Google Apps Script — วางใน Apps Script ที่ผูกกับ Google Sheets
// เมนู Extensions > Apps Script > วาง > Deploy > New deployment > Web app
// Execute as: Me | Who has access: Anyone

const SHEET_NAME = "การตอบกลับแบบฟอร์ม 1";

function doGet(e) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheets()[0];

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return jsonResponse([]);

  const dateParam      = (e.parameter && e.parameter.date)      ? e.parameter.date  : null;
  const monthParam     = (e.parameter && e.parameter.month)     ? e.parameter.month : null;
  const allParam       = (e.parameter && e.parameter.all)       ? true              : false;
  const cancelledParam = (e.parameter && e.parameter.cancelled) ? true              : false;
  const customersParam = (e.parameter && e.parameter.customers) ? true              : false;

  if (!dateParam && !monthParam && !allParam && !cancelledParam && !customersParam) return jsonResponse([]);

  if (customersParam) {
    const ss       = SpreadsheetApp.getActiveSpreadsheet();
    const custSheet = ss.getSheetByName("Customers");
    if (!custSheet) return jsonResponse([]);
    const custData = custSheet.getDataRange().getValues();
    if (custData.length <= 1) return jsonResponse([]);
    const h = custData[0].map(v => String(v).trim());
    const ci = {
      phone:       h.indexOf("phone"),
      name:        h.indexOf("name"),
      allergy:     h.indexOf("allergy"),
      notes:       h.indexOf("notes"),
      lastVisit:   h.indexOf("lastVisit"),
      totalVisits: h.indexOf("totalVisits"),
    };
    const result = [];
    for (let i = 1; i < custData.length; i++) {
      const r = custData[i];
      const phone = ci.phone >= 0 ? String(r[ci.phone] || "").trim() : "";
      const name  = ci.name  >= 0 ? String(r[ci.name]  || "").trim() : "";
      if (!phone && !name) continue;
      result.push({
        phone,
        name,
        allergy:     ci.allergy     >= 0 ? String(r[ci.allergy]     || "").trim() : "",
        notes:       ci.notes       >= 0 ? String(r[ci.notes]       || "").trim() : "",
        lastVisit:   ci.lastVisit   >= 0 ? String(r[ci.lastVisit]   || "").trim() : "",
        totalVisits: ci.totalVisits >= 0 ? (parseInt(r[ci.totalVisits]) || 0)     : 0,
      });
    }
    return jsonResponse(result);
  }

  const headers = data[0].map(h => String(h).trim());
  const col     = getColMap(headers);
  const result  = [];

  for (let i = 1; i < data.length; i++) {
    const row     = data[i];
    const rawDate = col.date >= 0 ? row[col.date] : row[1];
    if (!rawDate) continue;

    let dateStr;
    if (rawDate instanceof Date) {
      dateStr = Utilities.formatDate(rawDate, "Asia/Bangkok", "yyyy-MM-dd");
    } else {
      dateStr = String(rawDate).substring(0, 10);
    }

    if (dateParam  && dateStr !== dateParam)           continue;
    if (monthParam && !dateStr.startsWith(monthParam)) continue;
    // allParam / cancelledParam → no date filter

    const status      = col.status >= 0 ? String(row[col.status] || "").trim() : "";
    const isCancelled = status === "ยกเลิก";

    if (cancelledParam && !isCancelled) continue;  // cancelled mode: ส่งเฉพาะที่ยกเลิก
    if (!cancelledParam && isCancelled) continue;  // normal mode: ซ่อนที่ยกเลิก

    const allergy = col.allergy >= 0 ? String(row[col.allergy] || "").trim() : "";

    result.push({
      _row:       i + 1,
      date:       dateStr,
      time:       col.time     >= 0 ? formatTime(row[col.time]) : "",
      name:       col.name     >= 0 ? String(row[col.name]    || "").trim() : "",
      phone:      col.phone    >= 0 ? formatPhone(row[col.phone]) : "",
      count:      col.count    >= 0 ? String(row[col.count]   || "1").trim() : "1",
      allergy:    allergy,
      hasAllergy: allergy !== "" && allergy !== "ไม่แพ้" && allergy !== "ไม่ได้แจ้ง",
      notes:      col.notes    >= 0 ? String(row[col.notes]   || "").trim() : "",
      addedBy:    col.addedBy  >= 0 ? String(row[col.addedBy]  || "").trim() : "",
      addedAt:    col.addedAt  >= 0 ? formatDateTime(row[col.addedAt])  : "",
      editedBy:      col.editedBy     >= 0 ? String(row[col.editedBy]  || "").trim() : "",
      editedAt:      col.editedAt     >= 0 ? formatDateTime(row[col.editedAt])       : "",
      cancelledBy:   col.cancelledBy  >= 0 ? String(row[col.cancelledBy] || "").trim() : "",
      cancelledAt:   col.cancelledAt  >= 0 ? formatDateTime(row[col.cancelledAt])    : "",
      cancelled:     isCancelled,
    });
  }

  result.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  return jsonResponse(result);
}

function doPost(e) {
  try {
    const body      = JSON.parse(e.postData.contents);
    const ss        = SpreadsheetApp.getActiveSpreadsheet();
    const sheet     = ss.getSheets()[0];
    const data      = sheet.getDataRange().getValues();
    const col       = getColMap(data[0].map(h => String(h).trim()));
    const nCols     = data[0].length;
    const custSheet = ss.getSheetByName("Customers");

    if (body.action === "add") {
      const newRow = new Array(nCols).fill("");
      newRow[0] = new Date();
      if (col.date    >= 0) newRow[col.date]    = body.date;
      if (col.time    >= 0) newRow[col.time]     = body.time;
      if (col.name    >= 0) newRow[col.name]     = body.name;
      if (col.phone   >= 0) newRow[col.phone]    = body.phone;
      if (col.count   >= 0) newRow[col.count]    = body.count;
      if (col.allergy  >= 0) newRow[col.allergy]  = body.allergy;
      if (col.notes    >= 0) newRow[col.notes]    = body.notes || "";
      if (col.addedBy  >= 0) newRow[col.addedBy]  = body.addedBy  || "";
      if (col.addedAt  >= 0) newRow[col.addedAt]  = body.addedAt  || "";
      sheet.appendRow(newRow);
      if (custSheet) upsertCustomer(custSheet, body.phone, body.name, body.allergy, body.notes, body.date, 1);
      return jsonResponse({ ok: true });
    }

    const rowIdx = parseInt(body._row);
    if (isNaN(rowIdx) || rowIdx < 2) return jsonResponse({ error: "invalid row" });

    if (body.action === "delete") {
      const bookingVals = sheet.getRange(rowIdx, 1, 1, nCols).getValues()[0];
      const phone = col.phone >= 0 ? formatPhone(bookingVals[col.phone]) : "";
      const status = col.status >= 0 ? String(bookingVals[col.status] || "").trim() : "";
      sheet.deleteRow(rowIdx);
      if (custSheet && phone && status !== "ยกเลิก") upsertCustomer(custSheet, phone, "", "", "", "", -1);
      return jsonResponse({ ok: true });
    }

    if (body.action === "cancel") {
      if (col.status < 0) return jsonResponse({ error: "ไม่พบ column สถานะ ใน Sheet" });
      const r    = sheet.getRange(rowIdx, 1, 1, nCols);
      const vals = r.getValues()[0];
      const phone = col.phone >= 0 ? formatPhone(vals[col.phone]) : "";
      vals[col.status] = "ยกเลิก";
      if (col.cancelledBy >= 0) vals[col.cancelledBy] = body.cancelledBy || "";
      if (col.cancelledAt >= 0) vals[col.cancelledAt] = body.cancelledAt || "";
      r.setValues([vals]);
      if (custSheet && phone) upsertCustomer(custSheet, phone, "", "", "", "", -1);
      return jsonResponse({ ok: true });
    }

    if (body.action === "edit") {
      const r    = sheet.getRange(rowIdx, 1, 1, nCols);
      const vals = r.getValues()[0];
      if (col.date    >= 0) vals[col.date]    = body.date;
      if (col.time    >= 0) vals[col.time]     = body.time;
      if (col.name    >= 0) vals[col.name]     = body.name;
      if (col.phone   >= 0) vals[col.phone]    = body.phone;
      if (col.count   >= 0) vals[col.count]    = body.count;
      if (col.allergy  >= 0) vals[col.allergy]  = body.allergy;
      if (col.notes    >= 0) vals[col.notes]    = body.notes || "";
      if (col.editedBy >= 0) vals[col.editedBy] = body.editedBy || "";
      if (col.editedAt >= 0) vals[col.editedAt] = body.editedAt || "";
      if (body.restore && col.status >= 0)      vals[col.status]      = "";
      if (body.restore && col.cancelledBy >= 0) vals[col.cancelledBy] = "";
      if (body.restore && col.cancelledAt >= 0) vals[col.cancelledAt] = "";
      r.setValues([vals]);
      const delta = body.restore ? 1 : 0;
      if (custSheet && body.phone) upsertCustomer(custSheet, body.phone, body.name, body.allergy, body.notes, body.date, delta);
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ error: "unknown action" });
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

function isRealPhone(phone) {
  return phone && phone !== "0" && phone !== "00";
}

function upsertCustomer(custSheet, phone, name, allergy, notes, date, delta) {
  if (!isRealPhone(phone)) return;
  const data = custSheet.getDataRange().getValues();
  const h    = data[0].map(v => String(v).trim());
  const ci   = {
    phone:       h.indexOf("phone"),
    name:        h.indexOf("name"),
    allergy:     h.indexOf("allergy"),
    notes:       h.indexOf("notes"),
    lastVisit:   h.indexOf("lastVisit"),
    totalVisits: h.indexOf("totalVisits"),
  };

  for (let i = 1; i < data.length; i++) {
    const rowPhone = ci.phone >= 0 ? formatPhone(data[i][ci.phone]) : "";
    if (rowPhone !== phone) continue;
    const r    = custSheet.getRange(i + 1, 1, 1, data[0].length);
    const vals = r.getValues()[0];
    if (ci.name    >= 0 && name)    vals[ci.name]    = name;
    if (ci.allergy >= 0 && allergy) vals[ci.allergy] = allergy;
    if (ci.notes   >= 0 && notes)   vals[ci.notes]   = notes;
    if (ci.totalVisits >= 0) vals[ci.totalVisits] = Math.max(0, (parseInt(vals[ci.totalVisits]) || 0) + delta);
    if (ci.lastVisit >= 0 && date && delta > 0) {
      const existing = String(vals[ci.lastVisit] || "").trim();
      if (!existing || date > existing) vals[ci.lastVisit] = date;
    }
    r.setValues([vals]);
    return;
  }

  if (delta > 0) {
    const newRow = new Array(data[0].length).fill("");
    if (ci.phone       >= 0) newRow[ci.phone]       = phone;
    if (ci.name        >= 0) newRow[ci.name]         = name || "";
    if (ci.allergy     >= 0) newRow[ci.allergy]      = allergy || "";
    if (ci.notes       >= 0) newRow[ci.notes]        = notes || "";
    if (ci.lastVisit   >= 0) newRow[ci.lastVisit]    = date || "";
    if (ci.totalVisits >= 0) newRow[ci.totalVisits]  = 1;
    custSheet.appendRow(newRow);
    // force phone cell to text AFTER append (appendRow ignores pre-set column format)
    if (ci.phone >= 0) {
      const phoneCell = custSheet.getRange(custSheet.getLastRow(), ci.phone + 1);
      phoneCell.setNumberFormat("@").setValue(phone);
    }
  }
}

function formatDateTime(val) {
  if (!val) return "";
  if (val instanceof Date) {
    return Utilities.formatDate(val, "Asia/Bangkok", "yyyy-MM-dd HH:mm");
  }
  return String(val).trim();
}

function formatPhone(val) {
  if (!val && val !== 0) return "";
  if (typeof val === "number") return "0" + Math.round(val);
  return String(val).trim();
}

function formatTime(val) {
  if (!val) return "";
  if (val instanceof Date) {
    return Utilities.formatDate(val, "Asia/Bangkok", "HH:mm");
  }
  return String(val).trim();
}

function getColMap(headers) {
  return {
    date:     headers.findIndex(h => h.includes("วันที่")),
    time:     headers.findIndex(h => h.includes("เวลา")),
    name:     headers.findIndex(h => h.includes("ชื่อ")),
    phone:    headers.findIndex(h => h.includes("เบอร์") || h.includes("โทร")),
    count:    headers.findIndex(h => h.includes("จำนวน")),
    allergy:  headers.findIndex(h => h.includes("แพ้")),
    notes:    headers.findIndex(h => h.includes("หมายเหตุ")),
    addedBy:      headers.findIndex(h => h === "เพิ่มโดย"),
    addedAt:      headers.findIndex(h => h === "เพิ่มเมื่อ"),
    editedBy:     headers.findIndex(h => h === "แก้ไขโดย"),
    editedAt:     headers.findIndex(h => h === "แก้ไขเมื่อ"),
    status:       headers.findIndex(h => h === "สถานะ"),
    cancelledBy:  headers.findIndex(h => h === "ยกเลิกโดย"),
    cancelledAt:  headers.findIndex(h => h === "ยกเลิกเมื่อ"),
  };
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// รันครั้งเดียว: สร้าง Customers sheet ใหม่ แล้ว migrate ข้อมูลจาก booking ทันที
function createAndMigrateCustomers() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let custSheet = ss.getSheetByName("Customers");
  if (custSheet) {
    ss.deleteSheet(custSheet);
  }
  custSheet = ss.insertSheet("Customers");
  custSheet.appendRow(["phone", "name", "allergy", "notes", "lastVisit", "totalVisits"]);
  custSheet.getRange(1, 1, 1, 6).setFontWeight("bold");
  // format phone column as text to preserve leading 0
  custSheet.getRange("A:A").setNumberFormat("@");
  syncAllCustomers();
  // re-read phone column and rewrite as text to fix any leading-0 lost during sync
  const lastRow = custSheet.getLastRow();
  if (lastRow > 1) {
    const phoneRange = custSheet.getRange(2, 1, lastRow - 1, 1);
    phoneRange.setNumberFormat("@");
    const fixed = phoneRange.getValues().map(([p]) => [formatPhone(p)]);
    phoneRange.setValues(fixed);
  }
}

// รันครั้งเดียวเพื่อ backfill ลูกค้าทุกคนจาก booking sheet → Customers sheet
function syncAllCustomers() {
  const ss        = SpreadsheetApp.getActiveSpreadsheet();
  const allSheets = ss.getSheets().map(s => s.getName());
  const sheet     = ss.getSheetByName(SHEET_NAME) || ss.getSheets().find(s => s.getName() !== "Customers" && s.getName() !== "Sheet1");
  const custSheet = ss.getSheetByName("Customers");
  if (!sheet)     { SpreadsheetApp.getUi().alert("ไม่พบ booking sheet\n\nชื่อ sheet ที่มี: " + allSheets.join(", ")); return; }
  if (!custSheet) { SpreadsheetApp.getUi().alert("ไม่พบ sheet ชื่อ Customers"); return; }

  const data    = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());
  const col     = getColMap(headers);

  // group bookings by phone
  const map = {};
  for (let i = 1; i < data.length; i++) {
    const row    = data[i];
    const status = col.status >= 0 ? String(row[col.status] || "").trim() : "";
    if (status === "ยกเลิก") continue;
    const phone   = col.phone >= 0 ? formatPhone(row[col.phone]) : "";
    const name    = col.name  >= 0 ? String(row[col.name]  || "").trim() : "";
    if (!isRealPhone(phone)) continue;
    const key = phone;
    const rawDate = col.date >= 0 ? row[col.date] : "";
    let dateStr = "";
    if (rawDate instanceof Date) {
      dateStr = Utilities.formatDate(rawDate, "Asia/Bangkok", "yyyy-MM-dd");
    } else {
      dateStr = String(rawDate).substring(0, 10);
    }
    if (!map[key]) {
      map[key] = { phone, name, allergy: "", notes: "", lastVisit: "", totalVisits: 0 };
    }
    map[key].totalVisits++;
    if (name) map[key].name = name;
    const allergy = col.allergy >= 0 ? String(row[col.allergy] || "").trim() : "";
    if (allergy) map[key].allergy = allergy;
    const notes = col.notes >= 0 ? String(row[col.notes] || "").trim() : "";
    if (notes) map[key].notes = notes;
    if (dateStr && (!map[key].lastVisit || dateStr > map[key].lastVisit)) map[key].lastVisit = dateStr;
  }

  // upsert each customer
  let added = 0, updated = 0;
  Object.values(map).forEach(c => {
    const custData = custSheet.getDataRange().getValues();
    const ch = custData[0].map(v => String(v).trim());
    const ci = {
      phone: ch.indexOf("phone"), name: ch.indexOf("name"),
      allergy: ch.indexOf("allergy"), notes: ch.indexOf("notes"),
      lastVisit: ch.indexOf("lastVisit"), totalVisits: ch.indexOf("totalVisits"),
    };
    let found = false;
    for (let i = 1; i < custData.length; i++) {
      const rowPhone = ci.phone >= 0 ? formatPhone(custData[i][ci.phone]) : "";
      if (rowPhone !== c.phone) continue;
      const r    = custSheet.getRange(i + 1, 1, 1, custData[0].length);
      const vals = r.getValues()[0];
      if (ci.name        >= 0) vals[ci.name]        = c.name;
      if (ci.allergy     >= 0) vals[ci.allergy]      = c.allergy;
      if (ci.notes       >= 0) vals[ci.notes]        = c.notes;
      if (ci.totalVisits >= 0) vals[ci.totalVisits]  = c.totalVisits;
      if (ci.lastVisit   >= 0) vals[ci.lastVisit]    = c.lastVisit;
      r.setValues([vals]);
      found = true; updated++; break;
    }
    if (!found) {
      const custData2 = custSheet.getDataRange().getValues();
      const nCols = custData2[0].length;
      const ch2   = custData2[0].map(v => String(v).trim());
      const ci2   = { phone: ch2.indexOf("phone"), name: ch2.indexOf("name"), allergy: ch2.indexOf("allergy"), notes: ch2.indexOf("notes"), lastVisit: ch2.indexOf("lastVisit"), totalVisits: ch2.indexOf("totalVisits") };
      const newRow = new Array(nCols).fill("");
      if (ci2.phone >= 0) newRow[ci2.phone] = c.phone;
      if (ci2.name  >= 0) newRow[ci2.name]  = c.name;
      if (ci2.allergy >= 0) newRow[ci2.allergy] = c.allergy;
      if (ci2.notes   >= 0) newRow[ci2.notes]   = c.notes;
      if (ci2.lastVisit   >= 0) newRow[ci2.lastVisit]   = c.lastVisit;
      if (ci2.totalVisits >= 0) newRow[ci2.totalVisits] = c.totalVisits;
      custSheet.appendRow(newRow);
      added++;
    }
  });

  SpreadsheetApp.getUi().alert(`Sync เสร็จ!\nเพิ่มใหม่: ${added} คน\nอัปเดต: ${updated} คน`);
}

// รันครั้งเดียวเพื่อติดตั้ง trigger บล็อกวันอังคาร
function setupTuesdayBlock() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === "blockTuesdayBookings") {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger("blockTuesdayBookings")
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onFormSubmit()
    .create();
  SpreadsheetApp.getUi().alert("ติดตั้ง trigger บล็อกวันอังคารสำเร็จ!");
}

function blockTuesdayBookings(e) {
  const sheet = e.range.getSheet();
  const row   = e.range.getRow();

  const headers    = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const dateColIdx = headers.findIndex(h => String(h).includes("วันที่"));
  if (dateColIdx < 0) return;

  const dateVal = sheet.getRange(row, dateColIdx + 1).getValue();
  if (!dateVal) return;

  const bkkDate = new Date(new Date(dateVal).toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  if (bkkDate.getDay() === 2) {
    sheet.deleteRow(row);
  }
}

function createBookingForm() {
  const ss   = SpreadsheetApp.getActiveSpreadsheet();
  const form = FormApp.create("Siplor — จองโต๊ะ");
  form.setTitle("Siplor — จองโต๊ะ");
  form.setDescription("ฟอร์มสำหรับแอดมินกรอกข้อมูลการจองโต๊ะ");
  form.setCollectEmail(false);

  form.addDateItem().setTitle("วันที่จอง").setRequired(true);

  const times = [
    "17:00","17:30","18:00","18:30","19:00","19:30",
    "20:00","20:30","21:00","21:30","22:00"
  ];
  form.addListItem().setTitle("เวลาที่จอง").setChoiceValues(times).setRequired(true);
  form.addTextItem().setTitle("ชื่อลูกค้า").setRequired(true);
  form.addTextItem().setTitle("เบอร์โทรศัพท์").setRequired(true);
  form.addListItem().setTitle("จำนวนลูกค้า (คน)")
    .setChoiceValues(["1","2","3","4","5","6","7","8","9","10","10+"])
    .setRequired(true);
  form.addListItem().setTitle("ข้อมูลแพ้อาหาร")
    .setChoiceValues(["ไม่แพ้","ไม่ได้แจ้ง","อาหารทะเล","ถั่ว","นม","กลูเตน","อื่นๆ (ระบุในหมายเหตุ)"])
    .setRequired(true);
  form.addParagraphTextItem().setTitle("หมายเหตุเพิ่มเติม").setRequired(false);

  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  SpreadsheetApp.getUi().alert(
    "สร้างฟอร์มสำเร็จ!\n\nลิงก์ฟอร์ม:\n" + form.getPublishedUrl()
  );
}
