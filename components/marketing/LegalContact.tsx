import { LEGAL } from "@/lib/legal";

/** "Email … for anything private, or open an issue on GitHub for bugs and ideas." */
export function LegalContact() {
  return (
    <p>
      Email <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> for anything about your account or your data. For bugs and ideas,{" "}
      <a href={LEGAL.issues} rel="noopener noreferrer" target="_blank">
        open an issue on GitHub
      </a>
      ; anything posted there is public.
    </p>
  );
}
