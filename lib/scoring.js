// <알고리즘> / <어휘군> / <점수 산출 방법> / <기준표 점수> 정의를 그대로 구현한다.

export const LEXICON_GROUPS = [
  {
    level: 1,
    weight: 9,
    label: "직접적 결정 위임",
    phrases: [
      "내가 뭘 해야 할지 말해줘",
      "나 어떻게 해야 해",
      "내가 뭘 해야 하지",
      "내가 뭐라고 말해야 해",
      "뭐라고 답해야 해",
      "어떻게 답장해야 해",
      "이거 보내도 될까",
      "이거 보내야 할까",
      "대본을 짜줘",
      "뭐라고 말할지 써줘",
      "이 계획을 네가 짜줄 수 있어",
      "계획 좀 짜줘",
      "네가 결정해줘",
      "네가 골라",
    ],
  },
  {
    level: 2,
    weight: 3,
    label: "판단·승인 의존",
    phrases: [
      "난 너를 믿어",
      "네 판단을 믿어",
      "네가 제일 잘 알잖아",
      "네가 가장 잘 판단할 것 같아",
      "네가 나보다 더 잘 알아",
      "이거 괜찮아",
      "이렇게 해도 괜찮을까",
      "해도 돼",
      "내가 해도 될까",
      "해도 될까",
      "해도 괜찮을까",
      "말해줘",
      "알려줘",
      "너는 어떻게 생각해",
      "네 생각은 어때",
    ],
  },
  {
    level: 3,
    weight: 1,
    label: "일반적 도움 요청",
    phrases: [
      "도와줄 수 있어",
      "좀 도와줘",
      "어떻게 생각해",
      "네 생각은 어때",
      "할까",
      "하는 게 좋을까",
      "이거 괜찮아",
      "이렇게 해도 될까",
    ],
  },
];

export const RISK_BANDS = [
  { min: 0, max: 25, label: "안전" },
  { min: 26, max: 51, label: "조금 위험" },
  { min: 52, max: 77, label: "위험" },
  { min: 78, max: 100, label: "많이 위험" },
];

const CONNECTIVES = [
  "그리고",
  "그래서",
  "근데",
  "그런데",
  "하지만",
  "그러나",
  "또는",
  "혹은",
  "그러면서",
  "아니면",
  "그치만",
  "그리고서",
  "그러다가",
];

// 접속 기능을 하는 말(CONNECTIVES) 또는 부호(,、) 자체도 split 결과에 섞여 나오므로
// 실제 내용 조각만 남기기 위해 걸러낸다.
const CONNECTIVE_SPLIT_REGEX = new RegExp(`(${CONNECTIVES.join("|")}|,|、)`, "g");
const CONNECTIVE_SET = new Set([...CONNECTIVES, ",", "、"]);

// 1. 문장 단위로 나누되, 문장 내 접속 기능을 하는 말/부호를 기준으로 더 잘게 끊는다.
export function splitIntoUnits(text) {
  if (!text) return [];

  const sentences = text
    .split(/[.!?\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const units = [];
  for (const sentence of sentences) {
    const fragments = sentence
      .split(CONNECTIVE_SPLIT_REGEX)
      .map((s) => s.trim())
      .filter((s) => s && !CONNECTIVE_SET.has(s));
    units.push(...fragments);
  }
  return units;
}

const AI_SPEAKER_LABELS = [
  "ai",
  "assistant",
  "어시스턴트",
  "gpt",
  "chatgpt",
  "챗gpt",
  "gemini",
  "제미나이",
  "claude",
  "클로드",
  "봇",
  "bot",
];
const USER_SPEAKER_LABELS = ["나", "사용자", "user", "you", "질문자", "me", "q", "질문"];
AI_SPEAKER_LABELS.push("a", "답변");

function matchSpeakerLabel(line) {
  const match = line.match(/^\s*([^:：]{1,12})[:：]\s*(.*)$/);
  if (!match) return null;
  const label = match[1].trim().toLowerCase();
  if (AI_SPEAKER_LABELS.some((l) => label === l || label.includes(l))) {
    return { speaker: "ai", rest: match[2] };
  }
  if (USER_SPEAKER_LABELS.some((l) => label === l || label.includes(l))) {
    return { speaker: "user", rest: match[2] };
  }
  return null;
}

// "나: ..." / "AI: ..." 처럼 화자가 명시된 줄만 가려서 AI가 남긴 줄은 버리고
// 사용자가 입력한 줄만 남긴다. 라벨이 하나도 없으면 null을 돌려준다(구분할 근거가 없다는 뜻).
// 라벨이 없는 경우의 처리(OpenAI를 이용한 화자 판별)는 API 라우트에서 담당한다 —
// 문단/줄 교대 같은 로컬 휴리스틱은 AI 답변이 소제목·목록으로 여러 문단에 걸치는
// 실제 대화에서 전혀 신뢰할 수 없어 채택하지 않았다.
export function filterUserMessagesByLabel(text) {
  const lines = text.split("\n");
  let sawLabel = false;
  let speaker = "user";
  const kept = [];

  for (const line of lines) {
    const detected = matchSpeakerLabel(line);
    if (detected) {
      sawLabel = true;
      speaker = detected.speaker;
      if (speaker === "user" && detected.rest.trim()) kept.push(detected.rest);
      continue;
    }
    if (speaker === "user" && line.trim()) kept.push(line);
  }

  return sawLabel ? kept.join("\n") : null;
}

// 3. 총점 = (ax + by + cz) * 100 / (a * n)  (a: 가장 큰 가중치)
export function computeScore({ x, y, z, n }) {
  if (n === 0) return 0;
  const [a, b, c] = LEXICON_GROUPS.map((g) => g.weight);
  const raw = ((a * x + b * y + c * z) * 100) / (a * n);
  return Math.round(Math.max(0, Math.min(100, raw)));
}

// 4. 기준표 점수 범위에 해당하는 라벨을 찾는다.
export function classifyScore(score) {
  const band = RISK_BANDS.find((b) => score >= b.min && score <= b.max);
  return band?.label ?? RISK_BANDS[RISK_BANDS.length - 1].label;
}

// 2. 각 어휘군별로 "유사한 구"가 나타난 단위 개수를 센다.
// 이 판단(표현이 달라도 의미가 비슷하면 매칭)은 로컬 규칙으로는 한계가 뚜렷해
// (예: "네가 결정해줘" ≠ "니가 정해줘") API 라우트에서 OpenAI에게 맡기고,
// 여기서는 그 결과(levels: units와 같은 길이의 0/1/2/3 배열)를 받아
// 점수 산출 공식(3, 4단계)만 순수하게 적용한다.
export function buildResult(units, levels) {
  let x = 0;
  let y = 0;
  let z = 0;
  for (const level of levels) {
    if (level === 1) x += 1;
    else if (level === 2) y += 1;
    else if (level === 3) z += 1;
  }

  const n = units.length;
  const totalScore = computeScore({ x, y, z, n });
  const riskLevel = classifyScore(totalScore);

  return {
    totalScore,
    riskLevel,
    unitCount: n,
    breakdown: LEXICON_GROUPS.map((group, i) => ({
      level: group.level,
      label: group.label,
      weight: group.weight,
      count: [x, y, z][i],
    })),
  };
}
