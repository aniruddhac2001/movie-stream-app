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

export function getMovieStatus(releaseDate?: string, hasFullMovie?: boolean): MovieStatus {
  if (isMovieUpcoming(releaseDate)) {
    return "upcoming";
  }
  return hasFullMovie ? "available_now" : "available_soon";
}

