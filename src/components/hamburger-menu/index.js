
import React from "react";
import { Modal, View, TouchableOpacity, Text } from "react-native";
import styles from "./styles"; 
const HamburgerMenu = ({ visible, onClose }) => {
    return (
      <Modal
        transparent={true}
        animationType="slide"
        visible={visible}
        onRequestClose={onClose}
      >
        <View style={styles.modalContainer}>
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={onClose}>
              <Text style={styles.menuText}>Item 1</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={onClose}>
              <Text style={styles.menuText}>Item 2</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={onClose}>
              <Text style={styles.menuText}>Item 3</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };
  
  export default HamburgerMenu;