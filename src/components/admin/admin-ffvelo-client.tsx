"use client";

import { Fragment, useMemo, useState } from "react";
import type { FfveloField } from "@/lib/ffvelo";

const PAGE_SIZE = 50;
const DEFAULT_COLUMNS = [
  "Nom",
  "Accueil_DateDbt",
  "Accueil_Commune",
  "Accueil_CP",
  "StructureDep",
  "Type",
  "Pratique_Route",
  "Pratique_VTT",
  "Pratique_Gravel",
  "Pratique_Marche",
];
const DEFAULT_DATE_FIELD = "Accueil_DateDbt";
// Au-delà, un champ n'est plus une « catégorie » filtrable en liste déroulante
// (les ~100 départements doivent rester dedans).
const MAX_SELECT_OPTIONS = 120;

type Row = Record<string, unknown>;

// FFVélo envoie ses dates en texte ("2026-10-30", "2026-01-08 14:24:25"), pas en type Esri.
function isDateField(field: FfveloField) {
  return field.type === "esriFieldTypeDate" || /date/i.test(field.name);
}

function toIsoDay(value: unknown): string | null {
  if (typeof value === "number") return new Date(value).toISOString().slice(0, 10);
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  return null;
}

function formatValue(field: FfveloField, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (isDateField(field) && typeof value === "number") {
    return new Date(value).toLocaleDateString("fr-FR");
  }
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

function compareValues(a: unknown, b: unknown) {
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "fr", { numeric: true });
}

export function AdminFfveloClient({ fields, rows }: { fields: FfveloField[]; rows: Row[] }) {
  const dateFields = fields.filter(isDateField);

  // Champs à faible cardinalité → filtre en liste déroulante.
  const selectOptions = useMemo(() => {
    const options: Record<string, string[]> = {};
    for (const field of fields) {
      if (isDateField(field)) continue;
      const values = new Set<string>();
      for (const row of rows) {
        const value = row[field.name];
        if (value !== null && value !== undefined && value !== "") values.add(String(value));
        if (values.size > MAX_SELECT_OPTIONS) break;
      }
      if (values.size >= 2 && values.size <= MAX_SELECT_OPTIONS) {
        options[field.name] = [...values].sort((a, b) => a.localeCompare(b, "fr", { numeric: true }));
      }
    }
    return options;
  }, [fields, rows]);

  const [query, setQuery] = useState("");
  const [selects, setSelects] = useState<Record<string, string>>({});
  const [dateField, setDateField] = useState(
    (dateFields.find((field) => field.name === DEFAULT_DATE_FIELD) ?? dateFields[0])?.name ?? "",
  );
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [visible, setVisible] = useState(() => {
    const defaults = fields.filter((field) => DEFAULT_COLUMNS.includes(field.name));
    return new Set((defaults.length ? defaults : fields.slice(0, 8)).map((field) => field.name));
  });
  const [sort, setSort] = useState<{ name: string; desc: boolean } | null>(
    dateField ? { name: dateField, desc: false } : null,
  );
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const result = rows.filter((row) => {
      for (const [name, value] of Object.entries(selects)) {
        if (value && String(row[name] ?? "") !== value) return false;
      }
      if (dateField && (dateFrom || dateTo)) {
        const day = toIsoDay(row[dateField]);
        if (!day) return false;
        if (dateFrom && day < dateFrom) return false;
        if (dateTo && day > dateTo) return false;
      }
      if (needle) {
        return Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(needle));
      }
      return true;
    });

    if (sort) {
      result.sort((a, b) => compareValues(a[sort.name], b[sort.name]) * (sort.desc ? -1 : 1));
    }
    return result;
  }, [rows, query, selects, dateField, dateFrom, dateTo, sort]);

  const visibleFields = fields.filter((field) => visible.has(field.name));
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const label = (field: FfveloField) => field.alias || field.name;

  const resetPage = () => {
    setPage(0);
    setExpanded(null);
  };

  const inputClass =
    "rounded-[14px] border border-foreground/10 bg-white px-3 py-2 text-[13px] text-foreground";

  return (
    <div className="space-y-4">
      <section className="space-y-4 rounded-[28px] border border-white/60 bg-white/72 p-5 shadow-[var(--shadow-sm)]">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-[240px] flex-1 flex-col gap-1 text-[12px] text-foreground/55">
            Recherche (tous champs)
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                resetPage();
              }}
              className={inputClass}
            />
          </label>
          {dateFields.length > 0 && (
            <>
              <label className="flex flex-col gap-1 text-[12px] text-foreground/55">
                Champ date
                <select value={dateField} onChange={(e) => setDateField(e.target.value)} className={inputClass}>
                  {dateFields.map((field) => (
                    <option key={field.name} value={field.name}>
                      {label(field)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-[12px] text-foreground/55">
                Du
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    resetPage();
                  }}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1 text-[12px] text-foreground/55">
                Au
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    resetPage();
                  }}
                  className={inputClass}
                />
              </label>
            </>
          )}
        </div>

        {Object.keys(selectOptions).length > 0 && (
          <div className="flex flex-wrap gap-3">
            {fields
              .filter((field) => selectOptions[field.name])
              .map((field) => (
                <label key={field.name} className="flex flex-col gap-1 text-[12px] text-foreground/55">
                  {label(field)}
                  <select
                    value={selects[field.name] ?? ""}
                    onChange={(e) => {
                      setSelects((prev) => ({ ...prev, [field.name]: e.target.value }));
                      resetPage();
                    }}
                    className={`${inputClass} max-w-[220px]`}
                  >
                    <option value="">Tous</option>
                    {selectOptions[field.name].map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
          </div>
        )}

        <details>
          <summary className="cursor-pointer text-[13px] font-semibold text-foreground/70">
            Colonnes affichées ({visible.size}/{fields.length})
          </summary>
          <div className="mt-3 grid gap-1 sm:grid-cols-2 lg:grid-cols-4">
            {fields.map((field) => (
              <label key={field.name} className="flex items-center gap-2 text-[13px] text-foreground/70">
                <input
                  type="checkbox"
                  checked={visible.has(field.name)}
                  onChange={() =>
                    setVisible((prev) => {
                      const next = new Set(prev);
                      if (next.has(field.name)) next.delete(field.name);
                      else next.add(field.name);
                      return next;
                    })
                  }
                />
                {label(field)}
                {field.alias && field.alias !== field.name && (
                  <span className="text-foreground/35">({field.name})</span>
                )}
              </label>
            ))}
          </div>
        </details>
      </section>

      <div className="flex items-center justify-between text-[13px] text-foreground/60">
        <span>
          {filtered.length} / {rows.length} manifestations
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={currentPage === 0}
            onClick={() => {
              setPage(currentPage - 1);
              setExpanded(null);
            }}
            className="rounded-full px-3 py-1 hover:bg-white/80 disabled:opacity-30"
          >
            ←
          </button>
          <span>
            Page {currentPage + 1} / {pageCount}
          </span>
          <button
            type="button"
            disabled={currentPage >= pageCount - 1}
            onClick={() => {
              setPage(currentPage + 1);
              setExpanded(null);
            }}
            className="rounded-full px-3 py-1 hover:bg-white/80 disabled:opacity-30"
          >
            →
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-[28px] border border-white/60 bg-white/72 shadow-[var(--shadow-sm)]">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-foreground/8">
              {visibleFields.map((field) => (
                <th key={field.name} className="whitespace-nowrap px-3 py-3 font-semibold text-foreground/70">
                  <button
                    type="button"
                    onClick={() =>
                      setSort((prev) =>
                        prev?.name === field.name ? { name: field.name, desc: !prev.desc } : { name: field.name, desc: false },
                      )
                    }
                    className="hover:text-foreground"
                  >
                    {label(field)}
                    {sort?.name === field.name && (sort.desc ? " ↓" : " ↑")}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, index) => (
              <Fragment key={index}>
                <tr
                  onClick={() => setExpanded(expanded === index ? null : index)}
                  className="cursor-pointer border-b border-foreground/5 hover:bg-coral/5"
                >
                  {visibleFields.map((field) => (
                    <td key={field.name} className="max-w-[280px] truncate px-3 py-2 text-foreground/80">
                      {formatValue(field, row[field.name])}
                    </td>
                  ))}
                </tr>
                {expanded === index && (
                  <tr className="border-b border-foreground/5 bg-coral/5">
                    <td colSpan={visibleFields.length} className="px-4 py-4">
                      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                        {fields.map((field) => (
                          <div key={field.name} className="min-w-0">
                            <dt className="text-[11px] uppercase tracking-[0.12em] text-foreground/40">
                              {label(field)}
                            </dt>
                            <dd className="break-words text-foreground/85">{formatValue(field, row[field.name])}</dd>
                          </div>
                        ))}
                      </dl>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        {pageRows.length === 0 && (
          <p className="px-4 py-8 text-center text-[14px] text-foreground/50">Aucune manifestation.</p>
        )}
      </div>
    </div>
  );
}
