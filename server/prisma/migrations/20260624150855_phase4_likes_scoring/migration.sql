-- CreateTable
CREATE TABLE "likes" (
    "id" TEXT NOT NULL,
    "recommendation_id" TEXT NOT NULL,
    "liker_id" TEXT NOT NULL,
    "liked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "like_feedback" (
    "id" TEXT NOT NULL,
    "like_id" TEXT NOT NULL,
    "tag" TEXT NOT NULL,

    CONSTRAINT "like_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_scores" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "month" DATE NOT NULL,
    "monthly_score" DECIMAL(10,4) NOT NULL DEFAULT 0,

    CONSTRAINT "monthly_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personal_trust_rankings" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "friend_id" TEXT NOT NULL,
    "month" DATE NOT NULL,
    "likes_given" INTEGER NOT NULL DEFAULT 0,
    "recs_received" INTEGER NOT NULL DEFAULT 0,
    "trust_score" DECIMAL(10,4) NOT NULL DEFAULT 0,

    CONSTRAINT "personal_trust_rankings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "likes_recommendation_id_liker_id_key" ON "likes"("recommendation_id", "liker_id");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_scores_user_id_month_key" ON "monthly_scores"("user_id", "month");

-- CreateIndex
CREATE UNIQUE INDEX "personal_trust_rankings_owner_id_friend_id_month_key" ON "personal_trust_rankings"("owner_id", "friend_id", "month");

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_recommendation_id_fkey" FOREIGN KEY ("recommendation_id") REFERENCES "recommendations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_liker_id_fkey" FOREIGN KEY ("liker_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "like_feedback" ADD CONSTRAINT "like_feedback_like_id_fkey" FOREIGN KEY ("like_id") REFERENCES "likes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_scores" ADD CONSTRAINT "monthly_scores_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_trust_rankings" ADD CONSTRAINT "personal_trust_rankings_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_trust_rankings" ADD CONSTRAINT "personal_trust_rankings_friend_id_fkey" FOREIGN KEY ("friend_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
