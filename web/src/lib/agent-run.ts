import { getDictionary } from "@/i18n/dictionary";
import { getLocale } from "@/i18n/get-locale";
import { formatTickEvent, pipelineStage, tickStatus } from "./tick-log";
import type { FormattedTickEvent, PipelineStep } from "./tick-log";
import { listAgentTicks, nextScheduledWake, titlesForTickLinks } from "./queries";
import { activeKeyMeta } from "./agent-admin";

export type RunEventDto = {
  id: string;
  at: string;
  step: string;
  title: string;
  lines: string[];
  extra: string | null;
  tone: FormattedTickEvent["tone"];
  links: { href: string; label: string }[];
};

export type RunTickDto = {
  id: string;
  source: string;
  runAt: string;
  lockedAt: string | null;
  doneAt: string | null;
  error: string | null;
  summary: string | null;
  contributions: number | null;
  status: string;
  stage: PipelineStep;
  events: RunEventDto[];
};

export type AgentRunView = {
  nextWake: string | null;
  hasSecret: boolean;
  tokenPrefix: string | null;
  ticks: RunTickDto[];
  running: boolean;
};

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

export async function loadAgentRunView(agentId: string): Promise<AgentRunView> {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const [ticks, next, key] = await Promise.all([
    listAgentTicks(agentId, 10),
    nextScheduledWake(agentId),
    activeKeyMeta(agentId),
  ]);
  const threadIds: string[] = [];
  const postIds: string[] = [];
  for (const tick of ticks) {
    for (const event of tick.events) {
      threadIds.push(...asStringList(event.detail.opened));
      threadIds.push(...asStringList(event.detail.ids));
      postIds.push(...asStringList(event.detail.postIds));
    }
  }
  const lookup = await titlesForTickLinks({ threadIds, postIds });
  return {
    nextWake: next?.runAt.toISOString() ?? null,
    hasSecret: key.hasSecret,
    tokenPrefix: key.tokenPrefix,
    running: ticks.some((tick) => !tick.doneAt && tick.lockedAt),
    ticks: ticks.map((tick) => {
      const events = tick.events.map((event) => {
        const formatted = formatTickEvent(event, lookup, locale);
        return {
          id: formatted.id,
          at: formatted.at.toISOString(),
          step: formatted.step,
          title: formatted.title,
          lines: formatted.lines,
          extra: formatted.extra,
          tone: formatted.tone,
          links: formatted.links,
        };
      });
      return {
        id: tick.id,
        source:
          tick.payload.source === "scheduled"
            ? dict.admin.sourceScheduled
            : dict.admin.sourceManual,
        runAt: tick.runAt.toISOString(),
        lockedAt: tick.lockedAt?.toISOString() ?? null,
        doneAt: tick.doneAt?.toISOString() ?? null,
        error: tick.error,
        summary: tick.result?.summary ?? null,
        contributions: tick.result?.contributions ?? null,
        status: tickStatus(tick, locale),
        stage: pipelineStage(tick),
        events,
      };
    }),
  };
}
