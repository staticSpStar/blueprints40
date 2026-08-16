import { LEXICON_GROUPS, RISK_BANDS } from "@/lib/scoring";

export default function CriteriaPage() {
  return (
    <div className="mx-auto w-full max-w-2xl p-8">
      <h1 className="text-2xl font-semibold text-black">테스트 기준</h1>
      <p className="mt-2 text-zinc-600">
        업로드한 대화를 문장 단위(접속어·문장부호 기준)로 나눈 뒤, 각 단위가 아래 단계 중
        어디에 해당하는지 세어 점수를 계산합니다. 아래 문구와 표현이 완전히 같지 않아도
        의미·의도가 비슷하면(반말, 구어체 등) 같은 단계로 판단합니다.
      </p>

      <ul className="mt-6 space-y-3">
        {LEXICON_GROUPS.map((g) => (
          <li key={g.level} className="rounded border border-zinc-200 p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium text-black">
                {g.level}단계 · {g.label}
              </span>
              <span className="text-sm text-zinc-500">가중치 {g.weight}</span>
            </div>
            <p className="mt-2 text-sm text-zinc-500">예시: {g.phrases.join(" / ")}</p>
          </li>
        ))}
      </ul>

      <h2 className="mt-8 text-lg font-semibold text-black">점수 산출 방법</h2>
      <p className="mt-2 text-zinc-600">
        전체 단위 수를 n, 단계별로 매칭된 단위 수를 x(1단계) · y(2단계) · z(3단계),
        가중치를 a(3) · b(2) · c(1)이라 할 때:
      </p>
      <p className="mt-2 rounded bg-zinc-100 p-3 font-mono text-sm text-black">
        총점 = (a·x + b·y + c·z) × 100 / (a × n)
      </p>

      <h2 className="mt-8 text-lg font-semibold text-black">기준표</h2>
      <ul className="mt-4 space-y-2">
        {RISK_BANDS.map((b) => (
          <li
            key={b.label}
            className="flex items-center justify-between rounded border border-zinc-200 p-3"
          >
            <span className="font-medium text-black">{b.label}</span>
            <span className="text-sm text-zinc-500">
              {b.min}점 ~ {b.max}점
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
