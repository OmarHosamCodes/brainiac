import type { AlertPlateKind } from "@/features/member-profile/member-profile-alert-plate";

export function AlertPlateGlyph({
  kind,
  ratio,
  className,
}: {
  kind: AlertPlateKind;
  ratio: number | null;
  className?: string;
}) {
  const r = ratio ?? 0.5;

  switch (kind) {
    case "abnormal_day":
      return (
        <svg viewBox="0 0 64 28" className={className} aria-hidden>
          <line
            x1="4"
            y1="10"
            x2="60"
            y2="10"
            className="stroke-current opacity-35"
            strokeWidth="1"
            strokeDasharray="2 2"
          />
          <line
            x1="4"
            y1="16"
            x2="60"
            y2="16"
            className="stroke-current opacity-25"
            strokeWidth="1"
            strokeDasharray="2 2"
          />
          <path
            d={`M4 22 L18 20 L28 ${22 - r * 16} L36 4 L44 ${22 - r * 10} L60 21`}
            fill="none"
            className="stroke-current"
            strokeWidth="1.75"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      );
    case "month_pace":
    case "quarter_pace":
      return (
        <svg viewBox="0 0 64 28" className={className} aria-hidden>
          <rect x="4" y="11" width="56" height="6" rx="1.5" className="fill-current opacity-20" />
          <rect
            x="4"
            y="11"
            width={Math.max(4, 56 * r)}
            height="6"
            rx="1.5"
            className="fill-current"
          />
          <line
            x1={4 + 56 * 0.85}
            y1="7"
            x2={4 + 56 * 0.85}
            y2="21"
            className="stroke-current opacity-55"
            strokeWidth="1"
            strokeDasharray="2 2"
          />
        </svg>
      );
    case "waste_spike": {
      const c = 2 * Math.PI * 9;
      const dash = Math.max(2, c * r);
      return (
        <svg viewBox="0 0 64 28" className={className} aria-hidden>
          <g transform="translate(32 14)">
            <circle
              r="9"
              fill="none"
              className="stroke-current opacity-25"
              strokeWidth="2"
              strokeDasharray="2 2"
            />
            <circle
              r="9"
              fill="none"
              className="stroke-current"
              strokeWidth="2.5"
              strokeDasharray={`${dash} ${c}`}
              strokeLinecap="round"
              transform="rotate(-90)"
            />
          </g>
        </svg>
      );
    }
    case "custom":
      return (
        <svg viewBox="0 0 64 28" className={className} aria-hidden>
          <rect
            x="22"
            y="6"
            width="20"
            height="16"
            rx="2"
            fill="none"
            className="stroke-current"
            strokeWidth="1.5"
          />
          <line
            x1="27"
            y1="11"
            x2="37"
            y2="11"
            className="stroke-current"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <line
            x1="27"
            y1="15"
            x2="35"
            y2="15"
            className="stroke-current opacity-70"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}
