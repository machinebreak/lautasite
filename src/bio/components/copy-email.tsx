import { useState } from "react";

import { site } from "@/config/site";

export function CopyEmail() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(site.email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      window.location.href = `mailto:${site.email}`;
    }
  };

  return (
    <a
      href={`mailto:${site.email}`}
      aria-label={`Copy email address ${site.email}`}
      className="lv-link lv-copy"
      onClick={(e) => {
        e.preventDefault();
        void handleCopy();
      }}
    >
      <span className="lv-nowrap">{site.email}</span>
      <span aria-hidden="true" className="lv-email-fill">
        <span>{site.email}</span>
      </span>
      <span className="lv-sr" aria-live="polite">
        {copied ? "Copied to clipboard" : ""}
      </span>
    </a>
  );
}
