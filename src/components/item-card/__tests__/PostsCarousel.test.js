/**
 * PostsCarousel Tests
 *
 * PostsCarousel is what shoppers see inside ItemDetailModal. Sellers can pick
 * a currency per post, so the carousel has to render the post's own currency
 * rather than assuming euros.
 *
 * Run with: npx jest src/components/item-card/__tests__/PostsCarousel.test.js
 */

import React from "react";
import { render } from "@testing-library/react-native";

// Mock utils
jest.mock("../../../utils", () => ({
  AppColors: {
    primary: "#4A2258",
    white: "#FFFFFF",
    black: "#000000",
    grey_200: "#CCCCCC",
    grey_300: "#AAAAAA",
    white_100: "#F7F7F7",
  },
}));
jest.mock("../../../utils/dimension", () => ({
  width: jest.fn((percent) => (percent / 100) * 375),
  height: jest.fn((percent) => (percent / 100) * 812),
}));
jest.mock("../../../utils/useTranslation", () => ({
  useTranslation: () => ({ t: (key) => key, locale: "en" }),
}));

import PostsCarousel from "../PostsCarousel";

describe("PostsCarousel - price display", () => {
  const renderCarousel = (post) =>
    render(
      <PostsCarousel
        posts={[
          {
            id: "post1",
            images: ["https://cdn.example/a.jpg"],
            description: { en: "A nice thing" },
            ...post,
          },
        ]}
      />,
    );

  it("should show a euro price with the euro symbol", () => {
    const { getByText } = renderCarousel({
      price: 20,
      currency: { code: "EUR", symbol: "€" },
    });

    expect(getByText("20 €")).toBeTruthy();
  });

  it("should show a pound price with the pound symbol", () => {
    const { getByText } = renderCarousel({
      price: 20,
      currency: { code: "GBP", symbol: "£" },
    });

    expect(getByText("20 £")).toBeTruthy();
  });

  it("should fall back to euro when the post has no currency", () => {
    const { getByText } = renderCarousel({ price: 20 });

    expect(getByText("20 €")).toBeTruthy();
  });

  it("should keep the currency through post normalization", () => {
    // The carousel rebuilds each post into a normalized shape; currency has
    // to survive that step or the render can never see it.
    const { getByText } = renderCarousel({
      image: "https://cdn.example/legacy.jpg",
      images: undefined,
      price: 15,
      currency: { code: "MAD", symbol: "MAD" },
    });

    expect(getByText("15 MAD")).toBeTruthy();
  });

  it("should render a free post priced at zero", () => {
    const { getByText } = renderCarousel({
      price: 0,
      currency: { code: "EUR", symbol: "€" },
    });

    expect(getByText("0 €")).toBeTruthy();
  });
});
