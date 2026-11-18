import { describe, it, expect } from "vitest";
import { loadProjects, saveProjects, loadSettings, saveSettings } from "./storage.js";
describe("project persistence", () => {
  it("round-trips projects and settings", () => {
    saveProjects([{ id: "1", name: "Demo", language: "python", files: [{ name: "main.py", content: "print(1)" }], updatedAt: 1 }]);
    expect(loadProjects()[0].name).toBe("Demo");
    saveSettings({ ...loadSettings(), theme: "light", fontSize: 16 });
    expect(loadSettings().fontSize).toBe(16);
    expect(loadSettings().rightWidth).toBeGreaterThan(0);
  });
});
