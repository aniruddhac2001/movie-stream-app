import { Movie } from "@/types/movie";

const PROJECT_ID =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  process.env.FIREBASE_PROJECT_ID ||
  "cinenova-23f33";

const API_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
  process.env.FIREBASE_API_KEY ||
  "AIzaSyDImrt7lrSv0xXySl60zPLMBVFLy72iX2k";

const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/movies`;

function parseFirestoreValue(v: any): any {
  if (!v) return null;
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return parseInt(v.integerValue, 10);
  if ("doubleValue" in v) return parseFloat(v.doubleValue);
  if ("booleanValue" in v) return v.booleanValue;
  if ("timestampValue" in v) return v.timestampValue;
  if ("nullValue" in v) return null;
  if ("arrayValue" in v) {
    const vals = v.arrayValue.values || [];
    return vals.map(parseFirestoreValue);
  }
  if ("mapValue" in v) {
    const fields = v.mapValue.fields || {};
    const res: Record<string, any> = {};
    for (const k in fields) {
      res[k] = parseFirestoreValue(fields[k]);
    }
    return res;
  }
  return null;
}

function toFirestoreValue(val: unknown): Record<string, unknown> {
  if (val === null || val === undefined) {
    return { nullValue: null };
  }
  if (typeof val === "string") {
    return { stringValue: val };
  }
  if (typeof val === "boolean") {
    return { booleanValue: val };
  }
  if (typeof val === "number") {
    return { doubleValue: val };
  }
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === "object") {
    const fields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      if (v !== undefined) {
        fields[k] = toFirestoreValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function toFirestoreFields(obj: Record<string, unknown>): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      fields[k] = toFirestoreValue(v);
    }
  }
  return fields;
}

export async function fetchMoviesFromRest(timeoutMs: number = 4000): Promise<Movie[] | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(`${BASE_URL}?key=${API_KEY}`, {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);

    if (!res.ok) {
      console.warn(`Firestore REST error: status ${res.status}`);
      return null;
    }

    const data = await res.json();
    if (!data.documents || !Array.isArray(data.documents)) {
      return [];
    }

    const movies: Movie[] = data.documents.map((doc: any) => {
      const id = doc.name.split("/").pop();
      const fields = doc.fields || {};
      const obj: any = { id };
      for (const k in fields) {
        obj[k] = parseFirestoreValue(fields[k]);
      }
      return obj as Movie;
    });

    movies.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    return movies;
  } catch (err) {
    console.warn("Firestore REST fetchMovies failed:", err);
    return null;
  }
}

export async function fetchMovieByIdFromRest(id: string, timeoutMs: number = 4000): Promise<Movie | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(`${BASE_URL}/${id}?key=${API_KEY}`, {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);

    if (!res.ok) {
      return null;
    }

    const doc = await res.json();
    const fields = doc.fields || {};
    const obj: any = { id };
    for (const k in fields) {
      obj[k] = parseFirestoreValue(fields[k]);
    }
    return obj as Movie;
  } catch (err) {
    console.warn(`Firestore REST fetchMovieById(${id}) failed:`, err);
    return null;
  }
}

export async function saveMovieToRest(movie: Movie): Promise<boolean> {
  try {
    const url = `${BASE_URL}/${movie.id}?key=${API_KEY}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields: toFirestoreFields(movie as any) }),
    });
    return res.ok;
  } catch (err) {
    console.warn(`Firestore REST saveMovie failed:`, err);
    return false;
  }
}

export async function deleteMovieFromRest(id: string): Promise<boolean> {
  try {
    const url = `${BASE_URL}/${id}?key=${API_KEY}`;
    const res = await fetch(url, {
      method: "DELETE",
    });
    return res.ok;
  } catch (err) {
    console.warn(`Firestore REST deleteMovie failed:`, err);
    return false;
  }
}
