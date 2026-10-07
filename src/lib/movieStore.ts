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

// In-memory fallback cache seeded with initial movie data
let fallbackMovies: Movie[] = (initialMoviesJson as Movie[]) || [];

export async function getAllMovies(): Promise<{
  movies: Movie[];
  source: "firebase" | "memory";
  firebaseStatus: ReturnType<typeof getFirebaseStatus>;
}> {
  const firebaseStatus = getFirebaseStatus();
  const db = getDb();

  if (db) {
    try {
      const colRef = collection(db, "movies");
      const snapshot = await getDocs(colRef);
      const movies: Movie[] = snapshot.docs.map((d) => d.data() as Movie);

      // Sort by creation date descending
      movies.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });

      return { movies, source: "firebase", firebaseStatus };
    } catch (err) {
      console.warn("⚠️ [Firebase] Could not fetch movies from Firestore:", err);
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
  const db = getDb();
  if (db) {
    try {
      const docRef = doc(db, "movies", id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const movie = snap.data() as Movie;
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
  return {
    movie: found || null,
    cast: found?.cast || [],
    crew: found?.crew || [],
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
    posterImage: movieData.posterImage || [],
    bannerImage: movieData.bannerImage || [],
    screenshots: movieData.screenshots || [],
    trailerUrl: movieData.trailerUrl || "",
    hasFullMovie: isUpcoming ? false : Boolean(movieData.hasFullMovie),
    fullMovieUrl: isUpcoming ? "" : (movieData.fullMovieUrl || ""),
    downloadUrl: isUpcoming ? "" : (movieData.downloadUrl || ""),
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

  const db = getDb();
  if (db) {
    try {
      const docRef = doc(db, "movies", cleanMovie.id);
      await setDoc(docRef, cleanMovie, { merge: true });
      return { movie: cleanMovie, source: "firebase" };
    } catch (err) {
      console.warn("⚠️ [Firebase] Firestore save failed, persisted in memory fallback:", err);
    }
  }

  return { movie: cleanMovie, source: "memory" };
}

export async function deleteMovie(id: string): Promise<{ success: boolean; source: "firebase" | "memory" }> {
  fallbackMovies = fallbackMovies.filter((m) => m.id !== id);

  const db = getDb();
  if (db) {
    try {
      const docRef = doc(db, "movies", id);
      await deleteDoc(docRef);
      return { success: true, source: "firebase" };
    } catch (err) {
      console.warn("⚠️ [Firebase] Firestore delete failed:", err);
    }
  }

  return { success: true, source: "memory" };
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
