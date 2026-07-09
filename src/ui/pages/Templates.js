import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Plus, Trash2, X, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import LoadingIndicator from "../components/LoadingIndicator";
import Modal from "../components/Modal";
import ConfirmModal from "../components/ConfirmModal";
import ExercisePickerModal from "../components/ExercisePickerModal";

const coverBySplit = {
    "Custom": "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NjZ8MHwxfHNlYXJjaHwxfHxneW0lMjBpbnRlcmlvcnxlbnwwfHx8fDE3ODI5NTc0ODR8MA&ixlib=rb-4.1.0&q=85",
    "PPL": "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NjZ8MHwxfHNlYXJjaHw0fHxneW0lMjB3b3Jrb3V0JTIwZXhlcmNpc2V8ZW58MHx8fHwxNzgyOTU3NDg0fDA&ixlib=rb-4.1.0&q=85",
    "Full Body": "https://images.pexels.com/photos/6389074/pexels-photo-6389074.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    "Upper/Lower": "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NjZ8MHwxfHNlYXJjaHwyfHxneW0lMjB3b3Jrb3V0JTIwZXhlcmNpc2V8ZW58MHx8fHwxNzgyOTU3NDg0fDA&ixlib=rb-4.1.0&q=85",
};

const emptySet = () => ({ reps: 8, weight: 0 });

export default function Templates() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [form, setForm] = useState({ name: "", description: "", exercises: [] });
    const [showPicker, setShowPicker] = useState(false);
    const navigate = useNavigate();

    const loadTemplates = useCallback(async () => {
        const { data } = await supabase.from("templates").select("*").order("name");
        setItems(data || []);
        setLoading(false);
    }, []);

    useEffect(() => { loadTemplates(); }, [loadTemplates]);

    const openModal = () => {
        setForm({ name: "", description: "", exercises: [] });
        setModalOpen(true);
    };

    const updateSet = (ei, si, field, val) => setForm(f => ({
        ...f, exercises: f.exercises.map((e, i) => i !== ei ? e : {
            ...e, sets: e.sets.map((s, j) => j !== si ? s : { ...s, [field]: Number(val) || 0 })
        })
    }));
    const addSet = (ei) => setForm(f => ({
        ...f, exercises: f.exercises.map((e, i) => i === ei ? { ...e, sets: [...e.sets, emptySet()] } : e)
    }));
    const removeSet = (ei, si) => setForm(f => ({
        ...f, exercises: f.exercises.map((e, i) => i === ei ? { ...e, sets: e.sets.filter((_, j) => j !== si) } : e)
    }));
    const addExerciseFromPicker = (ex) =>
        setForm(f => ({
            ...f,
            exercises: [...f.exercises, {
                name: ex.name,
                wger_id: ex.wger_id ?? null,
                category: ex.category ?? "",
                equipment: ex.equipment ?? [],
                muscles: ex.muscles ?? [],
                sets: [emptySet(), emptySet(), emptySet()],
            }],
        }));

    const removeExercise = (ei) => setForm(f => ({ ...f, exercises: f.exercises.filter((_, j) => j !== ei) }));

    const handleSave = async () => {
        const exercises = form.exercises.filter(e => e.name.trim()).map(e => ({
            name: e.name.trim(),
            wger_id: e.wger_id ?? null,
            category: e.category ?? "",
            equipment: e.equipment ?? [],
            muscles: e.muscles ?? [],
            sets: e.sets,
        }));
        if (!form.name.trim()) { toast.error("Please enter a template name"); return; }
        if (!exercises.length) { toast.error("Add at least one exercise"); return; }

        const { error } = await supabase.from("templates").insert({
            name: form.name.trim(),
            split: "Custom",
            description: form.description.trim(),
            exercises,
        });
        if (error) { toast.error("Failed to save template"); return; }
        toast.success("Template created");
        setModalOpen(false);
        await loadTemplates();
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        const { error } = await supabase.from("templates").delete().eq("id", confirmDelete.id);
        if (error) { toast.error("Failed to delete template"); return; }
        toast.success("Template deleted");
        setConfirmDelete(null);
        await loadTemplates();
    };

    const grouped = items.reduce((acc, t) => {
        acc[t.split] = acc[t.split] || [];
        acc[t.split].push(t);
        return acc;
    }, {});

    if (loading) {
        return (
            <div className="p-6 md:p-10 lg:p-14 flex items-center justify-center min-h-[60vh]">
                <LoadingIndicator size={48} className="text-muted-foreground" />
            </div>
        );
    }

    return (
        <>
            <div className="p-5 space-y-10">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <div className="text-xs tracking-[0.25em] uppercase text-muted-foreground mb-2">Programs</div>
                        <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tighter">Workout Templates</h1>
                        <p className="text-muted-foreground max-w-2xl mt-3">
                            Pre-built splits to bootstrap your session. Tap a template to load its exercises, then customize sets, reps and weights.
                        </p>
                    </div>
                    <button
                        onClick={openModal}
                        className="w-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90 font-bold tracking-wide rounded-none px-5 py-3 flex items-center justify-center gap-2 transition-colors"
                    >
                        <Plus className="h-4 w-4" strokeWidth={2} />
                        Custom Template
                    </button>
                </div>

                {[
                    ...(grouped["Custom"] ? [["Custom", grouped["Custom"]]] : []),
                    ...Object.entries(grouped).filter(([k]) => k !== "Custom"),
                ].map(([split, list]) => (
                    <section key={split} className="space-y-4">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <h2 className="font-display text-2xl font-bold tracking-tight">{split === "Custom" ? "Custom Exercises" : split}</h2>
                            <div className="text-xs tracking-[0.2em] uppercase text-muted-foreground">{list.length} templates</div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border border-border">
                            {list.map((t, idx) => (
                                <div
                                    key={t.id}
                                    className={`p-6 flex flex-col justify-between hover:bg-muted transition-colors ${idx < list.length - 1 ? "border-b md:border-b-0 md:border-r border-border" : ""}`}
                                    data-testid={`template-card-${t.id}`}
                                >
                                    <div>
                                        <div className="aspect-video w-full mb-4 overflow-hidden border border-border">
                                            <img src={coverBySplit[t.split]} alt={t.name} className="w-full h-full object-cover grayscale" />
                                        </div>
                                        <div className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-1">{t.split}</div>
                                        <h3 className="font-display text-2xl font-bold tracking-tight">{t.name}</h3>
                                        <p className="text-sm text-muted-foreground mt-2">{t.description}</p>
                                        <ul className="mt-4 space-y-1">
                                            {t.exercises.slice(0, 5).map((ex, i) => (
                                                <li key={i} className="text-sm border-b border-border py-1.5 last:border-b-0">
                                                    <span className="text-muted-foreground tracking-wider text-xs mr-3">{String(i + 1).padStart(2, "0")}</span>
                                                    {ex.name}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="mt-6 flex gap-2">
                                        <button
                                            onClick={() => navigate(`/routines/new?template=${t.id}`)}
                                            data-testid={`use-template-${t.id}`}
                                            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-bold tracking-wide px-5 py-3 flex items-center justify-center gap-2 transition-colors"
                                        >
                                            Use Template <ArrowUpRight className="h-4 w-4" />
                                        </button>
                                        {t.split === "Custom" && (
                                            <button
                                                onClick={e => { e.preventDefault(); setConfirmDelete({ id: t.id, name: t.name }); }}
                                                className="border border-border p-3 hover:bg-muted transition-colors flex items-center justify-center"
                                            >
                                                <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ))}
            </div>

            <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Custom Template" onConfirm={handleSave} confirmText="Save Template">
                <div>
                    <label className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-2 block">Name</label>
                    <input
                        type="text"
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="e.g. Push Day"
                        className="w-full border border-border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                </div>
                <div>
                    <label className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-2 block">Description</label>
                    <textarea
                        value={form.description}
                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                        placeholder="Brief description of this template"
                        rows={3}
                        className="w-full border border-border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                    />
                </div>
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <label className="text-xs tracking-[0.2em] uppercase text-muted-foreground">Exercises</label>
                    </div>
                    <div className="space-y-4">
                        {form.exercises.map((ex, ei) => (
                            <div key={ei} className="border border-border">
                            <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
                                <div className="min-w-0 flex-1">
                                    <div className="text-sm font-semibold truncate">{ex.name}</div>
                                    <div className="text-[11px] text-muted-foreground flex gap-2 mt-0.5">
                                        {ex.category && (
                                            <span className="uppercase tracking-wider">{ex.category}</span>
                                        )}
                                        {ex.equipment?.length > 0 && (
                                            <span>· {ex.equipment.slice(0, 2).join(", ")}</span>
                                        )}
                                    </div>
                                </div>
                                <button onClick={() => removeExercise(ei)} className="p-1 hover:bg-white transition-colors shrink-0 ml-2">
                                    <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                                </button>
                            </div>
                                <div>
                                    <div className="grid grid-cols-[32px_1fr_1fr_28px] border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                                        <div className="p-2 border-r border-border text-center">#</div>
                                        <div className="p-2 border-r border-border">Reps</div>
                                        <div className="p-2 border-r border-border">Wt (kg)</div>
                                        <div className="p-2"></div>
                                    </div>
                                    {ex.sets.map((s, si) => (
                                        <div key={si} className="grid grid-cols-[32px_1fr_1fr_28px] border-b border-border last:border-b-0">
                                            <div className="p-2 border-r border-border text-sm font-semibold tabular-nums text-center">{si + 1}</div>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                value={s.reps}
                                                onChange={e => updateSet(ei, si, "reps", e.target.value)}
                                                className="w-full min-w-0 p-2 border-r border-border bg-transparent focus:outline-none focus:bg-muted tabular-nums text-sm"
                                            />
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                value={s.weight}
                                                onChange={e => updateSet(ei, si, "weight", e.target.value)}
                                                className="w-full min-w-0 p-2 border-r border-border bg-transparent focus:outline-none focus:bg-muted tabular-nums text-sm"
                                            />
                                            <button onClick={() => removeSet(ei, si)} className="p-2 hover:bg-muted flex items-center justify-center">
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-2 border-t border-border">
                                    <button
                                        onClick={() => addSet(ei)}
                                        className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground flex items-center gap-1"
                                    >
                                        <Plus className="h-3 w-3" /> Add set
                                    </button>
                                </div>
                            </div>
                        ))}
                        <button
                            onClick={() => setShowPicker(true)}
                            className="w-full border border-dashed border-border p-3 text-sm tracking-wide text-muted-foreground hover:text-foreground hover:border-primary/40 flex items-center justify-center gap-2 transition-colors"
                        >
                            <Plus className="h-4 w-4" /> Add exercise
                        </button>
                    </div>
                </div>
            </Modal>

            {showPicker && (
                <ExercisePickerModal
                    onSelect={(ex) => {
                        addExerciseFromPicker(ex);
                        setShowPicker(false);
                    }}
                    onClose={() => setShowPicker(false)}
                />
            )}

            <ConfirmModal
                open={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
                onConfirm={handleDelete}
                title="Delete Template"
                message={confirmDelete ? `Are you sure you want to delete "${confirmDelete.name}"? This cannot be undone.` : ""}
                confirmText="Delete"
            />
        </>
    );
}
