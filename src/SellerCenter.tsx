import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Layout, BarChart, Package, Sparkles, Send, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import DetailPageBuilder from './components/DetailPageBuilder';

import dashboardCoverImg from './assets/images/dashboard_cover_1780525482200.png';
import brandingCoverImg from './assets/images/branding_cover_1780525497518.png';
import analyticsCoverImg from './assets/images/analytics_cover_1780525510386.png';
import pbCoverImg from './assets/images/pb_cover_1780525524480.png';

export default function SellerCenter() {
  const [brandingSubTab, setBrandingSubTab] = useState<'identity' | 'detail-page' | 'monetization-guide'>('identity');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    info: '',
    tone: 'Sophisticated & Minimal'
  });

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/ai/brand-package', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: formData.name,
          productInfo: formData.info,
          brandTone: formData.tone
        })
      });
      const data = await res.json();
      setAiResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F1E7]/50 pt-32 pb-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <h1 className="text-4xl magazine-heading text-brand-green mb-2">Seller Center</h1>
            <p className="text-foreground/50 font-light">당신의 제품을 매력적인 로컬 브랜드로 성장시키세요.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="rounded-none border-brand-green text-brand-green uppercase tracking-widest text-[10px]">
              Preview Store
            </Button>
            <Button className="rounded-none bg-brand-green text-white uppercase tracking-widest text-[10px] hover:bg-brand-green/90">
              <Plus className="w-4 h-4 mr-2" /> Add Product
            </Button>
          </div>
        </div>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="bg-transparent border-b border-black/5 w-full justify-start rounded-none h-auto p-0 mb-8 overflow-x-auto gap-2">
            <TabsTrigger value="dashboard" className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand-green data-[state=active]:bg-transparent px-8 py-4 text-[10px] uppercase tracking-widest">
              <Layout className="w-4 h-4 mr-2" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="ai-branding" className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand-green data-[state=active]:bg-transparent px-8 py-4 text-[10px] uppercase tracking-widest">
              <Sparkles className="w-4 h-4 mr-2" /> AI Branding
            </TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand-green data-[state=active]:bg-transparent px-8 py-4 text-[10px] uppercase tracking-widest">
              <BarChart className="w-4 h-4 mr-2" /> Analytics
            </TabsTrigger>
            <TabsTrigger value="pb-matching" className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand-green data-[state=active]:bg-transparent px-8 py-4 text-[10px] uppercase tracking-widest">
              <Package className="w-4 h-4 mr-2" /> PB Matching
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-8 outline-none">
            {/* Visual Hero Banner with Custom Image */}
            <div className="relative h-64 w-full bg-brand-green/5 border border-black/5 overflow-hidden flex items-center justify-between p-8 md:p-12">
              <div className="z-10 max-w-md">
                <Badge className="bg-brand-green text-white rounded-none tracking-widest text-[8px] uppercase mb-4 px-2.5 py-1">Store Workspace</Badge>
                <h2 className="text-3xl magazine-heading text-brand-green mb-3">장인의 워크스페이스</h2>
                <p className="text-xs font-light text-foreground/75 leading-relaxed">
                  자연과 사람, 장인정신이 공존하는 가치 안에서 당신의 브랜드와 제품이 보다 감성적으로 소비자들에게 도달할 수 있도록 돕습니다.
                </p>
              </div>
              <div className="absolute right-0 top-0 bottom-0 w-1/2 md:w-2/3 h-full grayscale-[10%] opacity-90 hidden sm:block">
                <img src={dashboardCoverImg} className="w-full h-full object-cover" alt="Artisan workshop view" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#F3F1E7]/100 via-transparent to-transparent"></div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total Sales', value: '₩12,450,000', trend: '+12.5%' },
                { label: 'Unique Visitors', value: '2,840', trend: '+5.2%' },
                { label: 'Conversion Rate', value: '3.8%', trend: '+0.4%' },
                { label: 'Active Popups', value: '2', trend: 'Live' },
              ].map((stat, i) => (
                <Card key={i} className="rounded-none border-black/5 bg-white">
                  <CardContent className="pt-6">
                    <p className="text-[10px] uppercase tracking-widest text-foreground/40 mb-2">{stat.label}</p>
                    <div className="flex justify-between items-end">
                      <p className="text-2xl magazine-heading text-brand-green">{stat.value}</p>
                      <Badge variant="secondary" className="bg-brand-green/5 text-brand-green text-[10px] mb-1">{stat.trend}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="ai-branding" className="outline-none">
            {/* Elegant Sub tab switcher */}
            <div className="flex bg-[#F3F1E7]/80 border border-black/5 p-1 justify-start mb-8 max-w-xl">
              <button 
                onClick={() => setBrandingSubTab('identity')}
                className={`flex-1 py-3 text-[10px] uppercase tracking-widest font-mono transition-all font-semibold cursor-pointer ${
                  brandingSubTab === 'identity' 
                    ? 'bg-brand-green text-white' 
                    : 'bg-transparent text-brand-green/60 hover:text-brand-green'
                }`}
              >
                1. Brand Identity Pack
              </button>
              <button 
                onClick={() => setBrandingSubTab('detail-page')}
                className={`flex-1 py-3 text-[10px] uppercase tracking-widest font-mono transition-all font-semibold cursor-pointer ${
                  brandingSubTab === 'detail-page' 
                    ? 'bg-brand-green text-white' 
                    : 'bg-transparent text-brand-green/60 hover:text-brand-green'
                }`}
              >
                2. Premium Detail Page
              </button>
              <button 
                onClick={() => setBrandingSubTab('monetization-guide')}
                className={`flex-1 py-3 text-[10px] uppercase tracking-widest font-mono transition-all font-semibold cursor-pointer ${
                  brandingSubTab === 'monetization-guide' 
                    ? 'bg-brand-green text-white' 
                    : 'bg-transparent text-brand-green/60 hover:text-brand-green'
                }`}
              >
                3. AI 수익화 가이드
              </button>
            </div>

            {brandingSubTab === 'identity' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-fade-in">
                {/* Form Side */}
                <div className="space-y-8">
                  <Card className="rounded-none border-black/5 bg-white">
                    <CardHeader className="space-y-3">
                      <div>
                        <CardTitle className="magazine-heading text-2xl text-brand-green">Create Brand Identity</CardTitle>
                        <CardDescription className="text-xs">제품 정보만 입력하세요. 나머지는 AI가 생성합니다.</CardDescription>
                      </div>
                      <div className="pt-2 flex flex-wrap gap-2 items-center">
                        <span className="text-[9px] uppercase tracking-wider text-foreground/45">시작 고르기:</span>
                        <button 
                          onClick={() => setFormData({
                            name: '팜스네이브 Farms Glow 프리미엄 전복장',
                            info: '완도 미역귀와 청정 다시마를 먹고 자란 두툼하고 신선한 대물 참전복만을 엄선. 황동 고리백자와 장전통 옹기에서 명인의 비법 15가지 약초 간장 황금 배합비로 짜지 않게 저온 옹기 숙성하여 한과 자개급 정기 패키지로 배송.',
                            tone: 'Sophisticated & Minimal'
                          })}
                          className="bg-[#1B4332]/5 text-brand-green hover:bg-[#1B4332]/10 text-[9px] px-2 py-1.5 font-medium transition-colors border border-brand-green/10 cursor-pointer"
                        >
                          🦪 팜스네이브 전복장
                        </button>
                        <button 
                          onClick={() => setFormData({
                            name: '청송 사과 꿀청',
                            info: '경북 청송 고랭지 특유의 일교차로 당도와 사근거림이 완벽한 가을 부사만을 골라 수작업 슬라이스. 인공 백설탕이나 색소 없이 오직 산들바람 가을 천연 야생화 꿀만으로 숙성.',
                            tone: 'Traditional & Warm'
                          })}
                          className="bg-[#1B4332]/5 text-brand-green hover:bg-[#1B4332]/10 text-[9px] px-2 py-1.5 font-medium transition-colors border border-brand-green/10 cursor-pointer"
                        >
                          🍎 청송 사과 꿀청
                        </button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest">Product Name</label>
                        <input 
                          className="w-full bg-[#FDFCF8] border border-black/5 p-4 text-sm focus:outline-none focus:ring-1 focus:ring-brand-green" 
                          placeholder="e.g. 제주 유채 꿀비누"
                          value={formData.name}
                          onChange={e => setFormData({...formData, name: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest">Product Info & Craftmanship</label>
                        <textarea 
                          className="w-full bg-[#FDFCF8] border border-black/5 p-4 text-sm h-32 focus:outline-none focus:ring-1 focus:ring-brand-green" 
                          placeholder="장인의 작업 방식이나 원재료의 특별함을 적어주세요."
                          value={formData.info}
                          onChange={e => setFormData({...formData, info: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest">Brand Tone</label>
                        <select 
                          className="w-full bg-[#FDFCF8] border border-black/5 p-4 text-sm focus:outline-none focus:ring-1 focus:ring-brand-green"
                          value={formData.tone}
                          onChange={e => setFormData({...formData, tone: e.target.value})}
                        >
                          <option>Sophisticated & Minimal</option>
                          <option>Traditional & Warm</option>
                          <option>Bold & Modern</option>
                          <option>Rustic & Artisan</option>
                        </select>
                      </div>
                      <Button 
                        className="w-full rounded-none bg-brand-green text-white h-14 uppercase tracking-widest text-xs disabled:opacity-50"
                        onClick={handleGenerate}
                        disabled={isGenerating || !formData.name}
                      >
                        {isGenerating ? 'Generating Identity...' : 'Generate Brand Package'}
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Result Side */}
                <div className="relative">
                  {!aiResult && !isGenerating && (
                    <div className="h-full border border-black/5 bg-white p-8 flex flex-col justify-between min-h-[500px]">
                      <div className="relative h-56 w-full bg-[#F3F1E7]/50 overflow-hidden mb-6">
                        <img src={brandingCoverImg} className="w-full h-full object-cover grayscale-[15%]" alt="Branding visual mood" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-black/5"></div>
                      </div>
                      <div className="text-center pb-8 flex-1 flex flex-col items-center justify-center">
                        <Sparkles className="w-8 h-8 mb-4 text-brand-green/70" />
                        <p className="magazine-heading text-xl text-brand-green mb-2">Ready for Branding</p>
                        <p className="text-xs font-light text-foreground/60 max-w-xs mx-auto">
                          왼쪽 제품 프로필을 입력하시면 AI가 스토리형 슬로건, 철학을 담은 라이프스타일 스토리, 사회관계망 가이드 카피를 조립해 드립니다.
                        </p>
                      </div>
                    </div>
                  )}

                  {isGenerating && (
                    <div className="h-full bg-brand-green/[0.02] border border-black/5 flex flex-col items-center justify-center p-20 text-center min-h-[500px]">
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                      >
                        <Sparkles className="w-12 h-12 mb-6 text-brand-green" />
                      </motion.div>
                      <p className="magazine-heading text-xl mb-4">Crafting Your Story</p>
                      <p className="text-xs font-light text-foreground/40 italic">장인의 철학과 제품의 가치를 분석하여 <br /> 최적의 브랜딩 키워드를 도출하고 있습니다...</p>
                    </div>
                  )}

                  {aiResult && (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-6"
                    >
                      <Card className="rounded-none border-brand-green/20 bg-white overflow-hidden">
                        <div className="h-2 bg-brand-green"></div>
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <Badge variant="outline" className="text-[8px] uppercase tracking-widest rounded-none border-brand-green text-brand-green">AI Generated Assets</Badge>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0"><Send className="w-3 h-3" /></Button>
                          </div>
                          <CardTitle className="magazine-heading text-3xl text-brand-green mt-4 tracking-tight italic">
                            "{aiResult.tagline}"
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-8">
                          <div>
                            <label className="text-[10px] uppercase tracking-widest text-[#D66853] mb-3 block">Brand Story</label>
                            <p className="text-sm font-light leading-relaxed text-foreground/80 bg-brand-green/[0.03] p-4 italic">
                              {aiResult.story}
                            </p>
                          </div>
                          <div>
                            <label className="text-[10px] uppercase tracking-widest text-[#D66853] mb-3 block">Signature Selling Points</label>
                            <ul className="space-y-3">
                              {aiResult.details.map((detail: string, i: number) => (
                                <li key={i} className="text-xs font-light flex items-center gap-3">
                                  <CheckCircle2 className="w-4 h-4 text-brand-green" /> {detail}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <label className="text-[10px] uppercase tracking-widest text-[#D66853] mb-3 block">Instagram Marketing Copy</label>
                            <p className="text-[11px] font-mono leading-relaxed bg-[#1B4332] text-white/90 p-6">
                              {aiResult.marketingCopy}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                      <Button className="w-full rounded-none border-brand-green border-2 bg-transparent text-brand-green hover:bg-brand-green hover:text-white h-14 uppercase tracking-widest text-[10px]">
                        Apply This Branding to Product Page
                      </Button>
                    </motion.div>
                  )}
                </div>
              </div>
            ) : brandingSubTab === 'detail-page' ? (
              <div className="animate-fade-in">
                <DetailPageBuilder />
              </div>
            ) : (
              <div className="animate-fade-in space-y-12">
                {/* Visual Header Banner for Monetization */}
                <div className="bg-[#1B4332] text-[#FAF9F5] p-10 md:p-14 relative overflow-hidden ring-1 ring-white/10 shadow-md">
                  <div className="absolute right-0 top-0 bottom-0 opacity-10 hidden lg:block w-1/3">
                    <div className="w-full h-full border-l border-white/10 rotate-12 translate-x-24 scale-150 flex items-center justify-center">
                      <Sparkles className="w-56 h-56 text-white animate-pulse" />
                    </div>
                  </div>
                  
                  <div className="max-w-3xl space-y-4 relative z-10">
                    <Badge className="bg-[#D66853] text-white hover:bg-[#D66853]/90 rounded-none tracking-widest font-mono text-[9px] uppercase px-3 py-1">
                      Moum AI Monetization Bootstrap
                    </Badge>
                    <h2 className="text-3xl md:text-5xl magazine-heading font-medium tracking-tight leading-tight">
                      AI 로컬 식품 수익화 마스터 가이드 <br />
                      <span className="italic font-serif text-[#D66853]">“무자본에서 자사 브랜드 런칭까지”</span>
                    </h2>
                    <p className="text-xs md:text-sm text-[#FAF9F5]/80 font-light leading-relaxed max-w-2xl">
                      조용히 창작하고 준비하는 직장인, 예비 농어민, 1인 셀러를 위해 Google Gemini와 상생 테크를 결합한 최고의 로컬 상생 마케팅 비책입니다. 매일 1~2시간 가치 투자로 수익을 폭발시키세요.
                    </p>
                  </div>
                </div>

                {/* Part 1: Monetization Ideas Brainstorming */}
                <div className="space-y-6">
                  <div className="space-y-1.5">
                    <span className="text-[9px] uppercase tracking-[0.2em] text-[#D66853] font-bold font-mono">01. BRAINSTORMING</span>
                    <h3 className="text-2xl magazine-heading text-brand-green font-bold">AI 기성 식품 및 로컬 수익화 아이디어 3선</h3>
                    <p className="text-xs text-foreground/50 font-light">나만의 속도와 성향에 맞춘 AI 레버리지 무자본 비즈니스 모델입니다.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Idea 1 */}
                    <div className="bg-white border border-black/5 p-6 space-y-5 shadow-sm hover:border-brand-green/35 transition-all">
                      <div className="w-10 h-10 bg-brand-green/5 flex items-center justify-center text-brand-green">
                        <Layout className="w-5 h-5" />
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-sm font-bold text-brand-green">1) AI 로컬 맛집 & 식품 큐레이션 블로그</h4>
                        <p className="text-[11px] leading-relaxed text-foreground/60 font-light">
                          Google Gemini로 전국 숨은 맛집, 전통 식재료 트렌드를 정밀 인덱싱 후 전문적으로 연재합니다. 향후 탄생할 독점 브랜드의 진성 선주문 단골들을 선점 확보하는 핵심 씨앗 채널이 됩니다.
                        </p>
                      </div>
                      <div className="pt-3 border-t border-black/5 flex justify-between text-[10px] font-mono text-[#D66853]">
                        <span>✓ 무자본 저위험</span>
                        <span>✓ 블로그형 자산</span>
                      </div>
                    </div>

                    {/* Idea 2 */}
                    <div className="bg-white border border-black/5 p-6 space-y-5 shadow-sm hover:border-brand-green/35 transition-all">
                      <div className="w-10 h-10 bg-brand-green/5 flex items-center justify-center text-brand-green">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-sm font-bold text-brand-green">2) 소상공인 AI 카피라이팅 대행 서포트</h4>
                        <p className="text-[11px] leading-relaxed text-foreground/60 font-light">
                          마케팅 화력이 부재한 우리 동네 명인들의 소리 없는 외침을 돕습니다. 배달앱 메뉴 설명, 스마트플레이스 홍보 문구 초안 작성을 Gemini로 순식간에 고품격 드롭 대행하여 지속 대가를 획득합니다.
                        </p>
                      </div>
                      <div className="pt-3 border-t border-black/5 flex justify-between text-[10px] font-mono text-[#D66853]">
                        <span>✓ 압도적 시간대비 효율</span>
                        <span>✓ 즉각 현금 흐름</span>
                      </div>
                    </div>

                    {/* Idea 3 */}
                    <div className="bg-white border border-black/5 p-6 space-y-5 shadow-sm hover:border-brand-green/35 transition-all">
                      <div className="w-10 h-10 bg-brand-green/5 flex items-center justify-center text-brand-green">
                        <Package className="w-5 h-5" />
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-sm font-bold text-brand-green">3) "AI 분석 상권 마케팅" 전문 PDF 출판</h4>
                        <p className="text-[11px] leading-relaxed text-foreground/60 font-light">
                          혼자 고요히 가치에 사유하는 창작 성향에 제격입니다. 특정 타운의 외식 상권 흐름 및 고령 생산자 연출 카피 라이브러리를 Gemini로 집대성해 유료 전자책으로 출판, 평생 연금형 자동 소득을 구축합니다.
                        </p>
                      </div>
                      <div className="pt-3 border-t border-black/5 flex justify-between text-[10px] font-mono text-[#D66853]">
                        <span>✓ 평생 자동화 소득</span>
                        <span>✓ 무점포 디지털 자산</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Part 2: Selected Idea Best Choice Analysis */}
                <div className="bg-[#FAF9F5] border border-brand-green/10 p-6 md:p-8 space-y-6">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-[#FAF9F5] border border-[#D66853] text-[#D66853] rounded-none px-2 py-0.5 text-[9px] uppercase font-mono font-bold">Recommended</Badge>
                    <span className="text-[10px] uppercase font-mono tracking-widest text-brand-green font-bold">최적의 시너지 큐레이션 검증 아이디어</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    <div className="md:col-span-8 space-y-4">
                      <h4 className="text-xl md:text-2xl magazine-heading text-brand-green font-bold">
                        AI 기반 로컬 & 식품 전문 퍼스널 브랜딩 블로그 운영
                      </h4>
                      <p className="text-xs font-light text-foreground/75 leading-relaxed">
                        우리의 궁극적 기획은 타겟 소비자들의 영성을 울리고, 자사 로컬 브랜드를 팝업 매장에 안착시키는 것입니다. 
                        수익화 블로그는 단순 광고 수입을 뛰어넘어, 우리가 준비 중인 <strong>로컬 커머스 플랫폼('마켓모움')의 0단계 진성 선주문 단골 집단(로컬 엔젤)을 확보</strong>하기 위한 정밀한 우산형 마케팅 채널입니다. 
                        무자본으로 당장 오늘 밤 노트북을 켜고 이웃들과 조용히 가치 서사를 시작해 보세요.
                      </p>
                    </div>
                    
                    <div className="md:col-span-4 bg-white p-5 border border-black/5 text-[11px] space-y-3 font-mono rounded-none">
                      <div className="flex justify-between items-center text-brand-green font-bold pb-2 border-b border-black/5">
                        <span>🎯 4대 직계 시너지 분석</span>
                        <span className="text-[9px] text-[#D66853]">Moum Approved</span>
                      </div>
                      <ul className="space-y-2 text-foreground/70">
                        <li className="flex justify-between"><span>• 준비 중인 사업과 즉각 연계</span><strong className="text-brand-green">100%</strong></li>
                        <li className="flex justify-between"><span>• 초기 설비/자본 자금 리스크</span><strong className="text-[#D66853]">0원</strong></li>
                        <li className="flex justify-between"><span>• 퇴근 후 직장인 병행 안정성</span><strong className="text-brand-green">최상</strong></li>
                        <li className="flex justify-between"><span>• 애드포스트+협찬+공구 확장</span><strong className="text-brand-green">무제한</strong></li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Part 3: Roadmap (5 Steps) */}
                <div className="space-y-8">
                  <div className="space-y-1.5">
                    <span className="text-[9px] uppercase tracking-[0.2em] text-[#D66853] font-bold font-mono">02. STEP-BY-STEP ROADMAP</span>
                    <h3 className="text-2xl magazine-heading text-brand-green font-bold">AI 기반 로컬 식품 수익화 준비 5단계 로드맵</h3>
                    <p className="text-xs text-foreground/50 font-light">가치를 빚어내는 아티스트 마케터로 나아가는 고선명 실행 타임라인입니다.</p>
                  </div>

                  <div className="relative border-l border-brand-green/20 ml-4 pl-8 space-y-8 py-2">
                    {/* Step 1 */}
                    <div className="relative">
                      <div className="absolute -left-[41px] top-1 w-6 h-6 rounded-full bg-[#FAF9F5] border-2 border-[#4f46e5] flex items-center justify-center font-mono text-[9px] font-bold text-[#4f46e5]">1</div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold font-mono text-[#4f46e5]">1단계</span>
                          <span className="text-[#4f46e5] bg-[#4f46e5]/5 px-2 py-0.5 text-[8px] uppercase tracking-wider font-mono">Brand Persona Map</span>
                        </div>
                        <h4 className="text-sm font-bold text-brand-green">데이터 기반의 AI 멀티 페르소나 설계 및 디지털 기초 확립</h4>
                        <p className="text-xs font-light text-foreground/60 leading-relaxed max-w-4xl">
                          구글 제미나이를 활용하여 단순한 일상 기록 블로거를 넘어선 <b className="font-semibold text-[#4f46e5]">‘로컬 식품 브랜딩 및 마케팅 디렉터’</b>로서의 전문적인 정체성을 날카롭게 정의합니다. 핵심 타겟 지향 고객층을 3단계(예비 가치 가담자, 로컬 미식 탐험가, 극렬 장인 추종자)로 나누어 정교하게 세분화합니다.
                        </p>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="relative">
                      <div className="absolute -left-[41px] top-1 w-6 h-6 rounded-full bg-[#FAF9F5] border-2 border-[#10b981] flex items-center justify-center font-mono text-[9px] font-bold text-[#10b981]">2</div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold font-mono text-[#10b981]">2단계</span>
                          <span className="text-[#10b981] bg-[#10b981]/5 px-2 py-0.5 text-[8px] uppercase tracking-wider font-mono">Multimodal Content</span>
                        </div>
                        <h4 className="text-sm font-bold text-brand-green">AI 멀티모달 콘텐츠 고가용성 생산 체계 구축</h4>
                        <p className="text-xs font-light text-foreground/60 leading-relaxed max-w-4xl">
                          한 번 기획하여 작성한 웰메이드 에디토리얼 블로그 글 1개를 양목 삼아, 인스타그램 릴스를 위한 초미세 감성 스크립트와 유튜브 쇼츠용 숏폼 내레이션 대본을 동시다발적으로 일어내는 <b className="font-semibold text-[#10b981]">AI 워크플로우를 완성</b>합니다. 1인 창업자의 운영 피로도를 지상의 끝까지 낮춥니다.
                        </p>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="relative">
                      <div className="absolute -left-[41px] top-1 w-6 h-6 rounded-full bg-[#FAF9F5] border-2 border-[#f59e0b] flex items-center justify-center font-mono text-[9px] font-bold text-[#f59e0b]">3</div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold font-mono text-[#f59e0b]">3단계</span>
                          <span className="text-[#f59e0b] bg-[#f59e0b]/5 px-2 py-0.5 text-[8px] uppercase tracking-wider font-mono">Hyper-Local Community</span>
                        </div>
                        <h4 className="text-sm font-bold text-brand-green">커뮤니티 빌딩 및 하이퍼 로컬 데이터 집중 수집</h4>
                        <p className="text-xs font-light text-foreground/60 leading-relaxed max-w-4xl">
                          오프라인의 숨쉬는 진짜 로컬 체험단 및 미식 연대와 밀결합합니다. 로컬 맛집 기획 키워드로 유입된 오프라인 예비 생산자와 요식 매장 점주 네트워크를 확보하며, 인게이지먼트가 높은 팬덤 정예를 폐쇄형 구독 뉴스레터 혹은 전용 프라이빗 소모임 카카오톡으로 유치해 데이터 질적 축적을 이뤄냅니다.
                        </p>
                      </div>
                    </div>

                    {/* Step 4 */}
                    <div className="relative">
                      <div className="absolute -left-[41px] top-1 w-6 h-6 rounded-full bg-[#FAF9F5] border-2 border-[#ef4444] flex items-center justify-center font-mono text-[9px] font-bold text-[#ef4444]">4</div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold font-mono text-[#ef4444]">4단계</span>
                          <span className="text-[#ef4444] bg-[#ef4444]/5 px-2 py-0.5 text-[8px] uppercase tracking-wider font-mono">MVP Launching</span>
                        </div>
                        <h4 className="text-sm font-bold text-brand-green">수익 모델의 가치 다각화 및 자사 슬로우 브랜드 MVP 런칭</h4>
                        <p className="text-xs font-light text-foreground/60 leading-relaxed max-w-4xl">
                          그동안 수집해온 팬덤의 미식 지향 취향 데이터를 대칭 삼아 가장 반응이 선명했던 산지의 농가와 제휴하여, <b className="font-semibold text-[#ef4444]">특색 로컬 식품 공동 큐레이션 박스를 MVP 제품으로 정전 론칭</b>합니다. 혹은 그동안의 상권 분석 자료를 '장인 브랜딩 리포트'라는 매혹적인 유료 PDF 문서 파일로 가공해 가치 제값을 인정 판매합니다.
                        </p>
                      </div>
                    </div>

                    {/* Step 5 */}
                    <div className="relative">
                      <div className="absolute -left-[41px] top-1 w-6 h-6 rounded-full bg-[#FAF9F5] border-2 border-[#8b5cf6] flex items-center justify-center font-mono text-[9px] font-bold text-[#8b5cf6]">5</div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold font-mono text-[#8b5cf6]">5단계</span>
                          <span className="text-[#8b5cf6] bg-[#8b5cf6]/5 px-2 py-0.5 text-[8px] uppercase tracking-wider font-mono">Automated Scale-Up</span>
                        </div>
                        <h4 className="text-sm font-bold text-brand-green">제미나이 API 결합 무인 자동화 고도화 및 전국 오프라인 상생 팝업 확장</h4>
                        <p className="text-xs font-light text-foreground/60 leading-relaxed max-w-4xl">
                          구글 제미나이 API를 당사의 CMS 블로그 및 유통 시스템과 적극 연계하여 일일 기본 댓글 대응, 타겟 이웃 발송 문구, 인스타그램 최신 트렌드 해시태그 스냅 수집을 99% 무인 자동화로 정착시킵니다. 확보된 순유입 현금과 플랫폼 화력을 바탕으로 전국 각지에 대형 오동나무함 한정판 정기 쇼룸 및 오프라인 상생 커머스를 정기 확대합니다.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Part 4: Innovative Marketing Strategies */}
                <div className="space-y-8">
                  <div className="space-y-1.5">
                    <span className="text-[9px] uppercase tracking-[0.2em] text-[#D66853] font-bold font-mono">03. INNOVATIVE STRATEGIES</span>
                    <h3 className="text-2xl magazine-heading text-brand-green font-bold">타겟 도달 및 수익 극대화를 위한 마케팅 혁신 5대 전선</h3>
                    <p className="text-xs text-foreground/50 font-light">기존 유통 채널의 후려치기 문법을 고차원 가치 서사로 일축하는 모움 전용 마케팅 진수입니다.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                    {/* Strategy 1 */}
                    <div className="border border-black/5 bg-white p-5 space-y-4 shadow-sm">
                      <span className="text-xl font-serif text-[#6366f1] font-bold">01</span>
                      <h4 className="text-xs font-bold text-brand-green">트렌드 선점 예측</h4>
                      <p className="text-[10px] leading-relaxed text-foreground/60 font-light">
                        제미나이의 실시간 검색 분석 및 시계열 트렌드 예측 장치를 응용합니다. 경쟁 블로거들보다 최소 3개월 미리 유력 감귤 품종, 친환경 전통 소금 제조 등 2026년 대목 예상 테마를 앞질러 장악합니다.
                      </p>
                    </div>

                    {/* Strategy 2 */}
                    <div className="border border-black/5 bg-white p-5 space-y-4 shadow-sm">
                      <span className="text-xl font-serif text-[#ec4899] font-bold">02</span>
                      <h4 className="text-xs font-bold text-brand-green">초개인화 큐레이션</h4>
                      <p className="text-[10px] leading-relaxed text-foreground/60 font-light">
                        블로그를 그저 읽고 지나치는 평면 책자가 아닌 쌍방향 극장으로 개조합니다. 방문자가 취향, 나이, 마실 주종을 남기면 AI 챗봇이 즉각 1:1 기장 전복포와 서해 감태 오찬 배합비를 리포트로 떨어뜨리는 인터랙티브 놀이터를 부여합니다.
                      </p>
                    </div>

                    {/* Strategy 3 */}
                    <div className="border border-black/5 bg-white p-5 space-y-4 shadow-sm">
                      <span className="text-xl font-serif text-[#f97316] font-bold">03</span>
                      <h4 className="text-xs font-bold text-brand-green">마이크로 인플루언서</h4>
                      <p className="text-[10px] leading-relaxed text-foreground/60 font-light">
                        수천만 원대 비실속 거대 계정을 파괴하고 깊은 밀착을 띱니다. 고해상도 로컬 전통 미식을 파고드는 특정 시골 애호 동아리, 소량 위스키 살롱을 주재하는 마이크로 작가들을 타겟으로 AI 맞춤 정성 제안서를 보내 실구매 전환을 수작 성사시킵니다.
                      </p>
                    </div>

                    {/* Strategy 4 */}
                    <div className="border border-black/5 bg-white p-5 space-y-4 shadow-sm">
                      <span className="text-xl font-serif text-[#06b6d4] font-bold">04</span>
                      <h4 className="text-xs font-bold text-brand-green">O2O 포그라운드</h4>
                      <p className="text-[10px] leading-relaxed text-foreground/60 font-light">
                        온라인의 가상 텍스트가 실물 정성으로 전압되는 마법을 선보입니다. 글 속에 내장된 산지 특산 QR코드와 프리미엄 전통 각인 쿠폰을 소지하고 우리 동네 팝업 목함 매장을 밟으면 즉석 시식 키트를 건네 실시간 소속을 완성합니다.
                      </p>
                    </div>

                    {/* Strategy 5 */}
                    <div className="border border-black/5 bg-white p-5 space-y-4 shadow-sm">
                      <span className="text-xl font-serif text-[#14b8a6] font-bold">05</span>
                      <h4 className="text-xs font-bold text-brand-green">브랜드 팬덤 극화</h4>
                      <p className="text-[10px] leading-relaxed text-foreground/60 font-light">
                        단순 차가운 상품 스펙 기재를 정면 거부합니다. 보길도 성창수 장주가 수만 마리의 가시를 수작업으로 한 땀 한 땀 다치며 발라내던 불빛 밤, 그들의 한옥 가문 자그마한 한숨과 역사적 투지를 스토리로 드라마틱 극화해 단골을 충성 신도로 둔갑시킵니다.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Part 5: Action Plan (1~4 Weeks) & Gemini Prompt */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
                  {/* Left Column: Weekly Action Plan */}
                  <div className="lg:col-span-12 xl:col-span-7 space-y-6">
                    <div className="space-y-1">
                      <Badge className="bg-[#1B4332] text-[#FAF9F5] rounded-none text-[8px] tracking-widest font-mono uppercase px-2 py-0.5">Four-Week Intensive Schedule</Badge>
                      <h4 className="text-lg font-bold text-brand-green">초보자를 위한 4주 집중 고속 침투 액션 플랜</h4>
                    </div>

                    <div className="bg-[#FAF9F5] border border-black/5 divide-y divide-black/5 rounded-none font-sans text-xs">
                      {/* Week 1 */}
                      <div className="p-5 flex gap-4 items-start">
                        <span className="w-16 font-mono font-bold text-[#D66853] bg-[#D66853]/5 px-2 py-1 text-center border border-[#D66853]/15">Week 1</span>
                        <div className="space-y-1.5 flex-1">
                          <h5 className="font-bold text-brand-green leading-none">디지털 거점 개설 & 1일 1기록 세우기</h5>
                          <p className="text-[11px] text-foreground/60 leading-relaxed font-light">
                            네이버 블로그, 페이스 혹은 한산도 은빛 같은 나만의 글 채널을 한옥 분위기로 개장합니다. 카테고리를 '명인 맛집 리뷰', '로컬 식품 상생 가문', '신비한 산지 비밀 일기'로 배속하고, <b>매일 1포스팅 글쓰기 근육</b>을 제미나이와 한 몸이 되어 정갈하게 기릅니다.
                          </p>
                        </div>
                      </div>

                      {/* Week 2 */}
                      <div className="p-5 flex gap-4 items-start">
                        <span className="w-16 font-mono font-bold text-brand-green bg-[#1B4332]/5 px-2 py-1 text-center border border-brand-green/15">Week 2</span>
                        <div className="space-y-1.5 flex-1">
                          <h5 className="font-bold text-brand-green leading-none">고밀도 분석 및 로컬 연대 소통 점화</h5>
                          <p className="text-[11px] text-foreground/60 leading-relaxed font-light">
                            제미나이에게 "전 세계를 뒤흔든 로컬 크라우드 펀딩의 원물 성공 방정식 10곳을 추려 정밀 분석해 줘"라고 주문하고 이를 멋지게 카드 뉴스로 기획 송출합니다. 동시에 우리와 지향이 흡사한 미식 지킴이 리더 50명에게 먼저 손을 밀어 장석조 명인처럼 연대를 결속합니다.
                          </p>
                        </div>
                      </div>

                      {/* Week 3 */}
                      <div className="p-5 flex gap-4 items-start">
                        <span className="w-16 font-mono font-bold text-brand-green bg-[#1B4332]/5 px-2 py-1 text-center border border-brand-green/15">Week 3</span>
                        <div className="space-y-1.5 flex-1">
                          <h5 className="font-bold text-brand-green leading-none">첫 제휴 파트너 고리 장전 & 현금 전환 맛보기</h5>
                          <p className="text-[11px] text-foreground/60 leading-relaxed font-light">
                            쿠팡 파트너스, 혹은 산지 직송 프리미엄 농어 교환 위탁에 전격 당도합니다. 밤 슬라이스 식혜 가루, 명인 무농약 조천 귤을 극화한 감성 가문 기획 후기를 남기고, 글 꼬리에 단정히 구매 링크나 전용 예약 위젯을 심어 <b>첫 은빛 디지털 가치 소득을 눈으로 대면</b>합니다.
                          </p>
                        </div>
                      </div>

                      {/* Week 4 */}
                      <div className="p-5 flex gap-4 items-start">
                        <span className="w-16 font-mono font-bold text-brand-green bg-[#1B4332]/5 px-2 py-1 text-center border border-brand-green/15">Week 4</span>
                        <div className="space-y-1.5 flex-1">
                          <h5 className="font-bold text-brand-green leading-none">가상의 한옥 스토리 시장 조사 및 볼륨업</h5>
                          <p className="text-[11px] text-foreground/60 leading-relaxed font-light">
                            우리가 예비로 기틀 잡은 PB 사료 선구입 활장어 덮밥장 스토리를 "만약 전복과 깊은 들개 생기름이 결합된다면 서포트하실 마음이 있으신가요?"라는 설문형 극장 글로 게시해 시장 화력을 타진하고, 누적 일일 100명 미식 동맹 대업 돌파를 기념해 체험단 동맹에 날개를 답니다.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Google Gemini Guide & Copiable Prompt */}
                  <div className="lg:col-span-12 xl:col-span-5 bg-white border border-brand-green/10 p-6 md:p-8 flex flex-col justify-between space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#D66853]" />
                        <span className="text-[10px] uppercase font-mono tracking-widest text-[#D66853] font-bold">Magic Prompt Engine</span>
                      </div>
                      <h4 className="text-lg magazine-heading text-brand-green font-bold">
                        Gemini 접속 및 초보용 마법 프롬프트
                      </h4>
                      <p className="text-xs font-light text-foreground/60 leading-relaxed">
                        누벨바그 미식 작가 수준의 한옥 정서 에디토리얼을 완성하는 프롬프트입니다. 아래 상자 안의 텍스트를 마우스 왼쪽 클릭 한 번으로 고스란히 복사하여 <b>gemini.google.com</b>에 날려 주십시오.
                      </p>
                    </div>

                    {/* Copiable Message Box */}
                    <div className="p-4 bg-[#FAF9F5] border border-black/5 space-y-4 font-mono text-xs rounded-none">
                      <div className="flex justify-between items-center text-[9px] text-slate-400 border-b border-black/5 pb-2">
                        <span>초보자용 만능 마법 프롬프트</span>
                        <span className="text-brand-green">Copiable Template</span>
                      </div>
                      <p className="text-[10.5px] leading-relaxed text-slate-700 font-sans italic">
                        "안녕 Gemini! 나는 로컬 식품 브랜드를 준비 중인 마케팅 전문가야. 오늘 블로그에 '전국에서 가장 유명한 로컬 전통주 5가지와 그에 어울리는 안주 조합'에 대해 라이프스타일 매거진 느낌으로 글을 쓰려고 해. 사람들이 흥미를 느끼고 스토리 깊이 몰입하게 매력적인 카피 제목 3개와 블로그 본문 내용을 아주 상세히 전해줘. 각 술 장인의 특징과 최고급 마케팅 소구점도 포함해주면 참 좋겠어."
                      </p>
                    </div>

                    {/* Copy Prompt Action */}
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`안녕 Gemini! 나는 로컬 식품 브랜드를 준비 중인 마케팅 전문가야. 오늘 블로그에 '전국에서 가장 유명한 로컬 전통주 5가지와 그에 어울리는 안주 조합'에 대해 라이프스타일 매거진 느낌으로 글을 쓰려고 해. 사람들이 흥미를 느끼고 스토리 깊이 몰입하게 매력적인 카피 제목 3개와 블로그 본문 내용을 아주 상세히 전해줘. 각 술 장인의 특징과 최고급 마케팅 소구점도 포함해주면 참 좋겠어.`);
                        alert("마법의 만능 프롬프트가 정갈하게 클립보드 복사되었습니다! gemini.google.com 에 붙여넣으세요!");
                      }}
                      className="w-full bg-[#D66853] hover:bg-[#c05743] text-[#FAF9F5] py-4 text-xs font-mono uppercase tracking-widest font-bold transition-all rounded-none cursor-pointer text-center"
                    >
                      프롬프트 한판 복사하기
                    </button>

                    <div className="p-3 bg-brand-green/[0.03] text-[9.5px] text-brand-green/70 leading-relaxed flex gap-2.5 items-start font-mono font-medium">
                      <span>🔔 안내:</span>
                      <span>
                        복사 후 구글 계정으로 로그인한 제미나이 브라우저 대화창에 마우스 우클릭 후 붙여넣기로 사용하세요. 클릭 단위로 완벽 제어 가능합니다.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-8 outline-none">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Image banner inside analytical cards */}
              <div className="lg:col-span-1 border border-black/5 bg-white p-6 flex flex-col justify-between">
                <div>
                  <Badge className="bg-[#D66853] text-white rounded-none tracking-widest text-[8px] uppercase mb-4">Traffic & Growth</Badge>
                  <h3 className="text-xl magazine-heading text-brand-green mb-3">유기적 성장 분석</h3>
                  <p className="text-xs font-light text-foreground/60 leading-relaxed mb-6">
                    로컬 스토어의 가치 지향적 소비 통계입니다. 단순 조회수를 넘어, 브랜드 스토리에 3초 이상 체류하며 로컬 아티스트의 철학을 깊이 경청한 방문자의 비율을 실시간 분석합니다.
                  </p>
                </div>
                <div className="relative aspect-[4/3] w-full overflow-hidden mb-2">
                  <img src={analyticsCoverImg} className="w-full h-full object-cover grayscale-[10%]" alt="Analytics report visual" referrerPolicy="no-referrer" />
                </div>
              </div>

              {/* Graphic stats dashboard */}
              <div className="lg:col-span-2 border border-black/5 bg-white p-8 space-y-6">
                <div className="flex justify-between items-center border-b border-black/5 pb-4">
                  <h4 className="text-xs uppercase tracking-widest text-brand-green font-semibold">Monthly Value Analytics</h4>
                  <span className="text-[10px] uppercase text-foreground/40 font-mono">Last 6 Months (2026)</span>
                </div>
                {/* Custom Elegant CSS-styled bar chart that matches the bespoke artistic visual identity */}
                <div className="space-y-5 pt-2">
                  {[
                    { month: '1월 (Jan)', value: '₩1,800,000', height: '40%', reads: '412 story reads' },
                    { month: '2월 (Feb)', value: '₩2,100,000', height: '52%', reads: '516 story reads' },
                    { month: '3월 (Mar)', value: '₩3,500,000', height: '78%', reads: '890 story reads' },
                    { month: '4월 (Apr)', value: '₩3,200,000', height: '68%', reads: '730 story reads' },
                    { month: '5월 (May)', value: '₩4,800,000', height: '94%', reads: '1,240 story reads' },
                    { month: '6월 (Jun)', value: '₩5,200,000', height: '100%', reads: '1,450 story reads' },
                  ].map((data, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-light">
                        <span className="text-brand-green font-medium">{data.month}</span>
                        <div className="flex gap-4">
                          <span className="text-foreground/40 font-mono">{data.reads}</span>
                          <span className="font-semibold text-brand-green">{data.value}</span>
                        </div>
                      </div>
                      <div className="h-2.5 bg-[#F3F1E7]/80 w-full">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: data.height }}
                          transition={{ duration: 0.8, delay: idx * 0.1 }}
                          className="h-full bg-brand-green"
                        ></motion.div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 bg-brand-green/[0.02] border border-brand-green/10 text-xs font-light text-brand-green leading-relaxed">
                  <strong>💡 브랜딩 인사이트:</strong> 5월 스토리 독서 체류 시간이 늘어남에 따라 6월 매출액이 동시에 8.3% 상승했습니다. 브랜드 고유의 스토리를 읽는 깊은 인게이지먼트가 가치소비로 충실하게 이어지며 지속 가능한 팬덤을 만들고 있습니다.
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="pb-matching" className="space-y-8 outline-none border-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 border border-black/5 bg-white p-6 flex flex-col justify-between">
                <div>
                  <Badge className="bg-[#D66853] text-white rounded-none tracking-widest text-[8px] uppercase mb-4">Curation Partnership</Badge>
                  <h3 className="text-xl magazine-heading text-brand-green mb-3">PB 매칭 및 독점 기회</h3>
                  <p className="text-xs font-light text-foreground/60 leading-relaxed mb-6">
                    백화점, 수제 큐레이션숍, 디자인 북카페 등 프리미엄 오프라인 공간을 가진 파트너와 로컬 크리에이터의 연계를 실시간 지원합니다. 스토어 가치가 상호 수렴하는 기획 입점을 무료 지원합니다.
                  </p>
                </div>
                <div className="relative aspect-[4/3] w-full overflow-hidden mb-2">
                  <img src={pbCoverImg} className="w-full h-full object-cover grayscale-[10%]" alt="PB packaging set" referrerPolicy="no-referrer" />
                </div>
              </div>

              <div className="lg:col-span-2 space-y-4">
                {[
                  { 
                    partner: '현대 리빙 디자인 편집숍 (H-Living Premium)', 
                    score: '96% Match', 
                    type: '자연 친화 리빙 기획', 
                    desc: '전통 제작 방식을 유지하여 천연 향을 담은 소이 캔들 및 대나무 공예 소품의 고급 패키지 콜라보 정식 기획 제안 기회입니다.',
                    status: '제안 접수중',
                    color: 'bg-brand-green'
                  },
                  { 
                    partner: '아난티 호텔 앤 리조트 가평 (Ananti GA Suite 어메니티)', 
                    score: '91% Match', 
                    type: '프리미엄 웰니스 어메니티', 
                    desc: '지역 천연 원재료 기반 마스크팩 혹은 수제 도자기 어메니티 세트의 VIP 객실 비치 및 독점 기프트 컬렉션 입점 매칭입니다.',
                    status: '협의 진행중',
                    color: 'bg-emerald-600'
                  },
                  { 
                    partner: '인덱스 숍앤까페 홍대점 (Index Handcrafted Collection)', 
                    score: '84% Match', 
                    type: '아날로그 라이프스타일 컵&굿즈', 
                    desc: '도자기 장인이 빚은 흙담 질감 제주의 흑색 머그 기획 상품 시리즈와 가을 시즌 큐레이션 매장 쇼케이스 전시 연계 기회입니다.',
                    status: '제안 준비중',
                    color: 'bg-amber-600'
                  },
                ].map((pb, i) => (
                  <div key={i} className="border border-black/5 bg-white p-6 space-y-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex flex-wrap gap-2 mb-2 items-center">
                          <span className="bg-[#F3F1E7] text-brand-green text-[8px] px-2 py-0.5 tracking-widest uppercase font-mono">{pb.type}</span>
                          <span className={`${pb.color} text-white text-[8px] px-2 py-0.5 tracking-widest uppercase font-mono`}>{pb.score}</span>
                        </div>
                        <h4 className="text-base text-brand-green font-medium">{pb.partner}</h4>
                      </div>
                      <Badge variant="outline" className="border-brand-green text-brand-green rounded-none text-[9px] px-2 py-0.5">{pb.status}</Badge>
                    </div>
                    <p className="text-xs font-light text-foreground/70 leading-relaxed pr-6">{pb.desc}</p>
                    <div className="flex justify-end gap-3 pt-1 border-t border-black/5">
                      <Button variant="ghost" size="sm" className="rounded-none text-[10px] uppercase tracking-widest h-8 text-foreground/40 hover:text-brand-green">상세보기</Button>
                      <Button size="sm" className="rounded-none bg-brand-green text-white hover:bg-brand-green/90 text-[10px] uppercase tracking-widest h-8">제안 등록하기</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

