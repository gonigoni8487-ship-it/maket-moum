import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import LandingPage from './LandingPage';
import SellerCenter from './SellerCenter';
import ApplyPage from './ApplyPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';

const queryClient = new QueryClient();

function LocationProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location}>
        <Route path="/" element={
          <PageWrapper id="home">
            <LandingPage />
          </PageWrapper>
        } />
        <Route path="/seller" element={
          <PageWrapper id="seller">
            <SellerCenter />
          </PageWrapper>
        } />
        <Route path="/apply" element={
          <PageWrapper id="apply">
            <ApplyPage />
          </PageWrapper>
        } />
        {/* Fallback */}
        <Route path="*" element={
          <PageWrapper id="fallback">
            <LandingPage />
          </PageWrapper>
        } />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-background font-sans selection:bg-brand-terracotta selection:text-white">
          <Navbar />
          <LocationProvider>
            <main>
              <AnimatedRoutes />
            </main>
          </LocationProvider>
          
          <footer className="bg-brand-green text-white py-20 px-6">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 border-b border-white/10 pb-20 mb-20">
              <div className="space-y-6">
                <Link to="/" className="flex flex-col group py-1">
                  <span className="text-xl font-bold tracking-tight text-white magazine-heading leading-tight transition-colors group-hover:text-brand-terracotta">
                    마켓모움
                  </span>
                  <span className="text-[9px] text-[#D4AF37] tracking-[0.25em] font-mono leading-none mt-1 font-semibold uppercase">
                    MARKET MOUM
                  </span>
                </Link>
                <p className="text-sm text-white/50 font-light leading-relaxed max-w-xs">
                  로컬 아티스트의 철학을 고해상도 매거진 형식으로 풀어내고 브랜드 성장을 지원하는 비즈니스 엑셀러레이팅 플랫폼입니다.
                </p>
              </div>
              <div className="space-y-4">
                <p className="text-[10px] uppercase tracking-[0.3em] text-brand-terracotta">Navigation</p>
                <div className="flex flex-col gap-2">
                  <Link to="/markets" className="text-sm font-light hover:text-brand-terracotta">Markets</Link>
                  <Link to="/artisans" className="text-sm font-light hover:text-brand-terracotta">Artisans</Link>
                  <Link to="/about" className="text-sm font-light hover:text-brand-terracotta">About Us</Link>
                </div>
              </div>
              <div className="space-y-4">
                <p className="text-[10px] uppercase tracking-[0.3em] text-brand-terracotta">For Sellers</p>
                <div className="flex flex-col gap-2">
                  <Link to="/seller" className="text-sm font-light hover:text-brand-terracotta">Seller Center</Link>
                  <Link to="/apply" className="text-sm font-light hover:text-brand-terracotta">Apply to Market</Link>
                  <Link to="/pb" className="text-sm font-light hover:text-brand-terracotta">PB Partnership</Link>
                </div>
              </div>
              <div className="space-y-4">
                <p className="text-[10px] uppercase tracking-[0.3em] text-brand-terracotta">Contact</p>
                <p className="text-sm font-light">info@marketmoum.com</p>
                <div className="flex gap-4 pt-4">
                  <div className="w-10 h-10 border border-white/20 flex items-center justify-center hover:border-white transition-all cursor-pointer">
                    <span className="text-[10px] uppercase">IG</span>
                  </div>
                  <div className="w-10 h-10 border border-white/20 flex items-center justify-center hover:border-white transition-all cursor-pointer">
                    <span className="text-[10px] uppercase">YT</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] uppercase tracking-widest text-white/30">
              <p>&copy; 2024 Market Moum. All rights reserved.</p>
              <div className="flex gap-8">
                <span>Terms of Service</span>
                <span>Privacy Policy</span>
              </div>
            </div>
          </footer>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

function PageWrapper({ children, id }: { children: React.ReactNode, id?: string }) {
  return (
    <motion.div
      key={id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
