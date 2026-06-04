import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Clock, Star, Copy, X, ShoppingBag } from 'lucide-react';
import { ScrollReveal } from './components/Animated';
import { PRODUCTS, BRAND_PACKAGES } from './constants';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [orderMode, setOrderMode] = useState<boolean>(false);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden bg-[#F3F1E7]">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1540959733332-e94e270b2ec0?q=80&w=2000&auto=format&fit=crop" 
            className="w-full h-full object-cover opacity-40 grayscale-[20%]"
            alt="Hero Background"
            referrerPolicy="no-referrer"
          />
        </div>
        
        <div className="relative z-10 text-center max-w-4xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <span className="text-sm uppercase tracking-[0.3em] text-brand-green mb-6 block">
              The Artisan Curation
            </span>
            <h1 className="text-6xl md:text-8xl magazine-heading text-brand-green mb-8 leading-[1.1]">
              로컬 장인의 숨은 가치를 <br /> 브랜드로 만나다
            </h1>
            <p className="text-lg md:text-xl text-brand-green/70 mb-12 max-w-2xl mx-auto font-light leading-relaxed">
              전국의 숨은 고수들이 제안하는 진정한 로컬 라이프스타일. <br />
              마켓모움은 지역 브랜드의 성장을 돕고 지속 가능한 가치를 연결합니다.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/markets" className="bg-brand-green text-white px-10 py-5 rounded-none text-sm uppercase tracking-widest hover:bg-brand-green/90 transition-all flex items-center gap-2">
                Explore Markets <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/seller" className="border border-brand-green text-brand-green px-10 py-5 rounded-none text-sm uppercase tracking-widest hover:bg-brand-green hover:text-white transition-all">
                Become a Seller
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Floating Tag */}
        <motion.div 
          className="absolute bottom-20 left-10 md:left-20 hidden lg:block"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="bg-white/80 backdrop-blur-sm p-6 border border-black/5 shadow-sm">
            <p className="text-[10px] uppercase tracking-widest text-[#D66853] mb-1">Live popup market</p>
            <p className="text-sm magazine-heading">Cheongsong Apple Fest 2024</p>
            <div className="flex items-center gap-2 mt-2 text-[#D66853]">
              <Clock className="w-3 h-3" />
              <span className="text-[10px] font-mono">05:24:12 LEFT</span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Limited Time Section */}
      <section className="py-32 px-6 max-w-7xl mx-auto">
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
                <div className="relative overflow-hidden aspect-[4/5] bg-[#F3F1E7] mb-6">
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
                    <p className="text-sm text-foreground/40 font-light italic text-[#1B4332]/70">By {product.artisan}</p>
                  </div>
                  <p className="text-lg font-serif text-[#1B4332]">₩{product.price.toLocaleString()}</p>
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

      {/* Brand Story Section */}
      <section className="bg-brand-green py-32 text-white">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <ScrollReveal>
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1556761175-4b46a572b786?q=80&w=1200&auto=format&fit=crop" 
                className="w-full aspect-[3/4] object-cover ring-1 ring-white/10"
                alt="Artisan at work"
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
            <Link to="/seller" className="bg-brand-green text-white px-12 py-6 text-sm uppercase tracking-widest">
              입점 신청하기
            </Link>
            <Link to="/seller" className="text-brand-green underline underline-offset-8 text-sm uppercase tracking-widest">
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
              className="bg-[#FDFCF8] text-[#1B4332] max-w-5xl w-full border border-black/5 flex flex-col md:flex-row relative shadow-2xl overflow-hidden my-8"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button 
                onClick={() => { setSelectedProduct(null); setOrderMode(false); }}
                className="absolute top-6 right-6 z-10 p-2 hover:bg-black/5 rounded-full transition-all text-[#1B4332]"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Product Image Panel (Left) */}
              <div className="w-full md:w-1/2 relative bg-[#F3F1E7] aspect-[4/5] md:aspect-auto md:min-h-[600px] overflow-hidden">
                <img 
                  src={selectedProduct.image} 
                  alt={selectedProduct.name} 
                  className="w-full h-full object-cover grayscale-[10%] hover:scale-[1.02] transition-transform duration-[1.5s]"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
                
                {/* Floating Artisan Designation */}
                <div className="absolute bottom-8 left-8 text-white">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#D66853] mb-1 font-semibold">CURATED PARTNER BRAND</p>
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
                      <span className="bg-brand-terracotta/10 text-[#D66853] text-[9px] px-2.5 py-1 tracking-widest uppercase font-mono font-semibold">
                        POP-UP LIMITED ({selectedProduct.stock} Left)
                      </span>
                    )}
                  </div>

                  {/* Title & Price */}
                  <h3 className="text-2xl md:text-3xl magazine-heading text-brand-green leading-[1.2] mb-3">
                    {selectedProduct.name}
                  </h3>
                  <p className="text-2.5xl font-serif text-[#1B4332] mb-6">
                    ₩{selectedProduct.price.toLocaleString()}
                    <span className="text-[11px] text-foreground/45 font-sans italic ml-3 font-normal">무료 보장배동 및 오동나무 명인 목함 포함 패키지</span>
                  </p>

                  <div className="w-full h-px bg-[#1B4332]/10 mb-6"></div>

                  {/* Brand Copy & Story Block */}
                  {BRAND_PACKAGES[selectedProduct.id] ? (
                    <div className="space-y-6">
                      {/* Tagline */}
                      <div>
                        <p className="text-[9px] uppercase tracking-[0.25em] text-[#D66853] mb-1 font-semibold">Brand Tagline</p>
                        <h4 className="text-lg italic font-medium text-[#1B4332] tracking-tight font-serif leading-[1.3] pl-2 border-l-2 border-brand-terracotta">
                          "{BRAND_PACKAGES[selectedProduct.id].tagline}"
                        </h4>
                      </div>

                      {/* Decoded Brand Narrative */}
                      <div>
                        <p className="text-[9px] uppercase tracking-[0.25em] text-foreground/45 mb-2 font-semibold">The Story & Philosophy (스토리 & 철학)</p>
                        <p className="text-xs text-[#1B4332]/85 leading-relaxed font-light bg-brand-green/[0.02] p-5 italic border border-[#1B4332]/5">
                          {BRAND_PACKAGES[selectedProduct.id].story}
                        </p>
                      </div>

                      {/* Dynamic USP Bullets */}
                      <div>
                        <p className="text-[9px] uppercase tracking-[0.25em] text-foreground/45 mb-2 font-semibold">Signature Craft Merits (특장점 요약)</p>
                        <ul className="space-y-2">
                          {BRAND_PACKAGES[selectedProduct.id].details.map((detail: string, i: number) => (
                            <li key={i} className="text-xs text-foreground/80 font-light flex items-start gap-2.5">
                              <span className="text-[#D66853] font-bold mt-0.5">✓</span>
                              <span>{detail}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Social Media Content Options (상세페이지 대표 카피) */}
                      <div className="pt-2">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-[9px] uppercase tracking-[0.25em] text-[#D66853] font-semibold">AI Generated Representative Copy (대표 상세페이지 문구)</p>
                          <button 
                            onClick={() => handleCopy(BRAND_PACKAGES[selectedProduct.id].marketingCopy, selectedProduct.id)}
                            className="text-[10px] uppercase tracking-wider text-brand-green hover:text-brand-terracotta font-mono flex items-center gap-1.5 transition-colors font-medium cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            {copiedId === selectedProduct.id ? 'Copied!' : 'Copy Copywriting'}
                          </button>
                        </div>
                        <div className="bg-[#1B4332] text-white/95 p-5 font-mono text-[10px] leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto border border-black/5 rounded-none scrollbar-thin">
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
                      <div className="bg-[#F3F1E7]/80 p-5 text-center text-xs font-light text-foreground/60 border border-black/5">
                        귀하의 브랜드 철학과 스토리 패키지는 <span className="font-semibold text-brand-green">Seller Center &gt; AI Branding</span> 탭에서 생성할 수 있습니다.
                      </div>
                    </div>
                  )}
                </div>

                {/* Purchase Action Panel */}
                <div className="mt-8 pt-6 border-t border-[#1B4332]/10 z-0">
                  {orderMode ? (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-brand-green/10 border border-brand-green/30 p-5 text-center rounded-none"
                    >
                      <p className="text-xs text-brand-green font-semibold mb-1 flex items-center justify-center gap-1.5">
                        ✨ Order proposal dispatched to {selectedProduct.artisan}!
                      </p>
                      <p className="text-[10px] font-light text-[#1B4332] opacity-80">
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
    </div>
  );
}
