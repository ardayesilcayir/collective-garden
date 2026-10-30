"use client";

import { useState, type CSSProperties } from "react";
import { visualLevel } from "@/lib/garden";

const STEM_HEIGHT = [0, 46, 92, 136, 170, 192];
const LEAF_PAIRS = [0, 1, 2, 3, 3, 3];
/** Her seviyenin tepedeki yaprak/tomurcuk/çiçek dahil görünen boyu (svg birimi). */
const VISIBLE_HEIGHT = [0, 61, 100, 142, 198, 235];
const BASE_Y = 268;
/** Su ölçer dolduğunda bitki, bir sonraki aşamaya olan farkın bu kadarını büyür. */
const IN_STAGE_SHARE = 0.5;

function Leaf({ y, side, size }: { y: number; side: 1 | -1; size: number }) {
  return (
    <path
      d="M0 0C14-13 34-12 48 0C34 11 14 12 0 0Z"
      transform={`translate(160 ${y}) scale(${side * size} ${size}) rotate(-24)`}
      fill={side === 1 ? "var(--leaf)" : "var(--leaf-deep)"}
    />
  );
}

/** Bir görsel seviyenin tam boy çizimi (gövde, yapraklar, tomurcuk/çiçek). */
function PlantBody({ level }: { level: number }) {
  const h = STEM_HEIGHT[level];
  const top = BASE_Y - h;
  const pairs = LEAF_PAIRS[level];
  return (
    <>
      <path
        d={`M160 ${BASE_Y}C166 ${BASE_Y - h * 0.4} 154 ${BASE_Y - h * 0.7} 160 ${top}`}
        stroke="var(--leaf-deep)"
        strokeWidth={4 + level * 0.6}
        strokeLinecap="round"
        fill="none"
      />
      {Array.from({ length: pairs }, (_, i) => {
        const y = BASE_Y - h * ((i + 1) / (pairs + 1)) - 4;
        const size = 0.7 + (level / 5) * 0.6 - i * 0.08;
        return (
          <g key={i}>
            <Leaf y={y} side={1} size={size} />
            <Leaf y={y - 12} side={-1} size={size * 0.95} />
          </g>
        );
      })}
      {level === 1 && (
        <>
          <Leaf y={top + 2} side={1} size={0.55} />
          <Leaf y={top + 2} side={-1} size={0.55} />
        </>
      )}
      {level === 4 && (
        <g transform={`translate(160 ${top})`}>
          <path d="M0 4C-10-4-9-20 0-28C9-20 10-4 0 4Z" fill="var(--leaf)" />
          <path d="M0-4C-5-10-4-20 0-24C4-20 5-10 0-4Z" fill="var(--pollen)" opacity="0.85" />
        </g>
      )}
      {level === 5 && (
        <g transform={`translate(160 ${top - 6})`}>
          {Array.from({ length: 8 }, (_, i) => (
            <ellipse
              key={i}
              cx="0"
              cy="-19"
              rx="9"
              ry="18"
              transform={`rotate(${i * 45})`}
              fill="var(--pollen)"
              opacity={i % 2 ? 0.8 : 1}
            />
          ))}
          <circle r="10" fill="var(--leaf-deep)" />
          <circle r="5" fill="var(--pollen)" />
        </g>
      )}
    </>
  );
}

/**
 * Aşamaya ve bu aşamadaki su ilerlemesine göre çizilen bitki.
 * Her sulamada biraz uzar; aşama atlayınca kaldığı boydan yeni boya büyür.
 */
export function PlantArt({
  stage,
  maxStage,
  progress = 0,
  dropKey,
}: {
  stage: number;
  maxStage: number;
  /** Bu aşamadaki su ilerlemesi (0–1). */
  progress?: number;
  /** Değiştiğinde bir su damlası düşer (başarılı sulama). */
  dropKey?: number;
}) {
  const level = visualLevel(stage, maxStage);
  const nextLevel = stage >= maxStage ? level : visualLevel(stage + 1, maxStage);
  const p = Math.max(0, Math.min(1, progress));

  // Tohum aşamasında su varsa küçük bir filiz görünür.
  const drawLevel = level === 0 && p > 0 ? 1 : level;
  let scale = 1;
  if (level === 0) {
    scale = p > 0 ? 0.25 + 0.45 * p : 1;
  } else if (nextLevel > level) {
    const ratio = VISIBLE_HEIGHT[nextLevel] / VISIBLE_HEIGHT[level];
    scale = 1 + p * IN_STAGE_SHARE * (ratio - 1);
  }
  const visibleHeight = VISIBLE_HEIGHT[drawLevel] * scale;

  // Seviye değiştiğinde yeni çizim, önceki görünen boydan başlayarak büyür.
  const [prev, setPrev] = useState({ level: drawLevel, height: visibleHeight, from: scale });
  if (prev.level !== drawLevel) {
    const from = drawLevel > 0 ? prev.height / VISIBLE_HEIGHT[drawLevel] : scale;
    setPrev({ level: drawLevel, height: visibleHeight, from });
  } else if (prev.height !== visibleHeight) {
    setPrev({ ...prev, height: visibleHeight });
  }

  const growStyle = {
    transform: `scale(${scale})`,
    "--grow-from": prev.from,
    "--grow-to": scale,
    // Grup seviye başına yeniden oluşturulduğu için animasyon yalnızca aşama atlarken oynar.
    animation: "grow-in 1100ms cubic-bezier(0.2, 0.8, 0.2, 1)",
  } as CSSProperties;

  return (
    <svg
      viewBox="0 0 320 360"
      className="h-auto w-full"
      role="img"
      aria-label={`Bitki, aşama ${stage}, su %${Math.round(p * 100)}`}
    >
      {dropKey ? (
        <path
          key={`drop-${dropKey}`}
          className="water-drop"
          d="M160 70c-7 10-11 16-11 22a11 11 0 0 0 22 0c0-6-4-12-11-22Z"
          fill="var(--water)"
        />
      ) : null}

      {drawLevel > 0 && (
        <g key={`plant-${drawLevel}`} className="plant-grow" style={growStyle}>
          <PlantBody level={drawLevel} />
        </g>
      )}

      {/* Toprak ve saksı */}
      <ellipse cx="160" cy={BASE_Y + 4} rx="84" ry="12" fill="#5a4636" />
      {level === 0 && (
        <g transform={`translate(160 ${BASE_Y - 2})`}>
          <ellipse rx="9" ry="6" fill="#c9a26b" />
          <path d="M-2-4c2-3 5-4 7-3" stroke="var(--leaf)" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      )}
      <path d="M68 270h184l-20 80H88Z" fill="var(--pot)" />
      <rect x="60" y="262" width="200" height="18" rx="4" fill="var(--pot)" />
      <rect x="60" y="262" width="200" height="5" rx="2" fill="#ffffff" opacity="0.12" />
    </svg>
  );
}
