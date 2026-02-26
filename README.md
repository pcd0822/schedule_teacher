# 교사 시간표 조회 웹앱

엑셀 파일로 업로드한 교사 개인 시간표를 구글 스프레드시트에 저장하고, 이름 검색으로 본인 시간표와 과목별 시수를 조회하는 웹앱입니다.

## 기능

- **메인 화면**: 배치 ID(조회 링크)와 교사 이름으로 검색
- **결과 화면**: 요일·교시별 시간표, 과목별 시수 통계
- **관리자 페이지**: 엑셀 업로드 → 구글 시트 저장 → 조회 링크 생성·복사

## 엑셀 시간표 규칙

- **A1:F1**: 제목(셀 병합)
- **A2:C2**: 학년도(셀 병합), **D2:F2**: 교사 이름(셀 병합)
- **A3**: 빈칸, **B3:F3**: 월, 화, 수, 목, 금
- **A4:A6**: 1교시, **A7:A9**: 2교시, … **A22:A24**: 7교시
- 각 교시별 **첫 행**: 과목명, **두 번째 행**: 수업 장소(예: 1-8)
- 7교시 다음 한 행 비우고, 그 다음 행부터 위 규칙 반복(다음 교사)

## 로컬 실행

```bash
npm install
npm run dev          # 프론트만 (Vite)
npm run netlify:dev  # 프론트 + Netlify Functions (엑셀 업로드/검색 API)
```

`netlify dev` 사용 시 함수는 `http://localhost:8888`에서 실행되며, Vite 프록시로 `/.netlify/functions/*`가 연결됩니다.

## 빌드 & Netlify 배포

```bash
npm run build
```

Netlify에서 저장소 연결 후 자동 빌드됩니다. **환경 변수**를 반드시 설정하세요.

### 필수 환경 변수 (Netlify)

| 변수명 | 설명 |
|--------|------|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Google 서비스 계정 JSON 전체 내용(문자열) |
| `SPREADSHEET_ID` | 구글 스프레드시트 ID (URL의 `/d/` 다음 부분) |

### Google 스프레드시트 준비

1. [Google Cloud Console](https://console.cloud.google.com/)에서 프로젝트 생성 후 **Google Sheets API** 사용 설정
2. **서비스 계정** 생성 → JSON 키 다운로드 → 내용 전체를 `GOOGLE_SERVICE_ACCOUNT_JSON`에 넣기
3. 새 **Google 스프레드시트** 생성
4. 시트 2개 준비:
   - **batches**: 첫 행에 `batchId` / `createdAt`
   - **schedules**: 첫 행에 `batchId` / `teacherName` / `year` / `dayIndex` / `period` / `subject` / `room`
5. 스프레드시트를 **서비스 계정 이메일**(JSON 내 `client_email`)과 **편집자**로 공유
6. 스프레드시트 URL에서 ID 복사 → `SPREADSHEET_ID`에 설정

## 디자인

업로드해 주신 캐릭터 이미지의 색감(빨강, 노랑, 검정, 흰색)을 반영해 버튼·헤더·카드 등에 적용했습니다. 마스코트 이미지를 쓰려면 `public/` 폴더에 넣고 헤더 등에서 참조하면 됩니다.

## 라이선스

MIT
