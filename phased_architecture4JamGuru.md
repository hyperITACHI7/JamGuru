# JamGuru — Phased Architecture

## Prototype Constraints

- Standalone web application — not integrated into Spotify.
- Song library sourced from the **Spotify Web API** (metadata only: titles, artists, album art, preview URLs). No music streaming.
- No device push notifications.
- No daily/weekly recommendation caps.
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
| Hosting (dev) | localhost | Prototype only |

---

## Database Schema

### Core Tables

```
users
  id            UUID PK
  username      TEXT UNIQUE
  display_name  TEXT
  avatar_url    TEXT
  bio           TEXT
  created_at    TIMESTAMP

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
  cached_at     TIMESTAMP

recommendations
  id            UUID PK
  sender_id     UUID FK → users.id
  recipient_id  UUID FK → users.id   ← NULL if sent to a group
  group_id      UUID FK → groups.id  ← NULL if sent to an individual
  song_id       TEXT FK → songs.spotify_id
  context       TEXT               ← optional "why" message
  sent_at       TIMESTAMP

likes
  id            UUID PK
  recommendation_id  UUID FK → recommendations.id
  liker_id      UUID FK → users.id
  liked_at      TIMESTAMP
  UNIQUE (recommendation_id, liker_id)

like_feedback                  ← optional tags on a like
  id            UUID PK
  like_id       UUID FK → likes.id
  tag           TEXT             ← e.g. "Great vocals", "Gym song", "Nostalgic"

groups
  id            UUID PK
  name          TEXT
  created_by    UUID FK → users.id
  created_at    TIMESTAMP

group_members
  group_id      UUID FK → groups.id
  user_id       UUID FK → users.id
  joined_at     TIMESTAMP
  PRIMARY KEY (group_id, user_id)

daily_scores
  id            UUID PK
  user_id       UUID FK → users.id
  score_date    DATE
  likes_received INT
  recs_sent     INT
  daily_score   DECIMAL(6,4)    ← likes_received / recs_sent
  UNIQUE (user_id, score_date)

monthly_scores
  id            UUID PK
  user_id       UUID FK → users.id
  month         DATE             ← first day of the month
  monthly_score DECIMAL(10,4)   ← sum of daily_scores for that month
  UNIQUE (user_id, month)

personal_trust_rankings          ← per-user, per-friend score
  id              UUID PK
  owner_id        UUID FK → users.id   ← "whose perspective"
  friend_id       UUID FK → users.id   ← "being evaluated"
  month           DATE
  likes_given     INT                  ← likes owner gave to friend's recs
  recs_received   INT                  ← recs friend sent to owner
  trust_score     DECIMAL(10,4)
  UNIQUE (owner_id, friend_id, month)
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
   - Set up `.env` for secrets (JWT secret, DB URL, Spotify credentials).

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

## Phase 2 — Song Library via Spotify API

**Goal:** Users can search and browse real songs. Song metadata is cached locally.

### Spotify API Setup

1. Register app at [developer.spotify.com](https://developer.spotify.com/dashboard).
2. Use **Client Credentials flow** (no user OAuth required — catalog access is public).
3. Store `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` in `.env`.
4. Auto-refresh the app token before expiry (token TTL = 3600s).

### Tasks

1. **Spotify service module** (`/server/services/spotify.js`)
   - Authenticate with Client Credentials.
   - `searchTracks(query)` — returns array of `{ spotify_id, title, artist, album, album_art_url, preview_url }`.
   - `getTrack(spotify_id)` — fetch single track details.
   - `getNewReleases()` — fetch 20 new releases to preload the catalog.

2. **Song caching**
   - On search or share, write song metadata to `songs` table if not already cached.
   - Cache invalidates after 7 days (`cached_at`).

3. **API endpoints**
   - `GET /api/songs/search?q=...` — proxies Spotify search, caches results.
   - `GET /api/songs/:spotify_id` — returns cached song or fetches from Spotify.
   - `GET /api/songs/browse/new-releases` — preloaded browseable catalog.

4. **Frontend: Song Search UI**
   - Search bar with debounced input (300ms).
   - Results show album art thumbnail, song title, artist name.
   - Clicking a song opens a "Share" panel (built in Phase 3).

**Deliverable:** User can search for any real song and see its title, artist, and album art pulled from Spotify.

---

## Phase 3 — Friends & Discovery Inbox

**Goal:** Users can add friends and send song recommendations with context.

### Tasks

1. **Friend system**
   - `POST /api/friends/request/:userId` — send friend request.
   - `POST /api/friends/accept/:userId` — accept request.
   - `GET /api/friends` — list accepted friends.
   - `GET /api/friends/requests` — list pending incoming requests.
   - Frontend: "Add Friend" by username search, pending requests list, friends list.

2. **Sending a recommendation**
   - User selects a song from search results → "Share" panel opens.
   - Panel shows: friend picker (or group picker), optional context text input (appears only after song is selected — not a general text field).
   - `POST /api/recommendations` — body: `{ song_id, recipient_id OR group_id, context }`.
   - On creation: insert into `recommendations` table, increment sender's `recs_sent` for today in `daily_scores`.

3. **Discovery Inbox**
   - `GET /api/inbox` — returns all recommendations received by the current user, sorted by `sent_at` desc.
   - Each inbox item contains: sender info, song metadata, context text, like status (has current user liked it?), like count.
   - Frontend: Inbox page with two visual sections:
     - **JamGuru card** (pinned at top) — shows current JamGuru name + discovery count. Empty state if no recommendations received yet.
     - **Discovery Messages** — list of recommendation cards, sortable by Latest or Score.

4. **Recommendation card UI**
   - Album art on the left.
   - Song title + artist.
   - Sender name + context message.
   - Play preview button (uses Spotify `preview_url` in an `<audio>` tag).
   - Like button (heart icon). No dislike button.
   - Feedback tags appear after liking (see Phase 4).

**Deliverable:** User can send a song to a friend with context. Friend sees it in their inbox and can play a 30-second preview.

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

5. **Score recalculation job**
   - A lightweight cron that runs at midnight: recalculates any scores from the day that may have drifted (edge case handling only — real-time updates handle the common path).

**Deliverable:** Liking a song updates scores instantly. Each user's private trust ranking updates. JamGuru card in the inbox reflects the correct person.

---

## Phase 5 — Groups

**Goal:** Users can create groups, share songs to a group, and groups have isolated scoring.

### Tasks

1. **Group management**
   - `POST /api/groups` — create group with name, invite members by user ID.
   - `POST /api/groups/:id/members` — add a member.
   - `DELETE /api/groups/:id/members/:userId` — remove a member.
   - `GET /api/groups` — list groups the current user belongs to.
   - `GET /api/groups/:id` — group detail + member list.

2. **Group recommendations**
   - Sharing flow: friend picker replaced by group picker tab.
   - Recommendations sent to a group have `group_id` set and `recipient_id` NULL.
   - All group members see the recommendation in a shared **Group Feed** (separate from personal inbox).

3. **Group feed**
   - `GET /api/groups/:id/feed` — all recommendations sent to this group, sorted by latest.
   - Any group member can like a group recommendation.
   - Likes on group recommendations do NOT update personal trust rankings or personal JamGuru scores.

4. **Group scoring**
   - `GET /api/groups/:id/score` — returns the group's current daily and monthly score.
   - Formula: `Group Daily Score = Likes Received Today / (Group Recs Sent Today × Group Size)`.
   - Stored in a `group_scores` table (separate from `daily_scores`).
   - Group score is only shown within the group view — no cross-group comparison.

5. **Frontend: Group pages**
   - Group list view.
   - Group detail: member list, group feed, group score widget.
   - Share-to-group flow in the song share panel.

**Deliverable:** Users can create groups, share songs inside them, and see a group-level score that is completely separate from personal JamGuru scores.

---

## Phase 6 — Public Profiles & Monthly Reset

**Goal:** Public profiles show JamGuru-for count. Monthly reset recalculates everything cleanly.

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

**Deliverable:** Public profile shows JamGuru-for count. At month start, scores reset and the system starts fresh.

---

## Phase 7 — AI Recommendation ("Recommend with AI")

**Goal:** When composing a recommendation to a specific friend, the user can request an AI-suggested song based on mutual history.

### Tasks

1. **Data collection for AI context**
   - `GET /api/ai/context/:friendId` — returns the interaction history between the current user and that friend:
     - Songs sender has previously recommended to this friend.
     - Which ones the friend liked.
     - Feedback tags on those likes.
     - Songs the friend has recommended to the sender that the sender liked.
   - This is the *only* data sent to the AI — no global taste profile.

2. **AI prompt construction**
   - Build a prompt from the context:
     ```
     You are a music recommendation assistant.

     Based on the following interaction history between two users, suggest ONE song
     that [sender_name] might want to recommend to [friend_name].

     Songs [friend_name] liked from [sender_name]:
     - "Song Title" by Artist (tags: Gym song, Great vocals)
     - ...

     Songs [sender_name] liked from [friend_name]:
     - "Song Title" by Artist (tags: Nostalgic)
     - ...

     Suggest a single song title and artist that fits this pattern.
     Return only: { "title": "...", "artist": "..." }
     ```

3. **AI → Spotify lookup**
   - Take the AI's suggested `{ title, artist }`.
   - Run `GET /api/songs/search?q={title} {artist}` to find the real Spotify track.
   - Return the matched song metadata to the frontend for the user to confirm and send.

4. **Frontend: "Recommend with AI" button**
   - Shown inside the share panel when composing a recommendation to an individual friend (not groups).
   - On click: shows loading state → returns a suggested song card with album art.
   - User can Accept (pre-fills the song in the share panel) or Dismiss (try again or pick manually).

5. **AI provider**
   - Use **Claude API** (`claude-sonnet-4-6` or `claude-haiku-4-5`) for the suggestion.
   - Store `ANTHROPIC_API_KEY` in `.env`.
   - Keep the prompt stateless — no conversation history needed, just the structured context object.

**Deliverable:** "Recommend with AI" button in share panel returns a real, Spotify-matched song suggestion based only on the 1:1 history between the two users.

---

## Phase Summary

| Phase | What Gets Built | Key Output |
|---|---|---|
| 1 | Auth, user profiles | Register → log in → profile page |
| 2 | Spotify API integration, song search | Real song metadata, search, catalog browse |
| 3 | Friends, Discovery Inbox, sending recommendations | Share a song with context; friend sees it in inbox |
| 4 | Likes, feedback tags, scoring engine, JamGuru | Trust rankings update live; JamGuru card shows correct person |
| 5 | Groups, group feed, group scoring | Group recommendations isolated from personal scores |
| 6 | Public profiles, monthly reset | JamGuru-for count on profile; monthly season restarts |
| 7 | AI recommendation | "Recommend with AI" suggests a real song from 1:1 history |

---

## File Structure (Proposed)

```
JamGuru/
├── server/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── friends.js
│   │   ├── songs.js
│   │   ├── recommendations.js
│   │   ├── likes.js
│   │   ├── groups.js
│   │   ├── jamguru.js
│   │   └── ai.js
│   ├── services/
│   │   ├── spotify.js
│   │   ├── scoring.js       ← all score calculation logic
│   │   ├── jamguru.js       ← trust ranking computation
│   │   └── ai.js            ← Claude API prompt + Spotify match
│   ├── middleware/
│   │   └── auth.js          ← JWT verification
│   ├── jobs/
│   │   └── monthlyReset.js
│   └── index.js
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Inbox.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── Friends.jsx
│   │   │   ├── Groups.jsx
│   │   │   └── GroupDetail.jsx
│   │   ├── components/
│   │   │   ├── JamGuruCard.jsx
│   │   │   ├── RecommendationCard.jsx
│   │   │   ├── SharePanel.jsx
│   │   │   ├── SongSearch.jsx
│   │   │   ├── FeedbackTags.jsx
│   │   │   └── AiSuggestButton.jsx
│   │   ├── api/             ← axios wrappers per resource
│   │   └── App.jsx
│   └── index.html
├── problem-statement.md
└── phased_architecture4JamGuru.md
```

---

## Open Questions — Resolved

| Question | Decision |
|---|---|
| Spam prevention cap | No cap. Scoring formula naturally penalizes low-quality spam. |
| Cold start (few friends) | Implement both: contacts import + in-app "find friends" by username search. |
| Device notifications | None in prototype. |
| Score decay | No decay. Monthly reset handles freshness. |
| JamGuru-for count visibility | Yes — shown on public profile. |
| Group scores affecting JamGuru | No. JamGuru score is 1:1 only. Group scores are fully isolated. |
