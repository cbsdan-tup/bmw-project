import React, { useEffect, useState, useCallback, memo, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Platform,
  Image,
  ScrollView
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import Icon from 'react-native-vector-icons/FontAwesome';
import DateTimePicker from '@react-native-community/datetimepicker';
import { 
  fetchAllUsers, 
  updateUserRole,
  deleteUser,
  disableUser,
  clearError
} from '../../redux/slices/adminUserSlice';

// Memoized input component to prevent re-renders
const MemoizedTextInput = memo(({ value, onChangeText, style, placeholder, placeholderTextColor, multiline, numberOfLines }) => (
  <TextInput
    style={style}
    placeholder={placeholder}
    placeholderTextColor={placeholderTextColor}
    value={value}
    onChangeText={onChangeText}
    multiline={multiline}
    numberOfLines={numberOfLines}
  />
));

// Extract the DisableModal as a separate memoized component
const DisableUserModal = memo(({ 
  visible, 
  onClose, 
  onDisable, 
  selectedUser, 
  colors,
  initialMessage = ''
}) => {
  // Move state management inside the modal component
  const [disablePermanently, setDisablePermanently] = useState(false);
  const [disableUntil, setDisableUntil] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [disableMessage, setDisableMessage] = useState(initialMessage);
  
  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setDisablePermanently(false);
      setDisableUntil(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
      setDisableMessage(initialMessage);
    }
  }, [visible, initialMessage]);

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDisableUntil(selectedDate);
    }
  };

  const handleDisable = () => {
    if (!disableMessage.trim()) {
      // Show error about empty message
      return;
    }
    
    onDisable({
      permanent: disablePermanently,
      until: disableUntil,
      message: disableMessage,
    });
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Disable User</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="times" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalScrollView} contentContainerStyle={styles.modalScrollContent}>
            <Text style={[styles.disableText, { color: colors.text }]}>
              Select how long you want to disable this user:
            </Text>
            
            <TouchableOpacity 
              style={[
                styles.disableOption, 
                { 
                  backgroundColor: disablePermanently ? colors.primary + '30' : 'transparent',
                  borderColor: colors.border
                }
              ]}
              onPress={() => setDisablePermanently(true)}
            >
              <Icon 
                name={disablePermanently ? "dot-circle-o" : "circle-o"} 
                size={18} 
                color={colors.primary} 
                style={{ marginRight: 10 }}
              />
              <Text style={[styles.disableOptionText, { color: colors.text }]}>Disable permanently</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.disableOption, 
                { 
                  backgroundColor: !disablePermanently ? colors.primary + '30' : 'transparent',
                  borderColor: colors.border
                }
              ]}
              onPress={() => setDisablePermanently(false)}
            >
              <Icon 
                name={!disablePermanently ? "dot-circle-o" : "circle-o"} 
                size={18} 
                color={colors.primary} 
                style={{ marginRight: 10 }}
              />
              <Text style={[styles.disableOptionText, { color: colors.text }]}>Disable until date</Text>
            </TouchableOpacity>
            
            {!disablePermanently && (
              <View style={styles.datePickerContainer}>
                <TouchableOpacity 
                  style={[styles.dateButton, { borderColor: colors.border }]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Icon name="calendar" size={16} color={colors.primary} style={{ marginRight: 8 }} />
                  <Text style={{ color: colors.text }}>
                    {disableUntil.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
                
                {showDatePicker && (
                  <DateTimePicker
                    value={disableUntil}
                    mode="date"
                    display="default"
                    minimumDate={new Date()}
                    onChange={onDateChange}
                  />
                )}
              </View>
            )}
            
            <Text style={[styles.disableText, { color: colors.text, marginTop: 16 }]}>
              Reason for disabling:
            </Text>
            
            <TextInput
              style={[
                styles.disableMessageInput, 
                { 
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.inputBackground
                }
              ]}
              multiline={true}
              numberOfLines={3}
              value={disableMessage}
              onChangeText={setDisableMessage}
              placeholder="Enter reason for disabling user"
              placeholderTextColor={colors.inputPlaceholder}
            />
          </ScrollView>
          
          <View style={styles.disableButtonsContainer}>
            <TouchableOpacity 
              style={[styles.disableButton, styles.disableCancelButton, { borderColor: colors.border }]}
              onPress={onClose}
            >
              <Text style={{ color: colors.text }}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.disableButton, styles.disableConfirmButton, { backgroundColor: colors.error }]}
              onPress={handleDisable}
            >
              <Text style={styles.disableConfirmButtonText}>Confirm Disable</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
});

const UserManagementScreen = () => {
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const toast = useToast();
  const { users, loading, error, pagination } = useSelector(state => state.adminUsers);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [disableModalVisible, setDisableModalVisible] = useState(false);
  
  useEffect(() => {
    loadUsers();
  }, [page]);
  
  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error]);
  
  const loadUsers = () => {
    dispatch(fetchAllUsers({ page, search: searchQuery }));
  };
  
  const handleSearch = () => {
    setPage(1);
    loadUsers();
  };
  
  const handleNextPage = () => {
    if (page < pagination.totalPages) {
      setPage(page + 1);
    }
  };
  
  const handlePrevPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };
  
  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setModalVisible(true);
  };
  
  const handleUpdateRole = (userId, newRole) => {
    Alert.alert(
      'Change User Role',
      `Are you sure you want to change this user's role to ${newRole}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: () => {
            dispatch(updateUserRole({ userId, role: newRole }))
              .unwrap()
              .then(() => {
                setModalVisible(false);
                toast.success(`User role updated to ${newRole} successfully`);
              })
              .catch((err) => {
                toast.error(`Failed to update role: ${err.message || 'Unknown error'}`);
              });
          }
        }
      ]
    );
  };
  
  const handleDisableUser = useCallback((userId, options) => {
    const { permanent, until, message } = options;
    
    dispatch(disableUser({
      userId, 
      isDisabled: true,
      disabledUntil: permanent ? null : until.toISOString(),
      disabledReason: message,
      isPermanent: permanent
    }))
      .unwrap()
      .then(() => {
        setDisableModalVisible(false);
        setModalVisible(false);
        toast.success(`User has been ${permanent ? 'permanently' : 'temporarily'} disabled`);
      })
      .catch((err) => {
        toast.error(`Failed to disable user: ${err.message || 'Unknown error'}`);
      });
  }, [dispatch, toast]);
  
  const handleEnableUser = (userId) => {
    Alert.alert(
      'Enable User',
      'Are you sure you want to enable this user? This will remove all active disable restrictions.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Enable', 
          onPress: () => {
            dispatch(disableUser({
              userId,
              isDisabled: false
            }))
              .unwrap()
              .then((response) => {
                // Update the local selected user with the updated user from response
                setSelectedUser(response.user);
                toast.success('User has been enabled successfully');
              })
              .catch((err) => {
                toast.error(`Failed to enable user: ${err.message || 'Unknown error'}`);
              });
          }
        }
      ]
    );
  };

  const openDisableModal = useCallback(() => {
    setDisableModalVisible(true);
  }, []);

  const closeDisableModal = useCallback(() => {
    setDisableModalVisible(false);
  }, []);

  const onDisableConfirm = useCallback((options) => {
    if (selectedUser) {
      handleDisableUser(selectedUser._id, options);
    }
  }, [selectedUser, handleDisableUser]);
  
  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDisableUntil(selectedDate);
    }
  };

  // Optimize the handling of disable message to prevent re-renders
  const handleDisableMessageChange = useCallback((text) => {
    setDisableMessage(text);
  }, []);
  
  const renderUserItem = useCallback(({ item }) => (
    <TouchableOpacity 
      style={[styles.userItem, { backgroundColor: colors.card }]}
      onPress={() => handleUserSelect(item)}
    >
      {/* Add avatar image */}
      <View style={styles.avatarContainer}>
        {item.avatar && item.avatar.url ? (
          <Image 
            source={{ uri: item.avatar.url }} 
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary + '40' }]}>
            <Text style={[styles.avatarPlaceholderText, { color: colors.primary }]}>
              {item.firstName && item.firstName.charAt(0)}
              {item.lastName && item.lastName.charAt(0)}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: colors.text }]}>
          {item.firstName} {item.lastName}
        </Text>
        <Text style={[styles.userEmail, { color: colors.text }]}>
          {item.email}
        </Text>
        <View style={styles.roleContainer}>
          <Text style={[
            styles.userRole, 
            { 
              backgroundColor: item.role === 'admin' ? colors.primary : colors.notification,
              color: item.role === 'admin' ? '#fff' : colors.text
            }
          ]}>
            {item.role.toUpperCase()}
          </Text>
        </View>
      </View>
      <Icon name="angle-right" size={24} color={colors.text} />
    </TouchableOpacity>
  ), [colors]);
  
  const UserDetailsModal = () => {
    if (!selectedUser) return null;
    
    // Fix #1: Ensure we're checking disable status properly
    // Calculate isDisabled and activeDisableRecord from latest data
    const isDisabled = selectedUser.isCurrentlyDisabled || 
      (selectedUser.disableHistory && selectedUser.disableHistory.some(record => 
        record.isActive && (record.isPermanent || new Date(record.endDate) > new Date())
      ));
    
    // Get the current active disable record if any
    const activeDisableRecord = selectedUser.disableHistory && 
      selectedUser.disableHistory.find(record => 
        record.isActive && (record.isPermanent || new Date(record.endDate) > new Date())
      );
    
    // Sort disable history by start date (newest first)
    const sortedDisableHistory = selectedUser.disableHistory 
      ? [...selectedUser.disableHistory].sort((a, b) => 
          new Date(b.startDate) - new Date(a.startDate)
        )
      : [];
    
    return (
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text, fontSize: 20, fontWeight: 600 }]}>User Details</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="times" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScrollView} contentContainerStyle={styles.modalScrollContent}>
              <View style={styles.modalAvatarContainer}>
                {selectedUser.avatar && selectedUser.avatar.url ? (
                  <Image 
                    source={{ uri: selectedUser.avatar.url }} 
                    style={styles.modalAvatar}
                  />
                ) : (
                  <View style={[styles.modalAvatarPlaceholder, { backgroundColor: colors.primary + '40' }]}>
                    <Text style={[styles.modalAvatarPlaceholderText, { color: colors.primary }]}>
                      {selectedUser.firstName && selectedUser.firstName.charAt(0)}
                      {selectedUser.lastName && selectedUser.lastName.charAt(0)}
                    </Text>
                  </View>
                )}
                
                {isDisabled && (
                  <View style={styles.disabledBadgeContainer}>
                    <View style={[styles.disabledBadge, { backgroundColor: colors.error }]}>
                      <Text style={styles.disabledBadgeText}>DISABLED</Text>
                    </View>
                  </View>
                )}
              </View>
              
              <View style={styles.userDetailSection}>
                <Text style={[styles.detailLabel, { color: colors.text }]}>Name:</Text>
                <Text style={[styles.detailText, { color: colors.text }]}>
                  {selectedUser.firstName} {selectedUser.lastName}
                </Text>
              </View>
              
              <View style={styles.userDetailSection}>
                <Text style={[styles.detailLabel, { color: colors.text }]}>Email:</Text>
                <Text style={[styles.detailText, { color: colors.text }]}>
                  {selectedUser.email}
                </Text>
              </View>
              
              <View style={styles.userDetailSection}>
                <Text style={[styles.detailLabel, { color: colors.text }]}>Role:</Text>
                <Text style={[
                  styles.detailText, 
                  styles.roleText, 
                  { 
                    backgroundColor: selectedUser.role === 'admin' ? colors.primary : colors.notification,
                    color: selectedUser.role === 'admin' ? '#fff' : colors.text
                  }
                ]}>
                  {selectedUser.role.toUpperCase()}
                </Text>
              </View>
              
              <View style={styles.userDetailSection}>
                <Text style={[styles.detailLabel, { color: colors.text }]}>Registered:</Text>
                <Text style={[styles.detailText, { color: colors.text }]}>
                  {new Date(selectedUser.createdAt).toLocaleDateString()}
                </Text>
              </View>
              
              <View style={styles.userDetailSection}>
                <Text style={[styles.detailLabel, { color: colors.text }]}>Push Notifications:</Text>
                <View style={styles.notificationStatusContainer}>
                  <Icon 
                    name={selectedUser.permissionToken ? "bell" : "bell-slash"} 
                    size={16} 
                    color={selectedUser.permissionToken ? colors.success : colors.error} 
                    style={{marginRight: 8}}
                  />
                  <Text style={[
                    styles.notificationStatus,
                    { color: selectedUser.permissionToken ? colors.success : colors.error }
                  ]}>
                    {selectedUser.permissionToken ? "Enabled" : "Disabled"}
                  </Text>
                </View>
              </View>
              
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: colors.primary }]}
                  onPress={() => handleUpdateRole(
                    selectedUser._id, 
                    selectedUser.role === 'user' ? 'admin' : 'user'
                  )}
                >
                  <Icon name="refresh" size={16} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.actionButtonText}>
                    Change to {selectedUser.role === 'user' ? 'Admin' : 'User'}
                  </Text>
                </TouchableOpacity>
                
                {isDisabled ? (
                  // Show enable button for disabled users
                  <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: colors.success }]}
                    onPress={() => handleEnableUser(selectedUser._id)}
                  >
                    <Icon name="check-circle" size={16} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.actionButtonText}>Enable User</Text>
                  </TouchableOpacity>
                ) : (
                  // Show disable button for active users
                  <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: colors.error }]}
                    onPress={openDisableModal}
                  >
                    <Icon name="ban" size={16} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.actionButtonText}>Disable User</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              {isDisabled && activeDisableRecord && (
                <View style={[styles.userDetailSection, styles.disabledSection]}>
                  <Text style={[styles.detailLabel, { color: colors.error }]}>Account Disabled:</Text>
                  <Text style={[styles.detailText, { color: colors.error }]}>
                    {activeDisableRecord.isPermanent 
                      ? "Permanently disabled" 
                      : `Until ${new Date(activeDisableRecord.endDate).toLocaleDateString()}`
                    }
                  </Text>
                  {activeDisableRecord.reason && (
                    <View style={styles.disabledReasonContainer}>
                      <Text style={[styles.detailLabel, { color: colors.text, marginTop: 6 }]}>Reason:</Text>
                      <Text style={[styles.detailText, { color: colors.text }]}>
                        {activeDisableRecord.reason}
                      </Text>
                    </View>
                  )}
                  <Text style={[styles.detailLabel, { color: colors.text, marginTop: 10 }]}>Disabled on:</Text>
                  <Text style={[styles.detailText, { color: colors.text }]}>
                    {new Date(activeDisableRecord.startDate).toLocaleDateString()}
                  </Text>
                </View>
              )}
              
              {/* Add Disable History Section */}
              {sortedDisableHistory.length > 0 && (
                <View style={styles.userDetailSection}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Disable History</Text>
                  
                  <FlatList
                    data={sortedDisableHistory}
                    keyExtractor={(_, index) => index.toString()}
                    renderItem={({item, index}) => (
                      <View 
                        key={index} 
                        style={[
                          styles.historyItem, 
                          { 
                            backgroundColor: item.isActive ? 
                              'rgba(255,0,0,0.05)' : 'rgba(0,0,0,0.03)',
                            borderLeftColor: item.isActive ? colors.error : colors.border
                          }
                        ]}
                      >
                        <Text style={[styles.historyDate, { color: colors.text }]}>
                          {new Date(item.startDate).toLocaleDateString()}
                          {item.isPermanent ? 
                            " (Permanent)" : 
                            ` to ${new Date(item.endDate).toLocaleDateString()}`
                          }
                        </Text>
                        <Text style={[styles.historyReason, { color: colors.text }]}>
                          {item.reason}
                        </Text>
                        <Text style={[
                          styles.historyStatus, 
                          { 
                            color: item.isActive ? colors.error : colors.success,
                            backgroundColor: item.isActive ? 
                              'rgba(255,0,0,0.1)' : 'rgba(0,200,0,0.1)'
                          }
                        ]}>
                          {item.isActive ? "Active" : "Inactive"}
                        </Text>
                      </View>
                    )}
                    scrollEnabled={false}  // Important! This prevents nested scrolling
                    nestedScrollEnabled={true}
                  />
                </View>
              )}
              
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };
  
  // Use memoized modal components
  const memoizedDisableModal = useMemo(() => (
    <DisableUserModal
      visible={disableModalVisible}
      onClose={closeDisableModal}
      onDisable={onDisableConfirm}
      selectedUser={selectedUser}
      colors={colors}
      initialMessage=""
    />
  ), [disableModalVisible, closeDisableModal, onDisableConfirm, selectedUser, colors]);
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.searchContainer}>
        <TextInput
          style={[styles.searchInput, { 
            backgroundColor: colors.card,
            color: colors.text,
            borderColor: colors.border
          }]}
          placeholder="Search users..."
          placeholderTextColor={colors.text + '80'}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity 
          style={[styles.searchButton, { backgroundColor: colors.primary }]}
          onPress={handleSearch}
        >
          <Icon name="search" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <>
          <FlatList
            data={users}
            renderItem={renderUserItem}
            keyExtractor={item => item._id}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: colors.text }]}>
                No users found
              </Text>
            }
            style={styles.userList}
          />
          
          {pagination.totalPages > 0 && (
            <View style={styles.pagination}>
              <TouchableOpacity 
                style={[styles.pageButton, { 
                  backgroundColor: colors.card,
                  opacity: page === 1 ? 0.5 : 1
                }]}
                disabled={page === 1}
                onPress={handlePrevPage}
              >
                <Icon name="chevron-left" size={16} color={colors.text} />
              </TouchableOpacity>
              
              <Text style={[styles.pageText, { color: colors.text }]}>
                {page} / {pagination.totalPages}
              </Text>
              
              <TouchableOpacity 
                style={[styles.pageButton, { 
                  backgroundColor: colors.card,
                  opacity: page === pagination.totalPages ? 0.5 : 1
                }]}
                disabled={page === pagination.totalPages}
                onPress={handleNextPage}
              >
                <Icon name="chevron-right" size={16} color={colors.text} />
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
      
      <UserDetailsModal />
      {memoizedDisableModal}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 2,
        shadowRadius: 1.5,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  searchInput: {
    flex: 1,
    height: 46,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginRight: 10,
    fontSize: 15,
  },
  searchButton: {
    width: 46,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userList: {
    flex: 1,
  },
  userItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 14,
    marginTop: 4,
    opacity: 0.8,
  },
  roleContainer: {
    marginTop: 6,
  },
  userRole: {
    alignSelf: 'flex-start',
    fontSize: 12,
    fontWeight: 'bold',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 30,
    fontSize: 16,
    opacity: 0.7,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 16,
    paddingVertical: 8,
  },
  pageButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  pageText: {
    marginHorizontal: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    width: '90%',
    borderRadius: 12,
    padding: 5,
    maxHeight: '80%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  modalAvatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  modalAvatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalAvatarPlaceholderText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  userDetailSection: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
    opacity: 0.8,
  },
  detailText: {
    fontSize: 16,
  },
  roleText: {
    alignSelf: 'flex-start',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
    overflow: 'hidden',
    fontWeight: 'bold',
  },
  actionButtons: {
    marginTop: 20,
  },
  actionButton: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  notificationStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  notificationStatus: {
    fontSize: 16,
    fontWeight: '500',
  },
  disabledBadgeContainer: {
    position: 'absolute',
    top: -10,
    right: -10,
  },
  disabledBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  disabledBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  disabledSection: {
    backgroundColor: 'rgba(255,0,0,0.05)',
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: 'red',
  },
  disabledReasonContainer: {
    marginTop: 4,
  },
  disableText: {
    fontSize: 15,
    marginBottom: 12,
  },
  disableOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
  },
  disableOptionText: {
    fontSize: 15,
  },
  datePickerContainer: {
    marginTop: 5,
    marginBottom: 15,
    alignItems: 'center',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    borderRadius: 8,
    marginVertical: 8,
    width: '100%',
  },
  disableMessageInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  disableButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    backgroundColor: 'transparent',
  },
  disableButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  disableCancelButton: {
    borderWidth: 1,
  },
  disableConfirmButton: {
    backgroundColor: 'red',
  },
  disableConfirmButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  modalScrollView: {
    flexGrow: 0,
    maxHeight: '90%',
    paddingTop: 10,
  },
  modalScrollContent: {
    padding: 20,
    paddingTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 8,
  },
  historyItem: {
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
  },
  historyDate: {
    fontWeight: '500',
    fontSize: 14,
  },
  historyReason: {
    marginVertical: 6,
    fontSize: 14,
  },
  historyStatus: {
    alignSelf: 'flex-start',
    fontSize: 12,
    fontWeight: 'bold',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginTop: 4,
  },
});

export default UserManagementScreen;
