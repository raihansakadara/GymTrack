import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export default function ComboBox({ value, onChange, options, className = "" }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    const selected = options.find(o => o.value === value);

    useEffect(() => {
        if (!open) return;
        const handleClick = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [open]);

    return (
        <div ref={ref} className={`relative ${className}`}>
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="border border-border bg-white text-xs tracking-[0.2em] uppercase px-3 py-2 outline-none flex items-center gap-2 min-w-[120px]"
            >
                <span className="flex-1 text-left">{selected?.label}</span>
                <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={2} />
            </button>
            {open && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-border shadow-lg z-50 w-full">
                    {options.map(opt => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => { onChange(opt.value); setOpen(false); }}
                            className={`block w-full text-left px-3 py-2 text-xs tracking-[0.2em] uppercase hover:bg-muted cursor-pointer whitespace-nowrap ${
                                opt.value === value ? "bg-muted font-semibold" : "bg-white"
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
