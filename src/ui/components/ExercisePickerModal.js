import { useEffect, useRef, useState } from "react";
import { Search, ChevronLeft, X, Dumbbell, Loader2 } from "lucide-react";
import useWgerExercises from "../../hooks/useWgerExercises";

export default function ExercisePickerModal({ onSelect, onClose }) {
    const { exercises, loading } = useWgerExercises();
    const [step, setStep] = useState("category");
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedEquipment, setSelectedEquipment] = useState(null);
    const [query, setQuery] = useState("");
    const [comboboxValue, setComboboxValue] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);
    const comboboxRef = useRef(null);

    const categories = [...new Set(exercises.map((e) => e.category))]
        .filter(Boolean)
        .sort();

    const equipmentOptions = selectedCategory
        ? [
              ...new Set(
                  exercises
                      .filter((e) => e.category === selectedCategory)
                      .flatMap((e) => e.equipment)
              ),
          ]
              .filter(Boolean)
              .sort()
        : [];

    const filteredExercises = exercises.filter((e) => {
        if (selectedCategory && e.category !== selectedCategory) return false;
        if (selectedEquipment && (!e.equipment || !e.equipment.includes(selectedEquipment)))
            return false;
        if (query && !e.name.toLowerCase().includes(query.toLowerCase())) return false;
        return true;
    });

    const comboboxFiltered = exercises
        .filter((e) =>
            comboboxValue
                ? e.name.toLowerCase().includes(comboboxValue.toLowerCase())
                : false
        )
        .slice(0, 50);

    useEffect(() => {
        function handleClick(e) {
            if (comboboxRef.current && !comboboxRef.current.contains(e.target)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const pickCategory = (cat) => {
        setSelectedCategory(cat);
        setSelectedEquipment(null);
        setQuery("");
        setStep("equipment");
    };

    const pickEquipment = (eq) => {
        setSelectedEquipment(eq);
        setQuery("");
        setStep("exercise");
    };

    const goBack = () => {
        if (step === "equipment") {
            setSelectedCategory(null);
            setStep("category");
        } else if (step === "exercise") {
            if (selectedEquipment) {
                setSelectedEquipment(null);
                setQuery("");
                setStep("equipment");
            } else {
                setSelectedCategory(null);
                setStep("category");
            }
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <div className="bg-white w-full max-w-lg mx-4 max-h-[80vh] flex flex-col p-6 items-center justify-center gap-3">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Loading exercises...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
                <div className="flex items-center justify-between border-b border-border px-5 py-4 shrink-0">
                    <div className="flex items-center gap-3">
                        {step !== "category" && (
                            <button onClick={goBack} className="p-1 hover:bg-muted transition-colors">
                                <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
                            </button>
                        )}
                        <span className="font-semibold text-sm">
                            {step === "category" && "Choose Category"}
                            {step === "equipment" && "Choose Equipment"}
                            {step === "exercise" && "Choose Exercise"}
                        </span>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-muted transition-colors">
                        <X className="h-5 w-5" strokeWidth={1.5} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {step === "category" && (
                        <div className="p-5">
                            <div className="relative mb-6" ref={comboboxRef}>
                                <div className="flex items-center gap-2 border border-border px-3 py-2">
                                    <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <input
                                        autoFocus
                                        placeholder="Search exercises directly..."
                                        value={comboboxValue}
                                        onChange={(e) => {
                                            setComboboxValue(e.target.value);
                                            setShowDropdown(true);
                                        }}
                                        onFocus={() => setShowDropdown(true)}
                                        className="flex-1 bg-transparent border-0 focus:outline-none text-sm"
                                    />
                                    {comboboxValue && (
                                        <button
                                            onClick={() => {
                                                setComboboxValue("");
                                                setShowDropdown(false);
                                            }}
                                            className="p-0.5 hover:bg-muted rounded transition-colors"
                                        >
                                            <X className="h-3 w-3" strokeWidth={2} />
                                        </button>
                                    )}
                                </div>
                                {showDropdown && comboboxValue && (
                                    <div className="absolute z-10 top-full left-0 right-0 border border-border border-t-0 bg-white max-h-60 overflow-y-auto shadow-lg">
                                        {comboboxFiltered.length === 0 ? (
                                            <div className="p-4 text-sm text-muted-foreground text-center">
                                                No exercises found
                                            </div>
                                        ) : (
                                            comboboxFiltered.map((ex) => (
                                                <button
                                                    key={ex.wger_id}
                                                    onClick={() => onSelect(ex)}
                                                    className="w-full flex items-center justify-between p-3 hover:bg-muted transition-colors text-left border-b border-border last:border-b-0"
                                                >
                                                    <div>
                                                        <div className="text-sm font-medium">{ex.name}</div>
                                                        <div className="text-[11px] text-muted-foreground">
                                                            {ex.category}
                                                            {ex.equipment?.length > 0
                                                                ? ` · ${ex.equipment.slice(0, 2).join(", ")}`
                                                                : ""}
                                                        </div>
                                                    </div>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-3 mb-4">
                                <div className="flex-1 h-px bg-border"></div>
                                <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">or browse by category</span>
                                <div className="flex-1 h-px bg-border"></div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {categories.map((cat) => {
                                    const count = exercises.filter((e) => e.category === cat).length;
                                    return (
                                        <button
                                            key={cat}
                                            onClick={() => pickCategory(cat)}
                                            className="flex items-center gap-3 p-4 border border-border hover:bg-muted transition-colors text-left"
                                        >
                                            <div className="w-9 h-9 border border-border flex items-center justify-center shrink-0">
                                                <Dumbbell className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium">{cat}</div>
                                                <div className="text-[11px] text-muted-foreground">{count} exercises</div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {step === "equipment" && (
                        <div className="p-5">
                            <div className="text-xs text-muted-foreground mb-3 px-1">
                                Category: <span className="font-semibold text-foreground">{selectedCategory}</span>
                            </div>
                            <div className="space-y-1">
                                {equipmentOptions.map((eq) => {
                                    const count = exercises.filter(
                                        (e) => e.category === selectedCategory && e.equipment?.includes(eq)
                                    ).length;
                                    return (
                                        <button
                                            key={eq}
                                            onClick={() => pickEquipment(eq)}
                                            className="w-full flex items-center justify-between p-4 border border-border hover:bg-muted transition-colors text-left"
                                        >
                                            <span className="text-sm font-medium">{eq}</span>
                                            <span className="text-xs text-muted-foreground">{count} exercises</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {step === "exercise" && (
                        <div className="p-5">
                            <div className="flex items-center gap-2 border border-border px-3 py-2 mb-4">
                                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                                <input
                                    autoFocus
                                    placeholder="Search exercises..."
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    className="flex-1 bg-transparent border-0 focus:outline-none text-sm"
                                />
                            </div>
                            {selectedCategory && (
                                <div className="text-xs text-muted-foreground mb-3 px-1">
                                    {selectedCategory}
                                    {selectedEquipment && (
                                        <span> · {selectedEquipment}</span>
                                    )}
                                </div>
                            )}
                            <div className="space-y-1">
                                {filteredExercises.length === 0 ? (
                                    <div className="text-center text-sm text-muted-foreground py-8">
                                        No exercises found
                                    </div>
                                ) : (
                                    filteredExercises.map((ex) => (
                                        <button
                                            key={ex.wger_id}
                                            onClick={() => onSelect(ex)}
                                            className="w-full flex items-center justify-between p-4 border border-border hover:bg-muted transition-colors text-left"
                                        >
                                            <div>
                                                <div className="text-sm font-medium">{ex.name}</div>
                                                <div className="text-[11px] text-muted-foreground">
                                                    {ex.equipment?.slice(0, 2).join(", ") || "No equipment"}
                                                </div>
                                            </div>
                                            <ChevronLeft className="h-4 w-4 text-muted-foreground rotate-180 shrink-0" strokeWidth={1.5} />
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
