export const categoryImages = {
  "Women's Tailoring": {
    card: 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?auto=format&fit=crop&w=1000&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1583391733956-6c78276477e2?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1596783074918-c2cb64d7d290?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1617922000084-4b4f4f9f9f9f?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  "Men's Tailoring": {
    card: 'https://images.unsplash.com/photo-1597385102269-3c0d8389b1c0?auto=format&fit=crop&w=1000&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1597385102269-3c0d8389b1c0?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1617137968427-85924c800a22?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  'Cloth Alteration': {
    card: 'https://images.unsplash.com/photo-1596783074918-c2cb64d7d290?auto=format&fit=crop&w=1000&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1596783074918-c2cb64d7d290?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1610030469983-98e550d61932?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1581655353564-df123c1ded8e?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  'Custom Stitching': {
    card: 'https://images.unsplash.com/photo-1617922000084-4b4f4f9f9f9f?auto=format&fit=crop&w=1000&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1617922000084-4b4f4f9f9f9f?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1610030469983-98e550d61932?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1581655353564-df123c1ded8e?auto=format&fit=crop&w=1200&q=80',
    ],
  },
} as const;

export const heroImages = {
  tailor: 'https://images.unsplash.com/photo-1597385102269-3c0d8389b1c0?auto=format&fit=crop&w=1200&q=80',
  garments: 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?auto=format&fit=crop&w=1200&q=80',
  fabric: 'https://images.unsplash.com/photo-1610030469983-98e550d61932?auto=format&fit=crop&w=1200&q=80',
};

export const defaultImagesByCategory = (category: keyof typeof categoryImages) => [...categoryImages[category].gallery];

export const tailorSeedImages = (tailorName: string, category: keyof typeof categoryImages, index: number): string => {
  const allGalleries = Object.values(categoryImages).flatMap((c) => c.gallery);
  const unique = allGalleries.filter((url, i, arr) => arr.indexOf(url) === i);
  const offset = tailorName.charCodeAt(0) % unique.length;
  return unique[(offset + index) % unique.length];
};
