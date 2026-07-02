import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { ChevronLeft, ChevronRight } from "lucide-react";

function monthMatrix(year, month) {
    const first = new Date(year, month, 1);
    const startDay = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CalendarPage() {
    const { user } = useAuth();
    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth());
    const [workouts, setWorkouts] = useState([]);

    useEffect(() => {
        if (!user) return;
        supabase
            .from("workouts")
            .select("*")
            .eq("user_id", user.sub)
            .then(({ data }) => setWorkouts(data || []));
    }, [user]);

    const byDate = useMemo(() => {
        const m = new Map();
        workouts.forEach(w => {
            if (!m.has(w.date)) m.set(w.date, []);
            m.get(w.date).push(w);
        });
        return m;
    }, [workouts]);

    const cells = monthMatrix(year, month);
    const todayISO = new Date().toISOString().slice(0, 10);

    const prev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
    const next = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

    const monthCount = workouts.filter(w => {
        const d = new Date(w.date);
        return d.getFullYear() === year && d.getMonth() === month;
    }).length;

    return (
        <div className="p-6 md:p-10 lg:p-14 space-y-8">
            <div className="flex items-end justify-between">
                <div>
                    <div className="text-xs tracking-[0.25em] uppercase text-muted-foreground mb-2">Schedule</div>
                    <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tighter">Calendar</h1>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={prev} data-testid="calendar-prev" className="p-2 border border-border hover:bg-muted transition-colors">
                        <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                    <div className="font-display text-xl font-bold tabular-nums min-w-[180px] text-center">
                        {MONTHS[month]} {year}
                    </div>
                    <button onClick={next} data-testid="calendar-next" className="p-2 border border-border hover:bg-muted transition-colors">
                        <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-6 text-xs tracking-[0.2em] uppercase text-muted-foreground">
                <span>{monthCount} sessions this month</span>
                <span className="flex items-center gap-2"><span className="w-2 h-2 bg-accent inline-block" /> Workout day</span>
            </div>

            <div className="border border-border">
                <div className="grid grid-cols-7 border-b border-border">
                    {WEEKDAYS.map(d => (
                        <div key={d} className="p-3 text-xs uppercase tracking-wider text-muted-foreground border-r last:border-r-0 border-border">{d}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7">
                    {cells.map((cell, i) => {
                        const iso = cell ? `${cell.getFullYear()}-${String(cell.getMonth() + 1).padStart(2, "0")}-${String(cell.getDate()).padStart(2, "0")}` : null;
                        const dayWorkouts = iso ? byDate.get(iso) || [] : [];
                        const isToday = iso === todayISO;
                        return (
                            <div
                                key={i}
                                className={`min-h-[100px] p-3 border-r border-b last:border-r-0 border-border ${!cell ? "bg-muted/30" : ""}`}
                                data-testid={cell ? `calendar-day-${iso}` : undefined}
                            >
                                {cell && (
                                    <>
                                        <div className={`flex items-center justify-between mb-2 ${isToday ? "font-bold" : ""}`}>
                                            <span className="text-sm tabular-nums">{cell.getDate()}</span>
                                            {dayWorkouts.length > 0 && <span className="w-2 h-2 bg-accent" />}
                                        </div>
                                        <div className="space-y-1">
                                            {dayWorkouts.slice(0, 2).map(w => (
                                                <div key={w.id} className="text-xs truncate border-l-2 border-accent pl-2">{w.title}</div>
                                            ))}
                                            {dayWorkouts.length > 2 && <div className="text-xs text-muted-foreground">+{dayWorkouts.length - 2}</div>}
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
