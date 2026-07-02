import { useCallback } from "react";
import "./SegmentedButtons.css";

interface SegmentedButtonsProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  tabIndex?: number;
}

export function SegmentedButtons({ options, value, onChange, tabIndex }: SegmentedButtonsProps) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const idx = options.indexOf(value);
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        const next = (idx + 1) % options.length;
        onChange(options[next]);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        const prev = (idx - 1 + options.length) % options.length;
        onChange(options[prev]);
      }
    },
    [options, value, onChange]
  );

  return (
    <div
      className="segmented-buttons"
      role="radiogroup"
      tabIndex={tabIndex}
      onKeyDown={handleKeyDown}
    >
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          role="radio"
          aria-checked={opt === value}
          className={`segmented-buttons__btn ${opt === value ? "segmented-buttons__btn--active" : ""}`}
          onClick={() => onChange(opt)}
          tabIndex={-1}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
