const axios = require('axios');
const fs = require('fs');
const { convertLocationData } = require('../models/util');
const Cafe = require('../models/cafe');
const { successCode, errorCode } = require('../statusCode');
const logger = require('../config/logger');
const { Result } = require('express-validator');

// 오픈 API 호출해서 데이터 가져와 가공 후 응답으로 전달
exports.getDataFromPublicAPI = async function (req, res, next) {
  try {
    const apiKey = process.env.OPEN_API_KEY;
    const absoluteBasePath =
      'C:\\Users\\User\\Documents\\3기_풀스택 교육_AdapterZ_\\3_backend_ron_cafe_curation\\public\\cafe_info_in_seoul';
    const cafeData = [];
    let startIndex = 1,
      endIndex = 999;
    // 오픈 API 115번 호출
    while (endIndex < 114885) {
      try {
        const response = await axios({
          method: 'get',
          url: `/json/LOCALDATA_072405/${startIndex}/${endIndex}`, // 요청에 사용될 서버 URL
          baseURL: `http://openapi.seoul.go.kr:8088/${apiKey}`, // URL 앞에 붙는다.
          responseType: 'json',
        });
        const cafeInfo = getDataFromResponse(response);
        cafeData.push(...cafeInfo);
      } catch (err) {
        console.error(err.stack);
      }
      startIndex += 999;
      endIndex += 999;
    }
    // 오픈 API 116번째 호출
    const lastResponse = await axios({
      method: 'get',
      url: `/json/LOCALDATA_072405/114885/115827`, // 요청에 사용될 서버 URL
      baseURL: `http://openapi.seoul.go.kr:8088/${apiKey}`, // URL 앞에 붙는다.
      responseType: 'json',
    });
    const cafeInfo = getDataFromResponse(lastResponse);
    cafeData.push(...cafeInfo);
    // JSON 형식으로 변환
    const cafeDataJson = JSON.stringify(cafeData);
    // 가공된 cafeData 현재 디렉토리에 JSON 파일로 저장
    fs.writeFileSync(`${absoluteBasePath}/cafe_data.json`, cafeDataJson);
    return res.status(successCode.OK).json({ data: cafeData });
  } catch (error) {
    console.error(error);
    return res
      .status(errorCode.INTERNALSERVERERROR)
      .json({ message: error.message });
  }
};
const getDataFromResponse = response => {
  return response.data['LOCALDATA_072405'].row
    .filter(elem => elem.UPTAENM === '커피숍' && elem.TRDSTATENM !== '폐업')
    .map(elem => {
      return {
        name: elem.BPLCNM,
        tel: elem.SITETEL,
        jibun_address: elem.SITEWHLADDR,
        road_address: elem.RDNWHLADDR,
        xCoordinate: elem.X,
        yCoordinate: elem.Y,
      };
    });
};
// public/cafe_info_in_seoul 디렉토리에 저장된 파일 읽어와 데이터 가공 후 req 객체에 저장
exports.parseCafeDataRun = (req, res, next) => {
  try {
    const cafeData = [];
    const absoluteBasePath =
      'C:\\Users\\User\\Documents\\3기_풀스택 교육_AdapterZ_\\3_backend_ron_cafe_curation\\public\\cafe_info_in_seoul';
    // JSON 파일 읽어오기
    let rawData = fs.readFileSync(`${absoluteBasePath}/cafe_data.json`);
    // JSON => 객체로 데이터 파싱
    let parsedData = JSON.parse(rawData);
    parsedData.forEach(cafeData => {
      const { xCoordinate, yCoordinate } = cafeData;
      // x좌표, y좌표 값이 존재한다면
      if (xCoordinate && yCoordinate) {
        // X,Y 좌표를 위도, 경도로 변환
        const { latitude, longitude } = convertLocationData({
          // x좌표, y좌표 숫자로 변환
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
    req.cafeData = cafeData;
    next();
  } catch (err) {
    logger.error(err.stack);
    return res
      .status(errorCode.INTERNALSERVERERROR)
      .json({ message: err.message });
  }
};
// req 객체에 저장된 데이터 DB에 저장
exports.saveDataToDb = async function (req, res) {
  try {
    const { cafeData } = req;
    const response = await Cafe.saveDataFromPublicApi(cafeData);
    logger.info('response: ', response);
    return res.sendStatus(successCode.CREATED);
  } catch (err) {
    logger.error(err.stack);
    return res
      .status(errorCode.INTERNALSERVERERROR)
      .json({ message: err.message });
  }
};
// 전체 리소스에 대한 검색 요청
// /search?q=name%3D스타벅스 : 이름이 스타벅스인 모든 리소스 조회
exports.getCafeDataByName = async function (req, res) {
  try {
    const { name } = req.query;
    const response = await Cafe.findCafeDataByName(name);
    const searchResult = response.data;
    logger.info('response: ', response);
    return res.status(successCode.OK).json({ data: searchResult });
  } catch (err) {
    logger.error(err.stack);
    return res
      .status(errorCode.INTERNALSERVERERROR)
      .json({ message: err.message });
  }
};
// 전체 리소스에 대한 검색 요청
// /search?city=서울특별시&gu=()&dong=() : 지번 주소에서 서울 특별시 구, 동 정보를 포함하고 있는 모든 리소스 조회
exports.getCafeDataByJibunAddr = async function (req, res) {
  try {
    const { city, gu, dong } = req.query;
    const response = await Cafe.findCafeDataByJibunAddr({ city, gu, dong });
    const searchResult = response.data;
    return res.status(successCode.OK).json({ data: searchResult });
  } catch (err) {
    logger.error(err.stack);
    return res
      .status(errorCode.INTERNALSERVERERROR)
      .json({ message: err.message });
  }
};
// 사용자의 카페 정보 업데이트 요청
// 업데이트 가능한 카페 정보는 이름이나 지번 주소 검색을 통해 데이터를 받아옴.
// 입력 가능 데이터 : 대표 이미지, 전화번호, 메뉴, 영업시간 등
exports.registerCafeInfo = async function (req, res) {
  try {
    const { data } = req.body;
    const response = await Cafe.registerCafeInfo(data);
    logger.info(response);
    return res.sendStatus(successCode.OK);
  } catch (err) {
    return res
      .status(errorCode.INTERNALSERVERERROR)
      .json({ message: err.message });
  }
};
// 요청 URL의 Parameter로 들어온 id 값을 기준으로 카페 정보 조회
exports.getCafeInfoById = async function (req, res) {
  try {
    const { id } = req.params;
    const responseOfCafeInfo = await Cafe.getCafeInfoById({ id });
    console.log(responseOfCafeInfo.data);
    const responseOfMenu = await Cafe.getMenuDataById({ id });
    console.log(responseOfMenu.data);
    const responseOfOperHours = await Cafe.getOperHoursDataById({ id });
    console.log(responseOfOperHours.data);
    const cafeDetailInfo = {
      ...responseOfCafeInfo.data[0],
      menus: responseOfMenu.data,
      operating_hours: responseOfOperHours.data,
    };
    return res.status(200).json({ data: cafeDetailInfo });
  } catch (err) {
    return res
      .status(errorCode.INTERNALSERVERERROR)
      .json({ message: err.message });
  }
};
// 카페 정보 업데이트
// 변경 가능한 데이터 : 대표 이미지, 전화번호
exports.updateCafeInfo = async function (req, res) {
  const cafeInfo = req.body.data;
  try {
    const response = await Cafe.updateCafeInfo(cafeInfo);
    return res.status(successCode.OK).json({ message: 'CAFE_INFO_UPDATED' });

    // 대표 이미지 & 전화번호 수정
  } catch (err) {
    return res
      .status(errorCode.INTERNALSERVERERROR)
      .json({ message: err.message });
  }
};
// 카페 메뉴 정보 수정 요청
exports.updateCafeMenus = async function (req, res) {
  try {
    const cafeInfo = req.body.data;
    const response = await Cafe.updateMenuTbl(cafeInfo);
    return res.status(successCode.OK).json({ message: 'CAFE_MENUS_UPDATED' });
  } catch (err) {
    return res
      .status(errorCode.INTERNALSERVERERROR)
      .json({ message: err.message });
  }
};
// 카페 운영 시간 정보 수정 요청
exports.updateCafeOperHours = async function (req, res) {
  try {
    const cafeInfo = req.body.data;
    const response = await Cafe.updateOperHoursTbl(cafeInfo);
    return res
      .status(successCode.OK)
      .json({ message: 'CAFE_OPERATING_HOURS_UPDATED' });
  } catch (err) {
    return res
      .status(errorCode.INTERNALSERVERERROR)
      .json({ message: err.message });
  }
};
