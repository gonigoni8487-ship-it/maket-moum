import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  CreditCard, 
  Wallet, 
  Check, 
  Truck, 
  Lock, 
  ShieldCheck, 
  Gift, 
  ChevronRight, 
  Flame, 
  ShoppingBag,
  Sparkles,
  Phone,
  User,
  MapPin,
  ClipboardCheck,
  Receipt
} from 'lucide-react';

interface CheckoutProduct {
  id: string;
  name: string;
  price: number;
  image: string;
  artisan: string;
  category: string;
  description?: string;
  customDetails?: string[]; // For custom plated jersey or special recipes
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: CheckoutProduct | null;
  onSuccess?: (orderId: string) => void;
  membershipStatus?: 'free' | 'friends' | 'vip';
}

export default function CheckoutModal({ 
  isOpen, 
  onClose, 
  product, 
  onSuccess,
  membershipStatus = 'free' 
}: CheckoutModalProps) {
  // Form input states
  const [buyerName, setBuyerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [shippingMemo, setShippingMemo] = useState('수확 즉시 가장 신선한 원물로 고정 유통 배송 요청합니다.');
  
  // Tab states for payment methods
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'toss' | 'kakao' | 'naver'>('card');
  
  // Card input states
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardPassword, setCardPassword] = useState('');

  // Agree checkboxes
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [agreePrivacy, setAgreePrivacy] = useState(true);

  // Flow states
  const [paymentStep, setPaymentStep] = useState<'form' | 'processing' | 'success'>('form');
  const [loadingText, setLoadingText] = useState('보안 결제 세션 암호화 빌드 중...');
  const [orderId, setOrderId] = useState('');
  const [copiedReceipt, setCopiedReceipt] = useState(false);

  // Generate order ID on mount or success
  useEffect(() => {
    if (paymentStep === 'success') {
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      setOrderId(`MOM-${dateStr}-${randomNum}`);
    }
  }, [paymentStep]);

  if (!isOpen || !product) return null;

  // Pricing calculations
  const basePrice = product.price;
  
  // Apply membership discount
  let discountAmount = 0;
  let discountLabel = '';
  if (membershipStatus === 'friends') {
    discountAmount = Math.floor(basePrice * 0.05); // 5% Discount
    discountLabel = '로컬프렌즈 5% 상시 추가 적립/할인';
  } else if (membershipStatus === 'vip') {
    discountAmount = Math.floor(basePrice * 0.10); // 10% Discount
    discountLabel = '장인클럽 VIP 10% 멤버십 선할인';
  }

  const shippingFee = basePrice >= 50000 ? 0 : 3000;
  const grandTotal = basePrice - discountAmount + shippingFee;

  // Handle billing process
  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerName.trim()) {
      alert('주문 고객님의 성함을 입력해 주세요.');
      return;
    }
    if (!phoneNumber.trim()) {
      alert('연락처 휴대폰 번호를 입력해 주세요.');
      return;
    }
    if (!address.trim()) {
      alert('정확한 배송지 주소를 입력해 주세요.');
      return;
    }

    if (paymentMethod === 'card') {
      if (cardNumber.length < 15) {
        alert('올바른 신용카드 번호 16자리를 입력해 주세요.');
        return;
      }
      if (cardExpiry.length < 4) {
        alert('올바른 카드 유효기간(MM/YY)을 입력해 주세요.');
        return;
      }
      if (cardCvv.length < 3) {
        alert('카드 뒷면 보안코드 CVV 3자리를 입력해 주세요.');
        return;
      }
    }

    if (!agreeTerms || !agreePrivacy) {
      alert('원물 직거래 배송 대행 및 결제대행 이용 약관에 동의하셔야 결제가 가능합니다.');
      return;
    }

    // Trigger gorgeous processing animation stages
    setPaymentStep('processing');
    
    // Stage 1: Security Handshake
    setTimeout(() => {
      setLoadingText('장인 명인 생산 쿼터 보존 검증 중...');
    }, 1200);

    // Stage 2: PG Session Request
    setTimeout(() => {
      setLoadingText('PG 통합 금융망 보안 서명 및 직전 승인 요청 중...');
    }, 2400);

    // Stage 3: Complete
    setTimeout(() => {
      setPaymentStep('success');
      if (onSuccess) {
        onSuccess(`MOM-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`);
      }
    }, 3800);
  };

  const handleCopyReceipt = () => {
    const receiptContent = `
[마켓모움 결제 영수증]
주문번호: ${orderId}
상품명: ${product.name}
장인/생산자: ${product.artisan}
주문일시: ${new Date().toLocaleString()}
배송대상: ${buyerName}님 
연락처: ${phoneNumber}
배송주소: ${address}
결제수단: ${paymentMethod === 'card' ? '신용카드(Simulated)' : paymentMethod.toUpperCase() + ' 간편결제'}
최종 결제금액: ₩${grandTotal.toLocaleString()}
    `;
    navigator.clipboard.writeText(receiptContent.trim());
    setCopiedReceipt(true);
    setTimeout(() => setCopiedReceipt(false), 2500);
  };

  // Helper to format card number automatically
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  // Format expiry (MM/YY)
  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return `${v.slice(0, 2)}/${v.slice(2, 4)}`;
    }
    return v;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#FDFCF8] text-[#111111] max-w-4xl w-full border border-black/10 shadow-2xl flex flex-col md:flex-row relative overflow-hidden font-sans my-4"
      >
        {/* Close Button - Hide in processing step */}
        {paymentStep !== 'processing' && (
          <button 
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 z-20 p-2 hover:bg-black/5 rounded-full transition-all text-[#111111]"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* STEP 1 & 2 SCREEN */}
        <AnimatePresence mode="wait">
          {paymentStep === 'form' && (
            <div className="flex flex-col md:flex-row w-full">
              {/* Product Info Summary Panel (Left) */}
              <div className="w-full md:w-5/12 bg-[#FAF9F6] border-r border-black/[0.08] p-8 flex flex-col justify-between">
                <div className="space-y-6">
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-widest text-[#8C1D24] font-bold">Secure Local Checkout</span>
                    <h3 className="text-2xl magazine-heading text-brand-green leading-snug mt-1 font-medium">실시간 안전결제창</h3>
                    <p className="text-xs text-foreground/50 font-light mt-1">장인과의 직거래 공동예약을 위한 계약 서사입니다.</p>
                  </div>

                  {/* Product Display Card */}
                  <div className="bg-white border border-black/5 p-4 rounded-none space-y-4 shadow-sm">
                    <div className="aspect-[4/3] w-full bg-slate-100 overflow-hidden relative border border-black/5">
                      <img 
                        src={product.image} 
                        alt={product.name} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-3 left-3">
                        <span className="bg-brand-green text-white font-mono text-[9px] uppercase tracking-widest px-2 py-0.5">
                          {product.category}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-[#8C1D24] font-bold">{product.artisan} 명인</span>
                      <h4 className="text-sm font-semibold text-brand-green leading-snug tracking-tight mt-0.5">{product.name}</h4>
                      {product.customDetails && product.customDetails.length > 0 && (
                        <div className="mt-2 text-[10px] bg-[#FAF9F6] p-2 border border-black/5 text-[#8C1D24] font-mono leading-relaxed space-y-0.5">
                          <p className="font-bold border-b border-[#8C1D24]/10 pb-1 mb-1">📋 맞춤 패킹 레시피:</p>
                          {product.customDetails.map((det, i) => (
                            <p key={i}>• {det}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Payment Breakdown Math */}
                  <div className="space-y-3 font-mono text-xs pt-4 border-t border-black/5">
                    <div className="flex justify-between text-foreground/60">
                      <span>상품 원가액</span>
                      <span>₩{basePrice.toLocaleString()}</span>
                    </div>

                    {discountAmount > 0 && (
                      <div className="flex justify-between text-brand-terracotta font-semibold">
                        <span>{discountLabel}</span>
                        <span>-₩{discountAmount.toLocaleString()}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-foreground/60">
                      <span>명가 보장 배송비</span>
                      <span>{shippingFee === 0 ? '무료 (5만원 이상)' : `₩${shippingFee.toLocaleString()}`}</span>
                    </div>

                    <div className="h-px bg-black/10 my-1"></div>

                    <div className="flex justify-between text-brand-green font-bold text-sm items-baseline">
                      <span className="font-sans">최종 납부액 (합계)</span>
                      <span className="text-xl font-serif text-[#111111]">₩{grandTotal.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Secure Badge */}
                <div className="pt-8 flex gap-3 text-[10px] text-foreground/40 font-light leading-snug border-t border-black/5 mt-6">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>마켓모움은 생산자와 서포터를 100% 에스크로 보호하며 전자금융 안정 인증 금융 가이드를 철저히 가동 준수합니다.</span>
                </div>
              </div>

              {/* Input Form Panel (Right) */}
              <div className="w-full md:w-7/12 p-8 md:p-10 flex flex-col justify-between">
                <form onSubmit={handlePaymentSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="text-xs uppercase tracking-widest text-[#8C1D24] font-bold border-b border-[#8C1D24]/20 pb-1 flex items-center gap-1.5">
                      <Truck className="w-4 h-4" /> 1. 배송 정보 입력
                    </h4>

                    {/* Name input */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-foreground/50 block mb-1 font-semibold">주문 성함 <span className="text-brand-terracotta">*</span></label>
                        <div className="relative">
                          <User className="w-4 h-4 text-foreground/30 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input 
                            type="text" 
                            required
                            placeholder="명함식 성함 입력"
                            value={buyerName}
                            onChange={(e) => setBuyerName(e.target.value)}
                            className="w-full bg-white border border-black/10 focus:border-brand-green px-9 py-2.5 text-xs rounded-none outline-none font-medium transition-colors"
                          />
                        </div>
                      </div>

                      {/* Phone input */}
                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-foreground/50 block mb-1 font-semibold">휴대폰 번호 <span className="text-brand-terracotta">*</span></label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-foreground/30 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input 
                            type="tel" 
                            required
                            placeholder="010-0000-0000"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="w-full bg-white border border-black/10 focus:border-brand-green px-9 py-2.5 text-xs rounded-none outline-none font-medium transition-colors"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Address input */}
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-foreground/50 block mb-1 font-semibold">정확한 배송처 주소 <span className="text-brand-terracotta">*</span></label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-foreground/30 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input 
                          type="text" 
                          required
                          placeholder="시/도 구/군 동/읍/면 번지 및 상세 호수 입력"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          className="w-full bg-white border border-black/10 focus:border-brand-green px-9 py-2.5 text-xs rounded-none outline-none font-medium transition-colors"
                        />
                      </div>
                    </div>

                    {/* Delivery memo */}
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-foreground/50 block mb-1 font-semibold">배송 대리 요청 메시지</label>
                      <input 
                        type="text" 
                        placeholder="예: 문 앞에 놓아주세요."
                        value={shippingMemo}
                        onChange={(e) => setShippingMemo(e.target.value)}
                        className="w-full bg-white border border-black/10 focus:border-brand-green px-3 py-2.5 text-xs rounded-none outline-none font-normal transition-colors"
                      />
                    </div>
                  </div>

                  {/* Payment method section */}
                  <div className="space-y-4">
                    <h4 className="text-xs uppercase tracking-widest text-[#8C1D24] font-bold border-b border-[#8C1D24]/20 pb-1 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4" /> 2. 결제 수단 선택
                    </h4>

                    {/* Badges select */}
                    <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-mono font-semibold">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('card')}
                        className={`py-3 flex flex-col items-center justify-center gap-1.5 transition-all border rounded-none cursor-pointer ${
                          paymentMethod === 'card' 
                            ? 'bg-brand-green text-white border-brand-green shadow-sm' 
                            : 'bg-white text-foreground/50 border-black/10 hover:text-brand-green hover:border-brand-green/30'
                        }`}
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>카드결제</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('toss')}
                        className={`py-3 flex flex-col items-center justify-center gap-1.5 transition-all border rounded-none cursor-pointer ${
                          paymentMethod === 'toss' 
                            ? 'bg-[#0050ff] text-white border-[#0050ff] shadow-sm' 
                            : 'bg-white text-foreground/50 border-black/10 hover:text-[#0050ff] hover:border-[#0050ff]/30'
                        }`}
                      >
                        <Wallet className="w-4 h-4 text-blue-300" />
                        <span>토스페이</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('kakao')}
                        className={`py-3 flex flex-col items-center justify-center gap-1.5 transition-all border rounded-none cursor-pointer ${
                          paymentMethod === 'kakao' 
                            ? 'bg-[#ffeb00] text-[#111111] border-[#ffeb00] shadow-sm' 
                            : 'bg-white text-foreground/50 border-black/10 hover:text-[#ffba00] hover:border-[#ffba00]/30'
                        }`}
                      >
                        <Sparkles className="w-4 h-4 text-amber-800" />
                        <span>카카오페이</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('naver')}
                        className={`py-3 flex flex-col items-center justify-center gap-1.5 transition-all border rounded-none cursor-pointer ${
                          paymentMethod === 'naver' 
                            ? 'bg-[#00c73c] text-white border-[#00c73c] shadow-sm' 
                            : 'bg-white text-foreground/50 border-black/10 hover:text-[#00c73c] hover:border-[#00c73c]/30'
                        }`}
                      >
                        <ShoppingBag className="w-4 h-4 text-green-200" />
                        <span>네이버페이</span>
                      </button>
                    </div>

                    {/* Payment details conditional */}
                    <div className="bg-[#FAF9F6] border border-black/5 p-4 rounded-none min-h-[140px] flex flex-col justify-center">
                      <AnimatePresence mode="wait">
                        {paymentMethod === 'card' ? (
                          <motion.div 
                            key="card"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="space-y-3 text-xs"
                          >
                            <p className="text-[9px] uppercase font-mono tracking-widest text-[#8C1D24] font-bold">Credit Card Information (보안 암호화 전송)</p>
                            <div>
                              <label className="text-[9px] uppercase tracking-wider text-foreground/40 block mb-1">카드 번호</label>
                              <input 
                                type="text"
                                maxLength={19}
                                placeholder="0000 0000 0000 0000"
                                value={cardNumber}
                                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                                className="w-full bg-white border border-black/5 px-3 py-2 text-xs rounded-none outline-none font-mono tracking-widest font-bold"
                              />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                              <div className="col-span-1">
                                <label className="text-[9px] uppercase tracking-wider text-foreground/40 block mb-1">유효 기간</label>
                                <input 
                                  type="text"
                                  maxLength={5}
                                  placeholder="MM/YY"
                                  value={cardExpiry}
                                  onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                                  className="text-center w-full bg-white border border-black/5 px-3 py-2 text-xs rounded-none outline-none font-mono"
                                />
                              </div>
                              <div className="col-span-1">
                                <label className="text-[9px] uppercase tracking-wider text-foreground/40 block mb-1">보안코드 CVV</label>
                                <input 
                                  type="password"
                                  maxLength={3}
                                  placeholder="***"
                                  value={cardCvv}
                                  onChange={(e) => setCardCvv(e.target.value.replace(/[^0-9]/g, ''))}
                                  className="text-center w-full bg-white border border-black/5 px-3 py-2 text-xs rounded-none outline-none font-mono font-bold"
                                />
                              </div>
                              <div className="col-span-1">
                                <label className="text-[9px] uppercase tracking-wider text-foreground/40 block mb-1">비밀번호 앞2자리</label>
                                <input 
                                  type="password"
                                  maxLength={2}
                                  placeholder="**"
                                  value={cardPassword}
                                  onChange={(e) => setCardPassword(e.target.value.replace(/[^0-9]/g, ''))}
                                  className="text-center w-full bg-white border border-black/5 px-3 py-2 text-xs rounded-none outline-none font-mono font-bold"
                                />
                              </div>
                            </div>
                          </motion.div>
                        ) : (
                          <motion.div 
                            key="express"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="text-center space-y-2 py-4"
                          >
                            <p className="text-xs font-semibold text-brand-green">
                              {paymentMethod === 'toss' && '🔵 토스 원클릭 다이렉트 간편결제 활성화'}
                              {paymentMethod === 'kakao' && '🟡 카카오 머니 & 생체 인증 결제 활성화'}
                              {paymentMethod === 'naver' && '🟢 네이버 멤버십 최대 5% 동시 적립 결제 활성화'}
                            </p>
                            <p className="text-[10px] text-foreground/40 leading-relaxed font-light">
                              결제하기 단추를 누르면 보안 팝업 모바일 간편인증 과정으로 다이렉트 연결 연계됩니다.
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Agree checklist */}
                  <div className="space-y-2 pt-2 text-[11px] text-foreground/60 leading-relaxed font-light font-sans">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={agreeTerms}
                        onChange={(e) => setAgreeTerms(e.target.checked)}
                        className="accent-brand-green rounded"
                      />
                      <span>(필수) 로컬 수공예 원물 및 맞춤 배송 대행 펀딩 계약 약관 동의</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={agreePrivacy}
                        onChange={(e) => setAddress(e.target.value ? address : address)} // dummy state trigger
                        onClick={() => setAgreePrivacy(!agreePrivacy)}
                        className="accent-brand-green rounded"
                      />
                      <span>(필수) 개인정보 제3자(산지 배송 장인 마스터) 안전 제공 동의</span>
                    </label>
                  </div>

                  {/* Submission Action Button */}
                  <button
                    type="submit"
                    className="w-full bg-brand-green text-white hover:bg-[#153427] py-4.5 rounded-none text-xs uppercase tracking-widest font-bold tracking-wider hover:shadow-md cursor-pointer transition-all flex items-center justify-center gap-2"
                  >
                    <Lock className="w-4 h-4 text-brand-terracotta" /> Safe Payment (₩ {grandTotal.toLocaleString()}원 결제 요청하기)
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* SCREEN 2: PAYMENT PROCESSING SKELETON */}
          {paymentStep === 'processing' && (
            <motion.div 
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full min-h-[500px] flex flex-col items-center justify-center p-12 text-center bg-brand-green/5 space-y-8"
            >
              {/* Spinner animation */}
              <div className="relative w-20 h-20 flex items-center justify-center">
                <div className="absolute inset-0 border-4 border-brand-green/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-brand-green border-t-transparent rounded-full animate-spin"></div>
                <Lock className="w-8 h-8 text-[#8C1D24]" />
              </div>

              <div className="space-y-3">
                <span className="text-[10px] uppercase font-mono tracking-[0.25em] text-[#8C1D24] font-bold">Secure Banking Session</span>
                <h3 className="text-2xl font-serif text-brand-green font-medium animate-pulse">{loadingText}</h3>
                <p className="text-xs text-foreground/40 max-w-sm mx-auto font-light leading-relaxed">
                  마켓모움 승인 원장은 외부 해킹 노출을 전원 방지하기 위해 2048비트 RSA 양자 보안 터널 암호화를 통과하여 안전 수립 중입니다.
                </p>
              </div>
            </motion.div>
          )}

          {/* SCREEN 3: SUCCESSFUL PAYMENT RECEIPT */}
          {paymentStep === 'success' && (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full p-8 md:p-12 flex flex-col"
            >
              <div className="max-w-xl mx-auto w-full text-center space-y-6">
                {/* Success Sign */}
                <div className="w-16 h-16 bg-brand-green text-white rounded-full flex items-center justify-center mx-auto shadow-lg">
                  <Check className="w-8 h-8" />
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-[0.3em] text-[#8C1D24] font-mono block">Order Confirmed</span>
                  <h2 className="text-3xl magazine-heading text-brand-green">소중한 명인의 이야기가 <br /> 당신의 품으로 당도합니다</h2>
                  <p className="text-xs text-foreground/50 leading-relaxed font-light">
                    믿고 상생 사전 펀딩을 완수해 주셔서 고개 숙여 감사드립니다. <br />
                    장인에게 직접 수취 성명 및 주소가 안전히 당도하였습니다.
                  </p>
                </div>

                {/* Receipt Card */}
                <div className="bg-white border border-black/10 p-6 text-left rounded-none font-mono text-xs space-y-4 shadow-sm relative">
                  <div className="absolute top-5 right-5 text-foreground/20 text-4xl font-bold font-sans pointer-events-none select-none">
                    PAID
                  </div>

                  <div className="flex justify-between items-baseline border-b border-black/5 pb-2">
                    <span className="text-foreground/50">Receipt ID (주문번호)</span>
                    <span className="font-bold text-brand-green leading-none">{orderId}</span>
                  </div>

                  <div className="space-y-2.5 pt-1.5 leading-relaxed text-[11px] text-[#111111]/80 font-light font-sans">
                    <div className="flex justify-between font-mono text-xs font-bold text-brand-green pb-1 border-b border-dashed border-black/5">
                      <span>{product.name}</span>
                      <span>₩{grandTotal.toLocaleString()}</span>
                    </div>

                    <div className="grid grid-cols-4 gap-1">
                      <span className="text-foreground/45">생산자장인:</span>
                      <span className="col-span-3 font-medium">{product.artisan}</span>

                      <span className="text-foreground/45">수취성명:</span>
                      <span className="col-span-3 font-medium">{buyerName}</span>

                      <span className="text-foreground/45">배송 목적지:</span>
                      <span className="col-span-3 font-medium line-clamp-1">{address}</span>

                      <span className="text-foreground/45">보장 배송일:</span>
                      <span className="col-span-3 font-medium text-brand-terracotta flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5" /> 수확 즉시 순차 발송 (예상 수령: 6월 12일 경)
                      </span>
                    </div>
                  </div>

                  {/* Actions inside receipt */}
                  <div className="pt-4 border-t border-dashed border-black/10 flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={handleCopyReceipt}
                      className="flex-1 py-2.5 px-4 bg-[#FAF9F6] hover:bg-black/5 border border-black/10 text-[11px] uppercase tracking-widest font-bold font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer rounded-none text-brand-green"
                    >
                      <ClipboardCheck className="w-4 h-4 text-[#8C1D24]" />
                      {copiedReceipt ? 'Receipt Copied!' : '영수증 텍스트 복사'}
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 py-2.5 px-4 bg-brand-green text-white hover:bg-brand-green/90 text-[11px] uppercase tracking-widest font-bold font-mono transition-all text-center rounded-none cursor-pointer border border-brand-green"
                    >
                      쇼핑 계속하기
                    </button>
                  </div>
                </div>

                <p className="text-[10px] text-foreground/40 leading-relaxed max-w-sm mx-auto font-light">
                  상생 투자/공구 상태 조회는 <strong className="text-brand-green font-medium">마켓모움 알림 및 이메일</strong>을 통해 실시간 단계가 통보됩니다.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
