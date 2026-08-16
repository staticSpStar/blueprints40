const SIZE = 440;
const CENTER = SIZE / 2;
const MAX_RADIUS = 150;
const LABEL_RADIUS = MAX_RADIUS + 28;
const LABEL_LINE_HEIGHT = 13;
const RINGS = [0.25, 0.5, 0.75, 1];

const COLOR_SERIES = "#2a78d6";
const COLOR_GRID = "#e1e0d9";
const COLOR_AXIS = "#c3c2b7";
const COLOR_MUTED = "#898781";
const COLOR_PRIMARY = "#0b0b0b";

function toPoint(angleDeg, radius) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.cos(angleRad),
    y: CENTER + radius * Math.sin(angleRad),
  };
}

function polygonPoints(points) {
  return points.map((p) => `${p.x},${p.y}`).join(" ");
}

// 채워진 면적은 반지름의 제곱에 비례하므로, 반지름을 점수 비율에 그대로 비례시키면
// 50%를 넣어도 실제 면적은 25%만 채워져 작아 보인다. 제곱근 스케일을 써서
// "점수 비율 = 채워지는 면적 비율"이 되도록 맞춘다(격자 링도 동일한 스케일 적용).
function scaledRadius(fraction) {
  return Math.sqrt(Math.max(0, Math.min(1, fraction))) * MAX_RADIUS;
}

// 축 라벨이 SVG 영역 밖으로 밀려나 잘리지 않도록 짧은 줄 단위로 감싼다.
function wrapLabel(text, maxChars = 7) {
  const words = text.split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export default function RadarChart({ data }) {
  const n = data.length;
  if (n < 3) return null;

  const step = 360 / n;
  const axisPoints = data.map((_, i) => toPoint(i * step, MAX_RADIUS));
  const dataPoints = data.map((d, i) => {
    const fraction = Math.max(0, Math.min(1, d.score / d.maxScore));
    return toPoint(i * step, scaledRadius(fraction));
  });

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="img"
      aria-label="항목별 점수 방사형 그래프"
      className="w-full max-w-[480px]"
      style={{ overflow: "visible" }}
    >
      {RINGS.map((r) => (
        <polygon
          key={r}
          points={polygonPoints(data.map((_, i) => toPoint(i * step, scaledRadius(r))))}
          fill="none"
          stroke={COLOR_GRID}
          strokeWidth={1}
        />
      ))}

      {axisPoints.map((p, i) => (
        <line
          key={i}
          x1={CENTER}
          y1={CENTER}
          x2={p.x}
          y2={p.y}
          stroke={COLOR_AXIS}
          strokeWidth={1}
        />
      ))}

      <polygon
        points={polygonPoints(dataPoints)}
        fill={COLOR_SERIES}
        fillOpacity={0.18}
        stroke={COLOR_SERIES}
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={4} fill={COLOR_SERIES} stroke="#fff" strokeWidth={1.5} />
      ))}

      {data.map((d, i) => {
        const labelPoint = toPoint(i * step, LABEL_RADIUS);
        const lines = wrapLabel(d.label);
        const firstLineDy = -((lines.length - 1) / 2) * LABEL_LINE_HEIGHT;
        return (
          <text
            key={d.id}
            x={labelPoint.x}
            y={labelPoint.y}
            textAnchor="middle"
            fontSize={11}
            fill={COLOR_MUTED}
          >
            {lines.map((line, li) => (
              <tspan
                key={li}
                x={labelPoint.x}
                dy={li === 0 ? firstLineDy : LABEL_LINE_HEIGHT}
              >
                {line}
              </tspan>
            ))}
          </text>
        );
      })}

      {dataPoints.map((p, i) => {
        const fraction = Math.max(0, Math.min(1, data[i].score / data[i].maxScore));
        const labelPoint = toPoint(i * step, Math.max(0, scaledRadius(fraction) - 14));
        return (
          <text
            key={`value-${data[i].id}`}
            x={labelPoint.x}
            y={labelPoint.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={11}
            fontWeight={600}
            fill={COLOR_PRIMARY}
          >
            {data[i].score}
          </text>
        );
      })}
    </svg>
  );
}
