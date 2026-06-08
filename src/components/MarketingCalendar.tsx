import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, CalendarDays, ChevronLeft, ChevronRight, CheckCircle, Lightbulb, Tag, Award, RefreshCw, Send, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface MonthData {
  month: number;
  seasonName: string;
  themeDesc: string;
  imageUrl: string;
  risings: string[];
  anniversaries: string[];
  tips: string[];
  categories: {
    food: string[];
    digital: string[];
    fashion: string[];
    accessory: string[];
    beauty: string[];
    kids: string[];
    pet: string[];
    living: string[];
    global: string[];
  };
}

const MONTHS_DATA: MonthData[] = [
  {
    month: 1,
    seasonName: "새해 결심과 설 명절의 기점",
    themeDesc: "신년 다짐, 새출발 설빔, 따뜻한 설 명절 패키지 중심의 고선명 선물 수요가 폭발하는 시기입니다.",
    imageUrl: "https://images.unsplash.com/photo-1483921020237-2ff51e8e4b22?q=80&w=600&auto=format&fit=crop",
    risings: ["설날 선물세트", "발렌타인데이 조기 준비", "새해 다짐 다이어리", "겨울 보습 뷰티"],
    anniversaries: ["1일 신년 새해 첫 날", "14일 다이어리데이", "부가세 신고기간"],
    tips: ["새해 희망 문구가 새겨진 각인 달력/다이어리", "설 한정 웅기/목합 전통 보자기 포장 패키지", "신년 홈 트레이닝 / 다이어트 비책 원물 스낵"],
    categories: {
      food: ["설 실속 선물세트", "발렌타인데이 수제 초콜릿 초안", "정가 간식"],
      digital: ["신년 다이어리", "새해 디자인 달력", "졸업/입학 꽃다발 축하 토퍼"],
      fashion: ["신년 설빔", "전통 양단 생활 한복", "겨울철 레이어드 워머"],
      accessory: ["새해 수호 행운 주얼리", "금박 커스텀 별자리 반지"],
      beauty: ["겨울 집중 고보습 스킨", "수분 립케어 세트", "겨울 보습 밤"],
      kids: ["새학기 낮잠 매트", "입학 축하 이름표 기프트", "졸업 꽃다발 토퍼"],
      pet: ["반려동물 신년 개족보 한복", "체온 조절 니트", "수제 사료"],
      living: ["복을 부르는 그림/포스터(복테리어)", "신년 소이 캔들", "수작 거실매트"],
      global: ["선물 포장용 리본/스티커", "해외 설날 테마 주방 소품"]
    }
  },
  {
    month: 2,
    seasonName: "낭만적인 고백과 첫 출발의 설렘",
    themeDesc: "발렌타인데이 수제 기프트와 졸업, 다가오는 봄 신학기 입학 준비로 활기가 도는 계절입니다.",
    imageUrl: "https://images.unsplash.com/photo-1518495973542-4542c06a5843?q=80&w=600&auto=format&fit=crop",
    risings: ["발렌타인데이 초콜릿", "화이트데이 예비 준비", "졸업생 축하 선물", "신학기 첫 패션"],
    anniversaries: ["4일 입춘", "14일 발렌타인데이", "전국 초중고 대학교 졸업식"],
    tips: ["발렌타인데이 한정판 카카오 버터 수제 오가닉 퐁당 쇼콜라", "졸업생을 위한 영원히 시들지 않는 수제 비누/뜨개 꽃다발", "아이들의 첫 단독 수작 원목 책걸상 및 필통 각인"],
    categories: {
      food: ["수제 초콜릿 세트", "달콤한 오가닉 타르트", "기념일 선물세트"],
      digital: ["일러스트 캘린더", "드로잉 커플 폰케이스", "졸업 백자 메달"],
      fashion: ["로맨틱 데이트룩", "신학기 백팩", "가벼운 초봄 가디건"],
      accessory: ["실버 이니셜 커플링", "우정 탄생석 팔찌"],
      beauty: ["기념일 저격 밀착 고체향수", "화사한 메이크업 쿠션"],
      kids: ["수제 낮잠이불 세트", "답례품용 수작 구디백", "식기용 원목 세트"],
      pet: ["반려동물 하네스 세트", "봄 신상 원피스", "수제 영양 츄러스"],
      living: ["집들이용 디퓨저", "수제 미니 가구", "집들이 맞춤 선물"],
      global: ["글로벌 주방 컵세트", "해외 큐레이션 디자인 다이어리 꾸미기"]
    }
  },
  {
    month: 3,
    seasonName: "화사한 봄의 산책과 첫 화이트데이",
    themeDesc: "봄 벚꽃 개화 소식과 함께 야외 활동을 준비하고 화이트데이 수작 스윗박스 수요가 집중됩니다.",
    imageUrl: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?q=80&w=600&auto=format&fit=crop",
    risings: ["화이트데이 디저트", "벚꽃 데이트웨어", "피크닉 & 캠핑 소품", "미세먼지 방어 뷰티"],
    anniversaries: ["3일 삼겹살데이", "14일 화이트데이", "KBO 한국 프로야구 개막 시즌"],
    tips: ["화이트데이 벚꽃잎 자수 목함 명인 오드쉘 사탕", "가벼운 봄바람 피크닉용 방수 린넨 돗자리 세트", "황사/미세먼지를 말끔히 가시는 천연 약초 세척 비누"],
    categories: {
      food: ["사과 꿀청", "피크닉 가공 육류/바베큐 밀키트", "봄나물 비빔장"],
      digital: ["봄꽃 일러스트 문구", "벚꽃 스마트톡", "야구 응원 네임택"],
      fashion: ["봄 피크닉 셔츠", "가벼운 원피스", "커플 매칭 맨투맨"],
      accessory: ["연분홍 로즈쿼츠 주얼리", "탄생석 참 귀걸이"],
      beauty: ["어성초 수분 진정 크림", "약초 천연 폼클렌저", "톤업 비비크림"],
      kids: ["신학기 가방 참", "주말 텃밭 가꾸기 원목 세트", "친환경 가방"],
      pet: ["반려동물 봄 바람막이 점퍼", "산책용 한 입 훈련 간식"],
      living: ["화사한 플라워 화병", "허브 가든 소이 캔들", "봄철 가구 리폼 왁스"],
      global: ["봄빛 가구 손잡이 오크목", "화이트데이 기획 해외 큐레이션 푸드"]
    }
  },
  {
    month: 4,
    seasonName: "야외 캠핑과 피크닉의 본격 가동",
    themeDesc: "벚꽃이 절정에 이르고 캠핑, 피크닉, 야외 라운드를 나서는 가벼운 아웃도어 가치가 급상승합니다.",
    imageUrl: "https://images.unsplash.com/photo-1522383225653-ed111181a951?q=80&w=600&auto=format&fit=crop",
    risings: ["캠핑 미식 및 밀키트", "나들이 패션소품", "부활절 답례품", "봄 골프 용품"],
    anniversaries: ["5일 식목일", "5일 부활절", "22일 지구의 날"],
    tips: ["캠핑장에서 활약할 수제 원목 도마 & 화로 거치대", "부활절 기념 수작 핸드페인팅 도자기 에그 트레이", "밀크글라스 머그와 골프 볼 가죽 파우치"],
    categories: {
      food: ["전통 식혜 파우더", "가마 햇마루 연염 햇멸치", "자연숙성 과일 에이드 베이스"],
      digital: ["자연 풍경 스티커 패키지", "야외활동 토퍼", "지구의 날 굿즈"],
      fashion: ["자외선 차단 린넨 모자", "와이드 면 바지", "피크닉 백"],
      accessory: ["봄바람 은체인 목걸이", "천연 우드 참 브로치"],
      beauty: ["선 로션", "야외활동 후 진정 팩", "천연 오가닉 립틴트"],
      kids: ["어린이 야외 놀이 매트", "수작 원목 카트", "자연 친화적 크레용"],
      pet: ["반려동물 아웃도어 하네스 백", "산책용 오가닉 드롭스 고기"],
      living: ["수작업 원목 캠핑 쉘프", "차량용 천연 석고 방향제", "아웃도어 담요"],
      global: ["에코 라이프 오가닉 파우치", "우주인 테마 해외 수작 디지털 문구"]
    }
  },
  {
    month: 5,
    seasonName: "정성과 감사의 달, 패밀리 시즌",
    themeDesc: "어린이날, 어버이날, 스승의날 등 한 해 중 감사 선물과 고단가 세트 구매량이 최고점을 이루는 달입니다.",
    imageUrl: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=600&auto=format&fit=crop",
    risings: ["가정의 달 패키지", "어버이날 카네이션 소품", "용돈 토퍼/상패", "스승의날 감사세트"],
    anniversaries: ["5일 어린이날", "8일 어버이날", "15일 스승의 날", "18일 성년의 날", "21일 부부의 날"],
    tips: ["카네이션 수제 뜨개 브로치 및 보존화 유리 돔 무드등", "AI 분석을 통한 고풍스러운 수작 명인 부모님 감사 목패 상패", "성년의 날 장미 모티브 일러스트 시그니처 향수 세트"],
    categories: {
      food: ["완도 미역귀 참전복장 실속세트", "한과 가문 자물 가마 꿀약과", "여름나기 과일 수제청"],
      digital: ["카네이션 입체 감사 카드", "어버이날 용돈 수제 박스/토퍼", "선생님 명패"],
      fashion: ["부모님 보들 린넨 스카프", "가정의 달 패밀리 시밀러룩 키트", "나들이 가방"],
      accessory: ["실버 카네이션 펜던트", "기념일 각인 가죽 팔찌"],
      beauty: ["감사 기프트 스킨케어 세트", "장미꽃잎 유기 바디 로션", "천연 수제 향수"],
      kids: ["입체 구연동화 수작 원목 교구", "어린이날 맞춤 이름 각인 의류", "어린이 백팩"],
      pet: ["반려동물 카네이션 케이프", "가정의 달 맞춤 반려동물 수제 영양 츄"],
      living: ["감사 패브릭 행잉 포스터", "카네이션 수안 양초 세트", "전통 자수 러너"],
      global: ["감사 가치 패키지 디자인 글로벌 어소트", "가정의 달 영미 전통 디자인 수작 카드"]
    }
  },
  {
    month: 6,
    seasonName: "초여름의 장마 대비와 푸른 여름나기",
    themeDesc: "여름 다이어트 간식 및 초여름 장마, 친환경 업사이클링 생활 테마가 활성화됩니다.",
    imageUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=600&auto=format&fit=crop",
    risings: ["여름나기 다이어트 식단", "친환경 업사이클링 상품", "초여름 쿨리빙 침구", "여름 보습케어"],
    anniversaries: ["5일 환경의 날", "6일 현충일", "20일 idus 창립기념 시즌"],
    tips: ["환경의 날 맞이 폐현수막/폐원목 업사이클링 수작 가죽 지갑", "저온 숙성 건조 곤약 원물 마늘 야채 스낵 칩", "초여름 습도를 해소하는 천연 대나무 린넨 쿨 베갯잇"],
    categories: {
      food: ["다이어트 저칼로리 간편 간식 스낵", "자일로스 사과 꿀청 식초", "매실 발효 원물"],
      digital: ["환경 보호 테마 리무버블 스티커", "여름 휴가 플래너", "친환경 생분해 볼펜"],
      fashion: ["여름 린넨 시원 셔츠", "가벼운 숄더 에코백", "비올 때 입는 발수 자켓"],
      accessory: ["천연 옥돌 시원 팔찌", "여름 조개 참 발찌"],
      beauty: ["피지 컨트롤 쿨링 클렌저", "여름철 가벼운 수분 앰플", "데오드란트 오일"],
      kids: ["친환경 대나무 원사 물놀이 아동 가운", "수작업 원목 장난감"],
      pet: ["반려동물 아이스 쿨 매트", "초여름 벌레 퇴치 클립", "여름 영양 수산 간식"],
      living: ["습기 흡수 시트 규조토 매트", "대나무 무늬목 코스터", "모기 퇴치 소이캔들"],
      global: ["에코 라이프 수작 주방 보자기 글로벌 팩", "전통 문양 모던 접시 아시아 에디션"]
    }
  },
  {
    month: 7,
    seasonName: "본격적인 여름 바캉스와 여름 미식",
    themeDesc: "본격 휴가철 물놀이 소품, 선케어 뷰티, 초복 중복을 앞둔 보양 가치 식품이 중심에 서는 달입니다.",
    imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop",
    risings: ["여름 휴가 바캉스 소품", "초중복 보양 간편식", "여름철 선케어 & 네일", "여름 샌들/바지"],
    anniversaries: ["14일 실버데이", "15일 초복", "25일 중복"],
    tips: ["휴가지에서 반짝일 자개/조개 껍질 각인 핸드폰 케이스", "기력 보충을 위한 남원 아영 풍천 명인 비법 양념장어 구이", "뜨거운 햇빛으로부터 두피를 보호할 수제 뜨개 버킷햇"],
    categories: {
      food: ["남원 풍천 황금 양념장어 & 소금구이 키트", "저온 숙성 국산 미숫가루 파우더", "수박 빙수 베이스"],
      digital: ["바캉스 방수 팩 전용 라이브 에이스", "휴가 포토북 앨범 제작 서비스", "캠핑용 방수 네임택"],
      fashion: ["가벼운 바캉스 비치 가디건", "시원한 마 린넨 팬츠", "스트로 파나마 햇"],
      accessory: ["실버 은 체인 발찌", "조개 조각 자개 드롭 귀걸이"],
      beauty: ["자외선 완벽 차단 선로션", "애프터선 알로에 진정 팩", "여름 패디큐어 수제 팁"],
      kids: ["아동용 천연 라탄 크로스 미니백", "친환경 조개 모티브 모래 놀이 세트"],
      pet: ["반려동물 휴대용 바캉스 식기", "시원한 메쉬나시 의류", "어린 양고기 영양제"],
      living: ["청량한 유리 물잔 및 코스터 세트", "바다향 천연 양초", "대자리 패드"],
      global: ["여름철 글로벌 디자인 수작 실외 돗자리", "해외 오가닉 인증 화이트 와인 기획 컵"]
    }
  },
  {
    month: 8,
    seasonName: "무더위 극복과 말복, 그리고 수능 준비",
    themeDesc: "늦더위 속 기력 회복 보양식과 함께 8월 말 수능 백일을 앞둔 대입 합격 기원 선물이 등반합니다.",
    imageUrl: "https://images.unsplash.com/photo-1597848212624-a19eb35e2651?q=80&w=600&auto=format&fit=crop",
    risings: ["말복 보양 미식", "수능 D-100 선물", "광복절 전통 굿즈", "여름 마무리 클리어런스"],
    anniversaries: ["11일 수능 D-100", "14일 말복", "15일 광복절", "23일 처서"],
    tips: ["수험생의 집중력을 돋울 천연 원목 독서대 & 필기구 보관 거치대", "광복절 기념 한국 전통 자수 무궁화 스마트폰 스트랩", "말복 맞이 수제 영양 삼계 원물 전복 흑임자 닭안심 큐브"],
    categories: {
      food: ["수험생 총명차 한약방 청음 세트", "여름 마지막 남원 풍천 민물장어 구이", "처서 국산 보리 숙성 차"],
      digital: ["수능 플래너 노트", "수험생 뇌 활성화 응원 토퍼/참", "전통 자수 태극기 케이스"],
      fashion: ["광복절 기념 퓨전 태극 모티브 의류", "처서 대비 얇은 짚업 가디건", "숄더백"],
      accessory: ["순은 실버 수험생 합격 반지", "전통 자수 부채 노리개"],
      beauty: ["여름철 그을린 피부 복귀 화이트 앰플", "열 진정 쿨링 스프레이", "수작 브러시"],
      kids: ["합격 기원 초록 아동 클로버 지우개", "처서 준비 가벼운 니트 아동 조끼"],
      pet: ["늦더위 보양 수제 삼계 큐브 간식", "털 관리용 천연 멧돼지모 브러시"],
      living: ["집중력 향상 우드 로즈마리 디퓨저", "국산 미루나무 수작 좌식 테이블"],
      global: ["전통 서예 수작 글로벌 붓/먹 캘리그라피", "아시안 감성 디자인 도자기 향로"]
    }
  },
  {
    month: 9,
    seasonName: "넉넉한 가을 한가위와 풍성한 수확",
    themeDesc: "추석 대명절을 맞아 한 해 최고 수준의 고해상도 프리미엄 로컬 농수산물과 가공식품 유입이 폭등합니다.",
    imageUrl: "https://images.unsplash.com/photo-1508962914676-134849a727f0?q=80&w=600&auto=format&fit=crop",
    risings: ["추석 명절 선물세트", "한복 및 전통 장신구", "차례상 홈리빙 오브제", "고배율 용돈 봉투"],
    anniversaries: ["14일 포토데이", "25일 추석 대명절 연휴 기점"],
    tips: ["추석 한정판 자개장 콜라보 프리미엄 고풍 한과 세트", "양가 부모님께 현금을 고급스럽게 전하는 수제 옻칠 한지 가죽 돈봉투", "추석 빔 가문 여인들을 위한 단아한 천연 린넨 생활 한복 및 댕기 마감"],
    categories: {
      food: ["팜스네이브 Farms Glow 대물 전복장", "종가집 숙성 남원 풍천 황금 양념장어", "사과 꿀청 혼합세트"],
      digital: ["추석 가문 감사 입체 한지 카드", "기념 토퍼 및 명절 용돈 박스", "전통 달력"],
      fashion: ["단아한 가을 생활 한복", "댕기 자수 헤어핀", "가을 첫 울 가디건"],
      accessory: ["전통 은비녀 노리개 참", "옥팔찌 실버 로컬 비즈 링"],
      beauty: ["가을철 급격한 보습 크림", "명절 전용 패키지 천연 솝 기프트", "수분 앰플"],
      kids: ["유아동 단아 명절 한복", "친환경 원목 명절 전통 가마 완구", "아동 댕기 머리핀"],
      pet: ["반려동물 추석 꼬마 한복", "명절 맞이 오가닉 수제 육포 간식 세트"],
      living: ["차례상 도자기 제기 세트", "가을 달맞이 달항아리 무드등", "전통 자수 컵 매트"],
      global: ["전통 한식 조리기 프리미엄 도그 글로벌 세트", "해외 정서 큐레이션 추석 한과 스낵 웰컴 에디션"]
    }
  },
  {
    month: 10,
    seasonName: "농익은 가을 단풍과 할로윈 축제",
    themeDesc: "단풍철 가을 나들이 캠핑 아웃도어 의류와 월말 활기찬 할로윈 홈파티 공예품이 선두에 섭니다.",
    imageUrl: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?q=80&w=600&auto=format&fit=crop",
    risings: ["가을 캠핑 & 아웃도어 의류", "할로윈 파티 구디백", "단풍철 가죽 액세서리", "한글날 예술 굿즈"],
    anniversaries: ["9일 한글날", "25일 독도의 날", "31일 할로윈 데이"],
    tips: ["할로윈 파티용 무독성 천연 왁스 단호박 몬스터 양초 무드등", "한글날 기념 훈민정음 한글 이니셜 커스텀 실버 참 은 가드 수공예 목걸이", "가을 등반용 방수 가죽 카메라 스트랩과 보틀 케이스"],
    categories: {
      food: ["청송 사과 꿀청 가막 구기 스낵", "단호박 양과자 빵 세트", "할로윈 수제 몬스터 사탕"],
      digital: ["할로윈 귀여운 파티 구디백 상자", "단풍 엽서 일러스트", "한글 이니셜 스티커"],
      fashion: ["두툼한 가을 캠핑 아우터", "울 와플 비니", "코듀로이 나들이 가방"],
      accessory: ["한글 자음 은반지", "독도 지도 실버 링", "가죽 이니셜 팔찌"],
      beauty: ["단풍철 매혹적인 버건디 립밤", "가을 건조 방지 페이셜 오일", "수분 에센스"],
      kids: ["아동 할로윈 마법사 코스튬 망토", "어린이 단풍잎 수공예 핀", "할로윈 사탕 백"],
      pet: ["반려동물 할로윈 꼬마유령 모자", "단풍철 캠핑 체온 조절 니트", "연어 수제 사료"],
      living: ["할로윈 단호박 가구 레진 손잡이", "원목 호박 우드 워크 오너먼트", "가을 담요"],
      global: ["글로벌 한글 캘리그라피 가치 디자인 포스터", "영미 할로윈 리미티드 수작 장식 박스"]
    }
  },
  {
    month: 11,
    seasonName: "첫눈의 예감과 따뜻한 수능 응원",
    themeDesc: "첫눈과 함께 수험생 합격 기원 수작 떡/엿 선물과 겨울철 혹한 대비 방한 아이템이 비상합니다.",
    imageUrl: "https://images.unsplash.com/photo-1508556497405-ed7dcd94acfc?q=80&w=600&auto=format&fit=crop",
    risings: ["수능 합격 기원 기프트", "빼빼로데이 수제과자", "초겨울 방한 의류/침조", "초겨울 고밀도 보습"],
    anniversaries: ["11일 수입 가래떡데이 / 11.11데이", "19일 대학수학능력시험 수능", "22일 김치의 날"],
    tips: ["수 수험생의 긴장을 정성스레 달랠 명인의 저온 발효 가마 찹쌀 수제 떡/엿 세트", "초겨울 혹한 바람을 완벽 차단하는 원목 직조 수제 프렌치 울 목도리", "김장의 날 맞이 전통 명인 숙성 천연 김장 비법 젓갈 육수 액팩"],
    categories: {
      food: ["수제 가래떡 조청 기프트세트", "합격 엿 명인 세트", "전통 김장 원물 토핑 젓갈"],
      digital: ["수능 만점 대박 합격 입체 수제 카드", "다이어리 선주문 일러스트 스냅"],
      fashion: ["수공예 프렌치 울 모직 머플러", "아방가르드 패딩 베스트", "털 와플 장갑"],
      accessory: ["행운 기원 순원 클로버 은 브로치", "탄생초 천연 원목 가락지"],
      beauty: ["혹한기 극강의 아보카도 핸드 밤", "세종가 명의 오일 에센스", "입술 보습 립밤"],
      kids: ["초겨울 아동 울 귀마개 모자", "수공예 아동 털 실내화", "수능 수험생 격려 카드"],
      pet: ["반려동물 겨울 패딩 코트", "겨울철 관절 보호 영양 크림", "수제 황태 츄러"],
      living: ["방풍 벽면 패브릭 커튼 테피스트리", "따뜻한 우드스토브 미니 양초", "극세사 식탁매트"],
      global: ["글로벌 김장 체험 밀키트 패키지 에디션", "수능 격려 해외 교포 명목 크라우드 응원 카드"]
    }
  },
  {
    month: 12,
    seasonName: "성탄의 은총과 한 해의 단란한 마무리",
    themeDesc: "크리스마스 가렌드/오너먼트 홈파티 데코 제품과 송년 고마움을 전하는 연말 답례품 전성기입니다.",
    imageUrl: "https://images.unsplash.com/photo-1491002052546-bf38f186af56?q=80&w=600&auto=format&fit=crop",
    risings: ["크리스마스 트리 오너먼트", "연말 홈파티 테이블웨어", "연말 고급 감사 선물", "동지 팥 스낵"],
    anniversaries: ["22일 동지", "25일 성당 크리스마스 성탄절", "31일 제야의 연말"],
    tips: ["손수 깎아 빚은 친환경 원목 크리스마스 트리 오너먼트 3종", "연말 와인 파티를 감성으로 빛낼 일러스트 핸드페인팅 도자기 와인잔", "동지 맞이 국산 토종 팥가루 옹기 숙성 전통 팥칼국수/양갱 패키지"],
    categories: {
      food: ["명인 비책 전통 국산 가마솥 단팥죽 부티크", "크리스마스 아이싱 수제 쿠키 하우스", "수제 와인치즈 세트"],
      digital: ["성탄절 입체 카드 스티커 팩", "2027 다이어리 얼리버드", "제야의 토퍼"],
      fashion: ["크리스마스 루돌프 자수 울 니트", "겨울 캐시미어 장갑", "송년 가방"],
      accessory: ["눈꽃 모양 큐빅 스터드 귀걸이", "크리스마스 레드 가죽 메탈 참"],
      beauty: ["연말 화려한 홀리데이 글리터 섀도우", "시나몬 바닐라 천연 바디 버터", "건조 페이스 오일"],
      kids: ["산타 양말 수작 자수 이름 주머니", "겨울철 원목 완구", "크리스마스 아동 목도리"],
      pet: ["반려동물 산타 코스튬 모자 케이프", "크리스마스 한정 양고기 컵케이크 스낵"],
      living: ["친환경 솔방울 리스 가렌드 워크", "크리스마스 성탄 조명", "와인잔 코스터"],
      global: ["해외 배송 대응 크리스마스 감사 세트 글로벌 팩", "한식 명품 팥죽 글로벌 밀키트"]
    }
  }
];

export default function MarketingCalendar() {
  const [activeM, setActiveM] = useState<number>(new Date().getMonth() + 1); // Select current actual month dynamically
  const [selectedCat, setSelectedCat] = useState<keyof MonthData['categories']>('food');
  const [productName, setProductName] = useState('');
  const [productInfo, setProductInfo] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [strategyResult, setStrategyResult] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const currentMonthData = MONTHS_DATA.find(m => m.month === activeM) || MONTHS_DATA[0];

  const handlePrevMonth = () => {
    setActiveM(prev => (prev === 1 ? 12 : prev - 1));
    setStrategyResult(null);
  };

  const handleNextMonth = () => {
    setActiveM(prev => (prev === 12 ? 1 : prev + 1));
    setStrategyResult(null);
  };

  const handleSelectMonth = (m: number) => {
    setActiveM(m);
    setStrategyResult(null);
  };

  const generateStrategy = async () => {
    if (!productName || !productInfo) return;
    setIsGenerating(true);
    setStrategyResult(null);
    try {
      const response = await fetch('/api/ai/marketing-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: activeM,
          productName,
          productInfo,
          monthKeywords: currentMonthData.risings.join(', ') + '; ' + currentMonthData.anniversaries.join(', ')
        })
      });
      const data = await response.json();
      setStrategyResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const categoryLabels: Record<string, string> = {
    food: '식품 (Food)',
    digital: '디지털/문구',
    fashion: '패션',
    accessory: '액세서리',
    beauty: '뷰티',
    kids: '유아동',
    pet: '반려동물',
    living: '홈리빙',
    global: '글로벌'
  };

  const getSearchResults = () => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase().trim();
    
    return MONTHS_DATA.map(m => {
      const matches: string[] = [];
      
      if (m.seasonName.toLowerCase().includes(query)) {
        matches.push(`시즌명: ${m.seasonName}`);
      }
      if (m.themeDesc.toLowerCase().includes(query)) {
        matches.push(`테마: ${m.themeDesc}`);
      }
      
      m.risings.forEach(r => {
        if (r.toLowerCase().includes(query)) matches.push(`검색어: ${r}`);
      });
      
      m.anniversaries.forEach(a => {
        if (a.toLowerCase().includes(query)) matches.push(`일정: ${a}`);
      });
      
      m.tips.forEach(t => {
        if (t.toLowerCase().includes(query)) matches.push(`가이드: ${t}`);
      });
      
      Object.entries(m.categories).forEach(([catKey, items]) => {
        items.forEach(item => {
          if (item.toLowerCase().includes(query)) {
            matches.push(`[${categoryLabels[catKey] || catKey}] ${item}`);
          }
        });
      });
      
      return {
        month: m.month,
        seasonName: m.seasonName,
        matches: Array.from(new Set(matches))
      };
    }).filter(res => res.matches.length > 0);
  };

  const searchResults = getSearchResults();

  return (
    <div id="moum-marketing-calendar" className="w-full space-y-12 py-10 animate-fade-in">
      {/* Visual Header */}
      <div className="text-center max-w-2xl mx-auto space-y-4">
        <Badge className="bg-[#8C1D24] text-white hover:bg-[#8C1D24]/90 rounded-none tracking-widest font-mono text-[9px] uppercase px-3 py-1">
          Artisan Season Toolkit
        </Badge>
        <h2 className="text-3xl md:text-5xl magazine-heading font-medium text-brand-green leading-none">
          2026 로컬 상생 마케팅 캘린더
        </h2>
        <p className="text-xs md:text-sm text-foreground/50 font-light leading-relaxed">
          지역 장인의 철학을 세월의 리듬에 태웁니다. 월별 상승 키워드와 절기 흐름을 기회 삼아, <br />
          <strong>Market Moum AI</strong>와 함께 가장 눈부시고 정직한 시즌 브랜드 기획을 전개해 보세요.
        </p>
      </div>

      {/* 🔍 Dynamic Live Interactive Search Widget */}
      <Card className="rounded-none border-black/5 bg-[#FAF9F6] p-6 max-w-4xl mx-auto shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          <div className="relative flex-1">
            <input
              type="text"
              className="w-full bg-white border border-black/10 p-3.5 pl-10 pr-10 text-xs focus:outline-none focus:ring-1 focus:ring-brand-green rounded-none"
              placeholder="궁금한 마케팅 검색어 혹은 시즌 아이템을 검색해 보세요 (예: 설날, 수능, 캠핑, 초콜릿, 뷰티, 한복)"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground/40">
              <Search className="w-4 h-4" />
            </div>
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-[#8C1D24] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <Button 
            onClick={() => setSearchQuery(searchQuery)}
            className="bg-brand-green hover:bg-[#153427] text-white rounded-none text-xs uppercase tracking-widest font-mono font-bold h-auto py-3.5 px-6 transition-colors"
          >
            검색하기
          </Button>
        </div>

        {/* Hot Quick tags you can CLICK to automatically search! */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-foreground/60 select-none">
          <span className="font-semibold text-brand-green/80 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#8C1D24] animate-pulse" /> 클릭 원터치 검색 테그:
          </span>
          {["설날", "추석", "캠핑", "발렌타인데이", "수능", "나들이", "패키지", "선물세트", "한복", "보습"].map((k) => (
            <button
              key={k}
              onClick={() => setSearchQuery(k)}
              className={`px-2.5 py-1 text-[10px] font-sans border transition-all cursor-pointer ${
                searchQuery === k 
                  ? 'bg-brand-green text-white border-brand-green font-medium' 
                  : 'bg-white border-black/5 hover:border-brand-green/35 text-foreground/70 hover:text-brand-green'
              }`}
            >
              #{k}
            </button>
          ))}
        </div>

        {/* Dynamic Search Results Dropdown Option */}
        <AnimatePresence>
          {searchQuery && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden border-t border-black/5 pt-4 space-y-3"
            >
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-brand-green">
                  검색 결과: 전국 <span className="text-[#8C1D24] font-bold font-mono">{searchResults.length}</span>개의 달이 매칭되었습니다.
                </span>
                <button 
                  onClick={() => setSearchQuery('')}
                  className="text-[10px] text-foreground/40 hover:text-brand-green uppercase tracking-wider underline cursor-pointer"
                >
                  지우기 (Clear)
                </button>
              </div>

              {searchResults.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                  {searchResults.map((res) => (
                    <div 
                      key={res.month}
                      onClick={() => handleSelectMonth(res.month)}
                      className={`p-4 border transition-all cursor-pointer text-left ${
                        activeM === res.month 
                          ? 'bg-brand-green/5 border-brand-green' 
                          : 'bg-white border-black/5 hover:border-brand-green/25'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1 pb-1 border-b border-black/[0.03]">
                        <span className="font-mono font-bold text-xs text-brand-green">{res.month}월 기획</span>
                        <Badge className="bg-[#8C1D24] text-white text-[8px] px-1.5 py-0.2 rounded-none uppercase tracking-wider hover:bg-[#8C1D24]">
                          Go View
                        </Badge>
                      </div>
                      <p className="text-[11px] font-semibold text-foreground leading-snug mb-2 line-clamp-1">
                        {res.seasonName}
                      </p>
                      
                      {/* Show matched keywords inside */}
                      <div className="space-y-1">
                        {res.matches.slice(0, 2).map((mText, mIdx) => (
                          <div key={mIdx} className="text-[10px] text-foreground/50 flex items-start gap-1">
                            <span className="text-brand-green mt-0.5">•</span>
                            <span className="line-clamp-1">{mText}</span>
                          </div>
                        ))}
                        {res.matches.length > 2 && (
                          <span className="text-[9px] text-brand-green font-mono block mt-1">외 {res.matches.length - 2}개 더 발견</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white p-6 border border-black/5 text-center text-xs text-foreground/40 font-light">
                  검색어 "{searchQuery}"에 해당하는 키워드나 일정을 찾지 못했습니다. <br />
                  상단 추천어 및 태그를 클릭해 보시는걸 권장합니다.
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Month Navigation Row */}
      <div className="flex items-center justify-between border-t border-b border-black/5 py-4 max-w-4xl mx-auto overflow-x-auto gap-4 px-2 scrollbar-none scroll-smooth">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handlePrevMonth} 
          className="rounded-none text-brand-green hover:bg-black/5"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="flex gap-1 overflow-x-auto max-w-lg md:max-w-xl scrollbar-none py-1">
          {MONTHS_DATA.map(m => (
            <button
              key={m.month}
              onClick={() => handleSelectMonth(m.month)}
              className={`w-10 h-10 flex-shrink-0 text-xs font-mono rounded-none font-bold transition-all border ${
                activeM === m.month 
                  ? 'bg-brand-green text-white border-brand-green shadow-sm' 
                  : 'bg-transparent text-foreground/50 hover:text-brand-green border-transparent hover:border-black/5'
              }`}
            >
              {m.month}월
            </button>
          ))}
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleNextMonth} 
          className="rounded-none text-brand-green hover:bg-black/5"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Main Feature Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Month Vibe & General planning */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="rounded-none border-black/5 bg-white overflow-hidden shadow-sm">
            <div className="relative aspect-[16/10] w-full bg-[#FAF9F6] overflow-hidden border-b border-black/5">
              <img 
                src={currentMonthData.imageUrl} 
                alt={`${currentMonthData.month}월 로컬 무드비주얼`} 
                className="w-full h-full object-cover grayscale-[15%] hover:grayscale-0 transition-all duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
              <div className="absolute top-4 left-4">
                <Badge className="bg-[#8C1D24] text-white rounded-none tracking-widest text-[9px] uppercase font-mono px-2 py-0.5">
                  2026 Season {currentMonthData.month}
                </Badge>
              </div>
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <p className="text-[10px] uppercase tracking-widest text-brand-terracotta font-mono font-bold">Local Rhythm</p>
                <h3 className="text-2xl font-medium magazine-heading leading-tight">{currentMonthData.month}월: {currentMonthData.seasonName}</h3>
              </div>
            </div>
            <CardContent className="pt-6 space-y-6">
              <p className="text-xs font-light text-foreground/70 leading-relaxed italic">
                "{currentMonthData.themeDesc}"
              </p>

              {/* Monthly risings pills */}
              <div className="space-y-2">
                <h4 className="text-[10px] uppercase font-mono tracking-widest text-brand-green font-bold flex items-center gap-1.5 border-b border-black/5 pb-2">
                  <Tag className="w-3.5 h-3.5" /> {currentMonthData.month}월 상승 트렌드 검색어
                </h4>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {currentMonthData.risings.map((tag, i) => (
                    <Badge 
                      key={i} 
                      variant="secondary" 
                      onClick={() => {
                        setSearchQuery(tag);
                        document.getElementById('moum-marketing-calendar')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="bg-brand-green/5 text-brand-green hover:bg-brand-green/10 hover:border-brand-green/30 text-[10px] rounded-none px-2.5 py-1 border border-brand-green/10 cursor-pointer transition-all"
                    >
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Division / Holidays List */}
              <div className="space-y-3">
                <h4 className="text-[10px] uppercase font-mono tracking-widest text-brand-green font-bold flex items-center gap-1.5 border-b border-black/5 pb-2">
                  <CalendarDays className="w-3.5 h-3.5" /> 주요 절기 및 공휴일 일정
                </h4>
                <ul className="space-y-1.5 pt-1 font-mono text-[11px] text-foreground/60">
                  {currentMonthData.anniversaries.map((ann, i) => {
                    const cleanKeyword = ann.replace(/^\d+일\s*/, '').trim(); 
                    return (
                      <li 
                        key={i} 
                        onClick={() => {
                          setSearchQuery(cleanKeyword);
                          document.getElementById('moum-marketing-calendar')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="flex items-center gap-2 cursor-pointer hover:text-brand-green transition-colors text-left"
                      >
                        <div className="w-1.5 h-1.5 bg-[#8C1D24] rounded-full"></div>
                        <span className="hover:underline">{ann}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Category keyword grid & AI Marketing box */}
        <div className="lg:col-span-7 space-y-6">
          {/* Category-wise rising keyword board */}
          <Card className="rounded-none border-black/5 bg-white shadow-sm">
            <CardHeader className="space-y-1 bg-[#FAF9F6]/50 border-b border-black/5">
              <CardTitle className="text-base text-brand-green font-medium">카테고리별 상승 검색어 & 아이디어</CardTitle>
              <CardDescription className="text-xs">전국의 동료 아티스트들과 트렌드를 앞서 준비하세요.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {/* Horizontal scroll switcher for category tabs */}
              <div className="flex gap-1 overflow-x-auto border-b border-black/5 pb-3 scrollbar-none mb-6">
                {Object.keys(currentMonthData.categories).map(catKey => (
                  <button
                    key={catKey}
                    onClick={() => setSelectedCat(catKey as keyof MonthData['categories'])}
                    className={`px-4 py-2 flex-shrink-0 text-[10px] uppercase tracking-widest font-mono font-bold border-b-2 transition-all cursor-pointer ${
                      selectedCat === catKey 
                        ? 'border-brand-green text-brand-green font-semibold' 
                        : 'border-transparent text-foreground/45 hover:text-brand-green'
                    }`}
                  >
                    {categoryLabels[catKey] || catKey}
                  </button>
                ))}
              </div>

              {/* Display products for active category */}
              <div className="space-y-4 animate-fade-in">
                <div className="bg-[#FAF9F6]/50 p-4 border border-black/5 border-dashed">
                  <p className="text-[9px] uppercase tracking-wider font-mono text-[#8C1D24] mb-2 font-bold select-none">[ {categoryLabels[selectedCat]} Rising Index ]</p>
                  <div className="flex flex-wrap gap-2">
                    {currentMonthData.categories[selectedCat].map((item, id) => (
                      <span 
                        key={id} 
                        onClick={() => {
                          setSearchQuery(item);
                          document.getElementById('moum-marketing-calendar')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="bg-white border border-brand-green/10 hover:border-brand-green text-brand-green hover:text-brand-green text-[11px] font-medium px-3 py-1.5 shadow-xs font-sans cursor-pointer transition-all hover:bg-brand-green/5"
                      >
                        ✦ {item}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5 bg-[#8C1D24]/[0.02] border border-[#8C1D24]/10 p-5">
                  <span className="text-[9px] uppercase tracking-widest font-mono text-[#8C1D24] font-bold">Curation Strategy Guide</span>
                  <p className="text-xs text-[#8C1D24] font-medium leading-normal mb-1">
                    이 시기, 마켓모움 MD 추천 시즌 기획:
                  </p>
                  <ul className="space-y-1.5 pt-1 text-xs text-foreground/70 font-light list-inside list-disc">
                    {currentMonthData.tips.map((tip, i) => (
                      <li key={i} className="leading-relaxed leading-normal">{tip}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Interactive AI Marketing Strategy Generator Block */}
          <Card className="rounded-none border-brand-green/20 bg-gradient-to-br from-white to-[#FAF9F6]/30 overflow-hidden shadow-sm relative">
            <div className="absolute top-0 right-0 w-36 h-36 bg-brand-green/5 rounded-full blur-2xl -translate-y-8 translate-x-8 pointer-events-none"></div>
            <CardHeader className="space-y-1">
              <div className="flex justify-between items-center">
                <Badge className="bg-[#FAF9F6] border border-brand-green text-brand-green text-[9px] rounded-none tracking-widest uppercase font-mono font-bold px-2 py-0.5">
                  Moum AI Assistant
                </Badge>
                <div className="flex items-center text-[10px] text-brand-green font-mono font-bold">
                  <Sparkles className="w-3.5 h-3.5 mr-1 text-[#8C1D24] animate-pulse" /> Gemini Flash 3.5 Active
                </div>
              </div>
              <CardTitle className="magazine-heading text-xl text-brand-green mt-2 font-bold">{currentMonthData.month}월 AI 시즌 상품 기획기</CardTitle>
              <CardDescription className="text-xs">제품 정보와 가치를 입력해, 이번 {currentMonthData.month}월 시즌을 완벽히 관통하는 상생 마케팅 기안을 얻어가세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase tracking-widest text-[#8C1D24] font-bold font-mono">Product Name</label>
                  <input
                    className="w-full bg-white border border-black/5 p-3 text-xs focus:outline-none focus:ring-1 focus:ring-brand-green rounded-none"
                    placeholder="e.g. 70년 햇마루 전통 다시마 소금"
                    value={productName}
                    onChange={e => setProductName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase tracking-widest text-[#8C1D24] font-bold font-mono">Core Value / Explanation</label>
                  <input
                    className="w-full bg-white border border-black/5 p-3 text-xs focus:outline-none focus:ring-1 focus:ring-brand-green rounded-none"
                    placeholder="e.g. 무공해 신안 해풍에 3년간 말리고 옹기 저온 숙성"
                    value={productInfo}
                    onChange={e => setProductInfo(e.target.value)}
                  />
                </div>
              </div>

              <Button
                onClick={generateStrategy}
                disabled={isGenerating || !productName || !productInfo}
                className="w-full text-xs uppercase tracking-widest font-mono font-bold rounded-none bg-brand-green text-white hover:bg-brand-green/90 h-11"
              >
                {isGenerating ? (
                  <span className="flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" /> 기획안을 조율하는 중...</span>
                ) : (
                  <span className="flex items-center gap-1.5"><Sparkles className="w-4 h-4" /> {currentMonthData.month}월 맞춤 AI 캠페인 기안 생성</span>
                )}
              </Button>

              {/* AI Strategy Generation Output */}
              <AnimatePresence>
                {strategyResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 15 }}
                    className="border border-brand-green/10 bg-white p-5 space-y-5 animate-fade-in text-xs leading-relaxed"
                  >
                    <div className="flex justify-between items-center border-b border-black/5 pb-2">
                      <span className="text-[10px] uppercase tracking-widest text-[#8C1D24] font-bold font-mono flex items-center gap-1.5">
                        <Award className="w-4 h-4" /> AI Generated Concept Proposal [Approved]
                      </span>
                      <div className="flex gap-1.5">
                        {strategyResult.hashtags?.map((tag: string, i: number) => (
                          <span key={i} className="text-[#8C1D24] font-mono text-[9px] font-bold">{tag}</span>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h5 className="font-semibold text-brand-green text-sm flex items-center gap-1 leading-none mb-1.5">
                          🎁 캠페인 타우스 명패: "{strategyResult.campaignTitle}"
                        </h5>
                        <p className="text-foreground/75 font-light leading-relaxed pl-4 border-l-2 border-[#8C1D24]">
                          {strategyResult.seasonalHook}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                        <div className="bg-[#FAF9F6] p-4 border border-black/5">
                          <p className="font-semibold text-brand-green flex items-center gap-1 mb-1.5 text-[11px]">
                            <Lightbulb className="w-3.5 h-3.5 text-[#8C1D24]" /> 패키지 & 프로모션 추천
                          </p>
                          <p className="text-foreground/70 font-light text-[11px] leading-relaxed">
                            {strategyResult.promotionIdea}
                          </p>
                        </div>
                        <div className="bg-[#FAF9F6] p-4 border border-black/5">
                          <p className="font-semibold text-brand-green flex items-center gap-1 mb-1.5 text-[11px]">
                            <CheckCircle className="w-3.5 h-3.5 text-brand-green" /> 수석 MD 판매 진서 팁
                          </p>
                          <p className="text-foreground/70 font-light text-[11px] leading-relaxed">
                            {strategyResult.curatorTip}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
