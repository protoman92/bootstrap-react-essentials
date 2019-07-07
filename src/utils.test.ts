import { mergeQueryMaps, toArray } from "./utils";

describe("Utilities", () => {
  it("Merge query maps should work", async () => {
    // Setup && When
    const merged = mergeQueryMaps(
      { a: ["1", "2", "3"], b: "1", c: "1" },
      { a: ["1", "2", "3"], b: ["2", "3"], c: "1" }
    );

    // Then
    expect(merged).toEqual({
      a: ["1", "2", "3", "1", "2", "3"],
      b: ["1", "2", "3"],
      c: ["1", "1"]
    });
  });

  it("To Array should work", async () => {
    expect(toArray(1)).toEqual([1]);
    expect(toArray([1, 2, 3])).toEqual([1, 2, 3]);
  });
});
