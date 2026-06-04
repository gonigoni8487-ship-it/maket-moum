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
  const [brandingSubTab, setBrandingSubTab] = useState<'identity' | 'detail-page'>('identity');
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
            <div className="flex bg-[#F3F1E7]/80 border border-black/5 p-1 justify-start mb-8 max-w-md">
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
            ) : (
              <div className="animate-fade-in">
                <DetailPageBuilder />
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

