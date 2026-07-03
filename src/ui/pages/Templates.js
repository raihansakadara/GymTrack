import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { ArrowUpRight } from "lucide-react";
import LoadingIndicator from "../components/LoadingIndicator";

const coverBySplit = {
    "PPL": "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NjZ8MHwxfHNlYXJjaHw0fHxneW0lMjB3b3Jrb3V0JTIwZXhlcmNpc2V8ZW58MHx8fHwxNzgyOTU3NDg0fDA&ixlib=rb-4.1.0&q=85",
    "Full Body": "https://images.pexels.com/photos/6389074/pexels-photo-6389074.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    "Upper/Lower": "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NjZ8MHwxfHNlYXJjaHwyfHxneW0lMjB3b3Jrb3V0JTIwZXhlcmNpc2V8ZW58MHx8fHwxNzgyOTU3NDg0fDA&ixlib=rb-4.1.0&q=85",
};

export default function Templates() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        supabase
            .from("templates")
            .select("*")
            .order("name")
            .then(({ data }) => {
                setItems(data || []);
                setLoading(false);
            });
    }, []);

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
        <div className="p-6 md:p-10 lg:p-14 space-y-10">
            <div>
                <div className="text-xs tracking-[0.25em] uppercase text-muted-foreground mb-2">Programs</div>
                <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tighter">Workout Templates</h1>
                <p className="text-muted-foreground max-w-2xl mt-3">
                    Pre-built splits to bootstrap your session. Tap a template to load its exercises, then customize sets, reps and weights.
                </p>
            </div>

            {Object.entries(grouped).map(([split, list]) => (
                <section key={split} className="space-y-4">
                    <div className="flex items-center justify-between border-b border-border pb-3">
                        <h2 className="font-display text-2xl font-bold tracking-tight">{split}</h2>
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
                                <button
                                    onClick={() => navigate(`/workouts/new?template=${t.id}`)}
                                    data-testid={`use-template-${t.id}`}
                                    className="mt-6 bg-primary text-primary-foreground hover:bg-primary/90 font-bold tracking-wide px-5 py-3 flex items-center justify-center gap-2 transition-colors"
                                >
                                    Use Template <ArrowUpRight className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}
