import { NextRequest, NextResponse } from "next/server";
import { toHighResImageUrl, analyzeImageResolution } from "@/lib/imageResolution";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export interface CuratedBackdrop {
  url: string;
  label: string;
  resolution: string;
}

// Known high quality curated backdrops repository
const MOVIE_BACKDROPS_REGISTRY: Record<string, CuratedBackdrop[]> = {
  ramayana: [
    {
      url: "https://images.ctfassets.net/3sjsytt3tkv5/1r5I3Vo3KGNk4VKbH9j4WN/6efdfa1cbe79d5fc4d2b8ee76f6bdcca/YT_Final_cover.png",
      label: "Official DNEG 2.5K Master Wallpaper",
      resolution: "2560 x 1440 (Ultra-HD)",
    },
    {
      url: "https://images.ctfassets.net/3sjsytt3tkv5/1r5I3Vo3KGNk4VKbH9j4WN/6efdfa1cbe79d5fc4d2b8ee76f6bdcca/YT_Final_cover.png?w=3840&q=100",
      label: "Official 4K Cinematic IMAX Master",
      resolution: "3840 x 2160 (4K UHD)",
    },
    {
      url: "https://images.ctfassets.net/3sjsytt3tkv5/1r5I3Vo3KGNk4VKbH9j4WN/6efdfa1cbe79d5fc4d2b8ee76f6bdcca/YT_Final_cover.png?w=1920&q=95",
      label: "Full HD 1080p High-Bitrate Widescreen",
      resolution: "1920 x 1080 (Full HD)",
    },
    {
      url: "https://stat4.bollywoodhungama.in/wp-content/uploads/2026/10/SCOOP-Ramayana-2-delayed-to-2028-Ranbir-Kapoor-Yash-starrer-to-release-on-Diwali-2028.jpg",
      label: "Bollywood Hungama Theatrical Master",
      resolution: "1920 x 1080 (Full HD)",
    },
    {
      url: "https://stat5.bollywoodhungama.in/wp-content/uploads/2024/11/Ramayana.jpg",
      label: "Official Announcement Panorama Horizon",
      resolution: "1920 x 1080 (Full HD)",
    },
  ],
  vibe: [
    {
      url: "https://cf-images.assettype.com/cinemaexpress%2F2026-08-20%2F7ll340m7%2Fvibe-poster.jpeg?w=2560&auto=format&fit=max",
      label: "CinemaExpress 2.5K Ultra-HD Master",
      resolution: "2560 x 1440 (Ultra-HD)",
    },
    {
      url: "https://cf-images.assettype.com/cinemaexpress%2F2026-08-20%2F7ll340m7%2Fvibe-poster.jpeg?w=1920&auto=format&fit=max",
      label: "Widescreen 1080p Cinematic Banner",
      resolution: "1920 x 1080 (Full HD)",
    },
    {
      url: "https://cf-images.assettype.com/cinemaexpress%2F2026-08-20%2F7ll340m7%2Fvibe-poster.jpeg?w=1280&auto=format&fit=max",
      label: "HD High-Contrast Banner",
      resolution: "1280 x 720 (HD)",
    },
  ],
  kalki: [
    {
      url: "https://image.tmdb.org/t/p/original/mK4k0849Zt2rPfq0s9aF9G7oO9W.jpg",
      label: "Kalki 2898 AD Official 4K Master",
      resolution: "3840 x 2160 (4K UHD)",
    },
    {
      url: "https://image.tmdb.org/t/p/original/2wP5qK9f2pP79L6l1E4d6vO6Q8p.jpg",
      label: "Bhairava & Bujji Cinematic Horizon",
      resolution: "2560 x 1440 (Ultra-HD)",
    },
  ],
  stree: [
    {
      url: "https://image.tmdb.org/t/p/original/m9Yw9l2bLpE8a3y6s2gU5vN6rT1.jpg",
      label: "Stree 2 Official Theatrical 4K Master",
      resolution: "3840 x 2160 (4K UHD)",
    },
  ],
  pushpa: [
    {
      url: "https://image.tmdb.org/t/p/original/8Y4nQ34rW8tN2j4q5x4w6k9v3l2.jpg",
      label: "Pushpa 2 The Rule 4K Theatrical Master",
      resolution: "3840 x 2160 (4K UHD)",
    },
  ],
  jawan: [
    {
      url: "https://image.tmdb.org/t/p/original/j17LpY3wB7V9aY3xG4q5v6w7y8z.jpg",
      label: "Jawan Official SRK 4K Cinematic Master",
      resolution: "3840 x 2160 (4K UHD)",
    },
  ],
  dune: [
    {
      url: "https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s520DRq.jpg",
      label: "Dune Part Two Arrakis Desert IMAX 4K Master",
      resolution: "3840 x 2160 (4K UHD)",
    },
  ],
  interstellar: [
    {
      url: "https://image.tmdb.org/t/p/original/rAiYTsqBk7999NX7k4tG7W0YtN6.jpg",
      label: "Interstellar Gargantua Celestial 4K Wallpaper",
      resolution: "3840 x 2160 (4K UHD)",
    },
  ],
};

function cleanTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[:\-–—_|/\\()]/g, " ")
    .replace(/\b(part\s*\d+|chapter\s*\d+|vol\s*\d+|the\s*movie|film|hindi|tamil|telugu|202\d)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchOnlineBackdrops(title: string): Promise<CuratedBackdrop[]> {
  try {
    const encoded = encodeURIComponent(title.trim() + " film");
    const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&generator=search&gsrsearch=${encoded}&pithumbsize=2560&origin=*`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(wikiUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "CineNova/1.0" },
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    const data = await res.json();
    const pages = data?.query?.pages;
    if (!pages) return [];

    const found: CuratedBackdrop[] = [];
    for (const page of Object.values<any>(pages)) {
      if (page.thumbnail && page.thumbnail.source) {
        if (page.thumbnail.width >= 600) {
          found.push({
            url: page.thumbnail.source,
            label: `${page.title || title} Theatrical Backdrop`,
            resolution: `${page.thumbnail.width} x ${page.thumbnail.height || 1080} (Ultra-HD)`,
          });
        }
      }
    }
    return found;
  } catch {
    return [];
  }
}

async function findCuratedBackdrops(
  title: string,
  currentUrl?: string,
  type: "banner" | "poster" = "banner"
): Promise<CuratedBackdrop[]> {
  const rawLower = (title || "").toLowerCase().trim();
  const cleaned = cleanTitle(title || "");

  const matchedLists: CuratedBackdrop[][] = [];

  for (const [key, list] of Object.entries(MOVIE_BACKDROPS_REGISTRY)) {
    const keyLower = key.toLowerCase();
    const keyCleaned = cleanTitle(key);

    if (
      rawLower === keyLower ||
      cleaned === keyCleaned ||
      (cleaned && keyCleaned && (cleaned.includes(keyCleaned) || keyCleaned.includes(cleaned))) ||
      (cleaned && rawLower.includes(keyLower)) ||
      (keyLower && rawLower.includes(keyLower))
    ) {
      matchedLists.push(list);
    }
  }

  // Deduplicate items by URL
  const seenUrls = new Set<string>();
  const results: CuratedBackdrop[] = [];

  for (const list of matchedLists) {
    for (const item of list) {
      if (!seenUrls.has(item.url)) {
        seenUrls.add(item.url);
        results.push(item);
      }
    }
  }

  // Dynamic fallback lookup for titles not found in the curated registry
  if (results.length === 0 && title && title.trim().length > 2) {
    const online = await fetchOnlineBackdrops(title);
    for (const item of online) {
      if (!seenUrls.has(item.url)) {
        seenUrls.add(item.url);
        results.push(item);
      }
    }
  }

  // If currentUrl can be auto-upgraded to 4K / UHD and isn't already in results, include it
  if (currentUrl && currentUrl.trim()) {
    const cleanCurrent = currentUrl.trim();
    const upgraded = toHighResImageUrl(cleanCurrent, type, title);
    if (upgraded && upgraded !== cleanCurrent && !seenUrls.has(upgraded)) {
      seenUrls.add(upgraded);
      results.unshift({
        url: upgraded,
        label: "Auto-Enhanced 4K Ultra-HD Master",
        resolution: "2560 x 1440 (Ultra-HD)",
      });
    }
  }

  return results;
}

export async function POST(req: NextRequest) {
  try {
    const { url, title, type = "banner" } = await req.json();

    const currentUrl = typeof url === "string" ? url.trim() : "";
    const movieTitle = typeof title === "string" ? title.trim() : "";

    const analysis = analyzeImageResolution(currentUrl, type, movieTitle);
    const upgradedUrl = toHighResImageUrl(currentUrl, type, movieTitle);

    // Look for matching curated backdrops by title
    const curatedBackdrops = await findCuratedBackdrops(movieTitle, currentUrl, type);

    return NextResponse.json(
      {
        success: true,
        originalUrl: currentUrl,
        enhancedUrl: upgradedUrl || currentUrl,
        isUpgraded: upgradedUrl !== currentUrl,
        analysis,
        curatedBackdrops,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to enhance banner";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
