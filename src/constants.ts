import { Product, Artisan, BrandPackage } from './types';
import appleJamImg from './assets/images/honey_apple_jam_1780524277364.png';
import bambooCandleImg from './assets/images/bamboo_candle_1780524292278.png';
import jejuMugImg from './assets/images/jeju_stone_mug_1780524308135.png';
import farmsGlowAbaloneImg from './assets/images/farms_glow_abalone_1780536038721.png';

export const PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: '청송 사과 꿀청 (Cheongsong Honey Apple Jam)',
    price: 18000,
    image: appleJamImg,
    category: 'Food',
    description: '청송의 맑은 공기와 햇살을 머금은 사과로 만든 명품 꿀청입니다.',
    artisan: 'Kim Dal-woo',
    isLimited: true,
    timeLeft: '05:24:12',
    stock: 12
  },
  {
    id: 'p2',
    name: '담양 수제 대나무 캔들 (Damyang Bamboo Candle)',
    price: 32000,
    image: bambooCandleImg,
    category: 'Living',
    description: '담양 대나무 숲의 고요함을 담은 천연 소이 캔들입니다.',
    artisan: 'Lee Hyo-jin',
    isLimited: false,
    stock: 45
  },
  {
    id: 'p3',
    name: '제주 돌담 머그컵 (Jeju Stone Wall Mug)',
    price: 24000,
    image: jejuMugImg,
    category: 'Craft',
    description: '제주의 거친 돌담 질감을 현대적으로 재해석한 도자기 머그입니다.',
    artisan: 'Park Seo-yoon',
    isLimited: true,
    timeLeft: '12:00:00',
    stock: 8
  },
  {
    id: 'p4',
    name: '팜스네이브 Farms Glow 프리미엄 전복장 (Farmsnave Premium Abalone Jang)',
    price: 120000,
    image: farmsGlowAbaloneImg,
    category: 'Food',
    description: '완도 청정 바다 참전복을 미공성 유기 옹기 항아리에서 숙성하여 아로마와 부드러운 육질을 지킨 수공예급 최고급 진상품입니다.',
    artisan: 'Farmsnave (안혜경 장인)',
    isLimited: true,
    timeLeft: '03:14:45',
    stock: 5
  },
  {
    id: 'p5',
    name: '완도 명인 수작 전복포 5종 버라이어티 세트 (Wando Premium Abalone Jerky Variety Pack)',
    price: 49000,
    image: farmsGlowAbaloneImg,
    category: 'Food',
    description: '완도 참전복 본연의 깊은 감칠맛을 바탕으로 감태참기름, 갈릭버터, 들깨들기름, 블랙트러플 등 장인의 5종 기획 레시피가 수작업으로 감돌아 조립된 최고급 미식 스낵 세트입니다.',
    artisan: 'Farmsnave (안혜경 장인)',
    isLimited: true,
    timeLeft: '24:00:00',
    stock: 20
  }
];

export const ARTISANS: Artisan[] = [
  {
    id: 'a1',
    name: 'Kim Dal-woo',
    role: 'Traditional Jam Master',
    story: '3대째 내려오는 비법으로 사과의 진미를 담아냅니다.',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=800&auto=format&fit=crop',
    location: 'Cheongsong'
  },
  {
    id: 'a2',
    name: 'Farmsnave (안혜경 장인)',
    role: 'Traditional Marinade Craftsman',
    story: '완도의 깊은 바다 향과 비법 한방 한 식초 간장을 결합하여, 몸에 이로운 보양 명품 전복장을 직접 숨쉬는 고풍 옹기 항아리에 빚어냅니다.',
    image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=800&auto=format&fit=crop',
    location: 'Wando'
  }
];

export const BRAND_PACKAGES: Record<string, BrandPackage> = {
  p1: {
    tagline: "청송의 햇살과 벌꿀의 깊은 달콤함을 한 병에 담다",
    story: "경북 청송의 맑고 높은 하늘 아래, 일교차가 만들어낸 치밀한 과육의 명품 사과만을 엄선했습니다. 인공 첨가물 없이 순수한 국내산 천연 벌꿀로 저온 숙성하여 사과의 아삭아삭한 풍미와 깊고 진한 단맛을 온전히 보존했습니다. 시간이 흐를수록 더 깊은 풍미를 더해가는 사과 꿀청으로 일상의 격조를 높여보세요.",
    details: [
      "100% 청송 직송 고성숙 아삭한 사과 사용",
      "설탕 제로, 벌꿀 베이스의 부드럽고 건강한 꿀청",
      "디저트 토핑, 가벼운 수제 에이드, 차 등에 완벽 매칭"
    ],
    marketingCopy: "🍎 청송 골짜기 차가운 아침 바람과 눈부신 햇살을 머금어 더욱 단단해진 명품 사과에, 깊고 진한 천연 벌꿀을 가득 채웠습니다.\n\n한 스푼 떠올리는 순간 사각이는 기분 좋은 질감과 향긋하고 달달함이 입 안 가득 스며드는 경험.\n\n바쁜 아침 가벼운 요거트 위에, 서늘한 저녁 따뜻한 차 한 잔으로 당신의 온전한 휴식을 채워보세요. 🌿\n\n#마켓모움 #청송사과꿀청 #수제사과청 #로컬브랜딩 #프리미엄디저트"
  },
  p4: {
    tagline: "완도 바다의 온전한 깊이를 숨쉬는 전통 옹기에 가두다",
    story: "완도 청정 남해바다에서 친환경 미역과 다시마만을 먹고 자라 살이 꽉 찬 최고급 참전복만을 고집스럽게 공수했습니다. 대대로 이어져 내려온 천연 한방 비법 간장을 달여 미생물이 숨쉬는 구운 전통 옹기 항아리에서 저온 숙성함으로써, 떫은 맛없이 속 깊은 곳까지 진한 감칠맛이 고르게 베어 들게 만들었습니다. 품격 있는 마음을 전하실 수 있도록 은은한 결이 아름다운 고급 오동나무 원목 정밀 목함과 전통 황동 백자 자물쇠 장식으로 온전한 기품을 담아 포장했습니다.",
    details: [
      "최상급 완도 완도산 참전복 100% 국내산 건강 원재료",
      "숨쉬는 전통 옹기 전통 기공 숙성으로 고품격 자연 부드러움 극대화",
      "명품 오동나무 목함 포장 및 전통 수공예 황동 자물쇠 패키징 증정"
    ],
    marketingCopy: "🌊 바다의 황제, 참전복의 본고장 완도산 왕전복만을 엄선하여 깊은 풍미를 수제 옹기장에 담아냈습니다.\n\n짜지 않고 은은하게 감싸도는 매력적인 감칠맛 뒤에는, 15가지 비법 재료를 마법처럼 우려낸 장인의 시간 and 고집이 담겨있습니다.\n\n귀한 분께 드리는 최고의 가치와 예술을 담아 오동나무 목함과 정교한 황동 자물쇠로 완성된 격식 있는 프리미엄 선물세트로 전해 드립니다. ✨\n\n#마켓모움 #팜스네이브 #FarmsGlow #프리미엄전복장 #명품선물세트 #수제옹기전복장 #전통수작"
  },
  p5: {
    tagline: "완도의 깊은 바다와 플랫폼의 영리한 기지가 빚어낸 프리미엄 전복포",
    story: "건어물 수준의 획일적인 전복포를 넘어, 현대적인 안주 플레이트와 격조 높은 선물세트로 전격 리브랜딩했습니다. 완도산 참전복을 손가락 두께로 도톰하게 저며 참숯 가마에서 수공예 조율 반건조 시켰으며, 초도 출시되는 오리지널·갈릭버터·감태참기름의 대중성 3요소는 물론, 후속 드랍되는 들깨들기름·블랙트러플의 고급스러움까지 완결된 5가지를 제공합니다.",
    details: [
      "100% 완도 앞바다 산지 전정 최고급 참전복 사용",
      "초도 3종 (기본맛, 갈릭버터, 참기름 감태) 우선 출시로 기획 재고 리스크 무마",
      "장인 기획 프리미엄 전용 오동나무함 수작 포장 리플렛 동봉"
    ],
    marketingCopy: "🏮 수많은 전복포 중 단 1%의 격조를 완성시키는 마켓모움만의 영리한 전략 플레이트 에디션.\n\n바다의 본성을 오롯이 감싸 안은 오리지널 전복포부터, 서해안 명품 감태와 가평 압착 참기름 향이 감도는 시그니처 감태 전복포, 단짠의 절정인 갈릭버터까지 마켓모움의 전복포 시뮬레이터를 통해 나만의 명격 선물을 커스터마이징해 보세요. ✨\n\n#마켓모움 #수작전복포 #명인전복포 #로컬브랜딩 #프리미엄안주 #완도참전복"
  }
};
