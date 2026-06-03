import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Clock, Star } from 'lucide-react';
import { ScrollReveal } from './components/Animated';
import { PRODUCTS } from './constants';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden bg-[#F3F1E7]">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1540959733332-e94e270b2ec0?q=80&w=2000&auto=format&fit=crop" 
            className="w-full h-full object-cover opacity-40 grayscale-[20%]"
            alt="Hero Background"
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
              <div className="group cursor-pointer">
                <div className="relative overflow-hidden aspect-[4/5] bg-[#F3F1E7] mb-6">
                  <motion.img 
                    src={product.image} 
                    alt={product.name}
                    className="w-full h-full object-cover grayscale-[10%] group-hover:grayscale-0 transition-all duration-700"
                    whileHover={{ scale: 1.05 }}
                  />
                  {product.isLimited && (
                    <div className="absolute top-4 left-4">
                      <span className="bg-brand-terracotta text-white text-[10px] px-3 py-1 uppercase tracking-widest">
                        Limited Time
                      </span>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-full group-hover:translate-y-0 transition-transform bg-brand-green/90 text-white flex justify-between items-center">
                    <span className="text-xs uppercase tracking-widest text-white">View Details</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg magazine-heading mb-1">{product.name}</h3>
                    <p className="text-sm text-foreground/40 font-light italic">By {product.artisan}</p>
                  </div>
                  <p className="text-lg font-serif">₩{product.price.toLocaleString()}</p>
                </div>
                {product.isLimited && (
                  <div className="mt-4 flex items-center gap-2 text-brand-terracotta">
                    <Clock className="w-3 h-3" />
                    <span className="text-[10px] font-mono uppercase tracking-widest">Ends in {product.timeLeft}</span>
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
            <Link to="/apply" className="bg-brand-green text-white px-12 py-6 text-sm uppercase tracking-widest">
              입점 신청하기
            </Link>
            <Link to="/about" className="text-brand-green underline underline-offset-8 text-sm uppercase tracking-widest">
              Our Process
            </Link>
          </div>
        </ScrollReveal>
      </section>
    </div>
  );
}
