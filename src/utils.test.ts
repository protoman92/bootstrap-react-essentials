import { mergeQueryMaps, toArray, createSparseArray } from "./utils";

describe("Utilities", () => {
  it("Create sparse array should work", async () => {
    // Setup && When
    const array1 = createSparseArray(1, 0, 1, 2, 3);
    const array2 = createSparseArray(5, 0, 1, 2, 3);
    const array3 = createSparseArray(5, 2, 1, 2);

    // Then
    expect(array1).toEqual([1, 2, 3]);
    expect(array2).toEqual([1, 2, 3, undefined, undefined]);
    expect(array3).toEqual([undefined, undefined, 1, 2, undefined]);
  });

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
