import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Send, ShieldCheck, Mail, Phone, Building, User, Gift, MapPin, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SellerApplyFormProps {
  onSuccess?: () => void;
  inlineMode?: boolean;
}

export default function SellerApplyForm({ onSuccess, inlineMode = false }: SellerApplyFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    productName: '',
    address: '',
    contact: '',
    email: '',
    description: '',
    philosophy: '전통 계승 및 로컬 원물 본질 중시'
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [assignedTicket, setAssignedTicket] = useState('');

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = '성함을 입력하세요.';
    if (!formData.company.trim()) newErrors.company = '회사명 혹은 브랜드명을 입력하세요.';
    if (!formData.productName.trim()) newErrors.productName = '대표 입점 상품명을 입력하세요.';
    if (!formData.address.trim()) newErrors.address = '사업장 주소를 입력하세요.';
    if (!formData.contact.trim()) {
      newErrors.contact = '연락처를 입력하세요.';
    } else if (!/^[0-9\-+ ]+$/.test(formData.contact)) {
      newErrors.contact = '올바른 숫자 형식으로 입력하세요.';
    }
    
    // Optional e-mail validation if filled
    if (formData.email.trim() && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = '올바른 이메일 주소를 입력하세요.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    
    // Simulate premium backend processing
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitSuccess(true);
      const ticketNum = 'MOM-' + Math.floor(100000 + Math.random() * 900000);
      setAssignedTicket(ticketNum);
      if (onSuccess) {
        // Leave a brief delay for success animation before triggering callback
        setTimeout(() => {
          onSuccess();
        }, 3200);
      }
    }, 1800);
  };

  if (submitSuccess) {
    return (
      <div className="text-center py-12 px-4 space-y-6 max-w-md mx-auto animate-fade-in">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-brand-green text-white rounded-full flex items-center justify-center shadow-lg shadow-brand-green/20 animate-bounce">
            <CheckCircle2 className="w-10 h-10" />
          </div>
        </div>
        
        <div className="space-y-3">
          <h3 className="text-xl font-bold font-sans text-brand-green">입점 신청이 정상 접수되었습니다!</h3>
          <p className="text-xs text-foreground/60 leading-relaxed font-light">
            전국 산지의 가치와 장인의 숨결을 최우선으로 검증하는 <br />
            마켓모움 수석 큐레이터가 신청 내용을 엄격히 검토한 후, <strong>3영업일 이내</strong> 기재하신 연락처로 개별 연락을 드리겠습니다.
          </p>
        </div>

        <div className="bg-[#FAF9F6] p-5 border border-black/5 font-mono space-y-2 mt-4 text-left">
          <div className="flex justify-between text-[11px] text-foreground/50">
            <span>접수 상태 Code:</span>
            <span className="text-[#8C1D24] font-bold">심사대기 (PENDING)</span>
          </div>
          <div className="flex justify-between text-[11px] text-foreground/50">
            <span>고유 인가 번호:</span>
            <span className="text-brand-green font-bold select-all">{assignedTicket}</span>
          </div>
          <div className="flex justify-between text-[11px] text-foreground/50 border-t border-black/[0.03] pt-2 mt-2">
            <span>조사원 배정:</span>
            <span className="text-foreground/75 text-[10px]">로컬 MD 발굴 1팀 수석</span>
          </div>
        </div>

        <div className="pt-2 text-[10px] text-foreground/40 font-light flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-brand-green" /> 작성하신 정보는 신원 확보 및 안전 등급 검증에만 활용됩니다.
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-left">
      <div className="space-y-1.5 border-b border-black/[0.04] pb-3">
        <h3 className="text-lg font-bold text-brand-green flex items-center gap-1.5">
          <Sparkles className="w-5 h-5 text-[#8C1D24] animate-pulse" /> 마켓모움 입점 동맹 가입 신청
        </h3>
        <p className="text-xs text-foreground/50 font-light leading-snug">
          상생의 가격하락 퍼널과 매거진 브랜딩을 활용해 스토리팬덤을 함께 만들 생산자 파트너님을 모십니다.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 성명 */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-widest text-[#8C1D24] font-bold font-mono block">
            성명 (대표자명) <span className="text-[#8C1D24]">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              className={`w-full bg-white border p-3 pl-9 text-xs focus:outline-none focus:ring-1 focus:ring-brand-green rounded-none transition-all ${
                errors.name ? 'border-[#8C1D24]' : 'border-black/10'
              }`}
              placeholder="예: 김기정 장인"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/40" />
          </div>
          {errors.name && (
            <p className="text-[10px] text-[#8C1D24] font-sans flex items-center gap-1 mt-1">
              <AlertCircle className="w-3 h-3" /> {errors.name}
            </p>
          )}
        </div>

        {/* 회사명/브랜드명 */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-widest text-[#8C1D24] font-bold font-mono block">
            회사명 / 브랜드명 <span className="text-[#8C1D24]">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              className={`w-full bg-white border p-3 pl-9 text-xs focus:outline-none focus:ring-1 focus:ring-brand-green rounded-none transition-all ${
                errors.company ? 'border-[#8C1D24]' : 'border-black/10'
              }`}
              placeholder="예: 대물 한옥 종가 협동조합"
              value={formData.company}
              onChange={e => setFormData({ ...formData, company: e.target.value })}
            />
            <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/40" />
          </div>
          {errors.company && (
            <p className="text-[10px] text-[#8C1D24] font-sans flex items-center gap-1 mt-1">
              <AlertCircle className="w-3 h-3" /> {errors.company}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 입점 희망 상품명 */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-widest text-[#8C1D24] font-bold font-mono block">
            대표 입점 상품명 <span className="text-[#8C1D24]">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              className={`w-full bg-white border p-3 pl-9 text-xs focus:outline-none focus:ring-1 focus:ring-brand-green rounded-none transition-all ${
                errors.productName ? 'border-[#8C1D24]' : 'border-black/10'
              }`}
              placeholder="예: 3대 전통 신안 해풍 다시마 소금 세트"
              value={formData.productName}
              onChange={e => setFormData({ ...formData, productName: e.target.value })}
            />
            <Gift className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/40" />
          </div>
          {errors.productName && (
            <p className="text-[10px] text-[#8C1D24] font-sans flex items-center gap-1 mt-1">
              <AlertCircle className="w-3 h-3" /> {errors.productName}
            </p>
          )}
        </div>

        {/* 연락처 */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-widest text-[#8C1D24] font-bold font-mono block">
            연락처 (휴대폰 번호) <span className="text-[#8C1D24]">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              className={`w-full bg-white border p-3 pl-9 text-xs focus:outline-none focus:ring-1 focus:ring-brand-green rounded-none transition-all ${
                errors.contact ? 'border-[#8C1D24]' : 'border-black/10'
              }`}
              placeholder="예: 010-1234-5678"
              value={formData.contact}
              onChange={e => setFormData({ ...formData, contact: e.target.value })}
            />
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/40" />
          </div>
          {errors.contact && (
            <p className="text-[10px] text-[#8C1D24] font-sans flex items-center gap-1 mt-1">
              <AlertCircle className="w-3 h-3" /> {errors.contact}
            </p>
          )}
        </div>
      </div>

      {/* 사업장 주소 */}
      <div className="space-y-1">
        <label className="text-[10px] uppercase tracking-widest text-[#8C1D24] font-bold font-mono block">
          사업장 전체 주소 (생산단지 주소) <span className="text-[#8C1D24]">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            className={`w-full bg-white border p-3 pl-9 text-xs focus:outline-none focus:ring-1 focus:ring-brand-green rounded-none transition-all ${
              errors.address ? 'border-[#8C1D24]' : 'border-black/10'
            }`}
            placeholder="예: 전라남도 신안군 지도읍 흑산도해안길 32-15"
            value={formData.address}
            onChange={e => setFormData({ ...formData, address: e.target.value })}
          />
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/40" />
        </div>
        {errors.address && (
          <p className="text-[10px] text-[#8C1D24] font-sans flex items-center gap-1 mt-1">
            <AlertCircle className="w-3 h-3" /> {errors.address}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 이메일 주소 (선택) */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-widest text-[#8C1D24] font-bold font-mono block">
            이메일 주소 <span className="text-foreground/30 font-normal">(선택)</span>
          </label>
          <div className="relative">
            <input
              type="text"
              className={`w-full bg-white border p-3 pl-9 text-xs focus:outline-none focus:ring-1 focus:ring-brand-green rounded-none transition-all ${
                errors.email ? 'border-[#8C1D24]' : 'border-black/10'
              }`}
              placeholder="예: artisan@marketmoum.com"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/40" />
          </div>
          {errors.email && (
            <p className="text-[10px] text-[#8C1D24] font-sans flex items-center gap-1 mt-1">
              <AlertCircle className="w-3 h-3" /> {errors.email}
            </p>
          )}
        </div>

        {/* 브랜드 가치관 */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-widest text-[#8C1D24] font-bold font-mono block">
            상생 및 브랜드 핵심 철학 <span className="text-[#8C1D24]">*</span>
          </label>
          <select
            className="w-full bg-white border border-black/10 p-3 text-xs focus:outline-none focus:ring-1 focus:ring-brand-green rounded-none"
            value={formData.philosophy}
            onChange={e => setFormData({ ...formData, philosophy: e.target.value })}
          >
            <option value="전통 계승 및 로컬 원물 본질 중시">지역 정통 제조공법 보존 및 천연 원물 생산</option>
            <option value="환경 우려 해소 및 오가닉 가치">친환경 재배 및 유기농 에코 패키징 실현</option>
            <option value="비즈니스 모델 현대화와 현대 디자인">전통의 가치를 세련된 인포 그래픽과 조합</option>
            <option value="도심 공유 및 로컬 공동체 상생">근방 소상공인과의 일자리 창출 및 원자재 단가보장</option>
          </select>
        </div>
      </div>

      {/* 생산물과 스토리에 대한 소개 */}
      <div className="space-y-1">
        <label className="text-[10px] uppercase tracking-widest text-[#8C1D24] font-bold font-mono block">
          장인의 삶, 혹은 원물 채집 환경에 깃든 간단한 스토리 소개 <span className="text-foreground/30 font-normal">(선택)</span>
        </label>
        <textarea
          rows={3}
          className="w-full bg-white border border-black/10 p-3 text-xs focus:outline-none focus:ring-1 focus:ring-brand-green rounded-none resize-none"
          placeholder="가문에 대대로 내려온 제조 철학이나 제품의 진정성 넘치는 공정 원리를 자유롭게 적어주세요."
          value={formData.description}
          onChange={e => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full text-xs uppercase tracking-widest font-mono font-bold rounded-none bg-[#8C1D24] hover:bg-[#8C1D24]/90 text-white h-12"
      >
        {isSubmitting ? (
          <span className="flex items-center gap-2 justify-center">
            <RefreshCw className="w-4 h-4 animate-spin" /> 엄격 심사 및 장인 지표 대조 중...
          </span>
        ) : (
          <span className="flex items-center gap-2 justify-center">
            <Send className="w-4 h-4" /> 마켓모움 패밀리 입점 도맹 신청서 전송
          </span>
        )}
      </Button>

      <p className="text-[9px] text-[#8C1D24]/75 text-center leading-normal">
        * 제출하신 모든 상징과 스펙 정보는 마켓모움 파트너십 상생 헌장에 의거해 <br />
        사업장 신원 확보 외 타 용도로 절대 누출 및 양도되지 않음을 보장합니다.
      </p>
    </form>
  );
}
