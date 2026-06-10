import { ToolShell } from "../_components/tool-shell";
import { ShadowTool } from "./_components/shadow-tool";

export const metadata = {
  title: "CSS Box Shadow Generator — Multi-Layer · webdevarif",
  description:
    "Stack multiple shadow layers, pick a preset (subtle, soft, neumorphic, glow), and copy the CSS — the way designers actually use box-shadow in 2026.",
};

export default function Page() {
  return (
    <ToolShell
      category="css visual"
      title="Box Shadow Generator"
      description="multi-layer shadows. realistic depth needs 2-4 layers, not one. presets + live preview + copy."
    >
      <ShadowTool />
    </ToolShell>
  );
}
