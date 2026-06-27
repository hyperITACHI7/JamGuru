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
- Recommend songs to individual friends.
- Recommend songs to groups.
- Add optional context explaining why they are recommending the song.

Examples of context:
- "Perfect for late-night drives."
- "The guitar solo is insane."
- "Sounds like old Arctic Monkeys."

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

Below the JamGuru section is the full recommendation inbox. Users can sort by:
- Latest recommendation.
- Recommendation score.

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

### Recommendation Feedback

When a user likes a recommendation, they can optionally explain why it resonated. Examples:

- Great vocals
- Gym song
- Nostalgic
- Amazing lyrics
- Perfect road trip vibe

This feedback serves two purposes:
1. Improves the quality of future recommendations between those two users.
2. Builds a richer shared understanding of each other's music taste over time.

---

### AI Integration

AI should not exist for the sake of AI. Potential future roles within JamGuru:

- Understand *why* recommendations between two specific users have succeeded historically.
- Extract taste patterns from feedback tags and listening behavior.
- Identify recurring recommendation themes and moods for a user pair.

**Primary AI feature:** When opening a music-sharing thread with any friend, a **"Recommend with AI"** button is available. Based on data collected *only between those two users* (their shared history, feedback, and mutual listening patterns), the AI suggests a song that the sender likes and the recipient is likely to enjoy.

This keeps AI suggestions personal and contextual, not generic — the AI acts as an assistant to human judgment, not a replacement for it.

---

## Success Criteria

| Metric | Target |
|---|---|
| Weekly active sharers (at least 1 song shared/week) | 30% of users with 3+ Spotify friends |
| Like rate on shared recommendations | > 40% (vs. ~15% for algorithmic playlist tracks) |
| Session starts from Discovery Inbox | 20% of JamGuru-engaged users open Spotify via a feed notification |
| Retention lift (30-day) for JamGuru users vs. control | +8 percentage points |
| JamGuru title earned per active group | At least 1 per group of 3+ users within 4 weeks |
| AI recommendation adoption | 15% of threads use "Recommend with AI" at least once per month |

---

## Open Questions — Resolved

| Question | Decision |
|---|---|
| Spam prevention cap | No cap needed. The scoring formula naturally penalizes low-quality spam — sending songs that get no likes hurts the sender's daily score. |
| Cold start (few Spotify friends) | Implement both: contacts import + in-app "find friends" by username search. |
| Notification fatigue | No device notifications in the prototype. |
| Score decay | No decay. Monthly reset handles freshness — each new month starts at zero. |
| JamGuru-for count visibility | Visible on public profile (e.g., "JamGuru for 12 listeners"). |
| Group scores affecting JamGuru | No. JamGuru score is strictly 1:1. Group scores are fully isolated and affect nothing outside the group. |

---

## Final Product Vision

JamGuru transforms Spotify from a platform that *recommends music to users* into a platform where *trusted people help each other discover music*.

The key innovation is not the scoring system. The key innovation is the creation of a **lightweight trust network** where music discovery happens through people rather than purely through algorithms. JamGuru makes that trust visible — a named, earned relationship that represents consistent, meaningful discovery between two people. The AI layer then helps surface discovery opportunities that might otherwise be missed, using the history of that specific relationship as its only input.

Together, these systems create a discovery ecosystem focused on **increasing meaningful song discovery** rather than increasing recommendation volume.
