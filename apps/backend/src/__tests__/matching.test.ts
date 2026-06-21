import { describe, it, expect } from "vitest";
import { matchBuy, matchSell } from "../engine/matching";
import { pruneOrderbook } from "../engine/orderbook";

function emptyOrderbook() {
  return {};
}

function orderbookWithOrders(orders: Record<string, { qty: number; reverseOrder?: boolean }[]>) {
  const ob: Record<string, any> = {};
  for (const [price, items] of Object.entries(orders)) {
    ob[price] = {
      availableQty: items.reduce((sum, o) => sum + o.qty, 0),
      orders: items.map((o) => ({
        userId: "maker-1",
        qty: o.qty,
        filledQty: 0,
        originalOrderId: "order-1",
        reverseOrder: o.reverseOrder || false,
      })),
    };
  }
  return ob;
}

describe("matchBuy", () => {
  it("buys YES at price 50, matches against sell YES at 40", () => {
    const yesOB = orderbookWithOrders({ "40": [{ qty: 10 }] });
    const noOB = emptyOrderbook();

    const result = matchBuy("yes", 50, 10, yesOB, noOB);

    expect(result.matchedQty).toBe(10);
    expect(result.leftQty).toBe(0);
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].price).toBe(40);
    expect(result.matches[0].qty).toBe(10);
    expect(result.residual).toBeUndefined();
  });

  it("buys YES at price 50, partial fill at 40, rest becomes reverse NO at 50", () => {
    const yesOB = orderbookWithOrders({ "40": [{ qty: 4 }] });
    const noOB = emptyOrderbook();

    const result = matchBuy("yes", 50, 10, yesOB, noOB);

    expect(result.matchedQty).toBe(4);
    expect(result.leftQty).toBe(6);
    expect(result.residual).not.toBeUndefined();
    expect(result.residual!.side).toBe("no");
    expect(result.residual!.price).toBe(50); // 100 - 50
    expect(result.residual!.qty).toBe(6);
    expect(result.residual!.isReverseOrder).toBe(true);
  });

  it("buys YES at price 50, no matching orders, all becomes reverse NO", () => {
    const yesOB = emptyOrderbook();
    const noOB = emptyOrderbook();

    const result = matchBuy("yes", 50, 10, yesOB, noOB);

    expect(result.matchedQty).toBe(0);
    expect(result.leftQty).toBe(10);
    expect(result.residual).not.toBeUndefined();
    expect(result.residual!.qty).toBe(10);
  });

  it("buys NO at price 30, matches against sell NO at 25", () => {
    const noOB = orderbookWithOrders({ "25": [{ qty: 5 }] });
    const yesOB = emptyOrderbook();

    const result = matchBuy("no", 30, 5, yesOB, noOB);

    expect(result.matchedQty).toBe(5);
    expect(result.leftQty).toBe(0);
  });
});

describe("matchSell", () => {
  it("sells YES at price 40 (buys NO at 60), matches against sell NO at 50", () => {
    const noOB = orderbookWithOrders({ "50": [{ qty: 10 }] });
    const yesOB = emptyOrderbook();

    const result = matchSell("yes", 40, 10, yesOB, noOB);

    expect(result.matchedQty).toBe(10);
    expect(result.residual).toBeUndefined();
    expect(result.matches[0].price).toBe(50);
  });

  it("sells YES at price 40, partial fill, rest becomes direct YES sell at 40", () => {
    const noOB = orderbookWithOrders({ "50": [{ qty: 3 }] });
    const yesOB = emptyOrderbook();

    const result = matchSell("yes", 40, 10, yesOB, noOB);

    expect(result.matchedQty).toBe(3);
    expect(result.leftQty).toBe(7);
    expect(result.residual).not.toBeUndefined();
    expect(result.residual!.side).toBe("yes");
    expect(result.residual!.price).toBe(40);
    expect(result.residual!.qty).toBe(7);
    expect(result.residual!.isReverseOrder).toBe(false);
  });
});

describe("pruneOrderbook", () => {
  it("removes fully-filled orders and empty price levels", () => {
    const ob = orderbookWithOrders({
      "40": [{ qty: 10 }],
      "50": [{ qty: 5 }],
    });

    // Fill the 50 order
    ob["50"].orders[0].filledQty = 5;

    const pruned = pruneOrderbook(ob);
    expect(Object.keys(pruned)).toEqual(["40"]);
    expect(pruned["40"].availableQty).toBe(10);
  });

  it("returns empty object when all orders filled", () => {
    const ob = orderbookWithOrders({ "40": [{ qty: 10 }] });
    ob["40"].orders[0].filledQty = 10;

    const pruned = pruneOrderbook(ob);
    expect(Object.keys(pruned)).toHaveLength(0);
  });

  it("keeps partially filled orders", () => {
    const ob = orderbookWithOrders({ "40": [{ qty: 10 }] });
    ob["40"].orders[0].filledQty = 4;

    const pruned = pruneOrderbook(ob);
    expect(Object.keys(pruned)).toEqual(["40"]);
    expect(pruned["40"].orders[0].filledQty).toBe(4);
  });
});
