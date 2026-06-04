import React from 'react';
import { motion } from 'motion/react';
import { Award, ShieldCheck, HelpCircle, ArrowLeft, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import SellerApplyForm from './components/SellerApplyForm';

export default function ApplyPage() {
  return (
    <div className="min-h-screen bg-[#FAF9F6] pt-32 pb-24 px-6">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Breadcrumb / Back button */}
        <div className="flex justify-between items-center">
          <Link 
            to="/" 
            className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#8C1D24] font-bold hover:opacity-85 transition-opacity"
          >
            <ArrowLeft className="w-4 h-4" /> 홈으로 돌아가기
          </Link>
          <span className="text-[10px] font-mono tracking-widest text-brand-green/60 uppercase">
            Artisan Alliance Recruitment 2026
          </span>
        </div>

        {/* Header */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <h1 className="text-3xl md:text-5xl font-medium magazine-heading text-brand-green leading-none">
            마켓모움 입점 신청
          </h1>
          <p className="text-xs md:text-sm text-foreground/50 font-light leading-relaxed">
            전국 로컬 명인의 진정성과 스토리를 고해상도로 큐레이션합니다. <br />
            유통 중심의 단순 입면 입점을 넘어 브랜드 아이덴티티와 고유 가치를 함께 성장시키는 동반자가 되어 주십시오.
          </p>
        </div>

        {/* Feature Grid / Core Benefits for Applying */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 border border-black/5 space-y-2">
            <div className="w-8 h-8 rounded-full bg-brand-green/5 flex items-center justify-center text-brand-green">
              <Award className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-semibold text-brand-green">체계적 브랜드 매거진</h4>
            <p className="text-[11px] text-foreground/50 leading-relaxed font-light">
              마켓모움 고유의 고선명 사진 촬영과 스토리 인터뷰를 통해 가업에 영원한 가치를 불어넣습니다.
            </p>
          </div>
          
          <div className="bg-white p-6 border border-black/5 space-y-2">
            <div className="w-8 h-8 rounded-full bg-brand-green/5 flex items-center justify-center text-brand-green">
              <Building2 className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-semibold text-brand-green">상생 공동구매 조율</h4>
            <p className="text-[11px] text-foreground/50 leading-relaxed font-light">
              중간 거품을 완벽히 걷어낸 생산자 다이렉트 상생 구조로, 아티스트와 고객 모두 상호 만족감을 느낍니다.
            </p>
          </div>

          <div className="bg-white p-6 border border-black/5 space-y-2">
            <div className="w-8 h-8 rounded-full bg-[#8C1D24]/5 flex items-center justify-center text-[#8C1D24]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-semibold text-brand-green">투명한 정산 & 수수료</h4>
            <p className="text-[11px] text-foreground/50 leading-relaxed font-light">
              복잡하고 과도한 플랫폼 수수료를 걷어내고, 장인의 자립과 지속가능한 원물 개발을 최우선 보장해 드립니다.
            </p>
          </div>
        </div>

        {/* Main Application Card Container */}
        <div className="bg-white border border-black/5 p-8 md:p-12 shadow-sm relative">
          {/* Subtle Decorative Crest */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-brand-green text-white px-4 py-1 text-[9px] uppercase tracking-widest font-mono select-none">
            Application Dossier
          </div>
          
          <SellerApplyForm />
        </div>

        {/* Help Center CTA */}
        <div className="bg-[#8C1D24]/[0.02] border border-[#8C1D24]/10 p-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="space-y-1 text-center md:text-left">
            <p className="text-xs font-semibold text-brand-green flex items-center gap-1">
              <HelpCircle className="w-4 h-4 text-[#8C1D24]" /> 입점 전 개별 상담이나 궁금하신 점이 있으십니까?
            </p>
            <p className="text-[11px] text-foreground/50 font-light">
              마켓모움 전국 지사 권역 큐레이터 및 파트너 발굴 전담팀이 장인님의 문의를 귀담아듣겠습니다.
            </p>
          </div>
          <a
            href="mailto:partner@marketmoum.com"
            className="text-xs font-mono font-bold uppercase tracking-wider text-[#8C1D24] underline hover:opacity-85"
          >
            partner@marketmoum.com
          </a>
        </div>
      </div>
    </div>
  );
}
