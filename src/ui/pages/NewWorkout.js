import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

const emptySet = () => ({ reps: 8, weight: 0 });
const emptyExercise = () => ({ name: "", sets: [emptySet(), emptySet(), emptySet()] });

export default function NewWorkout() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const templateId = params.get("template");

    const [title, setTitle] = useState("Workout");
    const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [notes, setNotes] = useState("");
    const [exercises, setExercises] = useState([emptyExercise()]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!templateId) return;
        (async () => {
            const { data, error } = await supabase
                .from("templates")
                .select("*")
                .eq("id", templateId)
                .single();
            if (error || !data) {
                toast.error("Template not found");
                return;
            }
            setTitle(data.name);
            setExercises(data.exercises.map(e => ({ name: e.name, sets: e.sets.map(s => ({ ...s })) })));
        })();
    }, [templateId]);

    const updateSet = (ei, si, field, val) => {
        setExercises(prev => prev.map((e, i) => i !== ei ? e : {
            ...e,
            sets: e.sets.map((s, j) => j !== si ? s : { ...s, [field]: Number(val) || 0 })
        }));
    };
    const updateName = (ei, val) => setExercises(prev => prev.map((e, i) => i === ei ? { ...e, name: val } : e));
    const addExercise = () => setExercises(prev => [...prev, emptyExercise()]);
    const removeExercise = (ei) => setExercises(prev => prev.filter((_, i) => i !== ei));
    const addSet = (ei) => setExercises(prev => prev.map((e, i) => i === ei ? { ...e, sets: [...e.sets, emptySet()] } : e));
    const removeSet = (ei, si) => setExercises(prev => prev.map((e, i) => i === ei ? { ...e, sets: e.sets.filter((_, j) => j !== si) } : e));

    const save = async () => {
        const cleaned = exercises
            .map(e => ({ name: e.name.trim(), sets: e.sets }))
            .filter(e => e.name);
        if (cleaned.length === 0) {
            toast.error("Add at least one exercise with a name");
            return;
        }
        setSaving(true);
        try {
            const { error } = await supabase.from("workouts").insert({
                title,
                date,
                notes,
                exercises: cleaned,
                user_id: user.sub,
            });
            if (error) throw error;
            toast.success("Workout saved");
            navigate("/workouts");
        } catch (e) {
            toast.error("Failed to save workout");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-6 md:p-10 lg:p-14 space-y-8 max-w-4xl">
            <div>
                <div className="text-xs tracking-[0.25em] uppercase text-muted-foreground mb-2">New Session</div>
                <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tighter">Log Workout</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-border">
                <div className="p-5 border-b md:border-b-0 md:border-r border-border">
                    <label className="text-xs tracking-[0.2em] uppercase text-muted-foreground block mb-2">Title</label>
                    <input
                        data-testid="workout-title-input"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        className="w-full border-0 bg-transparent focus:outline-none text-lg font-semibold"
                    />
                </div>
                <div className="p-5">
                    <label className="text-xs tracking-[0.2em] uppercase text-muted-foreground block mb-2">Date</label>
                    <input
                        data-testid="workout-date-input"
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="w-full border-0 bg-transparent focus:outline-none text-lg font-semibold tabular-nums"
                    />
                </div>
            </div>

            <div className="space-y-6">
                {exercises.map((ex, ei) => (
                    <div key={ei} className="border border-border" data-testid={`exercise-${ei}`}>
                        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                            <input
                                placeholder="Exercise name (e.g. Bench Press)"
                                value={ex.name}
                                onChange={e => updateName(ei, e.target.value)}
                                data-testid={`exercise-name-${ei}`}
                                className="flex-1 bg-transparent border-0 focus:outline-none text-base font-semibold placeholder:font-normal placeholder:text-muted-foreground"
                            />
                            <button onClick={() => removeExercise(ei)} className="p-2 hover:bg-white transition-colors" data-testid={`remove-exercise-${ei}`}>
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
                                    <div className="p-2 sm:p-3 border-r border-border text-sm font-semibold tabular-nums text-center">{si + 1}</div>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={s.reps}
                                        onChange={e => updateSet(ei, si, "reps", e.target.value)}
                                        data-testid={`reps-${ei}-${si}`}
                                        className="w-full min-w-0 p-2 sm:p-3 border-r border-border bg-transparent focus:outline-none focus:bg-muted tabular-nums"
                                    />
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={s.weight}
                                        onChange={e => updateSet(ei, si, "weight", e.target.value)}
                                        data-testid={`weight-${ei}-${si}`}
                                        className="w-full min-w-0 p-2 sm:p-3 border-r border-border bg-transparent focus:outline-none focus:bg-muted tabular-nums"
                                    />
                                    <button onClick={() => removeSet(ei, si)} className="p-2 sm:p-3 hover:bg-muted flex items-center justify-center">
                                        <X className="h-3 w-3 sm:h-4 sm:w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="p-3 border-t border-border">
                            <button
                                onClick={() => addSet(ei)}
                                data-testid={`add-set-${ei}`}
                                className="text-xs tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground flex items-center gap-1"
                            >
                                <Plus className="h-3 w-3" /> Add set
                            </button>
                        </div>
                    </div>
                ))}

                <button
                    onClick={addExercise}
                    data-testid="add-exercise-btn"
                    className="w-full border border-dashed border-border p-4 text-sm tracking-wide text-muted-foreground hover:text-foreground hover:border-primary/40 flex items-center justify-center gap-2 transition-colors"
                >
                    <Plus className="h-4 w-4" /> Add exercise
                </button>
            </div>

            <div className="border border-border p-5">
                <label className="text-xs tracking-[0.2em] uppercase text-muted-foreground block mb-2">Notes</label>
                <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    data-testid="workout-notes"
                    rows={3}
                    placeholder="How did the session feel?"
                    className="w-full bg-transparent border-0 focus:outline-none text-sm"
                />
            </div>

            <div className="flex gap-3">
                <button
                    onClick={save}
                    disabled={saving}
                    data-testid="save-workout-btn"
                    className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold tracking-wide px-6 py-3 disabled:opacity-50 transition-colors"
                >
                    {saving ? "Saving…" : "Save Workout"}
                </button>
                <button onClick={() => navigate(-1)} className="border border-border px-6 py-3 hover:bg-muted transition-colors">
                    Cancel
                </button>
            </div>
        </div>
    );
}
