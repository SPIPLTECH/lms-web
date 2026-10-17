import { redirect } from "next/navigation";

// Course browsing, purchase and sign-up live on the main Orange Tree site;
// this app is only where enrolled users sign in and learn. "/" therefore goes
// straight to the login page (a signed-in visitor is forwarded on from there
// to their own home by AuthContext).
export default function Home() {
  redirect("/login");
}
