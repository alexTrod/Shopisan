import { StyleSheet } from 'react-native';
import { AppColors } from '../../utils';
import { height, width } from '../../utils/dimension';

export default StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  searchContainer: {
    backgroundColor: AppColors.white,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: AppColors.black,
    paddingVertical: 8,
  },
  loadingIcon: {
    marginLeft: 8,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: AppColors.white,
    borderRadius: 8,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
    maxHeight: 300,
  },
  suggestionItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.grey_300,
  },
  suggestionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  suggestionIcon: {
    marginRight: 12,
  },
  suggestionText: {
    flex: 1,
    fontSize: 16,
    color: AppColors.black,
  },
  suggestionType: {
    fontSize: 12,
    color: AppColors.grey_200,
    fontStyle: 'italic',
  },
});
