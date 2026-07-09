const WGER_BASE = "https://wger.de/api/v2";

async function fetchAllExercises() {
    const results = [];
    let url = `${WGER_BASE}/exerciseinfo/?language=2&limit=100`;

    while (url) {
        const res = await fetch(url, {
            headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error(`wger API error: ${res.status}`);
        const data = await res.json();
        for (const item of data.results) {
            const en = item.translations?.find(t => t.language === 2);
            if (!en?.name) continue;
            results.push({
                wger_id: item.id,
                name: en.name,
                category: item.category?.name ?? "",
                equipment: item.equipment?.map(e => e.name) ?? [],
                muscles: [
                    ...(item.muscles?.map(m => m.name_en || m.name) ?? []),
                    ...(item.muscles_secondary?.map(m => m.name_en || m.name) ?? []),
                ],
            });
        }
        url = data.next;
    }
    return results;
}

export { fetchAllExercises };
