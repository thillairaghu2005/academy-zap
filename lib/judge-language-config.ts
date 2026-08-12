import type { JudgeLanguage, Problem } from "@/lib/contracts/judge";

export interface JudgeLanguageConfig {
  value: JudgeLanguage;
  label: string;
  extension: string;
  filename: string;
  editorLanguage: JudgeLanguage;
  runtime: string;
  template: (problem: Problem) => string;
}

const PYTHON_TEMPLATE = (problem: Problem) => problem.starter_code;

const JAVA_TEMPLATES: Record<string, string> = {
  "two-sum": `import java.util.*;

class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> seen = new HashMap<>();

        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (seen.containsKey(complement)) {
                return new int[] { seen.get(complement), i };
            }
            seen.put(nums[i], i);
        }

        return new int[] {};
    }
}
`,
  "valid-parentheses": `import java.util.*;

class Solution {
    public boolean isValid(String s) {
        Deque<Character> stack = new ArrayDeque<>();
        Map<Character, Character> pairs = Map.of(')', '(', ']', '[', '}', '{');

        for (char ch : s.toCharArray()) {
            if (pairs.containsValue(ch)) {
                stack.push(ch);
            } else if (stack.isEmpty() || stack.pop() != pairs.get(ch)) {
                return false;
            }
        }

        return stack.isEmpty();
    }
}
`,
  "maximum-subarray": `class Solution {
    public int maxSubArray(int[] nums) {
        int current = nums[0];
        int best = nums[0];

        for (int i = 1; i < nums.length; i++) {
            current = Math.max(nums[i], current + nums[i]);
            best = Math.max(best, current);
        }

        return best;
    }
}
`,
  "reverse-linked-list": `class Solution {
    public ListNode reverseList(ListNode head) {
        ListNode previous = null;
        ListNode current = head;

        while (current != null) {
            ListNode next = current.next;
            current.next = previous;
            previous = current;
            current = next;
        }

        return previous;
    }
}
`,
  "binary-tree-inorder-traversal": `import java.util.*;

class Solution {
    public List<Integer> inorderTraversal(TreeNode root) {
        List<Integer> result = new ArrayList<>();
        Deque<TreeNode> stack = new ArrayDeque<>();
        TreeNode current = root;

        while (current != null || !stack.isEmpty()) {
            while (current != null) {
                stack.push(current);
                current = current.left;
            }
            current = stack.pop();
            result.add(current.val);
            current = current.right;
        }

        return result;
    }
}
`,
  "median-of-two-sorted-arrays": `class Solution {
    public double findMedianSortedArrays(int[] nums1, int[] nums2) {
        if (nums1.length > nums2.length) {
            return findMedianSortedArrays(nums2, nums1);
        }

        int left = 0;
        int right = nums1.length;
        while (left <= right) {
            int partition1 = (left + right) / 2;
            int partition2 = (nums1.length + nums2.length + 1) / 2 - partition1;
            int left1 = partition1 == 0 ? Integer.MIN_VALUE : nums1[partition1 - 1];
            int right1 = partition1 == nums1.length ? Integer.MAX_VALUE : nums1[partition1];
            int left2 = partition2 == 0 ? Integer.MIN_VALUE : nums2[partition2 - 1];
            int right2 = partition2 == nums2.length ? Integer.MAX_VALUE : nums2[partition2];

            if (left1 <= right2 && left2 <= right1) {
                if ((nums1.length + nums2.length) % 2 == 1) return Math.max(left1, left2);
                return (Math.max(left1, left2) + Math.min(right1, right2)) / 2.0;
            }
            if (left1 > right2) right = partition1 - 1;
            else left = partition1 + 1;
        }

        return 0.0;
    }
}
`,
  "trapping-rain-water": `class Solution {
    public int trap(int[] height) {
        int left = 0;
        int right = height.length - 1;
        int leftMax = 0;
        int rightMax = 0;
        int water = 0;

        while (left < right) {
            if (height[left] < height[right]) {
                leftMax = Math.max(leftMax, height[left]);
                water += leftMax - height[left++];
            } else {
                rightMax = Math.max(rightMax, height[right]);
                water += rightMax - height[right--];
            }
        }

        return water;
    }
}
`,
};

const JAVASCRIPT_TEMPLATES: Record<string, string> = {
  "two-sum": `function twoSum(nums, target) {
    const seen = new Map();

    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        if (seen.has(complement)) return [seen.get(complement), i];
        seen.set(nums[i], i);
    }

    return [];
}
`,
  "valid-parentheses": `function isValid(s) {
    const stack = [];
    const pairs = { ")": "(", "]": "[", "}": "{" };

    for (const ch of s) {
        if (Object.values(pairs).includes(ch)) stack.push(ch);
        else if (stack.pop() !== pairs[ch]) return false;
    }

    return stack.length === 0;
}
`,
  "maximum-subarray": `function maxSubArray(nums) {
    let current = nums[0];
    let best = nums[0];

    for (let i = 1; i < nums.length; i++) {
        current = Math.max(nums[i], current + nums[i]);
        best = Math.max(best, current);
    }

    return best;
}
`,
  "reverse-linked-list": `function reverseList(head) {
    let previous = null;
    let current = head;

    while (current) {
        const next = current.next;
        current.next = previous;
        previous = current;
        current = next;
    }

    return previous;
}
`,
  "binary-tree-inorder-traversal": `function inorderTraversal(root) {
    const result = [];
    const stack = [];
    let current = root;

    while (current || stack.length) {
        while (current) {
            stack.push(current);
            current = current.left;
        }
        current = stack.pop();
        result.push(current.val);
        current = current.right;
    }

    return result;
}
`,
  "median-of-two-sorted-arrays": `function findMedianSortedArrays(nums1, nums2) {
    const values = [...nums1, ...nums2].sort((a, b) => a - b);
    const middle = Math.floor(values.length / 2);
    return values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2;
}
`,
  "trapping-rain-water": `function trap(height) {
    let left = 0;
    let right = height.length - 1;
    let leftMax = 0;
    let rightMax = 0;
    let water = 0;

    while (left < right) {
        if (height[left] < height[right]) {
            leftMax = Math.max(leftMax, height[left]);
            water += leftMax - height[left++];
        } else {
            rightMax = Math.max(rightMax, height[right]);
            water += rightMax - height[right--];
        }
    }

    return water;
}
`,
};

const CPP_TEMPLATES: Record<string, string> = {
  "two-sum": `#include <vector>
#include <unordered_map>
using namespace std;

class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        unordered_map<int, int> seen;

        for (int i = 0; i < nums.size(); i++) {
            int complement = target - nums[i];
            if (seen.count(complement)) return {seen[complement], i};
            seen[nums[i]] = i;
        }

        return {};
    }
};
`,
  "valid-parentheses": `#include <stack>
#include <string>
#include <unordered_map>
using namespace std;

class Solution {
public:
    bool isValid(string s) {
        stack<char> open;
        unordered_map<char, char> pairs = {{')', '('}, {']', '['}, {'}', '{'}};

        for (char ch : s) {
            if (ch == '(' || ch == '[' || ch == '{') open.push(ch);
            else if (open.empty() || open.top() != pairs[ch]) return false;
            else open.pop();
        }

        return open.empty();
    }
};
`,
  "maximum-subarray": `#include <algorithm>
#include <vector>
using namespace std;

class Solution {
public:
    int maxSubArray(vector<int>& nums) {
        int current = nums[0];
        int best = nums[0];
        for (int i = 1; i < nums.size(); i++) {
            current = max(nums[i], current + nums[i]);
            best = max(best, current);
        }
        return best;
    }
};
`,
  "reverse-linked-list": `class Solution {
public:
    ListNode* reverseList(ListNode* head) {
        ListNode* previous = nullptr;
        while (head) {
            ListNode* next = head->next;
            head->next = previous;
            previous = head;
            head = next;
        }
        return previous;
    }
};
`,
  "binary-tree-inorder-traversal": `#include <stack>
#include <vector>
using namespace std;

class Solution {
public:
    vector<int> inorderTraversal(TreeNode* root) {
        vector<int> result;
        stack<TreeNode*> nodes;
        while (root || !nodes.empty()) {
            while (root) {
                nodes.push(root);
                root = root->left;
            }
            root = nodes.top();
            nodes.pop();
            result.push_back(root->val);
            root = root->right;
        }
        return result;
    }
};
`,
  "median-of-two-sorted-arrays": `#include <algorithm>
#include <vector>
using namespace std;

class Solution {
public:
    double findMedianSortedArrays(vector<int>& nums1, vector<int>& nums2) {
        vector<int> values = nums1;
        values.insert(values.end(), nums2.begin(), nums2.end());
        sort(values.begin(), values.end());
        int middle = values.size() / 2;
        if (values.size() % 2) return values[middle];
        return (values[middle - 1] + values[middle]) / 2.0;
    }
};
`,
  "trapping-rain-water": `#include <algorithm>
#include <vector>
using namespace std;

class Solution {
public:
    int trap(vector<int>& height) {
        int left = 0, right = height.size() - 1;
        int leftMax = 0, rightMax = 0, water = 0;
        while (left < right) {
            if (height[left] < height[right]) {
                leftMax = max(leftMax, height[left]);
                water += leftMax - height[left++];
            } else {
                rightMax = max(rightMax, height[right]);
                water += rightMax - height[right--];
            }
        }
        return water;
    }
};
`,
};

function mappedTemplate(
  templates: Record<string, string>,
  problem: Problem,
  fallback: string,
): string {
  return templates[problem.slug] ?? fallback.replace("__TITLE__", problem.title);
}

export const JUDGE_LANGUAGE_CONFIG: Record<JudgeLanguage, JudgeLanguageConfig> = {
  python: {
    value: "python",
    label: "Python",
    extension: "py",
    filename: "solution.py",
    editorLanguage: "python",
    runtime: "python",
    template: PYTHON_TEMPLATE,
  },
  java: {
    value: "java",
    label: "Java",
    extension: "java",
    filename: "Solution.java",
    editorLanguage: "java",
    runtime: "java",
    template: (problem) => mappedTemplate(JAVA_TEMPLATES, problem, "class Solution {\n    // Implement __TITLE__\n}\n"),
  },
  javascript: {
    value: "javascript",
    label: "JavaScript",
    extension: "js",
    filename: "solution.js",
    editorLanguage: "javascript",
    runtime: "node",
    template: (problem) => mappedTemplate(JAVASCRIPT_TEMPLATES, problem, "function solve(input) {\n    // Implement __TITLE__\n    return input;\n}\n"),
  },
  cpp: {
    value: "cpp",
    label: "C++",
    extension: "cpp",
    filename: "solution.cpp",
    editorLanguage: "cpp",
    runtime: "g++",
    template: (problem) => mappedTemplate(CPP_TEMPLATES, problem, "class Solution {\npublic:\n    // Implement __TITLE__\n};\n"),
  },
};

export const JUDGE_LANGUAGE_OPTIONS = Object.values(JUDGE_LANGUAGE_CONFIG).map(
  ({ value, label }) => ({ value, label }),
);

export function isJudgeLanguage(value: string | undefined): value is JudgeLanguage {
  return value !== undefined && value in JUDGE_LANGUAGE_CONFIG;
}

export function getJudgeLanguageConfig(language: string | undefined): JudgeLanguageConfig {
  return isJudgeLanguage(language)
    ? JUDGE_LANGUAGE_CONFIG[language]
    : JUDGE_LANGUAGE_CONFIG.python;
}
