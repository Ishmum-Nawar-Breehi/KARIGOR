/*
# Curate sample portfolio photography

1. Existing data preserved
- Only the eight fixed demonstration profiles receive curated replacements.
- Customer-created portfolio URLs are not modified.
- UUIDs, reviews, ratings, services, and contact details remain unchanged.

2. Image matching
- Men's Tailoring profiles use menswear, male tailoring, and neutral workshop images.
- Women's Tailoring profiles use women's traditional garments and sewing details.
- Cloth Alteration uses neutral repair and sewing imagery.
- Custom Stitching uses pattern, fabric, and bespoke workshop imagery.

3. Presentation
- These URLs remain illustrative sample photography and do not imply that pictured people operate the fictional shops.
*/

UPDATE public.tailors SET portfolio_images = ARRAY[
  'https://images.unsplash.com/photo-1771507056578-f9675a2a8f8a?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1772290660319-ed78b7a2b469?auto=format&fit=crop&w=1200&q=80'
] WHERE id = '10000000-0000-4000-8000-000000000001';

UPDATE public.tailors SET portfolio_images = ARRAY[
  'https://images.unsplash.com/photo-1774527929835-282b1b85cd3a?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1780504863007-44f229d4d33f?auto=format&fit=crop&w=1200&q=80'
] WHERE id IN ('10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000005');

UPDATE public.tailors SET portfolio_images = ARRAY[
  'https://images.unsplash.com/photo-1772290660319-ed78b7a2b469?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1774624722097-da20076c8958?auto=format&fit=crop&w=1200&q=80'
] WHERE id = '10000000-0000-4000-8000-000000000006';

UPDATE public.tailors SET portfolio_images = ARRAY[
  'https://images.unsplash.com/photo-1771507056578-f9675a2a8f8a?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1772290660319-ed78b7a2b469?auto=format&fit=crop&w=1200&q=80'
] WHERE id = '10000000-0000-4000-8000-000000000007';

UPDATE public.tailors SET portfolio_images = ARRAY[
  'https://images.unsplash.com/photo-1774624722097-da20076c8958?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1780504863007-44f229d4d33f?auto=format&fit=crop&w=1200&q=80'
] WHERE id = '10000000-0000-4000-8000-000000000003';

UPDATE public.tailors SET portfolio_images = ARRAY[
  'https://images.unsplash.com/photo-1774624722097-da20076c8958?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1774527929835-282b1b85cd3a?auto=format&fit=crop&w=1000&q=80'
] WHERE id = '10000000-0000-4000-8000-000000000008';