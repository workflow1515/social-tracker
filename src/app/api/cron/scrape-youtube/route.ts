import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchYouTubeChannel } from "@/lib/youtube";

// ── POST /api/cron/scrape-youtube ─────────────────────────────────────────────
// Protected by CRON_SECRET Bearer token.
// Fetches fresh stats from YouTube API for all tracked channels
// and saves a new snapshot for each.

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured." }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch all YouTube accounts
  const accounts = await prisma.socialAccount.findMany({
    where: { network: "youtube" },
    select: { id: true, external_id: true, name: true },
  });

  if (accounts.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, errors: [] });
  }

  const errors: { id: string; name: string; error: string }[] = [];
  let processed = 0;

  // Process accounts sequentially to avoid hammering the YouTube API
  for (const account of accounts) {
    try {
      const data = await fetchYouTubeChannel(account.external_id);

      if (!data) {
        errors.push({ id: account.id, name: account.name, error: "Channel not found" });
        continue;
      }

      // Save snapshot
      await prisma.socialSnapshot.create({
        data: {
          account_id: account.id,
          followers:  data.subscribers,
          views:      data.views,
        },
      });

      // Update account name / avatar in case they changed
      await prisma.socialAccount.update({
        where: { id: account.id },
        data:  {
          name:       data.name,
          avatar_url: data.avatarUrl,
        },
      });

      processed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ id: account.id, name: account.name, error: msg });
    }
  }

  return NextResponse.json({
    ok:        true,
    processed,
    errors,
    total:     accounts.length,
  });
}
