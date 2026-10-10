"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type GenreOption = { id: string; name: string; slug: string; count: number };
export type CategoryOption = { name: string; count: number };

/**
 * All filters write straight to the URL query string. That keeps results
 * shareable, bookmarkable and back-button friendly, and lets the Server
 * Component own the data fetching - no client state library required.
 */
export function CatalogControls({
  genres,
  categories,
  years,
  resultCount,
}: {
  genres: GenreOption[];
  categories: CategoryOption[];
  years: number[];
  resultCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const first = useRef(true);

  const setParams = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === "" || value === "all") next.delete(key);
        else next.set(key, value);
      }
      next.delete("page"); // any filter change returns to page 1
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  // Debounced live search as the user types.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => setParams({ q: query.trim() || null }), 350);
    return () => clearTimeout(t);
  }, [query, setParams]);

  const currentGenre = searchParams.get("genre") ?? "all";
  const currentCategory = searchParams.get("category") ?? "all";
  const currentYear = searchParams.get("year") ?? "all";
  const currentAvail = searchParams.get("avail") ?? "";
  const currentSort = searchParams.get("sort") ?? "title_asc";

  // "all" and "" are the no-filter defaults - comparing truthiness would make
  // this permanently true, since the defaults are the strings "all".
  const hasFilters =
    currentGenre !== "all" ||
    currentCategory !== "all" ||
    currentYear !== "all" ||
    currentAvail !== "" ||
    !!searchParams.get("q");

  return (
    <div className="card p-4 sm:p-5">
      {/* Search field */}
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          setParams({ q: query.trim() || null });
        }}
      >
        <label htmlFor="catalog-search" className="sr-only">
          Search by title, author, ISBN or keyword
        </label>
        <div className="relative">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-ink-3"
            stroke="currentColor"
            strokeWidth="1.75"
            aria-hidden
          >
            <path d="m21 21-4.35-4.35M17 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z" />
          </svg>
          <input
            id="catalog-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, author, ISBN or keyword…"
            className="field py-3 pl-11 pr-4 text-base"
            autoComplete="off"
          />
        </div>
      </form>

      {/* Filter row */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Select
          label="Genre"
          value={currentGenre}
          onChange={(v) => setParams({ genre: v })}
          options={[
            { value: "all", label: `All genres (${genres.length})` },
            ...genres.map((g) => ({ value: g.slug, label: `${g.name} (${g.count})` })),
          ]}
        />

        <Select
          label="Category"
          value={currentCategory}
          onChange={(v) => setParams({ category: v })}
          options={[
            { value: "all", label: `All categories (${categories.length})` },
            ...categories.map((c) => ({ value: c.name, label: `${c.name} (${c.count})` })),
          ]}
        />

        <Select
          label="Publication year"
          value={currentYear}
          onChange={(v) => setParams({ year: v })}
          options={[
            { value: "all", label: "Any year" },
            { value: "recent", label: "Last 5 years" },
            ...years.map((y) => ({ value: String(y), label: String(y) })),
            { value: "pre2000", label: "Before 2000" },
          ]}
        />

        <Select
          label="Availability"
          value={currentAvail ? "1" : "all"}
          onChange={(v) => setParams({ avail: v })}
          options={[
            { value: "all", label: "Show everything" },
            { value: "1", label: "Available now" },
          ]}
        />

        <Select
          label="Sort by"
          value={currentSort}
          onChange={(v) => setParams({ sort: v })}
          options={[
            { value: "title_asc", label: "Title A – Z" },
            { value: "title_desc", label: "Title Z – A" },
            { value: "year_desc", label: "Newest first" },
            { value: "year_asc", label: "Oldest first" },
            { value: "newest", label: "Recently added" },
          ]}
        />
      </div>

      {/* Active filter chips + result count */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <p className="text-sm text-ink-3" aria-live="polite">
          <span className="font-semibold text-ink">{resultCount}</span>{" "}
          {resultCount === 1 ? "title" : "titles"} found
        </p>

        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              router.replace(pathname, { scroll: false });
            }}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-3 transition hover:text-ink"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.75">
              <path d="M6 18 18 6M6 6l12 12" />
            </svg>
            Clear all filters
          </button>
        )}
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn("field appearance-none pr-9", value !== "all" && "border-forest/40 bg-forest-soft/40")}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-ink-3"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="m19 9-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}
