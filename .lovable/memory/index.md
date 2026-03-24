Aletheia Arena — competitive mathematics platform with dark academic theme

## Design System
- Background: hsl(228 40% 6%) — midnight blue-black (#0B0F19)
- Surface/cards: hsl(228 35% 9%) — #131829
- Text: hsl(213 31% 95%) — stark white #F1F5F9
- Gold accent (primary): hsl(42 55% 58%) — #D4A853
- Bronze accent: hsl(30 59% 50%) — #CD7F32
- Fonts: Inter (body), Cinzel (headings/display)

## Architecture
- Google OAuth only via Lovable Cloud managed auth
- Roles stored in separate `user_roles` table (admin/moderator/competitor)
- Problems stored as images in `problem_images` storage bucket
- Elo engine via PostgreSQL function `calculate_elo_changes()`
- Anti-cheat: fullscreen lock, visibility API, clipboard/devtools block
- Images: draggable=false, pointer-events:none, onContextMenu blocked
- tournament_type enum: tournament/olympiad/jee
- tournament_participants table for registration tracking
- moderator_permissions table for granular permission control

## Key Routes
- / = The Arena (tabs: Tournaments/Olympiads/JEE)
- /leaderboard = Global ranked table
- /profile = Competitor profile with Elo chart + past competitions
- /tournament/:id = Anti-cheat tournament interface
- /results/:id = Post-tournament results with podium + solutions
- /past = Completed competitions archive
- /discussions = Public discussion forum
- /admin = Command Center (Problem Forge, Question Bank, Tournaments, Users, Discussions)
