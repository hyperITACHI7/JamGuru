# JamGuru — Problem Statement & Concept

## Overview

Music discovery on Spotify is increasingly algorithmic and isolated. Users rely on Spotify's recommendation engine (Discover Weekly, Daily Mixes, Radio) but lack meaningful ways to share music with trusted friends inside the app, with context, and with accountability. This creates a gap: social discovery — one of the most natural and effective ways humans have always found new music — is either pushed outside Spotify or stripped of the personal context that makes it valuable.

---

## Survey Findings

Quantitative research surfaced a critical gap in the Spotify experience:

- ~50% of users rely primarily on Spotify for music discovery.
- These users discover a song they genuinely like only **about once per week**.
- Users who discover music through friends, Instagram, YouTube, or other social channels find meaningful songs **significantly more frequently**.

**Core insight:** Music discovery is inherently social, but Spotify's discovery experience is largely individual. The goal of JamGuru is to increase meaningful music discovery by introducing a lightweight social layer directly inside Spotify.

---

## The Core Problem

**Spotify has no native social discovery layer.**

Today, when a user wants to share a song with a friend, they must:
1. Copy a link and paste it into WhatsApp, Instagram DMs, or iMessage.
2. The friend opens it in a browser or switches back to Spotify.
3. Context is lost — there is no "why did you send me this?" attached to the track.
4. There is no feedback loop — the sharer never knows if the friend liked it.
5. There is no memory — shared songs are not collected anywhere useful.

This flow breaks discovery into fragments across multiple apps, destroys context, and gives users no incentive to curate thoughtfully. It also deprives Spotify of rich preference signals that could improve its own recommendation system.

---

## Who Is Affected

### Primary Users: Active Music Listeners in Social Circles
- Ages 16–35, who already share music casually via messaging apps.
- Users who participate in playlists with friends but feel "Collaborative Playlists" lack direction or conversation.
- Users who trust friends' taste more than algorithmic playlists for specific moods or moments.

### Secondary Users: Music Enthusiasts and Curators
- Users who pride themselves on discovering new music and want recognition for it.
- People who already function informally as the "music person" in their friend group — the one everyone asks for recommendations.

---

## Specific Pain Points

### 1. No In-App Social Feed
Spotify has no persistent, browsable feed of what friends are listening to or recommending. The previous "Friend Activity" sidebar shows playback but not intent — it does not tell you *why* someone is playing a song or that they think *you* should hear it. Users have no inbox for music recommendations from people they trust.

### 2. Context Is Lost at the Point of Sharing
When a song is shared via a link, the recommendation is bare. There is no "Alice sent this because it reminded her of your road trip" — just a Spotify URL. Research on social recommendation consistently shows that context (who recommended it and why) dramatically increases the chance a recipient will engage with the content and find it genuinely useful.

### 3. No Feedback Loop for Sharers
If a friend shares a song and the recipient loves it, the sharer never knows. There is no acknowledgment, no gratitude, no signal that their recommendation landed. This means there is zero incentive to share thoughtfully. Users either over-share (spam) or stop sharing altogether because it feels like shouting into a void.

### 4. No Recognition for Good Taste
In friend groups, there is always someone who has exceptional taste and whose picks everyone trusts. This social status exists informally in real life but is invisible on Spotify. There is no mechanism to acknowledge or celebrate someone who consistently surfaces great music for their friends — no badge, no score, no title.

### 5. Algorithmic Discovery Has Limits
Spotify's algorithms optimize for patterns in listening history. They cannot account for:
- A new life event (a breakup, a new gym routine, a road trip) that changes what someone wants to hear.
- The nuance of a friend saying "this track reminds me of that summer we spent in Goa."
- Discovery of entirely new genres that a user has never explored and thus has no history for.

Human curation by trusted peers fills this gap more effectively than any model trained on historical play counts.

### 6. Existing Social Features Are Too Broad or Too Passive
- **Blend** merges two users' tastes into a shared playlist but requires bilateral engagement and produces a static output.
- **Jam Sessions** enable real-time group listening but require everyone to be active simultaneously.
- **Collaborative Playlists** have no structure, no conversation, and no accountability — they often go stale.

None of these features create a recurring, lightweight habit of "share one song to a friend with a reason, see if they like it."

---

## Why This Matters Now

### Behavioral Shift Toward Trusted Social Discovery
Instagram and TikTok have demonstrated that music goes viral through social context — a creator explaining why a song hits, a friend posting a reel with a track that fits the mood. Spotify's own data shows that tracks shared to Instagram Stories see significant save-rate increases. Users are already doing social discovery; they are just doing it outside Spotify, causing churn from the app.

### Competitor Movement
YouTube Music launched Taste Match for collaborative playlist discovery. Apple Music added SharePlay for synchronized listening. The social music space is heating up. Spotify risks becoming the playback engine for music discovered elsewhere — losing the top-of-funnel discovery relationship with its users.

### Engagement and Retention Opportunity
Academic prototypes of gamified music-sharing (e.g., "Gamispotify") recorded a **3x increase in user engagement** when social sharing was combined with point-based rewards. Small, trusted circles sharing a handful of songs per week generate higher satisfaction and lower churn than passive algorithmic delivery alone. Building this natively into Spotify captures that engagement inside the product.

---

## What Is Not Being Solved (Scope Boundaries)

This document focuses specifically on **peer-to-peer music recommendation within trusted small groups** inside Spotify. It does not address:

- Public broadcasting or influencer-style music sharing.
- Replacing algorithmic recommendations — JamGuru is a complement, not a replacement.
- Social features for podcasts or audiobooks.
- Monetization or artist promotion flows.

---

## Proposed Solution: JamGuru

JamGuru is a lightweight, in-app social discovery layer built on three principles:

1. **Context-first sharing** — Every recommendation carries a reason ("great for working out", "reminds me of our trip").
2. **Closed feedback loops** — Sharers know when their picks land via Likes, building accountability and motivation.
3. **Recognition for good taste** — Points and the JamGuru title reward users who consistently surface songs their friends love, without punishing anyone via dislikes.

The result is a "mini music club" model: small groups, low volume, high trust, high engagement — proven to outperform mass algorithmic delivery for meaningful discovery.

---

## Feature Design

### Discovery Inbox

A new section inside Spotify that functions similarly to a DM inbox — but its primary purpose is **sharing and discovering music, not conversation**.

> **Important note on "DMs":** This feature is referred to as DMs for convenience, but it is not a general messaging tool. There is no free-text input by default. A short message field only appears *after* a user selects a song to send, allowing them to attach a brief context or description alongside the recommendation.

Users can:
- Recommend songs to individual friends — selecting multiple friends at once for batch sharing in a single action.
- Recommend songs to groups.
- Add optional context explaining why they are recommending the song.
- Open a per-friend **Conversation View** — a threaded, chronological history of all songs shared with that friend, displayed as chat bubbles for quick scanning of the full recommendation history.

Examples of context:
- "Perfect for late-night drives."
- "The guitar solo is insane."
- "Sounds like old Arctic Monkeys."

---

### Personal Music Library

Before users can share or receive AI suggestions, JamGuru needs to know their taste. This is seeded through their existing Spotify library.

**Spotify Account Linking**

Users connect their Spotify account via OAuth. This grants JamGuru read-access to their liked songs and playlists. Tokens are stored securely and refreshed automatically in the background.

**Liked Songs Sync**

Once linked, users sync their Spotify Liked Songs with a single tap. These songs are imported into JamGuru's local database and form the foundation of the user's taste profile. The sync can be refreshed at any time to pull in newly liked tracks.

**Playlist Import**

Users can also import any public or private Spotify playlist by pasting its URL. Imported playlists appear in the Library section of the sidebar and on the Library page.

> **Why import playlists?** Imported playlists serve two purposes: they appear in the library for browsing, and — more importantly — they shape the user's taste profile and seed the AI suggestion pool. A playlist import is a declaration of musical identity.

**Library Page**

The Library page displays:
- A "Liked Songs" collection (all synced tracks).
- All imported playlists with cover art, name, and song count.
- A persistent "Import playlist" entry point with the label "Shapes your taste profile" to communicate its purpose to new users.

---

### Inbox Structure

The inbox has two visually distinct sections.

**Section 1 — Your JamGuru (pinned at top)**

Displayed above the normal recommendation list. Example layout:

```
🎵 YOUR JAMGURU

👑 Rahul
14 discoveries this month

[ View Recommendations ]
```

The JamGuru card is visually separated so users immediately understand: this is not a pinned chat, it is a special trust relationship. Potential visual indicators include a golden profile border, a crown icon, or a dedicated JamGuru card style.

**Section 2 — Discovery Messages**

Below the JamGuru section is the full recommendation inbox. By default it is sorted by **recommendation score** (sender trust score, highest first) so the song the user is most likely to enjoy appears at the top. The user can also switch to chronological order.

**Pre-discovered filtering:** If a friend sends a song the recipient has already liked, added to a playlist, or otherwise discovered, that recommendation is automatically filtered out of the All Recommendations view. It still appears in the per-friend DM conversation thread (because the friend did send it and it's part of the conversation history), but it is rendered quietly — dimmed with an "Already in your library" label — and does not show action buttons or increment the inbox badge. The inbox only surfaces songs that are genuinely new to the user.

---

### Recommendation Scoring System

**Core principle:** The system rewards recommendations that continue generating meaningful discovery — not users who send the most songs.

#### Daily Discovery Score

```
Daily Score = Likes Received Today / Recommendations Sent Today
```

Likes are counted on the day they are *received*, not the day the recommendation was originally sent. This means a recommendation shared days ago still contributes value if someone likes it today.

**Example:**

| Day | Recs Sent | Likes Received | Notes | Daily Score |
|---|---|---|---|---|
| Day 1 | 2 | 2 | 2 likes from today's recs | 1.0 |
| Day 3 | 2 | 3 | 2 new likes + 1 from an older rec | 1.5 |

#### Monthly Discovery Score

Each month is a season. Monthly score is the sum of all daily scores within that month.

```
Monthly Score = Σ Daily Scores (current month)
```

**Example:**

| Day | Daily Score |
|---|---|
| Day 1 | 1.0 |
| Day 2 | 0.8 |
| Day 3 | 1.5 |
| Monthly Total | **3.3** |

#### Live Score Updates

Scores update instantly whenever a user receives a new like:
- Daily score updates immediately.
- Monthly score updates immediately.
- Rankings update immediately.

This creates a continuous sense of progression and momentum.

#### Monthly Reset

At the start of every month, scores reset and a new season begins. JamGuru relationships are recalculated based on the new season's scores. This prevents permanent domination, gives newer users opportunities to earn JamGuru status, and keeps rankings fresh and relevant.

---

### JamGuru System

#### Definition

For every user, their JamGuru is the friend with the **highest Monthly Discovery Score** specific to them for that month.

Scores are calculated exclusively from that user's own interactions. Nothing else factors in:

| What counts | What does NOT count |
|---|---|
| Recommendations sent to Rahul | Total likes from other friends |
| Likes given by Rahul | Global popularity |
| | Group performance |
| | Number of followers |
| | Overall Spotify influence |

The only question the system answers is: *"How often do Rahul's interactions indicate that he likes recommendations from this specific person?"*

**Example — calculating Rahul's JamGuru:**

| Friend | Recs Sent to Rahul | Likes Given by Rahul | Monthly Score |
|---|---|---|---|
| Arpit | X | Y | Calculated only from Rahul's actions |
| Sarah | X | Y | Calculated only from Rahul's actions |
| Alex | X | Y | Calculated only from Rahul's actions |

Result → Arpit: 8.4, Sarah: 7.2, Alex: 5.8 → **JamGuru = Arpit**

#### Every User Has Their Own Private Trust Ranking

There is no global leaderboard. Every user has their own completely independent view. The same three people produce entirely different JamGurus depending on whose perspective you look from:

**Rahul's View**

| Friend | Score |
|---|---|
| Arpit | 8.4 |
| Sarah | 7.2 |
| Alex | 5.8 |

JamGuru = **Arpit**

**Sarah's View**

| Friend | Score |
|---|---|
| Rahul | 9.2 |
| Alex | 4.7 |
| Arpit | 3.1 |

JamGuru = **Rahul**

**Alex's View**

| Friend | Score |
|---|---|
| Sarah | 6.5 |
| Arpit | 5.2 |
| Rahul | 2.8 |

JamGuru = **Sarah**

This means Arpit can simultaneously be Rahul's JamGuru, Sarah's #4 recommender, and Alex's #2 recommender — with no contradiction and no universal rank. There are not one leaderboard but millions of tiny personal trust rankings, one per user.

> This is why the term "leaderboard" should be avoided internally. A leaderboard implies multiple people competing in a shared ranking. What JamGuru has is a **personalized trust ranking** — every user has their own version, and no two are the same.

#### How This Resolves Key Design Problems

**Small friend groups:** If Rahul only has one friend (Arpit), Arpit becomes JamGuru automatically. That is fine — JamGuru does not mean "best recommender on Spotify." It means "best recommender for Rahul."

**Competition and social anxiety:** Sarah does not know she is ranked below Arpit on Rahul's list. Arpit does not know he is ahead of Sarah. Rahul simply sees "Current JamGuru: Arpit." Nothing more is surfaced.

**Popularity bias:** A user with 10,000 friends does not automatically win anyone's JamGuru title. Because every person's ranking is calculated independently from their own interactions, reach and follower count are irrelevant.

#### Visibility Rules

**Users CAN see:**
- Their own JamGuru (name + discovery count this month).
- How many people they are currently JamGuru for (e.g., "JamGuru for 12 listeners").

**Users CANNOT see:**
- The list of specific people for whom they are JamGuru.
- Where they rank on any other user's personal trust ranking.
- Anyone else's score comparisons.

#### Definition (Refined)

> **JamGuru** is a personalized recommendation trust badge awarded to the friend whose recommendations have generated the highest discovery score for a specific user during the current month.

#### Philosophy

JamGuru is not a competition — it is a **trust signal**.

The system answers: *"Whose recommendations consistently work for me?"* rather than *"Who beat everyone else?"*

The title is meaningful precisely because it is personal and private. It reflects one specific relationship, not a universal rank.

---

### Group Discovery System

Groups are completely separate from personal JamGuru calculations. Group performance never affects personal JamGuru status.

#### Group Scoring

```
Group Daily Score = Likes Received Today / (Group Recommendations Sent Today × Group Size)
```

Normalizing by group size ensures fair comparison across groups of different scales.

**Example (Group Size = 20):**
```
Recommendations = 2
Likes = 10
Score = 10 / (2 × 20) = 0.25
```

Group scores only affect standings within that specific group.

Group recommendations are intentionally secondary — they exist to enable discovery in a shared space, not to clutter a user's personal inbox. Group recs never appear in the All Recommendations section of the Discovery Inbox. They are only accessible through the Group Conversation View. This keeps the personal inbox clean and focused on 1:1 trusted picks.

#### Group Taste Profile

Each group maintains a collective taste profile — a shared set of genres, moods, eras, and artists derived from member interactions and group activity. This profile can be set manually by any group member or generated automatically by AI based on the group's recommendation history. The group taste profile is used to inform AI song suggestions made within the group context.

---

### Anti-Spam Design

The system intentionally avoids the following mechanics:
- Daily or weekly recommendation limits.
- Minimum activity requirements.
- Inactivity penalties.
- Streak mechanics.

**Reason:** These mechanics encourage artificial behavior — sharing for the sake of maintaining a streak, not because the song is worth recommending.

Instead, the scoring formula naturally discourages spam: low-quality recommendations that receive no likes directly reduce a user's Daily Discovery Score, making thoughtful curation the optimal strategy.

---

### Recommendation Feedback & Actions

When a user receives a recommendation, they have several ways to respond.

**Like**

The primary positive action. Liking a recommendation:
- Adds the song to the liker's personal Liked Songs library (if not already there).
- Updates the sender's daily and monthly discovery scores.
- Updates the liker's personal trust ranking for that sender.
- Optionally triggers a tag feedback prompt.

After liking, a row of tag chips appears on the recommendation card. Tags describe why the song resonated. Examples:

- Great vocals
- Gym song
- Nostalgic
- Amazing lyrics
- Perfect road trip vibe

Users can select multiple tags or none. The tag picker is available both in the All Recommendations view and in the DM conversation view. Tags are stored against the like record and are visible to the sender when they open the conversation — so a tag added from All Recommendations still appears in the DM thread.

These tags serve two purposes:
1. Improve the quality of future recommendations between those two users.
2. Build richer context for AI suggestions over time.

**Dismiss**

Soft-hides a recommendation from the default inbox view without any scoring effect. The recommendation is not deleted — it can be un-dismissed. Dismiss is appropriate when the user simply isn't interested at the moment but doesn't want to penalize the sender.

**Dislike**

Signals that the recommendation genuinely missed the mark. The item is removed from the inbox and the signal is fed into the recipient's taste profile as a negative data point. Dislike does **not** penalize the sender's JamGuru score — it is purely a personal taste signal, not a social punishment.

Both dismiss and dislike are reversible with an immediate undo action.

---

### Song Requests

Beyond pushing recommendations, users can pull — requesting specific types of songs from friends.

**Templated Requests**

Rather than a free-text field (which creates friction and ambiguity), requests use structured templates with fill-in-the-blank placeholders. Six templates cover the most common request scenarios:

1. "Send me something good for **[mood/activity]**"
2. "I'm looking for something that sounds like **[artist/genre]**"
3. "What's a good **[era]** track I should know?"
4. "Recommend me something for **[occasion]**"
5. "I've been listening to a lot of **[genre]** lately — what's next?"
6. "Find me something that fits **[descriptor]**"

A tag picker lets the user fill in each placeholder from a curated set of options, reducing typing and making requests scannable at a glance.

**Receiving a Request**

When a friend sends a request, it appears in the conversation view with a "Pick a song" call-to-action. The recipient opens a reply picker that presents three sections:

1. **AI Suggestions** — AI ranks and suggests songs matching the request text, drawing from the recipient's library and generating external suggestions.
2. **Your Library** — the recipient's liked songs and playlists, ranked by AI relevance to the request.
3. **Search** — standard Spotify song search for anything not in the library.

Group song requests work identically but are broadcast to all group members; any member can fulfill the request.

---

### AI Integration

AI should not exist for the sake of AI. Every AI feature in JamGuru is designed to solve a specific friction point in the discovery or sharing flow — not to add complexity.

#### Taste Profile

The foundation for all AI features is the **taste profile** — a structured summary of each user's musical identity, expressed as:

- **Genres** (e.g., "Indie Rock", "Lo-Fi Hip Hop", "Afrobeats")
- **Moods** (e.g., "Melancholic", "Energetic", "Chill")
- **Eras** (e.g., "90s", "2010s", "Classic")
- **Artists** (anchor artists that represent the user's taste)

The taste profile is generated by AI from the user's liked songs and imported playlists, and can be edited manually or refreshed on demand. Groups have their own collective taste profile derived from member interactions and group feed history.

Tags are split into two categories:
- **Pinned** — manually added or confirmed by the user; never auto-removed.
- **AI-Discovered** — generated by the AI; the user can promote to pinned or dismiss them.

#### Personalized Home ("Picked For You")

When the user opens the Home page, a "Picked For You" section presents 3 daily AI-generated discovery picks — songs the user is likely to enjoy based on their taste profile and liked song history. Each call uses a randomly selected discovery angle (e.g., "similar mood to recently liked songs", "exploring an adjacent genre", "hidden gem from a familiar artist") to ensure variety across sessions.

#### AI Suggest in DMs (Library-First)

When a user opens a conversation with a friend, an "AI Suggest" button is available. On click, JamGuru:

1. **Library-first pass**: Searches the sender's liked songs and imported playlists for a song that matches the friend's taste profile. Before ranking, songs that the **recipient** has already liked, discovered, or received are filtered out — the goal is to surface something genuinely new to them, not something they already know.
2. **Fallback to external AI**: If the library yields no confident match, the AI generates a song suggestion based on the friend's taste profile and the mutual recommendation history between the two users. The AI prompt includes a NEVER list of songs the recipient already knows and songs already suggested this session.

The suggested song card remains visible during refresh rather than disappearing. A spinner on the refresh button communicates that a new suggestion is loading. Each suggestion is tracked in a session-level exclusion set so the same song is never suggested twice in the same conversation session.

#### AI Suggest in Groups

The same library-first approach applies within groups, using the group's collective taste profile instead of a single friend's profile. If the group has no taste profile yet, the AI falls back to analyzing recent group feed history.

#### AI-Powered Request Fulfillment

When responding to a song request, the reply picker's AI section is powered by two parallel operations:
- **Ranking**: the recipient's library is ranked by AI relevance to the request text.
- **Generation**: the AI generates up to 3 external song suggestions that match the request.

Both sets are merged, deduplicated, and presented in a combined reply picker.

#### AI Predict (Friend-Song Matching)

In the Share Panel, an "AI Predict" button ranks the user's friends by taste compatibility with the song being shared. This helps the sender quickly identify which friends are most likely to love the pick, making multi-friend sharing more intentional rather than broadcast.

#### AI Infrastructure

All AI calls route through a provider-agnostic wrapper that supports Groq, any OpenAI-compatible endpoint, or Anthropic Claude — configured via environment variables. This allows the AI backend to be swapped without touching feature code.

**Last.fm tag enrichment** runs asynchronously in the background for every newly cached song. It fetches genre and mood tags from Last.fm and stores them on the song record. These tags feed into AI prompts, improving suggestion quality without requiring manual tagging.

---

## Success Criteria

| Metric | Target |
|---|---|
| Weekly active sharers (at least 1 song shared/week) | 30% of users with 3+ Spotify friends |
| Like rate on shared recommendations | > 40% (vs. ~15% for algorithmic playlist tracks) |
| Session starts from Discovery Inbox | 20% of JamGuru-engaged users open Spotify via a feed notification |
| Retention lift (30-day) for JamGuru users vs. control | +8 percentage points |
| JamGuru title earned per active group | At least 1 per group of 3+ users within 4 weeks |
| AI suggestion adoption | 15% of DM threads use "AI Suggest" at least once per month |
| Song request completion rate | > 50% of sent requests receive a song reply within 48 hours |
| Library import rate | 40% of active users import at least one playlist within the first week |

---

## Open Questions — Resolved

| Question | Decision |
|---|---|
| Spam prevention cap | No cap needed. The scoring formula naturally penalizes low-quality spam — sending songs that get no likes hurts the sender's daily score. |
| Cold start (few Spotify friends) | Implement both: contacts import + in-app "find friends" by username search. |
| Notification fatigue | Real-time in-app updates delivered via Server-Sent Events (SSE). Web Push notifications sent for key events (new recommendations, likes, group activity) when the user is away from the app. |
| Score decay | No decay. Monthly reset handles freshness — each new month starts at zero. |
| JamGuru-for count visibility | Visible on public profile (e.g., "JamGuru for 12 listeners"). |
| Group scores affecting JamGuru | No. JamGuru score is strictly 1:1. Group scores are fully isolated and affect nothing outside the group. |
| Dislike impact on sender | Dislikes are personal taste signals only. They update the recipient's taste profile but do not affect the sender's discovery score or JamGuru standing. |
| Request templates vs. free text | Structured templates with tag pickers. Reduces friction, makes requests scannable, and gives AI better-structured input for generating relevant suggestions. |

---

## Final Product Vision

JamGuru transforms Spotify from a platform that *recommends music to users* into a platform where *trusted people help each other discover music*.

The key innovation is not the scoring system. The key innovation is the creation of a **lightweight trust network** where music discovery happens through people rather than purely through algorithms. JamGuru makes that trust visible — a named, earned relationship that represents consistent, meaningful discovery between two people.

The AI layer then amplifies discovery in multiple directions: personalizing the home feed, suggesting the right song for a specific friend, matching songs to requests, and helping users understand their own taste. Critically, the AI always operates with the history of specific relationships and personal libraries as its primary input — it acts as an assistant to human judgment, not a replacement for it.

Together, these systems create a discovery ecosystem focused on **increasing meaningful song discovery** rather than increasing recommendation volume.
