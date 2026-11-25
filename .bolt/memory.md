# Project memory

## Product intent & audience

- Full-stack web app connecting customers with local tailors in Dhaka
- Core features: interactive filtering of tailors, public tailor registration, customer session management, automated review aggregation
- Built with Vite + React + Supabase

## Brand personality & voice

- Production-quality, polished, distinctive design (not cookie-cutter)
- Implies a trustworthy, refined marketplace feel for tailoring services

## Visual design & UX direction

- Color accent system uses sage/olive tones for selected/active states (e.g., sage-green border, soft olive tint, inset border shadow)
- Radio-card pattern: clickable horizontal cards with radio indicator + label together on left (`flex items-center gap-3 text-left`), compact standard-size radio circle vertically centered
- CSS class conventions: `.order-section` for grouped form areas, `.radio-card` for selectable option cards
- A global `label input { width:100% }` rule exists in the stylesheet; it can stretch radios inside labels and must be overridden within `.radio-card` contexts to keep radios compact

## Decisions, constraints & rationale

- Order flow includes a "fabric shortage resolution" step with three options: "Customer sends additional fabric", "Contact tailor before proceeding", "Tailor adjusts design / updates price"
- UI fixes must not alter order state, database logic, or surrounding sections
- Selected option cards use unmistakable active styling (sage border + olive tint + inset shadow)
- Radio circles stay compact and left-aligned with labels; never centered or oversized

## Open questions & assumptions

- Full order creation flow details (fields, steps, validation) not yet documented
- Supabase schema for tailors, orders, reviews, and sessions not yet detailed
- Global CSS rules beyond `label input` may conflict with component-level styling; further overrides may be needed as UI expands