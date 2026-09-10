"use client";

import * as React from "react";
import { Users, Star, DollarSign, ArrowUpRight, MessageSquare, BookOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function InstructorDashboard() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 sm:p-8">
      <div>
        <h1 className="text-3xl font-display font-semibold">Instructor Dashboard</h1>
        <p className="mt-2 text-muted-foreground">Overview of your teaching impact and platform analytics.</p>
      </div>

      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 flex flex-col gap-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-sm font-medium">Total Students</span>
            <Users className="size-4" />
          </div>
          <p className="text-2xl font-bold">12,450</p>
          <span className="text-xs text-success flex items-center gap-1"><ArrowUpRight className="size-3" /> 14% this month</span>
        </Card>
        
        <Card className="p-5 flex flex-col gap-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-sm font-medium">Average Rating</span>
            <Star className="size-4" />
          </div>
          <p className="text-2xl font-bold">4.8</p>
          <span className="text-xs text-success flex items-center gap-1"><ArrowUpRight className="size-3" /> +0.2 this month</span>
        </Card>

        <Card className="p-5 flex flex-col gap-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-sm font-medium">Total Revenue</span>
            <DollarSign className="size-4" />
          </div>
          <p className="text-2xl font-bold">$45,231</p>
          <span className="text-xs text-success flex items-center gap-1"><ArrowUpRight className="size-3" /> 8% this month</span>
        </Card>

        <Card className="p-5 flex flex-col gap-2 bg-primary text-primary-foreground">
          <div className="flex items-center justify-between text-primary-foreground/80">
            <span className="text-sm font-medium">Unresolved Q&A</span>
            <MessageSquare className="size-4" />
          </div>
          <p className="text-2xl font-bold">12</p>
          <Button variant="secondary" size="sm" className="mt-1 w-fit bg-white/20 hover:bg-white/30 text-white border-0">View Questions</Button>
        </Card>
      </div>

      {/* Course Performance */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Your Courses</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { title: "Advanced React Patterns", students: "4,200", rating: "4.9", revenue: "$18,400" },
            { title: "System Design Interview prep", students: "6,150", rating: "4.8", revenue: "$21,100" },
            { title: "Fullstack Next.js", students: "2,100", rating: "4.7", revenue: "$5,731" }
          ].map(course => (
            <Card key={course.title} className="p-5 flex flex-col justify-between">
              <div>
                <h3 className="font-semibold text-lg line-clamp-1">{course.title}</h3>
                <div className="mt-4 flex flex-col gap-3">
                  <div className="flex justify-between items-center text-sm">
                     <span className="text-muted-foreground flex items-center gap-2"><Users className="size-4" /> Students</span>
                     <span className="font-medium">{course.students}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                     <span className="text-muted-foreground flex items-center gap-2"><Star className="size-4" /> Rating</span>
                     <span className="font-medium">{course.rating}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                     <span className="text-muted-foreground flex items-center gap-2"><DollarSign className="size-4" /> Revenue</span>
                     <span className="font-medium">{course.revenue}</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex gap-2">
                <Button variant="outline" className="flex-1">Edit Course</Button>
                <Button className="flex-1">View Analytics</Button>
              </div>
            </Card>
          ))}
          
          <Card className="p-5 flex flex-col items-center justify-center text-center gap-3 border-dashed hover:border-primary/50 hover:bg-accent/30 transition-colors cursor-pointer group">
            <div className="rounded-full bg-primary/10 p-4 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
              <BookOpen className="size-6" />
            </div>
            <div>
              <p className="font-medium">Create New Course</p>
              <p className="text-xs text-muted-foreground mt-1">Start building your next hit course</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
