-- CreateTable
CREATE TABLE "song_likes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "spotify_id" TEXT NOT NULL,
    "liked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "song_likes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "song_likes_user_id_spotify_id_key" ON "song_likes"("user_id", "spotify_id");

-- AddForeignKey
ALTER TABLE "song_likes" ADD CONSTRAINT "song_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "song_likes" ADD CONSTRAINT "song_likes_spotify_id_fkey" FOREIGN KEY ("spotify_id") REFERENCES "songs"("spotify_id") ON DELETE CASCADE ON UPDATE CASCADE;
