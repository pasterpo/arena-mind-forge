
# Aletheia Arena — Complete Implementation Plan

## Phase 1: Database Schema & Auth

### Supabase Cloud Setup
- Enable Lovable Cloud with Google OAuth authentication
- Create storage bucket `problem_images` (public)

### Database Tables
1. **profiles** — id (UUID, FK to auth.users), email, username, elo_rating (default 1200), global_rank, penalty_strikes (default 0), account_status (active/suspended), created_at
2. **user_roles** — id, user_id (FK), role (enum: admin/moderator/competitor), unique(user_id, role)
3. **question_bank** — id, created_by (FK), problem_image_url (varchar), correct_answer (text), answer_type (enum: text/multiple_choice), multiple_choice_options (jsonb, nullable), difficulty_weight (1-10), category (enum: Number Theory/Algebra/Combinatorics/Geometry), visibility (draft/published), created_at
4. **tournaments** — id, title, description, start_timestamp (timestamptz), end_timestamp (timestamptz), status (upcoming/active/completed), time_limit_minutes, allowed_roles (text[]), created_at
5. **tournament_questions** — id, tournament_id (FK), question_id (FK), question_order (int)
6. **submissions** — id, user_id (FK), tournament_id (FK), question_id (FK), submitted_answer (text), timestamp, time_taken_seconds, is_correct (boolean)
7. **penalty_logs** — id, user_id (FK), tournament_id (FK), penalty_type (enum: fullscreen_exit/tab_switch/devtools), created_at

### RLS Policies
- Competitors can only read their own profile and submissions
- Admins/moderators can manage question_bank, tournaments, and view all users
- `has_role()` security definer function to prevent recursive RLS
- Submissions: is_correct hidden from users until tournament end_timestamp passes

### Database Functions
- `calculate_elo_changes(tournament_id)` — PG function that runs post-tournament to compute Elo adjustments based on difficulty weight and participant average Elo
- `update_global_ranks()` — recomputes global_rank based on elo_rating ordering
- Auto-create profile trigger on user signup with default competitor role

## Phase 2: Design System & Layout

### Theme — Dark Academic/Prestige
- Background: `#0B0F19` (midnight blue-black)
- Surface/cards: `#131829` with subtle borders
- Text: stark white `#F1F5F9`
- Gold accents: `#D4A853` for ranks, badges, highlights
- Bronze: `#CD7F32` for secondary accents
- Font: Inter or similar clean sans-serif

### App Shell
- Top navigation bar with logo, nav links, user avatar/dropdown
- Routes: `/` (Arena/Home), `/leaderboard`, `/profile`, `/tournament/:id`, `/admin`

## Phase 3: Admin Command Center (`/admin`)

Protected route — only accessible to admin/moderator roles.

### Problem Forge Tab
- Drag-and-drop image uploader → uploads to `problem_images` bucket
- Image preview after upload
- Fields: correct_answer, answer_type (text input or multiple choice), difficulty_weight slider (1-10), category dropdown, visibility toggle
- If multiple choice: dynamic fields to add 4 options (A/B/C/D)
- List view of all questions with edit/delete

### Tournament Control Panel Tab
- Create tournament form: title, description, UTC start/end datetime pickers, time limit
- Question selector: checklist of published questions from question_bank with search/filter by category and difficulty
- Tournament list with status indicators

### User Management Tab
- Table of all users with: username, email, Elo, role, status, penalty strikes
- Actions: promote to moderator, adjust Elo manually, ban/suspend user

## Phase 4: Competitor Experience

### The Arena (Home Page)
- Active tournament cards with live countdown timers
- Upcoming tournaments section
- "Enter Tournament" button (available when tournament is active)

### Tournament Interface (Full Anti-Cheat Mode)
- On entry: request Browser Fullscreen API
- Question display: `<img>` tag with `draggable="false"`, `pointer-events: none` CSS, `onContextMenu` blocked
- Randomized question order per user (shuffled on entry)
- Answer input: text field or radio buttons (A/B/C/D) based on answer_type
- Timer synced to tournament end_timestamp (server time via Supabase)
- Anti-cheat listeners: disable right-click, Ctrl+C/V, F12, Ctrl+Shift+I, text selection
- Fullscreen exit detection: warning modal → 2 strikes = auto-submit + lockout
- Tab visibility API: silent penalty_strike logging
- Submission feedback: only "Answer Recorded" — no correct/incorrect indication
- Auto-submit all answers at end_timestamp

### Global Leaderboard
- Real-time ranked table by Elo rating
- Tier badges: Grandmaster (2400+), Master (2000+), Expert (1600+), Apprentice (<1600)
- Search/filter by username

### Competitor Profile
- Current Elo rating with tier badge
- Elo history line chart (using Recharts)
- Past tournament results (locked solutions revealed only after tournament ends)
- Penalty strike count

## Phase 5: Elo Rating Engine (Database Functions)

- Standard Elo formula adapted for competitive math:
  - Expected score based on participant's Elo vs tournament average Elo
  - K-factor adjusted by difficulty_weight of each problem
  - Gain more for solving hard problems (weight 9-10), lose more for missing easy ones (weight 1-3)
- Triggered manually by admin or automatically when tournament status → completed
- Updates elo_rating on profiles and recalculates global_rank
