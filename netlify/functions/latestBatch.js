const { getSheetsClient, getLatestBatchId } = require('./sheets');

const cors = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { sheets } = await getSheetsClient();
    const batchId = await getLatestBatchId(sheets);
    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ batchId }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: e.message || '조회 실패' }),
    };
  }
};
