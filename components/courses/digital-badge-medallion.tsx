"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface DigitalBadgeMedallionProps {
  category: string;
  level: string;
  credentialId?: string;
  issuer?: string;
  className?: string;
  showShadow?: boolean;
}

/**
 * Enterprise Credly & Zapsters Enterprise Standard-compatible
 * Hexagonal Digital Badge Medallion in Zapsters Dark Neon Amber theme.
 *
 * Implements mathematically precise hexagonal geometry without text-border collisions,
 * arched path typography, multi-stage metallic amber bezels, and cybernetic core lighting.
 */
export function DigitalBadgeMedallion({
  category,
  level = "Foundational",
  credentialId: _credentialId,
  issuer = "Zapsters",
  className,
  showShadow = true,
}: DigitalBadgeMedallionProps) {
  const uniqueId = React.useId().replace(/:/g, "_");
  const topCurveId = `topCurve_${uniqueId}`;
  const bottomCurveId = `bottomCurve_${uniqueId}`;
  const bezelGradId = `bezelGrad_${uniqueId}`;
  const coreGradId = `coreGrad_${uniqueId}`;
  const goldGradId = `goldGrad_${uniqueId}`;
  const glowGradId = `glowGrad_${uniqueId}`;
  const pillGradId = `pillGrad_${uniqueId}`;

  const cleanCategory = (category || "Cybersecurity").trim();
  const cleanLevel = (level || "Foundational").trim();

  // Normalize header text so it never overflows the top arched geometry
  const headerText = React.useMemo(() => {
    const raw = (issuer || "Zapsters").trim().toUpperCase();
    if (raw.includes("ZAPSTER")) {
      return "ZAPSTERS · CREDENTIAL";
    }
    return raw.length > 18 ? `${raw.slice(0, 16)}… · SKILL` : `${raw} · SKILL`;
  }, [issuer]);

  return (
    <div
      className={cn(
        "relative flex items-center justify-center select-none",
        className
      )}
    >
      <svg
        viewBox="0 0 220 250"
        className={cn(
          "w-full h-full",
          showShadow && "drop-shadow-[0_12px_28px_rgba(245,158,11,0.32)]"
        )}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Outer Metallic Amber / Gold Bezel */}
          <linearGradient id={bezelGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="25%" stopColor="#F59E0B" />
            <stop offset="60%" stopColor="#D97706" />
            <stop offset="100%" stopColor="#92400E" />
          </linearGradient>

          {/* Deep Obsidian Core with Radial Ambience */}
          <radialGradient id={coreGradId} cx="50%" cy="45%" r="65%">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="45%" stopColor="#0F172A" />
            <stop offset="85%" stopColor="#090D16" />
            <stop offset="100%" stopColor="#020617" />
          </radialGradient>

          {/* Golden Highlight Gradient for Stars & Rings */}
          <linearGradient id={goldGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>

          {/* Glowing Ambient Halo behind central emblem */}
          <radialGradient id={glowGradId} cx="50%" cy="42%" r="50%">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.35" />
            <stop offset="60%" stopColor="#D97706" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </radialGradient>

          {/* Level Pill Gradient */}
          <linearGradient id={pillGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D97706" />
            <stop offset="50%" stopColor="#B45309" />
            <stop offset="100%" stopColor="#78350F" />
          </linearGradient>

          {/* Top Arched Path for Issuer / Organization */}
          <path
            id={topCurveId}
            d="M 38,72 Q 110,32 182,72"
            fill="none"
          />

          {/* Bottom Arched Path for Verification Label */}
          <path
            id={bottomCurveId}
            d="M 50,174 Q 110,208 170,174"
            fill="none"
          />
        </defs>

        {/* 1. Outer Hexagon Base (Metallic Bevel) */}
        <polygon
          points="110,8 206,63 206,177 110,232 14,177 14,63"
          fill={`url(#${bezelGradId})`}
          stroke="#FDE68A"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* 2. Inner Hexagon Inset Bevel (Dark Obsidian Core) */}
        <polygon
          points="110,16 198,67 198,173 110,224 22,173 22,67"
          fill={`url(#${coreGradId})`}
          stroke="#78350F"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />

        {/* 3. Decorative Cyber Hairline (Golden accent rim) */}
        <polygon
          points="110,23 190,71 190,169 110,217 30,169 30,71"
          fill="none"
          stroke="#F59E0B"
          strokeWidth="0.8"
          strokeOpacity="0.45"
          strokeDasharray="4 2"
          strokeLinejoin="round"
        />

        {/* 4. Ambient Core Glow */}
        <circle cx="110" cy="106" r="48" fill={`url(#${glowGradId})`} />

        {/* 5. Top Curved Arched Header */}
        <text
          fill="#FDE68A"
          fontSize="8.5"
          fontWeight="800"
          letterSpacing="2.2"
          style={{ textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}
        >
          <textPath href={`#${topCurveId}`} startOffset="50%" textAnchor="middle">
            {headerText}
          </textPath>
        </text>

        {/* 6. Central Emblem Medallion */}
        <g transform="translate(110, 104)">
          {/* Outer Ring with Cyber Ticks */}
          <circle
            cx="0"
            cy="0"
            r="30"
            fill="#090D16"
            stroke="#F59E0B"
            strokeWidth="1.5"
          />
          <circle
            cx="0"
            cy="0"
            r="26"
            fill="none"
            stroke="#D97706"
            strokeWidth="0.75"
            strokeDasharray="3 2"
            strokeOpacity="0.6"
          />

          {/* Multi-faceted 3D Zapsters Star & Shield */}
          <path
            d="M0,-18 L4.5,-5.5 L18,-4.5 L8,3.5 L11,16 L0,9 L-11,16 L-8,3.5 L-18,-4.5 L-4.5,-5.5 Z"
            fill={`url(#${goldGradId})`}
            stroke="#FEF08A"
            strokeWidth="0.75"
            strokeLinejoin="round"
            style={{ filter: "drop-shadow(0 2px 6px rgba(245,158,11,0.5))" }}
          />

          {/* Central Highlight Spark */}
          <circle cx="0" cy="0" r="3" fill="#FFFFFF" opacity="0.9" />
        </g>

        {/* 7. Category Label */}
        <text
          x="110"
          y="150"
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="11"
          fontWeight="800"
          letterSpacing="0.8"
          style={{
            textShadow: "0 2px 6px rgba(0,0,0,0.9)",
            fontFamily: "var(--font-sans, system-ui, sans-serif)",
          }}
        >
          {cleanCategory.toUpperCase()}
        </text>

        {/* 8. Level Pill */}
        <g transform="translate(110, 170)">
          <rect
            x="-52"
            y="-10"
            width="104"
            height="20"
            rx="10"
            fill={`url(#${pillGradId})`}
            stroke="#FDE68A"
            strokeWidth="1"
            style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.6))" }}
          />
          <text
            x="0"
            y="3.5"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="9"
            fontWeight="800"
            letterSpacing="1.6"
            style={{
              textShadow: "0 1px 3px rgba(0,0,0,0.8)",
              fontFamily: "var(--font-mono, monospace)",
            }}
          >
            {cleanLevel.toUpperCase()}
          </text>
        </g>

        {/* 9. Bottom Curved Arched Verification Label */}
        <text
          fill="#F59E0B"
          fontSize="7.5"
          fontWeight="700"
          letterSpacing="1.8"
          opacity="0.95"
          style={{ textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}
        >
          <textPath href={`#${bottomCurveId}`} startOffset="50%" textAnchor="middle">
            VERIFIED CREDENTIAL
          </textPath>
        </text>
      </svg>
    </div>
  );
}
