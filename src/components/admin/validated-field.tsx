"use client";

import { isValidGhPhone, isValidGhanaCard, isValidNhis, normalizeGhanaCard, normalizeNhis, normalizePhone } from "@/lib/client-validation";
import { Field, Input } from "@/components/ui/input";

/**
 * Inline-validated phone input — shows the exact server error while the user
 * types, mirroring src/lib/validators.ts (10-digit Ghana number). Pass the
 * value/onChange straight through; set `required` to block empty submits.
 */
export function PhoneField({
  label,
  value,
  onChange,
  required,
  placeholder,
  className,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const error = value.trim() && !isValidGhPhone(value) ? "Enter a valid 10-digit Ghana phone number (e.g. 0241234567)" : undefined;
  return (
    <Field label={label ?? "Phone"} error={error} hint={!error && !required ? "10-digit Ghana number (e.g. 0241234567)" : undefined} className={className}>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "0244 000 000"}
        inputMode="tel"
        autoComplete="tel"
        aria-invalid={!!error}
      />
    </Field>
  );
}

/**
 * Inline-validated Ghana Card input — GHA- followed by digits. Normalizes
 * casing and the missing dash as the user types.
 */
export function GhanaCardField({
  label,
  value,
  onChange,
  required,
  className,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  className?: string;
}) {
  const normalized = value.trim() ? normalizeGhanaCard(value) : value;
  const error = value.trim() && !isValidGhanaCard(value) ? "Ghana Card must be GHA- followed by 9 digits and a check digit (e.g. GHA-123456789-0)" : undefined;
  return (
    <Field label={label ?? "Ghana Card No."} error={error} hint={!error && !required ? "GHA- + 9 digits + check digit (e.g. GHA-123456789-0)" : undefined} className={className}>
      <Input
        value={normalized !== value ? normalized : value}
        onChange={(e) => onChange(normalizeGhanaCard(e.target.value))}
        placeholder="e.g. GHA-123456789-0"
        autoComplete="off"
        aria-invalid={!!error}
      />
    </Field>
  );
}

/**
 * Inline-validated NHIS number input — exactly 9 digits (e.g. 123456789).
 * Spaces/dashes are stripped as the user types; the server enforces the same.
 */
export function NhisField({
  label,
  value,
  onChange,
  required,
  hint,
  className,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  hint?: string;
  className?: string;
}) {
  const normalized = value.trim() ? normalizeNhis(value) : value;
  const error = value.trim() && !isValidNhis(value) ? "NHIS number must be exactly 9 digits (e.g. 123456789)" : undefined;
  return (
    <Field label={label ?? "NHIS Number"} error={error} hint={!error ? (hint ?? "Exactly 9 digits (e.g. 123456789)") : undefined} className={className}>
      <Input
        value={normalized !== value ? normalized : value}
        onChange={(e) => onChange(normalizeNhis(e.target.value))}
        placeholder="e.g. 123456789"
        inputMode="numeric"
        autoComplete="off"
        aria-invalid={!!error}
      />
    </Field>
  );
}

/** Re-exported for forms that just need the pure checks. */
export { isValidGhPhone, isValidGhanaCard, isValidNhis, normalizeGhanaCard, normalizeNhis, normalizePhone } from "@/lib/client-validation";
