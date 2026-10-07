import { expect, test } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchEventStoryCounts, selectStoryEvent } from "../../src/lib/event-story-selection";

const events = [{ id: 11 }, { id: 22 }, { id: 33 }];

test("selects the least covered event, including when all already have stories", () => {
  expect(selectStoryEvent([], new Map())).toBeNull();
  expect(selectStoryEvent([events[0]], new Map([[11, 9]]))).toEqual(events[0]);
  expect(selectStoryEvent(events, new Map([[11, 4], [22, 1], [33, 2]]))).toEqual(events[1]);
  expect(selectStoryEvent(events, new Map([[11, 4], [22, 0], [33, 2]]))).toEqual(events[1]);
});

test("ties and unavailable counts preserve recommendation order", () => {
  expect(selectStoryEvent(events, new Map())).toEqual(events[0]);
  expect(selectStoryEvent(events, new Map([[11, 2], [22, 1], [33, 1]]))).toEqual(events[1]);
});

test("manual choice wins only while it remains recommended", () => {
  const counts = new Map([[11, 4], [22, 1], [33, 2]]);
  expect(selectStoryEvent(events, counts, 33)).toEqual(events[2]);
  expect(selectStoryEvent(events.slice(0, 2), counts, 33)).toEqual(events[1]);
});

test("counts use one deduplicated RPC and handle network or API failure", async () => {
  const calls: unknown[] = [];
  const client = { rpc: async (...args: unknown[]) => {
    calls.push(args);
    return { data: [{ event_id: 11, story_count: 3 }, { event_id: 22, story_count: 0 }], error: null };
  } } as unknown as SupabaseClient;
  expect(await fetchEventStoryCounts(client, [])).toEqual(new Map());
  expect(calls).toHaveLength(0);
  expect(await fetchEventStoryCounts(client, [11, 22, 11])).toEqual(new Map([[11, 3], [22, 0]]));
  expect(calls).toEqual([["get_event_story_counts", { p_event_ids: [11, 22] }]]);
  for (const rpc of [
    async () => ({ data: null, error: { message: "Unavailable" } }),
    async () => { throw new Error("Offline"); },
  ]) {
    expect(await fetchEventStoryCounts({ rpc } as unknown as SupabaseClient, [11])).toEqual(new Map());
  }
});
