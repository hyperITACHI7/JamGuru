const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Every song in a user's playlist must be in song_likes.
  // Any song_dislike that conflicts with a playlist entry must be removed.
  const playlistSongs = await prisma.playlistSong.findMany({
    include: { playlist: { select: { userId: true } } },
  });

  console.log(`Processing ${playlistSongs.length} playlist-song entries across all users...`);

  let liked = 0;
  let dislikesCleared = 0;

  for (const ps of playlistSongs) {
    const { userId } = ps.playlist;
    const { spotifyId } = ps;

    await prisma.songLike.upsert({
      where: { userId_spotifyId: { userId, spotifyId } },
      create: { userId, spotifyId },
      update: {},
    });
    liked++;

    const { count } = await prisma.songDislike.deleteMany({
      where: { userId, spotifyId },
    });
    dislikesCleared += count;
  }

  console.log(`Done. Ensured ${liked} song likes. Cleared ${dislikesCleared} conflicting dislikes.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
