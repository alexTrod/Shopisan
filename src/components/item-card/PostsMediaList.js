import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import LinkIcon from "../../../assets/icons/link-icon";
import { AppColors } from "../../utils";
import { height } from "../../utils/dimension";
import { useTranslation } from '../../utils/useTranslation';

const PostsMediaList = ({ media = [] }) => {
  const { t } = useTranslation();

  if (media.length === 0) {
    return null;
  }

  return (
    <View style={styles.postsSection}>
      <Text style={styles.sectionTitle}>{t('posted_announcements')}</Text>
      <View style={styles.postsContainer}>
        {media.map((item, index) => (
          <View key={index} style={styles.postCard}>
            <Text style={styles.postDescription}>
              {item?.description?.en || item?.description?.fr || t('no_post_description')}
            </Text>
            {item?.price !== null && item?.price !== undefined && (
              <View style={styles.priceContainer}>
                <Text style={styles.priceLabel}>{t('price')}</Text>
                <Text style={styles.priceValue}>{item.price} €</Text>
              </View>
            )}
            {item?.description?.en?.match(/(https?:\/\/[^\s]+)/gi) && (
              <TouchableOpacity style={styles.linkContainer}>
                <LinkIcon width={16} height={16} color={AppColors.primary} />
                <Text style={styles.linkText}>
                  {item.description.en.match(/(https?:\/\/[^\s]+)/gi)?.[0]}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  postsSection: {
    marginTop: 24,
    width: '100%',
  },
  sectionTitle: {
    fontSize: height(2.2),
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  postsContainer: {
    width: '100%',
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  postDescription: {
    fontSize: height(1.8),
    color: '#4A4A4A',
    lineHeight: height(2.2),
    marginBottom: 12,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: height(1.6),
    color: '#666',
    marginRight: 8,
    fontWeight: '500',
  },
  priceValue: {
    fontSize: height(1.8),
    fontWeight: '700',
    color: '#007BFF',
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  linkText: {
    fontSize: height(1.6),
    color: '#007BFF',
    marginLeft: 6,
    textDecorationLine: 'underline',
    flex: 1,
  },
});

export default PostsMediaList;
