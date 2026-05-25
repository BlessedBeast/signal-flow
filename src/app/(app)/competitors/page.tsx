import { redirect } from "next/navigation";

/** Legacy route — competitive intel lives in the Product DNA Vault. */
export default function CompetitorsLegacyPage() {
  redirect("/stream/vault?tab=battlecards");
}
