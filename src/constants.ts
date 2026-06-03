import { Product, Artisan } from './types';

export const PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: '청송 사과 꿀청 (Cheongsong Honey Apple Jam)',
    price: 18000,
    image: 'https://images.unsplash.com/photo-1590779033100-9f60705a2f3b?q=80&w=800&auto=format&fit=crop',
    category: 'Food',
    description: '청송의 맑은 공기와 햇살을 머금은 사과로 만든 명품 꿀청입니다.',
    artisan: 'Kim Dal-woo',
    isLimited: true,
    timeLeft: '05:24:12',
    stock: 12
  },
  {
    id: 'p2',
    name: '담양 수제 대나무 캔들 (Damyang Bamboo Candle)',
    price: 32000,
    image: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?q=80&w=800&auto=format&fit=crop',
    category: 'Living',
    description: '담양 대나무 숲의 고요함을 담은 천연 소이 캔들입니다.',
    artisan: 'Lee Hyo-jin',
    isLimited: false,
    stock: 45
  },
  {
    id: 'p3',
    name: '제주 돌담 머그컵 (Jeju Stone Wall Mug)',
    price: 24000,
    image: 'https://images.unsplash.com/photo-1514228742587-6b1558fbed20?q=80&w=800&auto=format&fit=crop',
    category: 'Craft',
    description: '제주의 거친 돌담 질감을 현대적으로 재해석한 도자기 머그입니다.',
    artisan: 'Park Seo-yoon',
    isLimited: true,
    timeLeft: '12:00:00',
    stock: 8
  }
];

export const ARTISANS: Artisan[] = [
  {
    id: 'a1',
    name: 'Kim Dal-woo',
    role: 'Traditional Jam Master',
    story: '3대째 내려오는 비법으로 사과의 진미를 담아냅니다.',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=800&auto=format&fit=crop',
    location: 'Cheongsong'
  }
];
