import Link from "next/link";
import { auth } from "@/auth";

export default async function Home() {
  const session = await auth();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-white text-center">
      <h1 className="text-3xl font-semibold text-black">AIXIS</h1>
      <p className="max-w-md text-zinc-600">
        외부 AI와 나눈 대화를 업로드하면 과의존 여부를 분석해 드립니다.
      </p>
      <Link
        href={session ? "/upload" : "/login"}
        className="rounded-full bg-black px-6 py-3 text-white"
      >
        {session ? "업로드하러 가기" : "Google로 시작하기"}
      </Link>
    </div>
  );
}