import { ToolShell } from "../_components/tool-shell";
import { GradientTool } from "./_components/gradient-tool";

export const metadata = {
  title: "CSS Gradient Generator — Linear, Radial, Conic · webdevarif",
  description:
    "Build linear, radial, or conic CSS gradients with stops, presets, and a live preview. Output as CSS, CSS variable, or Tailwind arbitrary value.",
};

export default function Page() {
  return (
    <ToolShell
      category="css visual"
      title="Gradient Generator"
      description="linear · radial · conic. drag stops, copy the css. ships with sunset, aurora, lime glow presets."
    >
      <GradientTool />
    </ToolShell>
  );
}
