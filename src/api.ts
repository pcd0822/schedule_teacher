const BASE = import.meta.env.DEV ? '' : '';

/** 최신 배치 ID 조회 (이름만 검색할 때 사용) */
export async function getLatestBatchId(): Promise<string | null> {
  const res = await fetch(`${BASE}/.netlify/functions/latestBatch`);
  const data = await res.json();
  if (!res.ok) return null;
  return data.batchId || null;
}

export async function searchSchedule(batchId: string, teacherName: string) {
  const q = new URLSearchParams({ batchId, name: teacherName });
  const res = await fetch(`${BASE}/.netlify/functions/search?${q}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '조회 실패');
  return data;
}

export async function listTeachers(batchId: string) {
  const q = new URLSearchParams({ batchId });
  const res = await fetch(`${BASE}/.netlify/functions/teachers?${q}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '목록 조회 실패');
  return data;
}

export async function uploadExcel(file: File): Promise<{ batchId: string; teacherCount: number; teacherNames: string[] }> {
  const buf = await file.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
  const res = await fetch(`${BASE}/.netlify/functions/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file: base64 }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '업로드 실패');
  return data;
}
