import Link from "next/link";
import { auth, signIn, signOut } from "@/auth";
import NavTabs from "./NavTabs";

export default async function Navbar() {
  const session = await auth();

  return (
    <header className="flex items-center justify-between gap-6 border-b border-zinc-200 bg-white px-6 py-3">
      <div className="flex items-center gap-8">
        <Link href="/" className="text-lg font-semibold text-black">
          AIXIS
        </Link>
        <NavTabs />
      </div>

      {session ? (
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
          >
            {session.user?.name ?? session.user?.email} · 로그아웃
          </button>
        </form>
      ) : (
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/upload" });
          }}
        >
          <button
            type="submit"
            className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white"
          >
            Google로 로그인
          </button>
        </form>
      )}
    </header>
  );
}
