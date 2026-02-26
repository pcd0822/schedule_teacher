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

/** 스프레드시트에 'batches', 'schedules' 시트가 없으면 생성 (Requested entity was not found 방지) */
async function ensureSheetsExist(sheets) {
  const id = SPREADSHEET_ID();
  if (!id) throw new Error('SPREADSHEET_ID가 설정되지 않았습니다.');

  const meta = await sheets.spreadsheets.get({ spreadsheetId: id });
  const titles = (meta.data.sheets || []).map((s) => (s.properties && s.properties.title) || '');

  const requests = [];
  if (!titles.includes(BATCHES_SHEET)) {
    requests.push({ addSheet: { properties: { title: BATCHES_SHEET } } });
  }
  if (!titles.includes(SCHEDULES_SHEET)) {
    requests.push({ addSheet: { properties: { title: SCHEDULES_SHEET } } });
  }
  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: id,
      requestBody: { requests },
    });
  }
}

async function ensureHeaders(sheets) {
  const id = SPREADSHEET_ID();
  await ensureSheetsExist(sheets);

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
  // schedules: batchId, teacherName, year, dayIndex, period, subject, room, department, subjectArea
  const scheduleHeaders = ['batchId', 'teacherName', 'year', 'dayIndex', 'period', 'subject', 'room', 'department', 'subjectArea'];
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: id,
      range: `${SCHEDULES_SHEET}!A1:I1`,
    });
    const existing = (res.data.values && res.data.values[0]) || [];
    if (existing.length < scheduleHeaders.length) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: id,
        range: `${SCHEDULES_SHEET}!A1:I1`,
        valueInputOption: 'RAW',
        requestBody: { values: [scheduleHeaders] },
      });
    }
  } catch (e) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: id,
      range: `${SCHEDULES_SHEET}!A1:I1`,
      valueInputOption: 'RAW',
      requestBody: { values: [scheduleHeaders] },
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
    const department = (t.department != null ? t.department : '').toString().trim();
    const subjectArea = (t.subjectArea != null ? t.subjectArea : '').toString().trim();
    for (const s of t.slots) {
      rows.push([
        batchId,
        t.teacherName,
        t.year,
        s.dayIndex,
        s.period,
        s.subject,
        s.room,
        department,
        subjectArea,
      ]);
    }
  }
  if (rows.length === 0) return;
  await sheets.spreadsheets.values.append({
    spreadsheetId: id,
    range: `${SCHEDULES_SHEET}!A:I`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: rows },
  });
}

async function getSchedulesByBatchAndTeacher(sheets, batchId, teacherName) {
  const id = SPREADSHEET_ID();
  await ensureSheetsExist(sheets);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: id,
    range: `${SCHEDULES_SHEET}!A:I`,
  });
  const rows = res.data.values || [];
  const data = rows.slice(1);
  const dayNames = ['월', '화', '수', '목', '금'];
  const matching = data.filter((r) => r[0] === batchId && (r[1] || '').trim() === (teacherName || '').trim());
  const slots = matching.map((r) => ({
    dayIndex: parseInt(r[3], 10),
    day: dayNames[Number(r[3])] || '',
    period: parseInt(r[4], 10),
    subject: r[5] || '',
    room: r[6] || '',
  }));
  const first = matching[0] || [];
  const department = (first[7] != null ? first[7] : '').toString().trim();
  const subjectArea = (first[8] != null ? first[8] : '').toString().trim();
  return { slots, department, subjectArea };
}

async function getTeacherNamesByBatch(sheets, batchId) {
  const id = SPREADSHEET_ID();
  await ensureSheetsExist(sheets);
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

/** 가장 최근 배치 ID 한 개 반환 (헤더 제외, 마지막 데이터 행의 A열) */
async function getLatestBatchId(sheets) {
  const id = SPREADSHEET_ID();
  if (!id) return null;
  await ensureSheetsExist(sheets);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: id,
    range: `${BATCHES_SHEET}!A:A`,
  });
  const rows = res.data.values || [];
  const dataRows = rows.slice(1).map((r) => (r[0] || '').trim()).filter(Boolean);
  return dataRows[dataRows.length - 1] || null;
}

module.exports = {
  getSheetsClient,
  SPREADSHEET_ID,
  ensureHeaders,
  ensureSheetsExist,
  appendBatch,
  appendSchedules,
  getSchedulesByBatchAndTeacher,
  getTeacherNamesByBatch,
  getLatestBatchId,
};
