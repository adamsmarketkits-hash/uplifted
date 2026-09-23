import { redirect } from "next/navigation";
import { getFamilyCookie, getSession } from "@/lib/session";

export default async function HomePage() {
  const session = await getSession();
  if (session) redirect("/today");
  const family = await getFamilyCookie();
  if (family) redirect("/login");
  redirect("/welcome");
}
