/**
 * PostCard Tests
 *
 * PostCard is the owner-facing row in manage_posts. Sellers can pick a
 * currency per post, so the row has to render the post's own currency
 * rather than assuming euros.
 *
 * Run with: npx jest src/components/post-card/__tests__/PostCard.test.js
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
    red_100_full: "#FF0000",
  },
}));
jest.mock("../../../utils/dimension", () => ({
  width: jest.fn((percent) => (percent / 100) * 375),
  height: jest.fn((percent) => (percent / 100) * 812),
}));
jest.mock("../../../utils/useTranslation", () => ({
  useTranslation: () => ({ t: (key) => key, locale: "en" }),
}));

// Mock icons
jest.mock("../../../../assets/icons/edit-icon", () => {
  const React = require("react");
  return () => React.createElement("View", { testID: "edit-icon" });
});
jest.mock("../../../../assets/icons/trash-icon", () => {
  const React = require("react");
  return () => React.createElement("View", { testID: "trash-icon" });
});

import PostCard from "../index";

describe("PostCard - price display", () => {
  const renderCard = (post) =>
    render(
      <PostCard
        post={{
          id: "post1",
          images: ["https://cdn.example/a.jpg"],
          description: { en: "A nice thing" },
          ...post,
        }}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
    );

  it("should show a euro price with the euro symbol", () => {
    const { getByText } = renderCard({
      price: 20,
      currency: { code: "EUR", symbol: "€" },
    });

    expect(getByText("20 €")).toBeTruthy();
  });

  it("should show a pound price with the pound symbol", () => {
    // Sellers can pick GBP in the post form; the row must follow.
    const { getByText } = renderCard({
      price: 20,
      currency: { code: "GBP", symbol: "£" },
    });

    expect(getByText("20 £")).toBeTruthy();
  });

  it("should show a franc price with its symbol", () => {
    const { getByText } = renderCard({
      price: 35,
      currency: { code: "CHF", symbol: "CHF" },
    });

    expect(getByText("35 CHF")).toBeTruthy();
  });

  it("should fall back to euro when the post has no currency", () => {
    // Posts created before the currency picker have no currency field.
    const { getByText } = renderCard({ price: 20 });

    expect(getByText("20 €")).toBeTruthy();
  });

  it("should render a free post priced at zero", () => {
    const { getByText } = renderCard({
      price: 0,
      currency: { code: "EUR", symbol: "€" },
    });

    expect(getByText("0 €")).toBeTruthy();
  });

  it("should render no price when the post has none", () => {
    const { queryByText } = renderCard({ price: null });

    expect(queryByText(/€/)).toBeNull();
  });
});
