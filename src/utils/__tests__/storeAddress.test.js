/**
 * storeAddress Tests
 *
 * The store address is a nested single-element array that used to be built by
 * hand in three screens, which is how streetNumber came to be saved in some
 * paths and lost in others. These tests lock the shape down.
 *
 * Run with: npx jest src/utils/__tests__/storeAddress.test.js
 */

import { buildStoreAddress, readStoreAddress } from "../storeAddress";

describe("buildStoreAddress", () => {
  it("should write the street number alongside the street", () => {
    const address = buildStoreAddress({
      street: "Rue de Test",
      streetNumber: "12",
      city: "Nice",
      postalCode: "06000",
      latitude: 43.7,
      longitude: 7.26,
    });

    expect(address[0].location.address).toEqual({
      street: "Rue de Test",
      streetNumber: "12",
    });
  });

  it("should nest city and geopoint in the stored shape", () => {
    const address = buildStoreAddress({
      street: "Rue de Test",
      streetNumber: "12",
      city: "Nice",
      postalCode: "06000",
      countryId: "FR",
      latitude: 43.7,
      longitude: 7.26,
    });

    expect(address).toHaveLength(1);
    expect(address[0].location.city).toEqual({
      name: "Nice",
      postal_code: "06000",
      country_id: "FR",
    });
    expect(address[0].location.geopoint).toEqual({
      latitude: 43.7,
      longitude: 7.26,
    });
  });

  it("should default the country to FR when not supplied", () => {
    const address = buildStoreAddress({ city: "Nice" });

    expect(address[0].location.city.country_id).toBe("FR");
  });

  it("should honour a non-French country code", () => {
    // add_store geocodes the country; edits must not force it back to FR.
    const address = buildStoreAddress({ city: "Bruges", countryId: "BE" });

    expect(address[0].location.city.country_id).toBe("BE");
  });

  it("should coerce a numeric street number to a string", () => {
    const address = buildStoreAddress({ street: "Rue", streetNumber: 12 });

    expect(address[0].location.address.streetNumber).toBe("12");
  });

  it("should produce empty strings rather than undefined when called bare", () => {
    const address = buildStoreAddress();

    expect(address[0].location.address).toEqual({
      street: "",
      streetNumber: "",
    });
    expect(address[0].location.city.name).toBe("");
  });
});

describe("readStoreAddress", () => {
  const store = {
    address: [
      {
        location: {
          address: { street: "Rue de Test", streetNumber: "12" },
          city: { name: "Nice", postal_code: "06000", country_id: "FR" },
          geopoint: { latitude: 43.7, longitude: 7.26 },
        },
      },
    ],
  };

  it("should read every address field back", () => {
    expect(readStoreAddress(store)).toEqual({
      street: "Rue de Test",
      streetNumber: "12",
      city: "Nice",
      postalCode: "06000",
      countryId: "FR",
      latitude: 43.7,
      longitude: 7.26,
    });
  });

  it("should return an empty street number for legacy stores without one", () => {
    // Stores saved before the street number fix have no such key.
    const legacy = {
      address: [
        {
          location: {
            address: { street: "Rue de Test" },
            city: { name: "Nice", postal_code: "06000" },
          },
        },
      ],
    };

    expect(readStoreAddress(legacy).streetNumber).toBe("");
    expect(readStoreAddress(legacy).street).toBe("Rue de Test");
  });

  it("should not throw on a store with no address array", () => {
    expect(() => readStoreAddress({ name: "Orphan" })).not.toThrow();
    expect(readStoreAddress({ name: "Orphan" }).street).toBe("");
  });

  it("should not throw on null or undefined", () => {
    expect(() => readStoreAddress(null)).not.toThrow();
    expect(() => readStoreAddress(undefined)).not.toThrow();
  });

  it("should leave coordinates undefined rather than defaulting them to zero", () => {
    // A 0/0 fallback would silently place stores in the Atlantic.
    const noCoords = readStoreAddress({ name: "Orphan" });

    expect(noCoords.latitude).toBeUndefined();
    expect(noCoords.longitude).toBeUndefined();
  });
});

describe("round trip", () => {
  it("should preserve the street number through build and read", () => {
    const fields = {
      street: "Rue de Test",
      streetNumber: "12",
      city: "Nice",
      postalCode: "06000",
      countryId: "FR",
      latitude: 43.7,
      longitude: 7.26,
    };

    const stored = { address: buildStoreAddress(fields) };

    expect(readStoreAddress(stored)).toEqual(fields);
  });

  it("should survive an edit that changes only the street number", () => {
    const original = {
      address: buildStoreAddress({
        street: "Rue",
        streetNumber: "1",
        city: "Nice",
      }),
    };
    const edited = {
      address: buildStoreAddress({
        ...readStoreAddress(original),
        streetNumber: "2",
      }),
    };

    expect(readStoreAddress(edited).streetNumber).toBe("2");
    expect(readStoreAddress(edited).street).toBe("Rue");
    expect(readStoreAddress(edited).city).toBe("Nice");
  });
});
