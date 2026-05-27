// Google Apps Script — วางใน Apps Script ที่ผูกกับ Google Sheets
// เมนู Extensions > Apps Script > วาง > Deploy > New deployment > Web app
// Execute as: Me | Who has access: Anyone

const SHEET_NAME = "การตอบกลับแบบฟอร์ม 1";

function doGet(e) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheets()[0];

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return jsonResponse([]);

  const dateParam  = (e.parameter && e.parameter.date)  ? e.parameter.date  : null;
  const monthParam = (e.parameter && e.parameter.month) ? e.parameter.month : null;
  const allParam   = (e.parameter && e.parameter.all)   ? true              : false;

  if (!dateParam && !monthParam && !allParam) return jsonResponse([]);

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
    // allParam = true → no filter, return everything

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
      addedAt:    col.addedAt  >= 0 ? String(row[col.addedAt]  || "").trim() : "",
      editedBy:   col.editedBy >= 0 ? String(row[col.editedBy] || "").trim() : "",
      editedAt:   col.editedAt >= 0 ? String(row[col.editedAt] || "").trim() : "",
    });
  }

  result.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  return jsonResponse(result);
}

function doPost(e) {
  try {
    const body   = JSON.parse(e.postData.contents);
    const ss     = SpreadsheetApp.getActiveSpreadsheet();
    const sheet  = ss.getSheets()[0];
    const data   = sheet.getDataRange().getValues();
    const col    = getColMap(data[0].map(h => String(h).trim()));
    const nCols  = data[0].length;

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
      return jsonResponse({ ok: true });
    }

    const rowIdx = parseInt(body._row);
    if (isNaN(rowIdx) || rowIdx < 2) return jsonResponse({ error: "invalid row" });

    if (body.action === "delete") {
      sheet.deleteRow(rowIdx);
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
      r.setValues([vals]);
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ error: "unknown action" });
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
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
    addedBy:  headers.findIndex(h => h === "เพิ่มโดย"),
    addedAt:  headers.findIndex(h => h === "เพิ่มเมื่อ"),
    editedBy: headers.findIndex(h => h === "แก้ไขโดย"),
    editedAt: headers.findIndex(h => h === "แก้ไขเมื่อ"),
  };
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
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
