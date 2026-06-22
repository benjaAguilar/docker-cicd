import { sum } from "../../src/lib/sum.ts";

describe("Sum function", () => {
  it("should sum two numbers", () => {
    const res = sum(10, 30);

    expect(res).toEqual(40);
  });
});
