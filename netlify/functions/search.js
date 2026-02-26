const {
  getSheetsClient,
  getSchedulesByBatchAndTeacher,
} = require('./sheets');

function buildScheduleTable(slots) {
  const days = ['월', '화', '수', '목', '금'];
  const periods = 7;
  const grid = Array(periods)
    .fill(null)
    .map(() => Array(5).fill(null).map(() => ({ subject: '', room: '' })));
  for (const s of slots) {
    if (s.period >= 1 && s.period <= 7 && s.dayIndex >= 0 && s.dayIndex < 5) {
      grid[s.period - 1][s.dayIndex] = { subject: s.subject, room: s.room };
    }
  }
  return grid;
}

function buildSubjectStats(slots) {
  const map = {};
  for (const s of slots) {
    const sub = s.subject && s.subject !== '-' ? s.subject : '(비어있음)';
    map[sub] = (map[sub] || 0) + 1;
  }
  return Object.entries(map)
    .map(([subject, count]) => ({ subject, count }))
    .sort((a, b) => b.count - a.count);
}

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const params = event.queryStringParameters || {};
  const batchId = params.batchId || params.batch;
  const teacherName = (params.name || params.teacherName || params.q || '').trim();

  const cors = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
  if (!batchId) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'batchId가 필요합니다.' }) };
  }
  if (!teacherName) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: '검색할 교사 이름을 입력해 주세요.' }) };
  }

  try {
    const { sheets } = await getSheetsClient();
    const { slots, department, subjectArea } = await getSchedulesByBatchAndTeacher(sheets, batchId, teacherName);
    const scheduleTable = buildScheduleTable(slots);
    const subjectStats = buildSubjectStats(slots);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        teacherName,
        batchId,
        schedule: scheduleTable,
        subjectStats,
        rawSlots: slots,
        department: department || '',
        subjectArea: subjectArea || '',
      }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: '조회 실패: ' + (e.message || String(e)) }),
    };
  }
};
