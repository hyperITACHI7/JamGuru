// Music metadata powered by the iTunes Search API (free, no auth required).
// The module surface is identical to the original Spotify spec so routes/frontend
// need no changes.  Track IDs are iTunes numeric IDs stored as strings.
const axios = require('axios');

const ITUNES_BASE = 'https://itunes.apple.com';

// ── In-memory search cache (60s TTL, max 500 entries) ────────────────────────

const _cache = new Map();
const SEARCH_TTL = 60_000;

function getCached(key) {
  const entry = _cache.get(key);
  if (entry && Date.now() - entry.ts < SEARCH_TTL) return entry.data;
  return null;
}

function setCached(key, data) {
  _cache.set(key, { data, ts: Date.now() });
  if (_cache.size > 500) _cache.delete(_cache.keys().next().value);
}

// ── Formatters ────────────────────────────────────────────────────────────────

function formatTrack(item) {
  const art = item.artworkUrl100
    ? item.artworkUrl100.replace('100x100bb', '600x600bb')
    : null;
  return {
    spotifyId:   String(item.trackId),
    title:       item.trackName,
    artist:      item.artistName,
    album:       item.collectionName || item.artistName || '',
    albumArtUrl: art,
    previewUrl:  item.previewUrl || null,
  };
}

// iTunes RSS entry format differs from search result format
function formatRssEntry(entry) {
  const art = entry['im:image']?.[2]?.label || null; // 170x170 image
  const bigArt = art ? art.replace('170x170bb', '600x600bb') : null;
  return {
    spotifyId:   entry.id?.attributes?.['im:id'] ?? String(Math.random()),
    title:       entry['im:name']?.label ?? 'Unknown',
    artist:      entry['im:artist']?.label ?? 'Unknown',
    album:       entry['im:collection']?.['im:name']?.label ?? '',
    albumArtUrl: bigArt,
    previewUrl:  null,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

async function searchTracks(query) {
  const key = `search:${query.toLowerCase().trim()}`;
  const cached = getCached(key);
  if (cached) return cached;

  const res = await axios.get(`${ITUNES_BASE}/search`, {
    params: {
      term:    query,
      media:   'music',
      entity:  'song',
      limit:   20,
      country: 'in',
    },
    timeout: 8000,
  });

  const results = (res.data.results || [])
    .filter(r => r.kind === 'song' && r.trackId)
    .map(formatTrack);

  setCached(key, results);
  return results;
}

async function getTrack(trackId) {
  const key = `track:${trackId}`;
  const cached = getCached(key);
  if (cached) return cached;

  const res = await axios.get(`${ITUNES_BASE}/lookup`, {
    params: { id: trackId, entity: 'song' },
    timeout: 8000,
  });

  const item = (res.data.results || []).find(r => r.kind === 'song');
  if (!item) throw Object.assign(new Error('Track not found'), { response: { status: 404 } });

  const track = formatTrack(item);
  setCached(key, track);
  return track;
}

async function getNewReleases() {
  const key = 'new-releases';
  const cached = getCached(key);
  if (cached) return cached;

  // iTunes top songs chart for India — closest analogue to "new/trending releases"
  const res = await axios.get(
    `${ITUNES_BASE}/in/rss/topsongs/limit=25/json`,
    { timeout: 8000 }
  );

  const entries = res.data?.feed?.entry ?? [];
  const results = entries.map(formatRssEntry);
  setCached(key, results);
  return results;
}

module.exports = { searchTracks, getTrack, getNewReleases };
