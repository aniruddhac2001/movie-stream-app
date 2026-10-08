export interface CastMember {
  id?: string;
  actorName: string;
  characterName: string;
  photoUrl?: string;
}

export interface CrewMember {
  id?: string;
  name: string;
  role: string;
  photoUrl?: string;
}

export interface ImageItem {
  url: string;
  filename?: string;
}

export interface Movie {
  id: string;
  _id?: string;
  title: string;
  synopsis: string;
  genre: string[];
  releaseDate: string; // YYYY-MM-DD
  posterImage?: ImageItem[];
  bannerImage?: ImageItem[];
  screenshots?: ImageItem[];
  trailerUrl?: string;
  hasFullMovie: boolean;
  fullMovieUrl?: string;
  downloadUrl?: string;
  featured?: boolean;
  rating?: number;
  duration?: string;
  director?: string;
  cast?: CastMember[];
  crew?: CrewMember[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export type MovieStatus = "available_now" | "upcoming" | "available_soon";

export function isMovieUpcoming(releaseDate?: string): boolean {
  if (!releaseDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const release = new Date(releaseDate.includes("T") ? releaseDate : releaseDate + "T00:00:00");
  return !isNaN(release.getTime()) && release > today;
}

export function hasMovieLink(movie?: Partial<Movie> | null): boolean {
  if (!movie) return false;
  const full = typeof movie.fullMovieUrl === "string" ? movie.fullMovieUrl.trim() : "";
  const dl = typeof movie.downloadUrl === "string" ? movie.downloadUrl.trim() : "";
  return Boolean(movie.hasFullMovie || full.length > 0 || dl.length > 0);
}

export function getMovieStatus(
  releaseDateOrMovie?: string | Partial<Movie> | null,
  hasFullMovieArg?: boolean
): MovieStatus {
  if (!releaseDateOrMovie) return "available_soon";

  let releaseDate: string | undefined;
  let hasLink = false;

  if (typeof releaseDateOrMovie === "object") {
    releaseDate = releaseDateOrMovie.releaseDate;
    hasLink = hasMovieLink(releaseDateOrMovie);
  } else {
    releaseDate = releaseDateOrMovie;
    hasLink = Boolean(hasFullMovieArg);
  }

  // 1. Release date is still in the future -> Coming Soon
  if (isMovieUpcoming(releaseDate)) {
    return "upcoming";
  }

  // 2. Release date has arrived or passed:
  // If movie link has been received -> Available Now
  // If NO movie link received -> Automatically change to Available Soon
  return hasLink ? "available_now" : "available_soon";
}

