import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Clock, Star, Copy, X, ShoppingBag, Compass, Store, Award, CheckCircle, ShieldCheck } from 'lucide-react';
import { ScrollReveal } from './components/Animated';
import { PRODUCTS, BRAND_PACKAGES } from './constants';
import { Link } from 'react-router-dom';
import LocalCurationHub from './components/LocalCurationHub';
import MarketingCalendar from './components/MarketingCalendar';
import SellerApplyForm from './components/SellerApplyForm';
import chaeBuGonImg from './assets/images/chae_bu_gon_1780579137325.png';
import wandoNatureScenicImg from './assets/images/wando_nature_scenic_1780581340577.png';

const MDS_DATA = [
  {
    id: "md-1",
    name: "김도경 수석 바이어",
    englishName: "Doh-kyung Kim",
    role: "수석 신선식품 전문 큐레이터",
    formerCompany: "전 현대백화점 압구정본점 신선식품 수석 MD",
    experience: "식품 유통 기획 15년 신선 원물 장인",
    image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=500&auto=format&fit=crop",
    quote: "“산지의 온도가 고스란히 밥상에 당도할 때, 비로소 유통은 하나의 예술이 됩니다. 저는 크기나 가격이 아닌, 흙의 지속 가능성과 생산자의 굳은 장인 심지를 검증합니다.”",
    philosophy: "천연 무농약 경작 시스템 and 전통 상생 생태계 회복을 최우선 시 합니다. 생산 현장의 일주일 위생 습관 및 대대로 내려오는 숙성 비책을 서류가 아닌 두 눈으로 전면 검증합니다.",
    history: [
      "현대백화점 압구정본점 신선 수작 식품 총괄 기획 (2012 ~ 2021)",
      "초고가 유기농 로컬 수작 브랜드 '명인명촌' 기획 및 신선 상품 소싱 총괄 바이어",
      "농림축산식품부 지정 우수 로컬 안심식재료 유통 부문 특별 자문 위원",
      "현 마켓모움 총괄 큐레이션 이사 (Curator-in-Chief)"
    ],
    verifiedProducts: ["70년 가문비 전통 기장 옻독 자염 다시마"],
    badgeColor: "bg-[#4f46e5]/10 text-[#4f46e5]"
  },
  {
    id: "md-2",
    name: "이지원 수석 바이어",
    englishName: "Ji-won Lee",
    role: "수석 발효 및 전통가공 식품 큐레이터",
    formerCompany: "전 신세계백화점 본점 프리미엄 델리 가공식품 MD",
    experience: "12년 경력의 한식 헤리티지 가공 전문가",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=500&auto=format&fit=crop",
    quote: "“시간이 빚어낸 전통 발효와 한식 헤리티지는 결코 빠름으로 대체될 수 없습니다. 대대로 물려받은 옹기 속의 효모들까지 보존하는 원물을 찾아 나섭니다.”",
    philosophy: "세월의 가치를 훼손하는 인위적인 인공 감미료 and 고온 급속 건조기 공정을 전면 거부합니다. 대대로 보존해온 모태 서사, 정통 솥 가열법, 가문비 보존 온도를 최우선으로 분석합니다.",
    history: [
      "신세계백화점 강남점 & 본점 프리미엄 명인 가공식품 전담 바이어 (2014 ~ 2023)",
      "명품 종가 발효 특산 위젯 및 한식 레어 에디셔널 패키징 현대화 기획 디렉터",
      "대한민국 전통식품명인(대한명인) 협회 공인 브랜드 브랜딩 심사위원",
      "현 마켓모움 전통발효/가공 1등급 안심 선발 리드"
    ],
    verifiedProducts: ["장성조 한옥 종가 간장 PB", "남원 풍천 황금 양념장어 세트"],
    badgeColor: "bg-[#ec4899]/10 text-[#ec4899]"
  },
  {
    id: "md-3",
    name: "채부곤 수석 바이어",
    englishName: "Bu-gon Chae",
    role: "수석 농수산물 프리미엄 소싱 큐레이터",
    formerCompany: "전 메가마트, 롯데마트 농수산물 프리미엄 소싱 총괄",
    experience: "전국 산지의 밭과 들녘, 과수원을 누빈 현장 중심 바이어",
    image: chaeBuGonImg,
    quote: "“빠른 유통과 회전율에 치여 인위적으로 숙성시킨 과실과 농산물은 장인의 정직한 고집을 온전히 담지 못합니다. 산지의 계절풍과 정직한 흙을 직접 수십 번 확인하고야 마침내 수매를 결정합니다.”",
    philosophy: "소비 촉진을 목표로 인공 비료와 화학 방부 처리를 일삼는 획일화된 대량 소싱 구도를 전면 거부합니다. 장인의 고부가가치 노력과 원가율을 완전히 보장해 드리고, 다이렉트 상생 가격하락 채널을 안건화함으로써 상호 존중하는 자립 생태계를 만듭니다.",
    history: [
      "메가마트 & 롯데마트 본사 농수산물 프리미엄 소싱 총괄 MD (2010 ~ 2023)",
      "전국 우수 로컬 브랜드 직송 런칭 기획 및 산지 수공예 농산 수매 총괄",
      "농림축산식품부 지정 안심 고화질 먹거리 가치 검증 위원 부장",
      "현 마켓모움 로컬 농수산 상품개발 및 어가/농가 상생 협력 총괄 수석 바이어"
    ],
    verifiedProducts: ["청송 사과 꿀청 (Cheongsong Honey Apple Jam)"],
    badgeColor: "bg-[#06b6d4]/10 text-[#06b6d4]"
  }
];

// Beautiful responsive SVG vector illustration representing the organic tea fields & green mountain terraces of the reference image
function ScenicGreenHeroBackground() {
  return (
    <div className="absolute inset-0 w-full h-full bg-[#EBEFDF] overflow-hidden transition-all duration-700">
      <svg className="absolute w-full h-full min-w-[1200px] left-1/2 -translate-x-1/2" viewBox="0 0 1440 900" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMax slice">
        {/* Sky gradient */}
        <rect width="1440" height="900" fill="#EBEFDF" />
        <path d="M0 0H1440V550C1440 550 1200 450 900 480C600 510 300 440 0 460V0Z" fill="url(#sky-gradient)" opacity="0.7" />
        
        {/* Morning sun halo */}
        <circle cx="720" cy="260" r="340" fill="url(#sun-glow)" opacity="0.45" />

        {/* DISTANT MOUNTAINS - Layer 1 (Celadon Teal-Green) */}
        <path d="M-100 540 L120 340 L340 400 L560 300 L760 360 L1000 240 L1220 330 L1380 230 L1600 345 L1600 900 L-100 900 Z" fill="#78A07D" opacity="0.3" />

        {/* DISTANT MOUNTAINS - Layer 2 (Rich Scenic Green Ridge) */}
        <path d="M-100 580 L180 400 L450 460 L680 330 L930 420 L1150 300 L1380 380 L1550 270 L1600 300 L1600 900 L-100 900 Z" fill="#4B774E" opacity="0.45" />

        {/* MIDGROUND MOUNTAINS - (Deep Pine Ridge) */}
        <path d="M-100 630 L100 450 L340 510 L550 410 L830 500 T1260 410 L1450 350 L1600 410 L1600 900 L-100 900 Z" fill="#325937" opacity="0.7" />

        {/* MIDGROUND HILLS with Clouds resting (from reference image) */}
        <path d="M-100 680 L240 510 L500 560 L780 430 L1100 530 L1360 410 L1600 490 L1600 900 L-100 900 Z" fill="#224827" />

        {/* Soft clouds resting on mountain valleys */}
        {/* Cloud A */}
        <path d="M220 500 C 235 485, 270 485, 285 500 C 298 492, 320 496, 325 508 C 330 520, 310 528, 295 528 L 220 528 Z" fill="#FFFFFF" opacity="0.8" />
        {/* Cloud B */}
        <path d="M1040 380 C 1055 365, 1090 365, 1105 380 C 1118 372, 1140 376, 1145 388 C 1150 400, 1130 408, 1115 408 L 1040 408 Z" fill="#FFFFFF" opacity="0.75" />
        
        {/* Peaceful Blue Mountain Lake reflecting (from reference image) */}
        <path d="M550 410 C650 380, 850 380, 950 410 C880 435, 605 435, 550 410 Z" fill="#8BB8CE" opacity="0.7" />
        <ellipse cx="750" cy="413" rx="180" ry="14" fill="#90C2DC" opacity="0.4" />

        {/* FOREGROUND GRADIENT TERRACED TEA FIELDS (overlapping smooth waves) */}
        {/* First Broad Terrace */}
        <path d="M-100 730 Q 180 635, 480 705 T 1080 625 T 1600 675 L 1600 900 L-100 900 Z" fill="#153610" />
        
        {/* Organic wavy row layers of green tea shrubs */}
        <path d="M-100 760 Q 160 665, 460 745 T 1060 655 T 1600 705 L 1600 900 L-100 900 Z" fill="#1C4B15" />
        <path d="M-100 790 Q 140 695, 440 785 T 1040 685 T 1600 735 L 1600 900 L-100 900 Z" fill="#256420" />
        <path d="M-100 820 Q 120 725, 420 820 T 1020 710 T 1600 765 L 1600 900 L-100 900 Z" fill="#2F7A2A" />
        <path d="M-100 850 Q 100 755, 400 850 T 1000 740 T 1600 795 L 1600 900 L-100 900 Z" fill="#3A9434" />
        <path d="M-100 880 Q 80 785, 380 880 T 980 770 T 1600 825 L 1600 900 L-100 900 Z" fill="#4AA844" />

        {/* Overlaying custom graphic borders to create that neat layered vector line texture */}
        <path d="M-100 730 Q 180 635, 480 705 T 1080 625 T 1600 675" stroke="#0E240B" strokeWidth="2.5" fill="none" opacity="0.25" />
        <path d="M-100 760 Q 160 665, 460 745 T 1060 655 T 1600 705" stroke="#153610" strokeWidth="2.5" fill="none" opacity="0.2" strokeDasharray="12 6" />
        <path d="M-100 790 Q 140 695, 440 785 T 1040 685 T 1600 735" stroke="#153610" strokeWidth="2.5" fill="none" opacity="0.2" />
        <path d="M-100 820 Q 120 725, 420 820 T 1020 710 T 1600 765" stroke="#153610" strokeWidth="2.5" fill="none" opacity="0.25" strokeDasharray="14 7" />
        <path d="M-100 850 Q 100 755, 400 850 T 1000 740 T 1600 795" stroke="#153610" strokeWidth="2.5" fill="none" opacity="0.2" />
        <path d="M-100 880 Q 80 785, 380 880 T 980 770 T 1600 825" stroke="#153610" strokeWidth="2.5" fill="none" opacity="0.2" strokeDasharray="12 6" />

        {/* Cozy light blue Celadon/Sky Creek flowing down the tea valley */}
        <path d="M750 435 Q 710 495, 780 555 T 830 675 T 750 775 T 620 900" stroke="#E6EFF3" strokeWidth="8" fill="none" strokeLinecap="round" opacity="0.9" />
        <path d="M750 435 Q 710 495, 780 555 T 830 675 T 750 775 T 620 900" stroke="#90C2DC" strokeWidth="4.5" fill="none" strokeLinecap="round" opacity="0.75" />

        {/* Miniature farmers harvesting tea leaves (Directly replicating the Taiwan Small Town image style!) */}
        {/* Left-side Farmer */}
        <g transform="translate(190, 715)">
          {/* Traditional conical straw hat */}
          <path d="M-16 0 L0 -14 L16 0 Z" fill="#E8C390" stroke="#7A5E35" strokeWidth="1" />
          {/* Little tunic/robe */}
          <path d="M-11 0 L-14 17 L14 17 L11 0 Z" fill="#4B81A7" />
          {/* Little backpack basket */}
          <rect x="5" y="5" width="9" height="11" rx="1.5" fill="#C5A078" stroke="#7A5E35" strokeWidth="1" />
        </g>

        {/* Right-Center Farmer */}
        <g transform="translate(900, 765)">
          <path d="M-16 0 L0 -14 L16 0 Z" fill="#E8C390" stroke="#7A5E35" strokeWidth="1" />
          <path d="M-11 0 L-13 17 L13 17 L11 0 Z" fill="#305634" />
          <rect x="-14" y="4" width="8" height="10" rx="1.5" fill="#C5A078" stroke="#7A5E35" strokeWidth="1" />
        </g>

        {/* Lower Left Farmer */}
        <g transform="translate(440, 810)">
          <path d="M-16 0 L0 -14 L16 0 Z" fill="#E8C390" stroke="#7A5E35" strokeWidth="1" />
          <path d="M-11 0 L-13 16 L13 16 L11 0 Z" fill="#585078" />
        </g>

        {/* Fluffy majestic clouds floating in the sky (as seen in the reference) */}
        <path d="M140 130 C 160 110, 200 110, 220 130 C 235 120, 265 125, 270 140 C 275 155, 250 165, 230 165 L 140 165 Z" fill="#FFFFFF" opacity="0.9" />
        <path d="M820 160 C 840 140, 880 140, 900 160 C 915 150, 945 155, 950 170 C 955 185, 930 195, 910 195 L 820 195 Z" fill="#FFFFFF" opacity="0.8" />
        <path d="M1120 110 C 1135 95, 1165 95, 1180 110 C 1191 102, 1214 106, 1218 117 C 1222 128, 1203 136, 1188 136 L 1120 136 Z" fill="#FFFFFF" opacity="0.85" />

        {/* Definitions for Gradients */}
        <defs>
          <linearGradient id="sky-gradient" x1="720" y1="0" x2="720" y2="550" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#EBEFDF" />
            <stop offset="1" stopColor="#C2D1B7" />
          </linearGradient>
          <radialGradient id="sun-glow" cx="720" cy="260" r="340" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#FFFAE6" />
            <stop offset="0.5" stopColor="#FFECA8" stopOpacity="0.4" />
            <stop offset="1" stopColor="#EBEFDF" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
}

export default function LandingPage({ theme = 'original' }: { theme?: 'original' | 'scenic-green' }) {
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [selectedMd, setSelectedMd] = useState<any | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [orderMode, setOrderMode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'community' | 'store'>('community');
  const [isApplyModalOpen, setIsApplyModalOpen] = useState<boolean>(false);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden bg-background transition-all duration-700">
        {theme === 'scenic-green' ? (
          <ScenicGreenHeroBackground />
        ) : (
          <div className="absolute inset-0 z-0 transition-opacity duration-700">
            <img 
              src="https://images.unsplash.com/photo-1540959733332-e94e270b2ec0?q=80&w=2000&auto=format&fit=crop" 
              className="w-full h-full object-cover opacity-40 grayscale-[20%]"
              alt="Hero Background"
              referrerPolicy="no-referrer"
            />
          </div>
        )}
        
        <div className="relative z-10 text-center max-w-4xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            {/* Elegant Text Logotype */}
            <div className="flex flex-col items-center mb-8">
              <span className="text-3xl md:text-5xl font-bold tracking-tight text-brand-green magazine-heading leading-tight transition-all duration-300">
                마켓모움
              </span>
              <span className="text-[10px] md:text-xs text-brand-terracotta tracking-[0.3em] font-mono leading-none mt-2 font-semibold uppercase transition-all duration-300">
                MARKET MOUM
              </span>
            </div>

            <span className="text-xs md:text-sm uppercase tracking-[0.3em] text-brand-terracotta font-bold mb-6 block transition-all duration-300">
              생산자 + 스토리 + 팬덤 + 상생 펀딩 공동체
            </span>
            <h1 className="text-4xl md:text-6xl magazine-heading text-brand-green mb-8 leading-[1.1] font-medium transition-all duration-300">
              최저가 전쟁을 넘어 <br /> 명인의 이야기를 소유하다
            </h1>
            <p className="text-sm md:text-xl text-brand-green/80 mb-12 max-w-3xl mx-auto font-light leading-relaxed transition-all duration-300">
              단순히 저렴하게 구매하는 쇼핑몰이 아닙니다. <br />
              마켓모움은 지역에 숨겨진 생산자를 직접 발굴해 브랜드화하고, 
              <strong> ‘공동구매 가격하락 퍼널’</strong>과 <strong>‘예약형 시즌 펀딩’</strong>을 결합해 상생팬덤 생태계를 만듭니다.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/markets" className="bg-brand-green text-background px-10 py-5 rounded-none text-sm uppercase tracking-widest hover:bg-brand-green/90 transition-all flex items-center gap-2 font-semibold">
                Explore Markets <ArrowRight className="w-4 h-4" />
              </Link>
              <button 
                onClick={() => setIsApplyModalOpen(true)}
                className="border border-brand-green text-brand-green px-10 py-5 rounded-none text-sm uppercase tracking-widest hover:bg-brand-green hover:text-white transition-all cursor-pointer font-bold"
              >
                Become a Seller
              </button>
            </div>
          </motion.div>
        </div>

        {/* Floating Tag */}
        <motion.div 
          className="absolute bottom-20 left-10 md:left-20 hidden lg:block"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="bg-background/80 backdrop-blur-sm p-6 border border-brand-green/10 shadow-sm transition-all duration-300">
            <p className="text-[10px] uppercase tracking-widest text-brand-terracotta mb-1 font-semibold">Live popup market</p>
            <p className="text-sm magazine-heading">Cheongsong Apple Fest 2024</p>
            <div className="flex items-center gap-2 mt-2 text-brand-terracotta">
              <Clock className="w-3 h-3" />
              <span className="text-[10px] font-mono font-bold">05:24:12 LEFT</span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Platform Concept Selector Tabs */}
      <section className="bg-[#FAF9F6] border-y border-black/5 py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="space-y-1 text-center md:text-left">
            <span className="text-[10px] uppercase tracking-[0.25em] text-[#8C1D24] font-semibold">Select Curated Platform Mode</span>
            <h3 className="text-xl magazine-heading text-brand-green font-medium">마켓모움의 차별화 큐레이션 관문</h3>
          </div>
          
          <div className="flex bg-[#FAF9F6] border border-black/5 p-1.5 justify-center max-w-lg w-full md:w-auto">
            <button 
              onClick={() => setActiveTab('community')}
              className={`flex-1 md:px-8 py-3.5 text-[11px] uppercase tracking-widest font-mono transition-all font-bold flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'community' 
                  ? 'bg-brand-green text-white shadow-sm' 
                  : 'bg-transparent text-brand-green/60 hover:text-brand-green'
              }`}
            >
              <Compass className="w-4 h-4" /> 1. 로컬 미식 공동체 (Curation Hub)
            </button>
            <button 
              onClick={() => setActiveTab('store')}
              className={`flex-1 md:px-8 py-3.5 text-[11px] uppercase tracking-widest font-mono transition-all font-bold flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'store' 
                  ? 'bg-brand-green text-white shadow-sm' 
                  : 'bg-transparent text-brand-green/60 hover:text-brand-green'
              }`}
            >
              <Store className="w-4 h-4" /> 2. 팝업 직매장 (Pop-Up Store)
            </button>
          </div>
        </div>
      </section>

      {activeTab === 'community' ? (
        <section className="py-24 px-6 max-w-7xl mx-auto animate-fade-in">
          <LocalCurationHub />
        </section>
      ) : (
        /* Limited Time Section */
        <section className="py-32 px-6 max-w-7xl mx-auto animate-fade-in">
          <ScrollReveal>
            <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
              <div className="max-w-xl">
                <h2 className="text-4xl md:text-5xl magazine-heading text-brand-green mb-6">
                  진행 중인 팝업 마켓
                </h2>
                <p className="text-foreground/60 leading-relaxed font-light">
                  한정된 기간 동안만 열리는 검증된 로컬 팝업입니다. <br />
                  지금 이 순간이 아니면 만나보기 어려운 가치들을 발견하세요.
                </p>
              </div>
              <Link to="/markets" className="text-xs uppercase tracking-widest border-b border-brand-green pb-2 hover:text-brand-terracotta hover:border-brand-terracotta transition-all">
                View All Active Markets
              </Link>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {PRODUCTS.map((product, idx) => (
              <ScrollReveal key={product.id} delay={idx * 0.1}>
                <div 
                  className="group cursor-pointer" 
                  onClick={() => { setSelectedProduct(product); setOrderMode(false); }}
                >
                  <div className="relative overflow-hidden aspect-[4/5] bg-[#FAF9F6] mb-6">
                    <motion.img 
                      src={product.image} 
                      alt={product.name}
                      className="w-full h-full object-cover grayscale-[10%] group-hover:grayscale-0 transition-all duration-700"
                      whileHover={{ scale: 1.05 }}
                      referrerPolicy="no-referrer"
                    />
                    {product.isLimited && (
                      <div className="absolute top-4 left-4">
                        <span className="bg-brand-terracotta text-white text-[10px] px-3 py-1 uppercase tracking-widest">
                          Limited Time
                        </span>
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-full group-hover:translate-y-0 transition-transform bg-brand-green/90 text-white flex justify-between items-center">
                      <span className="text-xs uppercase tracking-widest text-white font-medium">View Details</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg magazine-heading mb-1">{product.name}</h3>
                      <p className="text-sm text-foreground/40 font-light italic text-[#111111]/70">By {product.artisan}</p>
                    </div>
                    <p className="text-lg font-serif text-[#111111]">₩{product.price.toLocaleString()}</p>
                  </div>
                  {product.isLimited && (
                    <div className="mt-4 flex items-center gap-2 text-brand-terracotta">
                      <Clock className="w-3 h-3" />
                      <span className="text-[10px] font-mono uppercase tracking-widest font-semibold">Ends in {product.timeLeft}</span>
                    </div>
                  )}
                </div>
              </ScrollReveal>
            ))}
          </div>
        </section>
      )}

      {/* Professional MD verification section */}
      <section className="bg-[#FAF9F6] border-t border-b border-black/5 py-28 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto space-y-16">
          <ScrollReveal>
            <div className="max-w-3xl space-y-6">
              <span className="text-xs font-bold uppercase tracking-[0.3em] text-[#8C1D24] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> 100% Verified by Curators
              </span>
              <h2 className="text-2xl md:text-4xl magazine-heading text-brand-green leading-[1.1] font-medium">
                전문가 베테랑 MD와 AI 시스템이 <br />
                함께 연대하여 <span className="italic font-serif text-[#8C1D24]">체계적으로 검증한 명품 원물</span>
              </h2>
              <p className="text-sm md:text-base text-brand-green/80 font-light leading-relaxed">
                전 신세계, 롯데백화점, 이마트, 롯데마트 임직원 출신의 각 분야 전문 MD 경력자들의 안목과 독자적인 AI 시스템이 만났습니다. 
                현재의 소비 트렌드를 한발 앞서 파악하고 예측하여, 가장 정교하고 엄격한 체계적 검증을 통과한 지속 가능한 로컬 명품만을 선별하여 제안합니다.
              </p>
            </div>
          </ScrollReveal>

          {/* Expert Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {MDS_DATA.map((md, idx) => (
              <ScrollReveal key={md.id} delay={idx * 0.1}>
                <div 
                  onClick={() => setSelectedMd(md)}
                  className="bg-white border border-black/5 overflow-hidden group cursor-pointer hover:border-brand-green/30 transition-all flex flex-col h-full hover:shadow-md"
                >
                  {/* MD image panel */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#FAF9F6]">
                    <img 
                      src={md.image} 
                      alt={md.name} 
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-[1.2s] group-hover:scale-102"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
                    <div className="absolute top-4 left-4">
                      <span className="bg-brand-green text-white font-mono text-[9px] uppercase tracking-widest px-2.5 py-1">
                        Professional Curator
                      </span>
                    </div>
                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <p className="text-xs uppercase tracking-widest text-[#8C1D24] font-mono mb-0.5">{md.englishName}</p>
                      <h4 className="text-lg font-bold magazine-heading leading-tight">{md.name}</h4>
                    </div>
                  </div>

                  {/* MD profile highlights */}
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <p className="text-[10px] font-mono font-bold tracking-wider text-[#8C1D24]">FORMER CAREER</p>
                        <p className="text-xs font-semibold text-brand-green leading-snug">{md.formerCompany}</p>
                      </div>
                      
                      <p className="text-[11px] leading-relaxed text-[#111111]/70 italic font-serif">
                        {md.quote}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-black/5 flex justify-between items-center text-[10px] uppercase font-mono tracking-widest">
                      <span className="text-foreground/40">{md.experience}</span>
                      <span className="text-[#8C1D24] border-b border-[#8C1D24] pb-0.5 font-bold group-hover:text-brand-green group-hover:border-brand-green transition-colors">
                        이력 및 철학 보기 +
                      </span>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* 2026 Marketing Calendar Section */}
      <section className="bg-white py-24 px-6 border-b border-black/5">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal>
            <MarketingCalendar />
          </ScrollReveal>
        </div>
      </section>

      {/* Brand Story Section */}
      <section className="bg-brand-green py-32 text-white">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <ScrollReveal>
            <div className="relative">
              <img 
                src={wandoNatureScenicImg} 
                className="w-full aspect-[3/4] object-cover ring-1 ring-white/10"
                alt="Scenic landscape of Wando coastal islands representing Korean local nature legacy"
                referrerPolicy="no-referrer"
              />
              <div className="absolute -bottom-10 -right-10 bg-brand-ivory p-12 text-brand-green hidden xl:block border border-black/5">
                <p className="text-[10px] uppercase tracking-[0.3em] mb-4">The Philosophy</p>
                <p className="text-2xl magazine-heading leading-tight mb-8">"물건이 아니라 <br /> 삶의 조각을 팝니다."</p>
                <p className="text-sm font-light text-brand-green/60 max-w-[200px]">
                  장인의 손에서 탄생한 모든 제품에는 고유한 시간과 서사가 담겨 있습니다.
                </p>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <div className="space-y-10">
              <span className="text-xs uppercase tracking-[0.4em] text-brand-terracotta block">Our Vision</span>
              <h2 className="text-5xl md:text-6xl magazine-heading leading-[1.1]">
                당신의 장인정신에 <br /> 색을 더합니다
              </h2>
              <p className="text-lg text-white/70 font-light leading-relaxed max-w-lg">
                전통적인 실력은 있지만 브랜드화에 어려움을 겪는 전국의 고수들. <br />
                마켓모움의 AI 브랜딩 기술이 당신의 철학을 매력적인 상세페이지와 스토리로 변환합니다.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-px bg-brand-terracotta"></div>
                    <span className="text-xs uppercase tracking-widest">AI Branding</span>
                  </div>
                  <p className="font-light text-sm text-white/50 leading-relaxed">
                    복잡한 상세페이지 제작, 카피라이팅. 이제 AI가 당신의 톤앤매너에 맞춰 자동 생성합니다.
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-px bg-brand-terracotta"></div>
                    <span className="text-xs uppercase tracking-widest">Growth Analytics</span>
                  </div>
                  <p className="font-light text-sm text-white/50 leading-relaxed">
                    단순한 판매 수치를 넘어, 고객이 어떤 스토리에서 마음을 열었는지 데이터로 증명합니다.
                  </p>
                </div>
              </div>
              <Link to="/seller" className="inline-flex items-center gap-3 bg-brand-terracotta text-white px-10 py-5 uppercase text-xs tracking-widest hover:bg-brand-terracotta/90 transition-all mt-6">
                Start Your Brand Growth <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-40 text-center bg-[#FDFCF8]">
        <ScrollReveal>
          <h3 className="text-4xl md:text-6xl magazine-heading text-brand-green mb-10">
            당신의 가치를 브랜드로 만드세요
          </h3>
          <p className="text-foreground/40 font-light mb-12 tracking-wide uppercase text-sm">
            모든 위대한 브랜드는 작은 시작으로부터 나옵니다
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <button 
              onClick={() => setIsApplyModalOpen(true)}
              className="bg-brand-green text-white px-12 py-6 text-sm uppercase tracking-widest hover:bg-[#153427] transition-all cursor-pointer font-bold font-sans"
            >
              입점 신청하기
            </button>
            <Link to="/seller" className="text-brand-green underline underline-offset-8 text-sm uppercase tracking-widest hover:text-brand-terracotta transition-colors">
              Our Process
            </Link>
          </div>
        </ScrollReveal>
      </section>

      {/* Product Detail Modal Overlay */}
      <AnimatePresence>
        {selectedProduct && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
            onClick={() => { setSelectedProduct(null); setOrderMode(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="bg-[#FDFCF8] text-[#111111] max-w-5xl w-full border border-black/5 flex flex-col md:flex-row relative shadow-2xl overflow-hidden my-8"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button 
                onClick={() => { setSelectedProduct(null); setOrderMode(false); }}
                className="absolute top-6 right-6 z-10 p-2 hover:bg-black/5 rounded-full transition-all text-[#111111]"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Product Image Panel (Left) */}
              <div className="w-full md:w-1/2 relative bg-[#FAF9F6] aspect-[4/5] md:aspect-auto md:min-h-[600px] overflow-hidden">
                <img 
                  src={selectedProduct.image} 
                  alt={selectedProduct.name} 
                  className="w-full h-full object-cover grayscale-[10%] hover:scale-[1.02] transition-transform duration-[1.5s]"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
                
                {/* Floating Artisan Designation */}
                <div className="absolute bottom-8 left-8 text-white">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#8C1D24] mb-1 font-semibold">CURATED PARTNER BRAND</p>
                  <p className="text-xl font-medium magazine-heading text-brand-ivory opacity-95">{selectedProduct.artisan}</p>
                  <p className="text-xs font-light opacity-75 mt-0.5">Premium Traditional Craftsmanship</p>
                </div>
              </div>

              {/* Detailed Content Panel (Right) */}
              <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-between overflow-y-auto max-h-[85vh] md:max-h-[650px] scrollbar-thin">
                <div>
                  {/* Tags Group */}
                  <div className="flex flex-wrap items-center gap-2 mb-6">
                    <span className="bg-brand-green/10 text-brand-green text-[9px] px-2.5 py-1 tracking-widest uppercase font-mono font-semibold">
                      {selectedProduct.category}
                    </span>
                    {selectedProduct.isLimited && (
                      <span className="bg-brand-terracotta/10 text-[#8C1D24] text-[9px] px-2.5 py-1 tracking-widest uppercase font-mono font-semibold">
                        POP-UP LIMITED ({selectedProduct.stock} Left)
                      </span>
                    )}
                  </div>

                  {/* Title & Price */}
                  <h3 className="text-2xl md:text-3xl magazine-heading text-brand-green leading-[1.2] mb-3">
                    {selectedProduct.name}
                  </h3>
                  <p className="text-2.5xl font-serif text-[#111111] mb-6">
                    ₩{selectedProduct.price.toLocaleString()}
                    <span className="text-[11px] text-foreground/45 font-sans italic ml-3 font-normal">무료 보장배송 및 오동나무 명인 목함 포함 패키지</span>
                  </p>

                  <div className="w-full h-px bg-[#111111]/10 mb-6"></div>

                  {/* Brand Copy & Story Block */}
                  {BRAND_PACKAGES[selectedProduct.id] ? (
                    <div className="space-y-6">
                      {/* Tagline */}
                      <div>
                        <p className="text-[9px] uppercase tracking-[0.25em] text-[#8C1D24] mb-1 font-semibold">Brand Tagline</p>
                        <h4 className="text-lg italic font-medium text-[#111111] tracking-tight font-serif leading-[1.3] pl-2 border-l-2 border-brand-terracotta">
                          "{BRAND_PACKAGES[selectedProduct.id].tagline}"
                        </h4>
                      </div>

                      {/* Decoded Brand Narrative */}
                      <div>
                        <p className="text-[9px] uppercase tracking-[0.25em] text-foreground/45 mb-2 font-semibold">The Story & Philosophy (스토리 & 철학)</p>
                        <p className="text-xs text-[#111111]/85 leading-relaxed font-light bg-brand-green/[0.02] p-5 italic border border-[#111111]/5">
                          {BRAND_PACKAGES[selectedProduct.id].story}
                        </p>
                      </div>

                      {/* Dynamic USP Bullets */}
                      <div>
                        <p className="text-[9px] uppercase tracking-[0.25em] text-foreground/45 mb-2 font-semibold">Signature Craft Merits (특장점 요약)</p>
                        <ul className="space-y-2">
                          {BRAND_PACKAGES[selectedProduct.id].details.map((detail: string, i: number) => (
                            <li key={i} className="text-xs text-foreground/80 font-light flex items-start gap-2.5">
                              <span className="text-[#8C1D24] font-bold mt-0.5">✓</span>
                              <span>{detail}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Social Media Content Options (상세페이지 대표 카피) */}
                      <div className="pt-2">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-[9px] uppercase tracking-[0.25em] text-[#8C1D24] font-semibold">AI Generated Representative Copy (대표 상세페이지 문구)</p>
                          <button 
                            onClick={() => handleCopy(BRAND_PACKAGES[selectedProduct.id].marketingCopy, selectedProduct.id)}
                            className="text-[10px] uppercase tracking-wider text-brand-green hover:text-[#8C1D24] font-mono flex items-center gap-1.5 transition-colors font-medium cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            {copiedId === selectedProduct.id ? 'Copied!' : 'Copy Copywriting'}
                          </button>
                        </div>
                        <div className="bg-[#111111] text-white/95 p-5 font-mono text-[10px] leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto border border-black/5 rounded-none scrollbar-thin">
                          {BRAND_PACKAGES[selectedProduct.id].marketingCopy}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/40 mb-1">Description (제품 기본 설명)</p>
                        <p className="text-xs text-foreground/70 leading-relaxed font-light">
                          {selectedProduct.description}
                        </p>
                      </div>
                      <div className="bg-[#FAF9F6]/80 p-5 text-center text-xs font-light text-foreground/60 border border-black/5">
                        귀하의 브랜드 철학과 스토리 패키지는 <span className="font-semibold text-brand-green">Seller Center &gt; AI Branding</span> 탭에서 생성할 수 있습니다.
                      </div>
                    </div>
                  )}
                </div>

                {/* Purchase Action Panel */}
                <div className="mt-8 pt-6 border-t border-[#111111]/10 z-0">
                  {orderMode ? (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-brand-green/10 border border-brand-green/30 p-5 text-center rounded-none"
                    >
                      <p className="text-xs text-brand-green font-semibold mb-1 flex items-center justify-center gap-1.5">
                        ✨ Order proposal dispatched to {selectedProduct.artisan}!
                      </p>
                      <p className="text-[10px] font-light text-[#111111] opacity-80">
                        귀하의 주문 제안과 스토어 콜라보 초대가 장인에게 자동으로 전달되었습니다.
                      </p>
                    </motion.div>
                  ) : (
                    <button 
                      onClick={() => setOrderMode(true)}
                      className="w-full bg-brand-green text-white hover:bg-[#153427] py-4.5 rounded-none text-xs uppercase tracking-widest font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow"
                    >
                      <ShoppingBag className="w-4 h-4" /> Collaborate & Place Order (주문 제안 넣기)
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MD Detail Credentials Board Popup */}
      <AnimatePresence>
        {selectedMd && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
            onClick={() => setSelectedMd(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="bg-[#FDFCF8] text-[#111111] max-w-4xl w-full border border-black/5 flex flex-col md:flex-row relative shadow-2xl overflow-hidden my-8"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button 
                onClick={() => setSelectedMd(null)}
                className="absolute top-6 right-6 z-10 p-2 hover:bg-black/5 rounded-full transition-all text-[#111111]"
              >
                <X className="w-6 h-6" />
              </button>

              {/* MD Portrait (Left) */}
              <div className="w-full md:w-5/12 relative bg-[#FAF9F6] aspect-[4/5] md:aspect-auto md:min-h-[500px] overflow-hidden">
                <img 
                  src={selectedMd.image} 
                  alt={selectedMd.name} 
                  className="w-full h-full object-cover grayscale-[10%]"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
                
                {/* Stamp overlay or Designation */}
                <div className="absolute top-6 left-6">
                  <div className="border border-white/20 px-3 py-1 bg-brand-green/80 text-white text-[9px] uppercase tracking-[0.25em] font-mono leading-none">
                    Moum Verified MD
                  </div>
                </div>

                <div className="absolute bottom-8 left-8 text-white right-8">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#8C1D24] mb-1 font-semibold">CURATED EXPERT TEAM</p>
                  <p className="text-2xl font-medium magazine-heading text-brand-ivory">{selectedMd.name}</p>
                  <p className="text-xs font-light opacity-75 mt-0.5 font-mono">{selectedMd.englishName}</p>
                </div>
              </div>

              {/* MD History Details Panel (Right) */}
              <div className="w-full md:w-7/12 p-8 md:p-11 flex flex-col justify-between overflow-y-auto max-h-[85vh] md:max-h-[600px] scrollbar-thin space-y-6">
                <div className="space-y-6">
                  {/* Former Corporate Profile Header */}
                  <div>
                    <span className="bg-[#8C1D24]/10 text-[#8C1D24] text-[9px] px-3 py-1 tracking-widest uppercase font-mono font-bold leading-none inline-block">
                      {selectedMd.experience}
                    </span>
                    <h3 className="text-xl md:text-2xl font-bold text-brand-green leading-[1.3] mt-3">
                      {selectedMd.formerCompany}
                    </h3>
                    <p className="text-xs text-foreground/50 font-mono mt-1">{selectedMd.role}</p>
                  </div>

                  <div className="w-full h-px bg-[#111111]/10"></div>

                  {/* Core Philosophy Quoted block */}
                  <div className="bg-[#FAF9F6] border-l-2 border-[#8C1D24] p-5">
                    <p className="text-xs italic text-[#111111] leading-relaxed font-serif font-medium">
                      {selectedMd.quote}
                    </p>
                  </div>

                  {/* Full verification criteria details */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-brand-green/70">MD 검증 및 상생 발굴 원칙</h4>
                    <p className="text-xs font-light leading-relaxed text-foreground/85">
                      {selectedMd.philosophy}
                    </p>
                  </div>

                  {/* Corporate Career History Timeline */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-brand-green/70">주요 이력 및 포트폴리오</h4>
                    <div className="space-y-2.5">
                      {selectedMd.history.map((hist: string, index: number) => (
                        <div key={index} className="flex gap-3 items-start text-xs font-light text-foreground/80">
                          <CheckCircle className="w-4 h-4 text-brand-green mt-0.5 flex-shrink-0" />
                          <span>{hist}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Curated Products */}
                  {selectedMd.verifiedProducts && selectedMd.verifiedProducts.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-brand-green/70">최근 검증 완료 로컬 라인</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedMd.verifiedProducts.map((pName: string, index: number) => (
                          <span key={index} className="bg-brand-green/5 border border-brand-green/10 text-brand-green text-[10px] px-2.5 py-1 font-sans">
                            ✓ {pName}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-6 border-t border-[#111111]/10">
                  <button 
                    onClick={() => setSelectedMd(null)}
                    className="w-full bg-brand-green hover:bg-[#153427] text-white py-4 text-xs font-mono uppercase tracking-widest font-bold transition-all cursor-pointer text-center"
                  >
                    확인 및 닫기
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {isApplyModalOpen && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
            onClick={() => setIsApplyModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="bg-[#FDFCF8] text-[#111111] max-w-2xl w-full border border-black/5 relative shadow-2xl my-8 p-6 md:p-10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button 
                onClick={() => setIsApplyModalOpen(false)}
                className="absolute top-6 right-6 z-10 p-2 hover:bg-black/5 rounded-full transition-all text-[#111111] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="pt-4 max-h-[75vh] overflow-y-auto pr-1">
                <SellerApplyForm onSuccess={() => setIsApplyModalOpen(false)} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
