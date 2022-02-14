const fs = require('fs');
const { convertLocationData } = require('../models/util');
let number = 0;
let cafeData = [];
const processCafeInfoRun = () => {
  const absoluteBasePath =
    'C:\\Users\\User\\Documents\\3기_풀스택 교육_AdapterZ_\\3_backend_ron_cafe_curation\\public\\cafe_info_in_seoul';
  while (number < 3) {
    // JSON 파일 읽어오기
    let rawData = fs.readFileSync(
      `${absoluteBasePath}/cafe_data_${number}.json`,
    );
    // JSON => 객체로 데이터 파싱
    let parsedData = JSON.parse(rawData);
    parsedData.forEach(cafeData => {
      const { xCoordinate, yCoordinate } = cafeData;
      if (xCoordinate && yCoordinate) {
        // X,Y 좌표를 위도, 경도로 변환
        const { latitude, longitude } = convertLocationData({
          x: +xCoordinate,
          y: +yCoordinate,
        });
        cafeData.latitude = latitude;
        cafeData.longitude = longitude;
        return; // 다음 요소로 넘어감.
      }
      cafeData.latitude = null;
      cafeData.longitude = null;
    });
    cafeData.push(...parsedData);
    number++;
  }
};
processCafeInfoRun();
module.exports = cafeData;
