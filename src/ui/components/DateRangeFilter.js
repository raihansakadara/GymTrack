import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import { DateRange } from "react-date-range";

export default function DateRangeFilter({ appliedRange, onConfirm }) {
    const [range, setRange] = useState(appliedRange);
    const [calendarOpen, setCalendarOpen] = useState(false);
    const calendarRef = useRef(null);

    const handleConfirm = useCallback(() => {
        onConfirm(range);
        setCalendarOpen(false);
    }, [range, onConfirm]);

    const handleCancel = useCallback(() => {
        setRange(appliedRange);
        setCalendarOpen(false);
    }, [appliedRange]);

    const handleClickOutside = useCallback(e => {
        if (calendarRef.current && !calendarRef.current.contains(e.target)) setCalendarOpen(false);
    }, []);

    useEffect(() => {
        if (calendarOpen) document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [calendarOpen, handleClickOutside]);

    return (
        <div className="flex justify-end relative" ref={calendarRef}>
            <button
                onClick={() => {
                    setRange(appliedRange);
                    setCalendarOpen(prev => !prev);
                }}
                className="border border-border bg-transparent px-3 py-2 text-sm tracking-wide uppercase font-semibold flex items-center gap-2 hover:bg-muted transition-colors"
            >
                <CalendarDays className="h-4 w-4" />
                {appliedRange.startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                {" — "}
                {appliedRange.endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </button>
            {calendarOpen && (
                <div className="absolute top-full right-0 mt-1 z-50 shadow-lg">
                    <DateRange
                        ranges={[range]}
                        onChange={item => setRange(item.selection)}
                        color="hsl(12, 76%, 61%)"
                    />
                    <div className="flex justify-end gap-2 p-3 border-t border-border bg-white">
                        <button onClick={handleCancel}
                                className="border border-border bg-transparent text-foreground hover:bg-muted px-4 py-2 text-sm font-semibold tracking-wide uppercase transition-colors">Cancel</button>
                        <button onClick={handleConfirm}
                                className="bg-accent text-accent-foreground hover:bg-accent/90 px-4 py-2 text-sm font-bold tracking-wide uppercase transition-colors">Confirm</button>
                    </div>
                </div>
            )}
        </div>
    );
}
