import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { AppColors } from "../../../../utils";
import { height, width } from "../../../../utils/dimension";

/**
 * Step Indicator Component for multi-step wizards
 *
 * @param {Object} props
 * @param {number} props.currentStep - Current active step (1-based)
 * @param {number} props.totalSteps - Total number of steps
 * @param {string[]} props.labels - Labels for each step
 * @param {Function} props.onStepPress - Called when a completed step is pressed
 */
export const StepIndicator = ({ currentStep, totalSteps, labels = [], onStepPress }) => {
  return (
    <View style={styles.container}>
      <View style={styles.stepsContainer}>
        {Array.from({ length: totalSteps }, (_, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;
          const isLast = stepNumber === totalSteps;
          const isClickable = isCompleted && onStepPress;

          const StepContent = (
            <>
              <View
                style={[
                  styles.stepCircle,
                  isActive && styles.stepCircleActive,
                  isCompleted && styles.stepCircleCompleted,
                ]}
              >
                {isCompleted ? (
                  <Text style={styles.checkmark}>✓</Text>
                ) : (
                  <Text
                    style={[
                      styles.stepNumber,
                      (isActive || isCompleted) && styles.stepNumberActive,
                    ]}
                  >
                    {stepNumber}
                  </Text>
                )}
              </View>
              {labels[index] && (
                <Text
                  style={[
                    styles.stepLabel,
                    isActive && styles.stepLabelActive,
                    isCompleted && styles.stepLabelCompleted,
                  ]}
                >
                  {labels[index]}
                </Text>
              )}
            </>
          );

          return (
            <React.Fragment key={stepNumber}>
              {isClickable ? (
                <TouchableOpacity
                  style={styles.stepWrapper}
                  onPress={() => onStepPress(stepNumber)}
                  activeOpacity={0.7}
                >
                  {StepContent}
                </TouchableOpacity>
              ) : (
                <View style={styles.stepWrapper}>
                  {StepContent}
                </View>
              )}

              {/* Connector line between steps */}
              {!isLast && (
                <View
                  style={[
                    styles.connector,
                    isCompleted && styles.connectorCompleted,
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: height(2),
    paddingHorizontal: width(5),
    backgroundColor: 'transparent',
  },
  stepsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  stepWrapper: {
    alignItems: "center",
  },
  stepCircle: {
    width: height(5),
    height: height(5),
    borderRadius: height(2.5),
    backgroundColor: AppColors.grey_200 || "#e0e0e0",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: AppColors.grey_200 || "#e0e0e0",
  },
  stepCircleActive: {
    backgroundColor: AppColors.white,
    borderColor: AppColors.primary,
  },
  stepCircleCompleted: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  stepNumber: {
    fontSize: height(2),
    fontWeight: "bold",
    color: AppColors.white,
  },
  stepNumberActive: {
    color: AppColors.primary,
  },
  checkmark: {
    fontSize: height(2),
    fontWeight: "bold",
    color: AppColors.white,
  },
  stepLabel: {
    marginTop: height(0.5),
    fontSize: height(1.5),
    color: AppColors.grey_200 || "#999",
    fontWeight: "500",
  },
  stepLabelActive: {
    color: AppColors.primary,
    fontWeight: "bold",
  },
  stepLabelCompleted: {
    color: AppColors.primary,
  },
  connector: {
    width: width(10),
    height: 3,
    backgroundColor: AppColors.grey_200 || "#e0e0e0",
    marginHorizontal: width(2),
    marginBottom: height(2.5), // Align with center of circles
  },
  connectorCompleted: {
    backgroundColor: AppColors.primary,
  },
});

export default StepIndicator;
