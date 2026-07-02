import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Plus, ArrowUpRight, Dumbbell, Ruler } from "lucide-react";

export default function Dashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [recentWorkouts, setRecentWorkouts] = useState([]);

    useEffect(() => {
        if (!user) return;
        (async () => {
            const { data: workouts } = await supabase
                .from("workouts")
                .select("*")
                .eq("user_id", user.sub)
                .order("date", { ascending: false });

            const { data: measurements } = await supabase
                .from("measurements")
                .select("*")
                .eq("user_id", user.sub)
                .order("date", { ascending: true });

            const list = workouts || [];
            const totalSets = list.reduce((a, w) => a + (w.exercises?.reduce((s, e) => s + (e.sets?.length || 0), 0) || 0), 0);
            const totalVolume = list.reduce((a, w) =>
                    a + (w.exercises?.reduce((s, e) =>
                            s + (e.sets?.reduce((ss, set) => ss + (set.reps || 0) * (set.weight || 0), 0) || 0), 0) || 0), 0);

            const prMap = new Map();
            list.forEach(w =>
                w.exercises?.forEach(ex =>
                    ex.sets?.forEach(s => {
                        const curr = prMap.get(ex.name);
                        if (!curr || s.weight > curr.weight) prMap.set(ex.name, { exercise: ex.name, weight: s.weight });
                    })
                )
            );

            setStats({
                total_workouts: list.length,
                total_sets: totalSets,
                total_volume: totalVolume,
                personal_records: Array.from(prMap.values()).sort((a, b) => b.weight - a.weight),
                weight_series: (measurements || []).filter(m => m.weight != null).map(m => ({ date: m.date, weight: m.weight })),
            });

            setRecentWorkouts(list.slice(0, 5));
        })();
    }, [user]);

    return (
        <div className="p-6 md:p-10 lg:p-14 space-y-12">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                    <div className="text-xs tracking-[0.25em] uppercase text-muted-foreground mb-2">Welcome back</div>
                    <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tighter" data-testid="dashboard-heading">
                        {user?.name?.split(" ")[0] || "Athlete"}.
                    </h1>
                </div>
                <div className="flex gap-3">
                    <Link
                        to="/workouts/new"
                        data-testid="cta-new-workout"
                        className="bg-accent text-accent-foreground hover:bg-accent/90 font-bold tracking-wide rounded-none px-5 py-3 flex items-center gap-2 transition-colors"
                    >
                        <Plus className="h-4 w-4" strokeWidth={2} />
                        Log Workout
                    </Link>
                    <Link
                        to="/measurements"
                        data-testid="cta-add-measurement"
                        className="border border-border bg-transparent text-foreground hover:bg-muted rounded-none px-5 py-3 flex items-center gap-2 transition-colors"
                    >
                        <Ruler className="h-4 w-4" strokeWidth={1.5} />
                        Add Metric
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 border border-border">
                {[
                    { label: "Workouts", value: stats?.total_workouts ?? 0 },
                    { label: "Total Sets", value: stats?.total_sets ?? 0 },
                    { label: "Volume (kg)", value: Math.round(stats?.total_volume ?? 0).toLocaleString() },
                    { label: "PRs Tracked", value: stats?.personal_records?.length ?? 0 },
                ].map((s, i) => (
                    <div
                        key={s.label}
                        className={`p-6 sm:p-8 ${i < 3 ? "md:border-r border-border" : ""} ${i < 2 ? "border-r border-border md:border-r" : ""} ${i < 2 ? "border-b md:border-b-0" : ""}`}
                    >
                        <div className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-3">{s.label}</div>
                        <div className="font-display text-4xl sm:text-5xl font-black tracking-tighter tabular-nums">{s.value}</div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border border-border">
                <div className="lg:col-span-2 p-6 sm:p-8 border-b lg:border-b-0 lg:border-r border-border">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <div className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-1">Bodyweight Trend</div>
                            <h3 className="font-display text-2xl font-bold tracking-tight">Progress over time</h3>
                        </div>
                    </div>
                    <div className="h-64">
                        {stats?.weight_series?.length ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={stats.weight_series} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                                    <XAxis dataKey="date" stroke="hsl(240, 4%, 46%)" fontSize={11} tickLine={false} axisLine={false} />
                                    <YAxis stroke="hsl(240, 4%, 46%)" fontSize={11} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
                                    <Tooltip contentStyle={{ borderRadius: 0, border: "1px solid hsl(240, 6%, 90%)", background: "white" }} />
                                    <Line type="monotone" dataKey="weight" stroke="hsl(12, 76%, 61%)" strokeWidth={2} dot={{ r: 3, fill: "hsl(12, 76%, 61%)" }} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                                <div className="text-center">
                                    <div className="text-xs tracking-[0.25em] uppercase mb-2">No data yet</div>
                                    <Link to="/measurements" className="underline underline-offset-4">Log your first measurement →</Link>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 sm:p-8">
                    <div className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-4">Personal Records</div>
                    <div className="space-y-3">
                        {stats?.personal_records?.length ? (
                            stats.personal_records.slice(0, 6).map((pr) => (
                                <div key={pr.exercise} className="flex items-center justify-between border-b border-border pb-2 last:border-b-0">
                                    <span className="text-sm truncate pr-2">{pr.exercise}</span>
                                    <span className="font-display text-base font-bold tabular-nums">{pr.weight} kg</span>
                                </div>
                            ))
                        ) : (
                            <div className="text-sm text-muted-foreground">Start logging to build your PR board.</div>
                        )}
                    </div>
                </div>
            </div>

            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display text-2xl font-bold tracking-tight">Recent Workouts</h3>
                    <Link to="/workouts" className="text-xs tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground flex items-center gap-1">
                        View all <ArrowUpRight className="h-3 w-3" />
                    </Link>
                </div>
                <div className="border border-border">
                    {recentWorkouts.length ? (
                        recentWorkouts.map((w) => (
                            <Link
                                key={w.id}
                                to={`/workouts`}
                                className="flex items-center justify-between p-4 sm:p-5 border-b border-border last:border-b-0 hover:bg-muted transition-colors"
                                data-testid={`recent-workout-${w.id}`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-9 h-9 border border-border flex items-center justify-center">
                                        <Dumbbell className="h-4 w-4" strokeWidth={1.5} />
                                    </div>
                                    <div>
                                        <div className="font-semibold">{w.title}</div>
                                        <div className="text-xs text-muted-foreground tracking-wide">{w.date} · {w.exercises?.length || 0} exercises</div>
                                    </div>
                                </div>
                                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                            </Link>
                        ))
                    ) : (
                        <div className="p-8 text-center text-sm text-muted-foreground">
                            No workouts yet. <Link to="/workouts/new" className="underline underline-offset-4">Log your first one</Link>.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
