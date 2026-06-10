"use client";

import { useState } from "react";

import { Button } from "@kit/ui/button";

import type { ProjectHomeCard } from "../_lib/types";
import { ProjectForm } from "./project-form";
import { ProjectsGrid } from "./projects-grid";

export function ProjectsPageClient({
  cards,
}: {
  cards: ProjectHomeCard[];
}) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-label">&mdash; projects &middot; tracking</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Connected Projects
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            One project, three optional modules: visitor analytics, API
            metrics, and uptime health checks.
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="shrink-0">
            + Add Project
          </Button>
        )}
      </header>

      <section className="mt-8 space-y-6">
        {showForm && (
          <ProjectForm
            onCancel={() => setShowForm(false)}
            onSaved={() => setShowForm(false)}
          />
        )}
        <ProjectsGrid cards={cards} />
      </section>
    </div>
  );
}
