"use client";

import * as React from "react";
import { MessageSquare, ThumbsUp, CheckCircle, Clock } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";


import { getThreadsForLesson, createThread, replyToThread, toggleUpvoteThread, toggleUpvoteReply } from "@/lib/data/demo/discussions";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export function DiscussionsPanel({ lessonId }: { lessonId: string }) {
  const queryClient = useQueryClient();
  const [newTitle, setNewTitle] = React.useState("");
  const [newContent, setNewContent] = React.useState("");
  const [replyContent, setReplyContent] = React.useState<{ [threadId: string]: string }>({});
  
  const { data: threads, isLoading } = useQuery({
    queryKey: ["discussions", lessonId],
    queryFn: () => getThreadsForLesson(lessonId),
  });

  const createMutation = useMutation({
    mutationFn: () => createThread(lessonId, newTitle, newContent, []),
    onSuccess: () => {
      setNewTitle("");
      setNewContent("");
      queryClient.invalidateQueries({ queryKey: ["discussions", lessonId] });
    }
  });

  const replyMutation = useMutation({
    mutationFn: ({ threadId, content }: { threadId: string, content: string }) => replyToThread(threadId, content),
    onSuccess: (_, variables) => {
      setReplyContent(prev => ({ ...prev, [variables.threadId]: "" }));
      queryClient.invalidateQueries({ queryKey: ["discussions", lessonId] });
    }
  });

  const upvoteThreadMutation = useMutation({
    mutationFn: toggleUpvoteThread,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["discussions", lessonId] })
  });

  const upvoteReplyMutation = useMutation({
    mutationFn: ({ threadId, replyId }: { threadId: string, replyId: string }) => toggleUpvoteReply(threadId, replyId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["discussions", lessonId] })
  });

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><span className="text-sm text-muted-foreground animate-pulse">Loading discussions...</span></div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <MessageSquare className="size-4" /> Start a discussion
        </h3>
        <input 
          type="text"
          placeholder="Title of your question..."
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          className="w-full mb-3 rounded-md border border-input bg-surface-1 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/60"
        />
        <textarea 
          placeholder="What do you need help with?"
          value={newContent}
          onChange={e => setNewContent(e.target.value)}
          rows={3}
          className="w-full mb-3 rounded-md border border-input bg-surface-1 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/60"
        />
        <Button 
          onClick={() => createMutation.mutate()} 
          disabled={!newTitle.trim() || !newContent.trim() || createMutation.isPending}
        >
          {createMutation.isPending ? "Posting..." : "Post Discussion"}
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        {threads?.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No discussions yet. Be the first to ask!</p>
        ) : (
          threads?.map(thread => (
            <div key={thread.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex gap-4">
                <div className="flex flex-col items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                    onClick={() => upvoteThreadMutation.mutate(thread.id)}
                  >
                    <ThumbsUp className="size-4" />
                  </Button>
                  <span className="text-sm font-semibold">{thread.upvotes}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-base">{thread.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Avatar className="size-5">
                          <AvatarImage src={thread.author.avatar_url} />
                          <AvatarFallback>{thread.author.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground font-medium">{thread.author.name}</span>
                        {thread.author.role === "instructor" && <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">Instructor</Badge>}
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="size-3" /> {formatDistanceToNow(new Date(thread.created_at))} ago</span>
                      </div>
                    </div>
                    {thread.is_resolved && <Badge variant="default" className="bg-success text-success-foreground hover:bg-success">Resolved</Badge>}
                  </div>
                  <p className="text-sm mt-3 leading-relaxed text-foreground">{thread.content}</p>
                  
                  {thread.tags.length > 0 && (
                    <div className="flex gap-1.5 mt-3">
                      {thread.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs text-muted-foreground">{tag}</Badge>
                      ))}
                    </div>
                  )}

                  {thread.replies.length > 0 && (
                    <div className="mt-5 pl-4 border-l-2 border-border/50 flex flex-col gap-4">
                      {thread.replies.map(reply => (
                        <div key={reply.id} className="flex gap-3">
                          <Avatar className="size-6 mt-1">
                            <AvatarImage src={reply.author.avatar_url} />
                            <AvatarFallback>{reply.author.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 rounded-xl bg-surface-1 p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold">{reply.author.name}</span>
                                {reply.author.role === "instructor" && <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 bg-primary/10 text-primary border-transparent">Instructor</Badge>}
                                <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(reply.created_at))} ago</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {reply.is_accepted_answer && <span className="flex items-center gap-1 text-xs text-success-strong font-medium"><CheckCircle className="size-3" /> Answer</span>}
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 text-muted-foreground hover:text-primary"
                                  onClick={() => upvoteReplyMutation.mutate({ threadId: thread.id, replyId: reply.id })}
                                >
                                  <ThumbsUp className="size-3" />
                                </Button>
                                <span className="text-xs font-medium">{reply.upvotes}</span>
                              </div>
                            </div>
                            <p className="text-sm mt-2">{reply.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="mt-4 flex gap-2">
                    <input 
                      type="text"
                      placeholder="Write a reply..."
                      value={replyContent[thread.id] || ""}
                      onChange={e => setReplyContent(prev => ({ ...prev, [thread.id]: e.target.value }))}
                      className="flex-1 rounded-md border border-input bg-surface-1 px-3 py-1.5 text-sm outline-none placeholder:text-muted-foreground/60"
                    />
                    <Button 
                      size="sm" 
                      onClick={() => replyMutation.mutate({ threadId: thread.id, content: replyContent[thread.id]! })}
                      disabled={!replyContent[thread.id]?.trim() || replyMutation.isPending}
                    >
                      Reply
                    </Button>
                  </div>

                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
