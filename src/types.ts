export interface BrandPackage {
  tagline: string;
  story: string;
  details: string[];
  marketingCopy: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  description: string;
  artisan: string;
  isLimited: boolean;
  timeLeft?: string;
  stock?: number;
}

export interface Artisan {
  id: string;
  name: string;
  role: string;
  story: string;
  image: string;
  location: string;
}
