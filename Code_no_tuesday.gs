// Google Apps Script — วางใน Apps Script ที่ผูกกับ Google Sheets
// เมนู Extensions > Apps Script > วาง > Deploy > New deployment > Web app
// Execute as: Me | Who has access: Anyone
// เวอร์ชันนี้: ไม่มีการบล็อกวันอังคาร

function doGet(e) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheets()[0];

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return jsonResponse([]);

  const dateParam  = (e.parameter && e.parameter.date)  ? e.parameter.date  : null;
  const monthParam = (e.parameter && e.parameter.month) ? e.parameter.month : null;

  const headers = data[0].map(h => String(h).trim());
  const col = {
    date:    headers.findIndex(h => h.includes("วันที่")),
    time:    headers.findIndex(h => h.includes("เวลา")),
    name:    headers.findIndex(h => h.includes("ชื่อ")),
    phone:   headers.findIndex(h => h.includes("เบอร์") || h.includes("โทร")),
    count:   headers.findIndex(h => h.includes("จำนวน")),
    allergy: headers.findIndex(h => h.includes("แพ้")),
  };

  const result = [];

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

    const allergy = col.allergy >= 0 ? String(row[col.allergy] || "").trim() : "";

    result.push({
      date:       dateStr,
      time:       col.time    >= 0 ? String(row[col.time]    || "").trim() : "",
      name:       col.name    >= 0 ? String(row[col.name]    || "").trim() : "",
      phone:      col.phone   >= 0 ? String(row[col.phone]   || "").trim() : "",
      count:      col.count   >= 0 ? String(row[col.count]   || "1").trim() : "1",
      allergy:    allergy,
      hasAllergy: allergy !== "" && allergy !== "ไม่แพ้",
    });
  }

  result.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  return jsonResponse(result);
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function createBookingForm() {
  const ss   = SpreadsheetApp.getActiveSpreadsheet();
  const form = FormApp.create("Siplor — จองโต๊ะ");
  form.setTitle("Siplor — จองโต๊ะ");
  form.setDescription("ฟอร์มสำหรับแอดมินกรอกข้อมูลการจองโต๊ะ");
  form.setCollectEmail(false);

  form.addDateItem().setTitle("วันที่จอง").setRequired(true);

  const times = [
    "11:00","11:30","12:00","12:30","13:00","13:30",
    "14:00","14:30","15:00","15:30","16:00","16:30",
    "17:00","17:30","18:00","18:30","19:00","19:30",
    "20:00","20:30","21:00"
  ];
  form.addListItem().setTitle("เวลาที่จอง").setChoiceValues(times).setRequired(true);
  form.addTextItem().setTitle("ชื่อลูกค้า").setRequired(true);
  form.addTextItem().setTitle("เบอร์โทรศัพท์").setRequired(true);
  form.addListItem().setTitle("จำนวนลูกค้า (คน)")
    .setChoiceValues(["1","2","3","4","5","6","7","8","9","10","10+"])
    .setRequired(true);
  form.addListItem().setTitle("ข้อมูลแพ้อาหาร")
    .setChoiceValues(["ไม่แพ้","อาหารทะเล","ถั่ว","นม","กลูเตน","อื่นๆ (ระบุในหมายเหตุ)"])
    .setRequired(true);
  form.addParagraphTextItem().setTitle("หมายเหตุเพิ่มเติม").setRequired(false);

  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  SpreadsheetApp.getUi().alert(
    "สร้างฟอร์มสำเร็จ!\n\nลิงก์ฟอร์ม:\n" + form.getPublishedUrl()
  );
}
