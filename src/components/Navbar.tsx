import { Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { ShoppingBag, User, Menu, X } from 'lucide-react';
import { useState } from 'react';
import logoImg from '../assets/images/market_moum_logo_1780557786342.png';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { name: 'Markets', path: '/markets' },
    { name: 'Artisans', path: '/artisans' },
    { name: 'About', path: '/about' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-black/5">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3.5 group">
          <div className="relative w-10 h-10 overflow-hidden border border-[#D4AF37]/30 bg-[#111] flex items-center justify-center p-0.5 rounded-full shadow-md shadow-gold/10 transition-all duration-300 group-hover:scale-105 group-hover:border-[#D4AF37]">
            <img 
              src={logoImg} 
              alt="Market Moum Logo Icon" 
              className="w-full h-full object-cover rounded-full"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-brand-green magazine-heading leading-tight transition-colors group-hover:text-brand-terracotta">
              마켓모움
            </span>
            <span className="text-[8px] text-brand-green/50 tracking-[0.2em] font-mono leading-none mt-0.5">
              MARKET MOUM
            </span>
          </div>
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
