# Routines Implementation — Full Code

## 1. SQL Migration — `supabase/migration.sql`

```sql
CREATE TABLE routines (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  exercises JSONB NOT NULL DEFAULT '[]',
  template_id BIGINT REFERENCES templates(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE workouts ADD COLUMN IF NOT EXISTS duration INT;

ALTER TABLE routines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own routines" ON routines
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own routines" ON routines
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own routines" ON routines
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own routines" ON routines
  FOR DELETE USING (auth.uid() = user_id);
```

---

## 2. `src/ui/pages/Routines.js`

```js
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { Plus, Dumbbell, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import LoadingIndicator from "../components/LoadingIndicator";

export default function Routines() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [routines, setRoutines] = useState([]);
    const [workoutCounts, setWorkoutCounts] = useState({});
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        const { data: rtn, error } = await supabase
            .from("routines")
            .select("*")
            .eq("user_id", user.sub)
            .order("name");

        if (error) {
            toast.error("Failed to load routines");
            setLoading(false);
            return;
        }

        setRoutines(rtn || []);

        const { data: workouts } = await supabase
            .from("workouts")
            .select("routine_id")
            .eq("user_id", user.sub);

        if (workouts) {
            const counts = {};
            for (const w of workouts) {
                if (w.routine_id) {
                    counts[w.routine_id] = (counts[w.routine_id] || 0) + 1;
                }
            }
            setWorkoutCounts(counts);
        }

        setLoading(false);
    }, [user.sub]);

    useEffect(() => {
        if (user) load();
    }, [user, load]);

    if (loading) {
        return (
            <div className="p-6 md:p-10 lg:p-14 flex items-center justify-center min-h-[60vh]">
                <LoadingIndicator size={48} className="text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="p-5 space-y-5">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="text-xs tracking-[0.25em] uppercase text-muted-foreground mb-2">Program</div>
                    <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tighter">Routines</h1>
                </div>
                <Link
                    to="/routines/new"
                    data-testid="new-routine-btn"
                    className="w-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90 font-bold tracking-wide px-5 py-3 flex items-center justify-center gap-2 transition-colors"
                >
                    <Plus className="h-4 w-4" strokeWidth={2} />
                    New Routines
                </Link>
            </div>

            <div className="border border-border">
                {routines.length === 0 && (
                    <div className="p-10 text-center text-sm text-muted-foreground" data-testid="no-routines">
                        No routines yet. Create a new routine to get started.
                    </div>
                )}
                <div className="divide-y divide-border">
                    {routines.map((r) => {
                        const sessionCount = workoutCounts[r.id] || 0;
                        return (
                            <button
                                key={r.id}
                                onClick={() => navigate(`/routines/${r.id}`)}
                                className="w-full flex items-center justify-between p-5 hover:bg-muted transition-colors text-left"
                                data-testid={`routine-${r.id}`}
                            >
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="w-10 h-10 border border-border flex items-center justify-center shrink-0">
                                        <Dumbbell className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-semibold truncate">{r.name}</div>
                                        <div className="text-xs text-muted-foreground tracking-wide mt-0.5">
                                            {r.exercises?.length || 0} exercises
                                        </div>
                                        {sessionCount > 0 && (
                                            <div className="text-[11px] text-muted-foreground/70 mt-0.5">
                                                {sessionCount} session{sessionCount !== 1 ? "s" : ""} logged
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
```

---

## 3. `src/ui/pages/RoutineDetail.js`

```js
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { ArrowLeft, Play, Dumbbell, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import LoadingIndicator from "../components/LoadingIndicator";

export default function RoutineDetail() {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [routine, setRoutine] = useState(null);
    const [workouts, setWorkouts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openWorkout, setOpenWorkout] = useState(null);

    useEffect(() => {
        if (!user) return;
        (async () => {
            const { data: rtn, error } = await supabase
                .from("routines")
                .select("*")
                .eq("id", id)
                .single();

            if (error || !rtn) {
                toast.error("Routines not found");
                navigate("/workouts");
                return;
            }
            setRoutine(rtn);

            const { data: wos } = await supabase
                .from("workouts")
                .select("id, title, date, exercises, notes, duration")
                .eq("user_id", user.sub)
                .eq("routine_id", id)
                .order("date", { ascending: false });

            if (wos) setWorkouts(wos);

            setLoading(false);
        })();
    }, [user, id, navigate]);

    const buildProgress = () => {
        if (!routine || !workouts.length) return [];

        return routine.exercises.map((rex) => {
            const entries = [];
            for (const w of workouts) {
                const match = w.exercises?.find(
                    (wex) => wex.wger_id != null && wex.wger_id === rex.wger_id
                );
                if (match) {
                    entries.push({
                        date: w.date,
                        workoutId: w.id,
                        sets: match.sets || [],
                    });
                }
            }

            const bestSet = entries.reduce(
                (best, e) => {
                    const max = e.sets.reduce(
                        (m, s) => (s.weight > m.weight ? s : m),
                        { weight: 0, reps: 0 }
                    );
                    return max.weight > best.weight ? max : best;
                },
                { weight: 0, reps: 0 }
            );

            const maxSets = Math.max(
                ...entries.map((e) => e.sets.length),
                0
            );

            return {
                ...rex,
                entries,
                bestSet,
                maxSets,
            };
        });
    };

    if (loading) {
        return (
            <div className="p-6 md:p-10 lg:p-14 flex items-center justify-center min-h-[60vh]">
                <LoadingIndicator size={48} className="text-muted-foreground" />
            </div>
        );
    }

    if (!routine) return null;

    const progress = buildProgress();
    const hasWorkouts = workouts.length > 0;

    return (
        <div className="p-5 sm:p-8 space-y-8 max-w-4xl">
            <button
                onClick={() => navigate("/workouts")}
                className="flex items-center gap-2 text-xs tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground transition-colors"
            >
                <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
                Back to Routines
            </button>

            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                    <div className="text-xs tracking-[0.25em] uppercase text-muted-foreground mb-2">Routines</div>
                    <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tighter">{routine.name}</h1>
                    {routine.description && (
                        <p className="text-muted-foreground mt-2 max-w-2xl">{routine.description}</p>
                    )}
                    <div className="flex gap-4 mt-3 text-xs text-muted-foreground tracking-wide">
                        <span>{routine.exercises?.length || 0} exercises</span>
                        {hasWorkouts && (
                            <span>{workouts.length} session{workouts.length !== 1 ? "s" : ""}</span>
                        )}
                    </div>
                </div>
                <button
                    onClick={() => navigate(`/workouts/active/${routine.id}`)}
                    className="w-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90 font-bold tracking-wide px-6 py-3 flex items-center justify-center gap-2 transition-colors"
                >
                    <Play className="h-4 w-4" fill="currentColor" strokeWidth={0} />
                    Start Workout
                </button>
            </div>

            {hasWorkouts && (
                <div className="space-y-8">
                    <div>
                        <div className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-4">Progress</div>
                        {progress.map((ex, ei) => (
                            <div key={ei} className="border border-border mb-6">
                                <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
                                    <div>
                                        <span className="font-semibold text-sm">{ex.name}</span>
                                        {ex.category && (
                                            <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                                                {ex.category}
                                            </span>
                                        )}
                                    </div>
                                    {ex.bestSet.weight > 0 && (
                                        <div className="text-xs text-muted-foreground">
                                            PR: <span className="font-bold tabular-nums text-foreground">{ex.bestSet.weight} kg</span>
                                        </div>
                                    )}
                                </div>
                                {ex.entries.length === 0 ? (
                                    <div className="p-4 text-xs text-muted-foreground">
                                        No logged sessions for this exercise yet.
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                                                    <th className="p-2 sm:p-3 border-r border-border text-left whitespace-nowrap">Date</th>
                                                    {Array.from({ length: ex.maxSets }).map((_, si) => (
                                                        <th key={si} className="p-2 sm:p-3 border-r border-border last:border-r-0 text-center whitespace-nowrap">
                                                            Set {si + 1}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {ex.entries.map((entry, ei) => (
                                                    <tr key={entry.workoutId} className="border-b border-border last:border-b-0">
                                                        <td className="p-2 sm:p-3 border-r border-border font-medium tabular-nums whitespace-nowrap">
                                                            {new Date(entry.date + "T00:00:00").toLocaleDateString("en-US", {
                                                                month: "short",
                                                                day: "numeric",
                                                            })}
                                                        </td>
                                                        {Array.from({ length: ex.maxSets }).map((_, si) => {
                                                            const s = entry.sets[si];
                                                            const isPR = s && ex.bestSet.weight > 0 && s.weight === ex.bestSet.weight;
                                                            return (
                                                                <td
                                                                    key={si}
                                                                    className={`p-2 sm:p-3 border-r border-border last:border-r-0 text-center tabular-nums ${
                                                                        isPR ? "font-bold text-accent" : ""
                                                                    }`}
                                                                >
                                                                    {s ? `${s.weight} × ${s.reps}` : "—"}
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div>
                        <div className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-4">Session History</div>
                        <div className="divide-y divide-border border border-border">
                            {workouts.map((w) => {
                                const isOpen = openWorkout === w.id;
                                return (
                                    <div key={w.id}>
                                        <button
                                            onClick={() => setOpenWorkout(isOpen ? null : w.id)}
                                            className="w-full flex items-center justify-between p-4 hover:bg-muted transition-colors text-left"
                                        >
                                            <div>
                                                <div className="font-semibold text-sm">{w.title}</div>
                                                <div className="text-xs text-muted-foreground mt-0.5">
                                                    {new Date(w.date + "T00:00:00").toLocaleDateString("en-US", {
                                                        weekday: "long",
                                                        month: "long",
                                                        day: "numeric",
                                                        year: "numeric",
                                                    })}
                                                    {w.duration != null && (
                                                        <span className="ml-2 text-muted-foreground/70">
                                                            · {Math.floor(w.duration / 60)}m {w.duration % 60}s
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {isOpen ? (
                                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                            ) : (
                                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                            )}
                                        </button>
                                        {isOpen && (
                                            <div className="border-t border-border bg-muted/30 p-4 space-y-4">
                                                {w.exercises?.map((ex, i) => (
                                                    <div key={i}>
                                                        <div className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-2">
                                                            {ex.name}
                                                        </div>
                                                        <div className="grid grid-cols-3 border border-border bg-white">
                                                            <div className="p-2 text-xs uppercase tracking-wider text-muted-foreground border-r border-border">
                                                                Set
                                                            </div>
                                                            <div className="p-2 text-xs uppercase tracking-wider text-muted-foreground border-r border-border">
                                                                Reps
                                                            </div>
                                                            <div className="p-2 text-xs uppercase tracking-wider text-muted-foreground">
                                                                Weight (kg)
                                                            </div>
                                                            {ex.sets?.map((s, si) => (
                                                                <div key={si} className="contents">
                                                                    <div className="p-2 border-t border-r border-border text-sm tabular-nums">
                                                                        {si + 1}
                                                                    </div>
                                                                    <div className="p-2 border-t border-r border-border text-sm tabular-nums">
                                                                        {s.reps}
                                                                    </div>
                                                                    <div className="p-2 border-t border-border text-sm tabular-nums">
                                                                        {s.weight}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                                {w.notes && (
                                                    <div className="text-sm text-muted-foreground border-t border-border pt-3">
                                                        <span className="text-xs uppercase tracking-wider">Notes: </span>
                                                        {w.notes}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {!hasWorkouts && (
                <div className="border border-border p-10 text-center">
                    <Dumbbell className="h-8 w-8 mx-auto text-muted-foreground mb-3" strokeWidth={1} />
                    <div className="text-sm text-muted-foreground">
                        No sessions logged for this routine yet.
                    </div>
                    <button
                        onClick={() => navigate(`/workouts/active/${routine.id}`)}
                        className="mt-4 text-xs tracking-[0.2em] uppercase text-accent hover:text-accent/80 transition-colors"
                    >
                        Start your first workout
                    </button>
                </div>
            )}
        </div>
    );
}
```

---

## 4. `src/ui/pages/ActiveWorkout.js` (NEW)

```js
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { Play, Pause, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import LoadingIndicator from "../components/LoadingIndicator";
import ExerciseCombobox from "../components/ExerciseCombobox";

const emptySet = () => ({ reps: 8, weight: 0 });

function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function ActiveWorkout() {
    const { routineId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [routine, setRoutine] = useState(null);
    const [exercises, setExercises] = useState([]);
    const [title, setTitle] = useState("");
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [running, setRunning] = useState(true);

    useEffect(() => {
        if (!user || !routineId) return;
        (async () => {
            const { data: rtn, error } = await supabase
                .from("routines")
                .select("*")
                .eq("id", routineId)
                .single();

            if (error || !rtn) {
                toast.error("Routines not found");
                navigate("/workouts");
                return;
            }

            setRoutine(rtn);
            setTitle(rtn.name);
            setExercises(
                (rtn.exercises || []).map((e) => ({
                    name: e.name,
                    wger_id: e.wger_id ?? null,
                    category: e.category ?? "",
                    muscles: e.muscles ?? [],
                    sets: (e.sets || []).map((s) => ({ ...s })),
                }))
            );
            setLoading(false);
        })();
    }, [user, routineId, navigate]);

    useEffect(() => {
        if (!running) return;
        const interval = setInterval(() => setElapsed((p) => p + 1), 1000);
        return () => clearInterval(interval);
    }, [running]);

    const updateSet = (ei, si, field, val) => {
        setExercises((prev) =>
            prev.map((e, i) =>
                i !== ei
                    ? e
                    : {
                          ...e,
                          sets: e.sets.map((s, j) =>
                              j !== si ? s : { ...s, [field]: Number(val) || 0 }
                          ),
                      }
            )
        );
    };

    const updateName = (ei, ex) =>
        setExercises((prev) =>
            prev.map((e, i) => (i === ei ? { ...e, ...ex } : e))
        );

    const addExercise = () =>
        setExercises((prev) => [
            ...prev,
            { name: "", wger_id: null, category: "", muscles: [], sets: [emptySet(), emptySet(), emptySet()] },
        ]);

    const removeExercise = (ei) =>
        setExercises((prev) => prev.filter((_, i) => i !== ei));

    const addSet = (ei) =>
        setExercises((prev) =>
            prev.map((e, i) =>
                i === ei ? { ...e, sets: [...e.sets, emptySet()] } : e
            )
        );

    const removeSet = (ei, si) =>
        setExercises((prev) =>
            prev.map((e, i) =>
                i === ei
                    ? { ...e, sets: e.sets.filter((_, j) => j !== si) }
                    : e
            )
        );

    const save = async () => {
        const cleaned = exercises
            .map((e) => ({
                name: e.name.trim(),
                wger_id: e.wger_id,
                category: e.category,
                muscles: e.muscles,
                sets: e.sets,
            }))
            .filter((e) => e.name);

        if (cleaned.length === 0) {
            toast.error("Add at least one exercise with a name");
            return;
        }

        setSaving(true);
        try {
            const { error } = await supabase.from("workouts").insert({
                title,
                date: new Date().toISOString().slice(0, 10),
                notes,
                exercises: cleaned,
                user_id: user.sub,
                routine_id: Number(routineId),
                duration: elapsed,
            });
            if (error) throw error;
            toast.success("Workout saved");
            navigate(`/routines/${routineId}`);
        } catch (e) {
            toast.error("Failed to save workout");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6 md:p-10 lg:p-14 flex items-center justify-center min-h-[60vh]">
                <LoadingIndicator size={48} className="text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="p-5 sm:p-8 space-y-6 max-w-4xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <div className="text-xs tracking-[0.25em] uppercase text-muted-foreground mb-1">Active Workout</div>
                    <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tighter">{title}</h1>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-3xl sm:text-4xl font-mono font-black tabular-nums tracking-wider">
                        {formatTime(elapsed)}
                    </div>
                    <button
                        onClick={() => setRunning(!running)}
                        className="p-3 border border-border hover:bg-muted transition-colors"
                        title={running ? "Pause" : "Resume"}
                    >
                        {running ? (
                            <Pause className="h-5 w-5" strokeWidth={1.5} />
                        ) : (
                            <Play className="h-5 w-5" strokeWidth={1.5} />
                        )}
                    </button>
                </div>
            </div>

            <div className="border border-border p-4">
                <label className="text-xs tracking-[0.2em] uppercase text-muted-foreground block mb-2">Workout Title</label>
                <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full border-0 bg-transparent focus:outline-none text-lg font-semibold"
                    placeholder="e.g. Push Day"
                />
            </div>

            <div className="space-y-4">
                {exercises.map((ex, ei) => (
                    <div key={ei} className="border border-border">
                        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                            <ExerciseCombobox
                                value={ex.name}
                                onChange={(val) => updateName(ei, val)}
                            />
                            <button onClick={() => removeExercise(ei)} className="p-2 hover:bg-white transition-colors">
                                <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                            </button>
                        </div>
                        <div>
                            <div className="grid grid-cols-[40px_1fr_1fr_36px] sm:grid-cols-[60px_1fr_1fr_40px] border-b border-border text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground">
                                <div className="p-2 sm:p-3 border-r border-border text-center">#</div>
                                <div className="p-2 sm:p-3 border-r border-border">Reps</div>
                                <div className="p-2 sm:p-3 border-r border-border">Wt (kg)</div>
                                <div className="p-2 sm:p-3"></div>
                            </div>
                            {ex.sets.map((s, si) => (
                                <div key={si} className="grid grid-cols-[40px_1fr_1fr_36px] sm:grid-cols-[60px_1fr_1fr_40px] border-b border-border last:border-b-0">
                                    <div className="p-2 sm:p-3 border-r border-border text-sm font-semibold tabular-nums text-center">
                                        {si + 1}
                                    </div>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={s.reps}
                                        onChange={(e) => updateSet(ei, si, "reps", e.target.value)}
                                        className="w-full min-w-0 p-2 sm:p-3 border-r border-border bg-transparent focus:outline-none focus:bg-muted tabular-nums"
                                    />
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={s.weight}
                                        onChange={(e) => updateSet(ei, si, "weight", e.target.value)}
                                        className="w-full min-w-0 p-2 sm:p-3 border-r border-border bg-transparent focus:outline-none focus:bg-muted tabular-nums"
                                    />
                                    <button
                                        onClick={() => removeSet(ei, si)}
                                        className="p-2 sm:p-3 hover:bg-muted flex items-center justify-center"
                                    >
                                        <X className="h-3 w-3 sm:h-4 sm:w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="p-3 border-t border-border">
                            <button
                                onClick={() => addSet(ei)}
                                className="text-xs tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground flex items-center gap-1"
                            >
                                <Plus className="h-3 w-3" /> Add set
                            </button>
                        </div>
                    </div>
                ))}

                <button
                    onClick={addExercise}
                    className="w-full border border-dashed border-border p-4 text-sm tracking-wide text-muted-foreground hover:text-foreground hover:border-primary/40 flex items-center justify-center gap-2 transition-colors"
                >
                    <Plus className="h-4 w-4" /> Add exercise
                </button>
            </div>

            <div className="border border-border p-4">
                <label className="text-xs tracking-[0.2em] uppercase text-muted-foreground block mb-2">Notes</label>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="How did the session feel?"
                    className="w-full bg-transparent border-0 focus:outline-none text-sm"
                />
            </div>

            <div className="flex gap-3">
                <button
                    onClick={save}
                    disabled={saving}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold tracking-wide px-6 py-3 disabled:opacity-50 transition-colors"
                >
                    {saving ? "Saving..." : "Save & Finish"}
                </button>
                <button
                    onClick={() => navigate(`/routines/${routineId}`)}
                    className="border border-border px-6 py-3 hover:bg-muted transition-colors"
                >
                    Discard
                </button>
            </div>
        </div>
    );
}
```

---

## 5. `src/ui/pages/NewRoutine.js` (NEW)

```js
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { Plus, Trash2, X, LayoutTemplate } from "lucide-react";
import { toast } from "sonner";
import ExerciseCombobox from "../components/ExerciseCombobox";
import Modal from "../components/Modal";

const emptySet = () => ({ reps: 8, weight: 0 });

export default function NewRoutine() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [exercises, setExercises] = useState([
        { name: "", wger_id: null, category: "", muscles: [], sets: [emptySet(), emptySet(), emptySet()] },
    ]);
    const [saving, setSaving] = useState(false);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [templates, setTemplates] = useState([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);

    useEffect(() => {
        if (!showTemplateModal) return;
        setLoadingTemplates(true);
        supabase
            .from("templates")
            .select("id, name, exercises")
            .order("name")
            .then(({ data }) => {
                setTemplates(data || []);
                setLoadingTemplates(false);
            });
    }, [showTemplateModal]);

    const loadTemplate = async (templateId) => {
        const { data } = await supabase
            .from("templates")
            .select("name, exercises")
            .eq("id", templateId)
            .single();

        if (data) {
            setName(data.name);
            setExercises(
                data.exercises.map((e) => ({
                    name: e.name,
                    wger_id: e.wger_id ?? null,
                    category: e.category ?? "",
                    muscles: e.muscles ?? [],
                    sets: (e.sets || []).map((s) => ({ ...s })),
                }))
            );
        }
        setShowTemplateModal(false);
    };

    const updateSet = (ei, si, field, val) => {
        setExercises((prev) =>
            prev.map((e, i) =>
                i !== ei
                    ? e
                    : {
                          ...e,
                          sets: e.sets.map((s, j) =>
                              j !== si ? s : { ...s, [field]: Number(val) || 0 }
                          ),
                      }
            )
        );
    };

    const updateName = (ei, ex) =>
        setExercises((prev) =>
            prev.map((e, i) => (i === ei ? { ...e, ...ex } : e))
        );

    const addExercise = () =>
        setExercises((prev) => [
            ...prev,
            { name: "", wger_id: null, category: "", muscles: [], sets: [emptySet(), emptySet(), emptySet()] },
        ]);

    const removeExercise = (ei) =>
        setExercises((prev) => prev.filter((_, i) => i !== ei));

    const addSet = (ei) =>
        setExercises((prev) =>
            prev.map((e, i) =>
                i === ei ? { ...e, sets: [...e.sets, emptySet()] } : e
            )
        );

    const removeSet = (ei, si) =>
        setExercises((prev) =>
            prev.map((e, i) =>
                i === ei
                    ? { ...e, sets: e.sets.filter((_, j) => j !== si) }
                    : e
            )
        );

    const save = async () => {
        const cleaned = exercises
            .map((e) => ({
                name: e.name.trim(),
                wger_id: e.wger_id,
                category: e.category,
                muscles: e.muscles,
                sets: e.sets,
            }))
            .filter((e) => e.name);

        if (!name.trim()) {
            toast.error("Give your routine a name");
            return;
        }
        if (cleaned.length === 0) {
            toast.error("Add at least one exercise");
            return;
        }

        setSaving(true);
        try {
            const { error } = await supabase.from("routines").insert({
                name: name.trim(),
                description: description.trim() || null,
                exercises: cleaned,
                user_id: user.sub,
            });
            if (error) throw error;
            toast.success("Routines created");
            navigate("/workouts");
        } catch (e) {
            toast.error("Failed to create routine");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-5 sm:p-8 space-y-6 max-w-4xl">
            <div>
                <div className="text-xs tracking-[0.25em] uppercase text-muted-foreground mb-2">New</div>
                <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tighter">Create Routines</h1>
            </div>

            <button
                onClick={() => setShowTemplateModal(true)}
                className="w-full border border-dashed border-border p-4 text-sm tracking-wide text-muted-foreground hover:text-foreground hover:border-primary/40 flex items-center justify-center gap-2 transition-colors"
            >
                <LayoutTemplate className="h-4 w-4" />
                From Template
            </button>

            <div className="grid grid-cols-1 gap-0 border border-border">
                <div className="p-5 border-b border-border">
                    <label className="text-xs tracking-[0.2em] uppercase text-muted-foreground block mb-2">Name</label>
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Routines name (e.g. Push Day)"
                        className="w-full border-0 bg-transparent focus:outline-none text-lg font-semibold"
                    />
                </div>
                <div className="p-5">
                    <label className="text-xs tracking-[0.2em] uppercase text-muted-foreground block mb-2">
                        Description (optional)
                    </label>
                    <input
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="e.g. Chest, shoulders, triceps"
                        className="w-full border-0 bg-transparent focus:outline-none text-base"
                    />
                </div>
            </div>

            <div className="space-y-4">
                {exercises.map((ex, ei) => (
                    <div key={ei} className="border border-border">
                        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                            <ExerciseCombobox
                                value={ex.name}
                                onChange={(val) => updateName(ei, val)}
                            />
                            <button onClick={() => removeExercise(ei)} className="p-2 hover:bg-white transition-colors">
                                <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                            </button>
                        </div>
                        <div>
                            <div className="grid grid-cols-[40px_1fr_1fr_36px] sm:grid-cols-[60px_1fr_1fr_40px] border-b border-border text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground">
                                <div className="p-2 sm:p-3 border-r border-border text-center">#</div>
                                <div className="p-2 sm:p-3 border-r border-border">Reps</div>
                                <div className="p-2 sm:p-3 border-r border-border">Wt (kg)</div>
                                <div className="p-2 sm:p-3"></div>
                            </div>
                            {ex.sets.map((s, si) => (
                                <div key={si} className="grid grid-cols-[40px_1fr_1fr_36px] sm:grid-cols-[60px_1fr_1fr_40px] border-b border-border last:border-b-0">
                                    <div className="p-2 sm:p-3 border-r border-border text-sm font-semibold tabular-nums text-center">
                                        {si + 1}
                                    </div>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={s.reps}
                                        onChange={(e) => updateSet(ei, si, "reps", e.target.value)}
                                        className="w-full min-w-0 p-2 sm:p-3 border-r border-border bg-transparent focus:outline-none focus:bg-muted tabular-nums"
                                    />
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={s.weight}
                                        onChange={(e) => updateSet(ei, si, "weight", e.target.value)}
                                        className="w-full min-w-0 p-2 sm:p-3 border-r border-border bg-transparent focus:outline-none focus:bg-muted tabular-nums"
                                    />
                                    <button
                                        onClick={() => removeSet(ei, si)}
                                        className="p-2 sm:p-3 hover:bg-muted flex items-center justify-center"
                                    >
                                        <X className="h-3 w-3 sm:h-4 sm:w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="p-3 border-t border-border">
                            <button
                                onClick={() => addSet(ei)}
                                className="text-xs tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground flex items-center gap-1"
                            >
                                <Plus className="h-3 w-3" /> Add set
                            </button>
                        </div>
                    </div>
                ))}

                <button
                    onClick={addExercise}
                    className="w-full border border-dashed border-border p-4 text-sm tracking-wide text-muted-foreground hover:text-foreground hover:border-primary/40 flex items-center justify-center gap-2 transition-colors"
                >
                    <Plus className="h-4 w-4" /> Add exercise
                </button>
            </div>

            <div className="flex gap-3">
                <button
                    onClick={save}
                    disabled={saving}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold tracking-wide px-6 py-3 disabled:opacity-50 transition-colors"
                >
                    {saving ? "Saving..." : "Save Routines"}
                </button>
                <button
                    onClick={() => navigate("/workouts")}
                    className="border border-border px-6 py-3 hover:bg-muted transition-colors"
                >
                    Cancel
                </button>
            </div>

            {showTemplateModal && (
                <Modal
                    header="Choose a Template"
                    onCancel={() => setShowTemplateModal(false)}
                >
                    {loadingTemplates ? (
                        <div className="p-6 text-center text-sm text-muted-foreground">Loading templates...</div>
                    ) : templates.length === 0 ? (
                        <div className="p-6 text-center text-sm text-muted-foreground">No templates available.</div>
                    ) : (
                        <div className="divide-y divide-border max-h-80 overflow-y-auto">
                            {templates.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => loadTemplate(t.id)}
                                    className="w-full flex items-center justify-between p-4 hover:bg-muted transition-colors text-left"
                                >
                                    <span className="font-medium">{t.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {t.exercises?.length || 0} exercises
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </Modal>
            )}
        </div>
    );
}
```

---

## 6. `src/App.js` — Add routes

**Add imports:**
```js
import ActiveWorkout from './ui/pages/ActiveWorkout'
import NewRoutine from './ui/pages/NewRoutine'
```

**Add routes inside `<Route path="/" element={...}>`:**
```js
<Route path="workouts/active/:routineId" element={<ActiveWorkout />} />
<Route path="routines/new" element={<NewRoutine />} />
```

---

## 8. ActiveWorkout.js — Timer persist across tab/page navigation

### Full file: `src/ui/pages/ActiveWorkout.js`

Key changes:
- Timer uses `Date.now()` timestamps instead of incrementing counter
- State saved to `sessionStorage` on every change
- On mount, restore from `sessionStorage`
- `beforeunload` warns user if workout is active

```js
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { Play, Pause, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import LoadingIndicator from "../components/LoadingIndicator";
import ExerciseCombobox from "../components/ExerciseCombobox";

const emptySet = () => ({ reps: 8, weight: 0 });
const STORAGE_KEY = "active_workout";

function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function now() {
    return Date.now();
}

export default function ActiveWorkout() {
    const { routineId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [exercises, setExercises] = useState([]);
    const [title, setTitle] = useState("");
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [running, setRunning] = useState(true);
    const [restored, setRestored] = useState(false);

    const startedAtRef = useRef(now());
    const pausedAtRef = useRef(null);
    const totalPausedRef = useRef(0);

    const calcElapsed = useCallback(() => {
        const end = pausedAtRef.current || now();
        return Math.floor((end - startedAtRef.current - totalPausedRef.current) / 1000);
    }, []);

    // Restore from sessionStorage
    useEffect(() => {
        try {
            const raw = sessionStorage.getItem(STORAGE_KEY);
            if (raw) {
                const saved = JSON.parse(raw);
                if (String(saved.routineId) === String(routineId)) {
                    setTitle(saved.title);
                    setNotes(saved.notes);
                    setExercises(saved.exercises);
                    startedAtRef.current = saved.startedAt;
                    pausedAtRef.current = saved.pausedAt;
                    totalPausedRef.current = saved.totalPausedMs;
                    setRunning(saved.running);
                    setRestored(true);
                    setElapsed(calcElapsed());
                    setLoading(false);
                    return;
                }
            }
        } catch {}
        setRestored(true);
    }, [routineId, calcElapsed]);

    // Fetch routine only if not restored
    useEffect(() => {
        if (!restored || !user || !routineId) return;
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (raw) {
            try {
                const saved = JSON.parse(raw);
                if (String(saved.routineId) === String(routineId)) return;
            } catch {}
        }
        (async () => {
            const { data: rtn, error } = await supabase
                .from("routines")
                .select("*")
                .eq("id", routineId)
                .single();

            if (error || !rtn) {
                toast.error("Routines not found");
                navigate("/workouts");
                return;
            }

            setTitle(rtn.name);
            setExercises(
                (rtn.exercises || []).map((e) => ({
                    name: e.name,
                    wger_id: e.wger_id ?? null,
                    category: e.category ?? "",
                    muscles: e.muscles ?? [],
                    sets: (e.sets || []).map((s) => ({ ...s })),
                }))
            );
            startedAtRef.current = now();
            pausedAtRef.current = null;
            totalPausedRef.current = 0;
            setRunning(true);
            setLoading(false);
        })();
    }, [restored, user, routineId, navigate]);

    // Timer tick
    useEffect(() => {
        if (loading) return;
        const interval = setInterval(() => setElapsed(calcElapsed()), 1000);
        return () => clearInterval(interval);
    }, [loading, running, calcElapsed]);

    // Persist to sessionStorage
    useEffect(() => {
        if (loading) return;
        const data = {
            exercises,
            title,
            notes,
            routineId,
            startedAt: startedAtRef.current,
            pausedAt: pausedAtRef.current,
            totalPausedMs: totalPausedRef.current,
            running,
        };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }, [exercises, title, notes, running, routineId, loading]);

    // Warn on tab close
    useEffect(() => {
        if (loading) return;
        const handler = (e) => {
            if (!running) return;
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [loading, running]);

    const togglePause = () => {
        if (running) {
            pausedAtRef.current = now();
        } else {
            totalPausedRef.current += now() - pausedAtRef.current;
            pausedAtRef.current = null;
        }
        setRunning(!running);
    };

    const updateSet = (ei, si, field, val) => {
        setExercises((prev) =>
            prev.map((e, i) =>
                i !== ei
                    ? e
                    : {
                          ...e,
                          sets: e.sets.map((s, j) =>
                              j !== si ? s : { ...s, [field]: Number(val) || 0 }
                          ),
                      }
            )
        );
    };

    const updateName = (ei, ex) =>
        setExercises((prev) =>
            prev.map((e, i) => (i === ei ? { ...e, ...ex } : e))
        );

    const addExercise = () =>
        setExercises((prev) => [
            ...prev,
            { name: "", wger_id: null, category: "", muscles: [], sets: [emptySet(), emptySet(), emptySet()] },
        ]);

    const removeExercise = (ei) =>
        setExercises((prev) => prev.filter((_, i) => i !== ei));

    const addSet = (ei) =>
        setExercises((prev) =>
            prev.map((e, i) =>
                i === ei ? { ...e, sets: [...e.sets, emptySet()] } : e
            )
        );

    const removeSet = (ei, si) =>
        setExercises((prev) =>
            prev.map((e, i) =>
                i === ei
                    ? { ...e, sets: e.sets.filter((_, j) => j !== si) }
                    : e
            )
        );

    const save = async () => {
        const cleaned = exercises
            .map((e) => ({
                name: e.name.trim(),
                wger_id: e.wger_id,
                category: e.category,
                muscles: e.muscles,
                sets: e.sets,
            }))
            .filter((e) => e.name);

        if (cleaned.length === 0) {
            toast.error("Add at least one exercise with a name");
            return;
        }

        setSaving(true);
        try {
            const duration = calcElapsed();
            const { error } = await supabase.from("workouts").insert({
                title,
                date: new Date().toISOString().slice(0, 10),
                notes,
                exercises: cleaned,
                user_id: user.sub,
                routine_id: Number(routineId),
                duration,
            });
            if (error) throw error;
            sessionStorage.removeItem(STORAGE_KEY);
            toast.success("Workout saved");
            navigate(`/routines/${routineId}`);
        } catch (e) {
            toast.error("Failed to save workout");
        } finally {
            setSaving(false);
        }
    };

    const discard = () => {
        sessionStorage.removeItem(STORAGE_KEY);
        navigate(`/routines/${routineId}`);
    };

    if (loading) {
        return (
            <div className="p-6 md:p-10 lg:p-14 flex items-center justify-center min-h-[60vh]">
                <LoadingIndicator size={48} className="text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="p-5 sm:p-8 space-y-6 max-w-4xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <div className="text-xs tracking-[0.25em] uppercase text-muted-foreground mb-1">Active Workout</div>
                    <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tighter">{title}</h1>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-3xl sm:text-4xl font-mono font-black tabular-nums tracking-wider">
                        {formatTime(elapsed)}
                    </div>
                    <button
                        onClick={togglePause}
                        className="p-3 border border-border hover:bg-muted transition-colors"
                        title={running ? "Pause" : "Resume"}
                    >
                        {running ? (
                            <Pause className="h-5 w-5" strokeWidth={1.5} />
                        ) : (
                            <Play className="h-5 w-5" strokeWidth={1.5} />
                        )}
                    </button>
                </div>
            </div>

            <div className="border border-border p-4">
                <label className="text-xs tracking-[0.2em] uppercase text-muted-foreground block mb-2">Workout Title</label>
                <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full border-0 bg-transparent focus:outline-none text-lg font-semibold"
                    placeholder="e.g. Push Day"
                />
            </div>

            <div className="space-y-4">
                {exercises.map((ex, ei) => (
                    <div key={ei} className="border border-border">
                        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                            <ExerciseCombobox
                                value={ex.name}
                                onChange={(val) => updateName(ei, val)}
                            />
                            <button onClick={() => removeExercise(ei)} className="p-2 hover:bg-white transition-colors">
                                <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                            </button>
                        </div>
                        <div>
                            <div className="grid grid-cols-[40px_1fr_1fr_36px] sm:grid-cols-[60px_1fr_1fr_40px] border-b border-border text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground">
                                <div className="p-2 sm:p-3 border-r border-border text-center">#</div>
                                <div className="p-2 sm:p-3 border-r border-border">Reps</div>
                                <div className="p-2 sm:p-3 border-r border-border">Wt (kg)</div>
                                <div className="p-2 sm:p-3"></div>
                            </div>
                            {ex.sets.map((s, si) => (
                                <div key={si} className="grid grid-cols-[40px_1fr_1fr_36px] sm:grid-cols-[60px_1fr_1fr_40px] border-b border-border last:border-b-0">
                                    <div className="p-2 sm:p-3 border-r border-border text-sm font-semibold tabular-nums text-center">
                                        {si + 1}
                                    </div>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={s.reps}
                                        onChange={(e) => updateSet(ei, si, "reps", e.target.value)}
                                        className="w-full min-w-0 p-2 sm:p-3 border-r border-border bg-transparent focus:outline-none focus:bg-muted tabular-nums"
                                    />
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={s.weight}
                                        onChange={(e) => updateSet(ei, si, "weight", e.target.value)}
                                        className="w-full min-w-0 p-2 sm:p-3 border-r border-border bg-transparent focus:outline-none focus:bg-muted tabular-nums"
                                    />
                                    <button
                                        onClick={() => removeSet(ei, si)}
                                        className="p-2 sm:p-3 hover:bg-muted flex items-center justify-center"
                                    >
                                        <X className="h-3 w-3 sm:h-4 sm:w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="p-3 border-t border-border">
                            <button
                                onClick={() => addSet(ei)}
                                className="text-xs tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground flex items-center gap-1"
                            >
                                <Plus className="h-3 w-3" /> Add set
                            </button>
                        </div>
                    </div>
                ))}

                <button
                    onClick={addExercise}
                    className="w-full border border-dashed border-border p-4 text-sm tracking-wide text-muted-foreground hover:text-foreground hover:border-primary/40 flex items-center justify-center gap-2 transition-colors"
                >
                    <Plus className="h-4 w-4" /> Add exercise
                </button>
            </div>

            <div className="border border-border p-4">
                <label className="text-xs tracking-[0.2em] uppercase text-muted-foreground block mb-2">Notes</label>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="How did the session feel?"
                    className="w-full bg-transparent border-0 focus:outline-none text-sm"
                />
            </div>

            <div className="flex gap-3">
                <button
                    onClick={save}
                    disabled={saving}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold tracking-wide px-6 py-3 disabled:opacity-50 transition-colors"
                >
                    {saving ? "Saving..." : "Save & Finish"}
                </button>
                <button
                    onClick={discard}
                    className="border border-border px-6 py-3 hover:bg-muted transition-colors"
                >
                    Discard
                </button>
            </div>
        </div>
    );
}
```


---

## 7. Exercise Picker (Hevy-like flow)

### 7a. `src/lib/wger.js` — Add equipment

Change the `results.push` to include `equipment`:

```js
results.push({
    wger_id: item.id,
    name: en.name,
    category: item.category?.name ?? "",
    equipment: item.equipment?.map(e => e.name) ?? [],  // ADD THIS
    muscles: [
        ...(item.muscles?.map(m => m.name_en || m.name) ?? []),
        ...(item.muscles_secondary?.map(m => m.name_en || m.name) ?? []),
    ],
});
```

### 7b. `src/ui/components/ExercisePickerModal.js` (NEW)

```js
import { useState } from "react";
import { Search, ChevronLeft, X, Dumbbell, Loader2 } from "lucide-react";
import useWgerExercises from "../../hooks/useWgerExercises";

export default function ExercisePickerModal({ onSelect, onClose }) {
    const { exercises, loading } = useWgerExercises();
    const [step, setStep] = useState("category");
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedEquipment, setSelectedEquipment] = useState(null);
    const [query, setQuery] = useState("");

    const categories = [...new Set(exercises.map((e) => e.category))]
        .filter(Boolean)
        .sort();

    const equipmentOptions = selectedCategory
        ? [
              ...new Set(
                  exercises
                      .filter((e) => e.category === selectedCategory)
                      .flatMap((e) => e.equipment)
              ),
          ]
              .filter(Boolean)
              .sort()
        : [];

    const filteredExercises = exercises.filter((e) => {
        if (selectedCategory && e.category !== selectedCategory) return false;
        if (selectedEquipment && (!e.equipment || !e.equipment.includes(selectedEquipment)))
            return false;
        if (query && !e.name.toLowerCase().includes(query.toLowerCase())) return false;
        return true;
    });

    const pickCategory = (cat) => {
        setSelectedCategory(cat);
        setSelectedEquipment(null);
        setQuery("");
        setStep("equipment");
    };

    const pickEquipment = (eq) => {
        setSelectedEquipment(eq);
        setQuery("");
        setStep("exercise");
    };

    const goBack = () => {
        if (step === "equipment") {
            setSelectedCategory(null);
            setStep("category");
        } else if (step === "exercise") {
            if (selectedEquipment) {
                setSelectedEquipment(null);
                setQuery("");
                setStep("equipment");
            } else {
                setSelectedCategory(null);
                setStep("category");
            }
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <div className="bg-white w-full max-w-lg mx-4 max-h-[80vh] flex flex-col p-6 items-center justify-center gap-3">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Loading exercises...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
                <div className="flex items-center justify-between border-b border-border px-5 py-4 shrink-0">
                    <div className="flex items-center gap-3">
                        {step !== "category" && (
                            <button onClick={goBack} className="p-1 hover:bg-muted transition-colors">
                                <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
                            </button>
                        )}
                        <span className="font-semibold text-sm">
                            {step === "category" && "Choose Category"}
                            {step === "equipment" && "Choose Equipment"}
                            {step === "exercise" && "Choose Exercise"}
                        </span>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-muted transition-colors">
                        <X className="h-5 w-5" strokeWidth={1.5} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {step === "category" && (
                        <div className="p-5">
                            <div className="grid grid-cols-2 gap-3">
                                {categories.map((cat) => {
                                    const count = exercises.filter((e) => e.category === cat).length;
                                    return (
                                        <button
                                            key={cat}
                                            onClick={() => pickCategory(cat)}
                                            className="flex items-center gap-3 p-4 border border-border hover:bg-muted transition-colors text-left"
                                        >
                                            <div className="w-9 h-9 border border-border flex items-center justify-center shrink-0">
                                                <Dumbbell className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium">{cat}</div>
                                                <div className="text-[11px] text-muted-foreground">{count} exercises</div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {step === "equipment" && (
                        <div className="p-5">
                            <div className="text-xs text-muted-foreground mb-3 px-1">
                                Category: <span className="font-semibold text-foreground">{selectedCategory}</span>
                            </div>
                            <div className="space-y-1">
                                {equipmentOptions.map((eq) => {
                                    const count = exercises.filter(
                                        (e) => e.category === selectedCategory && e.equipment?.includes(eq)
                                    ).length;
                                    return (
                                        <button
                                            key={eq}
                                            onClick={() => pickEquipment(eq)}
                                            className="w-full flex items-center justify-between p-4 border border-border hover:bg-muted transition-colors text-left"
                                        >
                                            <span className="text-sm font-medium">{eq}</span>
                                            <span className="text-xs text-muted-foreground">{count} exercises</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {step === "exercise" && (
                        <div className="p-5">
                            <div className="flex items-center gap-2 border border-border px-3 py-2 mb-4">
                                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                                <input
                                    autoFocus
                                    placeholder="Search exercises..."
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    className="flex-1 bg-transparent border-0 focus:outline-none text-sm"
                                />
                            </div>
                            {selectedCategory && (
                                <div className="text-xs text-muted-foreground mb-3 px-1">
                                    {selectedCategory}
                                    {selectedEquipment && (
                                        <span> · {selectedEquipment}</span>
                                    )}
                                </div>
                            )}
                            <div className="space-y-1">
                                {filteredExercises.length === 0 ? (
                                    <div className="text-center text-sm text-muted-foreground py-8">
                                        No exercises found
                                    </div>
                                ) : (
                                    filteredExercises.map((ex) => (
                                        <button
                                            key={ex.wger_id}
                                            onClick={() => onSelect(ex)}
                                            className="w-full flex items-center justify-between p-4 border border-border hover:bg-muted transition-colors text-left"
                                        >
                                            <div>
                                                <div className="text-sm font-medium">{ex.name}</div>
                                                <div className="text-[11px] text-muted-foreground">
                                                    {ex.equipment?.slice(0, 2).join(", ") || "No equipment"}
                                                </div>
                                            </div>
                                            <ChevronLeft className="h-4 w-4 text-muted-foreground rotate-180 shrink-0" strokeWidth={1.5} />
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
```

### 7c. `src/ui/pages/NewRoutine.js` — Use ExercisePickerModal

**Replace imports:**
```js
import { Plus, Trash2, X, LayoutTemplate } from "lucide-react";
```
→
```js
import { Plus, Trash2, X, LayoutTemplate, Dumbbell } from "lucide-react";
```

**Remove `import ExerciseCombobox ...`**

**Add import:**
```js
import ExercisePickerModal from "../components/ExercisePickerModal";
```

**Replace the `updateName` function with:**
```js
const addExerciseFromPicker = (ex) => {
    setExercises((prev) => [
        ...prev,
        {
            name: ex.name,
            wger_id: ex.wger_id ?? null,
            category: ex.category ?? "",
            equipment: ex.equipment ?? [],
            muscles: ex.muscles ?? [],
            sets: [emptySet(), emptySet(), emptySet()],
        },
    ]);
};
```

**Remove the old `addExercise` that adds empty exercise.**

**In the JSX, replace the ExerciseCombobox inside each exercise card with static text:**
```jsx
<div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
    <div className="min-w-0 flex-1">
        <div className="font-semibold truncate text-base">{ex.name}</div>
        <div className="text-[11px] text-muted-foreground flex gap-2 mt-0.5">
            {ex.category && (
                <span className="uppercase tracking-wider">{ex.category}</span>
            )}
            {ex.equipment?.length > 0 && (
                <span>· {ex.equipment.slice(0, 2).join(", ")}</span>
            )}
        </div>
    </div>
    <button onClick={() => removeExercise(ei)} className="p-2 hover:bg-white transition-colors shrink-0 ml-2">
        <Trash2 className="h-4 w-4" strokeWidth={1.5} />
    </button>
</div>
```

**Replace the "Add exercise" button:**
```jsx
<button
    onClick={addExercise}
    ...
>
    <Plus className="h-4 w-4" /> Add exercise
</button>
```
→
```jsx
<button
    onClick={() => setShowPicker(true)}
    className="w-full border border-dashed border-border p-4 text-sm tracking-wide text-muted-foreground hover:text-foreground hover:border-primary/40 flex items-center justify-center gap-2 transition-colors"
>
    <Plus className="h-4 w-4" /> Add exercise
</button>
```

**Add state and modal at the top:**
```js
const [showPicker, setShowPicker] = useState(false);
```

**Add modal at the bottom (before the closing `</div>`):**
```jsx
{showPicker && (
    <ExercisePickerModal
        onSelect={(ex) => {
            addExerciseFromPicker(ex);
            setShowPicker(false);
        }}
        onClose={() => setShowPicker(false)}
    />
)}
```

