import React, { useState, useEffect } from 'react';
import { View, FlatList } from 'react-native';
import { firestore } from '../../../../firebaseconfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useSelector } from 'react-redux';
import CustomText from '../../../components/text';
import { AppColors } from '../../../utils';
import Button from '../../../components/button';
import { StyleSheet } from 'react-native';
import { height, width } from '../../../utils/dimension';
const StoreManagement = ({ navigation }) => {
  const [stores, setStores] = useState([]);
  const user = useSelector(state => state?.Auth?.user);

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    try {
      const storesRef = collection(firestore, 'stores');
      const q = query(storesRef, where('merchantId', '==', user.email));
      const querySnapshot = await getDocs(q);
      
      const storesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setStores(storesData);
    } catch (error) {
      console.error('Error loading stores:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Button
        onPress={() => navigation.navigate('AddStore')}
        containerStyle={styles.addButton}
      >
        Add New Store
      </Button>

      <FlatList
        data={stores}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.storeCard}
            onPress={() => navigation.navigate('StoreDetails', { store: item })}
          >
            <CustomText
              color={AppColors.black}
              textProps={{ fontFamily: "Mulish-Bold" }}
              size={2}
            >
              {item.name}
            </CustomText>
            <CustomText
              color={AppColors.grey_200}
              textProps={{ fontFamily: "Mulish-Regular" }}
              size={1.7}
            >
              {item.website}
            </CustomText>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: width(5),
  },
  addButton: {
    marginBottom: height(2),
  },
  storeCard: {
    padding: width(4),
    backgroundColor: AppColors.white,
    borderRadius: width(2),
    marginBottom: height(1.5),
    elevation: 2,
    shadowColor: AppColors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
});

export default StoreManagement; 