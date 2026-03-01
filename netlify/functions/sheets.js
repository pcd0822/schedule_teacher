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
const STUDENT_BATCHES_SHEET = 'student_batches';
const SCHEDULES_GRADE1_SHEET = 'schedules_grade1';
const SCHEDULES_GRADE2_SHEET = 'schedules_grade2';
const SCHEDULES_GRADE3_SHEET = 'schedules_grade3';

/** 스프레드시트에 필요한 시트가 없으면 생성 */
async function ensureSheetsExist(sheets) {
  const id = SPREADSHEET_ID();
  if (!id) throw new Error('SPREADSHEET_ID가 설정되지 않았습니다.');

  const meta = await sheets.spreadsheets.get({ spreadsheetId: id });
  const titles = (meta.data.sheets || []).map((s) => (s.properties && s.properties.title) || '');

  const required = [BATCHES_SHEET, SCHEDULES_SHEET, STUDENT_BATCHES_SHEET, SCHEDULES_GRADE1_SHEET, SCHEDULES_GRADE2_SHEET, SCHEDULES_GRADE3_SHEET];
  const requests = [];
  for (const title of required) {
    if (!titles.includes(title)) {
      requests.push({ addSheet: { properties: { title } } });
    }
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

// ---------- 학생 시간표 (학년별 시트) ----------
async function ensureStudentHeaders(sheets) {
  const id = SPREADSHEET_ID();
  await ensureSheetsExist(sheets);
  const grade1Headers = ['batchId', 'classCode', 'homeroomTeacher', 'period', 'dayIndex', 'subject', 'teacher'];
  const grade23Headers = ['batchId', 'studentId', 'studentName', 'period', 'dayIndex', 'subject', 'teacher', 'room'];
  for (const [sheetName, headers] of [
    [SCHEDULES_GRADE1_SHEET, grade1Headers],
    [SCHEDULES_GRADE2_SHEET, grade23Headers],
    [SCHEDULES_GRADE3_SHEET, grade23Headers],
  ]) {
    try {
      await sheets.spreadsheets.values.get({ spreadsheetId: id, range: `${sheetName}!A1:Z1` });
    } catch (e) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: id,
        range: `${sheetName}!A1:Z1`,
        valueInputOption: 'RAW',
        requestBody: { values: [headers] },
      });
    }
  }
  try {
    await sheets.spreadsheets.values.get({ spreadsheetId: id, range: `${STUDENT_BATCHES_SHEET}!A1:C1` });
  } catch (e) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: id,
      range: `${STUDENT_BATCHES_SHEET}!A1:C1`,
      valueInputOption: 'RAW',
      requestBody: { values: [['batchId', 'grade', 'createdAt']] },
    });
  }
}

async function appendStudentBatch(sheets, batchId, grade) {
  const id = SPREADSHEET_ID();
  await sheets.spreadsheets.values.append({
    spreadsheetId: id,
    range: `${STUDENT_BATCHES_SHEET}!A:C`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [[batchId, grade, new Date().toISOString()]] },
  });
}

async function appendStudentSchedulesGrade1(sheets, batchId, classes) {
  const id = SPREADSHEET_ID();
  const rows = [];
  for (const { classCode, homeroomTeacher, slots } of classes) {
    const homeroom = (homeroomTeacher != null ? homeroomTeacher : '').toString().trim();
    for (const s of slots) {
      rows.push([batchId, classCode, homeroom, s.period, s.dayIndex, s.subject, s.teacher]);
    }
  }
  if (rows.length === 0) return;
  await sheets.spreadsheets.values.append({
    spreadsheetId: id,
    range: `${SCHEDULES_GRADE1_SHEET}!A:G`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: rows },
  });
}

async function appendStudentSchedulesGrade23(sheets, batchId, students, sheetName) {
  const id = SPREADSHEET_ID();
  const rows = [];
  for (const { studentId, studentName, slots } of students) {
    for (const s of slots) {
      rows.push([batchId, studentId, studentName, s.period, s.dayIndex, s.subject, s.teacher, s.room || '']);
    }
  }
  if (rows.length === 0) return;
  await sheets.spreadsheets.values.append({
    spreadsheetId: id,
    range: `${sheetName}!A:H`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: rows },
  });
}

async function getLatestStudentBatchId(sheets, grade) {
  const id = SPREADSHEET_ID();
  if (!id) return null;
  await ensureSheetsExist(sheets);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: id,
    range: `${STUDENT_BATCHES_SHEET}!A:B`,
  });
  const rows = res.data.values || [];
  const data = rows.slice(1).filter((r) => r[1] === String(grade));
  if (data.length === 0) return null;
  return (data[data.length - 1][0] || '').trim();
}

async function getStudentScheduleGrade1(sheets, batchId, classCode) {
  const id = SPREADSHEET_ID();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: id,
    range: `${SCHEDULES_GRADE1_SHEET}!A:G`,
  });
  const rows = res.data.values || [];
  const data = rows.slice(1).filter((r) => String(r[0] || '') === String(batchId) && parseInt(r[1], 10) === parseInt(classCode, 10));
  const dayNames = ['월', '화', '수', '목', '금'];
  const hasHomeroomCol = data[0] && data[0].length >= 7;
  const homeroomTeacher = hasHomeroomCol && data[0][2] != null ? String(data[0][2]).trim() : '';
  const slots = data.map((r) => {
    const periodCol = hasHomeroomCol ? 3 : 2;
    const dayCol = hasHomeroomCol ? 4 : 3;
    const subjectCol = hasHomeroomCol ? 5 : 4;
    const teacherCol = hasHomeroomCol ? 6 : 5;
    const rawPeriod = r[periodCol];
    const rawDay = r[dayCol];
    let period = parseInt(rawPeriod, 10);
    let dayIndex = parseInt(rawDay, 10);
    if (Number.isNaN(period) || period < 1) period = 1;
    if (period > 7) period = 7;
    if (Number.isNaN(dayIndex) || dayIndex < 0) dayIndex = 0;
    if (dayIndex > 4) dayIndex = 4;
    return {
      period,
      dayIndex,
      day: dayNames[dayIndex] || '',
      subject: (r[subjectCol] != null ? String(r[subjectCol]) : '') || '',
      teacher: (r[teacherCol] != null ? String(r[teacherCol]) : '') || '',
      room: '',
    };
  });
  return { slots, homeroomTeacher };
}

function getGradeSheet(grade) {
  if (grade === 2) return SCHEDULES_GRADE2_SHEET;
  if (grade === 3) return SCHEDULES_GRADE3_SHEET;
  return null;
}

async function getStudentScheduleGrade23(sheets, batchId, studentId, grade) {
  const sheetName = getGradeSheet(grade);
  if (!sheetName) return { slots: [], studentName: '' };
  const id = SPREADSHEET_ID();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: id,
    range: `${sheetName}!A:H`,
  });
  const rows = res.data.values || [];
  const sid = String(studentId);
  const matching = rows.slice(1).filter((r) => String(r[0] || '') === String(batchId) && String(r[1]) === sid);
  const studentName = (matching[0] && matching[0][2] != null) ? String(matching[0][2]) : '';
  const dayNames = ['월', '화', '수', '목', '금'];
  const slots = matching.map((r) => {
    let period = parseInt(r[3], 10);
    let dayIndex = parseInt(r[4], 10);
    if (Number.isNaN(period) || period < 1) period = 1;
    if (period > 7) period = 7;
    if (Number.isNaN(dayIndex) || dayIndex < 0) dayIndex = 0;
    if (dayIndex > 4) dayIndex = 4;
    return {
      period,
      dayIndex,
      day: dayNames[dayIndex] || '',
      subject: (r[5] != null ? String(r[5]) : '') || '',
      teacher: (r[6] != null ? String(r[6]) : '') || '',
      room: (r[7] != null ? String(r[7]) : '') || '',
    };
  });
  return { slots, studentName };
}

async function getStudentClassesByGrade(sheets, batchId, grade) {
  const id = SPREADSHEET_ID();
  if (grade === 1) {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: id,
      range: `${SCHEDULES_GRADE1_SHEET}!A:B`,
    });
    const rows = res.data.values || [];
    const set = new Set();
    rows.slice(1).forEach((r) => {
      if (r[0] === batchId && r[1]) set.add(parseInt(r[1], 10));
    });
    return Array.from(set).sort((a, b) => a - b).map((classCode) => ({
      classCode,
      displayName: `${Math.floor(classCode / 100)}학년 ${classCode % 100}반`,
    }));
  }
  const sheetName = getGradeSheet(grade);
  if (!sheetName) return [];
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: id,
    range: `${sheetName}!A:C`,
  });
  const rows = res.data.values || [];
  const set = new Set();
  rows.slice(1).forEach((r) => {
    if (r[0] === batchId && r[1]) {
      const code = Math.floor(parseInt(r[1], 10) / 100);
      if (Math.floor(code / 100) === grade) set.add(code);
    }
  });
  return Array.from(set).sort((a, b) => a - b).map((classCode) => ({
    classCode,
    displayName: `${Math.floor(classCode / 100)}학년 ${classCode % 100}반`,
  }));
}

async function getStudentsInClass(sheets, batchId, grade, classCode) {
  if (grade === 1) return []; // 1학년은 학급 단위, 학생 목록 없음
  const sheetName = getGradeSheet(grade);
  if (!sheetName) return [];
  const id = SPREADSHEET_ID();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: id,
    range: `${sheetName}!A:C`,
    valueRenderOption: 'UNFORMATTED_VALUE',
  });
  const rows = res.data.values || [];
  const prefix = String(grade * 100 + (classCode % 100));
  const students = [];
  const seen = new Set();
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i] || [];
    const rowBatchId = (r[0] != null ? String(r[0]) : '').trim();
    const sid = (r[1] != null ? String(r[1]) : '').trim();
    if (rowBatchId !== batchId || !sid) continue;
    if (!sid.startsWith(prefix) || seen.has(sid)) continue;
    seen.add(sid);
    const studentName = (r[2] != null ? String(r[2]) : '').trim();
    students.push({ studentId: sid, studentName });
  }
  students.sort((a, b) => a.studentId.localeCompare(b.studentId));
  return students;
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
  ensureStudentHeaders,
  appendStudentBatch,
  appendStudentSchedulesGrade1,
  appendStudentSchedulesGrade23,
  getLatestStudentBatchId,
  getStudentScheduleGrade1,
  getStudentScheduleGrade23,
  getStudentClassesByGrade,
  getStudentsInClass,
  SCHEDULES_GRADE1_SHEET,
  SCHEDULES_GRADE2_SHEET,
  SCHEDULES_GRADE3_SHEET,
  getGradeSheet,
};
