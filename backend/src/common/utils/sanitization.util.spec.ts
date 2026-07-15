import { sanitizeString, sanitizeValue } from "./sanitization.util";

describe("sanitization util", () => {
  it("removes script tags and control chars", () => {
    expect(sanitizeString("abc<script>alert(1)</script>\u0001xyz")).toBe("abcxyz");
  });

  it("sanitizes nested payloads", () => {
    const payload = {
      name: "<script>x</script>John",
      tags: ["ok", "<script>bad</script>"],
      nested: { note: "A\u0007B" },
    };

    expect(sanitizeValue(payload)).toEqual({
      name: "John",
      tags: ["ok", ""],
      nested: { note: "AB" },
    });
  });

  it("performance smoke", () => {
    const input = Array.from({ length: 3000 }, (_, i) => ({ value: `<script>${i}</script>safe` }));
    const started = Date.now();
    const out = sanitizeValue(input);
    const elapsed = Date.now() - started;

    expect(Array.isArray(out)).toBe(true);
    expect(elapsed).toBeLessThan(3000);
  });
});
