import { signIn } from "@/auth";

export default function LoginPage() {
  return (
    <form
      action={async () => {
        "use server";
        await signIn("google", { redirectTo: "/upload" });
      }}
      className="flex flex-1 items-center justify-center bg-white"
    >
      <button
        type="submit"
        className="rounded-full bg-black px-6 py-3 text-white"
      >
        Google로 로그인
      </button>
    </form>
  );
}