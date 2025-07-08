import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import { DateFormatProvider } from './contexts/DateFormatContext';
import { DynamicLocalizationProvider } from './components/common/DynamicLocalizationProvider';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Login from './components/auth/Login';
import Layout from './components/layout/Layout';
import Dashboard from './components/dashboard/Dashboard';
import BookingDashboard from './components/bookings/BookingDashboard';
import TableManagementDashboard from './components/tables/TableManagementDashboard';
import RestaurantSettingsPanel from './components/settings/RestaurantSettingsPanel';
import WidgetManager from './components/widget/WidgetManager';
import darkTheme from './themes/darkTheme';

// Extend Material-UI theme to include custom purple color
declare module '@mui/material/styles' {
  interface Palette {
    purple: Palette['primary'];
  }

  interface PaletteOptions {
    purple?: PaletteOptions['primary'];
  }
}

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#2563eb', // Blue-600
      light: '#3b82f6', // Blue-500
      dark: '#1d4ed8', // Blue-700
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#4f46e5', // Indigo-600
      light: '#6366f1', // Indigo-500
      dark: '#4338ca', // Indigo-700
      contrastText: '#ffffff',
    },
    background: {
      default: '#0f172a', // Slate-900
      paper: 'rgba(51, 65, 85, 0.5)', // Slate-700/50
    },
    text: {
      primary: '#ffffff', // White headings
      secondary: '#cbd5e1', // Slate-300 body text
    },
    grey: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
    },
    success: {
      main: '#059669', // Emerald-600
      light: '#10b981', // Emerald-500
      dark: '#047857', // Emerald-700
      contrastText: '#ffffff',
    },
    warning: {
      main: '#ea580c', // Orange-600
      light: '#f97316', // Orange-500
      dark: '#c2410c', // Orange-700
      contrastText: '#ffffff',
    },
    error: {
      main: '#dc2626', // Red-600
      light: '#ef4444', // Red-500
      dark: '#b91c1c', // Red-700
      contrastText: '#ffffff',
    },
    info: {
      main: '#0891b2', // Cyan-600
      light: '#06b6d4', // Cyan-500
      dark: '#0e7490', // Cyan-700
      contrastText: '#ffffff',
    },
    purple: {
      main: '#a855f7', // Purple-400
      light: '#c084fc', // Purple-300
      dark: '#9333ea', // Purple-500
      contrastText: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.025em',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
      letterSpacing: '-0.025em',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.3,
      letterSpacing: '-0.025em',
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
      letterSpacing: '-0.025em',
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h6: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 500,
      textTransform: 'none',
      letterSpacing: '0.025em',
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.4,
      color: '#64748b',
    },
  },
  shape: {
    borderRadius: 0, // Square corners throughout
  },
  shadows: [
    'none',
    '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 0, // Square corners
          textTransform: 'none',
          fontWeight: 500,
          boxShadow: 'none',
          fontSize: '0.875rem',
          padding: '8px 16px',
          transition: 'all 0.2s ease-in-out',
        },
        contained: {
          background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)', // Blue-600 to indigo-600 gradient
          color: '#ffffff',
          boxShadow: '0 2px 4px 0 rgb(37 99 235 / 0.2)', // Blue shadow
          '&:hover': {
            background: 'linear-gradient(135deg, #1d4ed8 0%, #4338ca 100%)', // Darker gradient on hover
            boxShadow: '0 4px 8px 0 rgb(37 99 235 / 0.3)', // Enhanced blue shadow
            transform: 'translateY(-1px)',
          },
          '&:active': {
            transform: 'translateY(0)',
            boxShadow: '0 1px 2px 0 rgb(37 99 235 / 0.2)',
          },
        },
        outlined: {
          borderColor: '#2563eb', // Blue-600
          color: '#ffffff', // High contrast white text
          backgroundColor: 'transparent',
          '&:hover': {
            borderColor: '#1d4ed8', // Blue-700
            backgroundColor: 'rgba(37, 99, 235, 0.1)', // Blue background with opacity
            color: '#ffffff',
            boxShadow: '0 2px 4px 0 rgb(37 99 235 / 0.1)',
          },
        },
        text: {
          color: '#ffffff', // High contrast white text
          '&:hover': {
            backgroundColor: 'rgba(37, 99, 235, 0.1)', // Blue background with opacity
            color: '#ffffff',
          },
        },
        // Secondary variant styling
        containedSecondary: {
          background: '#334155', // Slate-700
          color: '#ffffff',
          boxShadow: '0 2px 4px 0 rgb(51 65 85 / 0.2)', // Slate shadow
          '&:hover': {
            background: '#475569', // Slate-600
            boxShadow: '0 4px 8px 0 rgb(51 65 85 / 0.3)', // Enhanced slate shadow
            transform: 'translateY(-1px)',
          },
          '&:active': {
            transform: 'translateY(0)',
            boxShadow: '0 1px 2px 0 rgb(51 65 85 / 0.2)',
          },
        },
        outlinedSecondary: {
          borderColor: '#334155', // Slate-700
          color: '#ffffff',
          backgroundColor: 'transparent',
          '&:hover': {
            borderColor: '#475569', // Slate-600
            backgroundColor: 'rgba(51, 65, 85, 0.1)',
            color: '#ffffff',
            boxShadow: '0 2px 4px 0 rgb(51 65 85 / 0.1)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 0, // Square corners
          border: '1px solid #334155', // Slate-700
          boxShadow: '0 2px 4px 0 rgb(0 0 0 / 0.2)', // Dark theme shadow
          backgroundColor: 'rgba(30, 41, 59, 0.5)', // Slate-800/50
          backdropFilter: 'blur(8px)', // Backdrop blur for glass effect
          WebkitBackdropFilter: 'blur(8px)', // Safari support
          transition: 'all 0.2s ease-in-out',
          '--card-bg': 'rgba(30, 41, 59, 0.5)',
          '--card-border': '#334155',
          '--card-shadow': '0 2px 4px 0 rgb(0 0 0 / 0.2)',
          '--card-shadow-hover': '0 4px 12px 0 rgb(0 0 0 / 0.3)',
          '&:hover': {
            backgroundColor: 'rgba(30, 41, 59, 0.7)', // Slightly more opaque on hover
            borderColor: '#475569', // Slate-600
            boxShadow: 'var(--card-shadow-hover)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiInputLabel-root': {
            color: '#cbd5e1', // Slate-300 labels
            '&.Mui-focused': {
              color: '#3b82f6', // Blue-500 focus
            },
          },
          '& .MuiOutlinedInput-root': {
            borderRadius: 0, // Square corners
            backgroundColor: '#334155', // bg-slate-700
            color: '#ffffff', // White text
            minHeight: '40px', // Consistent height for proper alignment
            display: 'flex',
            alignItems: 'center', // Center content vertically
            '& fieldset': {
              borderColor: '#475569', // border-slate-600
            },
            '&:hover fieldset': {
              borderColor: '#94a3b8', // Slate-400 hover
            },
            '&.Mui-focused fieldset': {
              borderColor: 'transparent', // Transparent border on focus
              boxShadow: '0 0 0 2px #3b82f6', // ring-2 ring-blue-500
            },
            '& .MuiOutlinedInput-input': {
              padding: '8px 14px', // Consistent padding for all sizes
              lineHeight: '1.4375em', // MUI default line height
              height: '1.4375em', // Match line height for proper centering
            },
            '&.MuiInputBase-sizeSmall': {
              minHeight: '32px', // Smaller height for small variant
              '& .MuiOutlinedInput-input': {
                padding: '6px 8px', // Smaller padding for small size
                height: '1.4375em', // Same height for consistent alignment
              },
            },
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: 0, // Square corners
          backgroundColor: '#334155', // bg-slate-700
          color: '#ffffff', // White text
          minHeight: '40px', // Consistent height for proper alignment
          display: 'flex',
          alignItems: 'center', // Center content vertically
          '& fieldset': {
            borderColor: '#475569', // border-slate-600
          },
          '&:hover fieldset': {
            borderColor: '#94a3b8', // Slate-400 hover
          },
          '&.Mui-focused fieldset': {
            borderColor: 'transparent', // Transparent border on focus
            boxShadow: '0 0 0 2px #3b82f6', // ring-2 ring-blue-500
          },
          '&.MuiInputBase-sizeSmall': {
            minHeight: '32px', // Smaller height for small variant
          },
        },
        select: {
          padding: '8px 14px', // Consistent padding
          lineHeight: '1.4375em', // MUI default line height
          height: '1.4375em', // Match line height for proper centering
          display: 'flex',
          alignItems: 'center',
        },
        icon: {
          color: '#cbd5e1', // Slate-300 dropdown arrow
        },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: {
          color: '#cbd5e1', // Slate-300 color for proper contrast
          '&.Mui-focused': {
            color: '#3b82f6', // Blue-500 focus
          },
        },
      },
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          color: '#94a3b8', // Slate-400 color for helper text
          marginTop: '4px',
          fontSize: '0.75rem',
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          borderRadius: 0, // Square corners
          backgroundColor: '#334155', // bg-slate-700
          color: '#ffffff', // White text
          minHeight: '40px', // Consistent height for proper alignment
          display: 'flex',
          alignItems: 'center', // Center content vertically
          '&.Mui-focused': {
            boxShadow: '0 0 0 2px #3b82f6', // ring-2 ring-blue-500
          },
          '&.MuiInputBase-sizeSmall': {
            minHeight: '32px', // Smaller height for small variant
          },
        },
        input: {
          padding: '8px 14px', // Consistent padding
          lineHeight: '1.4375em', // MUI default line height
          height: '1.4375em', // Match line height for proper centering
          '&::placeholder': {
            color: '#94a3b8', // Slate-400 placeholder
            opacity: 1,
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 0, // Square corners
          backgroundColor: '#334155', // bg-slate-700
          minHeight: '40px', // Consistent height for proper alignment
          display: 'flex',
          alignItems: 'center', // Center content vertically
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#475569', // border-slate-600
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#94a3b8', // Slate-400 hover
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: 'transparent', // Transparent border on focus
            borderWidth: '1px', // Keep 1px to maintain layout
          },
          '&.Mui-focused': {
            boxShadow: '0 0 0 2px #3b82f6', // ring-2 ring-blue-500
          },
          '&.MuiInputBase-sizeSmall': {
            minHeight: '32px', // Smaller height for small variant
          },
        },
        input: {
          padding: '8px 14px', // Consistent padding
          lineHeight: '1.4375em', // MUI default line height
          height: '1.4375em', // Match line height for proper centering
          color: '#ffffff', // White text
          '&::placeholder': {
            color: '#94a3b8', // Slate-400 placeholder
            opacity: 1,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: '#f8fafc',
            fontWeight: 600,
            fontSize: '0.875rem',
            color: '#475569',
            borderBottom: '2px solid #e2e8f0',
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: '#f8fafc',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 0, // Square corners
          border: '1px solid #334155', // Slate-700
          boxShadow: '0 2px 4px 0 rgb(0 0 0 / 0.2)', // Dark theme shadow
          backgroundColor: 'rgba(30, 41, 59, 0.5)', // Slate-800/50
          backdropFilter: 'blur(8px)', // Backdrop blur for glass effect
          WebkitBackdropFilter: 'blur(8px)', // Safari support
          backgroundImage: 'none',
          transition: 'all 0.2s ease-in-out',
          '--paper-bg': 'rgba(30, 41, 59, 0.5)',
          '--paper-border': '#334155',
          '--paper-shadow': '0 2px 4px 0 rgb(0 0 0 / 0.2)',
          '--paper-shadow-hover': '0 4px 12px 0 rgb(0 0 0 / 0.3)',
          '&:hover': {
            backgroundColor: 'rgba(30, 41, 59, 0.7)', // Slightly more opaque on hover
            borderColor: '#475569', // Slate-600
            boxShadow: 'var(--paper-shadow-hover)',
            transform: 'translateY(-1px)',
          },
        },
        elevation1: {
          boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.15)',
        },
        elevation2: {
          boxShadow: '0 2px 4px 0 rgb(0 0 0 / 0.2)',
        },
        elevation3: {
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.25), 0 2px 4px -2px rgb(0 0 0 / 0.15)',
        },
        elevation4: {
          boxShadow: '0 6px 10px -3px rgb(0 0 0 / 0.3), 0 4px 6px -4px rgb(0 0 0 / 0.2)',
        },
      },
    },
    MuiContainer: {
      styleOverrides: {
        root: {
          borderRadius: 0, // Square corners
          '--container-bg': 'rgba(30, 41, 59, 0.3)',
          '--container-border': '#334155',
          '&.MuiContainer-bordered': {
            border: '1px solid var(--container-border)',
            backgroundColor: 'var(--container-bg)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            padding: '24px',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              backgroundColor: 'rgba(30, 41, 59, 0.5)',
              borderColor: '#475569', // Slate-600
            },
          },
        },
      },
    },
  },
});

function App() {
  // Theme switching state - using sophisticated dark theme
  const [isDarkMode] = useState(true);
  const currentTheme = isDarkMode ? theme : darkTheme;

  return (
    <ThemeProvider theme={currentTheme}>
      <CssBaseline />
      <AuthProvider>
        <DateFormatProvider>
          <DynamicLocalizationProvider>
            <Router>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Dashboard />} />
                  <Route path="bookings" element={<BookingDashboard />} />
                  <Route path="tables" element={<TableManagementDashboard />} />
                  <Route path="settings" element={<RestaurantSettingsPanel />} />
                  <Route path="staff" element={<div>Staff Management (Coming Soon)</div>} />
                  <Route path="widget" element={<WidgetManager />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Router>
          </DynamicLocalizationProvider>
        </DateFormatProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
