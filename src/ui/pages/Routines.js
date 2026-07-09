import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { Plus, Dumbbell, ChevronRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import LoadingIndicator from "../components/LoadingIndicator";
import ConfirmModal from "../components/ConfirmModal";

export default function Routines() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [routines, setRoutines] = useState([]);
    const [workoutCounts, setWorkoutCounts] = useState({});
    const [loading, setLoading] = useState(true);
    const [confirmDelete, setConfirmDelete] = useState(null);

    const handleDelete = async () => {
        if (!confirmDelete) return;
        const { error } = await supabase.from("routines").delete().eq("id", confirmDelete.id);
        if (error) { toast.error("Failed to delete routine"); return; }
        toast.success("Routine deleted");
        setConfirmDelete(null);
        await load();
    };

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
                    New Routine
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
                            <div key={r.id} className="flex items-center group">
                                <button
                                    onClick={() => {
                                        try {
                                            const raw = sessionStorage.getItem("active_workout");
                                            const saved = raw ? JSON.parse(raw) : null;
                                            navigate(saved && String(saved.routineId) === String(r.id) ? `/routines/active/${r.id}` : `/routines/${r.id}`);
                                        } catch {
                                            navigate(`/routines/${r.id}`);
                                        }
                                    }}
                                    className="flex-1 flex items-center justify-between p-5 hover:bg-muted transition-colors text-left"
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
                                <button
                                    onClick={e => { e.stopPropagation(); setConfirmDelete(r); }}
                                    className="border-l border-border p-5 hover:bg-muted transition-colors flex items-center justify-center"
                                >
                                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" strokeWidth={1.5} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            <ConfirmModal
                open={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
                onConfirm={handleDelete}
                title="Delete Routine"
                message={confirmDelete ? `Are you sure you want to delete "${confirmDelete.name}"? This cannot be undone.` : ""}
                confirmText="Delete"
            />
        </div>
    );
}
