"use client";

import { API_ENDPOINTS, API_GROUPS } from "@/lib/api/catalog";

import { EndpointCard } from "./endpoint-card";

/**
 * Renders the endpoint reference, grouped by tool. Data-driven from
 * `lib/api/catalog.ts` — new tool APIs appear here automatically.
 */
export function ApiDocs({ baseUrl }: { baseUrl: string }) {
  return (
    <div className="space-y-10">
      {API_GROUPS.map((group) => {
        const endpoints = API_ENDPOINTS.filter((e) => e.group === group);
        return (
          <section key={group} className="space-y-4">
            <h3 className="text-lg font-semibold">{group}</h3>
            <div className="space-y-4">
              {endpoints.map((endpoint) => (
                <EndpointCard
                  key={endpoint.id}
                  endpoint={endpoint}
                  baseUrl={baseUrl}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
