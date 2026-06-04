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

export interface DetailPageData {
  intro: {
    title: string;
    subtitle: string;
    summary: string;
  };
  legacy_story: {
    headline: string;
    narrative: string;
  };
  sensory_profile: {
    visual: string;
    touch_text: string;
    atmosphere: string;
  };
  features: {
    number: string;
    title: string;
    explain: string;
  }[];
  lifestyle_matching: {
    headline: string;
    matching_points: string[];
  };
  guide: {
    usage: string;
    storage: string;
  };
}
