"use client";

import { Mail, Phone, MapPin } from "lucide-react";
import { PublicPage } from "@/components/layout/PublicPage";
import { useApiQuery } from "@/hooks/useApiQuery";
import { siteContentApi } from "@/lib/api/site-content";

export default function ContactPage() {
  const { data: content } = useApiQuery(() => siteContentApi.get());
  const contact = content?.contact as
    | {
        heading?: string;
        email?: string;
        phone?: string;
        address?: string;
      }
    | undefined;

  return (
    <PublicPage eyebrow="Contact" title="We are here to help you keep moving.">
      <div className="space-y-5">
        <p>{contact?.heading ?? "Get in touch with the X2Factor team."}</p>
        {contact?.email && (
          <p className="flex items-center gap-3 text-ink">
            <Mail className="h-5 w-5 text-primary" />
            {contact.email}
          </p>
        )}
        {contact?.phone && (
          <p className="flex items-center gap-3 text-ink">
            <Phone className="h-5 w-5 text-primary" />
            {contact.phone}
          </p>
        )}
        {contact?.address && (
          <p className="flex items-center gap-3 text-ink">
            <MapPin className="h-5 w-5 text-primary" />
            {contact.address}
          </p>
        )}
      </div>
    </PublicPage>
  );
}
