import { NextRequest, NextResponse } from "next/server";
import { CastMember } from "@/types/movie";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function cleanTitle(title: string): string {
  return (title || "")
    .toLowerCase()
    .replace(/[:\-–—_|/\\()]/g, " ")
    .replace(/\b(part\s*\d+|chapter\s*\d+|vol\s*\d+|the\s*movie|film|hindi|tamil|telugu|202\d)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Curated high-definition cast registry for verified instant lookup
const MOVIE_CAST_REGISTRY: Record<string, CastMember[]> = {
  ramayana: [
    {
      actorName: "Ranbir Kapoor",
      characterName: "Lord Rama / Parashurama",
      photoUrl: "https://upload.wikimedia.org/wikipedia/commons/5/5e/Ranbir_Kapoor_at_Ramayana_special_event_in_Sep_26_%28cropped%29.jpg",
    },
    {
      actorName: "Sai Pallavi",
      characterName: "Mata Sita",
      photoUrl: "https://upload.wikimedia.org/wikipedia/commons/4/40/Sai_Pallavi_at_Ramayana_launch_event_%28cropped%29.jpg",
    },
    {
      actorName: "Yash",
      characterName: "Ravana",
      photoUrl: "https://upload.wikimedia.org/wikipedia/commons/f/f8/Yash_Actor.jpg",
    },
    {
      actorName: "Sunny Deol",
      characterName: "Lord Hanuman",
      photoUrl: "https://upload.wikimedia.org/wikipedia/commons/d/d9/Sunny_Paaji_2024.jpg",
    },
    {
      actorName: "Ravi Dubey",
      characterName: "Lakshmana",
      photoUrl: "https://upload.wikimedia.org/wikipedia/commons/a/a1/Ravi_Dubey_at_the_screening_of_film_Article_15_in_2019_%28cropped%29.jpg",
    },
    {
      actorName: "Arun Govil",
      characterName: "King Dasharatha",
      photoUrl: "https://upload.wikimedia.org/wikipedia/commons/6/6e/Arun_Govil.jpg",
    },
    {
      actorName: "Lara Dutta",
      characterName: "Kaikeyi",
      photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Lara_Dutta_snapped_promoting_Ranneeti_%282%29.jpg/500px-Lara_Dutta_snapped_promoting_Ranneeti_%282%29.jpg",
    },
    {
      actorName: "Kajal Aggarwal",
      characterName: "Mandodari",
      photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Kajal_Aggarwal_at_Bhagavanth_Kesari_Trailer_Launch_%281%29.jpg/500px-Kajal_Aggarwal_at_Bhagavanth_Kesari_Trailer_Launch_%281%29.jpg",
    },
    {
      actorName: "Rakul Preet Singh",
      characterName: "Shurpanakha",
      photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Rakul_Preet_Singh_promoting_Cuttputlli_%28cropped%29.jpg/500px-Rakul_Preet_Singh_promoting_Cuttputlli_%28cropped%29.jpg",
    },
    {
      actorName: "Vivek Oberoi",
      characterName: "Vidyutjihva",
      photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Vivek_Oberoi_in_2018.jpg/500px-Vivek_Oberoi_in_2018.jpg",
    },
    {
      actorName: "Anupam Kher",
      characterName: "Jatayu (Voice-over)",
      photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Anupam_Kher_at_the_63rd_Filmfare_Awards.jpg/500px-Anupam_Kher_at_the_63rd_Filmfare_Awards.jpg",
    },
  ],
  vibe: [
    {
      actorName: "Kunal Khemu",
      characterName: "Hardik",
      photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Kunal_Khemu_snapped_at_the_trailer_launch_of_Lootcase.jpg/500px-Kunal_Khemu_snapped_at_the_trailer_launch_of_Lootcase.jpg",
    },
    {
      actorName: "Sparsh Shrivastava",
      characterName: "Bhagirath / Bugs",
      photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Sparsh_Shrivastava_at_Laapataa_Ladies_promotions.jpg/500px-Sparsh_Shrivastava_at_Laapataa_Ladies_promotions.jpg",
    },
    {
      actorName: "Sunny Singh",
      characterName: "Special Appearance",
      photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Sunny_Singh_at_Pyaar_Ka_Punchnama_2_promotions.jpg/500px-Sunny_Singh_at_Pyaar_Ka_Punchnama_2_promotions.jpg",
    },
    {
      actorName: "Abu Al-Sed",
      characterName: "Terrorist Commander",
      photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    },
  ],
  kalki: [
    {
      actorName: "Prabhas",
      characterName: "Bhairava",
      photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Prabhas_at_the_Kalki_2898_AD_event.jpg/500px-Prabhas_at_the_Kalki_2898_AD_event.jpg",
    },
    {
      actorName: "Amitabh Bachchan",
      characterName: "Ashwatthama",
      photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Amitabh_Bachchan_2015.jpg/500px-Amitabh_Bachchan_2015.jpg",
    },
    {
      actorName: "Kamal Haasan",
      characterName: "Supreme Yaskin",
      photoUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a3/Kamal_Haasan_at_2023_San_Diego_Comic-Con_International_by_Gage_Skidmore%2C_005_%28cropped%29.jpg/500px-Kamal_Haasan_at_2023_San_Diego_Comic-Con_International_by_Gage_Skidmore%2C_005_%28cropped%29.jpg",
    },
    {
      actorName: "Deepika Padukone",
      characterName: "SUM-80 alias Sumathi",
      photoUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d3/Deepika_Padukone_2025_%281%29.png/500px-Deepika_Padukone_2025_%281%29.png",
    },
    {
      actorName: "Disha Patani",
      characterName: "Roxie",
      photoUrl: "https://upload.wikimedia.org/wikipedia/commons/2/23/Disha_Patani_grace_the_premiere_of_Awarapan_2_%28cropped%29.jpg",
    },
    {
      actorName: "Brahmanandam",
      characterName: "Rajan",
      photoUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/72/Brahmanandam_at_ANR_Awards.png/500px-Brahmanandam_at_ANR_Awards.png",
    },
  ],
  interstellar: [
    {
      actorName: "Matthew McConaughey",
      characterName: "Joseph Cooper",
      photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Matthew_McConaughey_-_2019_%28cropped%29.jpg/500px-Matthew_McConaughey_-_2019_%28cropped%29.jpg",
    },
    {
      actorName: "Anne Hathaway",
      characterName: "Dr. Amelia Brand",
      photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Anne_Hathaway_at_The_Idea_of_You_premiere_2024_%28cropped%29.jpg/500px-Anne_Hathaway_at_The_Idea_of_You_premiere_2024_%28cropped%29.jpg",
    },
    {
      actorName: "Jessica Chastain",
      characterName: "Murphy Cooper",
      photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Jessica_Chastain_Cannes_2017.jpg/500px-Jessica_Chastain_Cannes_2017.jpg",
    },
    {
      actorName: "Michael Caine",
      characterName: "Professor John Brand",
      photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Michael_Caine_at_2015_Karlovy_Vary_Film_Festival.jpg/500px-Michael_Caine_at_2015_Karlovy_Vary_Film_Festival.jpg",
    },
    {
      actorName: "Matt Damon",
      characterName: "Dr. Mann",
      photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Matt_Damon_TIFF_2015.jpg/500px-Matt_Damon_TIFF_2015.jpg",
    },
    {
      actorName: "Timothée Chalamet",
      characterName: "Young Tom Cooper",
      photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Timoth%C3%A9e_Chalamet_2019_by_Glenn_Francis.jpg/500px-Timoth%C3%A9e_Chalamet_2019_by_Glenn_Francis.jpg",
    },
  ],
  animal: [
    {
      actorName: "Ranbir Kapoor",
      characterName: "Ranvijay Singh / Aziz Haque",
      photoUrl: "https://upload.wikimedia.org/wikipedia/commons/5/5e/Ranbir_Kapoor_at_Ramayana_special_event_in_Sep_26_%28cropped%29.jpg",
    },
    {
      actorName: "Anil Kapoor",
      characterName: "Balbir Singh",
      photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Anil_Kapoor_at_Vogue_Beauty_Awards_2018.jpg/500px-Anil_Kapoor_at_Vogue_Beauty_Awards_2018.jpg",
    },
    {
      actorName: "Bobby Deol",
      characterName: "Abrar Haque",
      photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Bobby_Deol_in_2018.jpg/500px-Bobby_Deol_in_2018.jpg",
    },
    {
      actorName: "Rashmika Mandanna",
      characterName: "Geetanjali Singh",
      photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Rashmika_Mandanna_at_Mission_Majnu_Promotions.jpg/500px-Rashmika_Mandanna_at_Mission_Majnu_Promotions.jpg",
    },
    {
      actorName: "Triptii Dimri",
      characterName: "Zoya",
      photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Tripti_Dimri_at_Vogue_Forces_of_Fashion_%28cropped%29.jpg/500px-Tripti_Dimri_at_Vogue_Forces_of_Fashion_%28cropped%29.jpg",
    },
  ],
  jawan: [
    {
      actorName: "Shah Rukh Khan",
      characterName: "Vikram Rathore / Azad",
      photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Shah_Rukh_Khan_graces_the_launch_of_the_new_Santro.jpg/500px-Shah_Rukh_Khan_graces_the_launch_of_the_new_Santro.jpg",
    },
    {
      actorName: "Nayanthara",
      characterName: "Narmada Rai",
      photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Nayanthara_at_SIIMA_2016.jpg/500px-Nayanthara_at_SIIMA_2016.jpg",
    },
    {
      actorName: "Vijay Sethupathi",
      characterName: "Kaalie Gaikwad",
      photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/Vijay_Sethupathi_at_the_press_meet_of_Sangathamizhan.jpg/500px-Vijay_Sethupathi_at_the_press_meet_of_Sangathamizhan.jpg",
    },
    {
      actorName: "Deepika Padukone",
      characterName: "Aishwarya Rathore",
      photoUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d3/Deepika_Padukone_2025_%281%29.png/500px-Deepika_Padukone_2025_%281%29.png",
    },
    {
      actorName: "Priyamani",
      characterName: "Lakshmi",
      photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Priyamani_at_Filmfare_Awards_South_2013.jpg/500px-Priyamani_at_Filmfare_Awards_South_2013.jpg",
    },
    {
      actorName: "Sanya Malhotra",
      characterName: "Dr. Eeram",
      photoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Sanya_Malhotra_at_the_screening_of_Pagglait.jpg/500px-Sanya_Malhotra_at_the_screening_of_Pagglait.jpg",
    },
  ],
};

async function fetchWikipediaCast(movieTitle: string): Promise<CastMember[]> {
  try {
    const searchUrl =
      "https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=" +
      encodeURIComponent(movieTitle.trim() + " film") +
      "&format=json";

    const sRes = await fetch(searchUrl, { headers: { "User-Agent": "CineNova/1.0" } }).then((r) => r.json());
    const searchResults = sRes.query?.search || [];
    if (searchResults.length === 0) return [];

    const pageTitle = searchResults[0].title;
    const parseUrl =
      "https://en.wikipedia.org/w/api.php?action=parse&page=" +
      encodeURIComponent(pageTitle) +
      "&prop=wikitext&format=json";

    const pRes = await fetch(parseUrl, { headers: { "User-Agent": "CineNova/1.0" } }).then((r) => r.json());
    const wikitext = pRes.parse?.wikitext?.["*"] || "";

    const castIdx = wikitext.search(/==\s*Cast\s*==/i);
    if (castIdx === -1) return [];

    const castSection = wikitext.substring(castIdx, castIdx + 4500).split(/==\s*[^=]+\s*==/)[1] || "";
    const lines = castSection.split("\n");
    const rawCast: Array<{ actorName: string; characterName: string; wikiTitle: string }> = [];

    for (const line of lines) {
      const clean = line.replace(/<!--.*?-->/g, "").trim();
      if (!clean.startsWith("*")) continue;

      const match = clean.match(/^\*\s*(?:\[\[([^|\]]+)(?:\|([^\]]+))?\]\]|([^[|]+?))\s*(?:as|—|-|:)\s*(.+)$/i);
      if (match) {
        const rawWiki = (match[1] || match[3] || "").trim();
        const displayName = (match[2] || match[1] || match[3] || "").trim();
        let role = match[4]
          .replace(/\[\[(?:[^|\]]+\|)?([^\]]+)\]\]/g, "$1")
          .replace(/\{\{.*?\}\}/g, "")
          .trim();
        role = role.split(/\n|<br/)[0].replace(/[,;].*$/, "").trim();

        if (displayName && role && !displayName.includes("{{") && !displayName.startsWith("http")) {
          rawCast.push({
            actorName: displayName,
            characterName: role,
            wikiTitle: rawWiki,
          });
        }
      }
      if (rawCast.length >= 16) break;
    }

    if (rawCast.length === 0) return [];

    // Batch query portrait thumbnails from Wikipedia
    const titlesToQuery = rawCast.map((c) => c.wikiTitle).filter(Boolean);
    const imageMap = new Map<string, string>();

    try {
      const imgUrl =
        "https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&titles=" +
        titlesToQuery.map(encodeURIComponent).join("|") +
        "&pithumbsize=500&format=json";
      const imgRes = await fetch(imgUrl, { headers: { "User-Agent": "CineNova/1.0" } }).then((r) => r.json());
      const pages = Object.values<any>(imgRes.query?.pages || {});
      for (const p of pages) {
        if (p.title && p.thumbnail?.source) {
          imageMap.set(p.title.toLowerCase(), p.thumbnail.source);
        }
      }
    } catch (err) {
      console.warn("Error fetching Wikipedia actor pageimages:", err);
    }

    return rawCast.map((c, i) => {
      const thumb =
        imageMap.get(c.wikiTitle.toLowerCase()) ||
        imageMap.get(c.actorName.toLowerCase()) ||
        `https://images.unsplash.com/photo-${1500000000000 + (i * 23456789) % 100000000}?auto=format&fit=crop&w=400&q=80`;
      return {
        actorName: c.actorName,
        characterName: c.characterName,
        photoUrl: thumb,
      };
    });
  } catch (err) {
    console.error("Error fetching Wikipedia cast:", err);
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const { title } = await req.json();
    const movieTitle = typeof title === "string" ? title.trim() : "";

    if (!movieTitle || movieTitle.length < 2) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid movie title." },
        { status: 400 }
      );
    }

    const rawLower = movieTitle.toLowerCase().trim();
    const cleaned = cleanTitle(movieTitle);

    // 1. Check curated registry first for verified high-res portraits
    for (const [key, castList] of Object.entries(MOVIE_CAST_REGISTRY)) {
      const keyLower = key.toLowerCase();
      const keyCleaned = cleanTitle(key);

      if (
        rawLower === keyLower ||
        cleaned === keyCleaned ||
        (cleaned && keyCleaned && (cleaned.includes(keyCleaned) || keyCleaned.includes(cleaned))) ||
        (keyLower && rawLower.includes(keyLower))
      ) {
        return NextResponse.json({
          success: true,
          source: "curated",
          movieTitle,
          count: castList.length,
          cast: castList,
        });
      }
    }

    // 2. Dynamic online search from Wikipedia
    const onlineCast = await fetchWikipediaCast(movieTitle);
    if (onlineCast.length > 0) {
      return NextResponse.json({
        success: true,
        source: "wikipedia",
        movieTitle,
        count: onlineCast.length,
        cast: onlineCast,
      });
    }

    return NextResponse.json({
      success: false,
      error: `Could not find cast details for "${movieTitle}". You can add actors manually.`,
      cast: [],
    });
  } catch (err: any) {
    console.error("Error in fetch-cast route:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to auto-fetch cast members." },
      { status: 500 }
    );
  }
}

