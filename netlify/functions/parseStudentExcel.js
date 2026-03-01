/**
 * 학생 시간표 엑셀 파싱 (교사 시간표와 별도 로직)
 * - 1학년: 학급 단위 동일 시간표, 학번 검색 시 학급코드(학년*100+학급)로 매칭
 * - 2·3학년: 학생별 시간표, 5자리 학번(학년*10000+학급*100+번호)로 매칭
 */

const XLSX = require('xlsx');

const DAYS = ['월', '화', '수', '목', '금'];
const DAY_COLS = { '월': 1, '화': 2, '수': 3, '목': 4, '금': 5 }; // B=1, C=2, ...
const PERIODS = 7;

// col: 1=A, 2=B, 3=C, ...
function cellRef(row, col) {
  const c = String.fromCharCode(64 + col);
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
 * "학년-학급" 또는 "N반" 문자열에서 학년·학급 추출 → classCode = 학년*100+학급
 * uploadGrade: 업로드된 학년(2·3학년 파싱 시 B3에 학년이 없을 수 있음)
 */
function parseClassCodeFromGradeClass(str, uploadGrade) {
  if (!str || !str.trim()) return null;
  const s = str.trim();
  // "2-1", "2학년1반", "2학년 1반", "1반" 등
  const m = s.match(/(\d+)\s*[-학년]\s*(\d+)/) || s.match(/(\d+)\s*-\s*(\d+)/);
  if (m) {
    const grade = parseInt(m[1], 10);
    const classNum = parseInt(m[2], 10);
    if (grade >= 1 && grade <= 3 && classNum >= 1) return grade * 100 + classNum;
  }
  // "1반", "2반" 만 있는 경우 (업로드 학년 사용)
  const single = s.match(/(\d+)\s*반?/) || s.match(/(\d+)/);
  if (single && uploadGrade != null) {
    const classNum = parseInt(single[1], 10);
    if (classNum >= 1) return uploadGrade * 100 + classNum;
  }
  return null;
}

// ========== 1학년 (25행 블록, 학급별 동일 시간표) ==========
const BLOCK_ROWS_GRADE1 = 25;

function parseGrade1Block(sheet, startRow) {
  // 행2 D2:F2 학년-학급 담임교사명 (D=col4)
  const d2 = getCell(sheet, startRow + 1, 4);
  const classCode = parseClassCodeFromGradeClass(d2, 1);
  if (classCode == null) return null;

  const slots = [];
  for (let p = 1; p <= PERIODS; p++) {
    const subjectRow = startRow + 3 + (p - 1) * 3; // 과목 행
    const teacherRow = subjectRow + 1;
    for (let d = 0; d < DAYS.length; d++) {
      const col = 1 + d; // B=1 ~ F=5
      const subject = getCell(sheet, subjectRow, col);
      const teacher = getCell(sheet, teacherRow, col);
      if (subject || teacher) {
        slots.push({
          classCode,
          period: p,
          dayIndex: d,
          day: DAYS[d],
          subject: subject || '-',
          teacher: teacher || '-',
          room: '',
        });
      }
    }
  }
  return { classCode, slots };
}

function parseGrade1Sheet(sheet) {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  const maxRow = range.e.r + 1;
  const byClass = new Map();
  for (let startRow = 1; startRow <= maxRow; startRow += BLOCK_ROWS_GRADE1) {
    const block = parseGrade1Block(sheet, startRow);
    if (block && block.slots.length > 0) {
      byClass.set(block.classCode, block.slots);
    }
  }
  return { grade: 1, classes: Array.from(byClass.entries()).map(([classCode, slots]) => ({ classCode, slots })) };
}

// ========== 2·3학년 (17행 블록: 1-14 데이터, 15-17 공란, 18행부터 다음 블록) ==========
const BLOCK_ROWS_GRADE23 = 17;

function parseGrade23Block(sheet, startRow, grade) {
  // B3 학년-학급, B4 번호, B5 이름 (B열 = col 2)
  const gradeClassStr = getCell(sheet, startRow + 2, 2); // B3
  const numStr = getCell(sheet, startRow + 3, 2);        // B4
  const studentName = getCell(sheet, startRow + 4, 2);   // B5
  const gc = parseClassCodeFromGradeClass(gradeClassStr, grade);
  if (!gc || !numStr) return null;
  const classNum = gc % 100;
  const num = parseInt(numStr, 10);
  if (isNaN(num)) return null;
  const studentId = grade * 10000 + classNum * 100 + num;

  const slots = [];
  // B7:F13 (B=col2 ~ F=col6)
  for (let p = 1; p <= PERIODS; p++) {
    const row = startRow + 6 + (p - 1); // 7행=1교시, 8행=2교시, ...
    for (let d = 0; d < DAYS.length; d++) {
      const col = 2 + d; // B=2, C=3, D=4, E=5, F=6
      const cellText = getCell(sheet, row, col);
      if (!cellText) continue;
      const lines = cellText.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
      const subject = lines[0] || '-';
      const teacher = lines[1] || '-';
      const room = lines[2] || '';
      slots.push({
        studentId,
        studentName: studentName || '',
        period: p,
        dayIndex: d,
        day: DAYS[d],
        subject,
        teacher,
        room,
      });
    }
  }
  return { studentId, studentName, slots };
}

function parseGrade23Sheet(sheet, grade) {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  const maxRow = range.e.r + 1;
  const students = [];
  for (let startRow = 1; startRow <= maxRow; startRow += BLOCK_ROWS_GRADE23) {
    const block = parseGrade23Block(sheet, startRow, grade);
    if (block && block.slots.length > 0) {
      students.push(block);
    }
  }
  return { grade, students };
}

// ========== 통합 엔트리 ==========
function parseStudentExcelBuffer(buffer, grade) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet) throw new Error('엑셀 시트를 읽을 수 없습니다.');
  if (grade === 1) return parseGrade1Sheet(sheet);
  if (grade === 2 || grade === 3) return parseGrade23Sheet(sheet, grade);
  throw new Error('학년은 1, 2, 3 중 하나여야 합니다.');
}

module.exports = {
  parseStudentExcelBuffer,
  parseGrade1Sheet,
  parseGrade23Sheet,
  parseClassCodeFromGradeClass,
  DAYS,
  PERIODS,
};
