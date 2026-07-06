import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { Trash2, Plus } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import LoadingIndicator from "../components/LoadingIndicator";

const fields = [
    { key: "weight", label: "Weight (kg)" },
    { key: "body_fat", label: "Body Fat %" },
    { key: "chest", label: "Chest (cm)" },
    { key: "waist", label: "Waist (cm)" },
    { key: "hips", label: "Hips (cm)" },
    { key: "arms", label: "Arms (cm)" },
    { key: "thighs", label: "Thighs (cm)" },
];

export default function Measurements() {
    const { user } = useAuth();
    const [items, setItems] = useState([]);
    const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10) });
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        const { data } = await supabase
            .from("measurements")
            .select("*")
            .eq("user_id", user.sub)
            .order("date", { ascending: false });
        setItems(data || []);
        setLoading(false);
    }, [user.sub]);

    useEffect(() => { if (user) load(); }, [user, load]);

    const save = async () => {
        const payload = { date: form.date, user_id: user.sub };
        for (const f of fields) if (form[f.key] !== undefined && form[f.key] !== "") payload[f.key] = Number(form[f.key]);
        if (Object.keys(payload).length <= 2) {
            toast.error("Enter at least one metric");
            return;
        }
        const { error } = await supabase.from("measurements").insert(payload);
        if (error) {
            toast.error("Failed to save measurement");
            return;
        }
        toast.success("Measurement saved");
        setForm({ date: new Date().toISOString().slice(0, 10) });
        setShowForm(false);
        load();
    };

    const remove = async (id) => {
        if (!window.confirm("Delete this entry?")) return;
        const { error } = await supabase.from("measurements").delete().eq("id", id);
        if (error) {
            toast.error("Failed to delete");
            return;
        }
        toast.success("Deleted");
        load();
    };

    const weightSeries = items.filter(m => m.weight != null).map(m => ({ date: m.date, weight: m.weight }));

    if (loading) {
        return (
            <div className="p-6 md:p-10 lg:p-14 flex items-center justify-center min-h-[60vh]">
                <LoadingIndicator size={48} className="text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="p-5 space-y-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="text-xs tracking-[0.25em] uppercase text-muted-foreground mb-2">
                        Body
                    </div>

                    <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black tracking-tighter">
                        Measurements
                    </h1>
                </div>

                <button
                    onClick={() => setShowForm(v => !v)}
                    data-testid="toggle-measurement-form"
                    className="w-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90 font-bold tracking-wide rounded-none px-5 py-3 flex items-center justify-center gap-2 transition-colors">
                <Plus className="h-4 w-4" strokeWidth={2} />
                    {showForm ? "Close" : "Add Entry"}
                </button>
            </div>

            {showForm && (
                <div className="border border-border">
                    <div className="grid grid-cols-2 md:grid-cols-4">
                        <div className="p-4 border-r border-b border-border">
                            <label className="text-xs tracking-[0.2em] uppercase text-muted-foreground block mb-2">Date</label>
                            <input
                                type="date"
                                value={form.date}
                                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                                data-testid="measurement-date"
                                className="w-full bg-transparent border-0 focus:outline-none text-base font-semibold tabular-nums"
                            />
                        </div>
                        {fields.map((f, i) => (
                            <div key={f.key} className={`p-4 border-b border-border ${(i + 1) % 4 !== 3 ? "md:border-r" : ""} ${i % 2 === 0 ? "border-r" : ""}`}>
                                <label className="text-xs tracking-[0.2em] uppercase text-muted-foreground block mb-2">{f.label}</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={form[f.key] ?? ""}
                                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                                    data-testid={`measurement-${f.key}`}
                                    className="w-full bg-transparent border-0 focus:outline-none text-base font-semibold tabular-nums"
                                    placeholder="—"
                                />
                            </div>
                        ))}
                    </div>
                    <div className="p-4 border-t border-border">
                        <button
                            onClick={save}
                            data-testid="save-measurement-btn"
                            className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold tracking-wide px-6 py-3 transition-colors"
                        >
                            Save Entry
                        </button>
                    </div>
                </div>
            )}

            {weightSeries.length > 0 && (
                <div className="border border-border p-6 sm:p-8">
                    <div className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-1">Weight Trend</div>
                    <h3 className="font-display text-2xl font-bold tracking-tight mb-4">Bodyweight (kg)</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={weightSeries} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                                <XAxis dataKey="date" stroke="hsl(240, 4%, 46%)" fontSize={11} tickLine={false} axisLine={false} />
                                <YAxis stroke="hsl(240, 4%, 46%)" fontSize={11} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
                                <Tooltip contentStyle={{ borderRadius: 0, border: "1px solid hsl(240, 6%, 90%)", background: "white" }} />
                                <Line type="monotone" dataKey="weight" stroke="hsl(12, 76%, 61%)" strokeWidth={2} dot={{ r: 3, fill: "hsl(12, 76%, 61%)" }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            <div className="border border-border overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                            <th className="text-left p-3 border-b border-border">Date</th>
                            {fields.map(f => (
                                <th key={f.key} className="text-left p-3 border-b border-border">{f.label}</th>
                            ))}
                            <th className="p-3 border-b border-border"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length === 0 && (
                            <tr><td colSpan={fields.length + 2} className="p-10 text-center text-muted-foreground" data-testid="no-measurements">No entries yet.</td></tr>
                        )}
                        {items.map(m => (
                            <tr key={m.id} className="border-b border-border last:border-b-0 hover:bg-muted transition-colors" data-testid={`measurement-row-${m.id}`}>
                                <td className="p-3 font-semibold tabular-nums">{m.date}</td>
                                {fields.map(f => (
                                    <td key={f.key} className="p-3 tabular-nums">{m[f.key] ?? "—"}</td>
                                ))}
                                <td className="p-3 text-right">
                                    <button onClick={() => remove(m.id)} className="p-1.5 hover:bg-background" data-testid={`delete-measurement-${m.id}`}>
                                        <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
