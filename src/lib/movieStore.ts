import { Movie, isMovieUpcoming } from "@/types/movie";
import { getDb, getFirebaseStatus } from "./firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";

import initialMoviesJson from "@/data/initialMovies.json";
import {
  fetchMoviesFromRest,
  fetchMovieByIdFromRest,
  saveMovieToRest,
  deleteMovieFromRest,
} from "./firestoreRest";
import { toHighResImageUrl } from "./imageResolution";

export function normalizeMovieImages(m: Movie): Movie {
  if (!m) return m;
  return {
    ...m,
    bannerImage: (m.bannerImage || []).map((img) => ({
      ...img,
      url: toHighResImageUrl(img.url, "banner", m.title),
    })),
    posterImage: (m.posterImage || []).map((img) => ({
      ...img,
      url: toHighResImageUrl(img.url, "poster", m.title),
    })),
  };
}

// In-memory fallback cache seeded with initial movie data
let fallbackMovies: Movie[] = ((initialMoviesJson as Movie[]) || []).map(normalizeMovieImages);

export async function getAllMovies(): Promise<{
  movies: Movie[];
  source: "firebase" | "memory";
  firebaseStatus: ReturnType<typeof getFirebaseStatus>;
}> {
  const firebaseStatus = getFirebaseStatus();

  // 1. Primary fast path: direct REST API (fastest, 0 gRPC timeout on Vercel serverless)
  try {
    const restMovies = await fetchMoviesFromRest(4000);
    if (restMovies !== null && restMovies.length > 0) {
      fallbackMovies = restMovies.map(normalizeMovieImages);
      return { movies: fallbackMovies, source: "firebase", firebaseStatus };
    }
  } catch (err) {
    console.warn("REST fetch fallback:", err);
  }

  // 2. Secondary path: Firebase JS SDK
  const db = getDb();
  if (db) {
    try {
      const colRef = collection(db, "movies");
      const snapshot = await getDocs(colRef);
      const movies: Movie[] = snapshot.docs.map((d) => normalizeMovieImages(d.data() as Movie));

      movies.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });

      fallbackMovies = movies;
      return { movies, source: "firebase", firebaseStatus };
    } catch (err) {
      console.warn("⚠️ [Firebase] Could not fetch movies from Firestore SDK:", err);
    }
  }

  return { movies: fallbackMovies, source: "memory", firebaseStatus };
}

export async function getMovieById(id: string): Promise<{
  movie: Movie | null;
  cast: { actorName: string; characterName: string; photoUrl?: string }[];
  crew: { name: string; role: string; photoUrl?: string }[];
  source: "firebase" | "memory";
}> {
  // 1. Direct REST API fast path
  try {
    const restMovie = await fetchMovieByIdFromRest(id, 3000);
    if (restMovie) {
      const normalized = normalizeMovieImages(restMovie);
      return {
        movie: normalized,
        cast: normalized.cast || [],
        crew: normalized.crew || [],
        source: "firebase",
      };
    }
  } catch (e) {
    console.warn("REST movie lookup error:", e);
  }

  // 2. Firebase SDK path
  const db = getDb();
  if (db) {
    try {
      const docRef = doc(db, "movies", id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const movie = normalizeMovieImages(snap.data() as Movie);
        return {
          movie,
          cast: movie.cast || [],
          crew: movie.crew || [],
          source: "firebase",
        };
      }
    } catch (err) {
      console.warn("⚠️ [Firebase] Firestore lookup failed:", err);
    }
  }

  const found = fallbackMovies.find((m) => m.id === id);
  const normalized = found ? normalizeMovieImages(found) : null;
  return {
    movie: normalized,
    cast: normalized?.cast || [],
    crew: normalized?.crew || [],
    source: "memory",
  };
}

export async function saveMovie(movieData: Partial<Movie>): Promise<{
  movie: Movie;
  source: "firebase" | "memory";
}> {
  const id = movieData.id || `movie-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const isUpcoming = isMovieUpcoming(movieData.releaseDate);
  const cleanMovie: Movie = {
    id,
    title: movieData.title || "Untitled Movie",
    synopsis: movieData.synopsis || "",
    genre: movieData.genre || ["Action"],
    releaseDate: movieData.releaseDate || new Date().toISOString().split("T")[0],
    posterImage: (movieData.posterImage || []).map((img) => ({
      ...img,
      url: toHighResImageUrl(img.url, "poster", movieData.title),
    })),
    bannerImage: (movieData.bannerImage || []).map((img) => ({
      ...img,
      url: toHighResImageUrl(img.url, "banner", movieData.title),
    })),
    screenshots: movieData.screenshots || [],
    trailerUrl: movieData.trailerUrl ? movieData.trailerUrl.trim() : "",
    hasFullMovie: Boolean(
      movieData.hasFullMovie ||
      (movieData.fullMovieUrl && movieData.fullMovieUrl.trim().length > 0) ||
      (movieData.downloadUrl && movieData.downloadUrl.trim().length > 0)
    ),
    fullMovieUrl: movieData.fullMovieUrl ? movieData.fullMovieUrl.trim() : "",
    downloadUrl: movieData.downloadUrl ? movieData.downloadUrl.trim() : "",
    featured: isUpcoming ? false : Boolean(movieData.featured),
    duration: movieData.duration || "2h 00m",
    director: movieData.director || "",
    cast: movieData.cast || [],
    crew: movieData.crew || [],
    updatedAt: new Date().toISOString(),
    createdAt: movieData.createdAt || new Date().toISOString(),
  };

  if (typeof movieData.rating === "number" && !isNaN(movieData.rating)) {
    cleanMovie.rating = movieData.rating;
  }

  // If this movie is set as featured, unfeature others in memory
  if (cleanMovie.featured) {
    fallbackMovies.forEach((m) => {
      if (m.id !== cleanMovie.id) m.featured = false;
    });
  }

  const existingIdx = fallbackMovies.findIndex((m) => m.id === cleanMovie.id);
  if (existingIdx >= 0) {
    fallbackMovies[existingIdx] = { ...fallbackMovies[existingIdx], ...cleanMovie };
  } else {
    fallbackMovies.unshift(cleanMovie);
  }

  // Save via REST
  let savedToFirestore = false;
  try {
    savedToFirestore = await saveMovieToRest(cleanMovie);
  } catch (e) {
    console.warn("REST save error:", e);
  }

  // Also save via SDK if db is available
  const db = getDb();
  if (db) {
    try {
      const docRef = doc(db, "movies", cleanMovie.id);
      await setDoc(docRef, cleanMovie, { merge: true });
      savedToFirestore = true;
    } catch (err) {
      console.warn("⚠️ [Firebase] Firestore save failed:", err);
    }
  }

  return { movie: cleanMovie, source: savedToFirestore ? "firebase" : "memory" };
}

export async function deleteMovie(id: string): Promise<{ success: boolean; source: "firebase" | "memory" }> {
  fallbackMovies = fallbackMovies.filter((m) => m.id !== id);

  let deletedFromFirestore = false;
  try {
    deletedFromFirestore = await deleteMovieFromRest(id);
  } catch (e) {
    console.warn("REST delete error:", e);
  }

  const db = getDb();
  if (db) {
    try {
      const docRef = doc(db, "movies", id);
      await deleteDoc(docRef);
      deletedFromFirestore = true;
    } catch (err) {
      console.warn("⚠️ [Firebase] Firestore delete failed:", err);
    }
  }

  return { success: true, source: deletedFromFirestore ? "firebase" : "memory" };
}

/**
 * Completely clean / wipe all movies from Firebase Firestore and in-memory store.
 */
export async function cleanDatabase(): Promise<{
  success: boolean;
  deletedCount: number;
  source: "firebase" | "memory";
}> {
  fallbackMovies = [];
  let deletedCount = 0;

  const db = getDb();
  if (db) {
    try {
      const colRef = collection(db, "movies");
      const snapshot = await getDocs(colRef);
      if (!snapshot.empty) {
        const docs = snapshot.docs;
        const chunkSize = 400;
        for (let i = 0; i < docs.length; i += chunkSize) {
          const chunk = docs.slice(i, i + chunkSize);
          const batch = writeBatch(db);
          chunk.forEach((docSnap) => {
            batch.delete(docSnap.ref);
          });
          await batch.commit();
        }
        deletedCount = docs.length;
      }
      console.log(`🧹 [Firebase] Cleaned database: deleted ${deletedCount} movies from Firestore`);
      return { success: true, deletedCount, source: "firebase" };
    } catch (err) {
      console.warn("⚠️ [Firebase] Firestore clean failed:", err);
    }
  }

  return { success: true, deletedCount, source: "memory" };
}

export async function resetCatalog(): Promise<{ count: number; source: "firebase" | "memory" }> {
  return cleanDatabase().then((res) => ({ count: 0, source: res.source }));
}
