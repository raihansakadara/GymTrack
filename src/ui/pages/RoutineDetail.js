import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { ArrowLeft, Play, Dumbbell, ChevronDown, ChevronUp, Download } from "lucide-react";
import { toast } from "sonner";
import LoadingIndicator from "../components/LoadingIndicator";
import html2canvas from "html2canvas";

export default function RoutineDetail() {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [routine, setRoutine] = useState(null);
    const [workouts, setWorkouts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openWorkout, setOpenWorkout] = useState(null);
    const [cardBg, setCardBg] = useState(null);
    const [exporting, setExporting] = useState(false);
    const fileInputRef = useRef(null);
    const cardRef = useRef(null);

    useEffect(() => {
        if (!user) return;
        (async () => {
            const { data: rtn, error } = await supabase
                .from("routines")
                .select("*")
                .eq("id", id)
                .single();

            if (error || !rtn) {
                toast.error("Routine not found");
                navigate("/routines");
                return;
            }
            setRoutine(rtn);

            const { data: wos } = await supabase
                .from("workouts")
                .select("id, title, date, exercises, notes, duration")
                .eq("user_id", user.sub)
                .eq("routine_id", id)
                .order("date", { ascending: false });

            if (wos) setWorkouts(wos);

            setLoading(false);
        })();
    }, [user, id, navigate]);

    const buildProgress = () => {
        if (!routine || !workouts.length) return [];

        const matchedIds = new Set();

        const routineProgress = routine.exercises.map((rex) => {
            const entries = [];
            for (const w of workouts) {
                const match = w.exercises?.find(
                    (wex) => wex.wger_id != null && wex.wger_id === rex.wger_id
                );
                if (match) {
                    entries.push({
                        date: w.date,
                        workoutId: w.id,
                        sets: match.sets || [],
                    });
                    if (rex.wger_id) matchedIds.add(rex.wger_id);
                }
            }

            const bestSet = entries.reduce(
                (best, e) => {
                    const max = e.sets.reduce(
                        (m, s) => (s.weight > m.weight ? s : m),
                        { weight: 0, reps: 0 }
                    );
                    return max.weight > best.weight ? max : best;
                },
                { weight: 0, reps: 0 }
            );

            const maxSets = Math.max(
                ...entries.map((e) => e.sets.length),
                0
            );

            return {
                ...rex,
                entries,
                bestSet,
                maxSets,
            };
        });

        const adhoc = [];
        for (const w of workouts) {
            for (const wex of w.exercises || []) {
                if (wex.wger_id && !matchedIds.has(wex.wger_id)) {
                    matchedIds.add(wex.wger_id);
                    const wEntries = [];
                    for (const w2 of workouts) {
                        const m = w2.exercises?.find(
                            (ex2) => ex2.wger_id === wex.wger_id
                        );
                        if (m) {
                            wEntries.push({
                                date: w2.date,
                                workoutId: w2.id,
                                sets: m.sets || [],
                            });
                        }
                    }
                    const bestSet = wEntries.reduce(
                        (best, e) => {
                            const max = e.sets.reduce(
                                (m, s) => (s.weight > m.weight ? s : m),
                                { weight: 0, reps: 0 }
                            );
                            return max.weight > best.weight ? max : best;
                        },
                        { weight: 0, reps: 0 }
                    );
                    const maxSets = Math.max(
                        ...wEntries.map((e) => e.sets.length),
                        0
                    );
                    adhoc.push({
                        name: wex.name,
                        wger_id: wex.wger_id,
                        category: wex.category ?? "",
                        equipment: wex.equipment ?? [],
                        muscles: wex.muscles ?? [],
                        entries: wEntries,
                        bestSet,
                        maxSets,
                    });
                }
            }
        }

        return [...routineProgress, ...adhoc];
    };

    if (loading) {
        return (
            <div className="p-6 md:p-10 lg:p-14 flex items-center justify-center min-h-[60vh]">
                <LoadingIndicator size={48} className="text-muted-foreground" />
            </div>
        );
    }

    if (!routine) return null;

    const progress = buildProgress();
    const hasWorkouts = workouts.length > 0;

    const totalDuration = workouts.reduce((sum, w) => sum + (w.duration || 0), 0);
    const totalVolume = workouts.reduce((sum, w) =>
        sum + (w.exercises || []).reduce((s, ex) =>
            s + (ex.sets || []).reduce((ss, set) => ss + (set.weight || 0) * (set.reps || 0), 0), 0), 0);
    const totalSets = workouts.reduce((sum, w) =>
        sum + (w.exercises || []).reduce((s, ex) => s + (ex.sets || []).length, 0), 0);

    const exerciseSummaries = progress.map((p) => {
        const allSets = p.entries.flatMap((e) => e.sets);
        const bestSet = allSets.reduce(
            (best, s) => (s.weight > best.weight ? s : best),
            { weight: 0, reps: 0 }
        );
        const volume = allSets.reduce((sum, s) => sum + (s.weight || 0) * (s.reps || 0), 0);
        return { name: p.name, bestSet, volume, setCount: allSets.length };
    });

    const handleDownload = async () => {
        if (!cardRef.current) return;
        setExporting(true);
        try {
            const canvas = await html2canvas(cardRef.current, {
                scale: 2,
                useCORS: true,
                allowTaint: false,
                backgroundColor: null,
                width: 360,
                height: 640,
            });
            const link = document.createElement("a");
            link.download = `${routine.name.replace(/\s+/g, "_")}_summary.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
        } catch {
            toast.error("Failed to export image");
        } finally {
            setExporting(false);
        }
    };

    const handleDownloadWorkout = async (w) => {
        const wVolume = (w.exercises || []).reduce((s, ex) =>
            s + (ex.sets || []).reduce((ss, set) => ss + (set.weight || 0) * (set.reps || 0), 0), 0);
        const wSets = (w.exercises || []).reduce((s, ex) => s + (ex.sets || []).length, 0);
        const wDuration = w.duration || 0;

        const div = document.createElement("div");
        div.style.cssText = "position:fixed;top:0;left:0;z-index:-1;width:360px;height:640px;display:flex;flex-direction:column;overflow:hidden";
        div.style.padding = cardBg ? "0" : "24px";
        div.style.background = cardBg
            ? `url(${cardBg}) center/cover no-repeat`
            : "#000";
        div.style.color = "#fff";
        div.style.fontFamily = "system-ui, -apple-system, sans-serif";

        const innerBg = cardBg ? "brightness(0.6)" : "none";
        const innerPadding = cardBg ? "12px" : "0";
        const innerRadius = cardBg ? "8px" : "0";
        const innerBgColor = cardBg ? "rgba(0,0,0,0.3)" : "none";

        const formattedDate = new Date(w.date + "T00:00:00").toLocaleDateString("en-US", {
            weekday: "long", month: "long", day: "numeric", year: "numeric",
        });

        div.innerHTML = `
            <div style="flex:1;display:flex;flex-direction:column;backdrop-filter:${innerBg};padding:${innerPadding};border-radius:${innerRadius};background:${innerBgColor}">
                <div style="font-size:9px;letter-spacing:0.25em;text-transform:uppercase;opacity:0.6;margin-bottom:4px">Workout Summary</div>
                <h1 style="font-size:16px;font-weight:900;letter-spacing:-0.03em;margin:0 0 2px">${w.title}</h1>
                <div style="font-size:11px;opacity:0.7;margin-bottom:8px">${formattedDate}</div>
                <div style="margin-top:8px">
                    <div style="font-size:9px;font-weight:700;opacity:0.6;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:2px">Duration</div>
                    <div style="font-size:16px;font-weight:900;margin-bottom:12px">${Math.floor(wDuration / 60)}m ${wDuration % 60}s</div>
                </div>
                <div style="margin-bottom:8px">
                    <div style="font-size:10px;font-weight:700;opacity:0.6;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:2px">Total Volume</div>
                    <div style="font-size:18px;font-weight:900">${wVolume.toLocaleString()} kg</div>
                </div>
                <div>
                    <div style="font-size:10px;font-weight:700;opacity:0.6;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:2px">Total Sets</div>
                    <div style="font-size:18px;font-weight:900">${wSets}</div>
                </div>
                <div style="font-family:var(--font-display,inherit);font-size:18px;font-weight:900;letter-spacing:-0.03em;text-align:center;margin-top:auto;margin-bottom:12px">GymTrack</div>
            </div>
            
        `;

        document.body.appendChild(div);

        try {
            const canvas = await html2canvas(div, { scale: 2, useCORS: true, allowTaint: false, backgroundColor: null, width: 360, height: 640 });
            const link = document.createElement("a");
            link.download = `${w.title.replace(/\s+/g, "_")}_${w.date}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
        } catch {
            toast.error("Failed to export workout image");
        } finally {
            document.body.removeChild(div);
        }
    };

    return (
        <div className="p-5 sm:p-8 space-y-8 max-w-4xl">
            <button
                    onClick={() => navigate("/routines")}
                className="flex items-center gap-2 text-xs tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground transition-colors"
            >
                <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
                Back to Routines
            </button>

            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                    <div className="text-xs tracking-[0.25em] uppercase text-muted-foreground mb-2">Routine</div>
                    <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tighter">{routine.name}</h1>
                    {routine.description && (
                        <p className="text-muted-foreground mt-2 max-w-2xl">{routine.description}</p>
                    )}
                    <div className="flex gap-4 mt-3 text-xs text-muted-foreground tracking-wide">
                        <span>{routine.exercises?.length || 0} exercises</span>
                        {hasWorkouts && (
                            <span>{workouts.length} session{workouts.length !== 1 ? "s" : ""}</span>
                        )}
                    </div>
                </div>
                <div className="flex gap-2">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setCardBg(URL.createObjectURL(file));
                        }}
                    />
                    {hasWorkouts && (
                        <>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="border border-border px-4 py-3 hover:bg-muted transition-colors text-xs tracking-wider uppercase"
                            >
                                {cardBg ? "Change BG" : "Add BG"}
                            </button>
                            <button
                                onClick={handleDownload}
                                disabled={exporting}
                                className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold tracking-wide px-5 py-3 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                            >
                                <Download className="h-4 w-4" strokeWidth={2} />
                                {exporting ? "Exporting..." : "Download Summary"}
                            </button>
                        </>
                    )}
                    <button
                        onClick={() => navigate(`/routines/active/${routine.id}`)}
                        className="bg-accent text-accent-foreground hover:bg-accent/90 font-bold tracking-wide px-5 py-3 flex items-center justify-center gap-2 transition-colors"
                    >
                        <Play className="h-4 w-4" fill="currentColor" strokeWidth={0} />
                        Start
                    </button>
                </div>
            </div>

            {hasWorkouts && (
                <div className="space-y-8">
                    <div>
                        <div className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-4">Progress</div>
                        {progress.map((ex, ei) => (
                            <div key={ei} className="border border-border mb-6">
                                <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
                                    <div>
                                        <span className="font-semibold text-sm">{ex.name}</span>
                                        {ex.category && (
                                            <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                                                {ex.category}
                                            </span>
                                        )}
                                    </div>
                                    {ex.bestSet.weight > 0 && (
                                        <div className="text-xs text-muted-foreground">
                                            PR: <span className="font-bold tabular-nums text-foreground">{ex.bestSet.weight} kg</span>
                                        </div>
                                    )}
                                </div>
                                {ex.entries.length === 0 ? (
                                    <div className="p-4 text-xs text-muted-foreground">
                                        No logged sessions for this exercise yet.
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                                                    <th className="p-2 sm:p-3 border-r border-border text-left whitespace-nowrap">Date</th>
                                                    {Array.from({ length: ex.maxSets }).map((_, si) => (
                                                        <th key={si} className="p-2 sm:p-3 border-r border-border last:border-r-0 text-center whitespace-nowrap">
                                                            Set {si + 1}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {ex.entries.map((entry, ei) => (
                                                    <tr key={entry.workoutId} className="border-b border-border last:border-b-0">
                                                        <td className="p-2 sm:p-3 border-r border-border font-medium tabular-nums whitespace-nowrap">
                                                            {new Date(entry.date + "T00:00:00").toLocaleDateString("en-US", {
                                                                month: "short",
                                                                day: "numeric",
                                                            })}
                                                        </td>
                                                        {Array.from({ length: ex.maxSets }).map((_, si) => {
                                                            const s = entry.sets[si];
                                                            const isPR = s && ex.bestSet.weight > 0 && s.weight === ex.bestSet.weight;
                                                            return (
                                                                <td
                                                                    key={si}
                                                                    className={`p-2 sm:p-3 border-r border-border last:border-r-0 text-center tabular-nums ${
                                                                        isPR ? "font-bold text-accent" : ""
                                                                    }`}
                                                                >
                                                                    {s ? `${s.weight} × ${s.reps}` : "—"}
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div>
                        <div className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-4">Session History</div>
                        <div className="divide-y divide-border border border-border">
                            {workouts.map((w) => {
                                const isOpen = openWorkout === w.id;
                                return (
                                    <div key={w.id}>
                                        <button
                                            onClick={() => setOpenWorkout(isOpen ? null : w.id)}
                                            className="w-full flex items-center justify-between p-4 hover:bg-muted transition-colors text-left"
                                        >
                                            <div>
                                                <div className="font-semibold text-sm">{w.title}</div>
                                                <div className="text-xs text-muted-foreground mt-0.5">
                                                    {new Date(w.date + "T00:00:00").toLocaleDateString("en-US", {
                                                        weekday: "long",
                                                        month: "long",
                                                        day: "numeric",
                                                        year: "numeric",
                                                    })}
                                                    {w.duration != null && (
                                                        <span className="ml-2 text-muted-foreground/70">
                                                            · {Math.floor(w.duration / 60)}m {w.duration % 60}s
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDownloadWorkout(w); }}
                                                    className="p-2 hover:bg-muted transition-colors rounded"
                                                >
                                                    <Download className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                                                </button>
                                                {isOpen ? (
                                                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                                ) : (
                                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                )}
                                            </div>
                                        </button>
                                        {isOpen && (
                                            <div className="border-t border-border bg-muted/30 p-4 space-y-4">
                                                {w.exercises?.map((ex, i) => (
                                                    <div key={i}>
                                                        <div className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-2">
                                                            {ex.name}
                                                        </div>
                                                        <div className="grid grid-cols-3 border border-border bg-white">
                                                            <div className="p-2 text-xs uppercase tracking-wider text-muted-foreground border-r border-border">
                                                                Set
                                                            </div>
                                                            <div className="p-2 text-xs uppercase tracking-wider text-muted-foreground border-r border-border">
                                                                Reps
                                                            </div>
                                                            <div className="p-2 text-xs uppercase tracking-wider text-muted-foreground">
                                                                Weight (kg)
                                                            </div>
                                                            {ex.sets?.map((s, si) => (
                                                                <div key={si} className="contents">
                                                                    <div className="p-2 border-t border-r border-border text-sm tabular-nums">
                                                                        {si + 1}
                                                                    </div>
                                                                    <div className="p-2 border-t border-r border-border text-sm tabular-nums">
                                                                        {s.reps}
                                                                    </div>
                                                                    <div className="p-2 border-t border-border text-sm tabular-nums">
                                                                        {s.weight}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                                {w.notes && (
                                                    <div className="text-sm text-muted-foreground border-t border-border pt-3">
                                                        <span className="text-xs uppercase tracking-wider">Notes: </span>
                                                        {w.notes}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {!hasWorkouts && (
                <div className="border border-border p-10 text-center">
                    <Dumbbell className="h-8 w-8 mx-auto text-muted-foreground mb-3" strokeWidth={1} />
                    <div className="text-sm text-muted-foreground">
                        No sessions logged for this routine yet.
                    </div>
                    <button
                        onClick={() => navigate(`/routines/active/${routine.id}`)}
                        className="mt-4 text-xs tracking-[0.2em] uppercase text-accent hover:text-accent/80 transition-colors"
                    >
                        Start your first workout
                    </button>
                </div>
            )}

            <div ref={cardRef} className="fixed top-0 left-0 z-[-1] w-[360px] h-[640px] flex flex-col overflow-hidden"
                style={{
                    background: cardBg
                        ? `url(${cardBg}) center/cover no-repeat`
                        : "#000",
                    color: "#fff",
                    fontFamily: "system-ui, -apple-system, sans-serif",
                    padding: cardBg ? "0" : "24px",
                }}
            >
                <div className="flex-1 flex flex-col justify-start min-h-0" style={{ backdropFilter: cardBg ? "brightness(0.6)" : "none", padding: cardBg ? "12px" : "0", borderRadius: cardBg ? "8px" : "0", background: cardBg ? "rgba(0,0,0,0.3)" : "none" }}>
                    <div className="text-[10px] tracking-[0.25em] uppercase mb-2" style={{ opacity: 0.6 }}>Routine Summary</div>
                    <h1 className="text-xl font-black tracking-tighter mb-3" style={{ fontWeight: 900 }}>{routine.name}</h1>

                    <div className="flex gap-4 mb-3">
                        <div>
                            <div className="text-base font-bold">{workouts.length}</div>
                            <div className="text-[10px]" style={{ opacity: 0.6 }}>Sessions</div>
                        </div>
                        <div>
                            <div className="text-base font-bold">{totalSets}</div>
                            <div className="text-[10px]" style={{ opacity: 0.6 }}>Sets</div>
                        </div>
                        <div>
                            <div className="text-base font-bold">{Math.floor(totalDuration / 60)}m {totalDuration % 60}s</div>
                            <div className="text-[10px]" style={{ opacity: 0.6 }}>Duration</div>
                        </div>
                    </div>

                    <div className="mb-3">
                        <div className="text-xs font-bold">Total Volume</div>
                        <div className="text-lg font-black">{totalVolume.toLocaleString()} kg</div>
                    </div>

                    <div className="flex-1 border-t min-h-0" style={{ borderColor: "rgba(255,255,255,0.15)", paddingTop: "6px", overflow: "hidden" }}>
                        <div className="text-[9px] tracking-[0.2em] uppercase mb-1.5" style={{ opacity: 0.6 }}>Exercises</div>
                        <div className="space-y-0.5">
                            {exerciseSummaries.map((ex, i) => (
                                <div key={i} className="flex items-center justify-between text-[10px] leading-tight">
                                    <span className="font-medium mr-2 break-words max-w-[55%]">{ex.name}</span>
                                    <span style={{ opacity: 0.7 }} className="tabular-nums shrink-0 text-right">
                                        {ex.setCount} sets · {ex.volume.toLocaleString()} kg
                                        {ex.bestSet.weight > 0 && (
                                            <span className="ml-1" style={{ opacity: 0.5 }}>PR {ex.bestSet.weight} kg</span>
                                        )}
                                    </span>
                                </div>
                            ))}
                        </div>
                </div>
                    <div className="font-display text-xl font-extrabold tracking-tighter text-center mt-auto pt-2 mb-4">
                        GymTrack
                    </div>
                </div>

            </div>
        </div>
    );
}
