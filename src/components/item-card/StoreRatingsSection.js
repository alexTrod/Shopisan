import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import StarIcon from "../../../assets/icons/star-icon";
import { height } from "../../utils/dimension";
import { useTranslation } from '../../utils/useTranslation';

const StoreRatingsSection = ({
  userRating = 0,
  averageRating = 0,
  ratingCount = 0,
  loading = false,
  onRatingPress,
}) => {
  const { t } = useTranslation();

  return (
    <View style={styles.ratingsSection}>
      <Text style={styles.sectionTitle}>{t('ratings')}</Text>

      {/* User Rating */}
      <View style={styles.ratingCard}>
        <Text style={styles.ratingLabel}>{t('your_rating')}</Text>
        <View style={styles.ratingStars}>
          {[...Array(5)].map((_, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => onRatingPress?.(index + 1)}
              disabled={loading}
              style={styles.starButton}
            >
              <StarIcon
                width={height(2.5)}
                height={height(2.5)}
                color={index < userRating ? "#FFD700" : "#E0E0E0"}
                filled={index < userRating}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Community Rating */}
      <View style={styles.ratingCard}>
        <Text style={styles.ratingLabel}>{t('community_rating')}</Text>
        <View style={styles.ratingStars}>
          {[...Array(5)].map((_, index) => (
            <StarIcon
              key={index}
              width={height(2.5)}
              height={height(2.5)}
              color={index < averageRating ? "#FFD700" : "#E0E0E0"}
              filled={index < averageRating}
            />
          ))}
          <Text style={styles.ratingText}>
            {loading
              ? t('updating')
              : `${averageRating.toFixed(1)} (${ratingCount} ${ratingCount === 1 ? t('rating') : t('ratings_plural')})`}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  ratingsSection: {
    marginVertical: 16,
    width: '100%',
  },
  sectionTitle: {
    fontSize: height(2.2),
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  ratingCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  ratingLabel: {
    fontSize: height(1.8),
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  ratingStars: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  starButton: {
    padding: 4,
    marginRight: 2,
  },
  ratingText: {
    marginLeft: 8,
    fontSize: height(1.8),
    color: '#666',
    fontWeight: '500',
  },
});

export default StoreRatingsSection;
