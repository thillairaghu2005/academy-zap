import type { JudgeLanguage, JudgeResult, Problem, SubmissionAccepted, Verdict } from "@/lib/contracts/judge";

/**
 * Judge Engine fixtures + in-memory submission store.
 *
 * The mock grading model is DETERMINISTIC and mirrors the real flow's shape
 * (202 → queued → graded) without a sandbox:
 *  - `submit()` returns SubmissionAccepted immediately (202 semantics).
 *  - A scripted "worker" marks the submission graded after a delay and
 *    derives the verdict from the submitted source code against a small
 *    deterministic rule set (see gradeSubmission below).
 *  - Every verdict literal is reachable for demos. Marker PRECEDENCE (first
 *    match wins, top-to-bottom — documented here and mirrored in the demo
 *    hint card on the problem page):
 *      source contains  "compile_error" → compile_error
 *      source contains  "sleep("        → time_limit_exceeded
 *      source contains  "raise "        → runtime_error
 *      source contains  "wrong_answer"  → wrong_answer
 *      otherwise                         → accepted
 *  - Source containing "queue_hang" is not a verdict marker — it makes the
 *    mock worker grade after ~25s (see the demo judge service), which
 *    trips the client's 15s queue timeout, demoing the hang card + recovery.
 *
 * Deterministic demo hooks (same spirit as the content mocks):
 *  - problem id "missing-problem" → 404 (detail error state)
 *  - problem id "boom"            → 503 (submit error state)
 */

export interface StoredSubmission {
  submission: SubmissionAccepted;
  problem_id: string;
  user_id: string;
  language: JudgeLanguage;
  source_code: string;
  verdict: (typeof VERDICTS)[number] | null;
  runtime_ms: number | null;
  memory_kb: number | null;
  test_cases_passed: number | null;
  test_cases_total: number | null;
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  cases: JudgeResult["cases"] | null;
  graded_at: string | null;
}

export const VERDICTS = [
  "accepted",
  "wrong_answer",
  "time_limit_exceeded",
  "runtime_error",
  "compile_error",
] as const;

/** Per-problem metadata used by the scripted grader (stand-in for test_cases). */
export const MOCK_PROBLEMS: Problem[] = [
  {
    id: "p-two-sum",
    slug: "two-sum",
    title: "Two Sum",
    difficulty: "easy",
    estimated_minutes: 12,
    success_rate_pct: 78,
    topics: ["arrays", "hash-maps"],
    statement:
      "Given an array of integers `nums` and an integer `target`, return the indices of the two numbers that add up to `target`.\n\nYou may assume that each input has exactly one solution, and you may not use the same element twice. Return the answer in any order.\n\nFor an input `X`, think of the complement as $f(X) = target - X$. The pair is valid when $nums[i] + nums[j] = target$.",
    constraints: [
      "2 ≤ nums.length ≤ 10⁴",
      "-10⁹ ≤ nums[i] ≤ 10⁹",
      "-10⁹ ≤ target ≤ 10⁹",
      "Exactly one valid answer exists.",
    ],
    starter_code:
      "def two_sum(nums, target):\n    \"\"\"Return the two indices that sum to target.\"\"\"\n    seen = {}\n    for i, num in enumerate(nums):\n        complement = target - num\n        if complement in seen:\n            return [seen[complement], i]\n        seen[num] = i\n    return []\n",
    sample_cases: [
      {
        input: "nums = [2,7,11,15], target = 9",
        output: "[0, 1]",
        explanation: "Because nums[0] + nums[1] == 9, we return [0, 1].",
      },
      {
        input: "nums = [3,2,4], target = 6",
        output: "[1, 2]",
      },
      {
        input: "nums = [3,3], target = 6",
        output: "[0, 1]",
      },
    ],
    hidden_test_count: 12,
    time_limit_ms: 1000,
    memory_limit_kb: 65536,
  },
  {
    id: "p-valid-parens",
    slug: "valid-parentheses",
    title: "Valid Parentheses",
    difficulty: "easy",
    estimated_minutes: 10,
    success_rate_pct: 84,
    topics: ["stack", "strings"],
    statement:
      "Given a string `s` containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid.\n\nAn input string is valid if: open brackets are closed by the same type of brackets, and open brackets are closed in the correct order.",
    constraints: ["1 ≤ s.length ≤ 10⁴", "s consists of parentheses only: ()[]{}."],
    starter_code:
      "def is_valid(s):\n    \"\"\"Return True if the bracket string is valid.\"\"\"\n    stack = []\n    pairs = {')': '(', ']': '[', '}': '{'}\n    for ch in s:\n        if ch in pairs.values():\n            stack.append(ch)\n        elif not stack or stack.pop() != pairs[ch]:\n            return False\n    return not stack\n",
    sample_cases: [
      { input: 's = "()"', output: "true" },
      { input: 's = "()[]{}"', output: "true" },
      { input: 's = "(]"', output: "false" },
      { input: 's = "([)]"', output: "false" },
    ],
    hidden_test_count: 18,
    time_limit_ms: 1000,
    memory_limit_kb: 65536,
  },
  {
    id: "p-max-subarray",
    slug: "maximum-subarray",
    title: "Maximum Subarray",
    difficulty: "medium",
    estimated_minutes: 18,
    success_rate_pct: 61,
    topics: ["arrays", "divide-and-conquer"],
    statement:
      "Given an integer array `nums`, find the contiguous subarray (containing at least one number) which has the largest sum and return its sum.",
    constraints: [
      "1 ≤ nums.length ≤ 10⁵",
      "-10⁴ ≤ nums[i] ≤ 10⁴",
      "Follow up: solve it in O(n) with constant space.",
    ],
    starter_code:
      "def max_sub_array(nums):\n    \"\"\"Return the largest contiguous subarray sum.\"\"\"\n    best = current = nums[0]\n    for num in nums[1:]:\n        current = max(num, current + num)\n        best = max(best, current)\n    return best\n",
    sample_cases: [
      { input: "nums = [-2,1,-3,4,-1,2,1,-5,4]", output: "6", explanation: "[4,-1,2,1] has the largest sum = 6." },
      { input: "nums = [1]", output: "1" },
      { input: "nums = [5,4,-1,7,8]", output: "23" },
    ],
    hidden_test_count: 15,
    time_limit_ms: 1000,
    memory_limit_kb: 65536,
  },
  {
    id: "p-reverse-linked-list",
    slug: "reverse-linked-list",
    title: "Reverse Linked List",
    difficulty: "easy",
    estimated_minutes: 14,
    success_rate_pct: 72,
    topics: ["linked-list"],
    statement:
      "Given the `head` of a singly linked list, reverse the list and return the reversed list.\n\nThe `ListNode` class is provided in the starter code.",
    constraints: ["0 ≤ number of nodes ≤ 5000", "-5000 ≤ Node.val ≤ 5000"],
    starter_code:
      "class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\n\ndef reverse_list(head):\n    \"\"\"Return the head of the reversed list.\"\"\"\n    prev = None\n    cur = head\n    while cur:\n        nxt = cur.next\n        cur.next = prev\n        prev = cur\n        cur = nxt\n    return prev\n",
    sample_cases: [
      { input: "head = [1,2,3,4,5]", output: "[5,4,3,2,1]" },
      { input: "head = [1,2]", output: "[2,1]" },
      { input: "head = []", output: "[]" },
    ],
    hidden_test_count: 11,
    time_limit_ms: 1000,
    memory_limit_kb: 65536,
  },
  {
    id: "p-binary-tree-inorder",
    slug: "binary-tree-inorder-traversal",
    title: "Binary Tree Inorder Traversal",
    difficulty: "easy",
    estimated_minutes: 20,
    success_rate_pct: 54,
    topics: ["tree", "dfs"],
    statement:
      "Given the `root` of a binary tree, return the inorder traversal of its nodes' values. The `TreeNode` class is provided.",
    constraints: ["0 ≤ number of nodes ≤ 100", "-100 ≤ Node.val ≤ 100"],
    starter_code:
      "class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\n\ndef inorder_traversal(root):\n    \"\"\"Return a list of node values in inorder.\"\"\"\n    result = []\n    stack = []\n    cur = root\n    while cur or stack:\n        while cur:\n            stack.append(cur)\n            cur = cur.left\n        cur = stack.pop()\n        result.append(cur.val)\n        cur = cur.right\n    return result\n",
    sample_cases: [
      { input: "root = [1,null,2,3]", output: "[1,3,2]" },
      { input: "root = []", output: "[]" },
      { input: "root = [1]", output: "[1]" },
    ],
    hidden_test_count: 10,
    time_limit_ms: 1000,
    memory_limit_kb: 65536,
  },
  {
    id: "p-median-two-sorted",
    slug: "median-of-two-sorted-arrays",
    title: "Median of Two Sorted Arrays",
    difficulty: "hard",
    estimated_minutes: 32,
    success_rate_pct: 29,
    topics: ["binary-search"],
    statement:
      "Given two sorted arrays `nums1` and `nums2` of size m and n respectively, return the median of the two sorted arrays. The overall run time complexity should be O(log (m+n)).",
    constraints: [
      "0 ≤ m, n ≤ 1000",
      "1 ≤ m + n ≤ 2000",
      "-10⁶ ≤ nums1[i], nums2[j] ≤ 10⁶",
    ],
    starter_code:
      "def find_median_sorted_arrays(nums1, nums2):\n    \"\"\"Return the median of two sorted arrays in O(log(m+n)).\"\"\"\n    a, b = sorted((nums1, nums2), key=len)\n    m, n = len(a), len(b)\n    left, right = 0, m\n    while left <= right:\n        i = (left + right) // 2\n        j = (m + n + 1) // 2 - i\n        a_left = a[i - 1] if i > 0 else float('-inf')\n        a_right = a[i] if i < m else float('inf')\n        b_left = b[j - 1] if j > 0 else float('-inf')\n        b_right = b[j] if j < n else float('inf')\n        if a_left <= b_right and b_left <= a_right:\n            if (m + n) % 2:\n                return max(a_left, b_left)\n            return (max(a_left, b_left) + min(a_right, b_right)) / 2\n        if a_left > b_right:\n            right = i - 1\n        else:\n            left = i + 1\n    return 0\n",
    sample_cases: [
      { input: "nums1 = [1,3], nums2 = [2]", output: "2.00000" },
      { input: "nums1 = [1,2], nums2 = [3,4]", output: "2.50000" },
    ],
    hidden_test_count: 20,
    time_limit_ms: 1000,
    memory_limit_kb: 65536,
  },
  {
    id: "p-trapping-rain-water",
    slug: "trapping-rain-water",
    title: "Trapping Rain Water",
    difficulty: "hard",
    estimated_minutes: 28,
    success_rate_pct: 33,
    topics: ["two-pointers", "dp"],
    statement:
      "Given `n` non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.",
    constraints: [
      "n == height.length",
      "1 ≤ n ≤ 2×10⁴",
      "0 ≤ height[i] ≤ 10⁵",
    ],
    starter_code:
      "def trap(height):\n    \"\"\"Return total trapped rain water.\"\"\"\n    if not height:\n        return 0\n    left, right = 0, len(height) - 1\n    left_max = right_max = 0\n    water = 0\n    while left < right:\n        if height[left] < height[right]:\n            left_max = max(left_max, height[left])\n            water += left_max - height[left]\n            left += 1\n        else:\n            right_max = max(right_max, height[right])\n            water += right_max - height[right]\n            right -= 1\n    return water\n",
    sample_cases: [
      { input: "height = [0,1,0,2,1,0,1,3,2,1,2,1]", output: "6", explanation: "6 units of water are trapped." },
      { input: "height = [4,2,0,3,2,5]", output: "9" },
    ],
    hidden_test_count: 16,
    time_limit_ms: 1000,
    memory_limit_kb: 65536,
  },
];

export const MOCK_PROBLEMS_BY_ID = new Map(
  MOCK_PROBLEMS.map((problem) => [problem.id, problem]),
);

export const MOCK_MISSING_PROBLEM_ID = "missing-problem";
export const MOCK_BOOM_PROBLEM_ID = "boom";

/**
 * In-memory submission store — the mock's stand-in for the Judge Engine's
 * `submissions` table. Resets per page load, exactly like the content mocks.
 */
export const mockSubmissions = new Map<string, StoredSubmission>();

function buildCases(
  verdict: Verdict,
  total: number,
  passed: number,
  runtimeMs: number,
  memoryKb: number,
  problem?: Problem,
): NonNullable<JudgeResult["cases"]> {
  const visibleCount = Math.min(problem?.sample_cases.length ?? 3, total);
  const failedVisibleIndex = Math.min(visibleCount, Math.max(1, passed + 1));
  let acceptedRemaining = passed;
  const cases: NonNullable<JudgeResult["cases"]> = [];

  for (let index = 1; index <= total; index += 1) {
    const hidden = index > visibleCount;
    let status: Verdict = verdict;
    if (verdict === "accepted") {
      status = "accepted";
    } else if (verdict === "wrong_answer") {
      if (index === failedVisibleIndex) {
        status = "wrong_answer";
      } else if (acceptedRemaining > 0) {
        status = "accepted";
        acceptedRemaining -= 1;
      }
    }

    const sample = problem?.sample_cases[index - 1];
    const expected = sample?.output;
    cases.push({
      index,
      status,
      hidden,
      runtime_ms: runtimeMs,
      memory_kb: memoryKb,
      ...(hidden || !sample ? {} : {
        input: sample.input,
        expected,
        received: status === "wrong_answer" ? "[0, 3]" : expected,
      }),
    });
  }

  return cases;
}

/** Scripted verdict derivation — deterministic, no client logic involved. */
export function gradeSubmission(source: string, problem?: Problem): {
  verdict: Verdict;
  runtime_ms: number;
  memory_kb: number;
  test_cases_passed: number;
  test_cases_total: number;
  stdout: string;
  stderr: string | null;
  compile_output: string | null;
  cases: NonNullable<JudgeResult["cases"]>;
} {
  const total = problem?.hidden_test_count ?? 12;

  if (source.includes("compile_error")) {
    return {
      verdict: "compile_error",
      runtime_ms: 0,
      memory_kb: 1024,
      test_cases_passed: 0,
      test_cases_total: 1,
      stdout: "",
      stderr: null,
      compile_output: "SyntaxError: invalid syntax (line 2)\n  return [seen[comp",
      cases: buildCases("compile_error", 1, 0, 0, 1024, problem),
    };
  }
  if (source.includes("sleep(")) {
    return {
      verdict: "time_limit_exceeded",
      runtime_ms: 1000,
      memory_kb: 1024,
      test_cases_passed: 0,
      test_cases_total: total,
      stdout: "",
      stderr: "Execution timed out after 1000ms.",
      compile_output: null,
      cases: buildCases("time_limit_exceeded", total, 0, 1000, 1024, problem),
    };
  }
  if (source.includes("raise ")) {
    return {
      verdict: "runtime_error",
      runtime_ms: 42,
      memory_kb: 9216,
      test_cases_passed: 0,
      test_cases_total: total,
      stdout: "",
      stderr: "IndexError: list index out of range\n  at two_sum (line 12)",
      compile_output: null,
      cases: buildCases("runtime_error", total, 0, 42, 9216, problem),
    };
  }
  if (source.includes("wrong_answer")) {
    return {
      verdict: "wrong_answer",
      runtime_ms: 36,
      memory_kb: 8192,
      test_cases_passed: 7,
      test_cases_total: total,
      stdout: "case 3: expected [0, 1] but got [0, 3]",
      stderr: null,
      compile_output: null,
      cases: buildCases("wrong_answer", total, Math.min(7, Math.max(0, total - 1)), 36, 8192, problem),
    };
  }
  return {
    verdict: "accepted",
    runtime_ms: 31,
    memory_kb: 9216,
    test_cases_passed: total,
    test_cases_total: total,
    stdout: `All ${total} test cases passed.`,
    stderr: null,
    compile_output: null,
    cases: buildCases("accepted", total, total, 31, 9216, problem),
  };
}

/** Seed a couple of historical submissions for the problem list's history view. */
export function seedSubmissionHistory(): void {
  if (mockSubmissions.size > 0) return;
  const now = Date.now();
  const seeds: { problemId: string; source: string; agoMs: number }[] = [
    { problemId: "p-two-sum", source: "def two_sum(nums, target):\n    # wrong_answer demo\n    return [0, 0]\n", agoMs: 6 * 60_000 },
    { problemId: "p-two-sum", source: "def two_sum(nums, target):\n    seen = {}\n    for i, num in enumerate(nums):\n        c = target - num\n        if c in seen:\n            return [seen[c], i]\n        seen[num] = i\n    return []\n", agoMs: 2 * 60_000 },
    { problemId: "p-valid-parens", source: "def is_valid(s):\n    return False  # wrong_answer\n", agoMs: 90 * 60_000 },
  ];
  seeds.forEach((seed, i) => {
    const problem = MOCK_PROBLEMS_BY_ID.get(seed.problemId);
    const graded = gradeSubmission(seed.source, problem);
    mockSubmissions.set(`seed-${i}`, {
      submission: {
        submission_id: `seed-${i}`,
        status: "graded",
        received_at: new Date(now - seed.agoMs).toISOString(),
      },
      problem_id: seed.problemId,
      user_id: "seed-user",
      language: "python",
      source_code: seed.source,
      verdict: graded.verdict,
      runtime_ms: graded.runtime_ms,
      memory_kb: graded.memory_kb,
      test_cases_passed: graded.test_cases_passed,
      test_cases_total: graded.test_cases_total,
      stdout: graded.stdout,
      stderr: graded.stderr,
      compile_output: graded.compile_output,
      cases: graded.cases,
      graded_at: new Date(now - seed.agoMs + 400).toISOString(),
    });
  });
}
