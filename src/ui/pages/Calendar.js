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

    for (let d = 1; d <= daysInMonth; d++) {
        cells.push(new Date(year, month, d));
    }

    while (cells.length % 7 !== 0) cells.push(null);

    return cells;
}

const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

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
            .then(({ data }) => {
                setWorkouts(data || []);
            });
    }, [user]);

    const byDate = useMemo(() => {
        const map = new Map();

        workouts.forEach((w) => {
            if (!map.has(w.date)) map.set(w.date, []);
            map.get(w.date).push(w);
        });

        return map;
    }, [workouts]);

    const cells = monthMatrix(year, month);

    const todayISO = new Date().toISOString().slice(0, 10);

    const prev = () => {
        if (month === 0) {
            setMonth(11);
            setYear((y) => y - 1);
        } else {
            setMonth((m) => m - 1);
        }
    };

    const next = () => {
        if (month === 11) {
            setMonth(0);
            setYear((y) => y + 1);
        } else {
            setMonth((m) => m + 1);
        }
    };

    const monthCount = workouts.filter((w) => {
        const d = new Date(w.date);
        return d.getFullYear() === year && d.getMonth() === month;
    }).length;

    return (
        <div className="p-4 sm:p-6 md:p-8 lg:p-10 space-y-6">

            {/* Header */}

            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

                <div>
                    <div className="text-[11px] tracking-[0.25em] uppercase text-muted-foreground">
                        Schedule
                    </div>

                    <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">
                        Calendar
                    </h1>
                </div>

                <div className="flex items-center justify-center gap-3">

                    <button
                        onClick={prev}
                        data-testid="calendar-prev"
                        className="h-10 w-10 flex items-center justify-center border border-border hover:bg-muted transition"
                    >
                        <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
                    </button>

                    <div className="font-display font-bold text-lg sm:text-xl min-w-[170px] text-center">
                        {MONTHS[month]} {year}
                    </div>

                    <button
                        onClick={next}
                        data-testid="calendar-next"
                        className="h-10 w-10 flex items-center justify-center border border-border hover:bg-muted transition"
                    >
                        <ChevronRight className="h-5 w-5" strokeWidth={1.5} />
                    </button>

                </div>

            </div>

            {/* Stats */}

            <div className="flex flex-wrap items-center gap-4 text-[11px] sm:text-xs uppercase tracking-[0.18em] text-muted-foreground">

                <span>{monthCount} sessions this month</span>

                <span className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-accent rounded-full"></span>
                    Workout day
                </span>

            </div>

            {/* Calendar */}

            <div className="overflow-x-auto rounded-lg border border-border">

                <div className="min-w-[720px]">

                    {/* Weekdays */}

                    <div className="grid grid-cols-7 border-b border-border bg-background">

                        {WEEKDAYS.map((day) => (
                            <div
                                key={day}
                                className="border-r last:border-r-0 border-border py-3 text-center text-xs uppercase tracking-wider text-muted-foreground"
                            >
                                {day}
                            </div>
                        ))}

                    </div>

                    {/* Calendar Body */}

                    <div className="grid grid-cols-7">

                        {cells.map((cell, index) => {

                            const iso = cell
                                ? `${cell.getFullYear()}-${String(
                                    cell.getMonth() + 1
                                ).padStart(2, "0")}-${String(
                                    cell.getDate()
                                ).padStart(2, "0")}`
                                : null;

                            const dayWorkouts = iso
                                ? byDate.get(iso) || []
                                : [];

                            const isToday = iso === todayISO;

                            return (
                                <div
                                    key={index}
                                    data-testid={
                                        cell
                                            ? `calendar-day-${iso}`
                                            : undefined
                                    }
                                    className={`border-r border-b border-border p-2 sm:p-3 min-h-[80px] sm:min-h-[110px] lg:min-h-[130px]
                                    ${!cell ? "bg-muted/30" : "bg-background"}`}
                                >
                                    {cell && (
                                        <>
                                            <div className="flex items-center justify-between mb-2">

                                                <span
                                                    className={`text-sm sm:text-base ${
                                                        isToday
                                                            ? "font-bold text-primary"
                                                            : ""
                                                    }`}
                                                >
                                                    {cell.getDate()}
                                                </span>

                                                {dayWorkouts.length > 0 && (
                                                    <span className="h-2.5 w-2.5 rounded-full bg-accent"></span>
                                                )}

                                            </div>

                                            <div className="space-y-1">

                                                {dayWorkouts
                                                    .slice(0, 2)
                                                    .map((workout) => (
                                                        <div
                                                            key={workout.id}
                                                            className="border-l-2 border-accent pl-2 text-[10px] sm:text-xs truncate"
                                                        >
                                                            {workout.title}
                                                        </div>
                                                    ))}

                                                {dayWorkouts.length > 2 && (
                                                    <div className="text-[10px] sm:text-xs text-muted-foreground">
                                                        +{dayWorkouts.length - 2} more
                                                    </div>
                                                )}

                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}

                    </div>

                </div>

            </div>

        </div>
    );
}