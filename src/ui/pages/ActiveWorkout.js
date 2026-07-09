import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { Play, Pause, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import LoadingIndicator from "../components/LoadingIndicator";
import ExercisePickerModal from "../components/ExercisePickerModal";

const emptySet = () => ({ reps: 8, weight: 0 });
const STORAGE_KEY = "active_workout";

function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
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
    const [showPicker, setShowPicker] = useState(false);

    const startedAtRef = useRef(Date.now());
    const pausedAtRef = useRef(null);
    const totalPausedRef = useRef(0);

    const calcElapsed = useCallback(() => {
        const end = pausedAtRef.current || Date.now();
        return Math.floor((end - startedAtRef.current - totalPausedRef.current) / 1000);
    }, []);

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
                toast.error("Routine not found");
                navigate("/routines");
                return;
            }

            setTitle(rtn.name);
            setExercises(
                (rtn.exercises || []).map((e) => ({
                    name: e.name,
                    wger_id: e.wger_id ?? null,
                    category: e.category ?? "",
                    equipment: e.equipment ?? [],
                    muscles: e.muscles ?? [],
                    sets: (e.sets || []).map((s) => ({ ...s })),
                }))
            );
            startedAtRef.current = Date.now();
            pausedAtRef.current = null;
            totalPausedRef.current = 0;
            setRunning(true);
            setLoading(false);
        })();
    }, [restored, user, routineId, navigate]);

    useEffect(() => {
        if (loading) return;
        const interval = setInterval(() => setElapsed(calcElapsed()), 1000);
        return () => clearInterval(interval);
    }, [loading, calcElapsed]);

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
            pausedAtRef.current = Date.now();
        } else {
            totalPausedRef.current += Date.now() - pausedAtRef.current;
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

    const addExerciseFromPicker = (ex) =>
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
                    onClick={() => setShowPicker(true)}
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
            {showPicker && (
                <ExercisePickerModal
                    onSelect={(ex) => {
                        addExerciseFromPicker(ex);
                        setShowPicker(false);
                    }}
                    onClose={() => setShowPicker(false)}
                />
            )}
        </div>
    );
}
