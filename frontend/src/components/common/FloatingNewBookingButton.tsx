import React from 'react';
import { Fab, Box } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

interface FloatingNewBookingButtonProps {
  onClick: () => void;
}

const FloatingNewBookingButton: React.FC<FloatingNewBookingButtonProps> = ({ onClick }) => {
  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 1000,
      }}
    >
      <Fab
        color="primary"
        onClick={onClick}
        sx={{
          background: 'linear-gradient(to bottom right, #2563eb, #1d4ed8)',
          borderRadius: 2,
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          '&:hover': {
            background: 'linear-gradient(to bottom right, #1d4ed8, #1e40af)',
            transform: 'translateY(-2px)',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          },
          transition: 'all 0.2s ease-in-out',
          width: 56,
          height: 56,
        }}
      >
        <AddIcon />
      </Fab>
    </Box>
  );
};

export default FloatingNewBookingButton;
