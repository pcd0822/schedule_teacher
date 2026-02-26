const { parseExcelBuffer } = require('./parseExcel');
const {
  getSheetsClient,
  ensureHeaders,
  appendBatch,
  appendSchedules,
} = require('./sheets');

function generateBatchId() {
  return 'b_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let buffer;
  try {
    const bodyRaw = event.body && (event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body);
    const body = typeof bodyRaw === 'string' ? JSON.parse(bodyRaw) : bodyRaw;
    const b64 = body.file || body.base64 || body.data;
    if (!b64) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: '엑셀 파일(file)을 보내주세요.' }),
      };
    }
    buffer = Buffer.from(b64, 'base64');
  } catch (e) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: '요청 형식 오류: ' + (e.message || 'JSON with file base64 required') }),
    };
  }

  if (!buffer || buffer.length === 0) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: '엑셀 파일을 선택해 주세요.' }),
    };
  }

  let teachers;
  try {
    const parsed = parseExcelBuffer(buffer);
    teachers = parsed.teachers;
  } catch (e) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: '엑셀 형식 오류: ' + e.message }),
    };
  }

  if (!teachers || teachers.length === 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: '교사 시간표 데이터가 없습니다.' }),
    };
  }

  try {
    const { sheets } = await getSheetsClient();
    await ensureHeaders(sheets);
    const batchId = generateBatchId();
    await appendBatch(sheets, batchId);
    await appendSchedules(sheets, batchId, teachers);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        batchId,
        teacherCount: teachers.length,
        teacherNames: teachers.map((t) => t.teacherName),
      }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: '저장 실패: ' + (e.message || String(e)) }),
    };
  }
};
