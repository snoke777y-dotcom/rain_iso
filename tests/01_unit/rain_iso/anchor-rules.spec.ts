import { describe, expect, it } from "vitest";

import {
  AnchorKind,
  AnchorPriority,
  getAnchorPriority,
  isHardAnchorKind,
  resolveAnchorConflict
} from "../../../app/domain/rain_iso/anchor-rules.js";

describe("anchor rules", () => {
  it("所有固定锚点统一优先级，且都高于动态锚点", () => {
    expect(getAnchorPriority(AnchorKind.CoreGuard)).toBe(AnchorPriority.Highest);
    expect(getAnchorPriority(AnchorKind.TongzhouGuard)).toBe(
      AnchorPriority.Highest
    );
    expect(getAnchorPriority(AnchorKind.CrossBorderChannel)).toBe(
      AnchorPriority.Highest
    );
    expect(getAnchorPriority(AnchorKind.DynamicTop30)).toBe(AnchorPriority.Normal);
  });

  it("硬锚点只包含固定锚点和动态锚点", () => {
    expect(isHardAnchorKind(AnchorKind.CoreGuard)).toBe(true);
    expect(isHardAnchorKind(AnchorKind.DynamicTop30)).toBe(true);
    expect(isHardAnchorKind(AnchorKind.OrdinaryStation)).toBe(false);
  });

  it("同格锚点冲突时先比固定/动态优先级，再在同级内取最大值", () => {
    expect(
      resolveAnchorConflict(
        {
          kind: AnchorKind.DynamicTop30,
          stationId: "dyn-1",
          value: 18
        },
        {
          kind: AnchorKind.CrossBorderChannel,
          stationId: "cross-1",
          value: 12
        }
      )
    ).toMatchObject({
      stationId: "cross-1"
    });

    expect(
      resolveAnchorConflict(
        {
          kind: AnchorKind.CoreGuard,
          stationId: "core-1",
          value: 8
        },
        {
          kind: AnchorKind.CrossBorderChannel,
          stationId: "cross-1",
          value: 12
        }
      )
    ).toMatchObject({
      stationId: "cross-1"
    });

    expect(
      resolveAnchorConflict(
        {
          kind: AnchorKind.CoreGuard,
          stationId: "core-1",
          value: 8
        },
        {
          kind: AnchorKind.TongzhouGuard,
          stationId: "tz-1",
          value: 11
        }
      )
    ).toMatchObject({
      stationId: "tz-1"
    });
  });
});
