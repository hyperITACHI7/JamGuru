const axios = require('axios');
const qs    = require('querystring');

const CLIENT_ID     = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI  = process.env.SPOTIFY_REDIRECT_URI;

const ACCOUNTS_BASE = 'https://accounts.spotify.com';
const API_BASE      = 'https://api.spotify.com/v1';

const SCOPES = [
  'user-read-private',
  'user-read-email',
  'user-library-read',
  'playlist-read-private',
  'playlist-read-collaborative',
].join(' ');

function getAuthUrl(state) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id:     CLIENT_ID,
    scope:         SCOPES,
    redirect_uri:  REDIRECT_URI,
    state,
    show_dialog:   'true',
  });
  return `${ACCOUNTS_BASE}/authorize?${params}`;
}

async function exchangeCode(code) {
  const res = await axios.post(
    `${ACCOUNTS_BASE}/api/token`,
    qs.stringify({
      grant_type:   'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
    }),
    {
      headers: {
        'Content-Type':  'application/x-www-form-urlencoded',
        Authorization:   'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
      },
    }
  );
  return res.data; // { access_token, refresh_token, expires_in }
}

async function refreshAccessToken(refreshToken) {
  const res = await axios.post(
    `${ACCOUNTS_BASE}/api/token`,
    qs.stringify({
      grant_type:    'refresh_token',
      refresh_token: refreshToken,
    }),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization:  'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
      },
    }
  );
  return res.data.access_token;
}

// Decode Spotify JWT access token to extract user ID without an API call.
// Spotify access tokens have been JWTs since 2024; sub = "spotify:user:<id>".
function decodeSpotifyToken(accessToken) {
  try {
    const parts = accessToken.split('.');
    if (parts.length !== 3) return null;
    const pad = (4 - (parts[1].length % 4)) % 4;
    const payload = JSON.parse(
      Buffer.from(parts[1] + '='.repeat(pad), 'base64').toString('utf8')
    );
    // sub is "spotify:user:<id>" or just "<id>"
    const sub = payload.sub || '';
    const id  = sub.startsWith('spotify:user:') ? sub.slice('spotify:user:'.length) : sub;
    return id || null;
  } catch (_) {
    return null;
  }
}

async function getSpotifyProfile(accessToken) {
  try {
    const res = await axios.get(`${API_BASE}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return res.data;
  } catch (err) {
    // If Premium restriction is still active, fall back to JWT decode
    if (err.response?.status === 403) {
      const localId = decodeSpotifyToken(accessToken);
      if (localId) return { id: localId, display_name: null, images: [] };
    }
    throw err;
  }
}

// Returns all liked tracks (handles pagination)
async function getLikedTracks(accessToken) {
  const tracks = [];
  let url = `${API_BASE}/me/tracks?limit=50`;

  while (url) {
    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const { items, next } = res.data;
    for (const item of items) {
      const t = item.track;
      if (!t || !t.id) continue;
      tracks.push({
        spotifyId:   t.id,
        title:       t.name,
        artist:      t.artists.map(a => a.name).join(', '),
        album:       t.album.name,
        albumArtUrl: t.album.images[0]?.url ?? null,
        previewUrl:  t.preview_url ?? null,
      });
    }
    url = next;
  }

  return tracks;
}

// Fetch a short-lived app-level token using client credentials (no user needed)
async function getClientCredentialsToken() {
  const res = await axios.post(
    `${ACCOUNTS_BASE}/api/token`,
    qs.stringify({ grant_type: 'client_credentials' }),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization:  'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
      },
    }
  );
  return res.data.access_token;
}

// Fetch playlist metadata + all tracks (paginates automatically)
// Returns { name, description, coverUrl, tracks }
async function getPlaylistTracks(playlistId, accessToken) {
  const tracks = [];

  // Step 1: get metadata (name, cover) from the base playlist endpoint
  const playlistRes = await axios.get(`${API_BASE}/playlists/${playlistId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = playlistRes.data;
  console.log('[getPlaylistTracks] tracks keys:', Object.keys(data.tracks || {}));
  console.log('[getPlaylistTracks] tracks.total:', data.tracks?.total, 'items:', data.tracks?.items?.length, 'href:', data.tracks?.href?.slice(0, 80));
  if (data.tracks?.items?.length > 0) {
    console.log('[getPlaylistTracks] first item sample:', JSON.stringify(data.tracks.items[0]).slice(0, 300));
  }
  const meta = {
    name:        data.name || 'Imported Playlist',
    description: data.description || null,
    coverUrl:    data.images?.[0]?.url ?? null,
  };

  function extractItems(items) {
    for (const item of (items || [])) {
      const t = item?.track;
      if (!t || !t.id) continue;
      if (t.type && t.type !== 'track') continue;
      tracks.push({
        spotifyId:   t.id,
        title:       t.name,
        artist:      (t.artists || []).map(a => a.name).join(', '),
        album:       t.album?.name ?? '',
        albumArtUrl: t.album?.images?.[0]?.url ?? null,
        previewUrl:  t.preview_url ?? null,
      });
    }
  }

  // Step 2: try embedded tracks first (fast path)
  extractItems(data.tracks?.items);
  const total = data.tracks?.total ?? 0;
  console.log(`[getPlaylistTracks] "${data.name}" total=${total} embedded=${tracks.length} hasTracks=${data.tracks != null}`);

  // Step 3: fetch via /tracks endpoint when:
  //   - tracks field is absent from the response (data.tracks == null)
  //   - or embedded items are fewer than total (pagination needed)
  let nextUrl = (data.tracks == null || tracks.length < total)
    ? `${API_BASE}/playlists/${playlistId}/tracks?limit=100`
    : data.tracks?.next;

  while (nextUrl) {
    console.log(`[getPlaylistTracks] GET ${nextUrl.slice(0, 100)}`);
    try {
      const res = await axios.get(nextUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
      const before = tracks.length;
      extractItems(res.data.items);
      console.log(`[getPlaylistTracks] paginated +${tracks.length - before} (total so far: ${tracks.length})`);
      nextUrl = res.data.next;
    } catch (err) {
      console.error(`[getPlaylistTracks] tracks fetch error ${err.response?.status}:`, JSON.stringify(err.response?.data));
      throw err;
    }
  }

  console.log(`[getPlaylistTracks] done, extracted ${tracks.length} tracks`);
  return { ...meta, tracks };
}

module.exports = { getAuthUrl, exchangeCode, refreshAccessToken, getSpotifyProfile, getLikedTracks, getClientCredentialsToken, getPlaylistTracks };
