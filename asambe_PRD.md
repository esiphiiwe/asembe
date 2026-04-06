# Asambe — Product Requirements Document
> "Let's go." Find someone to do things with. No friendship pressure, no commitment. Just show up together.

---

## 1. Project Overview

**App name:** Asambe  
**Tagline:** Let's go — find someone to do things with  
**Positioning:** An activity companion app. Not a friendship app, not a dating app. A platform for people who want someone to attend an event, activity, or experience with — without the pressure of building an ongoing friendship.  
**Primary audience:** Women-first, open to all  
**Launch scope:** Single city MVP, global-ready architecture  
**Platform:** Mobile app (React Native + Expo) — iOS and Android from one codebase  

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo (managed workflow) |
| Language | TypeScript |
| Styling | NativeWind (Tailwind CSS for React Native) |
| Navigation | Expo Router |
| Database | Supabase (PostgreSQL with Row Level Security) |
| Auth | Supabase Auth (email/password, session management) |
| Storage | Supabase Storage (profile photos) |
| Real-time | Supabase Realtime (match notifications, chat) |
| Maps | React Native Maps + Mapbox (neighborhood display, coordinates hidden pre-match) |
| Deployment | Expo EAS (iOS + Android builds and submissions) |

---

## 3. Data Model

### Entities and relationships (implementation-agnostic)

**Users**
- ID, name, email, phone, gender, age, profile photo, bio (max 160 chars), city, country, verified status, trust score, created at

**Categories**
- ID, name (hiking, museums, concerts, dining, running, art, film, travel, other), icon, active status
- Fixed enum — anything not in the list falls under "other"
- "Other" entries are tracked and promoted to standalone categories when a usage threshold is reached

**Other Category Tracker**
- Tracks custom labels submitted under "other"
- When a label reaches a configurable count threshold it is flagged for admin review and potential promotion to a standalone category

**Activities**
- ID, user (poster), category, custom category label (if other), title, description
- Date/time for one-time activities
- Recurrence rule for recurring activities (e.g. weekly:friday) — stored as one record, occurrences handled at application layer
- Recurrence end date (optional)
- Neighborhood (displayed publicly), coordinates (stored, never exposed pre-match), city, country
- Companion count (1-on-1 or small group 2–4)
- Status: open / matched / closed / expired

**User Activity Preferences**
- Per user, per category: skill level (beginner / intermediate / experienced), preferred companion gender (any / women only / no preference), preferred age range min/max

**Match Requests**
- ID, activity, requester, status (pending / accepted / declined), created at

**Matches**
- ID, activity, user 1, user 2, status (confirmed / completed / cancelled), created at
- On confirmation: coordinates shared with both users, chat thread unlocked

**Reviews**
- ID, match, reviewer, reviewee, rating (1–5), flagged, flag reason, created at
- Trust score on user profile is a rolling average of all ratings received, recalculated on each new review

---

## 4. Matching Logic

Matching is a scored function between a requester and an activity poster. Higher score = better match. Calculated at request time and used for ranking.

### Match Score Components (weighted sum)

| Factor | Weight | Notes |
|---|---|---|
| Category match | Hard requirement | No match if category differs |
| Neighborhood proximity | 30% | Same neighborhood = 1.0, adjacent = 0.7, same city = 0.3 |
| Timing compatibility | 25% | Exact time = 1.0, within 1hr = 0.7, recurrence overlap = 0.5 |
| Trust score delta | 20% | Penalise large gaps — don't match 5-star veteran with unrated new user |
| Gender preference compatibility | 15% | Hard filter if women_only is set |
| Age range compatibility | 10% | Overlap of preferred ranges |
| Prior match history | Modifier | Negative: previous low rating between same pair → suppress match |

---

## 5. Application Screens & Navigation

### Public screens (unauthenticated)
- [x] **Landing** — Tagline, value proposition, signup / login CTA
- [x] **Sign up** — Registration flow (multi-step: account, profile, preferences)
- [x] **Log in** — Login with email/password

### Authenticated screens
- [x] **Home feed** — Browse open activities by category, neighborhood, date (search bar, category chips, card carousels)
- [x] **Post activity** — Post a new activity (one-time or recurring) with category selection, companion count, gender preferences
- [x] **Activity detail** — Single activity view with hero image, poster info, safety section, sticky "Request to join" CTA
- [x] **Match inbox** — Pending requests, confirmed matches, completed (tabbed interface with match cards)
- [x] **My profile** — Trust score, bio, activity preferences, posted activities, reviews, edit profile
- [x] **Chat** — In-app messaging with message bubbles, expiry notice, SOS button, block/report
- [x] **Settings** — Account, notifications, safety, subscription, about (grouped rows with toggles)

### Admin screens (internal)
- **Category management** — View other category tracker, promote to standalone

---

## 6. Core User Flows

### 6.1 Onboarding
1. Sign up with email + password
2. Verify email
3. Complete profile: name, photo, gender, age, city, bio (max 160 chars)
4. Select activity preferences + skill levels
5. Set companion gender preference
6. Land on home feed

### 6.2 Posting an Activity
1. Tap "Post an activity"
2. Select category (or 'other' + type label)
3. Enter title and description
4. Set date/time OR set recurrence rule + optional end date
5. Enter neighborhood (not exact address)
6. Set companion count (1 or 2–4)
7. Submit → activity goes live as open

### 6.3 Finding a Companion
1. Browse home feed filtered by category / neighborhood / date
2. Tap activity → view detail + poster's public profile
3. Tap "Request to join"
4. Poster receives notification
5. Poster accepts or declines
6. On accept → coordinates shared, chat unlocked
7. Post-activity → both users prompted to leave a review

### 6.4 Recurring Activity Flow
1. User posts "5pm Friday run" with recurrence rule: weekly, Friday
2. Activity surfaces every Friday in the feed
3. Each occurrence can have a separate match request
4. Poster can accept different companions for different occurrences or the same recurring companion

---

## 7. Safety Features (non-negotiable, must ship at launch)

- [x] **Photo verification** — Settings row wired with "Get verified" CTA; Veriff SDK stub ready (requires `VERIFF_API_KEY` to activate full flow)
- [x] **Email + phone verification** — Email verified via Supabase Auth; phone required on profile before posting or requesting an activity
- [x] **Neighborhood-only display** — exact coordinates never shown pre-match (enforced at DB/service layer)
- [x] **Activity check-in** — "Share check-in" button on confirmed match cards uses native share sheet; manage up to 3 trusted contacts via Settings → Trusted contacts
- [x] **In-app SOS button** — Red shield button visible in chat header during active match; triggers emergency call (112) or native share sheet with companion + activity details
- [x] **Two-way post-activity reviews** — mandatory prompt after each completed match
- [x] **Trust score** — visible on all profiles, auto-recalculated via DB trigger on each new review
- [x] **Block and report** — Block/Report menu in chat header; Report button on activity detail screen; manage blocks via Settings → Blocked users
- [x] **Women-only filter** — hard filter on activities table (`women_only` boolean); enforced in `createMatchRequest` — non-women are rejected with a clear error; toggle available when posting

---

## 8. Monetization (Phase 1)

### Freemium tiers

| Feature | Free | Standard (€9.99/mo) | Premium (€19.99/mo) |
|---|---|---|---|
| Post activities | ✓ | ✓ | ✓ |
| Browse feed | ✓ | ✓ | ✓ |
| Match requests per month | 3 | Unlimited | Unlimited |
| Activity requests received | Unlimited | Unlimited | Unlimited |
| Advanced filters (age, skill) | ✗ | ✓ | ✓ |
| Priority match surfacing | ✗ | ✗ | ✓ |
| Recurring activity posting | ✗ | ✓ | ✓ |
| Women-only filter | ✓ | ✓ | ✓ |

### Founding member offer (pre-launch)
- €49/year (~€4/month)
- All Standard features
- Founding member badge on profile
- Input into category roadmap

---

## 9. Brand & Design Principles

- **Tone:** Warm, confident, direct. Not cutesy. Not corporate.
- **Visual direction:** Warm editorial — film grain aesthetic, strong typography, intimate photography of real activities
- **Color palette:** To be defined — lean warm neutrals with one bold accent
- **Typography:** Serif for headings (feels editorial), sans-serif for UI (feels clean)
- **No friendship language anywhere** — companion, activity partner, co-explorer only
- **No social graph features** — no follower counts, no friend lists, no public connections
- **Post-activity prompt:** "How was the activity?" not "Add as friend?"
- **Chat expiry:** Conversations expire 48hrs after activity unless both users opt to keep open

---

## 10. Out of Scope for MVP

- AI-powered auto-matching (manual browse + request for MVP)
- Venue / brand partnerships
- Corporate wellness B2B tier
- Multi-language support (English first)
- Payment processing for ticketed events

---

## 11. Future Roadmap Signals

- Promote categories from other category tracker when count threshold is reached
- AI match scoring surfaced as "suggested companions" on activity detail screen
- Venue partnership API (Fever, Eventbrite) to pull live events into activity feed
- Corporate wellness tier for remote teams

---

## 12. Environment Variables Required

```
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN
VERIFF_API_KEY (or equivalent ID verification provider)
STRIPE_SECRET_KEY
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY
```

---

## 13. First Build Order (recommended)

1. [x] Expo project setup + navigation structure (Expo Router)
2. [x] Auth flow — signup (multi-step), login, landing screen (wired to Supabase Auth)
3. [x] Onboarding flow — profile creation, category preferences (wired to Supabase profiles)
4. [x] Post an activity flow (wired to Supabase with validation and submit)
5. [x] Home feed — browse, filter by category / neighborhood (wired to Supabase with mock fallback)
6. [x] Activity detail + match request (wired to Supabase with request-to-join flow)
7. [x] Match inbox — pending, confirmed, completed (wired to Supabase with accept/decline actions)
8. [x] Post-match chat — message bubbles, expiry notice, SOS (wired to Supabase Realtime)
9. [x] Post-activity review prompt (UI complete with Supabase service, navigable from match inbox)
10. [x] Freemium gating + Stripe integration
11. [x] Safety features (verification, SOS, block / report, check-in, women-only filter)
12. Admin category management screen
