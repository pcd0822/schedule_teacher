/**
 * 교사 시간표 엑셀 파싱 규칙:
 * - 블록당 25행 (1~24 시간표, 25 빈행)
 * - 행1: A1:F1 제목, 행2: A2 학년도, D2 교사이름, E2 부서, F2 교과
 * - 행3: A3빈칸, B3~F3 월~금
 * - 1교시 A4:A6 → 과목 행4, 장소 행5(두번째), 장소 행6(세번째)
 * - 교시별 두 번째·세 번째 행 모두 교실명이 있으면 "두번째행/세번째행" 형식으로 저장
 */

const XLSX = require('xlsx');

const DAYS = ['월', '화', '수', '목', '금'];
const BLOCK_ROWS = 25; // 24행 블록 + 1 빈행
const FIRST_DATA_ROW = 4; // 1교시 과목 행
const ROWS_PER_PERIOD = 3;
const PERIODS = 7;
const COL_DAY_START = 1; // B열 = 월

function cellRef(row, col) {
  const c = String.fromCharCode(65 + col);
  return c + row;
}

function getCell(sheet, row, col) {
  const ref = cellRef(row, col);
  const cell = sheet[ref];
  if (!cell) return '';
  const v = cell.v;
  if (v == null) return '';
  return String(v).trim();
}

/**
 * 한 블록(한 교사) 파싱. startRow 1-based.
 * 행2: A2 학년도, D2 교사이름, E2 부서, F2 교과
 */
function parseBlock(sheet, startRow) {
  const teacherName = getCell(sheet, startRow + 1, 3); // D2
  const year = getCell(sheet, startRow + 1, 0);       // A2
  const department = getCell(sheet, startRow + 1, 4);  // E2 부서
  const subjectArea = getCell(sheet, startRow + 1, 5); // F2 교과
  if (!teacherName) return null;

  const slots = [];
  for (let p = 1; p <= PERIODS; p++) {
    // 1교시: 과목 4행, 장소 5행(두번째), 장소 6행(세번째) / 2교시: 7,8,9행 ...
    const subjectRow = startRow + 3 + (p - 1) * ROWS_PER_PERIOD;
    const roomRow1 = subjectRow + 1; // 교시별 두 번째 행
    const roomRow2 = subjectRow + 2; // 교시별 세 번째 행
    for (let d = 0; d < DAYS.length; d++) {
      const col = COL_DAY_START + d;
      const subject = getCell(sheet, subjectRow, col);
      const room1 = getCell(sheet, roomRow1, col);
      const room2 = getCell(sheet, roomRow2, col);
      const room = [room1, room2].filter(Boolean).join('/') || '-';
      if (subject || room1 || room2) {
        slots.push({
          teacherName,
          year: year || new Date().getFullYear().toString(),
          dayIndex: d,
          day: DAYS[d],
          period: p,
          subject: subject || '-',
          room: room || '-',
        });
      }
    }
  }
  return { teacherName, year, department: department || '', subjectArea: subjectArea || '', slots };
}

/**
 * 시트 전체에서 모든 교사 블록 파싱
 */
function parseSheet(sheet) {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  const maxRow = range.e.r + 1;
  const results = [];
  for (let startRow = 1; startRow <= maxRow; startRow += BLOCK_ROWS) {
    const block = parseBlock(sheet, startRow);
    if (block && block.slots.length > 0) {
      results.push(block);
    }
  }
  return results;
}

/**
 * 엑셀 버퍼를 파싱해 { teachers: [ { teacherName, year, slots } ] } 반환
 */
function parseExcelBuffer(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet) throw new Error('엑셀 시트를 읽을 수 없습니다.');
  const teachers = parseSheet(sheet);
  return { teachers };
}

module.exports = { parseExcelBuffer, parseSheet, parseBlock, DAYS };
