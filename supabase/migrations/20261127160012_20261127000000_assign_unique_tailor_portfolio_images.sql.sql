/*
# Assign unique, category-matched portfolio images to seeded tailors

1. Existing data preserved
- Only the eight fixed demonstration profiles (IDs 10000000-...001 through ...008) receive updated portfolio_images.
- Customer-created tailor profiles are not modified.
- UUIDs, reviews, ratings, services, contact details, and all other columns remain unchanged.

2. Image matching by category
- Women's Tailoring (Nakshi Tailors, Thread & Bloom): women's fashion and traditional garment photos.
- Men's Tailoring (Classic Stitch, Urban Fit Tailors, The Tailored Gentleman): menswear, men's suit, and men's fashion photos.
- Cloth Alteration (Quick Fix Alterations): sewing machine, measuring tape, and alteration craft photos.
- Custom Stitching (Aarongini Stitch Studio, Shilpo Stitch House): fabric, textile, and bespoke garment photos.

3. Uniqueness
- Every seeded tailor now has a unique main image (portfolio_images[1]) that no other seeded tailor shares.
- Gallery images are also distinct across tailors within the same category.
- No image URL is repeated as the primary card image across any two tailors.

4. Presentation
- These URLs remain illustrative sample photography and do not imply that pictured people operate the fictional shops.
*/

-- Women's Tailoring: Nakshi Tailors (ID ...001)
UPDATE public.tailors SET portfolio_images = ARRAY[
  'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=1200&q=80'
] WHERE id = '10000000-0000-4000-8000-000000000001';

-- Men's Tailoring: Classic Stitch (ID ...002)
UPDATE public.tailors SET portfolio_images = ARRAY[
  'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80'
] WHERE id = '10000000-0000-4000-8000-000000000002';

-- Custom Stitching: Aarongini Stitch Studio (ID ...003)
UPDATE public.tailors SET portfolio_images = ARRAY[
  'https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1200&q=80'
] WHERE id = '10000000-0000-4000-8000-000000000003';

-- Men's Tailoring: Urban Fit Tailors (ID ...004)
UPDATE public.tailors SET portfolio_images = ARRAY[
  'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1488161628813-04466f872be2?auto=format&fit=crop&w=1200&q=80'
] WHERE id = '10000000-0000-4000-8000-000000000004';

-- Men's Tailoring: The Tailored Gentleman (ID ...005)
UPDATE public.tailors SET portfolio_images = ARRAY[
  'https://images.unsplash.com/photo-1516257984-b1b4d707412e?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1581349485608-9469926a8e5e?auto=format&fit=crop&w=1200&q=80'
] WHERE id = '10000000-0000-4000-8000-000000000005';

-- Cloth Alteration: Quick Fix Alterations (ID ...006)
UPDATE public.tailors SET portfolio_images = ARRAY[
  'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=1200&q=80'
] WHERE id = '10000000-0000-4000-8000-000000000006';

-- Women's Tailoring: Thread & Bloom (ID ...007)
UPDATE public.tailors SET portfolio_images = ARRAY[
  'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80'
] WHERE id = '10000000-0000-4000-8000-000000000007';

-- Custom Stitching: Shilpo Stitch House (ID ...008)
UPDATE public.tailors SET portfolio_images = ARRAY[
  'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?auto=format&fit=crop&w=1200&q=80'
] WHERE id = '10000000-0000-4000-8000-000000000008';
