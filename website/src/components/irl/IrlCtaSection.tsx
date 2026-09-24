"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";
import { ActionCard } from "@/components/ActionCard";
import { PayWithCryptoButton } from "@/components/PayWithCrypto";
import { checkoutUrl, getCryptoPayPricing, PLANS } from "@/utils/pricing";

export function IrlCtaSection() {
  return (
    <section id="get-it">
      <ActionCard
        icon={<Sparkles className="h-5 w-5" />}
        title="See the full picture. Take action."
        description="Paperweight is a free, open-source desktop app. Pro adds cleanup, privacy requests, multiple accounts, and MCP access. Choose a year of Pro or a 30-Day Cleanup Pass."
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap mt-2">
          {(["annual", "cleanup"] as const).map((plan) => (
            <div key={plan} className="flex flex-col gap-2">
              <a
                href={checkoutUrl(plan)}
                className="btn btn-primary"
                data-umami-event={`IRL Buy ${PLANS[plan].name}`}
              >
                {PLANS[plan].name} (${PLANS[plan].price}
                {plan === "annual" ? "/year" : " / 30 days"})
              </a>
              <PayWithCryptoButton
                pricing={getCryptoPayPricing(plan)}
                className="btn btn-outline"
                analyticsEvent={`IRL Crypto ${PLANS[plan].name}`}
              >
                Pay with crypto (${PLANS[plan].cryptoPrice})
              </PayWithCryptoButton>
            </div>
          ))}
        </div>
        <p className="text-sm opacity-70">
          Crypto payments are verified manually. Annual crypto access is renewed
          manually.
        </p>
        <Link href="/pricing" className="link">
          View pricing details
        </Link>
      </ActionCard>
    </section>
  );
}
