# Karigor

Karigor is a university project prototype for discovering local tailor shops in Dhaka. Visitors can browse sample listings, filter by location, service, category, and starting price, view portfolios, use contact actions, register a shop, and leave reviews.

## Technology

- React, Vite, TypeScript, Tailwind CSS, Lucide React
- Supabase PostgreSQL through the browser client
- Lightweight name-and-phone customer identification stored in `localStorage`

## Features

The homepage follows the editorial Karigor design with a sage green, cream, and olive-gold palette. The directory loads from Supabase, supports combined filters and sorting, and links to UUID-based tailor profiles. Tailor registration and customer review flows write directly to Supabase and refresh the interface after successful mutations.

## Database

The public schema contains exactly three application tables: `users`, `tailors`, and `reviews`. Reviews reference tailors with cascade deletion. A secured database trigger recalculates `rating` and `review_count` after review inserts, updates, and deletes. The migration also adds indexes, constraints, public prototype RLS policies, and eight fixed-ID fictional seed shops with sample reviews.

## Project structure

- `src/App.tsx`: routes, layout, homepage, directory, profile, dialogs, and review flow
- `src/index.css`: visual system and responsive layout
- `src/lib/supabase.ts`: single Supabase browser client
- `supabase/`: database migration history managed by the connected Supabase project

## Prototype limitations

This application intentionally uses public read and insert policies for a controlled academic demonstration. Name-and-phone login is lightweight identification, not secure authentication. Customer names and phone numbers are publicly accessible through the demonstration database, and reviews are not linked to verified transactions. Testers should use fictional information.

Sample shops, reviews, phone numbers, and portfolio photographs are illustrative. Calls and WhatsApp actions are blocked for seeded sample shops. Tailoring arrangements, payments, measurements, delivery, and completion happen offline between customers and tailors.

The prototype is not ready for public production deployment. A production version would need proper authentication, private customer records, ownership-based access rules, spam prevention, moderation, and stronger contact privacy.
