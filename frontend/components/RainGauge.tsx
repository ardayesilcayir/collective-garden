/** Su seviyesini bir sonraki aşama eşiğine göre gösteren dikey ölçer. */
export function RainGauge({ level, perStage }: { level: number; perStage: number }) {
  const ratio = perStage > 0 ? Math.min(1, level / perStage) : 0;
  const ticks = perStage <= 20 ? perStage : 10;

  return (
    <div className="flex h-full flex-col items-center gap-2">
      <div
        className="relative w-12 flex-1 overflow-hidden rounded-b-2xl rounded-t-md border-2 border-water bg-water-soft"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={perStage}
        aria-valuenow={Math.min(level, perStage)}
        aria-label="Su seviyesi"
      >
        <div
          className="absolute inset-x-0 bottom-0 bg-water transition-[height] duration-700"
          style={{ height: `${ratio * 100}%` }}
        />
        {Array.from({ length: ticks - 1 }, (_, i) => (
          <div
            key={i}
            className="absolute right-0 h-px w-3 bg-ink/40"
            style={{ bottom: `${((i + 1) / ticks) * 100}%` }}
          />
        ))}
      </div>
      <p className="text-center text-sm leading-tight">
        <span className="font-display text-lg font-semibold">{level}</span>
        <span className="text-ink-soft"> / {perStage}</span>
      </p>
    </div>
  );
}
