export { auth as proxy } from "@/auth";

export const config = {
  matcher: ["/upload", "/result/:path*", "/api/analyze"],
};
