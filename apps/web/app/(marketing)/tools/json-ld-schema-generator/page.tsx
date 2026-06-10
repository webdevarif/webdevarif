import { ToolShell } from "../_components/tool-shell";
import { JsonLdTool } from "./_components/jsonld-tool";

export const metadata = {
  title: "JSON-LD Schema Generator — Liquid-aware · webdevarif",
  description:
    "Generate Product, Organization, FAQ, and Breadcrumb structured data with a Liquid bindings toggle so you can paste straight into Shopify templates.",
};

export default function Page() {
  return (
    <ToolShell
      category="seo · structured data"
      title="JSON-LD Schema Generator"
      description="product · organization · faq · breadcrumb. liquid-aware toggle outputs ready-to-paste shopify bindings."
    >
      <JsonLdTool />
    </ToolShell>
  );
}
