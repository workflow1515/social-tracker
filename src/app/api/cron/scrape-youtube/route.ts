import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchYouTubeChannel } from "@/lib/youtube";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured." }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accounts = await prisma.socialAccount.findMany({
    where: { network: "youtube" },
    select: { id: true, external_id: true, name: true },
  });

  if (accounts.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, errors: [] });
  }

  const errors: { id: string; name: string; error: string }[] = [];
  let processed = 0;

  for (const account of accounts) {
    try {
      const data = await fetchYouTubeChannel(account.external_id);

      if (!data) {
        errors.push({ id: account.id, name: account.name, error: "Channel not found" });
        continue;
      }

      await prisma.socialSnapshot.create({
        data: {
          account_id:  account.id,
          followers:   data.subscribers,
          views:       data.views,
          video_count: data.videoCount,
        },
      });

      await prisma.socialAccount.update({
        where: { id: account.id },
        data:  { name: data.name, avatar_url: data.avatarUrl, handle: data.handle },
      });

      processed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ id: account.id, name: account.name, error: msg });
    }
  }

  return NextResponse.json({ ok: true, processed, errors, total: accounts.length });
}
