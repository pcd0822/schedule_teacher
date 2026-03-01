const {
  getSheetsClient,
  getLatestStudentBatchId,
  getStudentClassesByGrade,
} = require('./sheets');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const params = event.queryStringParameters || {};
  const grade = parseInt(params.grade, 10);
  const cors = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

  if (grade !== 1 && grade !== 2 && grade !== 3) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: '학년(grade)을 1, 2, 3 중 하나로 보내주세요.' }) };
  }

  try {
    const { sheets } = await getSheetsClient();
    const batchId = await getLatestStudentBatchId(sheets, grade);
    if (!batchId) {
      return { statusCode: 200, headers: cors, body: JSON.stringify({ batchId: null, classes: [] }) };
    }
    const classes = await getStudentClassesByGrade(sheets, batchId, grade);
    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ batchId, grade, classes }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: '조회 실패: ' + (e.message || String(e)) }),
    };
  }
};
