import { Hero } from "./_components/hero";
import { SkillsTicker } from "./_components/skills-ticker";
import { About } from "./_components/about";
import { Products } from "./_components/products";
import { GitHubActivity } from "./_components/github-activity";
import { Workflow } from "./_components/workflow";
import { Contact } from "./_components/contact";

export default function PortfolioPage() {
  return (
    <>
      <Hero />
      <SkillsTicker />
      <About />
      <Products />
      <GitHubActivity />
      <Workflow />
      <Contact />
    </>
  );
}
