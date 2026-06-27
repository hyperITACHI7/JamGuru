# JamGuru — Edge Cases & Design Decisions

This document catalogues every non-obvious scenario across all seven phases. For each case the document states the **situation**, the **risk** if left unhandled, and the **decision** (or open question) for the prototype.

---

## 1. Scoring Engine

### 1.1 Division by Zero — Daily Score

**Situation:** `Daily Score = Likes Received Today / Recs Sent Today`. If `recs_sent = 0` (user received a like on a recommendation from a previous day that was replayed into today's batch, or a scoring recalculation runs before any recs are sent), the denominator is zero.

**Risk:** NaN or runtime crash stored in `daily_scores`.

**Decision:** Guard in code — if `recs_sent = 0`, `daily_score = 0`. Never write a `daily_scores` row if `recs_sent = 0`; only create the row on first `recs_sent` increment.

---

### 1.2 Division by Zero — Personal Trust Score

**Situation:** `trust_score = likes_given / recs_received`. A friend exists in your network but has never sent you a recommendation. `recs_received = 0`.

**Risk:** Division by zero; friend appears in trust ranking table with undefined score.

**Decision:** Do not create a `personal_trust_rankings` row until the friend sends at least one recommendation. A friend with no recs sent is simply absent from the ranking, not a row with score 0.

---

### 1.3 Like Arrives on a Rec Sent on a Previous Day

**Situation:** Alice sends a rec on Monday. Bob likes it on Wednesday. Which day gets the `likes_received` credit?

**Risk:** If credit goes to Wednesday, Alice's Monday `daily_score` is permanently under-counted. If credit goes to Monday, today's `daily_scores` row for Wednesday is unaffected — which is correct behaviour.

**Decision:** `likes_received` is credited to the **date the recommendation was sent** (`recommendations.sent_at::date`), not the date of the like. This means Monday's `daily_score` is recalculated when the like arrives. The monthly score for Alice is then also re-summed.

---

### 1.4 Unlike — Score Reversal

**Situation:** User Bob likes a rec, triggering score updates. Bob then unlikes it.

**Risk:** Trust score and monthly score are now overstated. JamGuru may be wrong.

**Decision:** `DELETE /api/recommendations/:id/like` must reverse every update the like caused: decrement `likes_given` in `personal_trust_rankings`, decrement `likes_received` in `daily_scores`, re-run `daily_score` and `monthly_score` calculations, and re-determine JamGuru. All reversals happen in a single DB transaction — partial reversal is worse than no reversal.

---

### 1.5 Self-Like

**Situation:** A user sends a recommendation to a group they are also a member of. The sender can see their own rec in the group feed and might click Like.

**Risk:** Sender liking their own rec inflates their own `likes_received`, giving them a perfect score with no real signal.

**Decision:** Block self-likes at the API level. `POST /api/recommendations/:id/like` returns 403 if `req.userId === recommendation.sender_id`.

---

### 1.6 Trust Score Tie — JamGuru Determination

**Situation:** Alice and Carol both have `trust_score = 1.0` (e.g., each sent 1 rec and the owner liked both).

**Risk:** Non-deterministic JamGuru — flips between them on recalculation.

**Decision:** Tie-break by **volume first** (`likes_given` descending), then by **recency** (`max(liked_at)` descending). Most active + most recently liked wins. Document this rule in the UI ("JamGuru is the friend whose recommendations you've engaged with most this month").

---

### 1.7 JamGuru Shifts Mid-Month

**Situation:** Bob was Alice's JamGuru. Alice gets a run of great recs from Carol and Carol overtakes Bob.

**Risk:** Notification of the change (not in prototype), UI confusion if JamGuru changes between two refreshes.

**Decision:** JamGuru card in the inbox always reflects the *current* state at load time. No notifications in the prototype. The card shows a small "as of [date]" timestamp so users understand it updates.

---

### 1.8 Zero Likes All Month

**Situation:** User has friends, receives recommendations, but never likes anything.

**Risk:** `personal_trust_rankings` never gets rows. JamGuru is undefined.

**Decision:** Show "No JamGuru yet" empty state. This is the correct default and should be the common state early in the month. Do not award JamGuru by rec volume alone — only likes matter.

---

### 1.9 All Friends' Trust Scores = 0

**Situation:** Multiple friends all sent recs, none were liked. `likes_given = 0` for all → `trust_score = 0` for all friends.

**Risk:** One of them is technically "highest" at 0, triggering a spurious JamGuru.

**Decision:** JamGuru is only awarded when `trust_score > 0`. If all friends are at 0, show "No JamGuru yet".

---

### 1.10 Scoring Recalculation on Stale Days

**Situation:** Midnight cron runs to recalculate scores. A like came in at 11:59 PM that hasn't been processed yet.

**Risk:** Like is processed after the cron has already summed the day's scores, causing the monthly total to be wrong until the next cron.

**Decision:** Real-time updates (on like/unlike) are the primary path. The cron is a *reconciliation* job only — it re-derives all values from the raw `likes` and `recommendations` tables for the past 24 hours, overwriting any drift. The cron does not trust its own previously written aggregate values.

---

## 2. Friend System

### 2.1 Duplicate Friend Request

**Situation:** Alice sends a request to Bob. Before Bob accepts, Alice sends another request to Bob.

**Risk:** Two `pending` rows in `friendships` for the same pair.

**Decision:** The `UNIQUE (requester_id, addressee_id)` constraint catches this. API returns 409 with message "Friend request already pending."

---

### 2.2 Simultaneous Cross-Requests

**Situation:** Alice sends a request to Bob *and* Bob sends a request to Alice at the same time. Two rows: `(Alice→Bob, pending)` and `(Bob→Alice, pending)`.

**Risk:** Both requests exist; the schema unique constraint does not catch this (they are different row orders).

**Decision:** At accept time, check if the reverse direction already exists as a `pending` request. If so, auto-accept both and mark both rows `accepted`. In the request API, also check for the reverse pair and auto-accept instead of creating a new row.

---

### 2.3 Friend Request to Self

**Situation:** User submits a friend request to their own user ID.

**Risk:** Self-friendship corrupts trust rankings (self-recs, self-likes).

**Decision:** API returns 400 "You cannot add yourself as a friend."

---

### 2.4 Unfriending — Impact on Existing Data

**Situation:** Alice and Bob are friends. Bob is Alice's JamGuru. They unfriend.

**Risk:** Trust ranking rows, recommendation history, and inbox items reference a former friend.

**Decision (prototype):** Soft behaviour — keep all historical rows intact. The friendship row is deleted, but recommendations and trust ranking rows are kept as historical record. Bob drops off Alice's active friend picker for new recs. The JamGuru card recalculates at next load and Bob's row now has no active friendship, so the system treats `trust_score` from a non-friend as ineligible — Bob is no longer shown as JamGuru even if his historical trust_score was highest.

---

### 2.5 Friend Account Deleted Mid-Month

**Situation:** Bob is Alice's JamGuru. Bob deletes his account.

**Risk:** JamGuru card references a user that no longer exists. Orphaned `personal_trust_rankings` rows.

**Decision:** On account deletion, cascade-delete the user's `friendships`, and mark or delete `personal_trust_rankings` rows where `friend_id = deleted_user`. Alice's JamGuru card recalculates to the next-highest trust friend.

---

## 3. Recommendations

### 3.1 Sending the Same Song Twice to the Same Person

**Situation:** Alice sends "Blinding Lights" to Bob in January. Later in January, Alice sends "Blinding Lights" to Bob again.

**Risk:** Bob's inbox has two identical-looking cards; Alice's `recs_sent` inflates.

**Decision (prototype):** Allow it. No deduplication. The sender sees both entries in their history. The scoring formula naturally penalises repeated sending of the same content if Bob doesn't like the second instance. Add a UI warning ("You've already sent this song to Bob this month") but don't block.

---

### 3.2 Recommendation to a Non-Friend

**Situation:** Alice looks up Bob's public profile and somehow fires a POST /api/recommendations with Bob's ID.

**Risk:** Bob receives a spam recommendation from a stranger.

**Decision:** `POST /api/recommendations` checks that `(sender_id, recipient_id)` exists as an accepted friendship before inserting. Returns 403 "You can only recommend songs to accepted friends." Groups are exempt — group membership check replaces friendship check.

---

### 3.3 Song No Longer Available on Spotify

**Situation:** Alice recommends a song. Later, Spotify removes the song from their catalog (licensing change). Bob opens his inbox.

**Risk:** Album art returns 404; preview URL is dead; song title might disappear from Spotify's API.

**Decision:** Songs are **cached locally** in the `songs` table. The inbox renders from local cache — it never re-fetches from Spotify per-load. The song data displayed is what was cached at send time. Preview URL might be dead (show play button greyed out with "Preview unavailable"). Re-fetch from Spotify only on explicit cache refresh after 7 days; if Spotify returns 404, mark `preview_url = NULL` and `album_art_url = NULL` in local cache but keep the title and artist.

---

### 3.4 Context Text — Empty vs. Missing

**Situation:** Sender opens the share panel but doesn't type anything in the context field.

**Risk:** Inbox card renders with an empty context box, looking broken.

**Decision:** `context` is optional (`TEXT NULL` in schema). If null/empty, the inbox card omits the context box entirely rather than showing an empty speech bubble. The context input in the UI is a textarea that only appears after the song is selected (per Phase 3 spec).

---

### 3.5 Recommendation to a Group the Sender Left

**Situation:** Alice is in Group X. She composes a rec and takes a long time. Meanwhile she's removed from Group X. She submits.

**Risk:** Rec is sent to a group she is no longer part of.

**Decision:** `POST /api/recommendations` with a `group_id` verifies that the sender is currently an active member of that group at write time. If not, return 403.

---

## 4. Likes & Feedback

### 4.1 Double Like (Rapid Click)

**Situation:** User clicks the heart twice in quick succession before the first request returns.

**Risk:** Two `POST /api/recommendations/:id/like` requests race; both succeed and scoring is double-incremented.

**Decision:** The `UNIQUE (recommendation_id, liker_id)` constraint in `likes` is the final guard. The second request returns 409. The frontend also disables the like button immediately on first click and shows a loading state.

---

### 4.2 Like on a Group Rec from a Non-Member

**Situation:** User is not a member of Group X but somehow knows the rec ID and sends a like.

**Risk:** Non-member pollutes group scoring.

**Decision:** `POST /api/recommendations/:id/like` fetches the recommendation. If it has a `group_id`, the API checks that `liker_id` is a current member of that group. 403 if not.

---

### 4.3 Feedback Tags Submitted After Unlike

**Situation:** Bob likes a rec, a feedback-tag prompt appears, Bob selects "Gym song". Bob then unlikes the rec. The `like_feedback` rows now reference a deleted `like`.

**Risk:** Orphaned `like_feedback` rows; inconsistent data.

**Decision:** Unlike cascades `DELETE FROM like_feedback WHERE like_id = <id>` before deleting the like itself. Unlike also reverses all score effects (see §1.4). Order: delete feedback → delete like → reverse scores. All in one transaction.

---

### 4.4 Liking Your Own Rec in a Group

**Situation:** Alice sends a rec to Group X. The group feed shows it to all members including Alice. Alice clicks Like on her own rec.

**Risk:** Self-like inflates `likes_received` for Alice.

**Decision:** Same as §1.5 — 403 if `liker_id === sender_id`.

---

## 5. Groups

### 5.1 Group Score Denominator Changes Mid-Day

**Situation:** `Group Daily Score = Likes Received Today / (Group Recs Sent Today × Group Size)`. Three members in the morning, a fourth joins at noon.

**Risk:** Using current group size as denominator makes scores non-comparable across the day.

**Decision:** Snapshot `group_size` at the time of each score calculation using the **current member count at calculation time**. Document that the score reflects the group as it exists now, not a frozen historical size. This is acceptable for a prototype.

---

### 5.2 Empty Group

**Situation:** Group creator creates a group with only themselves. Or all members leave except one.

**Risk:** Division by zero in `Likes / (Recs × Group Size)` if Group Size = 1 and Recs = 0, or UI shows a useless group.

**Decision:** Group with 1 member is allowed but a "Invite someone to your group" banner is shown. The scoring formula with Group Size = 1 reduces to normal per-sender scoring — not a bug, just a degenerate case.

---

### 5.3 Group Creator Leaves

**Situation:** The user who created the group removes themselves.

**Risk:** Group has no owner. No one can add/remove members or delete the group.

**Decision (prototype):** Creator cannot leave a group they created; they must either transfer ownership or delete the group. API returns 400 "Transfer ownership before leaving." Ownership transfer: `PATCH /api/groups/:id/owner`.

---

### 5.4 Group Rec Liked — Personal JamGuru Impact

**Situation:** Alice and Bob are friends and share a group. Bob sends a rec to the group. Alice likes it in the group feed.

**Risk:** This like should NOT update Alice's personal trust ranking for Bob (group scores are isolated per spec).

**Decision:** On `POST /api/recommendations/:id/like`, check if the rec has a `group_id`. If it does, skip all personal scoring updates (`daily_scores`, `monthly_scores`, `personal_trust_rankings`). Only update `group_scores`. This is the critical isolation boundary.

---

### 5.5 Same Song Rec in Both Group and Personal Inbox

**Situation:** Bob sends "Levitating" to the group. Bob also sends "Levitating" directly to Alice (both are members). Alice sees it twice — once in her inbox, once in the group feed.

**Risk:** Confusing UX; Alice might think she's missing something.

**Decision:** This is valid behaviour — a personal rec and a group rec are different objects with different intents (personal context vs. group sharing). The cards display their source clearly: "from Bob → you" vs. "from Bob → Group X". No deduplication.

---

## 6. Spotify API

### 6.1 API Rate Limits

**Situation:** Many search requests in rapid succession hit Spotify's rate limit (HTTP 429).

**Risk:** Search returns empty results; users see broken UI.

**Decision:** Wrap all Spotify API calls in a retry with exponential backoff (1s → 2s → 4s, max 3 retries). Cache responses aggressively — a search for "Blinding Lights" that was run 30 seconds ago should serve from in-memory cache, not hit Spotify again. Use a simple in-memory LRU cache (max 500 entries, 60s TTL) on the server for search results.

---

### 6.2 Token Expiry Mid-Request

**Situation:** Spotify Client Credentials token (TTL = 3600s) expires while a request is in flight.

**Risk:** Spotify returns 401; song search fails for up to 60 minutes if the token refresh logic isn't triggered.

**Decision:** The Spotify service module (`services/spotify.js`) stores the token and its expiry timestamp. Before every API call, check if `now >= expiry - 60s`. If so, refresh the token first. This means the token is always valid when used.

---

### 6.3 Null Preview URL

**Situation:** Spotify does not provide a `preview_url` for all tracks (often missing for newer releases, region-restricted content, or certain labels).

**Risk:** Play button in inbox cards does nothing; audio tag has no src.

**Decision:** Store `preview_url` as nullable. In the recommendation card UI, if `preview_url` is null, show a greyed-out "Preview unavailable" badge instead of the play button. Never hide the song entry entirely.

---

### 6.4 Search Returns Zero Results

**Situation:** User searches for an obscure or misspelled query.

**Risk:** Blank results with no feedback.

**Decision:** API returns `{ tracks: [], total: 0 }`. Frontend shows "No songs found for '[query]'" with a "Try a different search" hint.

---

### 6.5 Stale Cache on Spotify Metadata Change

**Situation:** An artist changes their name, or an album is re-released with new art. The local `songs` cache still has the old data.

**Risk:** Stale song info shown indefinitely.

**Decision:** Cache TTL is 7 days. On cache miss (song not in DB, or `cached_at > 7 days ago`), re-fetch from Spotify and overwrite the row. This is best-effort — highly active songs stay fresh; obscure cached songs may lag. Acceptable for a prototype.

---

### 6.6 Cache Write Race Condition

**Situation:** Two users search for the same song simultaneously. Both see a cache miss and both try to `INSERT INTO songs`.

**Risk:** Primary key constraint violation crash.

**Decision:** Use `INSERT INTO songs ... ON CONFLICT (spotify_id) DO UPDATE SET cached_at = NOW()` (upsert). The second writer just refreshes the cache timestamp, no error.

---

## 7. Auth & Session

### 7.1 JWT Expires Mid-Session

**Situation:** User is actively browsing but their 7-day JWT has just expired. Their next API call returns 401.

**Risk:** User is silently logged out; form submission data is lost; confusing blank screen.

**Decision:** The Axios interceptor in the client catches 401 responses and redirects to `/login` with a query param `?reason=session_expired`. Login page shows a small banner: "Your session expired. Please log back in." This is the simplest prototype approach — no refresh token flow.

---

### 7.2 Username Case Sensitivity

**Situation:** "JohnDoe" registers. Later someone tries to register "johndoe".

**Risk:** Two accounts with visually identical usernames; lookups by username become ambiguous.

**Decision:** Enforce lowercase-only usernames at registration. The API normalises `username = req.body.username.toLowerCase()` before validation and storage. The unique constraint on `users.username` then prevents collisions naturally.

---

### 7.3 Multiple Tabs — Logout in One Tab

**Situation:** User has JamGuru open in three browser tabs. They log out in tab 1. Tabs 2 and 3 still have the token in memory (React state) and make requests that succeed until the next navigation.

**Risk:** Apparent inconsistency — user thinks they're logged out but tabs 2 and 3 still work.

**Decision (prototype):** JWTs are stateless — there is no server-side session to invalidate. Logout in tab 1 removes the token from `localStorage`. Tabs 2 and 3 will fail on next page reload or manual navigation because they also read from `localStorage`. For the prototype this is acceptable. A production system would use short-lived access tokens + refresh token rotation.

---

### 7.4 Old Tokens After Password Change

**Situation (future):** If password change is added in a later phase, existing JWTs remain valid for their full 7-day lifespan.

**Risk:** A stolen token can be used for days after the victim changes their password.

**Decision (prototype):** Password change is not in scope for Phases 1–7. Document this as a known gap. Production fix: include a `password_version` field in the JWT payload; increment it on password change; reject tokens with stale version.

---

## 8. Monthly Reset

### 8.1 Reset Runs While a Like Is In-Flight

**Situation:** Midnight reset job begins at 00:00:00. A like arrives at 00:00:01 for the previous month's recommendation.

**Risk:** The like is credited to the new month's `daily_scores` row, even though the rec was sent in the old month.

**Decision:** The like always credits the date the **recommendation was sent** (§1.3), not today. If the rec was sent in December and liked in January, the December `daily_scores` row is updated. Since December's monthly total has already been archived, the reset job must be idempotent and should re-sum from raw likes post-archive. The December archive is updated retroactively. This is a rare edge case; document it and accept minor inaccuracy in the prototype.

---

### 8.2 User Registered on the Last Day of the Month

**Situation:** User registers January 31st. Reset runs February 1st at midnight.

**Risk:** User had no time to send or receive recs. A monthly reset creates empty rows and could confuse the empty-state logic.

**Decision:** The reset job only creates new-month rows for users who have existing data (at least one `daily_scores` or `personal_trust_rankings` row). New users start with no rows and earn them organically. No spurious empty-month rows.

---

### 8.3 Reset Job Fails Partway Through

**Situation:** The monthly reset job processes 60% of users and then crashes (DB timeout, server restart).

**Risk:** 40% of users are still on the old month's data while 60% have been reset. Scores are inconsistent.

**Decision:** The reset job runs all operations inside a single database transaction. If any step fails, the entire transaction rolls back. The job logs the error and must be manually re-triggered. A simple `job_runs` table can track completion status. The cron retries automatically the next night if the previous run didn't complete.

---

### 8.4 JamGuru-for Count at Month Boundary

**Situation:** At 11:59 PM on the last day of the month, Alice is JamGuru for 12 people. At 00:01 AM (new month), all scores reset and her count drops to 0.

**Risk:** A public profile viewed at 11:59 PM shows 12; viewed at 00:01 AM shows 0. Jarring experience.

**Decision:** Accept this. Monthly reset is an explicit feature, not a bug. Optionally, show "Last month: JamGuru for 12" in a muted subtitle during the first 3 days of the new month as historical context (Phase 6 enhancement).

---

## 9. AI Recommendation (Phase 7)

### 9.1 No Interaction History

**Situation:** Alice wants to recommend to Bob using AI, but they just became friends. No shared history exists.

**Risk:** AI is called with an empty context; it generates a generic or random suggestion.

**Decision:** `GET /api/ai/context/:friendId` returns `{ hasHistory: false }` if fewer than 2 mutual interactions exist. The frontend shows a different message: "You haven't exchanged enough recommendations with Bob yet. Try recommending manually first!" The AI button is greyed out.

---

### 9.2 AI Returns a Hallucinated Song

**Situation:** Claude suggests `{ "title": "Moonrise Drive", "artist": "The Solar Boys" }`. Spotify search returns 0 results.

**Risk:** AI suggestion fails silently or crashes the share panel.

**Decision:** If Spotify search returns no results for the AI suggestion, the frontend shows: "Couldn't find that song on Spotify. Try again for a different suggestion." The "Try again" button fires another AI request. Max 3 retries before showing a manual-search fallback. On the backend, log the AI response and the failed Spotify search for debugging.

---

### 9.3 AI Suggests an Already-Recommended Song

**Situation:** Alice has already sent "Levitating" to Bob this month. AI suggests it again.

**Risk:** Duplicate rec (see §3.1); Alice wastes a send.

**Decision:** Before presenting the AI suggestion to the user, the backend checks if Alice has already sent that `spotify_id` to Bob this month. If yes, discard and pick the second Spotify result, or retry the AI call with an additional constraint in the prompt: `"Do not suggest any of these already-recommended songs: [list]"`.

---

### 9.4 AI Context Too Large

**Situation:** Alice and Bob have been exchanging recommendations for 6 months with hundreds of liked songs. The context object may exceed Claude's practical input size.

**Risk:** Very long prompt; slow response; potential token overflow.

**Decision:** Cap the context to the **last 30 liked interactions** (15 from each direction), sorted by `liked_at` descending. This keeps the prompt fresh and fast. Older history has diminishing signal for current taste anyway.

---

### 9.5 Multiple Rapid AI Clicks

**Situation:** User clicks "Recommend with AI" three times before the first response returns.

**Risk:** Three parallel Claude API calls; cost multiplies; three different suggestions appear in sequence.

**Decision:** The button is disabled immediately on first click (replaced by a spinner). It re-enables only after the response is processed (success or failure). Debouncing at the component level prevents any double-submit.

---

## 10. Data Integrity & Cascades

### 10.1 Account Deletion Cascades

**Situation:** A user deletes their account. Their data is referenced in: `friendships`, `recommendations` (sender and recipient), `likes`, `like_feedback`, `personal_trust_rankings` (both owner and friend), `group_members`, `daily_scores`, `monthly_scores`.

**Risk:** Foreign key violations; broken inbox cards; orphaned score rows.

**Decision (prototype):** Full cascade delete on `users.id`. All of the above tables use `ON DELETE CASCADE` foreign keys. The inbox cards of the deleted user's friends will simply no longer show that user's recommendations (they disappear). This is disruptive but acceptable for a prototype. A production system would soft-delete and show "[Deleted user] sent you this song."

---

### 10.2 Score Table vs. Raw Table Divergence

**Situation:** A bug in the like handler causes `likes_given` in `personal_trust_rankings` to be incremented but the `likes` row insert to fail (or vice versa). The aggregate and the source of truth diverge.

**Risk:** Trust scores are wrong; JamGuru is miscalculated.

**Decision:** Every scoring update runs inside a database transaction. The `likes` insert and all score updates are atomic. If any step fails, the entire transaction rolls back to the state before the like. The midnight reconciliation cron re-derives all scores from the raw `likes` and `recommendations` tables as an independent check.

---

## 11. UI & UX

### 11.1 Very Long Song Title or Artist Name

**Situation:** "DJ Snake, Lauv — A Different Way (feat. Louis Tomlinson) [Extended Club Mix]".

**Risk:** Overflows the recommendation card; breaks layout.

**Decision:** All song title and artist name fields use `truncate` (CSS `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`) with a fixed max width. Full title shown on hover via `title` attribute tooltip.

---

### 11.2 Album Art Load Failure

**Situation:** Spotify's CDN is down or the URL has expired.

**Risk:** Broken image icon in recommendation cards, search results, and inbox.

**Decision:** All `<img>` tags for album art use an `onError` handler that replaces the `src` with a local placeholder gradient square. The placeholder matches the card's colour scheme.

---

### 11.3 Inbox Pagination

**Situation:** A user has received 500 recommendations. Loading them all at once is slow and wasteful.

**Risk:** Long load times; excessive memory use.

**Decision:** `GET /api/inbox` supports `?page=1&limit=20` pagination. The frontend uses infinite scroll — load the next page when the user scrolls within 200px of the bottom. The total count is returned in the response header so the UI can show "Showing 20 of 500 recommendations."

---

### 11.4 Search Input — Debounce & Minimum Length

**Situation:** User types a single character "a". This fires a Spotify search that returns 20 irrelevant pop songs.

**Risk:** Wasted API calls; bad results.

**Decision:** The search bar requires at least **2 characters** before triggering a search, and uses a **300ms debounce**. A character count indicator is shown below the input ("Type at least 2 characters"). Zero-length or 1-character queries return an empty results array without hitting the API.

---

### 11.5 JamGuru-for Count: 0 vs. Empty State

**Situation:** A user has never been anyone's JamGuru. Their public profile shows "JamGuru for 0 listeners".

**Risk:** Looks like a bug or a meaningless stat, especially for new users.

**Decision:** If `jamGuruForCount === 0`, replace the number with a neutral label: "Not yet JamGuru for anyone this month." If `jamGuruForCount > 0`, show the count prominently with a green crown: "JamGuru for **7** listeners this month."

---

### 11.6 Share Panel Open Without a Friend to Share To

**Situation:** User clicks a song to share but has no accepted friends yet.

**Risk:** Empty friend picker with no feedback.

**Decision:** If the user has 0 accepted friends when the share panel opens, show a "Find Friends First" state inside the panel with a link to the friends search page. The send button is disabled. Groups tab is also shown if the user belongs to at least one group.

---

### 11.7 Context Text Character Limit

**Situation:** User writes a 2,000-character novel in the context field.

**Risk:** Inbox card overflows; DB field size exceeded.

**Decision:** Context is capped at **200 characters**. The textarea shows a live character counter (`142 / 200`). The API also validates and returns 400 if context exceeds 200 chars.

---

## 12. Anti-Spam & Collusion

### 12.1 Recommendation Flooding

**Situation:** Alice sends 500 recommendations to Bob in one day, all of them unliked.

**Risk:** Bob's inbox is flooded; Alice wastes effort but score = 0 / 500 = 0 (correct).

**Decision:** No hard cap (per spec). The formula handles it. The UI should add a mild social signal: inbox cards from the same sender on the same day are **collapsed** into a single stack ("Alice sent you 48 songs today — tap to expand") after the first 3.

---

### 12.2 Mutual Like Ring

**Situation:** Alice and Bob agree to like everything each other sends, regardless of quality. Both end up with `trust_score = 1.0` for each other.

**Risk:** Inflated trust scores; false JamGuru.

**Decision (prototype):** No detection mechanism. The scoring formula is gameable in small-scale collusion. This is a known limitation of the prototype. A production system would add anomaly detection (e.g., flag pairs where both users have `trust_score = 1.0` and `likes_given ≥ 10` for each other).

---

### 12.3 New Account Bombing

**Situation:** A bad actor creates 20 new accounts that all friend a target user and flood them with recommendations.

**Risk:** Target's inbox is unusable.

**Decision (prototype):** Accept this risk — no rate limiting on friend requests or recommendations per the spec. Document as a known gap for production. Production fix: progressive rate limiting on new accounts (e.g., new accounts can only send 5 recs/day for the first 7 days).

---

## Summary Table

| # | Category | Risk Level | Handled In |
|---|----------|-----------|------------|
| 1.1 | Division by zero (daily score) | Critical | Like/rec handlers |
| 1.2 | Division by zero (trust score) | Critical | Trust ranking writer |
| 1.3 | Like credited to wrong day | High | Like handler |
| 1.4 | Unlike reversal atomicity | High | Unlike transaction |
| 1.5 | Self-like | Medium | Like API guard |
| 1.6 | Trust score tie | Low | Tie-break rule |
| 2.1 | Duplicate friend request | Medium | UNIQUE + 409 |
| 2.2 | Cross-requests | Medium | Accept-time check |
| 2.3 | Friend request to self | Low | API guard |
| 2.4 | Unfriend with existing data | Medium | Soft behaviour |
| 3.1 | Duplicate song recs | Low | UI warning only |
| 3.2 | Rec to non-friend | High | Friendship check |
| 3.3 | Song removed from Spotify | Medium | Local cache |
| 4.1 | Double like | High | UNIQUE + optimistic UI |
| 4.3 | Tags after unlike | Medium | Cascade delete |
| 5.1 | Group score denominator shifts | Low | Accepted |
| 5.3 | Group creator leaves | Medium | API guard |
| 5.4 | Group like affects personal scores | Critical | Group-id check in like handler |
| 6.1 | Spotify rate limits | High | Retry + LRU cache |
| 6.2 | Token expiry mid-request | High | Pre-call refresh check |
| 6.3 | Null preview URL | Medium | Nullable field + UI fallback |
| 6.6 | Cache write race | Medium | Upsert |
| 7.1 | JWT expires mid-session | Medium | 401 interceptor |
| 7.2 | Username case | Medium | Lowercase normalisation |
| 8.1 | Like arrives during reset | Low | Accepted for prototype |
| 8.3 | Reset job partial failure | High | Single transaction |
| 9.1 | AI with no history | Medium | `hasHistory` guard |
| 9.2 | AI hallucinated song | Medium | Retry + fallback |
| 9.3 | AI re-suggests sent song | Low | Pre-present dedup |
| 10.1 | Account deletion cascades | High | ON DELETE CASCADE |
| 10.2 | Score table divergence | Critical | Atomic transactions + nightly cron |
| 12.4 | Group rec isolation | Critical | group_id check in like handler |
