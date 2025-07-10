import React, { useState } from 'react';
import {
  Box,
  Container,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Slide,
  Paper
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { TransitionProps } from '@mui/material/transitions';
import { User } from '../../types';
import UserList from './UserList';
import UserForm from './UserForm';

interface UserListItem extends User {
  restaurantName?: string;
  isActive?: boolean;
  phone?: string;
}

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const UserManagement: React.FC = () => {
  const [selectedUser, setSelectedUser] = useState<UserListItem | undefined>(undefined);
  const [userFormOpen, setUserFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [refreshUserList, setRefreshUserList] = useState<(() => void) | null>(null);

  const handleUserCreate = () => {
    setSelectedUser(undefined);
    setIsEditing(false);
    setUserFormOpen(true);
  };

  const handleUserEdit = (user: UserListItem) => {
    setSelectedUser(user);
    setIsEditing(true);
    setUserFormOpen(true);
  };

  const handleUserSelect = (user: UserListItem) => {
    // For now, just edit the user when clicked
    // In the future, this could show a user detail view
    handleUserEdit(user);
  };

  const handleFormSave = (user: any) => {
    setUserFormOpen(false);
    setSelectedUser(undefined);
    // Refresh the user list after successful save
    if (refreshUserList) {
      refreshUserList();
    }
  };

  const handleFormCancel = () => {
    setUserFormOpen(false);
    setSelectedUser(undefined);
  };

  const handleRefreshCallback = (refreshFn: () => void) => {
    setRefreshUserList(() => refreshFn);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <UserList
        onUserSelect={handleUserSelect}
        onUserCreate={handleUserCreate}
        onUserEdit={handleUserEdit}
        onRefresh={handleRefreshCallback}
      />

      {/* User Form Dialog */}
      <Dialog
        open={userFormOpen}
        onClose={handleFormCancel}
        maxWidth="md"
        fullWidth
        TransitionComponent={Transition}
        PaperProps={{
          sx: {
            borderRadius: 2,
            minHeight: '60vh'
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          pb: 0
        }}>
          <Box />
          <IconButton onClick={handleFormCancel} sx={{ color: 'text.secondary' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 0 }}>
          <UserForm
            user={selectedUser}
            onSave={handleFormSave}
            onCancel={handleFormCancel}
            isEditing={isEditing}
          />
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default UserManagement;