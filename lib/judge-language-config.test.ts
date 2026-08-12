import { describe, expect, it } from "vitest";

import { MOCK_PROBLEMS_BY_ID } from "@/lib/mocks/judge";
import {
  JUDGE_LANGUAGE_CONFIG,
  getJudgeLanguageConfig,
  isJudgeLanguage,
} from "@/lib/judge-language-config";

describe("judge language configuration", () => {
  const problem = MOCK_PROBLEMS_BY_ID.get("p-two-sum")!;

  it.each([
    ["python", "solution.py", "def two_sum"],
    ["java", "Solution.java", "class Solution"],
    ["javascript", "solution.js", "function twoSum"],
    ["cpp", "solution.cpp", "class Solution"],
  ] as const)("keeps %s metadata and starter code aligned", (language, filename, marker) => {
    const config = JUDGE_LANGUAGE_CONFIG[language];

    expect(config.filename).toBe(filename);
    expect(config.filename.endsWith(`.${config.extension}`)).toBe(true);
    expect(config.editorLanguage).toBe(language);
    expect(config.template(problem)).toContain(marker);
  });

  it("rejects unsupported language values without changing the supported set", () => {
    expect(isJudgeLanguage("ruby")).toBe(false);
    expect(getJudgeLanguageConfig("ruby").value).toBe("python");
  });
});
