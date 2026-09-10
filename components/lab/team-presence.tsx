"use client";

import * as React from "react";
import { MousePointer2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const MOCK_TEAM = [
  { id: "1", name: "Alice", color: "#f43f5e", avatar: "https://i.pravatar.cc/150?u=a" },
  { id: "2", name: "Bob", color: "#3b82f6", avatar: "https://i.pravatar.cc/150?u=b" },
];

export function TeamPresence({ isEnabled, onToggle }: { isEnabled: boolean; onToggle: (val: boolean) => void }) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center space-x-2">
        <Switch id="team-mode" checked={isEnabled} onCheckedChange={onToggle} />
        <Label htmlFor="team-mode" className="text-xs font-semibold cursor-pointer">
          Co-op Mode
        </Label>
      </div>

      {isEnabled && (
        <div className="flex -space-x-2 overflow-hidden">
          {MOCK_TEAM.map((member) => (
            <Avatar key={member.id} className="inline-block h-6 w-6 rounded-full ring-2 ring-background">
              <AvatarImage src={member.avatar} />
              <AvatarFallback className="text-[9px]">{member.name[0]}</AvatarFallback>
            </Avatar>
          ))}
        </div>
      )}
    </div>
  );
}

export function SharedCursorOverlay({ isEnabled }: { isEnabled: boolean }) {
  const [positions, setPositions] = React.useState<{ id: string; x: number; y: number; name: string; color: string }[]>([]);

  React.useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (!isEnabled) {
      timeout = setTimeout(() => {
        setPositions([]);
      }, 0);
      return () => clearTimeout(timeout);
    }

    const interval = setInterval(() => {
      setPositions(MOCK_TEAM.map((m) => ({
        id: m.id,
        name: m.name,
        color: m.color,
        x: Math.random() * 80 + 10,
        y: Math.random() * 80 + 10,
      })));
    }, 2000);

    return () => clearInterval(interval);
  }, [isEnabled]);

  if (!isEnabled) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-50">
      {positions.map((p) => (
        <div 
          key={p.id} 
          className="absolute transition-all duration-1000 ease-in-out flex items-center"
          style={{ top: `${p.y}%`, left: `${p.x}%` }}
        >
          <MousePointer2 className="h-4 w-4 drop-shadow-md" style={{ color: p.color, fill: p.color }} />
          <div 
            className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold text-white shadow-sm"
            style={{ backgroundColor: p.color }}
          >
            {p.name}
          </div>
        </div>
      ))}
    </div>
  );
}
