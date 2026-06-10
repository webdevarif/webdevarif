import { ToolShell } from "../_components/tool-shell";
import { MetafieldTool } from "./_components/metafield-tool";

export const metadata = {
  title: "Shopify Metafield Generator — Definition + Liquid · webdevarif",
  description:
    "Pick a resource and content type → get the metafield definition JSON, a GraphQL mutation to create it, and a null-safe Liquid render snippet, all matched.",
};

export default function Page() {
  return (
    <ToolShell
      category="shopify metafields"
      title="Metafield Generator"
      description="define it and render it — pair output for shopify metafields. null-safe liquid, ready-to-paste mutation."
    >
      <MetafieldTool />
    </ToolShell>
  );
}
