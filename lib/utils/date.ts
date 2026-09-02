import { LOCALE } from "@/lib/constants";

type DateStyle = "short" | "long" | "datetime";

/** Built once each. See the note in `format.ts`. */
const formatters: Record<DateStyle, Intl.DateTimeFormat> = {
  /** `02/09/2026` */
  short: new Intl.DateTimeFormat(LOCALE, { dateStyle: "short" }),
  /** `2 de setembro de 2026` */
  long: new Intl.DateTimeFormat(LOCALE, { dateStyle: "long" }),
  /** `02/09/2026 14:30` */
  datetime: new Intl.DateTimeFormat(LOCALE, {
    dateStyle: "short",
    timeStyle: "short",
  }),
};

export function formatDate(date: Date, style: DateStyle = "short"): string {
  return formatters[style].format(date);
}
