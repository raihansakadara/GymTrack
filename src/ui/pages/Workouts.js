import {useEffect, useState, useCallback} from "react";
import {Link} from "react-router-dom";
import {supabase} from "../../lib/supabase";
import {useAuth} from "../contexts/AuthContext";
import {Plus, Trash2, ChevronDown, ChevronUp} from "lucide-react";
import {toast} from "sonner";
import LoadingIndicator from "../components/LoadingIndicator";

export default function Workouts() {
    const {user} = useAuth();
    const [items, setItems] = useState([]);
    const [openId, setOpenId] = useState(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        const {data, error} = await supabase
            .from("workouts")
            .select("*")
            .eq("user_id", user.sub)
            .order("date", {ascending: false});
        if (error) {
            toast.error("Failed to load workouts");
            return;
        }
        setItems(data || []);
        setLoading(false);
    }, [user.sub]);

    useEffect(() => {
        if (user) load();
    }, [user, load]);

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this workout?")) return;
        const {error} = await supabase.from("workouts").delete().eq("id", id);
        if (error) {
            toast.error("Failed to delete workout");
            return;
        }
        toast.success("Workout deleted");
        load();
    };

    if (loading) {
        return (
            <div className="p-6 md:p-10 lg:p-14 flex items-center justify-center min-h-[60vh]">
                <LoadingIndicator size={48} className="text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="p-6 md:p-10 lg:p-14 space-y-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="text-xs tracking-[0.25em] uppercase text-muted-foreground mb-2">Log</div>
                    <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tighter">Workouts</h1>
                </div>
                <Link
                    to="/workouts/new"
                    data-testid="new-workout-btn"
                    className="w-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90 font-bold tracking-wide rounded-none px-5 py-3 flex items-center justify-center gap-2 transition-colors">
                    <Plus className="h-4 w-4" strokeWidth={2}/>
                    Log Workout
                </Link>
            </div>

            <div className="border border-border">
                {items.length === 0 && (
                    <div className="p-10 text-center text-sm text-muted-foreground" data-testid="no-workouts">
                        No workouts yet. Start with a template or log a custom session.
                    </div>
                )}
                {items.map((w) => {
                    const isOpen = openId === w.id;
                    const totalSets = w.exercises?.reduce((a, e) => a + (e.sets?.length || 0), 0) || 0;
                    return (
                        <div key={w.id} className="border-b border-border last:border-b-0"
                             data-testid={`workout-row-${w.id}`}>
                            <div
                                className="flex items-center justify-between p-5 hover:bg-muted transition-colors cursor-pointer"
                                onClick={() => setOpenId(isOpen ? null : w.id)}>
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold truncate">{w.title}</div>
                                    <div className="text-xs text-muted-foreground tracking-wide mt-1">
                                        {w.date} · {w.exercises?.length || 0} exercises · {totalSets} sets
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(w.id);
                                        }}
                                        data-testid={`delete-workout-${w.id}`}
                                        className="p-2 hover:bg-background transition-colors"
                                    >
                                        <Trash2 className="h-4 w-4" strokeWidth={1.5}/>
                                    </button>
                                    {isOpen ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>}
                                </div>
                            </div>
                            {isOpen && (
                                <div className="border-t border-border bg-muted/30 p-5 space-y-4">
                                    {w.exercises?.map((ex, i) => (
                                        <div key={i}>
                                            <div
                                                className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-2">{ex.name}</div>
                                            <div className="grid grid-cols-3 border border-border bg-white">
                                                <div
                                                    className="p-2 text-xs uppercase tracking-wider text-muted-foreground border-r border-border">Set
                                                </div>
                                                <div
                                                    className="p-2 text-xs uppercase tracking-wider text-muted-foreground border-r border-border">Reps
                                                </div>
                                                <div
                                                    className="p-2 text-xs uppercase tracking-wider text-muted-foreground">Weight
                                                    (kg)
                                                </div>
                                                {ex.sets?.map((s, si) => (
                                                    <div key={si} className="contents">
                                                        <div
                                                            className="p-2 border-t border-r border-border text-sm tabular-nums">{si + 1}</div>
                                                        <div
                                                            className="p-2 border-t border-r border-border text-sm tabular-nums">{s.reps}</div>
                                                        <div
                                                            className="p-2 border-t border-border text-sm tabular-nums">{s.weight}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    {w.notes && (
                                        <div className="text-sm text-muted-foreground border-t border-border pt-3">
                                            <span className="text-xs uppercase tracking-wider">Notes: </span>{w.notes}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
