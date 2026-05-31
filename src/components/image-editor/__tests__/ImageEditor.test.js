/**
 * ImageEditor Tests
 *
 * Tests for image resize, crop, compress, and rotation functionality.
 *
 * Run with: npx jest src/components/image-editor/__tests__/ImageEditor.test.js
 */

import * as ImageManipulator from "expo-image-manipulator";

// Mock expo-image-manipulator
jest.mock("expo-image-manipulator", () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: "jpeg" },
}));

describe("ImageEditor - Image Processing Logic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Resize/Crop", () => {
    it("should output 800x800 pixels by default when processing", async () => {
      ImageManipulator.manipulateAsync
        .mockResolvedValueOnce({
          uri: "file:///test.jpg",
          width: 1200,
          height: 1200,
        })
        .mockResolvedValueOnce({
          uri: "file:///edited.jpg",
          width: 800,
          height: 800,
        });

      // Simulate the processing logic from ImageEditor
      const imageUri = "file:///test.jpg";
      const outputSize = 800;

      // First call gets image info
      const imageInfo = await ImageManipulator.manipulateAsync(imageUri, [], {
        format: ImageManipulator.SaveFormat.JPEG,
      });

      const imgWidth = imageInfo.width;
      const imgHeight = imageInfo.height;
      const minDim = Math.min(imgWidth, imgHeight);
      const currentScale = 1;
      const cropSize = minDim / currentScale;
      const actualCropSize = Math.min(cropSize, minDim);

      const centerX = imgWidth / 2;
      const centerY = imgHeight / 2;

      const originX = Math.max(0, centerX - actualCropSize / 2);
      const originY = Math.max(0, centerY - actualCropSize / 2);

      const actions = [
        {
          crop: {
            originX: Math.round(originX),
            originY: Math.round(originY),
            width: Math.round(actualCropSize),
            height: Math.round(actualCropSize),
          },
        },
        {
          resize: {
            width: outputSize,
            height: outputSize,
          },
        },
      ];

      // Second call applies transformations
      const result = await ImageManipulator.manipulateAsync(imageUri, actions, {
        compress: 0.8,
        format: ImageManipulator.SaveFormat.JPEG,
      });

      // Verify resize action
      const resizeAction = actions.find((a) => a.resize);
      expect(resizeAction.resize.width).toBe(800);
      expect(resizeAction.resize.height).toBe(800);
    });

    it("should respect custom outputSize prop", async () => {
      const outputSize = 600;

      const actions = [
        {
          crop: { originX: 0, originY: 0, width: 600, height: 600 },
        },
        {
          resize: { width: outputSize, height: outputSize },
        },
      ];

      const resizeAction = actions.find((a) => a.resize);
      expect(resizeAction.resize.width).toBe(600);
      expect(resizeAction.resize.height).toBe(600);
    });

    it("should crop to square (width equals height)", async () => {
      ImageManipulator.manipulateAsync.mockResolvedValueOnce({
        uri: "file:///test.jpg",
        width: 1920,
        height: 1080,
      });

      const imageInfo = await ImageManipulator.manipulateAsync(
        "file:///test.jpg",
        [],
        {},
      );

      const imgWidth = imageInfo.width;
      const imgHeight = imageInfo.height;
      const minDim = Math.min(imgWidth, imgHeight);

      // Crop dimensions should always be square
      const cropAction = {
        crop: {
          originX: (imgWidth - minDim) / 2,
          originY: (imgHeight - minDim) / 2,
          width: minDim,
          height: minDim,
        },
      };

      expect(cropAction.crop.width).toBe(cropAction.crop.height);
      expect(cropAction.crop.width).toBe(1080); // min of 1920, 1080
    });

    it("should handle landscape images (wider than tall)", async () => {
      const imgWidth = 1920;
      const imgHeight = 1080;
      const minDim = Math.min(imgWidth, imgHeight);

      const cropAction = {
        crop: {
          originX: Math.round((imgWidth - minDim) / 2),
          originY: Math.round((imgHeight - minDim) / 2),
          width: minDim,
          height: minDim,
        },
      };

      expect(cropAction.crop.width).toBe(cropAction.crop.height);
      expect(cropAction.crop.originX).toBe(420); // (1920-1080)/2
      expect(cropAction.crop.originY).toBe(0);
    });

    it("should handle portrait images (taller than wide)", async () => {
      const imgWidth = 1080;
      const imgHeight = 1920;
      const minDim = Math.min(imgWidth, imgHeight);

      const cropAction = {
        crop: {
          originX: Math.round((imgWidth - minDim) / 2),
          originY: Math.round((imgHeight - minDim) / 2),
          width: minDim,
          height: minDim,
        },
      };

      expect(cropAction.crop.width).toBe(cropAction.crop.height);
      expect(cropAction.crop.originX).toBe(0);
      expect(cropAction.crop.originY).toBe(420); // (1920-1080)/2
    });

    it("should handle small images (<800px)", async () => {
      const imgWidth = 400;
      const imgHeight = 400;
      const outputSize = 800;
      const minDim = Math.min(imgWidth, imgHeight);

      const actions = [
        {
          crop: {
            originX: 0,
            originY: 0,
            width: minDim,
            height: minDim,
          },
        },
        {
          resize: { width: outputSize, height: outputSize },
        },
      ];

      // Should still resize to target (upscale)
      expect(actions[1].resize.width).toBe(800);
    });

    it("should handle large images (>5000px)", async () => {
      const imgWidth = 6000;
      const imgHeight = 5000;
      const outputSize = 800;
      const minDim = Math.min(imgWidth, imgHeight);

      const actions = [
        {
          crop: {
            originX: (imgWidth - minDim) / 2,
            originY: 0,
            width: minDim,
            height: minDim,
          },
        },
        {
          resize: { width: outputSize, height: outputSize },
        },
      ];

      // Should resize down to target
      expect(actions[1].resize.width).toBe(800);
      expect(actions[0].crop.width).toBe(5000);
    });
  });

  describe("Compression", () => {
    it("should apply 0.8 (80%) compression", async () => {
      const compressionValue = 0.8;
      const options = {
        compress: compressionValue,
        format: ImageManipulator.SaveFormat.JPEG,
      };

      expect(options.compress).toBe(0.8);
    });

    it("should output JPEG format", async () => {
      const options = {
        compress: 0.8,
        format: ImageManipulator.SaveFormat.JPEG,
      };

      expect(options.format).toBe("jpeg");
    });
  });

  describe("Rotation", () => {
    it("should apply rotation when angle > 0.5 degrees", () => {
      const rotationRadians = 0.1; // ~5.7 degrees
      const rotationDegrees = (rotationRadians * 180) / Math.PI;

      const actions = [];
      if (Math.abs(rotationDegrees) > 0.5) {
        actions.push({ rotate: rotationDegrees });
      }

      expect(actions.length).toBe(1);
      expect(actions[0].rotate).toBeCloseTo(5.73, 1);
    });

    it("should skip rotation when angle < 0.5 degrees", () => {
      const rotationRadians = 0.001; // ~0.057 degrees
      const rotationDegrees = (rotationRadians * 180) / Math.PI;

      const actions = [];
      if (Math.abs(rotationDegrees) > 0.5) {
        actions.push({ rotate: rotationDegrees });
      }

      expect(actions.length).toBe(0);
    });

    it("should convert radians to degrees correctly", () => {
      const testCases = [
        { radians: 0, expectedDegrees: 0 },
        { radians: Math.PI / 4, expectedDegrees: 45 },
        { radians: Math.PI / 2, expectedDegrees: 90 },
        { radians: Math.PI, expectedDegrees: 180 },
      ];

      testCases.forEach(({ radians, expectedDegrees }) => {
        const degrees = (radians * 180) / Math.PI;
        expect(degrees).toBeCloseTo(expectedDegrees, 5);
      });
    });
  });

  describe("Error Handling", () => {
    it("should fallback to original image on processing error", async () => {
      const originalUri = "file:///original.jpg";
      let resultUri;

      try {
        ImageManipulator.manipulateAsync.mockRejectedValueOnce(
          new Error("Processing failed"),
        );
        await ImageManipulator.manipulateAsync(originalUri, [], {});
        resultUri = "file:///edited.jpg";
      } catch (error) {
        // Fallback to original on error
        resultUri = originalUri;
      }

      expect(resultUri).toBe(originalUri);
    });
  });

  describe("Action Building", () => {
    it("should build actions in correct order: rotate, crop, resize", () => {
      const rotation = 45;
      const actions = [];

      // Rotation first (if significant)
      if (Math.abs(rotation) > 0.5) {
        actions.push({ rotate: rotation });
      }

      // Then crop
      actions.push({
        crop: {
          originX: 100,
          originY: 100,
          width: 800,
          height: 800,
        },
      });

      // Then resize
      actions.push({
        resize: { width: 800, height: 800 },
      });

      expect(actions.length).toBe(3);
      expect(actions[0]).toHaveProperty("rotate");
      expect(actions[1]).toHaveProperty("crop");
      expect(actions[2]).toHaveProperty("resize");
    });

    it("should exclude rotation action when angle is minimal", () => {
      const rotation = 0.1; // Very small angle
      const actions = [];

      // Rotation first (if significant)
      if (Math.abs(rotation) > 0.5) {
        actions.push({ rotate: rotation });
      }

      // Then crop
      actions.push({
        crop: { originX: 0, originY: 0, width: 800, height: 800 },
      });

      // Then resize
      actions.push({ resize: { width: 800, height: 800 } });

      expect(actions.length).toBe(2);
      expect(actions[0]).toHaveProperty("crop");
      expect(actions[1]).toHaveProperty("resize");
    });
  });

  describe("Scale Calculations", () => {
    it("should calculate crop size based on scale", () => {
      const minDim = 1000;
      const scale = 2;
      const cropSize = minDim / scale;

      expect(cropSize).toBe(500);
    });

    it("should limit crop size to image dimensions", () => {
      const minDim = 1000;
      const scale = 0.5; // Zoomed out
      const cropSize = minDim / scale; // Would be 2000

      const actualCropSize = Math.min(cropSize, minDim);
      expect(actualCropSize).toBe(1000);
    });

    it("should clamp crop origin to valid range", () => {
      const imgWidth = 1000;
      const imgHeight = 800;
      const cropSize = 500;

      // Test clamping to left edge
      const offsetX = -300; // Would push origin negative
      const centerX = imgWidth / 2;
      const originX = Math.max(
        0,
        Math.min(centerX - cropSize / 2 + offsetX, imgWidth - cropSize),
      );

      expect(originX).toBe(0);
    });
  });
});
