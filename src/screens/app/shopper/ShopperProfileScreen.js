import React from 'react';
import { View } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { signOut } from '../../../Redux/Actions/UserActions';

const ShopperProfileScreen = () => {
  const dispatch = useDispatch();
  const { userData, favoriteStores } = useSelector(state => state.user);
  const { savedCategories } = useSelector(state => state.shopperProfile);

  return (
    <ScreenWrapper>
      <View>
        <Header title="Profile" />
        <ProfileInfo
          name={userData.displayName}
          email={userData.email}
          favoriteStoresCount={favoriteStores.length}
          savedCategories={savedCategories}
        />
        <Button
          title="Sign Out"
          onPress={() => dispatch(signOut())}
        />
      </View>
    </ScreenWrapper>
  );
}; 