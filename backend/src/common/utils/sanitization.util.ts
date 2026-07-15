const TAG_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const CONTROL_CHARS_REGEX = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function sanitizeString(value: string): string {
  return value.replace(TAG_REGEX, "").replace(CONTROL_CHARS_REGEX, "").trim();
}

export function sanitizeValue<T = unknown>(value: T): T {
  if (value === null || value === undefined) return value;

  if (Buffer.isBuffer(value)) {
    return value;
  }

  if (value instanceof Date) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item)) as T;
  }

  if (typeof value === "string") {
    return sanitizeString(value) as T;
  }

  if (typeof value === "object") {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      return value;
    }

    const next: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      next[key] = sanitizeValue(val);
    }
    return next as T;
  }

  return value;
}
