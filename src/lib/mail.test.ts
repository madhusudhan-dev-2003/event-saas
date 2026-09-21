import { describe, expect, it } from "vitest";
import { envValue } from "./mail";

describe("mail env", () => {
  it("strips wrapping quotes from env values", () => {
    const key = "UTSVA_MAIL_TEST";
    process.env[key] = '"smtp.gmail.com"';
    expect(envValue(key)).toBe("smtp.gmail.com");
    process.env[key] = "'587'";
    expect(envValue(key)).toBe("587");
    delete process.env[key];
  });
});
