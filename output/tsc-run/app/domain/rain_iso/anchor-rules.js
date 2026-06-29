export const AnchorKind = {
    CoreGuard: "core_guard",
    TongzhouGuard: "tongzhou_guard",
    CrossBorderChannel: "cross_border_channel",
    DynamicTop30: "dynamic_top30",
    OrdinaryStation: "ordinary_station"
};
export const AnchorPriority = {
    Highest: 3,
    High: 2,
    Normal: 1,
    None: 0
};
const anchorPriorityMap = {
    [AnchorKind.CoreGuard]: AnchorPriority.Highest,
    [AnchorKind.TongzhouGuard]: AnchorPriority.Highest,
    [AnchorKind.CrossBorderChannel]: AnchorPriority.Highest,
    [AnchorKind.DynamicTop30]: AnchorPriority.Normal,
    [AnchorKind.OrdinaryStation]: AnchorPriority.None
};
export function getAnchorPriority(anchorKind) {
    return anchorPriorityMap[anchorKind];
}
export function isHardAnchorKind(anchorKind) {
    return getAnchorPriority(anchorKind) > AnchorPriority.None;
}
export function resolveAnchorConflict(left, right) {
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
