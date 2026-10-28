"use client";

import { STAGE_EMOJIS, STAGE_NAMES, WATER_PER_STAGE } from "@/lib/constants";
import type { GardenData } from "@/lib/garden";

interface PlantDisplayProps {
  garden: GardenData;
}

export default function PlantDisplay({ garden }: PlantDisplayProps) {
  const { stage, water_level, matured } = garden;
  const stageName = STAGE_NAMES[stage] ?? STAGE_NAMES[STAGE_NAMES.length - 1];
  const emoji = STAGE_EMOJIS[stage] ?? "🏆";

  // Su ilerleme çubuğu hesabı
  const stageWaterRequired = (stage + 1) * WATER_PER_STAGE;
  const prevWaterRequired = stage * WATER_PER_STAGE;
  const waterInStage = Math.max(0, water_level - prevWaterRequired);
  const waterNeededForStage = WATER_PER_STAGE;
  const waterProgress = Math.min(100, (waterInStage / waterNeededForStage) * 100);

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Bitki emoji — büyüklüğü aşamaya göre */}
      <div
        className="select-none transition-all duration-700"
        style={{ fontSize: `${6 + stage * 2}rem`, lineHeight: 1 }}
      >
        {emoji}
      </div>

      {/* Aşama adı */}
      <div className="text-center">
        <span className="text-2xl font-bold text-white">{stageName}</span>
        <p className="text-gray-400 text-sm mt-1">
          {matured ? "Bahçe olgunlaştı — hasat zamanı!" : `Aşama ${stage + 1} / 5`}
        </p>
      </div>

      {/* Su seviyesi çubuğu */}
      {!matured && (
        <div className="w-full max-w-sm">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Su seviyesi</span>
            <span>
              {waterInStage}/{waterNeededForStage} sulama
            </span>
          </div>
          <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${waterProgress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1 text-right">
            Toplam sulama: {water_level}
          </p>
        </div>
      )}

      {/* Aşama adımları */}
      <div className="flex gap-2">
        {STAGE_EMOJIS.map((e, i) => (
          <div
            key={i}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-lg border-2 transition-all ${
              i <= stage
                ? "border-emerald-500 bg-emerald-900"
                : "border-gray-700 bg-gray-800 opacity-40"
            }`}
          >
            {e}
          </div>
        ))}
      </div>
    </div>
  );
}

