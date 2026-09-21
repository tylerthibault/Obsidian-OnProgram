import {
  WORK_ITEM_STATUSES,
  isWorkItemStatus,
  type WorkItemStatus
} from "../../models/work-item/WorkItemStatus";

export interface BoardStatusPreferences {
  order: WorkItemStatus[];
  visible: WorkItemStatus[];
}

export function defaultBoardStatusPreferences(): BoardStatusPreferences {
  return {
    order: [...WORK_ITEM_STATUSES],
    visible: [...WORK_ITEM_STATUSES]
  };
}

export function parseBoardStatusPreferences(value: unknown): BoardStatusPreferences {
  if (typeof value !== "string" || !value.trim()) return defaultBoardStatusPreferences();

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object") return defaultBoardStatusPreferences();

    const raw = parsed as { order?: unknown; visible?: unknown };
    const parsedOrder = normalizeStatusArray(raw.order);
    const order = [...parsedOrder];

    for (const status of WORK_ITEM_STATUSES) {
      if (!order.includes(status)) order.push(status);
    }

    const parsedVisible = normalizeStatusArray(raw.visible);
    const originalOrder = new Set(parsedOrder);
    const visible = parsedVisible.length > 0 ? [...parsedVisible] : [...WORK_ITEM_STATUSES];

    // Any status introduced after preferences were saved should appear by default.
    for (const status of WORK_ITEM_STATUSES) {
      if (!originalOrder.has(status) && !visible.includes(status)) visible.push(status);
    }

    if (visible.length === 0) visible.push(order[0] ?? "todo");

    return {
      order,
      visible: order.filter((status) => visible.includes(status))
    };
  } catch {
    return defaultBoardStatusPreferences();
  }
}

export function serializeBoardStatusPreferences(preferences: BoardStatusPreferences): string {
  return JSON.stringify({
    order: preferences.order,
    visible: preferences.visible
  });
}

function normalizeStatusArray(value: unknown): WorkItemStatus[] {
  if (!Array.isArray(value)) return [];
  const statuses: WorkItemStatus[] = [];
  for (const candidate of value) {
    if (!isWorkItemStatus(candidate) || statuses.includes(candidate)) continue;
    statuses.push(candidate);
  }
  return statuses;
}
