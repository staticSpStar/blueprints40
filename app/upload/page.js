"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function UploadPage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim() && !file) {
      setError("텍스트 또는 이미지를 하나 이상 입력해 주세요.");
      return;
    }
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("text", text);
    if (file) formData.append("image", file);

    const [res, imageDataUrl] = await Promise.all([
      fetch("/api/analyze", { method: "POST", body: formData }),
      file ? readFileAsDataURL(file) : Promise.resolve(null),
    ]);

    setLoading(false);

    if (!res.ok) {
      setError("분석 중 오류가 발생했습니다.");
      return;
    }

    const result = await res.json();
    sessionStorage.setItem("analysisResult", JSON.stringify(result));
    sessionStorage.setItem("uploadedContent", JSON.stringify({ text, imageDataUrl }));
    router.push("/result");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-8"
    >
      <h1 className="text-2xl font-semibold text-black">대화 내용 업로드</h1>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={
          "AI와 나눈 대화 내용을 붙여넣으세요.\n" +
          "'나:' / 'AI:' 처럼 화자를 표시하면 더 빠르고 정확하게, " +
          "표시가 없어도 자동으로 사용자가 입력한 부분만 가려내 분석해요."
        }
        rows={18}
        className="w-full flex-1 resize-y rounded border border-zinc-300 p-4 text-base leading-relaxed"
      />

      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />

      {error && <p className="text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="rounded-full bg-black px-6 py-3 text-white disabled:opacity-50"
      >
        {loading ? "분석 중..." : "분석하기"}
      </button>
    </form>
  );
}
