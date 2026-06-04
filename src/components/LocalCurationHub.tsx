import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  MapPin, 
  TrendingDown, 
  Coins, 
  Heart, 
  Sparkles, 
  Gift, 
  ShieldCheck, 
  CheckCircle, 
  ArrowRight, 
  Calendar,
  Compass,
  ArrowUpRight,
  ChevronRight,
  AlertCircle,
  HelpCircle,
  Share2,
  Award,
  TrendingUp,
  Briefcase,
  Layers,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Types for Curation Hub
interface LocalProducer {
  id: string;
  name: string;
  location: string;
  title: string;
  specialty: string;
  story: string;
  votes: number;
  goalVotes: number;
  narrative: string;
  image: string;
  highlightTag: string;
}

interface InvestmentProject {
  id: string;
  title: string;
  producer: string;
  location: string;
  targetAmount: number;
  currentAmount: number;
  minPledge: number;
  rewardPlan: string;
  expectedReturn: string;
  image: string;
  investorsCount: number;
}

export default function LocalCurationHub() {
  // Group buy states
  const [participants, setParticipants] = useState(184);
  const [hasJoined, setHasJoined] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [comparisonMetric, setComparisonMetric] = useState<number>(0);

  // Abalone Jerky (전복포) State
  const [selectedJerkyId, setSelectedJerkyId] = useState<string>('jerky-1');
  const [platedJerky, setPlatedJerky] = useState<string[]>([
    'jerky-1', // Original
    'jerky-2', // Gamtae Sesame
    'jerky-4', // Garlic Butter
    'jerky-1', // Original
    'jerky-3', // Perilla
  ]);
  const [jerkyPreorderStatus, setJerkyPreorderStatus] = useState<boolean>(false);
  const [selectedCustomPackSize, setSelectedCustomPackSize] = useState<number>(5); // 3 or 5

  const jerkyFlavors = [
    {
      id: 'jerky-1',
      name: '전복포 오리지널 (기본맛)',
      engName: 'Abalone Jerky Original',
      phase: 1,
      phaseLabel: '1차 우선 출시 (필수)',
      description: '참전복 자체의 고전적인 담백함과 은은한 천연 아미노산 감칠맛을 온전히 보존한 프리미엄 기본 품종입니다.',
      pairing: '싱글몰트 스카치 위스키, 깔끔한 백포도주 (Chardonnay)',
      target: '가장 본연의 정성스러운 바다 진미를 선호하는 고전적 미식가',
      color: 'bg-amber-600',
      bgColor: 'bg-amber-50/50',
      borderColor: 'border-amber-200',
      textColor: 'text-amber-800',
      metrics: { seaBreeze: 80, savory: 65, sweetness: 40, richness: 95 },
      priceMod: 0,
    },
    {
      id: 'jerky-2',
      name: '감태 참기름 전복포',
      engName: 'Gamtae Sesame Abalone Jerky',
      phase: 1,
      phaseLabel: '1차 우선 출시 (시그니처)',
      description: '동해안 산지 직송 저온 압착 참기름의 깊은 수작 통로와 서해안 감태 가루를 털어내어 고급스러운 한국적 바다 아로마를 완성한 전용 시그니처입니다.',
      pairing: '신선한 국산 청주, 수제 화이트 에일 맥주',
      target: '세련된 감태 향과 참기름의 조화를 추구하는 퓨전 미식가',
      color: 'bg-emerald-700',
      bgColor: 'bg-emerald-50/50',
      borderColor: 'border-emerald-200',
      textColor: 'text-emerald-800',
      metrics: { seaBreeze: 75, savory: 80, sweetness: 35, richness: 85 },
      priceMod: 1500,
    },
    {
      id: 'jerky-3',
      name: '들깨 들기름 전복포',
      engName: 'Perilla Seed Abalone Jerky',
      phase: 2,
      phaseLabel: '2차 라인업 (고소함 극치)',
      description: '햇 들깨를 정밀 탈피하여 갈아 만든 부드러운 가루와 유기 가마에 짠 생들기름에 무쳐 중장년층이 열광하는 극상의 단호한 고소함을 안겨줍니다.',
      pairing: '무감미료 전통 수제 생막걸리, 한옥 발효 약주',
      target: '추석/설 명절 부모님 가치 선물용 및 중장년 건강 지향 미식군',
      color: 'bg-amber-800',
      bgColor: 'bg-yellow-50/20',
      borderColor: 'border-yellow-200',
      textColor: 'text-amber-900',
      metrics: { seaBreeze: 60, savory: 100, sweetness: 30, richness: 90 },
      priceMod: 2000,
    },
    {
      id: 'jerky-4',
      name: '갈릭버터 전복포',
      engName: 'Garlic Butter Abalone Jerky',
      phase: 1,
      phaseLabel: '1차 우선 출시 (대중성)',
      description: '국산 의성 마늘을 쪄서 갈아낸 다대기와 프랑스 정통 가염 발효 버터를 풍부하게 융합해 중독적인 단짠의 진풍경을 선사합니다.',
      pairing: '차가운 수제 페일 에일(IPA), 시원한 필스너 라거 캔맥주',
      target: '퇴근 후 주말 밤 시원하게 맥주 혼술 파티와 함께 고급 보양 안주를 스냅하고 싶은 2030 젊은층',
      color: 'bg-[#D66853]',
      bgColor: 'bg-rose-50/50',
      borderColor: 'border-rose-200',
      textColor: 'text-rose-800',
      metrics: { seaBreeze: 20, savory: 80, sweetness: 95, richness: 85 },
      priceMod: 1000,
    },
    {
      id: 'jerky-5',
      name: '블랙트러플 전복포',
      engName: 'Black Truffle Abalone Jerky',
      phase: 2,
      phaseLabel: '2차 라인업 (소량 테스트)',
      description: '이탈리아 움브리아 고산지대 참나무 아래서 엄격히 수작업 수지한 트러플 에센스와 엑스트라 버진 오일의 머스크향이 짙게 배어 있는 프리미엄 아방가르드 에디션입니다.',
      pairing: '드라이 샴페인, 깊은 탄닌의 피노 누아 오크 에이징 레드 와인',
      target: '럭셔리 파티 선물, 부티크 소믈리에 와인바 무드를 일상 싱크로 체험하고 싶은 콜렉터 기질인',
      color: 'bg-indigo-950',
      bgColor: 'bg-indigo-50/50',
      borderColor: 'border-indigo-200',
      textColor: 'text-indigo-900',
      metrics: { seaBreeze: 40, savory: 85, sweetness: 50, richness: 100 },
      priceMod: 3000,
    }
  ];

  // Micro-investment states
  const [selectedPledgeId, setSelectedPledgeId] = useState<string | null>(null);
  const [activeInvestmentId, setActiveInvestmentId] = useState<string>('inv-1');
  const [userPledgedAmount, setUserPledgedAmount] = useState<Record<string, number>>({});
  const [showPledgeSuccess, setShowPledgeSuccess] = useState<string | null>(null);
  const [investmentProjects, setInvestmentProjects] = useState<InvestmentProject[]>([
    {
      id: 'inv-1',
      title: '보길도 성창수 장어 장주의 ‘황금 장어 사료 선투자’ 펀드',
      producer: '성창수 어부',
      location: '전남 완도군 보길면',
      targetAmount: 50000000,
      currentAmount: 38500000,
      minPledge: 20000,
      rewardPlan: '제철 수확 보길도 활장어 한 쌍 진공패키지(6만원 상당) + 연 5% 로컬 환급 포인트 적립',
      expectedReturn: '리워드 실물 수취 + 25% 가치 절감 효과',
      image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?q=80&w=600&auto=format&fit=crop',
      investorsCount: 437
    },
    {
      id: 'inv-2',
      title: '제주 조천 강민호 무농약 물빛 초생 감귤 신생 원목 지분',
      producer: '강민호 농부',
      location: '제주의 숨은 비경 조천읍',
      targetAmount: 30000000,
      currentAmount: 18500000,
      minPledge: 10000,
      rewardPlan: '자연 숙성 당도 14Brix 감귤 10kg 나무목함 콜라보 박스(4.5만원 상당) + 무료 웰컴 미식 패스포트',
      expectedReturn: '가장 먼저 첫 수확 감귤 벼루 배송 + 한정판 굿즈',
      image: 'https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?q=80&w=600&auto=format&fit=crop',
      investorsCount: 310
    }
  ]);

  // Producer states
  const [producers, setProducers] = useState<LocalProducer[]>([
    {
      id: 'prod-1',
      name: '장석조 명인',
      location: '부산 기장군 일광읍',
      title: '70년 가문비 전통 기장 옻독 자염 다시마',
      specialty: '전통 자염 공법 수작업 다시마',
      story: '철저한 수조 조율과 동해안 센 바람으로 하루 단 100장만 건조 조율',
      narrative: '기장의 맑은 바람이 암초 위에 머무르는 시간은 짧습니다. 자연 자염 가마솥에서 끓여낸 전통 소금물로 다시마의 결을 소독하고 무쇠 가마솥에 데쳐 아날로그 수작조로 완성합니다.',
      votes: 142,
      goalVotes: 200,
      image: 'https://images.unsplash.com/photo-1518737003272-da40ffd94b0f?q=80&w=600&auto=format&fit=crop',
      highlightTag: '70년 가문비 전통'
    },
    {
      id: 'prod-2',
      name: '김옥순 할머니',
      location: '경남 통영시 한산면',
      title: '백년 털이질 공법 전통 태양건조 은멸치',
      specialty: '태양 빛과 한산도 해안 염풍 건조 은멸치',
      story: '원물 손상 없이 전통 대나무 정치망(죽방렴)으로 가둔 최상품 은빛 기적',
      narrative: '기성의 고온 열풍 건조기에서 구워낸 멸치와는 빛깔 자체가 다른 은빛 투명함을 지녔습니다. 털어낸 후 옹기에 가벼운 연염을 쳐 가을 햇마루에서 72시간 볕을 쪼였습니다. 원조 할머니 레시피 북을 동봉해 드립니다.',
      votes: 188,
      goalVotes: 200,
      image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?q=80&w=600&auto=format&fit=crop',
      highlightTag: '할머니 레시피'
    },
    {
      id: 'prod-3',
      name: '성창수 어부',
      location: '전남 완도군 보길면',
      title: '자연 친화적 가을 활장어 & 전통 장어덮밥 원물 밀판',
      specialty: '다도해 해양 한옥 가두리 최고급 활장어',
      story: '수입산 및 인위적 성장 촉진제를 전면 배제한 고품질 천연 자양 장어 원물',
      narrative: '보길도의 맑고 깊은 바닷바람과 햇살에 자연양생한 가울 장어입니다. 입안 가득 터지는 깊은 기름기와 수작업으로 가시를 한 땀 한 땀 발라낸 도톰한 장어포를 마켓모움의 전용 한옥 양념 간장(PB)과 함께 배송합니다.',
      votes: 110,
      goalVotes: 150,
      image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?q=80&w=600&auto=format&fit=crop',
      highlightTag: '하루 200마리 한정 수공예'
    },
    {
      id: 'prod-4',
      name: '강민호 농부',
      location: '제주의 숨은 비경 조천읍',
      title: '폐교를 개조한 친환경 무농약 조천 감귤 가판',
      specialty: '수확기 약품 코팅이 없는 물빛 초생 감귤',
      story: '버려진 시골 폐교에서 자란 고유종 귤을 직접 손질하고 솜으로 하나하나 닦은 명인',
      narrative: '과거 아이들의 웃음소리가 머물던 조천의 작은 폐교 공터를 개조해 만든 귤밭입니다. 공장에서 왁스코팅한 주황빛 공산품 귤과 다른, 자연 그대로의 다채로운 새콤달콤함을 서포트합니다.',
      votes: 75,
      goalVotes: 120,
      image: 'https://images.unsplash.com/photo-1520038410233-7141be7e6f97?q=80&w=600&auto=format&fit=crop',
      highlightTag: '폐교 개조 귤공장'
    }
  ]);

  // Comparative metrics table
  const comparativeFramework = [
    {
      pillar: '핵심 지향점',
      traditional: '최저가 공세 및 최저 수수료 경쟁',
      moum: '소상공인 철학과 장인 서사 스토리 중심의 가치 큐레이션',
      details: '가격 비교 없이 본질적 매력과 스토리에 집중하여 제값을 인정받음'
    },
    {
      pillar: '상품 공급방식',
      traditional: '중국산 카피본 및 획일화된 OEM 대량판매',
      moum: '숨은 산지 장인과 플랫폼이 마케팅·PB 패키징 공동 협업',
      details: '생산단계부터 모움 크리에이티브팀이 브랜딩·패키지·유통을 전담'
    },
    {
      pillar: '마케팅 비용 구조',
      traditional: '수천만 원대 키워드 광고비 출혈 전쟁 및 상위 노출 유료화',
      moum: '공동구매 목표 달성 시 스스로 친구를 초대하는 퍼널형 팬덤',
      details: '단골 고객이 자발적 바이럴 리더가 되어 마케팅 비용을 실질 환급'
    },
    {
      pillar: '배송 및 물류 가치',
      traditional: '속도에만 치중한 박스 포장형 기성 배송 (쿠팡식)',
      moum: '기다림마저 설레는 경험·콘텐츠 중심 산지 직구 패키징',
      details: '오동나무 목함 포장, 한옥 전통 박스, 친환경 짚풀 마감 등으로 매거진 개봉감 부여'
    },
    {
      pillar: '지역 연대 구조',
      traditional: '단순 셀러 점주 입점 모델 (지역 소멸과 단절)',
      moum: '소액 시즌 투자를 겸하는 서포터형 투자 커뮤니티',
      details: '단골 고객이 농산물 예약 투자자(로컬 엔젤)가 되어 상생 네트워크 구축'
    }
  ];

  // Fandom Tier configurations
  const membershipTiers = [
    {
      name: '일반 미식 회원 (새싹)',
      price: '무료',
      desc: '로컬의 숨겨진 가치를 탐색하고 소소하게 참여하는 기본 멤버십',
      perks: [
        '기본 상세스토리 및 장인 에디토리얼 열람',
        '상세페이지 투표 및 공동구매 가입 권한',
        '구매 금액의 0.5% 로컬 환급 포인트 적립'
      ],
      badge: 'Green Grass',
      color: 'border-black/5 bg-[#FAF9F5]'
    },
    {
      name: '로컬클럽 정기 멤버 (산지친구)',
      price: '월 ₩4,900',
      desc: '우선 참여권과 리워드 등 로컬 후원을 향한 깊은 연대 멤버십',
      perks: [
        '모든 공동구매 상시 5% 추가 포인트 적립',
        '인기 프로젝트 예약 구매 24시간 얼리엑세스권',
        '가격 하락 퍼널 단계별 추가 캐시백 적립금 2배 가중치',
        '신생 보배 생산자 발굴 무료 시식 키트 제공 (분기 1회)'
      ],
      badge: 'Local Supporter',
      color: 'border-[#1B4332] bg-white ring-2 ring-[#1B4332]/10'
    },
    {
      name: '프리미엄 미식 서포터 (장인클럽)',
      price: '월 ₩49,000',
      desc: '제철 로컬 큐레이션 실물 박스와 오프라인 미식회 연계 최상위 패밀리',
      perks: [
        '매월 명인 수공예 ‘이달의 로컬 구제박스’ 고품격 실물 패키지 무료 배송',
        '전통 명인 오프라인 수공예 클래스 & 시식 다도회 연 2회 VIP 무료 초대',
        '공동구매 시작가 자체를 VIP 특가(10% 선적용)로 자동 보정 진입',
        '전용 1:1 슬로우 오더 컨설팅 및 나무 목합 맞춤 각인 한글 전용 서비스'
      ],
      badge: 'VIP Master Club',
      color: 'border-[#D66853] bg-[#FDFCF8] ring-2 ring-[#D66853]/10'
    }
  ];

  // Pricing Model Formulas
  const basePrice = 39900;
  
  // Custom price levels based on simulated count
  const getDynamicPrice = (countInput: number) => {
    if (countInput < 100) return 39900;
    if (countInput >= 100 && countInput < 300) return 34900;
    if (countInput >= 300 && countInput < 500) return 29900;
    return 24900; // Final rock bottom price
  };

  const currentPrice = getDynamicPrice(participants);

  // Next threshold target details
  const getNextThreshold = (countInput: number) => {
    if (countInput < 100) return { count: 100, price: 34900 };
    if (countInput >= 100 && countInput < 300) return { count: 300, price: 29900 };
    if (countInput >= 300 && countInput < 500) return { count: 500, price: 24900 };
    return null;
  };

  const nextThreshold = getNextThreshold(participants);

  // Calculate cashback refund math
  const calculatePointRefundByCount = (countInput: number) => {
    const calculatedPrice = getDynamicPrice(countInput);
    const diff = basePrice - calculatedPrice;
    const extraBonus = Math.floor(diff * 0.2); // 20% bonus point logic for early birds
    return {
      price: calculatedPrice,
      diff,
      extraBonus,
      total: diff + extraBonus
    };
  };

  const demoRefund = calculatePointRefundByCount(participants);

  const handleJoinProject = () => {
    if (!hasJoined) {
      setParticipants(prev => prev + 1);
      setHasJoined(true);
    } else {
      setParticipants(prev => prev - 1);
      setHasJoined(false);
    }
  };

  const handleSupportVote = (id: string) => {
    setProducers(prev => prev.map(p => {
      if (p.id === id) {
        const nextVote = p.votes + 1;
        return {
          ...p,
          votes: nextVote >= p.goalVotes ? p.goalVotes : nextVote
        };
      }
      return p;
    }));
  };

  // Support Pledge Fund action
  const handlePledgeInputSelection = (amount: number) => {
    setUserPledgedAmount(prev => ({
      ...prev,
      [activeInvestmentId]: (prev[activeInvestmentId] || 0) + amount
    }));
  };

  const handleExecutePledgeSubmit = () => {
    const amount = userPledgedAmount[activeInvestmentId] || 0;
    if (amount <= 0) {
      alert("투자 약정 금액을 선택하거나 추가해주세요.");
      return;
    }
    
    // Update local state investment totals
    setInvestmentProjects(prev => prev.map(p => {
      if (p.id === activeInvestmentId) {
        return {
          ...p,
          currentAmount: p.currentAmount + amount,
          investorsCount: p.investorsCount + 1
        };
      }
      return p;
    }));

    setShowPledgeSuccess(activeInvestmentId);
    setTimeout(() => {
      setShowPledgeSuccess(null);
    }, 5000);
  };

  // Abalone Jerky Hands-On States & Calculation helpers
  const [activeSlotIdx, setActiveSlotIdx] = useState<number>(0);

  const handlePackSizeChange = (size: number) => {
    setSelectedCustomPackSize(size);
    if (size === 3) {
      setPlatedJerky(prev => prev.slice(0, 3));
      if (activeSlotIdx >= 3) {
        setActiveSlotIdx(0);
      }
    } else {
      setPlatedJerky(prev => {
        const next = [...prev];
        while (next.length < 5) {
          next.push('jerky-1');
        }
        return next;
      });
    }
  };

  const handleAssignFlavorToActiveSlot = (flavorId: string) => {
    setPlatedJerky(prev => {
      const next = [...prev];
      next[activeSlotIdx] = flavorId;
      return next;
    });
    // Advance to next slot automatically for an intuitive UX!
    if (activeSlotIdx < selectedCustomPackSize - 1) {
      setActiveSlotIdx(prev => prev + 1);
    } else {
      setActiveSlotIdx(0); // wrap around
    }
  };

  const currentPlatedFlavors = platedJerky.slice(0, selectedCustomPackSize).map(id => jerkyFlavors.find(f => f.id === id) || jerkyFlavors[0]);
  
  const baseBoxPrice = selectedCustomPackSize === 3 ? 29900 : 49000;
  const customBoxPrice = baseBoxPrice + currentPlatedFlavors.reduce((sum, f) => sum + f.priceMod, 0);

  const avgMetrics = currentPlatedFlavors.reduce((acc, f) => {
    return {
      seaBreeze: acc.seaBreeze + f.metrics.seaBreeze,
      savory: acc.savory + f.metrics.savory,
      sweetness: acc.sweetness + f.metrics.sweetness,
      richness: acc.richness + f.metrics.richness,
    };
  }, { seaBreeze: 0, savory: 0, sweetness: 0, richness: 0 });

  const numFlavors = currentPlatedFlavors.length || 1;
  const calculatedAvg = {
    seaBreeze: Math.round(avgMetrics.seaBreeze / numFlavors),
    savory: Math.round(avgMetrics.savory / numFlavors),
    sweetness: Math.round(avgMetrics.sweetness / numFlavors),
    richness: Math.round(avgMetrics.richness / numFlavors),
  };

  const getPersonaAndDrinks = () => {
    const counts = currentPlatedFlavors.reduce((acc, f) => {
      acc[f.id] = (acc[f.id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const orgCount = counts['jerky-1'] || 0;
    const gamtaeCount = counts['jerky-2'] || 0;
    const perillaCount = counts['jerky-3'] || 0;
    const garlicCount = counts['jerky-4'] || 0;
    const truffleCount = counts['jerky-5'] || 0;

    if (garlicCount + orgCount >= selectedCustomPackSize * 0.6) {
      return {
        persona: '대중적 맥주 혼술형 미식가 (Casual Beer Matcher)',
        desc: '풍부한 단짠 버터향과 담백한 기본 전복포 중심의 구성입니다. 부담 없이 영양이 꽉 찬 밤의 술상 안주로 가장 사랑받는 대중적인 오찬 조합입니다.',
        drinks: '시원한 페일 라거, IPA 에일 맥주, 드라이 하이볼',
      };
    } else if (gamtaeCount + perillaCount >= selectedCustomPackSize * 0.5) {
      return {
        persona: '전통 프리미엄 서포터형 고전 미식 (Traditional Korean Connoisseur)',
        desc: '고소한 저온압착 들기름과 고품격 서해안 감태 가루가 깊게 스며든 한국식 깊은 고급 조합입니다. 장인의 전통미가 도드라져 추석/설 귀한 지인 분 비즈니스 선물이나 명절 보존식에 최적화되어 있습니다.',
        drinks: '한국 전통 한방 증류식 소주 (화요, 안동소주), 따뜻한 마루 백하주',
      };
    } else if (truffleCount >= selectedCustomPackSize * 0.4) {
      return {
        persona: '부티크 홈파티 와인 아방가르드 (Trendy Luxury Wine Enthusiast)',
        desc: '이탈리안 최고급 블랙 트러플 아로마가 가득 지배하는 이색 럭셔리 컬렉션입니다. 사교 파티나 감성 인플루언서 와인 시식 다도회에 최고의 대화 주제가 될 조합입니다.',
        drinks: '프렌치 브뤼 드라이 샴페인, 깊은 아로마의 피노 누아 와인',
      };
    } else {
      return {
        persona: '마켓모움 올라운드 시그니처 밸런스 (Balance Master Collector)',
        desc: '초도 론칭 3종 에디션에 2차 후속 수지까지 모두 아우르는 다채롭고 밸런스 잡힌 럭셔리 컬렉션입니다. 모든 오감과 풍미의 향연을 단계별로 탐닉하고 고수하는 마스터 컬렉터의 선택입니다.',
        drinks: '싱글몰트 맥캘란 스카치 언더락, 한국 프리미엄 증류식 소주',
      };
    }
  };

  const recommendation = getPersonaAndDrinks();

  const activeProject = investmentProjects.find(p => p.id === activeInvestmentId) || investmentProjects[0];

  return (
    <div className="space-y-24 py-6">
      {/* Introduction Magazine-styled Banner */}
      <div className="bg-[#1B4332] text-white p-10 md:p-16 relative overflow-hidden ring-1 ring-white/10">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 hidden lg:block w-1/3">
          <div className="w-full h-full border-l border-white/10 rotate-12 translate-x-24 scale-150 flex items-center justify-center">
            <Compass className="w-64 h-64 text-white animate-spin-slow" />
          </div>
        </div>
        
        <div className="max-w-3xl space-y-6 relative z-10">
          <Badge className="bg-[#D66853] text-white hover:bg-[#D66853]/90 rounded-none tracking-widest font-mono text-[9px] uppercase px-3 py-1">
            Moum Next-Gen Local Commerce Frame
          </Badge>
          <h2 className="text-4xl md:text-6xl magazine-heading font-medium tracking-tight leading-[1.1]">
            단순한 최저가 쇼핑몰이 아닙니다. <br />
            생산자, 정성, 팬덤의 결합.
          </h2>
          <p className="text-xs md:text-base text-[#FAF9F5]/80 font-light leading-relaxed max-w-2xl">
            전국 각지에 숨어 묵묵히 본질을 빚어내는 중소상공인·장인들을 직접 기획·발굴합니다. <br />
            마켓모움은 획일화된 입점 거래를 거부하고, <strong>‘스토리’</strong>를 부여하며, 
            <strong>‘공동 참여형 가격하락 퍼널’</strong>과 실물 상생을 도모하는 <strong>‘소액 시즌 펀딩’</strong> 구조로 e커머스의 영구적 패러다임 시프트를 선언합니다.
          </p>
          <div className="pt-2 flex flex-wrap gap-4 text-xs font-mono text-[#D66853] font-bold">
            <span>✓ 최저가 대량양산 제동 [로컬 큐레이션]</span>
            <span>✓ 선주문 기반 재고 파괴 [퍼널 공동구매]</span>
            <span>✓ 충성 팬덤 보장 리워드 [동천 서포터즈]</span>
          </div>
        </div>
      </div>

      {/* CORE INNOVATION 1: The Premium Framework Comparison Block */}
      <section className="space-y-8 bg-white border border-black/5 p-8 md:p-12 shadow-sm">
        <div className="space-y-3">
          <Badge variant="outline" className="text-[9px] text-[#D66853] border-[#D66853]/30 tracking-widest font-mono uppercase bg-white px-2.5 py-0.5">
            Industry Disruption Map
          </Badge>
          <h3 className="text-3xl magazine-heading text-brand-green font-bold">
            이커머스 시장과의 근본적인 차별화 공식
          </h3>
          <p className="text-xs text-foreground/50 max-w-2xl font-light leading-relaxed">
            기존 이커머스가 중개 수수료와 마케팅 광고권 입찰 경쟁 속에서 단가를 후려칠 때, 
            마켓모움은 장인과의 공동 브랜딩과 예약 협업을 통해 높은 마진과 탄탄한 팬덤을 동시에 구축합니다.
          </p>
        </div>

        {/* COMPARISON SLATE/GRID */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-black/10 text-xs uppercase tracking-widest text-[#1B4332]/50 font-mono">
                <th className="py-4 font-semibold pb-3 w-1/5">차별화 축 (Pillars)</th>
                <th className="py-4 font-semibold pb-3 w-2/5 text-slate-400">기존 이커머스 (쿠팡·오픈마켓 방식)</th>
                <th className="py-4 font-semibold pb-3 w-2/5 text-brand-green font-bold">마켓모움의 지향 가치 (Moum Commerce)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {comparativeFramework.map((item, idx) => (
                <tr key={idx} className="group hover:bg-[#FAF9F5]/40 transition-colors">
                  <td className="py-5 pr-4 align-top">
                    <span className="text-xs font-bold text-[#D66853] font-mono block">0{idx+1}</span>
                    <span className="text-sm font-semibold text-brand-green">{item.pillar}</span>
                  </td>
                  <td className="py-5 pr-8 text-xs text-slate-400 font-light leading-relaxed space-y-1">
                    <div className="flex items-center gap-1.5 font-medium text-slate-500">❌ {item.traditional.split(' ')[0]}</div>
                    <p>{item.traditional}</p>
                  </td>
                  <td className="py-5 text-sm text-brand-green leading-relaxed space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-brand-green">⭐ {item.moum.split(' ')[0]}</div>
                    <p className="font-medium text-brand-green">{item.moum}</p>
                    <p className="text-[11px] text-foreground/50 font-light font-mono">{item.details}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* CORE INNOVATION 2: Gamified Group Buying / Interactive Price-Drop Funnel Campaign */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <Badge variant="outline" className="text-[10px] text-[#D66853] border-[#D66853]/30 tracking-widest font-mono uppercase bg-white px-3 py-1">
            Dynamic Gamified Price Collapse Simulator
          </Badge>
          <h3 className="text-3xl magazine-heading text-brand-green font-bold">
            동적 목표 달성형 공동구매 퍼널 시뮬레이터
          </h3>
          <p className="text-xs text-foreground/50 max-w-xl mx-auto font-light leading-relaxed">
            참여 단골팬이 기하급수적으로 늘어날수록, 유통과 수확비용이 절감되므로 모두가 싸집니다. <br />
            <strong>우측의 시뮬레이터 슬라이더를 직접 올려 보정 체험해 보세요!</strong> 
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left panel: Simulator details and slider */}
          <div className="lg:col-span-12 xl:col-span-7 bg-white border border-black/5 p-6 md:p-8 flex flex-col justify-between space-y-8 shadow-sm">
            
            {/* Top Product Meta & Curation Intro */}
            <div className="space-y-3">
              <div className="flex gap-2 items-center text-xs">
                <span className="text-[#D66853] uppercase font-mono tracking-widest font-semibold flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> 전남 완도군 보길도 명인 콜라보 PB
                </span>
                <span className="text-foreground/20">|</span>
                <span className="text-foreground/50">안혜경 마스터 수작업 에디션</span>
              </div>
              <h4 className="text-2xl magazine-heading text-brand-green font-bold leading-tight">
                [공구 1호] 전통 아날로그 무공성 옹기 참전복장 에디션
              </h4>
              <p className="text-xs text-foreground/60 leading-relaxed font-light">
                완도의 깊은 밤 조차 수작업으로 감지한 참전복만을 수제 가마 가마솥에 데쳐 아날로그 숨쉬는 전식 옹기 항아리에 가두었습니다. 
                중국산 대량 양산제품과 비교할 수 없는 로컬만의 숭고한 보양 미식입니다.
              </p>
            </div>

            {/* Interactive Controller / Slider */}
            <div className="space-y-6 pt-4 border-t border-black/5">
              <div className="flex justify-between items-center">
                <span className="text-[11px] uppercase tracking-widest text-[#D66853] font-mono font-bold flex items-center gap-1.5 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-brand-green block" />
                  실시간 참여 화력(서포터즈): {participants}명 돌파!
                </span>
                <span className="text-xs text-foreground/40 font-mono">참여자 수동 조절 (드래그)</span>
              </div>

              {/* Slider Input */}
              <div className="bg-[#FAF9F5] p-5 border border-black/5 space-y-4 rounded-none">
                <input 
                  type="range" 
                  min="1" 
                  max="600" 
                  value={participants}
                  onChange={(e) => setParticipants(parseInt(e.target.value))}
                  className="w-full accent-brand-green h-2 cursor-pointer bg-slate-200"
                />
                
                <div className="flex justify-between text-[11px] font-mono text-slate-400">
                  <span>1명 (₩39,900)</span>
                  <span>100명 달성 (₩34,900)</span>
                  <span>300명 달성 (₩29,900)</span>
                  <span>500명 돌파 (₩24,900)</span>
                </div>
              </div>

              {/* Graphical Progress Bar showing multi-step price collapse */}
              <div className="space-y-2">
                <div className="w-full bg-[#FAF9F5] h-5 rounded-none overflow-hidden border border-black/5 relative flex">
                  <motion.div 
                    initial={{ width: '0%' }}
                    animate={{ width: `${Math.min((participants / 500) * 100, 100)}%` }}
                    transition={{ type: 'spring', damping: 15 }}
                    className="bg-brand-green h-full relative"
                  />
                  <div className="absolute inset-0 flex justify-between px-2 text-[9px] font-mono font-bold text-foreground/60 leading-5">
                    <span className="text-white z-10 pl-1">사전가 39.9k</span>
                    <span className={`z-10 ${participants >= 100 ? 'text-white' : 'text-foreground/45'}`}>100명 (34.9k)</span>
                    <span className={`z-10 ${participants >= 300 ? 'text-white' : 'text-foreground/45'}`}>300명 (29.9k)</span>
                    <span className={`z-10 ${participants >= 500 ? 'text-white' : 'text-foreground/45'}`}>500명 (24.9k 락다운!)</span>
                  </div>
                </div>
                
                {/* Visual guidance message change dynamically based on slider state */}
                {nextThreshold ? (
                  <p className="text-[11px] font-light text-foreground/50 flex items-center gap-1 pl-1">
                    <AlertCircle className="w-3.5 h-3.5 text-[#D66853]" /> 
                    다음 가격인하 단계까지 단 <strong className="text-brand-green font-medium font-mono">{nextThreshold.count - participants}명</strong> 남았습니다. 
                    (달성 즉시 전원 <strong className="text-brand-green font-semibold">₩{nextThreshold.price.toLocaleString()}</strong> 자동 가격 락다운!)
                  </p>
                ) : (
                  <p className="text-[11px] font-bold text-[#D66853] flex items-center gap-1 pl-1">
                    🎉 최종 목표 500 세트 판매 대기록 달성 완료! 역사상 전례 없는 최고 할인혜택가 ₩24,900이 적용되어 배송됩니다!
                  </p>
                )}
              </div>
            </div>

            {/* Interactive Actions */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-black/5 items-center">
              <button
                onClick={handleJoinProject}
                className={`flex-1 py-4.5 px-6 font-mono text-xs uppercase tracking-widest font-semibold transition-all flex items-center justify-center gap-2 rounded-none border cursor-pointer w-full sm:w-auto ${
                  hasJoined 
                    ? 'bg-[#D66853] border-[#D66853] text-white hover:bg-[#c05743]' 
                    : 'bg-brand-green border-brand-green text-white hover:bg-brand-green/95 shadow-sm'
                }`}
              >
                {hasJoined ? (
                  <>
                    <CheckCircle className="w-4 h-4" /> 나의 서포트 취소하고 정서 가치 하염하기
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-[#FAF9F5] animate-pulse" /> 이 프로젝트 전복장 공구 참여제안 하기
                  </>
                )}
              </button>

              <button 
                onClick={() => {
                  setCopiedLink(true);
                  navigator.clipboard.writeText("마켓모움 기장옹기 전복장 공동구매 가격하락 퍼널에 참여하세요! 많이 모일 수록 다 같이 ₩24,900원으로 싸집니다!");
                  alert("카카오 바이럴용 스토리 스마트 초대 링크가 클립보드에 저온 복사되었습니다!");
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                className="py-4.5 px-6 font-mono text-xs uppercase tracking-widest font-medium border border-black/10 bg-[#FAF9F5] text-brand-green hover:bg-black/5 transition-all text-center rounded-none w-full sm:w-auto cursor-pointer"
              >
                {copiedLink ? "✓ 카카오 초대 링크 복사완료!" : "카카오 친구 초대하기 (₩1,000 하락)"}
              </button>
            </div>
          </div>

          {/* Right panel: "Early Supporter Instant Cashing Refund Calculator" */}
          <div className="lg:col-span-12 xl:col-span-5 bg-[#FAF9F5] border border-brand-green/10 p-6 md:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-[#D66853]" />
                <span className="text-[10px] uppercase font-mono tracking-widest text-[#D66853] font-bold">Early Supporter Protection Policy</span>
              </div>
              <h4 className="text-xl magazine-heading text-brand-green font-bold">
                얼리서포터 '자동 차액 환급제'
              </h4>
              <p className="text-xs font-light text-foreground/60 leading-relaxed">
                "먼저 믿고 가치 후원해주셨기에 비싸게 산 손해는 전무합니다." <br />
                마켓모움은 프로젝트 시작 당시 최고가(39,900원)에 먼저 선결제를 하시고 친구 초대를 유도하셨더라도, 
                <strong>최종 판매량이 많아져 가격이 인하되면 배송일 당일 차액을 10원 틀리지 않고 전액 포인트 환급</strong>해 드립니다.
              </p>
            </div>

            {/* Price Refund Formula Board */}
            <div className="bg-white p-5 border border-black/5 space-y-3.5 font-mono text-xs rounded-none">
              <div className="flex justify-between text-foreground/50">
                <span>① 나의 예약 주문 최고가:</span>
                <span>₩{basePrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-brand-green font-semibold">
                <span>② 실시간 서포터 하락 적용가:</span>
                <span>₩{demoRefund.price.toLocaleString()} (-{Math.round(((basePrice - demoRefund.price)/basePrice)*100)}%)</span>
              </div>
              
              <div className="h-px bg-black/5 my-2"></div>
              
              <div className="flex justify-between text-foreground/75 items-baseline">
                <span>자동 차액 반환금 (100% 반환):</span>
                <span className="text-sm font-bold text-brand-green">+{demoRefund.diff.toLocaleString()} 원</span>
              </div>
              <div className="flex justify-between text-foreground/50 items-baseline">
                <span>얼리버드 선참여 추가 보너스 (20%):</span>
                <span>+{demoRefund.extraBonus.toLocaleString()}P 적립</span>
              </div>

              <div className="bg-[#1B4332]/5 p-3 flex justify-between font-bold text-brand-green items-center mt-2 border-l-2 border-brand-green rounded-none">
                <span className="text-[11px] font-sans">최종 포인트 환급 기대값:</span>
                <span className="text-base">+{demoRefund.total.toLocaleString()}P</span>
              </div>
            </div>

            {/* Info Badge reassurance */}
            <div className="p-3 bg-white border border-brand-green/5 text-[10px] font-light text-foreground/50 leading-relaxed flex gap-2.5 items-start">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                획득 시 환급 전액은 유효 만료 기한의 장벽 없이 마켓모움 모든 팝업매장과 프리미엄 지역 박스에서 제한 없이 현금처럼 전액 차감하여 활용할 수 있습니다.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* CORE INNOVATION 3: INTERACTIVE "SO-AEK INVESTMENT / PRE-ORDER SEASON FUNDING" (소액 생산자 투자 커뮤니티형 구조) */}
      <section className="space-y-8 bg-[#FDFCF8] border border-black/5 p-8 md:p-12 relative overflow-hidden">
        {/* Decorative badge overlay */}
        <div className="absolute top-0 right-0 p-8 opacity-5 font-mono text-[100px] font-bold text-[#D66853] pointer-events-none">
          FUND
        </div>

        <div className="max-w-3xl space-y-3">
          <Badge className="bg-[#D66853]/10 text-[#D66853] hover:bg-[#D66853]/20 rounded-none tracking-widest font-mono text-[9px] uppercase px-2.5 py-0.5">
            Investment Connection
          </Badge>
          <h3 className="text-3xl magazine-heading text-brand-green font-bold">
            생산자를 돕는 예약 투자형 리워드 커뮤니티 (PB 전초기지)
          </h3>
          <p className="text-xs text-foreground/50 max-w-2xl font-light leading-relaxed">
            금융위의 엄격한 자본 규제를 영리하게 전사 우회하기 위하여, 초기에는 <strong>‘시즌 한정 원물 사전 예약’</strong> 및 
            <strong>‘수확 사료비 소액 크라우드 선결제’</strong> 형태로 구현됩니다. 
            소비자는 다음 수확 가치를 지지하고 리스크를 줄인 덕에 상상 불가능한 높은 비율의 실물 보상과 로컬 환급 리워드를 획득합니다.
          </p>
        </div>

        {/* Dynamic Interactive Investment Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch pt-6">
          
          {/* Left Project selector and detail card */}
          <div className="lg:col-span-12 xl:col-span-7 space-y-6">
            <div className="flex gap-2">
              {investmentProjects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setActiveInvestmentId(p.id);
                  }}
                  className={`px-5 py-3 text-xs font-mono font-bold transition-all border rounded-none cursor-pointer ${
                    activeInvestmentId === p.id 
                      ? 'bg-brand-green text-white border-brand-green shadow-sm' 
                      : 'bg-white text-slate-400 border-black/5 hover:text-brand-green'
                  }`}
                >
                  {p.id === 'inv-1' ? '🐟 1. 완도 장어양식장' : '🍊 2. 제주 조천 감귤농장'}
                </button>
              ))}
            </div>

            {/* Main Project Details Board */}
            <div className="bg-white border border-black/5 p-6 space-y-6">
              <div className="relative aspect-video overflow-hidden">
                <img 
                  src={activeProject.image} 
                  alt={activeProject.title} 
                  className="w-full h-full object-cover grayscale-[15%] brightness-90"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-6 text-white space-y-1">
                  <span className="text-[9px] font-mono tracking-widest text-[#D66853] font-bold">ACTIVE LOCAL TARGET SEED</span>
                  <h4 className="text-xl font-bold font-sans tracking-tight">{activeProject.title}</h4>
                  <p className="text-xs font-light text-slate-300">지역 거점: {activeProject.location} | 호스트: {activeProject.producer}</p>
                </div>
              </div>

              {/* Status parameters */}
              <div className="grid grid-cols-3 gap-4 text-center font-mono py-4 bg-[#FAF9F5] border-y border-black/5">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 block uppercase">시즌 목표 투자금</span>
                  <strong className="text-sm text-brand-green">₩{activeProject.targetAmount.toLocaleString()}</strong>
                </div>
                <div className="space-y-1 border-x border-black/5">
                  <span className="text-[10px] text-slate-400 block uppercase">현재 누적 약정금</span>
                  <strong className="text-sm font-bold text-brand-green">
                    ₩{activeProject.currentAmount.toLocaleString()} 
                    <span className="text-[10px] text-[#D66853] ml-1 bg-[#D66853]/5 px-1.5 py-0.5">
                      ({Math.round((activeProject.currentAmount / activeProject.targetAmount) * 100)}%)
                    </span>
                  </strong>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 block uppercase">참여 엔젤 투자자</span>
                  <strong className="text-sm text-[#D66853]">{activeProject.investorsCount}명 대동</strong>
                </div>
              </div>

              <div className="space-y-3">
                <h5 className="text-xs font-mono font-bold text-[#D66853] uppercase flex items-center gap-1">
                  <Award className="w-4 h-4" /> 리워드 세부 수탁 플랜 (Reward Structure)
                </h5>
                <p className="text-xs text-foreground/80 font-light leading-relaxed bg-[#1B4332]/5 p-4 border-l-2 border-brand-green italic">
                  "{activeProject.rewardPlan}"
                </p>
                <div className="flex justify-between items-center text-[11px] text-foreground/50 pt-1">
                  <span>체크 예정 실질 영구 투자 실현 수익률 지대:</span>
                  <span className="font-semibold text-brand-green underline">{activeProject.expectedReturn}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right interactive calculator widget */}
          <div className="lg:col-span-12 xl:col-span-5 bg-brand-green text-white p-6 md:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <span className="text-[9px] uppercase tracking-widest text-[#D66853] font-bold block">Interactive Pledger</span>
              <h4 className="text-xl magazine-heading font-bold text-brand-ivory leading-snug">
                정밀 소액 엔젤투자 참여 계산기
              </h4>
              <p className="text-xs text-brand-ivory/80 font-light leading-relaxed">
                생산 수확 전에 수확 단말비를 저온 선지원하여 장인의 영리 활동을 직접 서원합니다. 
                원하는 사전 참여 금액을 누르고 리워드 획득 예측 데이터를 체험해 보세요.
              </p>
            </div>

            {/* Quick interactive Selector */}
            <div className="space-y-4">
              <label className="text-[10px] font-mono text-brand-ivory/60 block uppercase">내가 서약할 임시 예약 투자금 선택</label>
              <div className="grid grid-cols-3 gap-2">
                {[10000, 30000, 50000].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => handlePledgeInputSelection(amt)}
                    className="py-3 text-xs font-mono font-bold border border-white/20 bg-white/5 hover:bg-white/15 transition-all text-center rounded-none cursor-pointer"
                  >
                    +{amt.toLocaleString()}원
                  </button>
                ))}
              </div>

              {/* Total display of custom selection */}
              <div className="bg-white/10 p-5 border border-white/10 space-y-3 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-white/60">선택한 총 모액 지원금:</span>
                  <span className="text-sm font-bold text-brand-ivory">₩{(userPledgedAmount[activeInvestmentId] || 0).toLocaleString()} 원</span>
                </div>
                <div className="flex justify-between text-[#D66853] font-bold">
                  <span>획득 예상 로컬 배당 포인트 (6%):</span>
                  <span>+{(Math.floor((userPledgedAmount[activeInvestmentId] || 0) * 0.06)).toLocaleString()} P</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">제공 예정 실물 리워드:</span>
                  <span className="font-sans text-[11px] text-[#FAF9F5] text-right max-w-[180px] font-light">
                    {(userPledgedAmount[activeInvestmentId] || 0) > 0 
                      ? `${activeProject.producer.split(' ')[0]} 명인 가을 직배송 한글 목합 콜라보 패키지 보전권 확보!`
                      : '금액을 선택해 리워드를 예측해 보세요.'}
                  </span>
                </div>
              </div>
            </div>

            {/* Pledge Submit status trigger */}
            <div className="space-y-4">
              <button
                onClick={handleExecutePledgeSubmit}
                className="w-full bg-[#D66853] hover:bg-[#c05743] text-white py-4 text-xs font-mono uppercase tracking-widest font-bold transition-all rounded-none cursor-pointer"
              >
                🤝 소액 예약투자 약정 확인 서명하기 (Submit Pledge)
              </button>

              <AnimatePresence>
                {showPledgeSuccess === activeInvestmentId && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="p-4 bg-white/10 border border-white/20 text-[11px] font-light text-brand-ivory/90 leading-relaxed text-center"
                  >
                    🎉 축하합니다! 귀하는 <strong>{activeProject.producer}</strong> 명인의 정식 엔젤 서포터 멤버로 시스템에 임시 전임 등제되었습니다! <br />
                    베타 정밀 통합 장막 가동 시 예약 순위에 맞춰 로컬 영수증이 정식 발급됩니다.
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* STRATEGIC BRANDING ACTION: Wando Handcrafted Abalone Jerky Showcase & DIY Tastemaker Box */}
      <section className="space-y-8 bg-white border border-black/5 p-8 md:p-12 shadow-sm relative overflow-hidden">
        {/* Decorative watermarked background */}
        <div className="absolute -right-16 -top-16 opacity-5 font-mono text-[140px] font-bold text-[#1B4332] pointer-events-none rotate-12 select-none">
          JERKY
        </div>

        {/* Headings */}
        <div className="space-y-3 max-w-4xl relative z-10">
          <Badge className="bg-[#D66853] text-white hover:bg-[#D66853]/90 rounded-none tracking-widest font-mono text-[9px] uppercase px-2.5 py-0.5">
            Product Curation Experiment
          </Badge>
          <h3 className="text-3xl magazine-heading text-brand-green font-bold">
            완도 참전복 수작 '전복포' 5종 컬렉션 & 기획 실증 플레이트
          </h3>
          <p className="text-xs text-foreground/60 leading-relaxed font-light">
            전복포를 귀한 마른안주 및 고급 보양 건강 간식으로 기획해 보자는 생산업 자문이 마켓모움에 입고되었습니다. <br />
            초기 생산 시의 재고 리스크와 출혈을 경감하기 위해 <strong>[오리지널, 참기름+감태, 갈릭버터] 3종을 우선 론칭하여 시장 반응을 정밀 검증</strong>하고, 
            후속하여 <strong>[들깨들기름, 트러플] 2종 맛을 추가 드랍</strong>하는 영리한 유통 로드맵을 구축했습니다.
            <br />
            아래 스마트 구성기에서 <strong>기프트 포장 규격(3구 / 5구)</strong>을 선택한 후, 트레이의 슬롯을 골라 5가지 시그니처 배합 구성을 실시간 큐레이션해 보십시오.
          </p>
        </div>

        {/* Outer Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 pt-4 items-stretch relative z-10">
          
          {/* LEFT: Box Size Selector & DIY Platted Tray Visualizer */}
          <div className="lg:col-span-12 xl:col-span-8 space-y-8 flex flex-col justify-between">
            <div className="space-y-6">
              {/* Size Select button header */}
              <div className="flex flex-col sm:flex-row gap-4 items-baseline justify-between pb-3 border-b border-black/5">
                <span className="text-xs font-mono font-bold text-[#D66853] uppercase tracking-wider flex items-center gap-1.5">
                  <Gift className="w-4 h-4 text-[#D66853]" /> 1단계. 기프트 시식 컬렉션 포장 규격 선택:
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePackSizeChange(3)}
                    className={`px-4 py-2 text-xs font-mono font-bold border transition-all cursor-pointer ${
                      selectedCustomPackSize === 3 
                        ? 'bg-brand-green border-brand-green text-white font-semibold' 
                        : 'bg-[#FAF9F5] border-black/5 text-slate-400 hover:text-brand-green'
                    }`}
                  >
                    3구 테이스팅 스타터 (₩29,900~)
                  </button>
                  <button
                    onClick={() => handlePackSizeChange(5)}
                    className={`px-4 py-2 text-xs font-mono font-bold border transition-all cursor-pointer ${
                      selectedCustomPackSize === 5 
                        ? 'bg-brand-green border-brand-green text-white font-semibold' 
                        : 'bg-[#FAF9F5] border-black/5 text-slate-400 hover:text-brand-green'
                    }`}
                  >
                    5구 프리미엄 마스터팩 (₩49,000~)
                  </button>
                </div>
              </div>

              {/* Graphic Platter Box Tray Representation with active slot mechanism! */}
              <div className="bg-[#FAF9F5] border border-black/5 p-6 md:p-8 space-y-4 rounded-none text-center">
                <div className="flex justify-between items-center text-xs font-mono text-slate-400 pb-2">
                  <span>선택된 포장 목재: 명인 각인 수제 오동함</span>
                  <span>상자 내부 슬롯을 클릭해 맛 투입 대기</span>
                </div>

                {/* Gourmet placements */}
                <div className="flex flex-wrap justify-center gap-4 py-4">
                  {Array.from({ length: selectedCustomPackSize }).map((_, idx) => {
                    const assignedFlavor = jerkyFlavors.find(f => f.id === platedJerky[idx]) || jerkyFlavors[0];
                    const isActive = activeSlotIdx === idx;
                    
                    return (
                      <motion.div
                        key={idx}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => setActiveSlotIdx(idx)}
                        className={`w-32 md:w-36 p-4 border flex flex-col justify-between aspect-square cursor-pointer transition-all relative select-none ${
                          isActive 
                            ? 'bg-white border-[#D66853] ring-2 ring-[#D66853]/20 shadow-sm' 
                            : 'bg-white border-black/5 hover:border-brand-green/30'
                        }`}
                      >
                        {/* Circle slot decorator */}
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-mono text-slate-400 font-semibold">슬롯 0{idx+1}</span>
                          <span className={`w-2.5 h-2.5 rounded-full ${assignedFlavor.color}`} />
                        </div>

                        {/* Text details */}
                        <div className="text-center py-2">
                          <p className="text-[11px] font-sans font-bold leading-tight line-clamp-2 text-brand-green">
                            {assignedFlavor.name.split(' ')[0]} <br />
                            <span className="text-[9px] text-foreground/45 font-light block mt-0.5 font-sans leading-none">{assignedFlavor.name.split(' ').slice(1).join(' ') || '기본공'}</span>
                          </p>
                        </div>

                        {/* Selection check indicator */}
                        <div className="flex justify-between items-end">
                          <span className="text-[9px] font-mono text-slate-400 font-bold">
                            {assignedFlavor.priceMod > 0 ? `+₩${assignedFlavor.priceMod.toLocaleString()}` : '기본'}
                          </span>
                          <Badge variant="outline" className={`text-[8px] rounded-none px-1 py-0 border-none leading-none ${
                            assignedFlavor.phase === 1 ? 'text-emerald-700 bg-emerald-50' : 'text-indigo-800 bg-indigo-50'
                          }`}>
                            {assignedFlavor.phase === 1 ? '1차' : '2차'}
                          </Badge>
                        </div>

                        {/* Top corner active pin */}
                        {isActive && (
                          <span className="absolute -top-1.5 -right-1.5 bg-[#D66853] text-[8px] text-white font-mono px-1.5 py-0.5 rounded-none uppercase font-bold animate-pulse shadow-sm">
                            Active
                          </span>
                        )}
                      </motion.div>
                    );
                  })}
                </div>

                <p className="text-[11px] font-light text-foreground/50">
                  💡 명품 전복포의 맛을 변경하려면, <strong>원하시는 슬롯 상자를 고르고 아래의 5가지 시그니처 레시피 중 하나를 탭</strong> 하십시오. 자동으로 다음 슬롯이 켜집니다.
                </p>
              </div>
            </div>

            {/* Flavor Options Selection Grid */}
            <div className="space-y-4">
              <span className="text-xs font-mono font-bold text-[#D66853] uppercase tracking-wider block">
                2단계. 품평회용 완도 전복포 5가지 맛 레시피 발굴단 (슬롯 입력):
              </span>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {jerkyFlavors.map((flavor) => {
                  const isPhase1 = flavor.phase === 1;
                  return (
                    <button
                      key={flavor.id}
                      onClick={() => handleAssignFlavorToActiveSlot(flavor.id)}
                      className={`text-left p-3.5 border transition-all rounded-none cursor-pointer flex flex-col justify-between h-52 hover:shadow-md ${
                        selectedJerkyId === flavor.id 
                          ? 'border-brand-green bg-[#F7F6EE]/30' 
                          : 'border-black/5 bg-white'
                      }`}
                      onMouseEnter={() => setSelectedJerkyId(flavor.id)}
                    >
                      <div className="space-y-1.5 w-full">
                        <div className="flex justify-between items-center w-full">
                          <span className={`text-[8px] rounded-none px-1.5 py-0.5 font-bold uppercase ${
                            isPhase1 
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' 
                              : 'bg-indigo-50 text-indigo-900 border border-indigo-100'
                          }`}>
                            {flavor.phaseLabel.split(' ')[0]}
                          </span>
                          <span className="text-[9px] text-[#D66853] font-mono font-bold">
                            {flavor.priceMod > 0 ? `+${flavor.priceMod.toLocaleString()}` : '기본가'}
                          </span>
                        </div>
                        <h5 className="text-xs font-bold text-brand-green font-sans leading-tight">{flavor.name}</h5>
                        <p className="text-[10px] text-foreground/50 font-light line-clamp-4 leading-snug">{flavor.description}</p>
                      </div>

                      <div className="pt-2 w-full border-t border-black/5 flex justify-between items-center text-[9px] font-mono text-slate-400">
                        <span>추천 페어링</span>
                        <span className="truncate text-right max-w-[80px] font-semibold text-brand-green">{flavor.pairing.split(',')[0]}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT: Analytical Dashboard & Target Assessment */}
          <div className="lg:col-span-12 xl:col-span-4 bg-[#FAF9F5] border border-brand-green/10 p-6 md:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#D66853]" />
                <span className="text-[10px] uppercase font-mono tracking-widest text-[#D66853] font-bold">Dynamic Flavor Analytics</span>
              </div>
              <h4 className="text-xl magazine-heading text-brand-green font-bold">
                실시간 박스 품평 분석기
              </h4>
              <p className="text-xs font-light text-foreground/60 leading-relaxed">
                중소 소상공인 전복 특산품은 재고 관리와 앙상블 가격 조율이 생존 비결입니다. 
                내가 설계한 큐레이션 세트의 미식 성향 점수와 AI 페어링 지수를 즉시 분석해 마케터 관점으로 제안합니다.
              </p>
            </div>

            {/* Simulated Radar-like attributes bar graph */}
            <div className="space-y-3 pt-2">
              <span className="text-[10px] font-mono font-bold text-[#D66853] block uppercase tracking-wider">나의 세트 배합 평점:</span>
              <div className="bg-white p-4 border border-black/5 space-y-3">
                
                {/* Metric 1 */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-foreground/60">
                    <span>• 바다향 아로마 (Ocean Scent)</span>
                    <span className="font-semibold">{calculatedAvg.seaBreeze}%</span>
                  </div>
                  <div className="w-full bg-[#FAF9F5] h-1.5 rounded-none overflow-hidden border border-black/5">
                    <motion.div 
                      key={calculatedAvg.seaBreeze} 
                      initial={{ width: 0 }} 
                      animate={{ width: `${calculatedAvg.seaBreeze}%` }} 
                      className="bg-teal-600 h-full" 
                    />
                  </div>
                </div>

                {/* Metric 2 */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-foreground/60">
                    <span>• 고소한 바디감 (Savory Tone)</span>
                    <span className="font-semibold">{calculatedAvg.savory}%</span>
                  </div>
                  <div className="w-full bg-[#FAF9F5] h-1.5 rounded-none overflow-hidden border border-black/5">
                    <motion.div 
                      key={calculatedAvg.savory} 
                      initial={{ width: 0 }} 
                      animate={{ width: `${calculatedAvg.savory}%` }} 
                      className="bg-amber-600 h-full" 
                    />
                  </div>
                </div>

                {/* Metric 3 */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-foreground/60">
                    <span>• 단짠 대중성 (Sweet & Savory)</span>
                    <span className="font-semibold">{calculatedAvg.sweetness}%</span>
                  </div>
                  <div className="w-full bg-[#FAF9F5] h-1.5 rounded-none overflow-hidden border border-black/5">
                    <motion.div 
                      key={calculatedAvg.sweetness} 
                      initial={{ width: 0 }} 
                      animate={{ width: `${calculatedAvg.sweetness}%` }} 
                      className="bg-[#D66853] h-full" 
                    />
                  </div>
                </div>

                {/* Metric 4 */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-foreground/60">
                    <span>• 천연 감칠맛 (Rich Gluten)</span>
                    <span className="font-semibold">{calculatedAvg.richness}%</span>
                  </div>
                  <div className="w-full bg-[#FAF9F5] h-1.5 rounded-none overflow-hidden border border-black/5">
                    <motion.div 
                      key={calculatedAvg.richness} 
                      initial={{ width: 0 }} 
                      animate={{ width: `${calculatedAvg.richness}%` }} 
                      className="bg-purple-950 h-full" 
                    />
                  </div>
                </div>

              </div>
            </div>

            {/* Dynamic Assessment box */}
            <div className="bg-white p-4 border border-black/5 space-y-2.5 font-mono text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">판정된 홍보 전략 페르소나</span>
                <strong className="text-xs text-brand-green font-bold font-sans">{recommendation.persona}</strong>
              </div>
              <p className="text-[10px] text-foreground/60 font-sans leading-relaxed font-light border-y border-black/5 py-2">
                {recommendation.desc}
              </p>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">미식 페어링 시너지 주종</span>
                <strong className="text-xs text-[#D66853] font-bold font-sans">🍾 {recommendation.drinks}</strong>
              </div>
            </div>

            {/* Final Calculation of Custom Box Price */}
            <div className="space-y-3">
              <div className="flex justify-between text-xs font-mono font-bold text-[#D66853] uppercase tracking-wider">
                <span>실제 세트 가치 대지:</span>
                <span>총 {selectedCustomPackSize}구 세트</span>
              </div>
              
              <div className="bg-[#1B4332] text-white p-4 flex justify-between font-bold items-center rounded-none shadow-sm pb-5">
                <span className="text-xs font-sans tracking-tight">수작 전복포 묶음 특가:</span>
                <div className="text-right">
                  <span className="text-lg font-mono">₩{customBoxPrice.toLocaleString()}</span>
                  <span className="text-[9px] font-mono block text-[#FAF9F5]/60 leading-none">5% 로컬 포인트 별도 적립</span>
                </div>
              </div>
            </div>

            {/* Submit Action */}
            <div className="space-y-3">
              <button
                onClick={() => {
                  setJerkyPreorderStatus(true);
                  setTimeout(() => setJerkyPreorderStatus(false), 6000);
                }}
                className="w-full bg-[#D66853] hover:bg-[#c05743] text-white py-4 text-xs font-mono uppercase tracking-widest font-bold transition-all rounded-none cursor-pointer"
              >
                🤝 이 조합 그대로 베타 시식단 신청 및 알림받기
              </button>

              <AnimatePresence>
                {jerkyPreorderStatus && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="p-4 bg-white border border-brand-green/20 text-[11px] text-[#1B4332] leading-relaxed text-center font-sans font-light"
                  >
                    🎉 <strong>고품격 똠전 조합 가치 접수 완료!</strong> <br />
                    [{recommendation.persona.split(' ')[0]}] 성향으로 예비 신청되었습니다! <br />
                    베타 드랍 생산 시 <strong>얼리버드 10% 추가 환급 메일</strong>을 가장 신속히 발송합니다.
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </div>
      </section>

      {/* CORE INNOVATION 3: Hidden Local Small Business finder / voting system (생산자 발굴형) */}
      <section className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-baseline gap-4">
          <div>
            <Badge variant="outline" className="text-[10px] text-[#1B4332] border-[#1B4332]/30 tracking-widest font-mono uppercase bg-white px-3 py-1">
              Active Discovery & Incubation Stand
            </Badge>
            <h3 className="text-3xl magazine-heading text-[#1B4332] font-bold mt-2">
              숨은 지역 생산자·중소상공인 영성 가판대
            </h3>
          </div>
          <p className="text-xs text-foreground/50 max-w-sm font-light leading-relaxed">
            전국 각지를 돌며 플랫폼 기획팀이 검증한 명인 가판대입니다. <br />
            유저들이 합심하여 <strong>목표 투표수</strong>에 닿으면 마켓모움 패키징 크리에이터가 개입해, 
            <strong>스토리 입힌 프리미엄 콜라보 PB</strong>를 한정 생산 론칭합니다!
          </p>
        </div>

        {/* 2x2 Bento grid for dynamic high-end local producers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {producers.map((prod) => {
            const isFull = prod.votes >= prod.goalVotes;
            const progressPercent = Math.min((prod.votes / prod.goalVotes) * 100, 100);
            
            return (
              <div 
                key={prod.id} 
                className="bg-white border border-black/5 flex flex-col justify-between overflow-hidden shadow-sm hover:border-brand-green/30 transition-all rounded-none"
              >
                <div className="relative aspect-video bg-[#F3F1E7] overflow-hidden">
                  <img 
                    src={prod.image} 
                    alt={prod.name} 
                    className="w-full h-full object-cover grayscale-[15%] hover:grayscale-0 transition-all duration-750"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent"></div>
                  
                  {/* Geographic and Artisan details overlay */}
                  <div className="absolute top-4 left-4 flex gap-1.5 items-center bg-white/95 text-brand-green text-[9px] tracking-widest uppercase font-mono py-1 px-2.5 shadow-sm font-semibold">
                    <MapPin className="w-3 h-3 text-[#D66853]" /> {prod.location}
                  </div>

                  <span className="absolute top-4 right-4 bg-[#D66853] text-white text-[8px] tracking-[0.2em] font-mono uppercase py-1 px-2.5 font-bold">
                    {prod.highlightTag}
                  </span>

                  {/* Text inside cover */}
                  <div className="absolute bottom-5 left-6 right-6 text-white space-y-1">
                    <p className="text-[9px] text-white/60 tracking-widest font-mono uppercase font-light">SPECIALTY. {prod.specialty}</p>
                    <h5 className="text-2xl magazine-heading font-serif tracking-tight font-medium italic">
                      {prod.name} 마스터의 "{prod.title.split(' ').slice(-1).join(' ')}"
                    </h5>
                  </div>
                </div>

                {/* Narrative Detail of curation */}
                <div className="p-6 space-y-5">
                  <div className="space-y-2">
                    <span className="text-[9px] font-mono uppercase tracking-widest text-foreground/40 block">The Hidden Story (지역의 이야기)</span>
                    <p className="text-sm font-bold text-brand-green leading-snug">{prod.title}</p>
                    <p className="text-xs font-light text-foreground/60 leading-relaxed">{prod.narrative}</p>
                  </div>

                  {/* Interactive Curation Voting slider */}
                  <div className="space-y-3 pt-4 border-t border-black/5">
                    <div className="flex justify-between items-baseline text-xs">
                      <span className="font-mono font-medium flex items-center gap-1">
                        <Heart className={`w-3.5 h-3.5 ${isFull ? 'text-brand-terracotta fill-brand-terracotta' : 'text-foreground/30'}`} />
                        현재 응원 득표: {prod.votes} / {prod.goalVotes}표
                      </span>
                      <span className="text-[10px] font-mono text-brand-green font-bold">
                        {Math.round(progressPercent)}% 달성
                      </span>
                    </div>

                    {/* Miniature Progress Slider */}
                    <div className="w-full bg-[#FAF9F5] h-2 rounded-none overflow-hidden border border-black/5">
                      <div 
                        className={`h-full ${isFull ? 'bg-[#D66853]' : 'bg-brand-green'}`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>

                    {/* Click Support Action */}
                    <button
                      onClick={() => handleSupportVote(prod.id)}
                      disabled={isFull}
                      className={`w-full py-3.5 px-4 font-mono text-[10px] uppercase tracking-widest font-semibold transition-all border text-center rounded-none cursor-pointer ${
                        isFull 
                          ? 'bg-[#1B4332]/5 border-black/5 text-foreground/35' 
                          : 'bg-white border-brand-green text-brand-green hover:bg-brand-green hover:text-white'
                      }`}
                    >
                      {isFull ? (
                        '✓ 발굴 목표 완료! 기획팀 브랜딩 개시 및 PB 독점개발 가판 생성 중!'
                      ) : (
                        '♥ 이 숨은 명인에게 1표 응원 가산하기'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CORE INNOVATION 4: Fandom Membership & Premium Tasting Club (회원제 및 등급 퍼널 구조) */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <Badge variant="outline" className="text-[10px] text-brand-green border-brand-green/30 tracking-widest font-mono uppercase bg-white px-3 py-1">
            Moum Fandom Alliance Members-Only
          </Badge>
          <h3 className="text-3xl magazine-heading text-brand-green font-bold">
            마켓모움 로컬 미식 멤버십 동맹
          </h3>
          <p className="text-xs text-foreground/50 max-w-xl mx-auto font-light leading-relaxed">
            무료배송 혜택만 던져주는 획일적 쿠팡식 와우멤버십에 피로하셨나요? <br />
            마켓모움은 산지우선 예약권, 로컬 희귀 드랍, 분기 무료 시식키트, 명인 다도 오프라인 초청으로 무장한 깊은 가치 연대를 제공합니다.
          </p>
        </div>

        {/* Three tier grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch pt-4">
          {membershipTiers.map((tier, idx) => (
            <div 
              key={idx} 
              className={`border p-6 md:p-8 flex flex-col justify-between space-y-8 rounded-none transition-all hover:shadow-md ${tier.color}`}
            >
              <div className="space-y-6">
                {/* Header indicators */}
                <div className="flex justify-between items-start">
                  <Badge className={`rounded-none text-[8px] uppercase tracking-widest px-2.5 py-1 ${
                    tier.badge === 'Green Grass' 
                      ? 'bg-foreground/50 text-white' 
                      : tier.badge === 'Local Supporter' 
                      ? 'bg-brand-green text-white' 
                      : 'bg-[#D66853] text-white'
                  }`}>
                    {tier.badge}
                  </Badge>
                  <span className="text-sm font-light text-foreground/40 font-mono">0{idx + 1}</span>
                </div>

                {/* Level details */}
                <div className="space-y-1">
                  <h4 className="text-lg font-bold text-brand-green tracking-tight font-sans">{tier.name}</h4>
                  <div className="flex items-baseline gap-1 pt-1">
                    <span className="text-3xl font-serif text-brand-green font-medium">{tier.price}</span>
                    <span className="text-[10px] text-[#D66853] font-mono tracking-widest font-semibold uppercase">{tier.price !== '무료' && '/ 매월'}</span>
                  </div>
                  <p className="text-xs font-light text-foreground/60 leading-normal pt-2">{tier.desc}</p>
                </div>

                <div className="h-px bg-black/5" />

                {/* Perks listings */}
                <div className="space-y-3.5">
                  <span className="text-[9px] uppercase tracking-widest text-[#D66853] font-mono font-bold block">독점 혜택권 (Perks)</span>
                  <ul className="space-y-2.5">
                    {tier.perks.map((p, pIdx) => (
                      <li key={pIdx} className="text-xs font-light text-foreground/80 flex items-start gap-2.5 leading-relaxed">
                        <CheckCircle className={`w-4 h-4 shrink-0 mt-0.5 ${idx === 2 ? 'text-[#D66853]' : 'text-brand-green'}`} />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action buttons */}
              <button 
                onClick={() => alert(`[${tier.name}] 멤버십 연대가 임시 신청되었습니다. 전국 장인 발굴 및 스토리 커머스가 고화질 가동되는 즉시 최고 우대 혜택 바우처를 전해 드립니다!`)}
                className={`w-full py-4.5 font-mono text-xs uppercase tracking-widest font-bold transition-all text-center rounded-none cursor-pointer ${
                  idx === 1 
                    ? 'bg-brand-green text-white hover:bg-[#153427] shadow-sm' 
                    : idx === 2 
                    ? 'bg-[#D66853] text-white hover:bg-[#c05743] shadow-sm'
                    : 'bg-white border border-black/10 text-brand-green hover:bg-black/5'
                }`}
              >
                {idx === 0 ? '기본 연대 시작' : `${tier.name} 동맹 합류하기`}
              </button>
            </div>
          ))}
        </div>

        {/* Dynamic Interactive element: Interactive "This Month's Curation Box Preview" */}
        <div className="bg-[#FAF9F5] border border-black/10 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-8 rounded-none">
          <div className="space-y-3 max-w-xl">
            <span className="text-[9px] uppercase tracking-[0.25em] text-[#D66853] font-mono font-bold block flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#D66853]" /> 2026년 6월 ‘이달의 장인 실물로컬 박스’ 공개구성
            </span>
            <h4 className="text-xl magazine-heading text-brand-green leading-snug">
              "지리산 봄안개 표고와 옹기 전복이 빚은 미식 앙상블"
            </h4>
            <p className="text-xs font-light text-foreground/60 leading-relaxed">
              프리미엄 장인클럽 멤버 및 로컬 정기 서포터(산지친구) 등급 한정으로 출하되는 실물 짚풀 오동 상자입니다. 
              기장 장석조 명인의 옻독 다시마 원판 2개입, 완도 안혜경 명인의 백자항 전복장 진상품, 통영 김옥순 할머니의 은밀하게 구운 건조 멸치가 
              전부 친환경 충전재에 싸여 무료 도출 배송됩니다.
            </p>
          </div>

          <div className="bg-white p-5 border border-black/5 text-xs font-mono w-full md:w-80 shrink-0 space-y-3.5 rounded-none shadow-sm">
            <h5 className="font-sans font-bold text-center text-brand-green pb-2 border-b border-black/5">실물 가치 계산서 (98% 고정)</h5>
            <ul className="space-y-2 text-foreground/70 text-[11px]">
              <li className="flex justify-between"><span>• 안혜경 장인 전복장 콜라보 완품 (3구)</span><strong>₩55,000 상당</strong></li>
              <li className="flex justify-between"><span>• 기장 명인 옻독 자염 다시마 (1세트)</span><strong>₩18,000 상당</strong></li>
              <li className="flex justify-between"><span>• 지리산 참나무 백화고 버섯 (100g)</span><strong>₩12,000 상당</strong></li>
              <li className="flex justify-between"><span>• 수작업 원목 명인 각인 오동나무함</span><strong>패키지 무상 증명</strong></li>
            </ul>
            <div className="h-px bg-black/5" />
            <div className="text-center text-[10px] text-brand-green bg-brand-green/5 p-2 font-sans italic font-bold">
              총 합계 ₩85,000 원당 가치 구성 → 정기 VIP 전액 0원!
            </div>
          </div>
        </div>
      </section>

      {/* Core Summary concluding banner of user pride values */}
      <div className="border border-dashed border-black/10 bg-white p-8 md:p-12 text-center text-xs space-y-4 max-w-3xl mx-auto rounded-none">
        <Sparkles className="w-6 h-6 text-[#D66853] mx-auto animate-pulse" />
        <p className="font-serif italic text-base text-brand-green leading-relaxed max-w-xl mx-auto">
          “생산자는 자랑스럽게 제조와 성실성에만 전념을 다하고, <br />
          플랫폼은 그들이 지닌 깊은 가치와 세기를 매거진처럼 아름답게 가공하여 전국의 단골 팬덤과 연결합니다.”
        </p>
        <p className="text-[10px] uppercase font-mono tracking-widest text-foreground/45 leading-relaxed font-bold">
          이것이 마켓모움이 정의하는 차세대 로컬 상생 커머스 플랫폼의 소박하고도 원대한 사명입니다.
        </p>
      </div>
    </div>
  );
}
