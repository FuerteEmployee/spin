const SIZE = 320;
const C = SIZE / 2;
const R = 146;
const LIGHTS = 18;

function point(angleDeg, radius) {
  const rad = (angleDeg * Math.PI) / 180;
  return [C + radius * Math.sin(rad), C - radius * Math.cos(rad)];
}

function segmentPath(start, end) {
  const [x1, y1] = point(start, R);
  const [x2, y2] = point(end, R);
  const largeArc = end - start > 180 ? 1 : 0;
  return `M ${C} ${C} L ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

// Rotation (degrees) that puts segment `index` under the top pointer
export function restingRotation(index, count) {
  const seg = 360 / count;
  return 360 - (index * seg + seg / 2);
}

// Next rotation: several full turns forward, landing inside the target segment
export function spinTargetRotation(current, index, count) {
  const seg = 360 / count;
  const jitter = (Math.random() - 0.5) * seg * 0.6;
  const base = current - (current % 360);
  return base + 360 * 7 + restingRotation(index, count) + jitter;
}

export default function SpinWheel({ rewards, rotation, spinning, duration, onSpinEnd, onSpinClick, canSpin }) {
  const seg = 360 / rewards.length;

  return (
    <div className={`wheel ${spinning ? 'is-spinning' : ''}`}>
      <svg className="wheel-pointer" viewBox="0 0 40 48" aria-hidden="true">
        <path d="M20 46 L4 10 A16 16 0 1 1 36 10 Z" fill="#fde68a" stroke="#b45309" strokeWidth="2.5" />
        <circle cx="20" cy="16" r="6" fill="#b45309" />
      </svg>

      <svg
        className="wheel-disc"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: spinning ? `transform ${duration}ms cubic-bezier(0.12, 0.75, 0.15, 1)` : 'none',
        }}
        onTransitionEnd={(e) => e.target === e.currentTarget && onSpinEnd()}
        role="img"
        aria-label={`Prize wheel with ${rewards.map((r) => r.label).join(', ')}`}
      >
        {rewards.map((reward, i) => {
          const start = i * seg;
          const center = start + seg / 2;
          const [line1, line2] = reward.wheelLabel.split('\n');
          return (
            <g key={reward.id}>
              <path d={segmentPath(start, start + seg)} fill={reward.color} stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
              <g transform={`rotate(${center} ${C} ${C})`} fill={reward.textColor}>
                <text x={C} y={C - 112} textAnchor="middle" fontSize="24" dominantBaseline="middle">
                  {reward.icon}
                </text>
                <text x={C} y={C - 80} textAnchor="middle" className="wheel-label" fontSize={line1.length > 5 ? 14 : 22}>
                  {line1}
                </text>
                {line2 && (
                  <text x={C} y={C - 62} textAnchor="middle" className="wheel-label" fontSize={line2.length > 5 ? 12 : 14}>
                    {line2}
                  </text>
                )}
              </g>
            </g>
          );
        })}
      </svg>

      <svg className="wheel-rim" viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
        <circle cx={C} cy={C} r={153} fill="none" stroke="url(#rimGold)" strokeWidth="14" />
        <defs>
          <linearGradient id="rimGold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fde68a" />
            <stop offset="0.5" stopColor="#f59e0b" />
            <stop offset="1" stopColor="#b45309" />
          </linearGradient>
        </defs>
        {Array.from({ length: LIGHTS }, (_, i) => {
          const [x, y] = point((360 / LIGHTS) * i, 153);
          return <circle key={i} cx={x} cy={y} r="3.6" className={`rim-light ${i % 2 ? 'odd' : 'even'}`} />;
        })}
      </svg>

      <button className="wheel-hub" type="button" onClick={onSpinClick} disabled={!canSpin} aria-label="Spin the wheel">
        SPIN
      </button>
    </div>
  );
}
