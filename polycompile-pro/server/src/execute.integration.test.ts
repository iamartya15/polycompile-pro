import { describe, it, expect } from "vitest";
import { executeCode } from "./services/execution/provider.js";
// Real-provider integration tests (network required; uses the configured provider - Judge0 CE by default).
// Run: npm run test:integration -w @polycompile/server
const cases: Array<[string, string, string]> = [
  ["python", "print('Hello, PolyCompile!')", "Hello, PolyCompile!"],
  ["c", "#include <stdio.h>\nint main(void){printf(\"Hello, PolyCompile!\\n\");return 0;}", "Hello, PolyCompile!"],
  ["cpp", "#include <iostream>\nint main(){std::cout<<\"Hello, PolyCompile!\"<<std::endl;}", "Hello, PolyCompile!"],
  ["java", "public class Main{public static void main(String[] a){System.out.println(\"Hello, PolyCompile!\");}}", "Hello, PolyCompile!"],
];
describe("real provider execution", () => {
  for (const [lang, code, expected] of cases) {
    it(`runs ${lang}`, async () => {
      const r = await executeCode({ language: lang, code, stdin: "", files: [] });
      expect(r.stdout).toContain(expected);
    }, 60_000);
  }
  it("forwards stdin (python)", async () => {
    const r = await executeCode({ language: "python", code: "print('got:' + input())", stdin: "poly\n", files: [] });
    expect(r.stdout).toContain("got:poly");
  }, 60_000);
});
