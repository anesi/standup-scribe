import { DateTime } from 'luxon';

export type ParsedDate = {
  raw: string;
  iso: string | null;
};

export function parseDate(input: string, timezone: string = 'utc'): ParsedDate {
  const trimmed = input.trim().toLowerCase();

  // Handle "nil" or empty
  if (trimmed === 'nil' || trimmed === 'n/a' || trimmed === '') {
    return { raw: input, iso: null };
  }

  // Handle quick options
  const now = DateTime.now().setZone(timezone);

  if (trimmed === 'today') {
    return { raw: input, iso: now.toISODate() };
  }

  if (trimmed === 'tomorrow') {
    return { raw: input, iso: now.plus({ days: 1 }).toISODate() };
  }

  if (trimmed === 'next week') {
    return { raw: input, iso: now.plus({ weeks: 1 }).toISODate() };
  }

  // Handle relative days: "next tuesday", "this friday"
  const relativeMatch = trimmed.match(/^(next|this)\s+(\w+)$/);
  if (relativeMatch) {
    const targetDay = relativeMatch[2];
    const dayIndex = getDayIndex(targetDay);
    if (dayIndex !== null) {
      const current = now;
      const currentDayIndex = current.weekday;

      let daysUntil: number;
      if (relativeMatch[1] === 'next') {
        daysUntil = ((dayIndex - currentDayIndex + 7) % 7) + 7;
      } else {
        daysUntil = (dayIndex - currentDayIndex + 7) % 7;
        if (daysUntil === 0) daysUntil = 7; // "this X" means future or next week if today
      }

      const targetDate = current.plus({ days: daysUntil });
      return { raw: input, iso: targetDate.toISODate() };
    }
  }

  // Handle ISO format: YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const dt = DateTime.fromObject(
      {
        year: parseInt(isoMatch[1]),
        month: parseInt(isoMatch[2]),
        day: parseInt(isoMatch[3]),
      },
      { zone: timezone },
    );

    if (dt.isValid) {
      return { raw: input, iso: dt.toISODate() };
    }
  }

  // Handle DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (dmyMatch) {
    const dt = DateTime.fromObject(
      {
        year: parseInt(dmyMatch[3]),
        month: parseInt(dmyMatch[2]),
        day: parseInt(dmyMatch[1]),
      },
      { zone: timezone },
    );

    if (dt.isValid) {
      return { raw: input, iso: dt.toISODate() };
    }
  }

  // Handle MM/DD/YYYY (US format)
  const mdyMatch = trimmed.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (mdyMatch && parseInt(mdyMatch[1]) > 12) {
    // If first number > 12, it's likely DD/MM
    const dt = DateTime.fromObject(
      {
        year: parseInt(mdyMatch[3]),
        month: parseInt(mdyMatch[2]),
        day: parseInt(mdyMatch[1]),
      },
      { zone: timezone },
    );

    if (dt.isValid) {
      return { raw: input, iso: dt.toISODate() };
    }
  }

  // If all parsing fails, return raw with null iso
  return { raw: input, iso: null };
}

function getDayIndex(dayName: string): number | null {
  const days: Record<string, number> = {
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sunday: 7,
    mon: 1,
    tue: 2,
    wed: 3,
    thu: 4,
    fri: 5,
    sat: 6,
    sun: 7,
  };

  return days[dayName.toLowerCase()] ?? null;
}

export function formatDateDisplay(parsed: ParsedDate): string {
  if (!parsed.iso) {
    return parsed.raw || 'Nil';
  }

  const dt = DateTime.fromISO(parsed.iso);
  if (!dt.isValid) {
    return parsed.raw;
  }

  return dt.toLocaleString(DateTime.DATE_FULL);
}
