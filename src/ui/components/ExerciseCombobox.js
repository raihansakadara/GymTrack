import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search, Loader2 } from "lucide-react";
import useWgerExercises from "../../hooks/useWgerExercises";

export default function ExerciseCombobox({ value, onChange, "data-testid": testId }) {
    const { exercises, loading, error } = useWgerExercises();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState(value || "");
    const [highlighted, setHighlighted] = useState(-1);
    const ref = useRef(null);
    const inputRef = useRef(null);

    const filtered = query
        ? exercises.filter(e => e.name.toLowerCase().includes(query.toLowerCase()))
        : exercises;

    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    useEffect(() => {
        setHighlighted(-1);
    }, [query]);

    useEffect(() => {
        setQuery(value || "");
    }, [value]);

    const handleSelect = (exercise) => {
        setQuery(exercise.name);
        onChange({
            name: exercise.name,
            wger_id: exercise.wger_id,
            category: exercise.category,
            muscles: exercise.muscles,
        });
        setOpen(false);
    };

    const handleKeyDown = (e) => {
        if (!open) {
            if (e.key === "ArrowDown" || e.key === "Enter") {
                setOpen(true);
                e.preventDefault();
            }
            return;
        }
        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                setHighlighted(i => Math.min(i + 1, filtered.length - 1));
                break;
            case "ArrowUp":
                e.preventDefault();
                setHighlighted(i => Math.max(i - 1, 0));
                break;
            case "Enter":
                e.preventDefault();
                if (highlighted >= 0 && filtered[highlighted]) {
                    handleSelect(filtered[highlighted]);
                }
                break;
            case "Escape":
                setOpen(false);
                break;
            default:
                break;
        }
    };

    const displayValue = open ? query : (value || "");

    return (
        <div ref={ref} className="relative flex-1">
            {loading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading exercises…
                </div>
            ) : error ? (
                <input
                    placeholder="Exercise name"
                    value={value || ""}
                    onChange={e => onChange({ name: e.target.value, wger_id: null, category: "", muscles: [] })}
                    data-testid={testId}
                    className="w-full bg-transparent border-0 focus:outline-none text-base font-semibold placeholder:font-normal placeholder:text-muted-foreground"
                />
            ) : (
                <>
                    <div className="flex items-center gap-1">
                        <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <input
                            ref={inputRef}
                            placeholder="Search exercise…"
                            value={displayValue}
                            onChange={e => { setQuery(e.target.value); setOpen(true); }}
                            onFocus={() => {
                                setOpen(true);
                                setQuery("");
                            }}
                            onBlur={() => {
                                setTimeout(() => setOpen(false), 150);
                            }}
                            onKeyDown={handleKeyDown}
                            data-testid={testId}
                            className="flex-1 bg-transparent border-0 focus:outline-none text-base font-semibold placeholder:font-normal placeholder:text-muted-foreground"
                        />
                        <ChevronDown
                            className={`h-3.5 w-3.5 text-muted-foreground transition-transform shrink-0 ${open ? "rotate-180" : ""}`}
                        />
                    </div>
                    {open && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-border shadow-lg z-50 max-h-60 overflow-y-auto w-full">
                            {filtered.length === 0 ? (
                                <div className="px-3 py-4 text-xs text-muted-foreground text-center">
                                    No exercises found
                                </div>
                            ) : (
                                filtered.map((ex, i) => (
                                    <button
                                        key={ex.wger_id}
                                        type="button"
                                        onMouseDown={() => handleSelect(ex)}
                                        onMouseEnter={() => setHighlighted(i)}
                                        className={`block w-full text-left px-3 py-2 text-sm hover:bg-muted cursor-pointer ${
                                            i === highlighted ? "bg-muted" : ""
                                        }`}
                                    >
                                        <span className="font-medium">{ex.name}</span>
                                        {ex.category && (
                                            <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                                                {ex.category}
                                            </span>
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
