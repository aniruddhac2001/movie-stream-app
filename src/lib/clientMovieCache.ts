import { Movie } from "@/types/movie";
import initialMoviesJson from "@/data/initialMovies.json";

const defaultMovies = (initialMoviesJson as Movie[]) || [];
const MEMORY_CACHE = new Map<string, Movie>(defaultMovies.map((m) => [m.id, m]));
let ALL_MOVIES_CACHE: Movie[] | null = defaultMovies.length > 0 ? defaultMovies : null;

const STORAGE_KEY_ALL = "cinenova_cached_movies";
const STORAGE_PREFIX_MOVIE = "cinenova_movie_";

export function setCachedMovies(movies: Movie[]): void {
  ALL_MOVIES_CACHE = movies;
  for (const m of movies) {
    if (m?.id) {
      MEMORY_CACHE.set(m.id, m);
    }
  }
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(STORAGE_KEY_ALL, JSON.stringify(movies));
    } catch {
      // ignore quota / storage errors
    }
  }
}

export function setCachedMovie(movie: Movie): void {
  if (!movie?.id) return;
  MEMORY_CACHE.set(movie.id, movie);
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(`${STORAGE_PREFIX_MOVIE}${movie.id}`, JSON.stringify(movie));
    } catch {
      // ignore
    }
  }
}

/**
 * Synchronous in-memory lookup.
 * Safe to use during render without causing SSR / client hydration mismatches,
 * because it relies solely on in-session JavaScript RAM.
 */
export function getMemoryMovie(id: string): Movie | null {
  if (!id) return null;
  if (MEMORY_CACHE.has(id)) {
    return MEMORY_CACHE.get(id)!;
  }
  if (ALL_MOVIES_CACHE) {
    const found = ALL_MOVIES_CACHE.find((m) => m.id === id);
    if (found) {
      MEMORY_CACHE.set(id, found);
      return found;
    }
  }
  return null;
}

export function getMemoryMovies(): Movie[] | null {
  return ALL_MOVIES_CACHE && ALL_MOVIES_CACHE.length > 0 ? ALL_MOVIES_CACHE : null;
}

/**
 * Full cache lookup including sessionStorage.
 * Call only inside useEffect or event handlers (after hydration) to avoid SSR hydration mismatches.
 */
export function getCachedMovies(): Movie[] | null {
  if (ALL_MOVIES_CACHE && ALL_MOVIES_CACHE.length > 0) {
    return ALL_MOVIES_CACHE;
  }
  if (typeof window !== "undefined") {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY_ALL);
      if (stored) {
        const parsed = JSON.parse(stored) as Movie[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          ALL_MOVIES_CACHE = parsed;
          for (const m of parsed) {
            if (m?.id) MEMORY_CACHE.set(m.id, m);
          }
          return parsed;
        }
      }
    } catch {
      // ignore parse errors
    }
  }
  return null;
}

export function getCachedMovie(id: string): Movie | null {
  const memory = getMemoryMovie(id);
  if (memory) return memory;

  if (typeof window !== "undefined") {
    try {
      const stored = sessionStorage.getItem(`${STORAGE_PREFIX_MOVIE}${id}`);
      if (stored) {
        const parsed = JSON.parse(stored) as Movie;
        if (parsed?.id) {
          MEMORY_CACHE.set(id, parsed);
          return parsed;
        }
      }
    } catch {
      // ignore
    }
  }
  return null;
}
