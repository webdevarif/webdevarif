import Link from "next/link";

import { getClientSettings } from "@kit/database";
import { PageContainer } from "@kit/ui/page-container";
import { PageHeader } from "@kit/ui/page-header";

import { requireUser } from "@/lib/auth/session";
import { isEncryptionConfigured } from "@/lib/crypto";

import { SettingsForm } from "./_components/settings-form";

export const metadata = {
  title: "Client Settings · webdevarif",
};

export default async function ClientSettingsPage() {
  const user = await requireUser();
  const settings = await getClientSettings(user.id);

  return (
    <PageContainer width="form">
      <PageHeader
        eyebrow={
          <Link href="/dashboard/clients" className="hover:text-foreground">
            ← clients
          </Link>
        }
        title="Invoice Settings"
        description="// who the invoice comes from, how it is numbered, and how it gets sent"
      />

      <SettingsForm
        settings={
          settings
            ? {
                businessName: settings.businessName,
                businessEmail: settings.businessEmail,
                businessPhone: settings.businessPhone,
                businessAddress: settings.businessAddress,
                businessWebsite: settings.businessWebsite,
                taxId: settings.taxId,
                defaultCurrency: settings.defaultCurrency,
                invoicePrefix: settings.invoicePrefix,
                nextInvoiceSeq: settings.nextInvoiceSeq,
                defaultDueDays: settings.defaultDueDays,
                defaultTerms: settings.defaultTerms,
                paymentInstructions: settings.paymentInstructions,
                emailProvider: settings.emailProvider,
                emailFromName: settings.emailFromName,
                emailFromEmail: settings.emailFromEmail,
                hasEmailKey: Boolean(settings.emailApiKeyEncrypted),
              }
            : null
        }
        encryptionReady={isEncryptionConfigured()}
      />
    </PageContainer>
  );
}
