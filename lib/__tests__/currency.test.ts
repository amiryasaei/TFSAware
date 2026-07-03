import { describe, expect, it } from "vitest";
import { formatCAD, parseDollarInput } from "../currency";

describe("formatCAD", () => {
  it("formats whole Canadian dollars", () => {
    expect(formatCAD(109000)).toBe("$109,000");
    expect(formatCAD(0)).toBe("$0");
  });

  it("formats negative amounts", () => {
    expect(formatCAD(-1000)).toBe("-$1,000");
  });
});

describe("parseDollarInput", () => {
  it("strips currency symbols, commas and whitespace", () => {
    expect(parseDollarInput("$12,000")).toBe(12000);
    expect(parseDollarInput(" 7 000 ")).toBe(7000);
  });

  it("treats empty, negative and non-numeric input as 0", () => {
    expect(parseDollarInput("")).toBe(0);
    expect(parseDollarInput("abc")).toBe(0);
    expect(parseDollarInput("-500")).toBe(0);
  });

  it("keeps decimals", () => {
    expect(parseDollarInput("1000.50")).toBe(1000.5);
  });
});
