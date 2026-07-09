import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { Plus, Trash2, X, LayoutTemplate } from "lucide-react";
import { toast } from "sonner";
import Modal from "../components/Modal";
import ExercisePickerModal from "../components/ExercisePickerModal";

const emptySet = () => ({ reps: 8, weight: 0 });

export default function NewRoutine() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [exercises, setExercises] = useState([]);
    const [saving, setSaving] = useState(false);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [templates, setTemplates] = useState([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);
    const [showPicker, setShowPicker] = useState(false);
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const templateId = searchParams.get("template");
        if (templateId) {
            supabase
                .from("templates")
                .select("name, exercises")
                .eq("id", templateId)
                .single()
                .then(({ data }) => {
                    if (data) {
                        setName(data.name);
                        setExercises(
                            data.exercises.map((e) => ({
                                name: e.name,
                                wger_id: e.wger_id ?? null,
                                category: e.category ?? "",
                                equipment: e.equipment ?? [],
                                muscles: e.muscles ?? [],
                                sets: (e.sets || []).map((s) => ({ ...s })),
                            }))
                        );
                    }
                });
        }
    }, [searchParams]);

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
                    equipment: e.equipment ?? [],
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
                equipment: e.equipment ?? [],
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
            toast.success("Routine created");
            navigate("/routines");
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
                <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tighter">Create Routine</h1>
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

            <div className="flex gap-3">
                <button
                    onClick={save}
                    disabled={saving}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold tracking-wide px-6 py-3 disabled:opacity-50 transition-colors"
                >
                    {saving ? "Saving..." : "Save Routine"}
                </button>
                <button
                    onClick={() => navigate("/routines")}
                    className="border border-border px-6 py-3 hover:bg-muted transition-colors"
                >
                    Cancel
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
