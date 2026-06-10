import { ToolShell } from "../_components/tool-shell";
import { SchemaTool } from "./_components/schema-tool";

export const metadata = {
  title: "Shopify Section Schema Generator · webdevarif",
  description:
    "Build a Shopify section schema visually — settings, blocks, presets — and copy a valid {% schema %} JSON or a complete section .liquid file.",
};

export default function Page() {
  return (
    <ToolShell
      category="shopify section schema"
      title="Section Schema Generator"
      description="visual builder for shopify section settings, blocks, and presets. no more typo-broken schema tags."
    >
      <SchemaTool />
    </ToolShell>
  );
}
