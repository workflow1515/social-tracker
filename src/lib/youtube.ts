// Fetches channel stats from YouTube Data API v3

export interface YouTubeChannelData {
  channelId: string
  name: string
  avatarUrl: string | null
  subscribers: number
  views: bigint
}

/**
 * Fetch a YouTube channel by channel ID (UCxxx) or @handle.
 * Returns null if the channel is not found or the API key is missing.
 */
export async function fetchYouTubeChannel(
  channelIdOrHandle: string
): Promise<YouTubeChannelData | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error("YOUTUBE_API_KEY is not set");
  }

  // Determine whether we're looking up by ID or handle
  const isHandle = channelIdOrHandle.startsWith("@");
  const isChannelId = channelIdOrHandle.startsWith("UC") && !channelIdOrHandle.startsWith("@");

  let url: string;
  if (isHandle) {
    const handle = channelIdOrHandle.slice(1); // strip leading @
    url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forHandle=${encodeURIComponent(handle)}&key=${apiKey}`;
  } else if (isChannelId) {
    url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${encodeURIComponent(channelIdOrHandle)}&key=${apiKey}`;
  } else {
    // Try as a handle without the @
    url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forHandle=${encodeURIComponent(channelIdOrHandle)}&key=${apiKey}`;
  }

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`YouTube API error ${res.status}: ${text}`);
  }

  const data = await res.json();

  if (!data.items || data.items.length === 0) {
    return null;
  }

  const item = data.items[0];
  const snippet = item.snippet ?? {};
  const stats = item.statistics ?? {};

  return {
    channelId:   item.id as string,
    name:        snippet.title ?? "Unknown",
    avatarUrl:   snippet.thumbnails?.default?.url ?? snippet.thumbnails?.medium?.url ?? null,
    subscribers: parseInt(stats.subscriberCount ?? "0", 10),
    views:       BigInt(stats.viewCount ?? "0"),
  };
}

/**
 * Extract a YouTube channel ID or handle from a URL or raw input.
 * Supports:
 *   - https://www.youtube.com/channel/UCxxx
 *   - https://www.youtube.com/@handle
 *   - https://www.youtube.com/c/name  (treated as handle)
 *   - Raw UCxxx
 *   - Raw @handle
 */
export function parseYouTubeInput(input: string): string {
  const trimmed = input.trim();

  // Try to parse as URL
  try {
    const u = new URL(trimmed);
    const pathParts = u.pathname.split("/").filter(Boolean);

    if (pathParts[0] === "channel" && pathParts[1]) {
      return pathParts[1]; // UCxxx
    }
    if (pathParts[0]?.startsWith("@")) {
      return pathParts[0]; // @handle
    }
    if (pathParts[0] === "c" && pathParts[1]) {
      return `@${pathParts[1]}`; // treat /c/name as @name
    }
    if (pathParts[0] === "user" && pathParts[1]) {
      return `@${pathParts[1]}`; // treat /user/name as @name
    }
    // youtube.com/@handle (handle is at root)
    if (pathParts.length === 1 && !pathParts[0].startsWith("@")) {
      return `@${pathParts[0]}`;
    }
  } catch {
    // Not a URL, use as-is
  }

  return trimmed;
}
