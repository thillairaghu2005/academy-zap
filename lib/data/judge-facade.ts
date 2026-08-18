import { DEMO_MODE } from "@/lib/config";
import * as demoJudge from "./demo/judge";
import * as realJudge from "./judge";

export const listProblems = DEMO_MODE ? demoJudge.listProblems : realJudge.listProblems;
export const listSolvedProblemIds = DEMO_MODE ? demoJudge.listSolvedProblemIds : realJudge.listSolvedProblemIds;
export const getProblem = DEMO_MODE ? demoJudge.getProblem : realJudge.getProblem;
export const submit = DEMO_MODE ? demoJudge.submit : realJudge.submit;
export const getResult = DEMO_MODE ? demoJudge.getResult : realJudge.getResult;
export const listSubmissions = DEMO_MODE ? demoJudge.listSubmissions : realJudge.listSubmissions;
export const subscribeToJudgeResult = realJudge.subscribeToJudgeResult;
