FROM node:16

#app 폴더 만들기 - NodeJS 어플리케이션 폴더
RUN mkdir -p /app
# 경로 설정하기
WORKDIR /app
# 로컬 컴퓨터에 있는 package.json 파일을 현재 워킹 디렉토리에 복사
COPY package*.json ./

# local machine 에서 npm install 실행
RUN npm install

COPY . .

# 컨테이너가 리스닝할 포트 설정
EXPOSE 8080

# npm start 스크립트 실행
CMD ["cross-env", "NODE_ENV=production", "pm2", "start", "src/bin/www.js"]
