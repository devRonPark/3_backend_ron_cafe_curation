# JJINCAFE IN SEOUL

## 📖 상세내용

### 서울시 내 카페 검색 및 리뷰 서비스

본 프로젝트는 개인 프로젝트로 서울시 내 카페를 검색하고 리뷰를 남길 수 있는 웹 기반 서비스입니다.

서울의 경우 카페 방문자들 중 공부하거나 일을 하는 사람들(이른바 카공족, 저를 포함)의 비율이 높습니다. **JJINCAFE IN SEOUL**은 이들에게 초점을 맞추어 출발한 웹 프로젝트입니다.

👉 [바로가기](https://jjincafe-in-seoul.com)

## 🛠 개발 환경 및 사용 기술

<p align="center"><img width="80%" src="https://user-images.githubusercontent.com/57528803/199348190-66729db1-3feb-48c1-9e11-ae5486f35529.png" /></p>

## 🗂 폴더 구조

---

```bash
├── public
│   └── cafe_info_in_seoul : 공공 API를 호출하여 받아온 서울시 내 카페 JSON 데이터가 저장되어 있음.
│
├── src
│   ├── app.js : 미들웨어 및 라우터 등록
│   ├── bin
│   │    └── www.js : 앱의 시작점
│   ├── config : DB, 로거, Multer 미들웨어 등 각종 설정 파일이 저장되어 있음.
│   ├── modules : 각 모듈 별로 라우터, 컨트롤러, 서비스가 존재함.
│   │    ├── auth : 인증과 관련된 모듈
│   │    │    ├── auth.router.js : 인증 관련 요청 라우팅 처리
│   │    │    ├── auth.controller.js : 인증 관련 API 요청, 응답 처리
│   │    │    └── auth.service.js : 인증 관련 비즈니스 로직 처리
│   │    ├── cafe : 카페 정보와 관련된 모듈
│   │    │    ├── cafe.router.js : 카페 정보 관련 요청 라우팅 관리
│   │    │    ├── cafe.controller.js : 카페 정보 관련 API 요청, 응답 처리
│   │    │    └── cafe.service.js : 카페 정보 관련 API 비즈니스 로직 처리
│   │    └── user : 사용자 정보와 관련된 모듈
│   │         ├── user.router.js : 사용자 정보 관련 요청 라우팅 관리
│   │         ├── user.controller.js : 사용자 정보 관련 API 요청, 응답 처리
│   │         └── user.service.js : 사용자 정보 관련 API 비즈니스 로직 처리
│   ├── common
│        ├── errors : 정의한 커스텀 에러 클래스들이 모여 있음.
│        ├── middlewares : 라우터로 들어오는 데이터를 검증하는 데 사용되는 커스텀 미들웨어들이 모여 있음.
│        ├── statusCodes : 상수화한 상태 코드 데이터들이 모여 있음.
│        ├── constants.js : 세션 쿠키, 자동 로그인 시 생성되는 쿠키 설정 데이터들이 모여 있음.
│        └── util.js : 자주 사용되는 유틸 함수들이 모여 있음.
│
└── uploads : 사용자 프로필 이미지, 카페 썸네일 이미지가 저장됨.
```

## 🎋 ERD Diagram

<img width="80%" src="https://user-images.githubusercontent.com/57528803/199348698-fea20ef0-c5c4-4282-9539-99d6748fac21.png" />

## 구현 기능

<details>
<summary>회원관리 서비스</summary>
<div markdown="1">

### **📍회원가입**

- 이메일, 비밀번호, 비밀번호 확인, 이름 입력

### **📍회원 탈퇴**

- 비밀번호 입력을 통한 본인 확인 후 회원 탈퇴 가능

### **📍회원정보 수정**

- 회원 닉네임, 프로필 이미지, 비밀번호 수정 가능 -> 이메일 수정 불가

### **📍마이페이지**

- 내가 찜하고 리뷰 남긴 카페 목록 확인 가능
- 내가 찜한 카페 찜하기 해제 가능
- 내가 남긴 리뷰 수정 및 삭제 가능

### **📍로그인/로그아웃**

- 기존에 가입했던 이메일과 비밀번호를 통해 로그인

### **📍아**이디 찾기

- 닉네임 입력을 통한 본인 확인 후 이메일 확인

### **📍비밀번호 찾기**

- 닉네임 및 이메일 입력을 통한 본인 확인 후 이메일로 임시 비밀번호 발급받기
</div>
</details>

### **✔ 카페 정보 제공 서비스**

### **📍카페 목록 조회**

- 서울시 내 위치한 15,000개의 카페 확인 가능

### **📍카페 상세 정보 확인**

- 카페 전화번호, 메뉴, 영업시간 등 카페 상세 정보 확인 가능
- (모바일 버전) 카카오맵에서 카페 실제 위치 확인 가능
- 사용자가 남긴 리뷰 확인 가능

### **📍이름과 주소 기반 카페 검색**

- 검색 기준이 카페 이름 혹은 서울시 구, 동 등 주소 기반 카페 검색 가능

## 서버 API 스펙문서

[API SPECIFICATION](https://www.notion.so/API-SPECIFICATION-62d13c656d394b6baab70a9d92936452)

## 프로젝트 구조

<p align="center"><img width="90%" src="https://user-images.githubusercontent.com/57528803/208233441-ee914759-b472-48a9-85ff-563d3e8fe1bb.png" /></p>

## 트러블 슈팅 경험

[mysql 모듈 사용 시 콜백 지옥 발생](https://rift-crabapple-418.notion.site/mysql-bccf2a1263a0425092ebe50b0c2e9d05)

[forEach 함수에서의 비동기 콜백 처리](https://rift-crabapple-418.notion.site/forEach-f81854a151ee447abfea27ce96575f32)

[비동기 라우터 핸들러의 Unhandled Promise Rejection Warning 에러](https://rift-crabapple-418.notion.site/async-Unhandled-Promise-Rejection-Warning-2c4e0ed68b804df4b7b2094abbfef374)

[라우터 선언 우선순위](https://rift-crabapple-418.notion.site/9ade091bbaf84781b20a3758eba050a5)

[connection pool 사용](https://rift-crabapple-418.notion.site/connection-pool-ab405bc87d384a63846b99b96fe1ee8b)

[공공 API 로부터 받아온 위도, 경도 데이터의 기준 좌표계 변환](https://rift-crabapple-418.notion.site/API-f22f993984d345e2bf715edc2befc03d)

[공공 API 호출 제한 문제](https://rift-crabapple-418.notion.site/API-3bb260469f72425bb87727b5376840ca)

## 개선점

1. (관심사 분리 원칙 적용) 라우터 별 서비스 로직 중 DB와 통신하는 로직은 모델로 분리

2. 반복되는 try-catch 문 줄이기

3. 서버의 보안성을 향상하기 위해 Helmet.js 미들웨어 적용

## 적용하고 싶은 부분

1. Docker 기반 배포 환경 구성

2. 컨트롤러, 서비스, 모델 별 단위 테스트 코드 작성

3. github actions, jenkins 기반 CI/CD 구축
