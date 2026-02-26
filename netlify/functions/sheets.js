/**
 * Google Sheets 연동
 * 환경변수: GOOGLE_SERVICE_ACCOUNT_JSON (JSON 문자열), SPREADSHEET_ID
 */
const { google } = require('googleapis');

function getAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not set');
  const key = typeof raw === 'string' ? JSON.parse(raw) : raw;
  const auth = new google.auth.GoogleAuth({
    credentials: key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return auth;
}

async function getSheetsClient() {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  return { sheets, auth };
}

const SPREADSHEET_ID = () => process.env.SPREADSHEET_ID || '';

const BATCHES_SHEET = 'batches';
const SCHEDULES_SHEET = 'schedules';

async function ensureHeaders(sheets) {
  const id = SPREADSHEET_ID();
  // batches: batchId, createdAt
  try {
    await sheets.spreadsheets.values.get({
      spreadsheetId: id,
      range: `${BATCHES_SHEET}!A1:B1`,
    });
  } catch (e) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: id,
      range: `${BATCHES_SHEET}!A1:B1`,
      valueInputOption: 'RAW',
      requestBody: { values: [['batchId', 'createdAt']] },
    });
  }
  // schedules: batchId, teacherName, year, dayIndex, period, subject, room
  try {
    await sheets.spreadsheets.values.get({
      spreadsheetId: id,
      range: `${SCHEDULES_SHEET}!A1:G1`,
    });
  } catch (e) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: id,
      range: `${SCHEDULES_SHEET}!A1:G1`,
      valueInputOption: 'RAW',
      requestBody: { values: [['batchId', 'teacherName', 'year', 'dayIndex', 'period', 'subject', 'room']] },
    });
  }
}

async function appendBatch(sheets, batchId) {
  const id = SPREADSHEET_ID();
  await sheets.spreadsheets.values.append({
    spreadsheetId: id,
    range: `${BATCHES_SHEET}!A:B`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [[batchId, new Date().toISOString()]],
    },
  });
}

async function appendSchedules(sheets, batchId, teachers) {
  const id = SPREADSHEET_ID();
  const rows = [];
  for (const t of teachers) {
    for (const s of t.slots) {
      rows.push([
        batchId,
        t.teacherName,
        t.year,
        s.dayIndex,
        s.period,
        s.subject,
        s.room,
      ]);
    }
  }
  if (rows.length === 0) return;
  await sheets.spreadsheets.values.append({
    spreadsheetId: id,
    range: `${SCHEDULES_SHEET}!A:G`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: rows },
  });
}

async function getSchedulesByBatchAndTeacher(sheets, batchId, teacherName) {
  const id = SPREADSHEET_ID();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: id,
    range: `${SCHEDULES_SHEET}!A:G`,
  });
  const rows = res.data.values || [];
  const header = rows[0] || [];
  const data = rows.slice(1);
  const dayNames = ['월', '화', '수', '목', '금'];
  const slots = data
    .filter((r) => r[0] === batchId && (r[1] || '').trim() === (teacherName || '').trim())
    .map((r) => ({
      dayIndex: parseInt(r[3], 10),
      day: dayNames[Number(r[3])] || '',
      period: parseInt(r[4], 10),
      subject: r[5] || '',
      room: r[6] || '',
    }));
  return slots;
}

async function getTeacherNamesByBatch(sheets, batchId) {
  const id = SPREADSHEET_ID();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: id,
    range: `${SCHEDULES_SHEET}!A:B`,
  });
  const rows = res.data.values || [];
  const set = new Set();
  rows.slice(1).forEach((r) => {
    if (r[0] === batchId && r[1]) set.add(r[1].trim());
  });
  return Array.from(set).sort();
}

module.exports = {
  getSheetsClient,
  SPREADSHEET_ID,
  ensureHeaders,
  appendBatch,
  appendSchedules,
  getSchedulesByBatchAndTeacher,
  getTeacherNamesByBatch,
};
