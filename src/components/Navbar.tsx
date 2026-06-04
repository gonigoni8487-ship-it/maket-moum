import { Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { ShoppingBag, User, Menu, X, BookOpen, Sprout } from 'lucide-react';
import { useState } from 'react';

export default function Navbar({ 
  theme = 'original', 
  toggleTheme 
}: { 
  theme?: 'original' | 'scenic-green'; 
  toggleTheme?: () => void; 
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { name: 'Markets', path: '/markets' },
    { name: 'Artisans', path: '/artisans' },
    { name: 'About', path: '/about' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/85 backdrop-blur-md border-b border-black/5 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex flex-col group py-1">
          <span className="text-xl font-bold tracking-tight text-brand-green magazine-heading leading-tight transition-colors group-hover:text-brand-terracotta">
            마켓모움
          </span>
          <span className="text-[8px] text-brand-terracotta tracking-[0.25em] font-mono leading-none mt-1 font-semibold uppercase">
            MARKET MOUM
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-10">
          {navLinks.map((link) => (
            <Link 
              key={link.path} 
              to={link.path}
              className={`text-sm uppercase tracking-widest hover:text-brand-terracotta transition-colors ${
                location.pathname === link.path ? 'text-brand-terracotta font-medium' : 'text-foreground/60'
              }`}
            >
              {link.name}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-4">
          {toggleTheme && (
            <button 
              onClick={toggleTheme}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all border cursor-pointer select-none ${
                theme === 'original'
                  ? 'bg-emerald-50/90 border-emerald-200/50 text-emerald-800 hover:bg-emerald-100 shadow-sm'
                  : 'bg-amber-50/95 border-amber-200/40 text-amber-900 hover:bg-amber-100'
              }`}
              title={theme === 'original' ? '녹음 찬란 산지 테마로 변경' : '오리지널 럭셔리 매거진 테마로 변경'}
            >
              {theme === 'original' ? (
                <>
                  <Sprout className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                  <span className="hidden sm:inline">녹음 찬란 산지 테마</span>
                  <span className="sm:hidden">산지 테마</span>
                </>
              ) : (
                <>
                  <BookOpen className="w-3.5 h-3.5 text-amber-700 animate-pulse" />
                  <span className="hidden sm:inline">오리지널 매거진 테마</span>
                  <span className="sm:hidden">매거진 테마</span>
                </>
              )}
            </button>
          )}

          <Link to="/seller" className="hidden sm:block text-xs uppercase tracking-widest border border-brand-green px-4 py-2 hover:bg-brand-green hover:text-white transition-all">
            Seller Center
          </Link>
          <button className="p-2 hover:bg-black/5 rounded-full ring-offset-background">
            <ShoppingBag className="w-5 h-5 text-brand-green" />
          </button>
          <button 
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden bg-background border-b border-black/5 px-6 pb-10 flex flex-col gap-6"
        >
          {navLinks.map((link) => (
            <Link 
              key={link.path} 
              to={link.path}
              onClick={() => setIsMenuOpen(false)}
              className="text-lg magazine-heading"
            >
              {link.name}
            </Link>
          ))}
          <Link 
            to="/seller" 
            onClick={() => setIsMenuOpen(false)}
            className="text-lg magazine-heading text-brand-terracotta"
          >
            Become a Seller
          </Link>
        </motion.div>
      )}
    </nav>
  );
}
