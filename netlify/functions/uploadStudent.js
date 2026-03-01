const { parseStudentExcelBuffer } = require('./parseStudentExcel');
const {
  getSheetsClient,
  ensureSheetsExist,
  ensureStudentHeaders,
  appendStudentBatch,
  appendStudentSchedulesGrade1,
  appendStudentSchedulesGrade23,
  getGradeSheet,
} = require('./sheets');

function generateBatchId() {
  return 's_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let buffer;
  let grade;
  try {
    const bodyRaw = event.body && (event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body);
    const body = typeof bodyRaw === 'string' ? JSON.parse(bodyRaw) : bodyRaw;
    const b64 = body.file || body.base64 || body.data;
    grade = body.grade != null ? parseInt(body.grade, 10) : NaN;
    if (!b64) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: '엑셀 파일(file)과 학년(grade: 1, 2, 3)을 보내주세요.' }),
      };
    }
    if (grade !== 1 && grade !== 2 && grade !== 3) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: '학년(grade)은 1, 2, 3 중 하나여야 합니다.' }),
      };
    }
    buffer = Buffer.from(b64, 'base64');
  } catch (e) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: '요청 형식 오류: ' + (e.message || 'JSON with file, grade required') }),
    };
  }

  if (!buffer || buffer.length === 0) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: '엑셀 파일을 선택해 주세요.' }),
    };
  }

  let parsed;
  try {
    parsed = parseStudentExcelBuffer(buffer, grade);
  } catch (e) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: '엑셀 형식 오류: ' + e.message }),
    };
  }

  try {
    const { sheets } = await getSheetsClient();
    await ensureSheetsExist(sheets);
    await ensureStudentHeaders(sheets);
    const batchId = generateBatchId();
    await appendStudentBatch(sheets, batchId, grade);

    if (grade === 1) {
      if (!parsed.classes || parsed.classes.length === 0) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ error: '1학년 시간표 데이터가 없습니다.' }),
        };
        }
      await appendStudentSchedulesGrade1(sheets, batchId, parsed.classes);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          batchId,
          grade: 1,
          classCount: parsed.classes.length,
        }),
      };
    }

    if (grade === 2 || grade === 3) {
      if (!parsed.students || parsed.students.length === 0) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ error: `${grade}학년 시간표 데이터가 없습니다.` }),
        };
      }
      const sheetName = getGradeSheet(grade);
      await appendStudentSchedulesGrade23(sheets, batchId, parsed.students, sheetName);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          batchId,
          grade,
          studentCount: parsed.students.length,
        }),
      };
    }

    return { statusCode: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Invalid grade' }) };
  } catch (e) {
    const msg = e.message || String(e);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: '저장 실패: ' + msg }),
    };
  }
};
