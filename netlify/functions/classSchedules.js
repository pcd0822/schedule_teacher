const {
  getSheetsClient,
  getLatestStudentBatchId,
  getStudentScheduleGrade1,
  getStudentScheduleGrade23,
  getStudentsInClass,
} = require('./sheets');

const DAYS = ['월', '화', '수', '목', '금'];

function buildScheduleGrid(slots) {
  const grid = Array(7)
    .fill(null)
    .map(() => Array(5).fill(null).map(() => ({ subject: '', teacher: '', room: '' })));
  for (const s of slots) {
    if (s.period >= 1 && s.period <= 7 && s.dayIndex >= 0 && s.dayIndex < 5) {
      grid[s.period - 1][s.dayIndex] = {
        subject: s.subject || '',
        teacher: s.teacher || '',
        room: s.room || '',
      };
    }
  }
  return grid;
}

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const params = event.queryStringParameters || {};
  const grade = parseInt(params.grade, 10);
  const classCode = parseInt(params.classCode, 10);
  const cors = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

  if (grade !== 1 && grade !== 2 && grade !== 3) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: '학년(grade)을 1, 2, 3 중 하나로 보내주세요.' }) };
  }
  if (!classCode || isNaN(classCode)) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: '학급(classCode)을 보내주세요.' }) };
  }

  try {
    const { sheets } = await getSheetsClient();
    const batchId = await getLatestStudentBatchId(sheets, grade);
    if (!batchId) {
      return {
        statusCode: 404,
        headers: cors,
        body: JSON.stringify({ error: `${grade}학년 시간표가 등록되지 않았습니다.` }),
      };
    }

    if (grade === 1) {
      const slots = await getStudentScheduleGrade1(sheets, batchId, classCode);
      if (!slots || slots.length === 0) {
        return { statusCode: 404, headers: cors, body: JSON.stringify({ error: '해당 학급 시간표를 찾을 수 없습니다.' }) };
      }
      const schedule = buildScheduleGrid(slots);
      return {
        statusCode: 200,
        headers: cors,
        body: JSON.stringify({
          batchId,
          grade,
          classCode,
          students: [{ studentId: String(classCode * 100), studentName: `${Math.floor(classCode / 100)}학년 ${classCode % 100}반`, schedule }],
        }),
      };
    }

    const students = await getStudentsInClass(sheets, batchId, grade, classCode);
    if (!students || students.length === 0) {
      return { statusCode: 200, headers: cors, body: JSON.stringify({ batchId, grade, classCode, students: [] }) };
    }

    const result = [];
    for (const { studentId, studentName } of students) {
      const { slots } = await getStudentScheduleGrade23(sheets, batchId, studentId, grade);
      result.push({
        studentId,
        studentName,
        schedule: buildScheduleGrid(slots),
      });
    }

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ batchId, grade, classCode, students: result }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: '조회 실패: ' + (e.message || String(e)) }),
    };
  }
};
