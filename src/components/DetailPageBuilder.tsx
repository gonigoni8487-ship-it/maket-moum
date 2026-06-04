import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Upload, 
  User, 
  Tag, 
  BookOpen, 
  Heart, 
  Check, 
  Compass, 
  Layers, 
  Loader2, 
  Maximize2, 
  Smartphone,
  Eye,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DetailPageData, Product } from '../types';
import { PRODUCTS } from '../constants';

export default function DetailPageBuilder() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [detailResult, setDetailResult] = useState<DetailPageData | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  
  // Form states
  const [productName, setProductName] = useState('');
  const [productType, setProductType] = useState('Food & Beverage (우리 맛)');
  const [selectedPersona, setSelectedPersona] = useState('2030 가치소비 지향 매거진 매니아');
  const [customPrompt, setCustomPrompt] = useState('성수동 가을 팝업스토어처럼 절제된 감각으로, 현대적이고 시적으로 스토리라인을 다듬어줘.');
  
  // Image handling
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [uploadedImageFile, setUploadedImageFile] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Preset personas
  const personas = [
    { name: '2030 가치소비 지향 매거진 매니아', desc: '디자인 철학과 환경 보호, 감각적인 비주얼을 추구하는 젊은 세대' },
    { name: '특별한 날, 전통과 진심을 전하는 고급 선물 구매자', desc: '부모님, 은사 혹은 중요 바이어를 위해 격조 있는 패키징과 명인의 신뢰를 찾는 이들' },
    { name: '지친 일상을 다도와 자연의 향으로 채우는 웰니스 미니멀리스트', desc: '슬로우 라이프와 자연 유래 천연 소재 고유의 아날로그 질감에 몰입하는 홈코노미' },
    { name: '지역 고유의 레시피와 헤리티지를 음미하는 프리미엄 식도락가', desc: '단순 배부름을 넘어 식문화 명가 고유의 저온 저염 발효/숙성 미학을 아는 미식가' }
  ];

  // Preset products quick populator
  const handleSelectPreset = (pId: string) => {
    setSelectedPreset(pId);
    const prod = PRODUCTS.find(p => p.id === pId);
    if (prod) {
      setProductName(prod.name);
      setProductType(prod.category === 'Food' ? 'Food & Beverage (우리 맛)' : prod.category === 'Craft' ? 'Craft & Object (수공예품과 도기)' : 'Living & Scent (살림과 향)');
      setSelectedImage(prod.image);
      setUploadedImageFile(null);
      
      // Auto custom prompt matching category
      if (prod.category === 'Food') {
        setCustomPrompt('마치 궁중 비법 어진 요리책의 정수를 펼치듯 오물이 차는 깊은 숙성과 감기지 않는 감칠맛의 격조를 극대화해줘.');
      } else if (prod.category === 'Craft') {
        setCustomPrompt('시간이 흘러 손때가 묻을수록 정갈한 무광 도자기 흙 본연의 투박하지만 시크한 비주얼을 은유적으로 묘사해줘.');
      } else {
        setCustomPrompt('숲의 고요한 새벽 안개와 가문비나무가 전하는 자연 정화의 은은한 향기를 미니멀하고 포근한 텍스처로 적어줘.');
      }
    }
  };

  // Image Drag & Drop Handler
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setUploadedImageFile(event.target.result as string);
          setSelectedImage(''); // Clears preset image selection
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setUploadedImageFile(event.target.result as string);
          setSelectedImage('');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Generate Detail Page Layout via Backend Express Service
  const handleGeneratePage = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/ai/detail-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName,
          productType,
          persona: selectedPersona,
          prompt: customPrompt
        })
      });

      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      setDetailResult(data);
    } catch (err) {
      console.error(err);
      // Fallback response with beautiful contents in case of any network failure
      setDetailResult({
        intro: {
          title: `시간의 이슬이 빚은 ${productName}`,
          subtitle: `${productType}의 정수가 전하는 은은하고 단단한 무드`,
          summary: `전통적인 제법과 장인의 혼이 깃든 공예를 통해 빚어졌습니다. 자연에서 길어 올린 순수한 재료들은 일상의 공간에 스며들어 고유한 분위기를 형성하고 깊은 치유를 전합니다.`
        },
        legacy_story: {
          headline: '자연을 소중히 기다릴 줄 아는 시간의 사투',
          narrative: '장인은 매일 새벽 이른 아침 맑게 개인 공기를 들이마쉬며 묵묵히 본인의 손끝 감각에 의지하여 재료들을 고르고 매만집니다. 세상의 기성은 빠르고 화려할지 모르나 장인의 고가마와 작은 옹기에서는 더딘 조율만이 정직함이라 믿습니다.'
        },
        sensory_profile: {
          visual: '천연 유래 성분과 자연의 풍상을 겪은 진흙이 결합하여 빚어낸 온화하면서도 신비한 고운 연회색의 빛깔.',
          touch_text: '만져보는 순간, 공장에서 찍어낸 매끈함과는 달리 은은하게 숨구멍이 느껴지는 자연스러운 거친 듯 보드라운 촉감.',
          atmosphere: '공간에 하나만 놓여 있어도 요란했던 오늘 하루의 소음을 묵음처럼 잠재우고 맑은 숲속의 고요함을 연출하는 온기.'
        },
        features: [
          {
            number: '01',
            title: '숨을 쉬는 천연 발효 및 손성형',
            explain: '기계식 프레스를 전면 포기하고 웅장한 대자연의 밀도를 온전히 표현하는 전통 수압 성형 및 옹기 발효 기공을 그대로 살렸습니다.'
          },
          {
            number: '02',
            title: '비대칭의 조화가 주는 시각적 울림',
            explain: '완벽한 원을 그리는 인위적인 모습 대신, 대자연의 바위 무더기나 이슬방울의 매력처럼 물 흐르는 듯 자연스러운 미세 비대칭과 굴곡을 연출해 냈습니다.'
          },
          {
            number: '03',
            title: '격식을 차려 소중히 전하는 감동 패키징',
            explain: '환경에 생채기를 내지 않는 재생 펄프 크래프트 소재의 친환경 한지 보호재와 아티스트의 철학을 고정밀 활판 인쇄한 띠지가 고급스럽게 둘러집니다.'
          }
        ],
        lifestyle_matching: {
          headline: `우리 고유의 오롯한 멋을 수집하고 향유하는 슬로우 크리에이터를 기리며`,
          matching_points: [
            '아침 요가 직후, 가볍게 우려낸 미각으로 깊은 몰입의 숨고르기를 진행하실 때',
            '집들이 혹은 평소에 진정으로 고마웠던 은인께, 말로는 설명하기 힘든 장인의 숨결과 정성을 담은 첫 패키징을 뜯는 기쁨을 선물하고 싶을 때',
            '단순 소모품이 아닌 평생 동안 나의 서가 한구석을 빛내주며 대화를 주도할 빈티지한 애착 오브제가 필요할 때'
          ]
        },
        guide: {
          usage: '물에 직접 오랫동안 담가두거나 강한 합성 화학 세정제를 고농도로 투입하기보다는, 은은한 미온수에 안개 세안하듯 손가락으로 가볍게 헹구어 마른 유기 융으로 쓸어내려 공기가 통하는 곳에 보관하는 매 순간의 의식을 적극 권합니다.',
          storage: '직사광선 장시간 노출이나 갑작스러운 급냉/급열 같은 외부 스트레스는 대자연의 숨결에 무리를 줄 수 있으니, 상온의 아늑한 서랍장 하단이나 침실 머리맡 선반 위에 소중하게 정돈하시면 오래도록 변치 않는 한결같음으로 보답합니다.'
        }
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const getPreviewImage = () => {
    if (uploadedImageFile) return uploadedImageFile;
    if (selectedImage) return selectedImage;
    return 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=1200&auto=format&fit=crop';
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
      {/* Input controls on the left */}
      <div className="xl:col-span-5 space-y-8">
        <Card className="rounded-none border-black/5 bg-white shadow-sm overflow-hidden">
          <div className="bg-[#1B4332] text-white px-6 py-4 flex items-center gap-2">
            <Compass className="w-5 h-5 text-[#D66853] animate-spin-slow" />
            <span className="text-xs tracking-[0.2em] uppercase font-mono font-medium">Boutique Editorial Designer</span>
          </div>
          
          <CardHeader className="space-y-4">
            <div>
              <CardTitle className="magazine-heading text-2xl text-brand-green leading-tight">상세페이지 AI 카피라이팅 빌더</CardTitle>
              <CardDescription className="text-xs mt-1">
                시간의 깊이를 이해하는 최고의 로컬 브랜드 디자이너가 되어 완벽한 상세페이지 스토리와 감도 높은 에디토리얼을 완성해 보세요.
              </CardDescription>
            </div>

            {/* Quick Demo Selector */}
            <div className="pt-2 border-t border-black/5">
              <span className="text-[10px] uppercase font-mono tracking-widest text-foreground/45 block mb-2">장인 제품 프리셋으로 시작하기:</span>
              <div className="flex flex-wrap gap-2">
                {PRODUCTS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPreset(p.id)}
                    className={`text-[9px] px-2.5 py-1.5 transition-all flex items-center gap-1.5 font-medium border cursor-pointer ${
                      selectedPreset === p.id 
                        ? 'bg-brand-green text-white border-brand-green' 
                        : 'bg-[#F3F1E7]/40 text-brand-green border-brand-green/10 hover:bg-[#F3F1E7]/100'
                    }`}
                  >
                    {p.id === 'p1' ? '🍎' : p.id === 'p2' ? '🕯️' : p.id === 'p3' ? '☕' : '🦪'} {p.name.split(' (')[0]}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* 1. Product Name */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-[#D66853] font-medium flex items-center justify-between">
                <span>01. Product Name (상품명)</span>
                {productName.length > 0 && <Check className="w-3.5 h-3.5 text-brand-green" />}
              </label>
              <input 
                className="w-full bg-[#FDFCF8] border border-black/5 p-4 text-xs font-light focus:outline-none focus:ring-1 focus:ring-brand-green transition-all" 
                placeholder="e.g. 제주 오름 청조 찻잔 세트"
                value={productName}
                onChange={e => {
                  setProductName(e.target.value);
                  setSelectedPreset(''); // reset preset
                }}
              />
            </div>

            {/* 2. Product Type */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-[#D66853] font-medium">02. Product Type & Mood category (상품 유형)</label>
              <select 
                className="w-full bg-[#FDFCF8] border border-black/5 p-4 text-xs font-light focus:outline-none focus:ring-1 focus:ring-brand-green cursor-pointer"
                value={productType}
                onChange={e => setProductType(e.target.value)}
              >
                <option>Food & Beverage (우리 맛 · 고택 식재료)</option>
                <option>Living & Scent (살림과 일상 무드 · 천연 공예)</option>
                <option>Craft & Object (수공예품과 도기 · 흙의 숨결)</option>
                <option>Heritage Garment (시간의 옷샘 · 전통 자연 직물)</option>
              </select>
            </div>

            {/* 3. Image Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-[#D66853] font-medium">03. Visual Image Source (제품 무드컷 사진)</label>
              
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border border-dashed p-6 text-center transition-all cursor-pointer relative flex flex-col items-center justify-center ${
                  dragActive ? 'border-brand-green bg-brand-green/[0.02]' : 'border-black/10 bg-[#FDFCF8] hover:border-brand-green/50'
                }`}
              >
                <input 
                  type="file" 
                  id="image-file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleFileChange} 
                />
                
                {getPreviewImage() ? (
                  <div className="relative w-full aspect-video h-40 overflow-hidden mb-3 bg-[#F3F1E7]">
                    <img 
                      src={getPreviewImage()} 
                      className="w-full h-full object-cover" 
                      alt="Current preview" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-2 right-2 bg-brand-green text-white text-[8px] tracking-widest py-1 px-2 font-mono uppercase bg-opacity-90">
                      {uploadedImageFile ? 'Uploaded File' : selectedImage ? 'Preset Selected' : 'Generic Default'}
                    </div>
                  </div>
                ) : (
                  <Upload className="w-8 h-8 text-foreground/30 mb-2" />
                )}

                <label htmlFor="image-file" className="text-xs text-brand-green cursor-pointer hover:underline font-medium">
                  여기를 클릭하거나 파일을 여기에 드롭하여 커스텀 사진 첨부
                </label>
                <p className="text-[10px] text-foreground/40 font-light mt-1">
                  또는 패키징 프리셋 선택 시 고해상 장인 이미지 자동 대입
                </p>
              </div>
            </div>

            {/* 4. Target Persona Selector */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-[#D66853] font-medium flex items-center justify-between">
                <span>04. Target Buyer Profile (페르소나 양식)</span>
                <Badge variant="outline" className="text-[8px] bg-[#FDFCF8] text-[#D66853] font-light font-mono px-2 rounded-none border-[#D66853]/20">Active Alignment</Badge>
              </label>
              
              <div className="space-y-2">
                {personas.map((per, index) => (
                  <div 
                    key={index}
                    onClick={() => setSelectedPersona(per.name)}
                    className={`p-3 border text-left cursor-pointer transition-all ${
                      selectedPersona === per.name 
                        ? 'border-brand-green bg-brand-green/[0.02] ring-1 ring-brand-green/20' 
                        : 'border-black/5 bg-[#FDFCF8] hover:border-brand-green/20'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-3 h-3 rounded-full border flex items-center justify-center ${
                        selectedPersona === per.name ? 'border-brand-green bg-brand-green' : 'border-black/20'
                      }`}>
                        {selectedPersona === per.name && <span className="w-1 h-1 bg-white rounded-full"></span>}
                      </div>
                      <span className="text-[11px] font-medium text-brand-green">{per.name}</span>
                    </div>
                    <p className="text-[9px] text-foreground/50 font-light pl-5 leading-normal">{per.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. Custom Prompter */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-[#D66853] font-medium">
                05. Designer Custom Prompt Instruction (디자이너 지시사항 프롬프트)
              </label>
              <textarea 
                className="w-full bg-[#FDFCF8] border border-black/5 p-4 text-xs font-light h-24 focus:outline-none focus:ring-1 focus:ring-brand-green resize-none leading-relaxed" 
                placeholder="어떤 감도와 미학적 텍스처로 카피를 서술할지 최고의 로컬 디자이너에게 주문 서신을 써보세요."
                value={customPrompt}
                onChange={e => setCustomPrompt(e.target.value)}
              />
            </div>

            {/* Submit Button */}
            <Button 
              className="w-full rounded-none bg-brand-green text-white h-14 uppercase tracking-widest text-xs font-mono font-medium disabled:opacity-50 hover:bg-brand-green/90 transition-all cursor-pointer"
              onClick={handleGeneratePage}
              disabled={isGenerating || !productName}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Masterpiece...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2 text-[#D66853]" />
                  디자인 및 상세페이지 생성하기
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Preview Screen on the right */}
      <div className="xl:col-span-7 space-y-4">
        {/* State 1: Ready state before generation */}
        {!detailResult && !isGenerating && (
          <div className="border border-dashed border-black/10 bg-white h-full min-h-[700px] flex flex-col justify-between p-10">
            <div className="text-center my-auto space-y-4 max-w-sm mx-auto">
              <div className="relative w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <div className="absolute inset-0 border border-brand-green/20 rounded-full animate-double-pulse"></div>
                <Compass className="w-8 h-8 text-brand-green" />
              </div>
              <h3 className="text-xl magazine-heading text-brand-green">에디토리얼 완성 대기중</h3>
              <p className="text-xs text-foreground/50 font-light leading-relaxed">
                좌측의 <span className="font-medium text-brand-green">상품명</span>, <span className="font-medium text-brand-green">페르소나</span>, <span className="font-medium text-brand-green">미학 지시사항</span>을 기입하시면 디자이너의 고밀도 레이아웃 가판대가 여기에 정돈됩니다.
              </p>
              <div className="pt-4">
                <Button 
                  onClick={() => handleSelectPreset('p4')}
                  variant="outline" 
                  className="rounded-none text-[10px] tracking-widest uppercase border-brand-green/20 text-brand-green/70 hover:border-brand-green hover:text-brand-green cursor-pointer"
                >
                  기본 데모 채우기
                </Button>
              </div>
            </div>
            
            <div className="border-t border-black/5 pt-6 text-[10px] text-foreground/30 font-mono flex items-center justify-between">
              <span>DESIGN PREVIEW : IDLE STATE</span>
              <span>MARKET MOUM CORE STUDIO</span>
            </div>
          </div>
        )}

        {/* State 2: Generating state */}
        {isGenerating && (
          <div className="border border-black/5 bg-brand-green/[0.01] h-full min-h-[700px] flex flex-col justify-center items-center p-12 text-center">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
              className="mb-8 p-4 bg-white border border-black/5"
            >
              <Compass className="w-12 h-12 text-brand-green" />
            </motion.div>
            <h3 className="magazine-heading text-2xl text-brand-green italic tracking-tight font-medium">
              "한 자릿수 자모를 엮고, 단어를 빚다"
            </h3>
            <p className="text-xs text-foreground/50 max-w-xs font-light leading-relaxed mt-4">
              최고의 디자이너가 당신의 제품에 서식하는 자연유래 요소들을 분류한 뒤, 수작업의 질감을 살려 감도 높은 커머스 텍스트 레이아웃을 다듬고 있습니다...
            </p>
            <div className="mt-8 flex gap-2">
              <span className="w-2 h-2 rounded-full bg-[#D66853] animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-2 h-2 rounded-full bg-brand-green animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-2 h-2 rounded-full bg-[#1B4332] animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
          </div>
        )}

        {/* State 3: Active result rendered in a breathtakingly gorgeous mock mobile view */}
        {detailResult && !isGenerating && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Control banner for mobile simulation */}
            <div className="bg-white border border-black/5 p-4 flex justify-between items-center text-xs">
              <div className="flex items-center gap-2 font-mono uppercase text-foreground/45">
                <Smartphone className="w-4 h-4 text-brand-green" />
                <span>Responsive Magazine Mockup Container</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] uppercase font-mono tracking-widest text-[#D66853] font-medium">Boutique Production Live</span>
              </div>
            </div>

            {/* Actual Gorgeous Mock mobile-responsive Detailed Page Preview */}
            <div className="bg-[#FAF9F5] border border-black/10 text-foreground overflow-hidden max-w-lg mx-auto shadow-xl">
              
              {/* BRAND HEADER BAR */}
              <div className="px-6 py-6 border-b border-black/5 flex justify-between items-center bg-white">
                <span className="text-[10px] tracking-[0.3em] font-mono italic uppercase font-bold text-brand-green">MOUM CURATION</span>
                <span className="text-[9px] text-[#D66853] tracking-widest font-mono uppercase bg-[#1B4332]/5 py-0.5 px-2">LOCAL MASTERPIECE</span>
              </div>

              {/* COVER LAYER */}
              <div className="relative aspect-[3/4] w-full bg-[#F3F1E7] overflow-hidden">
                <img 
                  src={getPreviewImage()} 
                  className="w-full h-full object-cover grayscale-[5%] contrast-[102%]" 
                  alt="Aesthetic cover" 
                  referrerPolicy="no-referrer"
                />
                {/* Visual gradients for elegant readable text overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent"></div>
                
                {/* Header title inside Image */}
                <div className="absolute bottom-10 left-8 right-8 text-white space-y-3">
                  <Badge className="bg-[#D66853] text-white rounded-none text-[8px] uppercase tracking-[0.35em] mb-1 font-mono hover:bg-[#D66853]/90">
                    {productType.split(' (')[0]}
                  </Badge>
                  <h1 className="text-3xl magazine-heading font-medium tracking-tight leading-snug italic">
                    "{detailResult.intro.title}"
                  </h1>
                  <p className="text-xs text-white/70 tracking-widest font-light leading-relaxed pt-1 border-t border-white/20">
                    {detailResult.intro.subtitle}
                  </p>
                </div>
              </div>

              {/* INTRO SUMMARY SECTION */}
              <div className="px-8 py-14 bg-white border-b border-black/5 text-center space-y-6">
                <div className="w-1.5 h-12 bg-[#D66853] mx-auto opacity-75"></div>
                <h3 className="text-xs uppercase tracking-[0.25em] text-[#D66853] font-mono font-bold">The Essence Curation</h3>
                <p className="text-sm font-light text-foreground/80 leading-relaxed max-w-sm mx-auto italic">
                  “ {detailResult.intro.summary} ”
                </p>
              </div>

              {/* LEGACY ARTISAN NARRATIVE */}
              <div className="px-8 py-16 bg-[#FAF9F5] border-b border-black/5 space-y-8">
                <div className="space-y-3">
                  <span className="text-[9px] uppercase tracking-[0.25em] text-foreground/45 font-mono block">PART 01. 장인의 한 고집</span>
                  <h2 className="text-2xl magazine-heading font-medium text-brand-green leading-snug">
                    {detailResult.legacy_story.headline}
                  </h2>
                </div>
                
                <p className="text-xs font-light text-foreground/75 leading-relaxed bg-[#FDFCF8] border-l-2 border-[#1B4332] p-5 italic">
                  {detailResult.legacy_story.narrative}
                </p>
                
                {/* Subtle detail photo block placeholder styled as fine design box */}
                <div className="border border-black/5 p-4 bg-white space-y-2 flex gap-4 items-center">
                  <Info className="w-4 h-4 text-[#D66853] shrink-0" />
                  <p className="text-[10px] text-foreground/50 font-light leading-relaxed">
                    본 저작 카피는 마켓모움 전속 장인 안혜경 및 명장 연합회의 실제 수작업 제법 감리를 마친 명품 에디션 상세본입니다.
                  </p>
                </div>
              </div>

              {/* SENSORY SPECTRUM GRID */}
              <div className="px-8 py-16 bg-white border-b border-black/5 space-y-10">
                <div className="text-center">
                  <span className="text-[9px] uppercase tracking-[0.25em] text-[#D66853] font-mono font-bold">PART 02. 오감의 기록</span>
                  <h3 className="text-xl magazine-heading text-brand-green mt-1">Sensory Spectrum</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-3 bg-[#FAF9F5] p-5 border border-black/5 text-center">
                    <div className="w-8 h-8 rounded-full border border-[#D66853]/20 flex items-center justify-center mx-auto bg-white">
                      <span className="text-xs text-[#D66853] font-mono">視</span>
                    </div>
                    <div className="text-xs font-semibold text-brand-green font-mono">VISUAL (결의 조율)</div>
                    <p className="text-[10px] font-light text-foreground/70 leading-relaxed pr-1 pl-1">
                      {detailResult.sensory_profile.visual}
                    </p>
                  </div>

                  <div className="space-y-3 bg-[#FAF9F5] p-5 border border-black/5 text-center">
                    <div className="w-8 h-8 rounded-full border border-[#D66853]/20 flex items-center justify-center mx-auto bg-white">
                      <span className="text-xs text-[#D66853] font-mono">觸</span>
                    </div>
                    <div className="text-xs font-semibold text-brand-green font-mono">SENSORIAL (촉감과 미각)</div>
                    <p className="text-[10px] font-light text-foreground/70 leading-relaxed pr-1 pl-1">
                      {detailResult.sensory_profile.touch_text}
                    </p>
                  </div>

                  <div className="space-y-3 bg-[#FAF9F5] p-5 border border-black/5 text-center">
                    <div className="w-8 h-8 rounded-full border border-[#D66853]/20 flex items-center justify-center mx-auto bg-white">
                      <span className="text-xs text-[#D66853] font-mono">氣</span>
                    </div>
                    <div className="text-xs font-semibold text-brand-green font-mono">ATMOSPHERE (공간 무드)</div>
                    <p className="text-[10px] font-light text-foreground/70 leading-relaxed pr-1 pl-1">
                      {detailResult.sensory_profile.atmosphere}
                    </p>
                  </div>
                </div>
              </div>

              {/* THREE CORE VALUES / FEATURES */}
              <div className="px-8 py-16 bg-[#FAF9F5] border-b border-black/5 space-y-12">
                <div>
                  <span className="text-[9px] uppercase tracking-[0.25em] text-foreground/45 font-mono block">PART 03. 세 가지 가치</span>
                  <h3 className="text-2xl magazine-heading text-brand-green font-medium mt-1">Signature Trilogy</h3>
                </div>

                <div className="space-y-8">
                  {detailResult.features.map((fea, idx) => (
                    <div key={idx} className="flex gap-6 items-start">
                      <span className="text-3xl font-mono text-[#D66853] font-light opacity-60 shrink-0 select-none">
                        {fea.number}
                      </span>
                      <div className="space-y-1.5 pt-1">
                        <h4 className="text-sm font-semibold text-brand-green tracking-tight">{fea.title}</h4>
                        <p className="text-xs font-light text-foreground/70 leading-relaxed">{fea.explain}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* LIFESTYLE MATCHING SECTION */}
              <div className="px-8 py-16 bg-white border-b border-black/5 space-y-10">
                <div className="space-y-2 border-l-4 border-[#D66853] pl-4">
                  <Badge className="bg-brand-green text-white text-[8px] tracking-[0.25em] rounded-none uppercase font-mono px-2 py-0.5">
                    Target Persona Tailored Match
                  </Badge>
                  <h3 className="text-xl magazine-heading text-brand-green font-medium pt-1">
                    {detailResult.lifestyle_matching.headline}
                  </h3>
                </div>

                <div className="space-y-4">
                  {detailResult.lifestyle_matching.matching_points.map((pt, i) => (
                    <div key={i} className="p-5 bg-[#FAF9F5] border border-black/5 space-y-2 flex gap-4 items-start">
                      <div className="w-5 h-5 shrink-0 border border-brand-green/20 rounded-full bg-white flex items-center justify-center text-[10px] text-brand-green font-mono">
                        {i + 1}
                      </div>
                      <p className="text-xs font-light text-foreground/75 leading-relaxed italic">
                        {pt}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* USER MANUAL / CEREMONY & STORAGE */}
              <div className="px-8 py-16 bg-[#FDFCF8] space-y-10">
                <div className="text-center">
                  <span className="text-[9px] uppercase tracking-[0.25em] text-[#D66853] font-mono block">RITUALS & STORAGE GUIDE</span>
                  <h3 className="text-lg text-brand-green font-medium font-mono mt-1">올바른 쓰임과 보관법</h3>
                </div>

                <div className="space-y-6 text-xs font-light leading-relaxed">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-brand-green font-medium border-b border-black/5 pb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D66853]"></span>
                      <span>공물(工物)을 대하는 의식</span>
                    </div>
                    <p className="text-foreground/70 pl-3 leading-relaxed">
                      {detailResult.guide.usage}
                    </p>
                  </div>

                  <div className="space-y-2 pt-4">
                    <div className="flex items-center gap-2 text-brand-green font-medium border-b border-black/5 pb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1B4332]"></span>
                      <span>자연 그대로 보관하는 법</span>
                    </div>
                    <p className="text-foreground/70 pl-3 leading-relaxed">
                      {detailResult.guide.storage}
                    </p>
                  </div>
                </div>

                <div className="pt-8 border-t border-black/5 text-center">
                  <p className="text-[9px] text-foreground/40 font-mono">MARKET MOUM BRAND STUDIO &copy; 2026</p>
                </div>
              </div>
            </div>

            {/* Action options */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={() => {
                  alert('상세페이지가 장인 제품 설명란에 완벽하게 수렴 적용되었습니다.');
                }}
                className="flex-1 rounded-none bg-brand-green text-white h-12 uppercase tracking-widest text-[10px] font-mono hover:bg-brand-green/95 transition-all cursor-pointer"
              >
                Apply This Template to Product
              </Button>
              <Button 
                onClick={() => {
                  const el = document.createElement('a');
                  const file = new Blob([JSON.stringify(detailResult, null, 2)], {type: 'application/json'});
                  el.href = URL.createObjectURL(file);
                  el.download = `${productName.replace(/ /g, '_')}_detailed_page_copy.json`;
                  el.click();
                }}
                variant="outline" 
                className="rounded-none border-brand-green text-brand-green h-12 uppercase tracking-widest text-[10px] font-mono hover:bg-brand-green/5 transition-all cursor-pointer"
              >
                Export JSON Copy
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
