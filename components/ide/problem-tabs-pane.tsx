"use client";

import * as React from "react";
import { BookOpen, Users, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Problem } from "@/lib/contracts/judge";
import { StatementPane } from "./statement/StatementPane";
import { EditorialTab } from "./editorial-tab";
import { PeerSolutionsTab } from "./peer-solutions-tab";
export function ProblemTabsPane({ problem, colorizeCode }: { problem: Problem; colorizeCode?: (code: string, language: string) => Promise<string> }) {
  const [activeTab, setActiveTab] = React.useState("statement");

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full" defaultValue="statement">
        <div className="flex-none border-b border-border px-4 py-2 bg-muted/20">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="statement" className="text-xs">
              <FileText className="mr-1.5 h-3.5 w-3.5" />
              Statement
            </TabsTrigger>
            <TabsTrigger value="editorial" className="text-xs">
              <BookOpen className="mr-1.5 h-3.5 w-3.5" />
              Editorial
            </TabsTrigger>
            <TabsTrigger value="solutions" className="text-xs">
              <Users className="mr-1.5 h-3.5 w-3.5" />
              Solutions
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="statement" className="flex-1 overflow-auto m-0 data-[state=active]:flex flex-col">
          <StatementPane problem={problem} colorizeCode={colorizeCode} />
        </TabsContent>

        <TabsContent value="editorial" className="flex-1 overflow-auto m-0 data-[state=active]:block">
          <EditorialTab problemId={problem.id} />
        </TabsContent>

        <TabsContent value="solutions" className="flex-1 overflow-auto m-0 data-[state=active]:block">
          <PeerSolutionsTab problemId={problem.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
