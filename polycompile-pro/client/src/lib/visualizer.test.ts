import { describe, it, expect } from "vitest";
import { tokenize, analyze } from "./visualizer.js";
describe("tokenizer", () => {
  it("classifies tokens with positions", () => {
    const t = tokenize("const x = 42;");
    expect(t.map(x => x.kind)).toContain("Keyword"); expect(t.map(x => x.kind)).toContain("Number");
    expect(t[0].line).toBe(1);
  });
});
describe("AST analysis (TypeScript compiler API)", () => {
  it("produces a real AST for JavaScript", () => {
    const a = analyze("function add(a,b){ return a+b; } console.log(add(1,2));", "javascript");
    expect(a.supported).toBe(true);
    expect(a.ast.map(n => n.kind)).toContain("FunctionDeclaration");
    expect(a.ast.map(n => n.kind)).toContain("ReturnStatement");
    expect(a.ir.join("\n")).toContain("func add");
  });
  it("reports parse diagnostics", () => {
    const a = analyze("function {", "javascript");
    expect(a.diagnostics.length).toBeGreaterThan(0);
  });
  it("is honest for unsupported languages", () => {
    const a = analyze("fn main() {}", "rust");
    expect(a.supported).toBe(false); expect(a.reason).toMatch(/not implemented/);
  });
  it("python gives tokens only", () => {
    const a = analyze("print('hi')", "python");
    expect(a.tokens.length).toBeGreaterThan(0); expect(a.ast.length).toBe(0);
  });
});
