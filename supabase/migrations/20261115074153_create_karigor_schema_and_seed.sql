/*
# Create Karigor public prototype schema and seed data

1. New Tables
- `users`: lightweight customer identification records with a name, unique Bangladeshi phone number, and creation time.
- `tailors`: public tailor shop listings containing contact details, category, services, pricing, portfolio image URLs, review aggregates, and listing status.
- `reviews`: public customer reviews linked to a tailor with a rating, comment, customer name, and creation time.

2. Data Integrity
- UUID primary keys use `gen_random_uuid()`.
- Phone, category, service, price, rating, review, and text-length constraints enforce the prototype's supported values.
- Reviews cascade-delete with their tailor.
- Indexes support area, category, price, creation time, and review lookups.

3. Security
- RLS is enabled for all three public prototype tables.
- Anonymous and authenticated roles can select and insert only; update and delete are not granted.
- Public inserts are intentionally permitted for this academic demonstration and are not production authentication.

4. Automatic Aggregation
- A fixed-search-path SECURITY DEFINER trigger function recalculates a tailor's average rating and review count after review inserts, updates, and deletes.

5. Seed Data
- Eight fictional Dhaka tailor profiles and their fixed-ID demonstration reviews are inserted idempotently.
- Seed data uses illustrative portfolio images and sample review content.
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(trim(name)) >= 2),
  phone text NOT NULL UNIQUE CHECK (phone ~ '^01[0-9]{9}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tailors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_name text NOT NULL CHECK (char_length(trim(shop_name)) BETWEEN 2 AND 80),
  owner_name text NOT NULL CHECK (char_length(trim(owner_name)) BETWEEN 2 AND 80),
  area text NOT NULL CHECK (char_length(trim(area)) > 0),
  address text NOT NULL CHECK (char_length(trim(address)) > 0),
  phone text NOT NULL CHECK (phone ~ '^01[0-9]{9}$'),
  starting_price integer NOT NULL CHECK (starting_price > 0),
  services text[] NOT NULL DEFAULT ARRAY[]::text[] CHECK (cardinality(services) >= 1),
  category text NOT NULL CHECK (category IN ('Women''s Tailoring', 'Men''s Tailoring', 'Cloth Alteration', 'Custom Stitching')),
  rating numeric(2,1) NOT NULL DEFAULT 5.0 CHECK (rating >= 0 AND rating <= 5),
  review_count integer NOT NULL DEFAULT 0 CHECK (review_count >= 0),
  bio text NOT NULL DEFAULT '',
  portfolio_images text[] NOT NULL DEFAULT ARRAY[]::text[],
  is_new boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tailor_id uuid NOT NULL REFERENCES public.tailors(id) ON DELETE CASCADE,
  user_name text NOT NULL CHECK (char_length(trim(user_name)) >= 2),
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text NOT NULL CHECK (char_length(trim(comment)) BETWEEN 5 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tailors_area_idx ON public.tailors(area);
CREATE INDEX IF NOT EXISTS tailors_category_idx ON public.tailors(category);
CREATE INDEX IF NOT EXISTS tailors_starting_price_idx ON public.tailors(starting_price);
CREATE INDEX IF NOT EXISTS tailors_created_at_idx ON public.tailors(created_at DESC);
CREATE INDEX IF NOT EXISTS reviews_tailor_id_idx ON public.reviews(tailor_id);

CREATE OR REPLACE FUNCTION public.refresh_tailor_review_summary()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_tailor uuid;
BEGIN
  IF TG_OP IN ('DELETE', 'UPDATE') THEN
    affected_tailor := OLD.tailor_id;
    UPDATE public.tailors
    SET rating = COALESCE((SELECT round(avg(r.rating)::numeric, 1) FROM public.reviews r WHERE r.tailor_id = affected_tailor), 5.0),
        review_count = (SELECT count(*)::integer FROM public.reviews r WHERE r.tailor_id = affected_tailor)
    WHERE id = affected_tailor;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    affected_tailor := NEW.tailor_id;
    UPDATE public.tailors
    SET rating = COALESCE((SELECT round(avg(r.rating)::numeric, 1) FROM public.reviews r WHERE r.tailor_id = affected_tailor), 5.0),
        review_count = (SELECT count(*)::integer FROM public.reviews r WHERE r.tailor_id = affected_tailor)
    WHERE id = affected_tailor;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS reviews_refresh_tailor_summary ON public.reviews;
CREATE TRIGGER reviews_refresh_tailor_summary
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.refresh_tailor_review_summary();

REVOKE ALL ON FUNCTION public.refresh_tailor_review_summary() FROM PUBLIC, anon, authenticated;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tailors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.users TO anon, authenticated;
GRANT SELECT, INSERT ON public.tailors TO anon, authenticated;
GRANT SELECT, INSERT ON public.reviews TO anon, authenticated;

DROP POLICY IF EXISTS "public_read_users" ON public.users;
CREATE POLICY "public_read_users" ON public.users FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public_insert_users" ON public.users;
CREATE POLICY "public_insert_users" ON public.users FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_read_tailors" ON public.tailors;
CREATE POLICY "public_read_tailors" ON public.tailors FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public_insert_tailors" ON public.tailors;
CREATE POLICY "public_insert_tailors" ON public.tailors FOR INSERT TO anon, authenticated
WITH CHECK (rating = 5.0 AND review_count = 0 AND is_new = true);

DROP POLICY IF EXISTS "public_read_reviews" ON public.reviews;
CREATE POLICY "public_read_reviews" ON public.reviews FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public_insert_reviews" ON public.reviews;
CREATE POLICY "public_insert_reviews" ON public.reviews FOR INSERT TO anon, authenticated WITH CHECK (true);

INSERT INTO public.tailors (id, shop_name, owner_name, area, address, phone, starting_price, services, category, bio, portfolio_images, is_new, created_at)
VALUES
('10000000-0000-4000-8000-000000000001', 'Nakshi Tailors', 'Farzana Akter', 'Mirpur', 'Mirpur 10, near the main market, Dhaka', '01000000001', 450, ARRAY['Salwar Kameez','Blouse','Alteration'], 'Women''s Tailoring', 'Specializing in everyday and occasion wear with comfortable fittings, neat stitching, and traditional designs.', ARRAY['https://images.unsplash.com/photo-1771507056578-f9675a2a8f8a?auto=format&fit=crop&w=1000&q=80','https://images.unsplash.com/photo-1772290660319-ed78b7a2b469?auto=format&fit=crop&w=1200&q=80'], false, now() - interval '120 days'),
('10000000-0000-4000-8000-000000000002', 'Classic Stitch', 'Mahmud Hasan', 'Mirpur', 'Section 14, Mirpur, Dhaka', '01000000002', 650, ARRAY['Panjabi','Shirt & Pant','Alteration'], 'Men''s Tailoring', 'Custom men''s tailoring focused on precise measurements, clean finishing, and comfortable traditional and formal wear.', ARRAY['https://images.unsplash.com/photo-1774527929835-282b1b85cd3a?auto=format&fit=crop&w=1000&q=80','https://images.unsplash.com/photo-1780504863007-44f229d4d33f?auto=format&fit=crop&w=1200&q=80'], false, now() - interval '105 days'),
('10000000-0000-4000-8000-000000000003', 'Aarongini Stitch Studio', 'Nusrat Jahan', 'Dhanmondi', 'Road 7, Dhanmondi, Dhaka', '01000000003', 1200, ARRAY['Bridal/Lehenga','Salwar Kameez','Blouse'], 'Custom Stitching', 'A boutique-style tailoring studio offering personalized occasion wear, detailed stitching, and custom outfit designs.', ARRAY['https://images.unsplash.com/photo-1771507056578-f9675a2a8f8a?auto=format&fit=crop&w=1000&q=80','https://images.unsplash.com/photo-1774624722097-da20076c8958?auto=format&fit=crop&w=1200&q=80'], false, now() - interval '90 days'),
('10000000-0000-4000-8000-000000000004', 'Urban Fit Tailors', 'Tanvir Ahmed', 'Uttara', 'Sector 7, Uttara, Dhaka', '01000000004', 850, ARRAY['Shirt & Pant','Panjabi','Suit & Blazer'], 'Men''s Tailoring', 'Tailoring services for modern office wear, traditional outfits, and customized formal clothing.', ARRAY['https://images.unsplash.com/photo-1774527929835-282b1b85cd3a?auto=format&fit=crop&w=1000&q=80','https://images.unsplash.com/photo-1780504863007-44f229d4d33f?auto=format&fit=crop&w=1200&q=80'], false, now() - interval '75 days'),
('10000000-0000-4000-8000-000000000005', 'The Tailored Gentleman', 'Imran Hossain', 'Gulshan', 'Gulshan 2, near the commercial area, Dhaka', '01000000005', 2500, ARRAY['Suit & Blazer','Shirt & Pant','Panjabi'], 'Men''s Tailoring', 'Premium bespoke tailoring for suits, blazers, formal shirts, and special occasions with attention to detail.', ARRAY['https://images.unsplash.com/photo-1780504863007-44f229d4d33f?auto=format&fit=crop&w=1200&q=80','https://images.unsplash.com/photo-1774624722097-da20076c8958?auto=format&fit=crop&w=1200&q=80'], false, now() - interval '60 days'),
('10000000-0000-4000-8000-000000000006', 'Quick Fix Alterations', 'Shahana Begum', 'Mohammadpur', 'Tajmahal Road, Mohammadpur, Dhaka', '01000000006', 350, ARRAY['Alteration','Shirt & Pant','Blouse'], 'Cloth Alteration', 'Affordable clothing adjustments, resizing, repairs, and everyday alteration services with careful finishing.', ARRAY['https://images.unsplash.com/photo-1772290660319-ed78b7a2b469?auto=format&fit=crop&w=1200&q=80','https://images.unsplash.com/photo-1774624722097-da20076c8958?auto=format&fit=crop&w=1200&q=80'], false, now() - interval '45 days'),
('10000000-0000-4000-8000-000000000007', 'Thread & Bloom', 'Samia Rahman', 'Bashundhara', 'Block C, Bashundhara Residential Area, Dhaka', '01000000007', 750, ARRAY['Salwar Kameez','Blouse','Bridal/Lehenga'], 'Women''s Tailoring', 'Personalized women''s tailoring inspired by contemporary fashion and traditional South Asian clothing.', ARRAY['https://images.unsplash.com/photo-1771507056578-f9675a2a8f8a?auto=format&fit=crop&w=1000&q=80','https://images.unsplash.com/photo-1772290660319-ed78b7a2b469?auto=format&fit=crop&w=1200&q=80'], true, now() - interval '10 days'),
('10000000-0000-4000-8000-000000000008', 'Shilpo Stitch House', 'Rakib Chowdhury', 'Dhanmondi', 'Road 15, Dhanmondi, Dhaka', '01000000008', 950, ARRAY['Panjabi','Salwar Kameez','Shirt & Pant','Alteration'], 'Custom Stitching', 'Versatile custom tailoring for customers looking for personalized designs, fabric choices, and comfortable fits.', ARRAY['https://images.unsplash.com/photo-1774527929835-282b1b85cd3a?auto=format&fit=crop&w=1000&q=80','https://images.unsplash.com/photo-1774624722097-da20076c8958?auto=format&fit=crop&w=1200&q=80'], true, now() - interval '4 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.reviews (id, tailor_id, user_name, rating, comment, created_at)
VALUES
('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Mim Rahman',5,'Beautiful stitching and a very comfortable fitting. The finishing was neat.','2026-07-04T10:00:00Z'),
('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','Nabila Sultana',5,'They communicated clearly and completed my salwar kameez on time.','2026-08-12T10:00:00Z'),
('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','Rita Akter',4,'Good alteration work at an affordable price.','2026-09-01T10:00:00Z'),
('20000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000002','Sajid Karim',5,'My panjabi fit perfectly and the stitching quality was excellent.','2026-07-09T10:00:00Z'),
('20000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000002','Arif Hossain',4,'Friendly service and a clean finish on my shirt and pant.','2026-08-18T10:00:00Z'),
('20000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000002','Nayeem Islam',5,'The measurements were carefully taken and the work was ready when promised.','2026-09-10T10:00:00Z'),
('20000000-0000-4000-8000-000000000007','10000000-0000-4000-8000-000000000003','Tania Noor',5,'Detailed work, thoughtful communication, and a lovely custom design.','2026-07-13T10:00:00Z'),
('20000000-0000-4000-8000-000000000008','10000000-0000-4000-8000-000000000003','Maliha Chowdhury',5,'The fitting was elegant and the finishing looked beautifully handmade.','2026-08-21T10:00:00Z'),
('20000000-0000-4000-8000-000000000009','10000000-0000-4000-8000-000000000003','Sumaiya Kabir',5,'My occasion outfit was completed on time and exceeded expectations.','2026-09-12T10:00:00Z'),
('20000000-0000-4000-8000-000000000010','10000000-0000-4000-8000-000000000004','Rafi Ahmed',4,'Good fit for office wear and a very polished final finish.','2026-08-01T10:00:00Z'),
('20000000-0000-4000-8000-000000000011','10000000-0000-4000-8000-000000000004','Shuvo Das',5,'They understood my requirements and delivered a comfortable panjabi.','2026-08-28T10:00:00Z'),
('20000000-0000-4000-8000-000000000012','10000000-0000-4000-8000-000000000004','Imtiaz Rahman',4,'Helpful staff and reliable stitching quality.','2026-09-15T10:00:00Z'),
('20000000-0000-4000-8000-000000000013','10000000-0000-4000-8000-000000000005','Fahim Noor',5,'The suit fitting was precise and the tailoring felt genuinely bespoke.','2026-07-22T10:00:00Z'),
('20000000-0000-4000-8000-000000000014','10000000-0000-4000-8000-000000000005','Mushfiq Hasan',5,'Excellent communication and very clean finishing on the blazer.','2026-08-24T10:00:00Z'),
('20000000-0000-4000-8000-000000000015','10000000-0000-4000-8000-000000000005','Aminul Islam',4,'Premium work with a comfortable fit for a formal event.','2026-09-18T10:00:00Z'),
('20000000-0000-4000-8000-000000000016','10000000-0000-4000-8000-000000000006','Jannat Ara',4,'Quick and affordable alteration with careful stitching.','2026-08-14T10:00:00Z'),
('20000000-0000-4000-8000-000000000017','10000000-0000-4000-8000-000000000006','Lamia Hasan',5,'My dress was resized neatly and ready sooner than expected.','2026-09-20T10:00:00Z'),
('20000000-0000-4000-8000-000000000018','10000000-0000-4000-8000-000000000007','Oishi Ahmed',5,'The design felt personal and the fitting was very flattering.','2026-10-22T10:00:00Z'),
('20000000-0000-4000-8000-000000000019','10000000-0000-4000-8000-000000000007','Raisa Karim',4,'Lovely fabric advice and a neat finish for an affordable price.','2026-11-01T10:00:00Z'),
('20000000-0000-4000-8000-000000000020','10000000-0000-4000-8000-000000000008','Adnan Kabir',5,'The custom panjabi fit well and the team was easy to communicate with.','2026-11-05T10:00:00Z'),
('20000000-0000-4000-8000-000000000021','10000000-0000-4000-8000-000000000008','Sadia Rahman',5,'Neat stitching and a comfortable fit. The work was completed quickly.','2026-11-09T10:00:00Z')
ON CONFLICT (id) DO NOTHING;

UPDATE public.tailors t
SET rating = COALESCE((SELECT round(avg(r.rating)::numeric, 1) FROM public.reviews r WHERE r.tailor_id = t.id), 5.0),
    review_count = (SELECT count(*)::integer FROM public.reviews r WHERE r.tailor_id = t.id)
WHERE t.id IN (
  '10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000004',
  '10000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000007','10000000-0000-4000-8000-000000000008'
);