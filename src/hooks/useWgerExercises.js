import { useEffect, useState } from "react";
import { fetchAllExercises } from "../lib/wger";

const CACHE_KEY = "wger_exercises_cache";
const CACHE_TTL = 24 * 60 * 60 * 1000;

let cached = null;
let fetchPromise = null;

function fromStorage() {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const { timestamp, data } = JSON.parse(raw);
        if (Date.now() - timestamp > CACHE_TTL) {
            localStorage.removeItem(CACHE_KEY);
            return null;
        }
        return data;
    } catch {
        return null;
    }
}

function toStorage(data) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data }));
    } catch { /* ignore */ }
}

export default function useWgerExercises() {
    const stored = fromStorage();
    const [exercises, setExercises] = useState(() => cached || stored || []);
    const [loading, setLoading] = useState(!cached && !stored);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (cached) return;

        const s = fromStorage();
        if (s) {
            cached = s;
            setExercises(s);
            setLoading(false);
        }

        if (!fetchPromise) {
            fetchPromise = fetchAllExercises().then((data) => {
                cached = data;
                toStorage(data);
                return data;
            });
        }

        let cancelled = false;
        fetchPromise
            .then((data) => {
                if (!cancelled) {
                    setExercises(data);
                    setLoading(false);
                }
            })
            .catch((err) => {
                if (!cancelled) {
                    setError(err.message);
                    setLoading(false);
                }
            });

        return () => { cancelled = true; };
    }, []);

    return { exercises, loading, error };
}
