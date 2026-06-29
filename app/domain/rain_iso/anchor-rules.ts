export const AnchorKind = {
  CoreGuard: "core_guard",
  TongzhouGuard: "tongzhou_guard",
  CrossBorderChannel: "cross_border_channel",
  DynamicTop30: "dynamic_top30",
  OrdinaryStation: "ordinary_station"
} as const;

export type AnchorKind = (typeof AnchorKind)[keyof typeof AnchorKind];

export const AnchorPriority = {
  Highest: 3,
  High: 2,
  Normal: 1,
  None: 0
} as const;

export type AnchorPriority =
  (typeof AnchorPriority)[keyof typeof AnchorPriority];

export type AnchorObservation = {
  kind: AnchorKind;
  stationId: string;
  value: number;
};

const anchorPriorityMap: Record<AnchorKind, AnchorPriority> = {
  [AnchorKind.CoreGuard]: AnchorPriority.Highest,
  [AnchorKind.TongzhouGuard]: AnchorPriority.Highest,
  [AnchorKind.CrossBorderChannel]: AnchorPriority.Highest,
  [AnchorKind.DynamicTop30]: AnchorPriority.Normal,
  [AnchorKind.OrdinaryStation]: AnchorPriority.None
};

export function getAnchorPriority(anchorKind: AnchorKind): AnchorPriority {
  return anchorPriorityMap[anchorKind];
}

export function isHardAnchorKind(anchorKind: AnchorKind): boolean {
  return getAnchorPriority(anchorKind) > AnchorPriority.None;
}

export function resolveAnchorConflict(
  left: AnchorObservation,
  right: AnchorObservation
): AnchorObservation {
  const leftPriority = getAnchorPriority(left.kind);
  const rightPriority = getAnchorPriority(right.kind);

  if (leftPriority > rightPriority) {
    return left;
  }

  if (rightPriority > leftPriority) {
    return right;
  }

  return right.value > left.value ? right : left;
}
