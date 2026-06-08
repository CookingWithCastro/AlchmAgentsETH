-- CreateTable
CREATE TABLE "AgentWordDuel" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL DEFAULT 'desktop-word-duel',
    "userId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'api',
    "planet" TEXT NOT NULL,
    "rack" TEXT NOT NULL,
    "candidateCount" INTEGER NOT NULL DEFAULT 0,
    "agentWord" TEXT NOT NULL,
    "agentRationale" TEXT,
    "agentScore" INTEGER NOT NULL DEFAULT 0,
    "playerWord" TEXT,
    "playerScore" INTEGER,
    "round" INTEGER,
    "roundDegree" INTEGER,
    "moveSource" TEXT NOT NULL DEFAULT 'model',
    "provider" TEXT,
    "modelUsed" TEXT,
    "fallbackUsed" BOOLEAN NOT NULL DEFAULT false,
    "latencyMs" INTEGER,
    "contextSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentWordDuel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentScrabbleMatch" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "matchKey" TEXT NOT NULL,
    "agentAId" TEXT NOT NULL,
    "agentBId" TEXT NOT NULL,
    "winnerId" TEXT,
    "loserId" TEXT,
    "tie" BOOLEAN NOT NULL DEFAULT false,
    "scoreA" INTEGER NOT NULL DEFAULT 0,
    "scoreB" INTEGER NOT NULL DEFAULT 0,
    "margin" INTEGER NOT NULL DEFAULT 0,
    "rounds" INTEGER NOT NULL DEFAULT 7,
    "seedUsed" INTEGER NOT NULL,
    "highlight" TEXT,
    "eloAAfter" INTEGER,
    "eloBAfter" INTEGER,
    "turns" JSONB,
    "costMode" TEXT NOT NULL DEFAULT 'deterministic',
    "totalLatencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentScrabbleMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentScrabbleStanding" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "played" INTEGER NOT NULL DEFAULT 0,
    "won" INTEGER NOT NULL DEFAULT 0,
    "lost" INTEGER NOT NULL DEFAULT 0,
    "tied" INTEGER NOT NULL DEFAULT 0,
    "pointsFor" INTEGER NOT NULL DEFAULT 0,
    "elo" INTEGER NOT NULL DEFAULT 1200,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentScrabbleStanding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentWordDuel_planet_idx" ON "AgentWordDuel"("planet");

-- CreateIndex
CREATE INDEX "AgentWordDuel_userId_idx" ON "AgentWordDuel"("userId");

-- CreateIndex
CREATE INDEX "AgentWordDuel_sessionId_idx" ON "AgentWordDuel"("sessionId");

-- CreateIndex
CREATE INDEX "AgentWordDuel_createdAt_idx" ON "AgentWordDuel"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AgentScrabbleMatch_matchKey_key" ON "AgentScrabbleMatch"("matchKey");

-- CreateIndex
CREATE INDEX "AgentScrabbleMatch_seasonId_idx" ON "AgentScrabbleMatch"("seasonId");

-- CreateIndex
CREATE INDEX "AgentScrabbleMatch_agentAId_idx" ON "AgentScrabbleMatch"("agentAId");

-- CreateIndex
CREATE INDEX "AgentScrabbleMatch_agentBId_idx" ON "AgentScrabbleMatch"("agentBId");

-- CreateIndex
CREATE INDEX "AgentScrabbleMatch_winnerId_idx" ON "AgentScrabbleMatch"("winnerId");

-- CreateIndex
CREATE INDEX "AgentScrabbleMatch_createdAt_idx" ON "AgentScrabbleMatch"("createdAt");

-- CreateIndex
CREATE INDEX "AgentScrabbleMatch_seasonId_agentAId_idx" ON "AgentScrabbleMatch"("seasonId", "agentAId");

-- CreateIndex
CREATE INDEX "AgentScrabbleStanding_seasonId_idx" ON "AgentScrabbleStanding"("seasonId");

-- CreateIndex
CREATE INDEX "AgentScrabbleStanding_elo_idx" ON "AgentScrabbleStanding"("elo");

-- CreateIndex
CREATE UNIQUE INDEX "AgentScrabbleStanding_seasonId_agentId_key" ON "AgentScrabbleStanding"("seasonId", "agentId");
