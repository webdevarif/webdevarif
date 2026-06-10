"use client";

import { useState, useTransition } from "react";

import { Button } from "@kit/ui/button";
import { Checkbox } from "@kit/ui/checkbox";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { cn } from "@kit/ui/lib/utils";

import type { ProfileData } from "@kit/database/schema";

import { saveProfileAction } from "../_lib/actions";

type Tab =
  | "basics"
  | "summary"
  | "experience"
  | "projects"
  | "skills"
  | "education"
  | "languages"
  | "links";

const TABS: { id: Tab; label: string }[] = [
  { id: "basics", label: "Basics" },
  { id: "summary", label: "Summary angles" },
  { id: "experience", label: "Experience" },
  { id: "projects", label: "Projects" },
  { id: "skills", label: "Skills" },
  { id: "education", label: "Education" },
  { id: "languages", label: "Languages" },
  { id: "links", label: "Links" },
];

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `tmp-${Math.random().toString(36).slice(2)}`;
}

export function ProfileEditor({ initial }: { initial: ProfileData }) {
  const [data, setData] = useState<ProfileData>(initial);
  const [tab, setTab] = useState<Tab>("basics");
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const save = () => {
    setError(null);
    setSaveStatus(null);
    startTransition(async () => {
      const res = await saveProfileAction(data);
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      setSaveStatus(`Saved · ${new Date().toLocaleTimeString()}`);
    });
  };

  return (
    <div className="space-y-6">
      <div className="sticky top-14 z-10 -mx-8 flex items-center justify-between border-b border-border bg-background/80 px-8 py-3 backdrop-blur">
        <div className="flex flex-wrap gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "rounded-md px-2.5 py-1 font-mono text-[0.6875rem] uppercase tracking-wider transition-colors",
                tab === t.id
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {saveStatus ? (
            <span className="text-comment">{`// ${saveStatus}`}</span>
          ) : null}
          {error ? (
            <span className="text-xs text-destructive">{error}</span>
          ) : null}
          <Button onClick={save} disabled={isPending}>
            {isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>

      {tab === "basics" ? <BasicsSection data={data} setData={setData} /> : null}
      {tab === "summary" ? <SummarySection data={data} setData={setData} /> : null}
      {tab === "experience" ? (
        <ExperienceSection data={data} setData={setData} />
      ) : null}
      {tab === "projects" ? (
        <ProjectsSection data={data} setData={setData} />
      ) : null}
      {tab === "skills" ? <SkillsSection data={data} setData={setData} /> : null}
      {tab === "education" ? (
        <EducationSection data={data} setData={setData} />
      ) : null}
      {tab === "languages" ? (
        <LanguagesSection data={data} setData={setData} />
      ) : null}
      {tab === "links" ? <LinksSection data={data} setData={setData} /> : null}
    </div>
  );
}

// ─── Reusable bits ──────────────────────────────────────────────────

type SetData = (updater: (d: ProfileData) => ProfileData) => void;

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-6">
      <p className="text-label">{title}</p>
      {hint ? <p className="text-comment mt-0.5">{`// ${hint}`}</p> : null}
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
  htmlFor,
}: {
  label: string;
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-label">
        {label}
      </Label>
      {children}
    </div>
  );
}

function CardActions({
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onMoveUp}
        title="Move up"
        className="rounded border border-border px-2 py-0.5 font-mono text-[0.625rem] text-muted-foreground hover:border-primary/30 hover:text-primary"
      >
        ↑
      </button>
      <button
        type="button"
        onClick={onMoveDown}
        title="Move down"
        className="rounded border border-border px-2 py-0.5 font-mono text-[0.625rem] text-muted-foreground hover:border-primary/30 hover:text-primary"
      >
        ↓
      </button>
      <button
        type="button"
        onClick={onDelete}
        title="Delete"
        className="rounded border border-destructive/30 px-2 py-0.5 font-mono text-[0.625rem] text-destructive hover:bg-destructive/10"
      >
        Delete
      </button>
    </div>
  );
}

function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [moved] = next.splice(from, 1);
  if (moved !== undefined) next.splice(to, 0, moved);
  return next;
}

function TextArea({
  value,
  onChange,
  rows = 4,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      spellCheck={false}
      autoComplete="off"
      className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm leading-relaxed outline-none focus:border-primary/40"
    />
  );
}

function CSVField({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [text, setText] = useState(value.join(", "));
  return (
    <Input
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        const arr = text
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        onChange(arr);
        setText(arr.join(", "));
      }}
      placeholder={placeholder}
      autoComplete="off"
    />
  );
}

function BulletEditor({
  bullets,
  onChange,
}: {
  bullets: string[];
  onChange: (b: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      {bullets.map((b, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
          <textarea
            value={b}
            onChange={(e) => {
              const next = [...bullets];
              next[i] = e.target.value;
              onChange(next);
            }}
            rows={2}
            spellCheck={false}
            className="w-full resize-y rounded-md border border-border bg-background px-3 py-1.5 text-sm leading-relaxed outline-none focus:border-primary/40"
          />
          <button
            type="button"
            onClick={() => onChange(bullets.filter((_, j) => j !== i))}
            className="mt-1.5 rounded border border-border px-1.5 py-0.5 font-mono text-[0.625rem] text-muted-foreground hover:border-destructive/30 hover:text-destructive"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...bullets, ""])}
        className="rounded-md border border-dashed border-border px-3 py-1.5 font-mono text-[0.625rem] uppercase tracking-wider text-muted-foreground hover:border-primary/30 hover:text-primary"
      >
        + add bullet
      </button>
    </div>
  );
}

// ─── Sections ───────────────────────────────────────────────────────

function BasicsSection({ data, setData }: { data: ProfileData; setData: SetData }) {
  const b = data.basics;
  const update = <K extends keyof ProfileData["basics"]>(
    key: K,
    val: ProfileData["basics"][K],
  ) => setData((d) => ({ ...d, basics: { ...d.basics, [key]: val } }));

  return (
    <Section title="basics" hint="contact info + default title line">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="b-name">
          <Input id="b-name" value={b.name} onChange={(e) => update("name", e.target.value)} autoComplete="off" />
        </Field>
        <Field label="Location" htmlFor="b-location">
          <Input id="b-location" value={b.location} onChange={(e) => update("location", e.target.value)} autoComplete="off" />
        </Field>
        <Field label="Email" htmlFor="b-email">
          <Input id="b-email" type="email" value={b.email} onChange={(e) => update("email", e.target.value)} autoComplete="off" />
        </Field>
        <Field label="Phone" htmlFor="b-phone">
          <Input id="b-phone" value={b.phone} onChange={(e) => update("phone", e.target.value)} autoComplete="off" />
        </Field>
        <Field label="Website" htmlFor="b-website">
          <Input id="b-website" value={b.website} onChange={(e) => update("website", e.target.value)} autoComplete="off" />
        </Field>
        <Field label="LinkedIn" htmlFor="b-linkedin">
          <Input id="b-linkedin" value={b.linkedin} onChange={(e) => update("linkedin", e.target.value)} autoComplete="off" />
        </Field>
        <Field label="GitHub" htmlFor="b-github">
          <Input id="b-github" value={b.github} onChange={(e) => update("github", e.target.value)} autoComplete="off" />
        </Field>
        <Field label="Default title line" htmlFor="b-title">
          <Input id="b-title" value={b.titleLine} onChange={(e) => update("titleLine", e.target.value)} autoComplete="off" />
        </Field>
      </div>
    </Section>
  );
}

function SummarySection({ data, setData }: { data: ProfileData; setData: SetData }) {
  const update = (next: ProfileData["summaryAngles"]) =>
    setData((d) => ({ ...d, summaryAngles: next }));

  return (
    <Section
      title="summary angles"
      hint="multiple summaries the AI can choose from. allowed HTML: <strong>, <span class=&quot;rsm-hl&quot;>"
    >
      {data.summaryAngles.map((a, i) => (
        <div key={a.id} className="space-y-2 rounded-lg border border-border bg-background p-4">
          <div className="flex items-center justify-between gap-2">
            <Input
              value={a.label}
              onChange={(e) => {
                const next = [...data.summaryAngles];
                next[i] = { ...a, label: e.target.value };
                update(next);
              }}
              placeholder="Label (e.g. Shopify-focused)"
              className="max-w-sm"
              autoComplete="off"
            />
            <CardActions
              onDelete={() => update(data.summaryAngles.filter((_, j) => j !== i))}
              onMoveUp={() => update(moveItem(data.summaryAngles, i, i - 1))}
              onMoveDown={() => update(moveItem(data.summaryAngles, i, i + 1))}
            />
          </div>
          <TextArea
            value={a.text}
            onChange={(v) => {
              const next = [...data.summaryAngles];
              next[i] = { ...a, text: v };
              update(next);
            }}
            rows={5}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          update([
            ...data.summaryAngles,
            { id: newId(), label: "New angle", text: "" },
          ])
        }
        className="rounded-md border border-dashed border-border px-3 py-1.5 font-mono text-[0.6875rem] uppercase tracking-wider text-muted-foreground hover:border-primary/30 hover:text-primary"
      >
        + add summary angle
      </button>
    </Section>
  );
}

function ExperienceSection({
  data,
  setData,
}: {
  data: ProfileData;
  setData: SetData;
}) {
  const update = (next: ProfileData["experiences"]) =>
    setData((d) => ({ ...d, experiences: next }));

  return (
    <Section
      title="experiences"
      hint="every job / freelance engagement. AI picks 3-6 most relevant per resume"
    >
      {data.experiences.map((x, i) => (
        <details
          key={x.id}
          className="group rounded-lg border border-border bg-background"
          open={false}
        >
          <summary className="flex cursor-pointer items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {x.role || "(no role)"}{" "}
                <span className="font-normal text-primary">@ {x.company || "—"}</span>
              </p>
              <p className="text-comment mt-0.5">{`// ${x.period} · ${x.tags.length} tags · ${x.bullets.length} bullets`}</p>
            </div>
            <CardActions
              onDelete={() => update(data.experiences.filter((_, j) => j !== i))}
              onMoveUp={() => update(moveItem(data.experiences, i, i - 1))}
              onMoveDown={() => update(moveItem(data.experiences, i, i + 1))}
            />
          </summary>
          <div className="space-y-3 border-t border-border p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Role">
                <Input
                  value={x.role}
                  onChange={(e) => {
                    const next = [...data.experiences];
                    next[i] = { ...x, role: e.target.value };
                    update(next);
                  }}
                  autoComplete="off"
                />
              </Field>
              <Field label="Company">
                <Input
                  value={x.company}
                  onChange={(e) => {
                    const next = [...data.experiences];
                    next[i] = { ...x, company: e.target.value };
                    update(next);
                  }}
                  autoComplete="off"
                />
              </Field>
              <Field label="Period">
                <Input
                  value={x.period}
                  onChange={(e) => {
                    const next = [...data.experiences];
                    next[i] = { ...x, period: e.target.value };
                    update(next);
                  }}
                  placeholder="e.g. Nov 2025 – Present · 7 mos"
                  autoComplete="off"
                />
              </Field>
              <Field label="Location">
                <Input
                  value={x.location}
                  onChange={(e) => {
                    const next = [...data.experiences];
                    next[i] = { ...x, location: e.target.value };
                    update(next);
                  }}
                  autoComplete="off"
                />
              </Field>
              <Field label="Logo URL">
                <Input
                  value={x.logoUrl}
                  onChange={(e) => {
                    const next = [...data.experiences];
                    next[i] = { ...x, logoUrl: e.target.value };
                    update(next);
                  }}
                  placeholder="https://…"
                  autoComplete="off"
                />
              </Field>
              <Field label="Categories (matching tags)">
                <CSVField
                  value={x.categories}
                  onChange={(v) => {
                    const next = [...data.experiences];
                    next[i] = { ...x, categories: v };
                    update(next);
                  }}
                  placeholder="shopify, frontend, remote, us"
                />
              </Field>
            </div>

            <Field label="Bullet pool (AI picks 3-5 per resume)">
              <BulletEditor
                bullets={x.bullets}
                onChange={(b) => {
                  const next = [...data.experiences];
                  next[i] = { ...x, bullets: b };
                  update(next);
                }}
              />
            </Field>

            <Field label="Tag pool (skills used in this role)">
              <CSVField
                value={x.tags}
                onChange={(v) => {
                  const next = [...data.experiences];
                  next[i] = { ...x, tags: v };
                  update(next);
                }}
                placeholder="Shopify CLI, Polaris, Liquid…"
              />
            </Field>
          </div>
        </details>
      ))}
      <button
        type="button"
        onClick={() =>
          update([
            ...data.experiences,
            {
              id: newId(),
              role: "",
              company: "",
              period: "",
              location: "",
              logoUrl: "",
              categories: [],
              bullets: [],
              tags: [],
            },
          ])
        }
        className="rounded-md border border-dashed border-border px-3 py-1.5 font-mono text-[0.6875rem] uppercase tracking-wider text-muted-foreground hover:border-primary/30 hover:text-primary"
      >
        + add experience
      </button>
    </Section>
  );
}

function ProjectsSection({
  data,
  setData,
}: {
  data: ProfileData;
  setData: SetData;
}) {
  const update = (next: ProfileData["featuredProjects"]) =>
    setData((d) => ({ ...d, featuredProjects: next }));

  return (
    <Section
      title="featured projects"
      hint="apps / launched products to feature. AI picks 0-3 per resume"
    >
      {data.featuredProjects.map((p, i) => (
        <details
          key={p.id}
          className="rounded-lg border border-border bg-background"
        >
          <summary className="flex cursor-pointer items-center justify-between gap-3 p-4">
            <p className="text-sm font-semibold text-foreground">
              {p.name || "(unnamed)"}
            </p>
            <CardActions
              onDelete={() => update(data.featuredProjects.filter((_, j) => j !== i))}
              onMoveUp={() => update(moveItem(data.featuredProjects, i, i - 1))}
              onMoveDown={() => update(moveItem(data.featuredProjects, i, i + 1))}
            />
          </summary>
          <div className="space-y-3 border-t border-border p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name">
                <Input
                  value={p.name}
                  onChange={(e) => {
                    const next = [...data.featuredProjects];
                    next[i] = { ...p, name: e.target.value };
                    update(next);
                  }}
                  autoComplete="off"
                />
              </Field>
              <Field label="Link label">
                <Input
                  value={p.linkLabel}
                  onChange={(e) => {
                    const next = [...data.featuredProjects];
                    next[i] = { ...p, linkLabel: e.target.value };
                    update(next);
                  }}
                  placeholder="apps.shopify.com/your-app ↗"
                  autoComplete="off"
                />
              </Field>
              <Field label="Href">
                <Input
                  value={p.href}
                  onChange={(e) => {
                    const next = [...data.featuredProjects];
                    next[i] = { ...p, href: e.target.value };
                    update(next);
                  }}
                  autoComplete="off"
                />
              </Field>
              <Field label="Icon URL">
                <Input
                  value={p.iconUrl}
                  onChange={(e) => {
                    const next = [...data.featuredProjects];
                    next[i] = { ...p, iconUrl: e.target.value };
                    update(next);
                  }}
                  autoComplete="off"
                />
              </Field>
            </div>
            <Field label="Description">
              <TextArea
                value={p.description}
                onChange={(v) => {
                  const next = [...data.featuredProjects];
                  next[i] = { ...p, description: v };
                  update(next);
                }}
                rows={2}
              />
            </Field>
            <Field label="Categories">
              <CSVField
                value={p.categories}
                onChange={(v) => {
                  const next = [...data.featuredProjects];
                  next[i] = { ...p, categories: v };
                  update(next);
                }}
                placeholder="shopify, app, b2b…"
              />
            </Field>
          </div>
        </details>
      ))}
      <button
        type="button"
        onClick={() =>
          update([
            ...data.featuredProjects,
            {
              id: newId(),
              name: "",
              href: "",
              linkLabel: "",
              iconUrl: "",
              description: "",
              categories: [],
            },
          ])
        }
        className="rounded-md border border-dashed border-border px-3 py-1.5 font-mono text-[0.6875rem] uppercase tracking-wider text-muted-foreground hover:border-primary/30 hover:text-primary"
      >
        + add project
      </button>
    </Section>
  );
}

function SkillsSection({
  data,
  setData,
}: {
  data: ProfileData;
  setData: SetData;
}) {
  const update = (next: ProfileData["skills"]) =>
    setData((d) => ({ ...d, skills: next }));

  // Group skills by group label for compact editing.
  const groups = Array.from(new Set(data.skills.map((s) => s.group)));

  return (
    <Section
      title="skills"
      hint="accent skills render as shopify-green chips at the top of the sidebar; rest are grouped"
    >
      {groups.map((g) => (
        <div key={g} className="rounded-lg border border-border bg-background p-4">
          <p className="text-label">{g}</p>
          <div className="mt-3 space-y-2">
            {data.skills
              .filter((s) => s.group === g)
              .map((s) => {
                const realIdx = data.skills.findIndex((x) => x.id === s.id);
                return (
                  <div key={s.id} className="flex items-center gap-2">
                    <Input
                      value={s.name}
                      onChange={(e) => {
                        const next = [...data.skills];
                        next[realIdx] = { ...s, name: e.target.value };
                        update(next);
                      }}
                      placeholder="Skill name"
                      className="max-w-xs"
                      autoComplete="off"
                    />
                    <Input
                      value={s.group}
                      onChange={(e) => {
                        const next = [...data.skills];
                        next[realIdx] = { ...s, group: e.target.value };
                        update(next);
                      }}
                      placeholder="Group"
                      className="max-w-xs"
                      autoComplete="off"
                    />
                    <div className="flex items-center gap-1.5">
                      <Checkbox
                        id={`skill-accent-${s.id}`}
                        checked={s.accent}
                        onCheckedChange={(value) => {
                          const next = [...data.skills];
                          next[realIdx] = {
                            ...s,
                            accent: value === true,
                          };
                          update(next);
                        }}
                      />
                      <Label
                        htmlFor={`skill-accent-${s.id}`}
                        className="text-xs font-normal text-muted-foreground"
                      >
                        Accent
                      </Label>
                    </div>
                    <button
                      type="button"
                      onClick={() => update(data.skills.filter((x) => x.id !== s.id))}
                      className="ml-auto rounded border border-border px-1.5 py-0.5 font-mono text-[0.625rem] text-muted-foreground hover:border-destructive/30 hover:text-destructive"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            update([
              ...data.skills,
              {
                id: newId(),
                name: "",
                group: "Shopify Stack",
                accent: true,
              },
            ])
          }
          className="rounded-md border border-dashed border-border px-3 py-1.5 font-mono text-[0.6875rem] uppercase tracking-wider text-muted-foreground hover:border-primary/30 hover:text-primary"
        >
          + add accent skill
        </button>
        <button
          type="button"
          onClick={() =>
            update([
              ...data.skills,
              {
                id: newId(),
                name: "",
                group: "Frontend",
                accent: false,
              },
            ])
          }
          className="rounded-md border border-dashed border-border px-3 py-1.5 font-mono text-[0.6875rem] uppercase tracking-wider text-muted-foreground hover:border-primary/30 hover:text-primary"
        >
          + add grouped skill
        </button>
      </div>
    </Section>
  );
}

function EducationSection({
  data,
  setData,
}: {
  data: ProfileData;
  setData: SetData;
}) {
  const update = (next: ProfileData["education"]) =>
    setData((d) => ({ ...d, education: next }));

  return (
    <Section title="education">
      {data.education.map((e, i) => (
        <div key={e.id} className="space-y-2 rounded-lg border border-border bg-background p-4">
          <div className="flex justify-end">
            <CardActions
              onDelete={() => update(data.education.filter((_, j) => j !== i))}
              onMoveUp={() => update(moveItem(data.education, i, i - 1))}
              onMoveDown={() => update(moveItem(data.education, i, i + 1))}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="School">
              <Input
                value={e.school}
                onChange={(ev) => {
                  const next = [...data.education];
                  next[i] = { ...e, school: ev.target.value };
                  update(next);
                }}
                autoComplete="off"
              />
            </Field>
            <Field label="Degree">
              <Input
                value={e.degree}
                onChange={(ev) => {
                  const next = [...data.education];
                  next[i] = { ...e, degree: ev.target.value };
                  update(next);
                }}
                autoComplete="off"
              />
            </Field>
            <Field label="Year">
              <Input
                value={e.year}
                onChange={(ev) => {
                  const next = [...data.education];
                  next[i] = { ...e, year: ev.target.value };
                  update(next);
                }}
                autoComplete="off"
              />
            </Field>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          update([
            ...data.education,
            { id: newId(), school: "", degree: "", year: "" },
          ])
        }
        className="rounded-md border border-dashed border-border px-3 py-1.5 font-mono text-[0.6875rem] uppercase tracking-wider text-muted-foreground hover:border-primary/30 hover:text-primary"
      >
        + add education
      </button>
    </Section>
  );
}

function LanguagesSection({
  data,
  setData,
}: {
  data: ProfileData;
  setData: SetData;
}) {
  const update = (next: ProfileData["languages"]) =>
    setData((d) => ({ ...d, languages: next }));

  return (
    <Section title="languages">
      {data.languages.map((l, i) => (
        <div key={l.id} className="flex items-center gap-2">
          <Input
            value={l.name}
            onChange={(e) => {
              const next = [...data.languages];
              next[i] = { ...l, name: e.target.value };
              update(next);
            }}
            placeholder="Language"
            className="max-w-xs"
            autoComplete="off"
          />
          <Input
            value={l.level}
            onChange={(e) => {
              const next = [...data.languages];
              next[i] = { ...l, level: e.target.value };
              update(next);
            }}
            placeholder="Level (Native / Professional / Conversational)"
            className="max-w-xs"
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => update(data.languages.filter((_, j) => j !== i))}
            className="rounded border border-border px-1.5 py-0.5 font-mono text-[0.625rem] text-muted-foreground hover:border-destructive/30 hover:text-destructive"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          update([...data.languages, { id: newId(), name: "", level: "" }])
        }
        className="rounded-md border border-dashed border-border px-3 py-1.5 font-mono text-[0.6875rem] uppercase tracking-wider text-muted-foreground hover:border-primary/30 hover:text-primary"
      >
        + add language
      </button>
    </Section>
  );
}

function LinksSection({
  data,
  setData,
}: {
  data: ProfileData;
  setData: SetData;
}) {
  const update = (next: ProfileData["links"]) =>
    setData((d) => ({ ...d, links: next }));

  return (
    <Section title="online links" hint="shown in the sidebar of every resume">
      {data.links.map((l, i) => (
        <div key={l.id} className="flex items-center gap-2">
          <Input
            value={l.label}
            onChange={(e) => {
              const next = [...data.links];
              next[i] = { ...l, label: e.target.value };
              update(next);
            }}
            placeholder="Display label"
            className="max-w-xs"
            autoComplete="off"
          />
          <Input
            value={l.href}
            onChange={(e) => {
              const next = [...data.links];
              next[i] = { ...l, href: e.target.value };
              update(next);
            }}
            placeholder="https://…"
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => update(data.links.filter((_, j) => j !== i))}
            className="rounded border border-border px-1.5 py-0.5 font-mono text-[0.625rem] text-muted-foreground hover:border-destructive/30 hover:text-destructive"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          update([...data.links, { id: newId(), label: "", href: "" }])
        }
        className="rounded-md border border-dashed border-border px-3 py-1.5 font-mono text-[0.6875rem] uppercase tracking-wider text-muted-foreground hover:border-primary/30 hover:text-primary"
      >
        + add link
      </button>
    </Section>
  );
}
