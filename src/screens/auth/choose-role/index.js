import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ScreenNames } from '../../../Routes/routes';
import { AppColors } from '../../../utils';
import { height, width } from '../../../utils/dimension';

const roles = [
  { key: 'shopper', label: 'Find amazing stores' },
  { key: 'merchant', label: 'Manage my store' },
];

export default function ChooseRoleScreen({ navigation }) {
  const handleSelect = (role) => {
    navigation.navigate(ScreenNames.SIGN_UP, { role });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>What would you like to do?</Text>
      <View style={styles.rolesContainer}>
        {roles.map((role) => (
          <TouchableOpacity
            key={role.key}
            style={styles.roleButton}
            onPress={() => handleSelect(role.key)}
            activeOpacity={0.8}
          >
            <Text style={styles.roleLabel}>{role.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity
        style={styles.loginButton}
        onPress={() => navigation.navigate(ScreenNames.SIGN_IN)}
      >
        <Text style={styles.loginText}>Log in</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 32,
    textAlign: 'center',
  },
  rolesContainer: {
    width: '100%',
    marginTop: 24,
    marginBottom: 32,
  },
  roleButton: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 10,
    backgroundColor: AppColors.white,
    borderWidth:1,
    borderColor:AppColors.black,
    alignItems: 'center',
    marginBottom: 80,
  },
  roleLabel: {
    color: AppColors.red_100_full,
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginButton: {
    alignItems: 'center',
    padding: 8,
    marginBottom: 24,
  },
  loginText: {
    color: AppColors.purple,
    fontSize: 16,
    textDecorationLine: 'underline',
  },
}); 