const {
  getSheetsClient,
  getLatestStudentBatchId,
  getStudentScheduleGrade1,
  getStudentScheduleGrade23,
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
  const studentIdRaw = (params.studentId || params.id || params.q || '').trim();
  const studentId = studentIdRaw.replace(/\D/g, '');
  const cors = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

  if (studentId.length < 3) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: '학번을 입력해 주세요.' }) };
  }

  const num = parseInt(studentId, 10);
  if (isNaN(num)) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: '올바른 학번을 입력해 주세요.' }) };
  }

  // 5자리 학번: 1xxxx → 1학년, 2xxxx → 2학년, 3xxxx → 3학년. 3자리면 1학년 학급코드(101 등)
  let grade;
  let classCode;
  if (studentId.length >= 5) {
    grade = Math.floor(num / 10000);
    if (grade < 1 || grade > 3) {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: '학번 형식을 확인해 주세요. (예: 10101, 30105)' }) };
    }
    classCode = grade === 1 ? Math.floor(num / 100) : null;
  } else {
    grade = 1;
    classCode = num;
  }

  try {
    const { sheets } = await getSheetsClient();
    const batchId = await getLatestStudentBatchId(sheets, grade);
    if (!batchId) {
      return {
        statusCode: 404,
        headers: cors,
        body: JSON.stringify({ error: `${grade}학년 시간표가 아직 등록되지 않았습니다.` }),
      };
    }

    let slots;
    let studentName = '';

    let grade1Result;
    if (grade === 1) {
      grade1Result = await getStudentScheduleGrade1(sheets, batchId, classCode);
      if (!grade1Result || !grade1Result.slots || grade1Result.slots.length === 0) {
        return {
          statusCode: 404,
          headers: cors,
          body: JSON.stringify({ error: '해당 학급 시간표를 찾을 수 없습니다.' }),
        };
      }
      slots = grade1Result.slots;
      studentName = '';
    } else {
      const result = await getStudentScheduleGrade23(sheets, batchId, num, grade);
      slots = result.slots;
      studentName = result.studentName || '';
      if (!slots || slots.length === 0) {
        return {
          statusCode: 404,
          headers: cors,
          body: JSON.stringify({ error: '해당 학번의 시간표를 찾을 수 없습니다.' }),
        };
      }
    }

    const schedule = buildScheduleGrid(slots);
    const homeroomTeacher = (grade === 1 && grade1Result) ? (grade1Result.homeroomTeacher || '') : '';
    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({
        studentId: String(num),
        studentName,
        grade,
        classCode: grade === 1 ? classCode : Math.floor(num / 100),
        schedule,
        batchId,
        homeroomTeacher: homeroomTeacher || '',
      }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: '조회 실패: ' + (e.message || String(e)) }),
    };
  }
};
