import * as ts from "typescript";
// ---- Lexical analysis: a real scanner producing tokens with source positions. ----
export interface Token { kind: string; text: string; line: number; column: number; }
const KEYWORDS = new Set("break case catch class const continue debugger default delete do else enum export extends false finally for function if import in instanceof new return super switch this throw true try typeof var void while with yield let static async await get set of".split(" "));
export function tokenize(code: string): Token[] {
  const tokens: Token[] = []; const re = /(\/\/[^\n]*|#.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b(\d+(?:\.\d+)?)\b|([A-Za-z_$][A-Za-z0-9_$]*)|(=>|===|!==|==|!=|<=|>=|&&|\|\||\+\+|--|[+\-*/%=<>(){}\[\]:;,.!?&|^~])/gm;
  let m: RegExpExecArray | null; let line = 1; let lastIdx = 0; let lineStart = 0;
  const advance = (to: number) => { for (let i = lastIdx; i < to; i++) { if (code[i] === "\n") { line++; lineStart = i + 1; } } lastIdx = to; };
  while ((m = re.exec(code)) !== null) {
    advance(m.index); const column = m.index - lineStart + 1; const text = m[0];
    const kind = m[1] ? "Comment" : m[2] ? "String" : m[3] ? "Number" : m[4] ? (KEYWORDS.has(text) ? "Keyword" : "Identifier") : "Operator/Punctuation";
    tokens.push({ kind, text: text.length > 40 ? text.slice(0, 40) + "…" : text, line, column });
    advance(m.index + text.length);
    if (tokens.length >= 500) break;
  }
  return tokens;
}
// ---- Parsing: genuine AST via the TypeScript compiler API (JS + TS). ----
export interface AstNode { kind: string; text: string; line: number; column: number; depth: number; }
export interface Analysis { supported: boolean; reason?: string; tokens: Token[]; ast: AstNode[]; ir: string[]; diagnostics: string[]; }
export function analyzeJsTs(code: string, isTs: boolean): Analysis {
  const sf = ts.createSourceFile(isTs ? "main.ts" : "main.js", code, ts.ScriptTarget.Latest, true);
  const ast: AstNode[] = []; const diagnostics: string[] = [];
  const parseDiags = (sf as unknown as { parseDiagnostics?: Array<{ messageText: { messageText: string }; start?: number }> }).parseDiagnostics ?? [];
  for (const d of parseDiags) { const pos = d.start !== undefined ? sf.getLineAndCharacterOfPosition(d.start) : { line: 0, character: 0 }; diagnostics.push(`Parse error at ${pos.line + 1}:${pos.character + 1} - ${d.messageText.messageText}`); }
  const walk = (node: ts.Node, depth: number) => {
    if (ast.length >= 300) return;
    const pos = sf.getLineAndCharacterOfPosition(node.getStart(sf));
    const text = node.getText(sf).replace(/\s+/g, " ").slice(0, 60);
    ast.push({ kind: ts.SyntaxKind[node.kind], text, line: pos.line + 1, column: pos.character + 1, depth });
    node.forEachChild((c) => walk(c, depth + 1));
  };
  walk(sf, 0);
  return { supported: true, tokens: tokenize(code), ast, ir: generateIr(sf), diagnostics };
}
// ---- IR: a documented, deliberately small three-address-style transformation
// for a subset of top-level JS/TS statements. Labeled "conceptual" in the UI. ----
function generateIr(sf: ts.SourceFile): string[] {
  const out: string[] = []; let t = 0; const tmp = () => `t${++t}`;
  for (const stmt of sf.statements) {
    if (ts.isVariableStatement(stmt)) for (const d of stmt.declarationList.declarations) out.push(`${d.name.getText()} := ${d.initializer ? d.initializer.getText() : "undefined"}`);
    else if (ts.isFunctionDeclaration(stmt)) out.push(`func ${stmt.name?.getText() ?? "<anon>"}(${stmt.parameters.map(p => p.name.getText()).join(", ")}) -> body(${stmt.body?.statements.length ?? 0} statements)`);
    else if (ts.isForStatement(stmt) || ts.isWhileStatement(stmt) || ts.isForOfStatement(stmt) || ts.isForInStatement(stmt)) { const v = tmp(); out.push(`${v} := loop_header; ifFalse ${v} goto END_LOOP; ...loop body...; goto loop_header; END_LOOP:`); }
    else if (ts.isIfStatement(stmt)) { const v = tmp(); out.push(`${v} := ${stmt.expression.getText()}; ifFalse ${v} goto ELSE; ...then...; goto END_IF; ELSE: ...else...; END_IF:`); }
    else if (ts.isReturnStatement(stmt)) out.push(`return ${stmt.expression?.getText() ?? ""}`);
    else if (ts.isExpressionStatement(stmt)) out.push(`${tmp()} := ${stmt.expression.getText()}`);
    else out.push(`; ${ts.SyntaxKind[stmt.kind]} (statement kept as-is in this IR subset)`);
    if (out.length >= 60) break;
  }
  return out;
}
export function analyze(code: string, languageId: string): Analysis {
  if (languageId === "javascript" || languageId === "typescript") return analyzeJsTs(code, languageId === "typescript");
  if (languageId === "python") return { supported: true, tokens: tokenize(code), ast: [], ir: [], diagnostics: [], reason: "Python: lexical tokens are real, but AST/IR visualization is not implemented yet (no Python parser is bundled). Execution is unaffected." };
  return { supported: false, tokens: [], ast: [], ir: [], diagnostics: [], reason: `Compiler visualization is not implemented for this language yet. Only JavaScript and TypeScript have a real parser (TypeScript compiler API); Python shows lexical tokens only.` };
}
