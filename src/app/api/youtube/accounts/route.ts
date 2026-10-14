import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { fetchYouTubeChannel, parseYouTubeInput } from "@/lib/youtube";

// ── GET /api/youtube/accounts ─────────────────────────────────────────────────
export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user  = session.user;
  const admin = isAdmin(user);

  let accounts;

  if (admin) {
    accounts = await prisma.socialAccount.findMany({
      where:   { network: "youtube" },
      include: { creator: { select: { name: true } } },
      orderBy: { created_at: "asc" },
    });
  } else {
    const grants = await prisma.userAccess.findMany({
      where:  { user_id: user.id, network: "youtube" },
      select: { creator_id: true, see_all: true },
    });

    if (grants.length === 0) {
      return NextResponse.json([]);
    }

    const seeAllCreatorIds  = grants.filter((g) => g.see_all).map((g) => g.creator_id);
    const ownOnlyCreatorIds = grants.filter((g) => !g.see_all).map((g) => g.creator_id);

    accounts = await prisma.socialAccount.findMany({
      where: {
        network: "youtube",
        OR: [
          ...(seeAllCreatorIds.length  > 0 ? [{ creator_id: { in: seeAllCreatorIds } }] : []),
          ...(ownOnlyCreatorIds.length > 0 ? [{ creator_id: { in: ownOnlyCreatorIds }, added_by_id: user.id }] : []),
        ],
      },
      include: { creator: { select: { name: true } } },
      orderBy: { created_at: "asc" },
    });
  }

  return NextResponse.json(accounts);
}

// ── POST /api/youtube/accounts ────────────────────────────────────────────────
// Body: { input: string, creator_id: string }
export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { input?: string; creator_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rawInput = body.input?.trim();
  if (!rawInput) {
    return NextResponse.json({ error: "Channel URL, ID, or handle is required." }, { status: 400 });
  }

  const creatorId = body.creator_id?.trim();
  if (!creatorId) {
    return NextResponse.json({ error: "Please select a creator." }, { status: 400 });
  }

  // Verify creator exists
  const creator = await prisma.creator.findUnique({ where: { id: creatorId } });
  if (!creator) {
    return NextResponse.json({ error: "Creator not found." }, { status: 404 });
  }

  // Parse input to a channel ID or handle
  const channelRef = parseYouTubeInput(rawInput);

  // Fetch from YouTube API
  let channelData;
  try {
    channelData = await fetchYouTubeChannel(channelRef);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "YouTube API error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  if (!channelData) {
    return NextResponse.json({ error: "Channel not found. Check the URL or handle." }, { status: 404 });
  }

  // Check for duplicate
  const existing = await prisma.socialAccount.findUnique({
    where: { network_external_id: { network: "youtube", external_id: channelData.channelId } },
  });
  if (existing) {
    return NextResponse.json({ error: "This channel is already being tracked." }, { status: 409 });
  }

  // Create account + first snapshot in a transaction
  const account = await prisma.$transaction(async (tx) => {
    const acc = await tx.socialAccount.create({
      data: {
        network:     "youtube",
        external_id: channelData.channelId,
        creator_id:  creatorId,
        added_by_id: session.user.id,
        name:        channelData.name,
        avatar_url:  channelData.avatarUrl,
        handle:      channelData.handle,
      },
    });

    await tx.socialSnapshot.create({
      data: {
        account_id:  acc.id,
        followers:   channelData.subscribers,
        views:       channelData.views,
        video_count: channelData.videoCount,
      },
    });

    return acc;
  });

  return NextResponse.json(account, { status: 201 });
}
