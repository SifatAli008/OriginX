import { redirect } from "next/navigation";

export default function CompanyIndex() {
  // Redirect company root to SME Assign by default
  redirect("/company/sme-assign");
}


