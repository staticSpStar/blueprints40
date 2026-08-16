"use client";

import { useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import RadarChart from "../components/RadarChart";

function noopSubscribe() {
  return () => {};
}

function getServerSnapshot() {
  return null;
}

// sessionStorage는 브라우저에만 존재하므로, 서버 렌더링/최초 hydration 시점에는
// 항상 getServerSnapshot(null)을 쓰고 마운트 이후에만 실제 값으로 갱신한다.
// (그렇지 않으면 서버 HTML과 클라이언트 렌더 결과가 달라져 hydration 오류가 난다.)
function useSessionStorageJSON(key) {
  const raw = useSyncExternalStore(
    noopSubscribe,
    () => sessionStorage.getItem(key),
    getServerSnapshot
  );
  return raw ? JSON.parse(raw) : null;
}

const RISK_COLORS = {
  "안전": { bg: "#e6f6e6", text: "#0ca30c" },
  "조금 위험": { bg: "#fef3da", text: "#a66b00" },
  "위험": { bg: "#fbe6dc", text: "#c85a34" },
  "많이 위험": { bg: "#fbe1e1", text: "#d03b3b" },
};

export default function ResultPage() {
  const router = useRouter();
  const result = useSessionStorageJSON("analysisResult");
  const uploaded = useSessionStorageJSON("uploadedContent");

  if (!result) return <p className="p-8">결과가 없습니다.</p>;

  const riskColor = RISK_COLORS[result.riskLevel] ?? RISK_COLORS["안전"];
  const chartData = result.breakdown.map((item) => ({
    id: `level-${item.level}`,
    label: `${item.level}단계 · ${item.label}`,
    score: item.count,
    maxScore: Math.max(result.unitCount, 1),
  }));

  function handleRetry() {
    sessionStorage.removeItem("analysisResult");
    sessionStorage.removeItem("uploadedContent");
    router.push("/upload");
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl flex-1 grid-cols-1 gap-8 p-8 md:grid-cols-2">
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-black">업로드한 대화</h2>
        <div className="flex-1 overflow-y-auto rounded border border-zinc-200 p-4">
          {uploaded?.text ? (
            <p className="whitespace-pre-wrap text-sm text-zinc-700">{uploaded.text}</p>
          ) : (
            <p className="text-sm text-zinc-400">텍스트 없음</p>
          )}
          {uploaded?.imageDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={uploaded.imageDataUrl}
              alt="업로드한 대화 캡처"
              className="mt-4 w-full rounded border border-zinc-200"
            />
          )}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold text-black">분석 결과</h1>

        <div className="flex items-center gap-3">
          <p className="text-4xl font-bold text-black">{result.totalScore}점 / 100</p>
          <span
            className="rounded-full px-3 py-1 text-sm font-medium"
            style={{ backgroundColor: riskColor.bg, color: riskColor.text }}
          >
            ● {result.riskLevel}
          </span>
        </div>
        <p className="text-sm text-zinc-500">
          분석 단위 수: {result.unitCount}개 (AI의 답변은 제외하고 사용자가 입력한 내용만 분석했습니다)
        </p>

        <div className="flex justify-center">
          <RadarChart data={chartData} />
        </div>

        <ul className="space-y-3">
          {result.breakdown.map((item) => (
            <li key={item.level} className="rounded border border-zinc-200 p-3">
              <div className="flex justify-between font-medium text-black">
                <span>
                  {item.level}단계 · {item.label}
                </span>
                <span>{item.count}개 (가중치 {item.weight})</span>
              </div>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={handleRetry}
          className="self-start rounded-full bg-black px-6 py-3 text-white"
        >
          다시 검사하기
        </button>
      </section>
    </div>
  );
}
