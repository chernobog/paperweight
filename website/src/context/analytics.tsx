import Script from "next/script";
import PlausibleProvider from "next-plausible";
import type { ComponentProps, PropsWithChildren } from "react";
import { SITE_CONFIG } from "@/utils/config";

export function AnalyticsProvider(props: PropsWithChildren) {
  const children = props.children as ComponentProps<
    typeof PlausibleProvider
  >["children"];

  return (
    <>
      <Script
        src={SITE_CONFIG.UMAMI_SCRIPT}
        data-website-id={SITE_CONFIG.UMAMI_WEBSITE_ID}
        data-domains={`www.${SITE_CONFIG.DOMAIN}`}
      />
      <PlausibleProvider
        domain={SITE_CONFIG.DOMAIN}
        trackOutboundLinks={true}
        taggedEvents={true}
      >
        {children}
      </PlausibleProvider>
    </>
  );
}
