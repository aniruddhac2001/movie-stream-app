/**
 * Universal Image Resolution Optimizer & Auto-Enhancer
 * Automatically transforms low-resolution thumbnail URLs into pristine Ultra-HD (1080p / 1440p / 4K) versions.
 */

// Known curated high-resolution backdrops for titles that may have low-res web scraps
const KNOWN_TITLE_HD_BANNERS: Record<string, string> = {
  "ramayana": "https://images.ctfassets.net/3sjsytt3tkv5/1r5I3Vo3KGNk4VKbH9j4WN/6efdfa1cbe79d5fc4d2b8ee76f6bdcca/YT_Final_cover.png",
  "ramayana - part 1": "https://images.ctfassets.net/3sjsytt3tkv5/1r5I3Vo3KGNk4VKbH9j4WN/6efdfa1cbe79d5fc4d2b8ee76f6bdcca/YT_Final_cover.png",
  "ramayana: part 1": "https://images.ctfassets.net/3sjsytt3tkv5/1r5I3Vo3KGNk4VKbH9j4WN/6efdfa1cbe79d5fc4d2b8ee76f6bdcca/YT_Final_cover.png",
  "vibe": "https://cf-images.assettype.com/cinemaexpress%2F2026-08-20%2F7ll340m7%2Fvibe-poster.jpeg?w=1920&auto=format&fit=max",
};

/**
 * Automatically converts any image URL into its highest available resolution
 * @param url The input image URL (often a low-res thumbnail or compressed preview)
 * @param type 'banner' | 'poster'
 * @param movieTitle Optional movie title for smart master lookup
 */
export function toHighResImageUrl(
  url: string | undefined | null,
  type: "banner" | "poster" = "banner",
  movieTitle?: string
): string {
  if (!url || typeof url !== "string") return "";
  let cleanUrl = url.trim();
  if (!cleanUrl) return "";

  // 1. If it's a known movie title and the existing URL is a known low-res scrap (like The Hindu 1200px news scrap)
  if (movieTitle && type === "banner") {
    const norm = movieTitle.toLowerCase().trim();
    if (KNOWN_TITLE_HD_BANNERS[norm]) {
      if (
        cleanUrl.includes("th-i.thgim.com") ||
        cleanUrl.includes("FREE_1200") ||
        cleanUrl.includes("article70791353") ||
        cleanUrl.includes("w=480") ||
        cleanUrl.includes("w=400") ||
        cleanUrl.includes("s320")
      ) {
        return KNOWN_TITLE_HD_BANNERS[norm];
      }
    }
  }

  try {
    const urlObj = new URL(cleanUrl);
    const host = urlObj.hostname.toLowerCase();
    const targetWidth = type === "banner" ? 2560 : 1200;

    // A. TMDB Images (image.tmdb.org)
    // Replace /w300/, /w500/, /w780/, /w1280/ with /original/
    if (host.includes("image.tmdb.org")) {
      cleanUrl = cleanUrl.replace(/\/t\/p\/w\d+\//i, "/t/p/original/");
      return cleanUrl;
    }

    // B. IMDb / Amazon Media (m.media-amazon.com, images-na.ssl-images-amazon.com)
    // IMDb URLs have resizing suffixes like _V1_UX500_CR0,0,500,281_AL_.jpg
    // Stripping back to _V1_.jpg serves the original master full-resolution uncompressed asset
    if (host.includes("media-amazon.com") || host.includes("ssl-images-amazon.com")) {
      cleanUrl = cleanUrl.replace(/_V1_.*?\.(jpg|jpeg|png|webp)/i, "_V1_.$1");
      return cleanUrl;
    }

    // C. AssetType / CinemaExpress (cf-images.assettype.com)
    // e.g. ?w=480&auto=format,compress&fit=max -> ?w=2560&auto=format&fit=max
    if (host.includes("assettype.com")) {
      urlObj.searchParams.set("w", String(targetWidth));
      urlObj.searchParams.set("auto", "format");
      urlObj.searchParams.set("fit", "max");
      return urlObj.toString();
    }

    // D. District.in CDN (cdn.district.in)
    // e.g. ?im=Resize,width=400 -> ?im=Resize,width=1920
    if (host.includes("district.in")) {
      const im = urlObj.searchParams.get("im");
      if (im && im.includes("width=")) {
        urlObj.searchParams.set("im", im.replace(/width=\d+/i, `width=${targetWidth}`));
        return urlObj.toString();
      }
    }

    // E. Contentful Assets (images.ctfassets.net)
    if (host.includes("ctfassets.net")) {
      if (urlObj.searchParams.has("w")) {
        urlObj.searchParams.set("w", String(targetWidth));
        urlObj.searchParams.set("q", "90");
        return urlObj.toString();
      }
    }

    // F. Google User Content / Blogspot (*.googleusercontent.com, *.bp.blogspot.com)
    // Parameter like =s320, =w600, =w1200-h800 -> =s0 or =s2560
    if (host.includes("googleusercontent.com") || host.includes("blogspot.com")) {
      if (cleanUrl.includes("=")) {
        cleanUrl = cleanUrl.replace(/=([swh]\d+(-[a-z0-9]+)*)$/i, `=s${targetWidth}`);
        return cleanUrl;
      }
    }

    // G. YouTube Thumbnails (i.ytimg.com, img.youtube.com)
    // /hqdefault.jpg, /mqdefault.jpg, /sddefault.jpg -> /maxresdefault.jpg
    if (host.includes("ytimg.com") || host.includes("youtube.com")) {
      cleanUrl = cleanUrl.replace(/\/(?:hq|mq|sd|default)\.jpg$/i, "/maxresdefault.jpg");
      return cleanUrl;
    }

    // H. Unsplash (images.unsplash.com)
    if (host.includes("unsplash.com")) {
      urlObj.searchParams.set("w", String(targetWidth));
      urlObj.searchParams.set("q", "95");
      urlObj.searchParams.set("auto", "format");
      return urlObj.toString();
    }

    // I. Wikimedia Commons (upload.wikimedia.org)
    // /thumb/a/ab/File.jpg/NNNpx-File.jpg -> original /a/ab/File.jpg
    if (host.includes("wikimedia.org") && cleanUrl.includes("/thumb/")) {
      cleanUrl = cleanUrl.replace(/\/thumb(\/.*)\/[^/]+$/, "$1");
      return cleanUrl;
    }

    // J. Cloudinary (res.cloudinary.com)
    if (host.includes("cloudinary.com")) {
      cleanUrl = cleanUrl.replace(/\/w_\d+([,/])/i, `/w_${targetWidth}$1`);
      cleanUrl = cleanUrl.replace(/\/q_\d+([,/])/i, `/q_auto:best$1`);
      return cleanUrl;
    }

    // K. Generic Width Parameters (w=..., width=..., max_width=...)
    let modified = false;
    for (const key of ["w", "width", "max_width", "maxWidth", "sz", "size"]) {
      const val = urlObj.searchParams.get(key);
      if (val && !isNaN(Number(val)) && Number(val) < 1200) {
        urlObj.searchParams.set(key, String(targetWidth));
        modified = true;
      }
    }
    if (modified) {
      return urlObj.toString();
    }
  } catch {
    // If not a standard URL, fallback to regex patterns
  }

  // Regex Fallbacks for non-parsed patterns
  // Replace ?w=NNN or &w=NNN where NNN < 1200
  cleanUrl = cleanUrl.replace(/([?&]w=)(\d+)/i, (match, prefix, num) => {
    return parseInt(num, 10) < 1200 ? `${prefix}${type === "banner" ? 2560 : 1200}` : match;
  });

  return cleanUrl;
}

export interface QualityAnalysis {
  isLowRes: boolean;
  canAutoUpgrade: boolean;
  estimatedQuality: "4K Ultra HD" | "1080p Full HD" | "720p HD" | "Low Res Preview";
  suggestedUrl: string;
  reason: string;
}

/**
 * Analyzes an image URL to determine its quality status and whether it can be auto-upgraded
 */
export function analyzeImageResolution(
  url: string,
  type: "banner" | "poster" = "banner",
  movieTitle?: string
): QualityAnalysis {
  if (!url || !url.trim()) {
    return {
      isLowRes: false,
      canAutoUpgrade: false,
      estimatedQuality: "1080p Full HD",
      suggestedUrl: url,
      reason: "No image provided",
    };
  }

  const upgraded = toHighResImageUrl(url, type, movieTitle);
  const canAutoUpgrade = upgraded !== url;

  const lower = url.toLowerCase();
  let isLowRes = false;
  let estimatedQuality: QualityAnalysis["estimatedQuality"] = "1080p Full HD";
  let reason = "High resolution";

  if (
    lower.includes("w=480") ||
    lower.includes("w=400") ||
    lower.includes("w=300") ||
    lower.includes("w=320") ||
    lower.includes("width=400") ||
    lower.includes("/w300/") ||
    lower.includes("/w500/") ||
    lower.includes("free_1200") ||
    lower.includes("free_660") ||
    lower.includes("hqdefault") ||
    lower.includes("=s320") ||
    lower.includes("=s400") ||
    lower.includes("thumb")
  ) {
    isLowRes = true;
    estimatedQuality = "Low Res Preview";
    reason = "Detected low-resolution thumbnail or downscaled preview parameter";
  } else if (
    lower.includes("2560") ||
    lower.includes("3840") ||
    lower.includes("original") ||
    lower.includes("maxresdefault") ||
    lower.includes("4k")
  ) {
    estimatedQuality = "4K Ultra HD";
    isLowRes = false;
    reason = "Pristine Ultra-HD master detected";
  }

  return {
    isLowRes: isLowRes || canAutoUpgrade,
    canAutoUpgrade,
    estimatedQuality,
    suggestedUrl: upgraded,
    reason,
  };
}
