"use client";

import * as React from "react";
import { StickyNote, Clock, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAnnounce } from "@/components/providers/live-region-provider";

// Note structure
export interface TimestampNote {
  id: string;
  timeSeconds: number;
  content: string;
}

export function PlayerNotes({
  courseId,
  lessonId,
  lessonTitle,
  currentTime,
  onSeek
}: {
  courseId: string;
  lessonId: string;
  lessonTitle: string;
  currentTime?: number;
  onSeek?: (seconds: number) => void;
}) {
  const announce = useAnnounce();
  const [notes, setNotes] = React.useState<TimestampNote[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`notes-${courseId}-${lessonId}`);
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [newNote, setNewNote] = React.useState("");

  React.useEffect(() => {
    localStorage.setItem(`notes-${courseId}-${lessonId}`, JSON.stringify(notes));
  }, [notes, courseId, lessonId]);

  const addNote = () => {
    if (!newNote.trim()) return;
    const note: TimestampNote = {
      id: `note-${Date.now()}`,
      timeSeconds: currentTime || 0,
      content: newNote
    };
    setNotes(prev => [...prev, note].sort((a, b) => a.timeSeconds - b.timeSeconds));
    setNewNote("");
    announce("Note saved");
  };

  const deleteNote = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    announce("Note deleted");
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={`note-${lessonId}`}
          className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"
        >
          <StickyNote className="size-4 text-primary" />
          Timestamped Notes
        </label>
        <span className="text-caption text-muted-foreground">
          {lessonTitle}
        </span>
      </div>
      
      <div className="mt-3 relative">
        <textarea
          id={`note-${lessonId}`}
          value={newNote}
          onChange={(event) => setNewNote(event.target.value)}
          placeholder="Jot down what you want to remember..."
          rows={3}
          className="w-full resize-y rounded-lg border border-input bg-surface-1 p-3 text-sm leading-relaxed outline-none transition-colors placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-ring"
        />
        <div className="flex justify-between items-center mt-2">
           <span className="text-caption text-muted-foreground flex items-center gap-1">
             {currentTime !== undefined && <><Clock className="size-3"/> at {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, "0")}</>}
           </span>
           <Button size="sm" onClick={addNote} disabled={!newNote.trim()}>Save Note</Button>
        </div>
      </div>

      {notes.length > 0 && (
        <div className="mt-6 flex flex-col gap-3 border-t border-border pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Saved Notes</p>
          {notes.map(note => (
            <div key={note.id} className="group relative rounded-xl border border-border bg-surface-1 p-3 transition-colors hover:border-primary/30">
              <div className="flex items-start justify-between gap-2">
                <button 
                  onClick={() => onSeek && onSeek(note.timeSeconds)}
                  className="flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary transition-colors hover:bg-primary/20"
                >
                  <Clock className="size-3" />
                  {Math.floor(note.timeSeconds / 60)}:{Math.floor(note.timeSeconds % 60).toString().padStart(2, "0")}
                </button>
                <button onClick={() => deleteNote(note.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-danger transition-opacity">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              <p className="mt-2 text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
