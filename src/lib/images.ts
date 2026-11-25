export const categoryImages = {
  "Women's Tailoring": {
    card: 'https://images.unsplash.com/photo-1771507056578-f9675a2a8f8a?auto=format&fit=crop&w=1000&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1771507056578-f9675a2a8f8a?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1772290660319-ed78b7a2b469?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  "Men's Tailoring": {
    card: 'https://images.unsplash.com/photo-1774527929835-282b1b85cd3a?auto=format&fit=crop&w=1000&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1774527929835-282b1b85cd3a?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1780504863007-44f229d4d33f?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  'Cloth Alteration': {
    card: 'https://images.unsplash.com/photo-1772290660319-ed78b7a2b469?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1772290660319-ed78b7a2b469?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1774624722097-da20076c8958?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  'Custom Stitching': {
    card: 'https://images.unsplash.com/photo-1774624722097-da20076c8958?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1774624722097-da20076c8958?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1780504863007-44f229d4d33f?auto=format&fit=crop&w=1200&q=80',
    ],
  },
} as const;

export const heroImages = {
  tailor: categoryImages["Men's Tailoring"].gallery[1],
  garments: categoryImages["Women's Tailoring"].gallery[0],
  fabric: categoryImages['Custom Stitching'].gallery[0],
};

export const defaultImagesByCategory = (category: keyof typeof categoryImages) => [...categoryImages[category].gallery];
