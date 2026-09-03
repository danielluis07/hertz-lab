"use client";

/**
 * PROTOTYPE — shape (b): the filter controls.
 *
 * Dumb on purpose. Neither one calls `useQueryParam` or `router.replace`: the
 * surface's own hook owns every write, which is where "a filter change drops
 * the page" lives. These render.
 */

import { Input } from "@/components/ui/input";

export function SearchFilter({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <Input
      className="w-64"
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export function SelectFilter({
  value,
  onChange,
  label,
  options,
}: {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  label: string;
  options: readonly { value: string; label: string }[];
}) {
  return (
    // Native on purpose — see the note in the kit's engine.
    <select
      className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value || undefined)}>
      <option value="">{label}: todos</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
