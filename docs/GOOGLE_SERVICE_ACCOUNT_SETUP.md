# GOOGLE_SERVICE_ACCOUNT_JSON 받는 방법

Google 스프레드시트 API를 쓰려면 **서비스 계정**을 만들고 **JSON 키 파일**을 다운로드해야 합니다.

---

## 1. Google Cloud 프로젝트 만들기

1. [Google Cloud Console](https://console.cloud.google.com/) 접속 후 로그인
2. 상단 프로젝트 선택 → **새 프로젝트** 클릭
3. 프로젝트 이름 입력(예: `schedule-teacher`) → **만들기**

---

## 2. Google Sheets API 사용 설정

1. 왼쪽 메뉴 **API 및 서비스** → **라이브러리**
2. "**Google Sheets API**" 검색 → 클릭
3. **사용** 버튼 클릭

---

## 3. 서비스 계정 만들기

1. 왼쪽 메뉴 **API 및 서비스** → **사용자 인증 정보**
2. 상단 **+ 사용자 인증 정보 만들기** → **서비스 계정** 선택
3. 서비스 계정 이름 입력(예: `schedule-app`) → **만들기 및 계속**
4. (선택) 역할은 비워두거나 "편집자" 등 원하는 것 선택 → **계속** → **완료**

---

## 4. JSON 키 다운로드

1. **사용자 인증 정보** 페이지에서 방금 만든 **서비스 계정** 이름 클릭
2. 상단 **키** 탭 클릭
3. **키 추가** → **새 키 만들기**
4. **JSON** 선택 → **만들기**
5. JSON 파일이 PC에 다운로드됨 (예: `프로젝트이름-xxxxx.json`)

이 파일이 **서비스 계정 JSON**입니다. **외부에 공유하거나 GitHub에 올리지 마세요.**

---

## 5. Netlify/로컬에 넣는 방법

### JSON 내용을 한 줄로 넣기

- 다운로드한 JSON 파일을 메모장 등으로 열면 여러 줄로 되어 있습니다.
- **한 줄로 붙여 넣어서** `GOOGLE_SERVICE_ACCOUNT_JSON` 값으로 사용해야 합니다.
  - 줄바꿈·들여쓰기를 모두 제거하고 한 줄로 만든 뒤
  - Netlify **Environment variables**에서 값에 그대로 붙여넣기

### Netlify

1. Netlify 대시보드 → 해당 사이트 → **Site configuration** → **Environment variables**
2. **Add a variable** → **Add a single variable**
3. Key: `GOOGLE_SERVICE_ACCOUNT_JSON`
4. Value: JSON 파일 내용을 **한 줄로** 붙여넣기 (따옴표는 이스케이프하지 않아도 됨)

### 로컬 (.env)

- `.env` 파일에 넣을 때는 값 전체를 **큰따옴표(")로 감싸기**
- JSON 안에 큰따옴표가 많으므로, 보통은 **한 줄 JSON**을 그대로 넣고 파일 전체를 UTF-8로 저장

예시 (.env):

```
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"my-project",...}
SPREADSHEET_ID=1abc...xyz
```

---

## 6. 스프레드시트 공유 (필수)

JSON 안에 있는 `client_email`(예: `xxx@프로젝트.iam.gserviceaccount.com`)을 복사한 뒤,

1. 사용할 **Google 스프레드시트**를 연다
2. **공유** 버튼 클릭
3. **사용자 추가**에 위 이메일을 붙여넣기
4. 권한 **편집자**로 설정 → **전송**

이렇게 해야 서비스 계정이 해당 스프레드시트에 접근할 수 있습니다.

---

## 요약

| 단계 | 할 일 |
|------|--------|
| 1 | Google Cloud에서 프로젝트 생성 |
| 2 | Google Sheets API 사용 설정 |
| 3 | 사용자 인증 정보 → 서비스 계정 만들기 |
| 4 | 서비스 계정 → 키 → JSON 키 다운로드 |
| 5 | JSON 내용을 한 줄로 만들어 `GOOGLE_SERVICE_ACCOUNT_JSON`에 넣기 |
| 6 | 스프레드시트를 `client_email`과 **편집자**로 공유 |

이렇게 하면 `GOOGLE_SERVICE_ACCOUNT_JSON`을 다운받아 사용할 수 있습니다.
