const { getSheetsClient, getTeacherNamesByBatch } = require('./sheets');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const params = event.queryStringParameters || {};
  const batchId = params.batchId || params.batch;
  const cors = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
  if (!batchId) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'batchId가 필요합니다.' }) };
  }

  try {
    const { sheets } = await getSheetsClient();
    const teacherNames = await getTeacherNamesByBatch(sheets, batchId);
    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ batchId, teacherNames }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: '조회 실패: ' + (e.message || String(e)) }),
    };
  }
};
