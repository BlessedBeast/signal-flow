import { redirect } from "next/navigation";

/** Legacy Plug Alerts route — radar now auto-feeds the Lead Finder stream. */
export default function LegacyPlugAlertsPage() {
  redirect("/stream/dashboard");
}
