import "./ProgressBar.css";

interface ProgressBarProps {
  value: number;
  max: number;
  variant: "colony" | "bonus";
}

export function ProgressBar({ value, max, variant }: ProgressBarProps) {
  const percent = Math.min(100, (value / max) * 100);
  return (
    <div
      className="progress-bar"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={`${variant} progress: ${value} of ${max}`}
    >
      <div
        className={`progress-bar__fill progress-bar__fill--${variant}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
