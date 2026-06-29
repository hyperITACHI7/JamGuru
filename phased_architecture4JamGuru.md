# JamGuru — Phased Architecture

## Prototype Constraints

- Standalone web application — not integrated into Spotify.
- Song library sourced from the **Spotify Web API** (metadata only: titles, artists, album art, preview URLs). No music streaming.
- Real-time in-app events delivered via **Server-Sent Events (SSE)**. Web Push notifications sent for key events (new recommendations, likes, group activity) when the user is away from the app.
- No daily/weekly recommendation limits.
- No score decay.
- JamGuru score is strictly 1:1 (individual interactions only; group scores are isolated).
- Public profiles show the user's JamGuru-for count.

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | React (Vite) | Fast dev server, component model suits the inbox/feed UI |
| Styling | Tailwind CSS | Rapid prototyping, dark theme easy to achieve |
| Backend | Node.js + Express | Familiar, lightweight, good Spotify API library support |
| Database | PostgreSQL | Relational model fits users, friendships, recommendations, scores |
| ORM | Prisma | Type-safe queries, easy migrations |
| Auth | JWT (access + refresh tokens) | Stateless, works well for REST APIs |
| Spotify API | `spotify-web-api-node` | Official-community wrapper, handles token refresh |
| Real-time | Server-Sent Events (SSE) | Lightweight push for in-app events without WebSocket overhead |
| Push Notifications | Web Push API (VAPID) | Standard browser push for out-of-app notifications |
| AI | Provider-agnostic (Groq / OpenAI-compatible / Anthropic) | Configurable via env vars; no vendor lock-in |
| Tag Enrichment | Last.fm API | Genre and mood tags for song metadata |
| Hosting (dev) | localhost | Prototype only |

---

## Database Schema

### Core Tables

```
users
  id                    UUID PK
  username              TEXT UNIQUE
  display_name          TEXT
  avatar_url            TEXT
  bio                   TEXT
  spotify_id            TEXT               ← Spotify user ID after OAuth link
  spotify_access_token  TEXT
  spotify_refresh_token TEXT
  taste_genres          TEXT[]             ← AI-extracted genres
  taste_moods           TEXT[]             ← AI-extracted moods
  taste_eras            TEXT[]             ← AI-extracted eras
  taste_artists         TEXT[]             ← AI-extracted anchor artists
  created_at            TIMESTAMP

friendships
  id            UUID PK
  requester_id  UUID FK → users.id
  addressee_id  UUID FK → users.id
  status        ENUM('pending', 'accepted')
  created_at    TIMESTAMP
  UNIQUE (requester_id, addressee_id)

songs                          ← cached from Spotify API
  spotify_id    TEXT PK
  title         TEXT
  artist        TEXT
  album         TEXT
  album_art_url TEXT
  preview_url   TEXT           ← 30-second Spotify preview (optional playback)
  last_fm_tags  TEXT[]         ← genre/mood tags enriched from Last.fm
  cached_at     TIMESTAMP

song_likes                     ← user's personal liked songs (not recommendation likes)
  spotify_id    TEXT FK → songs.spotify_id
  user_id       UUID FK → users.id
  liked_at      TIMESTAMP
  PRIMARY KEY (spotify_id, user_id)

song_dislikes                  ← explicit dislikes; negative taste signal
  spotify_id    TEXT FK → songs.spotify_id
  user_id       UUID FK → users.id
  disliked_at   TIMESTAMP
  PRIMARY KEY (spotify_id, user_id)

playlists                      ← Spotify playlists imported by user
  id            UUID PK
  user_id       UUID FK → users.id
  spotify_id    TEXT
  name          TEXT
  cover_url     TEXT
  created_at    TIMESTAMP

playlist_songs
  playlist_id   UUID FK → playlists.id
  spotify_id    TEXT FK → songs.spotify_id
  position      INT
  PRIMARY KEY (playlist_id, spotify_id)

song_requests                  ← templated song requests between friends
  id            UUID PK
  sender_id     UUID FK → users.id
  recipient_id  UUID FK → users.id
  template_id   TEXT
  variables     JSONB
  rendered_text TEXT
  status        ENUM('open', 'fulfilled')
  created_at    TIMESTAMP

group_song_requests            ← templated requests broadcast to a group
  id            UUID PK
  sender_id     UUID FK → users.id
  group_id      UUID FK → groups.id
  template_id   TEXT
  variables     JSONB
  rendered_text TEXT
  status        ENUM('open', 'fulfilled')
  created_at    TIMESTAMP

recommendations
  id               UUID PK
  sender_id        UUID FK → users.id
  recipient_id     UUID FK → users.id   ← NULL if sent to a group
  group_id         UUID FK → groups.id  ← NULL if sent to an individual
  song_id          TEXT FK → songs.spotify_id
  context          TEXT               ← optional "why" message
  dismissed_at     TIMESTAMP          ← NULL unless soft-dismissed
  dismissed_by_id  UUID FK → users.id ← who dismissed (for group recs)
  pre_discovered   BOOLEAN DEFAULT false ← recipient had already liked/received this song
  request_id       UUID FK → song_requests       ← NULL if not fulfilling a request
  group_request_id UUID FK → group_song_requests ← NULL if not fulfilling a group request
  sent_at          TIMESTAMP

likes
  id                UUID PK
  recommendation_id UUID FK → recommendations.id
  liker_id          UUID FK → users.id
  liked_at          TIMESTAMP
  UNIQUE (recommendation_id, liker_id)

like_feedback                  ← optional tags on a like
  id      UUID PK
  like_id UUID FK → likes.id
  tag     TEXT             ← e.g. "Great vocals", "Gym song", "Nostalgic"

groups
  id              UUID PK
  name            TEXT
  description     TEXT
  is_public       BOOLEAN DEFAULT false
  created_by      UUID FK → users.id
  taste_genres    TEXT[]
  taste_moods     TEXT[]
  taste_eras      TEXT[]
  taste_artists   TEXT[]
  taste_updated_at TIMESTAMP
  created_at      TIMESTAMP

group_members
  group_id  UUID FK → groups.id
  user_id   UUID FK → users.id
  joined_at TIMESTAMP
  PRIMARY KEY (group_id, user_id)

daily_scores
  id             UUID PK
  user_id        UUID FK → users.id
  score_date     DATE
  likes_received INT
  recs_sent      INT
  daily_score    DECIMAL(6,4)    ← likes_received / recs_sent
  UNIQUE (user_id, score_date)

monthly_scores
  id            UUID PK
  user_id       UUID FK → users.id
  month         DATE             ← first day of the month
  monthly_score DECIMAL(10,4)   ← sum of daily_scores for that month
  UNIQUE (user_id, month)

personal_trust_rankings          ← per-user, per-friend score
  id           UUID PK
  owner_id     UUID FK → users.id   ← "whose perspective"
  friend_id    UUID FK → users.id   ← "being evaluated"
  month        DATE
  likes_given  INT                  ← likes owner gave to friend's recs
  recs_received INT                 ← recs friend sent to owner
  trust_score  DECIMAL(10,4)
  UNIQUE (owner_id, friend_id, month)

group_scores                     ← group-level daily engagement
  id             UUID PK
  group_id       UUID FK → groups.id
  score_date     DATE
  likes_received INT
  recs_sent      INT
  group_size     INT
  daily_score    DECIMAL(6,4)
  UNIQUE (group_id, score_date)

push_subscriptions               ← Web Push API endpoint registrations
  id         UUID PK
  user_id    UUID FK → users.id
  endpoint   TEXT
  p256dh     TEXT
  auth       TEXT
  created_at TIMESTAMP
```

> **Key design note:** `personal_trust_rankings` is computed per `(owner, friend)` pair. There is no global ranking table. Rahul's trust score for Arpit is stored separately from Sarah's trust score for Arpit. They never share a row.

---

## Phase 1 — Foundation & Auth

**Goal:** Users can register, log in, and view a basic profile.

### Tasks

1. **Project setup**
   - Initialize Node.js/Express backend with Prisma.
   - Initialize React + Vite frontend.
   - Configure PostgreSQL database and run initial migrations.
   - Set up `.env` for secrets (JWT secret, DB URL, Spotify credentials, AI provider keys).

2. **Auth endpoints**
   - `POST /api/auth/register` — create user, hash password (bcrypt), return JWT.
   - `POST /api/auth/login` — validate credentials, return JWT.
   - `GET /api/auth/me` — return current user from JWT.

3. **User profile**
   - `GET /api/users/:username` — public profile.
   - `PATCH /api/users/me` — update display name, bio, avatar.
   - Public profile page in React: shows display name, bio, JamGuru-for count (starts at 0).

4. **Protected route middleware**
   - JWT verification middleware applied to all non-auth routes.

**Deliverable:** Register → log in → view own profile page.

---

## Phase 2 — Song Library, Spotify Integration & Home

**Goal:** Users can search and browse real songs. Spotify account is linked for liked songs and playlist import. Home page provides a personalized landing experience.

### Spotify API Setup

1. Register app at [developer.spotify.com](https://developer.spotify.com/dashboard).
2. Use **Client Credentials flow** for catalog search (public, no user auth required).
3. Use **Authorization Code flow** for user-specific data (liked songs, playlists).
4. Store `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` in `.env`.
5. Auto-refresh both app token and per-user tokens before expiry.

### Tasks

1. **Spotify service module** (`/server/services/spotify.js`)
   - Authenticate with Client Credentials.
   - `searchTracks(query)` — returns array of `{ spotify_id, title, artist, album, album_art_url, preview_url }`.
   - `getTrack(spotify_id)` — fetch single track details.
   - `getNewReleases()` — fetch 20 new releases to preload the catalog.

2. **Song caching**
   - On search or share, write song metadata to `songs` table if not already cached.
   - Cache invalidates after 7 days (`cached_at`).
   - After caching, trigger background Last.fm enrichment to populate `last_fm_tags`.

3. **Catalog API endpoints**
   - `GET /api/songs/search?q=...` — proxies Spotify search, caches results.
   - `GET /api/songs/:spotify_id` — returns cached song or fetches from Spotify.
   - `GET /api/songs/browse/new-releases` — preloaded browseable catalog.
   - `GET /api/songs/:spotify_id/friend-matches` — ranks the current user's friends by taste compatibility with this song (AI Predict).

4. **Spotify OAuth (user account linking)**
   - `GET /api/auth/spotify` — redirect to Spotify authorization page.
   - `GET /api/auth/spotify/callback` — handle code exchange, store `spotify_access_token` and `spotify_refresh_token` on the user record.
   - `POST /api/auth/spotify/sync-liked` — import user's Spotify liked songs into `song_likes` table.
   - `POST /api/auth/spotify/import-playlist` — accept a Spotify playlist URL, resolve it via Spotify API, save to `playlists` + `playlist_songs` tables.
   - `GET /api/playlists` — list user's imported playlists.
   - `GET /api/playlists/:id` — playlist detail with song list.

5. **Personal Library (song likes/dislikes)**
   - `POST /api/songs/:id/like` — add to `song_likes`.
   - `DELETE /api/songs/:id/like` — remove from `song_likes`.
   - `POST /api/songs/:id/dislike` — add to `song_dislikes`.
   - `DELETE /api/songs/:id/dislike` — undo dislike.
   - `GET /api/songs/liked` — list all liked songs for current user.

6. **Frontend: Song Search UI**
   - Search bar with debounced input (300ms).
   - Results show album art thumbnail, song title, artist name.
   - Clicking a song opens a "Share" panel (built in Phase 3).

7. **Frontend: Library page**
   - "Liked Songs" collection entry point.
   - Imported playlists list with cover art, name, song count.
   - "Import playlist" button with "Shapes your taste profile" subtitle.

8. **Frontend: Home page**
   - Greeting banner personalized to user name.
   - "Quick Picks" row — recently popular or recently released songs.
   - "Picked For You" section — 3 AI-generated daily personalized picks (Phase 7 powers this; placeholder shown until AI is integrated).
   - Top Charts, Trending Now, Popular Picks carousels.
   - 14 music category tiles for browse (e.g., Hip Hop, Rock, Electronic, Jazz, etc.).

**Deliverable:** User can search for any real song, link their Spotify account, sync liked songs, import playlists, and browse the home page. Song library is cached locally with Last.fm tag enrichment running in background.

---

## Phase 3 — Friends, Discovery Inbox & Conversation Threads

**Goal:** Users can add friends and send song recommendations with context. A real-time inbox and per-friend conversation view form the core social experience. Song requests let users pull recommendations from friends.

### Tasks

1. **Friend system**
   - `POST /api/friends/request/:userId` — send friend request.
   - `POST /api/friends/accept/:userId` — accept request.
   - `GET /api/friends` — list accepted friends.
   - `GET /api/friends/requests` — list pending incoming requests.
   - Frontend: "Add Friend" by username search, pending requests list, friends list.

2. **Sending a recommendation**
   - User selects a song from search results → "Share" panel opens.
   - Panel shows a multi-select friend picker with checkboxes (share to multiple friends in one action) and a group picker tab.
   - Optional context text input appears after song is selected — not a general text field.
   - "AI Predict" button in the panel ranks friends by taste compatibility with the selected song.
   - `POST /api/recommendations` — body: `{ song_id, recipient_ids[], context }` for multi-friend or `{ song_id, group_id, context }` for groups.
   - On creation: check if recipient already has this song liked/received → set `pre_discovered = true` if so. Increment sender's `recs_sent` for today in `daily_scores`.

3. **Discovery Inbox**
   - `GET /api/inbox` — returns all recommendations received by the current user, excluding dismissed and disliked, sorted by `sent_at` desc.
   - Each inbox item contains: sender info, song metadata, context text, like status, like count.
   - Frontend: Inbox page with two visual sections:
     - **JamGuru card** (pinned at top) — shows current JamGuru name + discovery count.
     - **Discovery Messages** — list of recommendation cards, sortable by Latest or Score.

4. **Recommendation card UI**
   - Album art on the left.
   - Song title + artist.
   - Sender name + context message.
   - Play preview button (uses Spotify `preview_url` in an `<audio>` tag).
   - Like button. Dismiss button. Dislike button.
   - Feedback tags appear after liking.

5. **Dismiss & Dislike**
   - `POST /api/recommendations/:id/dismiss` — set `dismissed_at`; item disappears from default inbox.
   - `DELETE /api/recommendations/:id/dismiss` — undo dismiss.
   - `POST /api/recommendations/:id/dislike` — marks disliked; records negative taste signal; item removed from inbox.
   - `DELETE /api/recommendations/:id/dislike` — undo dislike.

6. **Conversation view**
   - `GET /api/recommendations/conversation/:friendId` — chronological history of all recommendations exchanged with a specific friend (both directions).
   - Frontend: chat-bubble layout showing sent vs. received items; song request cards appear inline with a "Pick a song" CTA when unfulfilled.

7. **Song Requests**
   - `POST /api/song-requests` — send a templated request to a friend; body: `{ recipientId, templateId, variables }`.
   - Frontend: 6 request templates with tag pickers for filling placeholders.
   - The request appears in the recipient's conversation view with a reply picker (AI Suggestions, Library, Spotify Search).
   - `PATCH /api/song-requests/:id/fulfill` — mark request as fulfilled when a song is picked and sent.

8. **Real-time SSE**
   - `GET /api/events?token=...` — SSE endpoint; client subscribes on login.
   - Events: `new_dm_rec` (new recommendation received), `new_dm_req` (new song request received), `ping` (keepalive every 25s).
   - Frontend: event listener updates inbox badge count and conversation view in real time without polling.

9. **Pre-discovered flag handling**
   - In the inbox, recommendations where `pre_discovered = true` are shown as visually distinct (dimmed/disabled) so users can focus on genuine discoveries.

**Deliverable:** User can send a song to multiple friends with context. Friends see it in their inbox in real time. Conversation view shows full shared history. Song requests let users pull songs from friends.

---

## Phase 4 — Likes, Feedback Tags & Scoring Engine

**Goal:** Likes trigger score updates. Personal trust rankings are computed. JamGuru is determined.

### Tasks

1. **Like endpoint**
   - `POST /api/recommendations/:id/like` — insert into `likes` table.
   - On like:
     - Identify the sender of the recommendation.
     - Increment today's `likes_received` in `daily_scores` for the sender.
     - Recalculate sender's `daily_score` for today: `likes_received / recs_sent`.
     - Add today's delta to sender's `monthly_scores`.
     - Update `personal_trust_rankings` for the liker (owner) → sender (friend) pair:
       - Increment `likes_given`.
       - Recalculate `trust_score = likes_given / recs_received`.
     - Determine new JamGuru for the liker: friend with highest `trust_score` this month.
   - `DELETE /api/recommendations/:id/like` — unlike (reverses all the above).

2. **Feedback tags**
   - After liking, a row of tag chips appears on the recommendation card.
   - Tags: "Great vocals", "Gym song", "Nostalgic", "Amazing lyrics", "Road trip vibe", "Late night", "Happy vibes".
   - User can select multiple (or none).
   - `POST /api/likes/:id/feedback` — body: `{ tags: ["Gym song", "Nostalgic"] }` → inserts into `like_feedback`.

3. **JamGuru API**
   - `GET /api/jamguru/mine` — returns current user's JamGuru for this month: `{ user: {...}, discovery_count: N }`.
   - `GET /api/jamguru/count` — returns how many people the current user is JamGuru for (used on public profile).
   - `GET /api/trust-rankings` — returns current user's full personal trust ranking list (all friends, sorted by trust_score desc). Used internally; not surfaced as a public leaderboard.

4. **Inbox JamGuru card** (wired up)
   - Calls `GET /api/jamguru/mine` on inbox load.
   - Renders the pinned JamGuru card with name, avatar, and discovery count.
   - Empty state if no friends have sent recommendations yet.
   - Updates in real time when a `jam:like` event fires.

5. **Score recalculation job**
   - A lightweight cron that runs at midnight: recalculates any scores from the day that may have drifted (edge case handling only — real-time updates handle the common path).

**Deliverable:** Liking a song updates scores instantly. Each user's private trust ranking updates. JamGuru card in the inbox reflects the correct person.

---

## Phase 5 — Groups, Group Requests & Push Notifications

**Goal:** Users can create groups, share songs to a group, groups have isolated scoring and taste profiles, and push notifications reach users outside the app.

### Tasks

1. **Group management**
   - `POST /api/groups` — create group with name, description, privacy setting, and invite members by user ID.
   - `PATCH /api/groups/:id` — edit name, description, or privacy.
   - `POST /api/groups/:id/members` — add a member.
   - `DELETE /api/groups/:id/members/:userId` — remove a member.
   - `GET /api/groups` — list groups the current user belongs to.
   - `GET /api/groups/:id` — group detail + member list.
   - `GET /api/groups/search?q=...` — search public groups to join.
   - `POST /api/groups/:id/join` — self-join a public group.

2. **Group recommendations**
   - Sharing flow: friend picker replaced by group picker tab.
   - Recommendations sent to a group have `group_id` set and `recipient_id` NULL.
   - All group members see the recommendation in a shared **Group Conversation View**.

3. **Group feed**
   - `GET /api/groups/:id/feed` — all recommendations sent to this group, sorted by latest.
   - Any group member can like a group recommendation.
   - Likes on group recommendations do NOT update personal trust rankings or personal JamGuru scores.

4. **Group scoring**
   - `GET /api/groups/:id/score` — returns the group's current daily and monthly score.
   - Formula: `Group Daily Score = Likes Received Today / (Group Recs Sent Today × Group Size)`.
   - Stored in `group_scores` table (separate from `daily_scores`).
   - Group score is only shown within the group view — no cross-group comparison.

5. **Group taste profile**
   - `PUT /api/groups/:id/taste` — manually set group taste (genres, moods, artists, eras).
   - `POST /api/groups/:id/taste/generate` — AI generates the group taste profile from member interactions and group feed history.
   - Stored as `taste_genres/moods/artists/eras` on the `groups` table.
   - Used by AI Suggest within the group context (Phase 7).

6. **Group Song Requests**
   - `POST /api/groups/:id/requests` — send a templated request to the entire group; any member can fulfill it.
   - Stored in `group_song_requests`; appears in the Group Conversation View with a "Pick a song" CTA for all members.

7. **Web Push Notifications**
   - `GET /api/notifications/vapid-key` — return the server's public VAPID key.
   - `POST /api/notifications/subscribe` — register a browser push subscription (endpoint + p256dh + auth keys) in `push_subscriptions`.
   - `DELETE /api/notifications/subscribe` — unsubscribe.
   - `pushNotifier.js` service sends Web Push payloads on: new DM recommendation, new group recommendation, recommendation liked, song request received.

8. **Frontend: Group pages**
   - Group list view with search and join for public groups.
   - Group creation form with name, description, privacy toggle.
   - Group detail: member list, group feed/conversation view, group score widget, AI Suggest button.
   - Group request flow in conversation view.

**Deliverable:** Users can create groups, search and join public groups, share songs inside them, request songs from the group, and receive push notifications when away from the app.

---

## Phase 6 — Public Profiles, Monthly Reset & Personal Library

**Goal:** Public profiles show JamGuru-for count. Monthly reset recalculates everything cleanly. Taste profile is visible and editable. Library is fully usable.

### Tasks

1. **Public profile page**
   - Displays: avatar, display name, bio.
   - **JamGuru For:** count (e.g., "JamGuru for 12 listeners") — visible to all.
   - Does NOT show: who those listeners are, personal trust score, ranking on anyone's list.

2. **Monthly reset job**
   - Runs on the 1st of each month at 00:00.
   - Archives the previous month's `monthly_scores` and `personal_trust_rankings`.
   - Creates fresh rows for the new month with zero values.
   - Recalculates JamGuru for all users based on the new (empty) month — most users will have no JamGuru at the start of the month until recommendations and likes accumulate.
   - JamGuru-for count on public profiles is based on the current month.

3. **Inbox sort: by Score**
   - When user sorts inbox by "Recommendation Score", items are ordered by the sender's current monthly score (higher score = more trusted recommender = shown first).

4. **Taste Profile page**
   - `GET /api/profile/taste` — return current user's taste profile (genres, moods, artists, eras; pinned vs. AI-discovered).
   - `PATCH /api/profile/taste` — update taste manually (add/remove/pin tags).
   - `POST /api/profile/taste/refresh` — trigger AI regeneration of taste profile from Spotify liked songs and playlist history.
   - Frontend: taste profile page shows chips split into "Pinned" and "AI-Discovered" sections; refresh button; ability to promote AI-discovered tags to pinned or dismiss them.

5. **Library pages (full)**
   - Liked Songs page: all songs in `song_likes`, with play preview and unlike button.
   - Playlist detail page: playlist cover, name, song list.
   - Import Playlist page: paste Spotify URL → preview playlist → confirm import.

**Deliverable:** Public profile shows JamGuru-for count. At month start, scores reset and the system starts fresh. Users can view, edit, and AI-refresh their taste profile. Library is fully navigable.

---

## Phase 7 — AI: Suggest, Predict, Personalize & Request Fulfillment

**Goal:** AI assists at every discovery touchpoint — suggesting songs for friends, personalizing the home feed, matching songs to requests, and predicting which friends will love a given song.

### Infrastructure

**Provider-agnostic AI wrapper (`services/ai.js`)**
- `callAI(prompt)` routes to the configured provider: Groq, any OpenAI-compatible endpoint, or Anthropic Claude.
- Provider, model, API key, and base URL are all configured via env vars (`AI_PROVIDER`, `AI_MODEL`, `AI_API_KEY`, `AI_BASE_URL`).
- No vendor lock-in: switching providers requires only env var changes.

**Last.fm tag enrichment (`services/lastfm.js`)**
- `enrichSongTags(spotifyId, title, artist)` — fetches genre/mood tags from Last.fm and writes them to `songs.last_fm_tags`.
- Called asynchronously for every newly cached song. Does not block any user-facing request.
- Tags feed into AI prompt context for all suggestion features.

**Taste Profile AI service (`services/tasteProfile.js`)**
- `generateTasteProfile(userId)` — analyzes user's liked songs and imported playlist contents, calls AI to extract genres, moods, eras, and artists, writes results back to `users` table.
- Called by `POST /api/profile/taste/refresh`. Also called on first Spotify sync if no taste profile exists.

### 7a. Library-First AI Suggestion (DMs)

**Endpoint:** `POST /api/ai/suggest/:friendId`

**Flow:**
1. Fetch the sender's liked songs and playlist songs from DB.
2. Fetch the friend's taste profile (genres, moods, artists, eras).
3. **Library pass**: score each song in the sender's library against the friend's taste profile. If any song exceeds the confidence threshold and hasn't already been seen this session, return it immediately.
4. **Fallback**: if no library match, call AI with the friend's taste profile, mutual recommendation history, and a NEVER list of already-suggested songs to generate a new title/artist. Look up the result on Spotify. Return the matched song.

**Session deduplication:**
- Client maintains a `Set<spotifyId>` of seen suggestions in component state (resets on unmount).
- Each call sends `{ excludeSpotifyIds: [...seenIds] }` in the request body.
- Backend excludes these from the library pool and adds their titles to the AI prompt's NEVER list.

**Refresh UX:**
- The suggested song card stays visible while a new suggestion loads — no disappear/reappear flash.
- The refresh button shows a spin animation while the request is in flight.

### 7b. AI Suggest for Groups

**Endpoint:** `POST /api/ai/suggest/group/:groupId`

Same library-first flow as DMs, but using the group's collective taste profile instead of a single friend's profile. Falls back to AI generation informed by recent group feed history if no library match is found.

### 7c. AI-Powered Request Fulfillment

**Ranking endpoint:** `POST /api/ai/rank-for-request` / `POST /api/ai/rank-for-group-request`
- Accepts the request's rendered text and the responder's library.
- Returns library songs sorted by AI-assessed relevance to the request.

**Suggestion endpoint:** `POST /api/ai/suggest-for-request` / `POST /api/ai/suggest-for-group-request`
- Accepts the request's rendered text.
- Returns up to 3 AI-generated song suggestions (title + artist) matched against Spotify.

**Reply picker (frontend):**
- Three sections: AI Suggestions (external), Library (ranked), Search.
- AI Suggestions and Library results are merged and deduplicated before display.

### 7d. AI Predict (Friend-Song Matching)

**Endpoint:** `GET /api/songs/:spotifyId/friend-matches`

- For the given song, fetch its `last_fm_tags` and other metadata.
- Compare against each friend's taste profile.
- Return friends sorted by compatibility score.
- Used in the Share Panel to highlight top-match friends; others remain selectable.

### 7e. Personalized Home ("Picked For You")

**Endpoint:** `POST /api/ai/suggest/me`

- Fetch the current user's taste profile and a sample of recent liked songs.
- Pick a random "discovery angle" from a rotating set (adjacent genre, familiar artist deep cut, matching mood, etc.).
- Call AI to generate 3 song suggestions matching that angle.
- Look each up on Spotify and return.
- Frontend caches results in `localStorage` keyed by taste profile version; invalidated when the taste profile is refreshed.

### Phase 7 API Summary

| Endpoint | Purpose |
|---|---|
| `POST /api/ai/suggest/:friendId` | Library-first song suggestion for a DM friend |
| `POST /api/ai/suggest/group/:groupId` | Library-first song suggestion for a group |
| `POST /api/ai/suggest/me` | Personalized home picks ("Picked For You") |
| `GET /api/songs/:spotifyId/friend-matches` | Rank friends by taste compatibility for a song |
| `POST /api/ai/rank-for-request` | Rank library songs against a friend request |
| `POST /api/ai/rank-for-group-request` | Rank library songs against a group request |
| `POST /api/ai/suggest-for-request` | Generate song suggestions matching a friend request |
| `POST /api/ai/suggest-for-group-request` | Generate song suggestions matching a group request |
| `POST /api/profile/taste/refresh` | AI-regenerate taste profile from Spotify library |
| `POST /api/groups/:id/taste/generate` | AI-generate group taste profile |

**Deliverable:** AI assists at every discovery touchpoint. Suggestions are library-first (no unnecessary API calls), session-deduplicated, group-aware, and request-aware. The home page is personalized. Friend matching makes sharing intentional.

---

## Phase Summary

| Phase | What Gets Built | Key Output |
|---|---|---|
| 1 | Auth, user profiles | Register → log in → profile page |
| 2 | Spotify API + OAuth, song search, liked songs sync, playlist import, home page, library | Real song metadata; personal library; personalized home |
| 3 | Friends, Discovery Inbox, conversation threads, song requests, dismiss/dislike, SSE | Share with context; real-time inbox; full conversation history; song requests |
| 4 | Likes, feedback tags, scoring engine, JamGuru | Trust rankings update live; JamGuru card shows correct person |
| 5 | Groups, group taste profiles, group requests, push notifications | Group recommendations isolated from personal scores; push alerts |
| 6 | Public profiles, monthly reset, taste profile page, full library | JamGuru-for count on profile; monthly season restarts; taste profile editable |
| 7 | AI suggestion (DMs, groups), AI Predict, Picked For You, request fulfillment AI | AI at every discovery touchpoint; library-first; session-deduplicated |

---

## File Structure

```
JamGuru/
├── server/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── songs.js
│   │   ├── spotifyAuth.js
│   │   ├── playlists.js
│   │   ├── songRequests.js
│   │   ├── tasteProfile.js
│   │   ├── notifications.js
│   │   ├── phase3/
│   │   │   ├── friends.js
│   │   │   └── recommendations.js
│   │   ├── phase4/
│   │   │   ├── likes.js
│   │   │   └── jamguru.js
│   │   ├── phase5/
│   │   │   └── groups.js
│   │   ├── phase6/
│   │   │   └── reset.js
│   │   └── phase7/
│   │       └── ai.js
│   ├── services/
│   │   ├── spotify.js
│   │   ├── spotifyAuth.js
│   │   ├── lastfm.js
│   │   ├── ai.js
│   │   ├── tasteProfile.js
│   │   ├── pushNotifier.js
│   │   ├── phase4/
│   │   │   └── scoring.js
│   │   └── phase5/
│   │       └── groupScoring.js
│   ├── middleware/
│   │   └── auth.js
│   └── index.js
├── client/
│   └── src/
│       ├── pages/
│       │   ├── Home.jsx
│       │   ├── Search.jsx
│       │   ├── JamGuru.jsx
│       │   ├── Library.jsx
│       │   ├── LikedSongs.jsx
│       │   ├── ImportPlaylist.jsx
│       │   ├── PlaylistDetail.jsx
│       │   ├── ConversationView.jsx
│       │   ├── GroupConversationView.jsx
│       │   ├── Friends.jsx
│       │   ├── Groups.jsx
│       │   ├── GroupDetail.jsx
│       │   ├── Profile.jsx
│       │   ├── Login.jsx
│       │   ├── Register.jsx
│       │   └── SpotifyCallback.jsx
│       ├── phase3/
│       │   ├── components/  ← SharePanel, RecommendationCard, SongSearch, etc.
│       │   └── api/
│       ├── phase4/
│       │   ├── components/  ← JamGuruCard, FeedbackTags, etc.
│       │   └── api/
│       ├── phase5/
│       │   ├── components/  ← GroupCard, GroupScoreWidget, etc.
│       │   └── api/
│       ├── phase7/
│       │   ├── components/  ← AiSuggestButton, ReplyPicker, etc.
│       │   └── api/
│       ├── components/
│       │   └── layout/
│       │       ├── TopBar.jsx
│       │       ├── Sidebar.jsx
│       │       └── NowPlayingBar.jsx
│       ├── context/
│       │   └── PlayerContext.jsx
│       ├── api/
│       │   └── axios.js     ← base axios instance with JWT interceptor
│       └── App.jsx
├── problem-statement.md
└── phased_architecture4JamGuru.md
```

---

## Open Questions — Resolved

| Question | Decision |
|---|---|
| Spam prevention cap | No cap. Scoring formula naturally penalizes low-quality spam. |
| Cold start (few friends) | Implement both: contacts import + in-app "find friends" by username search. |
| Device notifications | SSE for real-time in-app events. Web Push API for background notifications when the user is away from the app. |
| Score decay | No decay. Monthly reset handles freshness. |
| JamGuru-for count visibility | Yes — shown on public profile. |
| Group scores affecting JamGuru | No. JamGuru score is 1:1 only. Group scores are fully isolated. |
| Dislike impact on sender | Dislikes are personal taste signals only and do not affect the sender's discovery score or JamGuru standing. |
| AI provider choice | Provider-agnostic wrapper supports Groq, OpenAI-compatible endpoints, or Anthropic Claude — switchable via env vars. |
| Request format | Structured templates with tag pickers rather than free text, for lower friction and better AI input quality. |
