"use client";

import * as React from "react";
import { IDE } from "@/components/ide/IDE";
import type { IDEExecution } from "@/components/ide/IDE";
import type { IDEFile } from "@/types/ide";
import type { Problem } from "@/lib/contracts/judge";

const MOCK_PROBLEM: Problem = {
  id: "chal-1",
  title: "Reverse a Linked List",
  slug: "reverse-linked-list",
  difficulty: "easy",
  estimated_minutes: 15,
  success_rate_pct: 82,
  topics: ["Data Structures", "Pointers"],
  statement: `
    <h3>Problem Statement</h3>
    <p>Given the <code>head</code> of a singly linked list, reverse the list, and return <em>the reversed list</em>.</p>
    <h4>Example 1:</h4>
    <pre><code>Input: head = [1,2,3,4,5]
Output: [5,4,3,2,1]</code></pre>
  `,
  constraints: ["The number of nodes in the list is the range [0, 5000].", "-5000 <= Node.val <= 5000"],
  starter_code: {
    python: "class Solution:\n    def reverseList(self, head: ListNode) -> ListNode:\n        pass\n"
  },
  sample_cases: [
    { input: "[1,2,3,4,5]", output: "[5,4,3,2,1]" }
  ],
  hidden_test_count: 10,
  time_limit_ms: 2000,
  memory_limit_kb: 256000,
};

export function ChallengeIDE({ id }: { id: string }) {
  // In a real app, we would fetch the problem details and initial code based on the ID.
  
  const [execution, setExecution] = React.useState<IDEExecution>({ status: "idle" });

  const initialFiles: IDEFile[] = [
    {
      path: "solution.py",
      name: "solution.py",
      kind: "file",
      language: "python",
      content: `class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\nclass Solution:\n    def reverseList(self, head: ListNode) -> ListNode:\n        # Write your code here\n        pass\n`,
      dirty: false,
      order: 1,
    },
  ];

  const handleRun = () => {
    setExecution({ status: "running" });
    // Mocking an execution delay
    setTimeout(() => {
      setExecution({
        status: "accepted",
        passed: 10,
        total: 10,
        runtimeMs: 42,
        memoryMb: 14.2,
        xp: 100,
      });
    }, 1500);
  };

  return (
    <div className="h-[calc(100vh-4rem)]">
      <IDE 
        initialFiles={initialFiles}
        problem={MOCK_PROBLEM}
        problemTitle={MOCK_PROBLEM.title}
        storageKey={`challenge-${id}-code`}
        primaryAction={{ label: "Submit Solution", onClick: handleRun }}
        execution={execution}
      />
    </div>
  );
}
