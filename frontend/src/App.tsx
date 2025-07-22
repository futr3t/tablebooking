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
import SettingsManager from './components/settings/SettingsManager';
import WidgetManager from './components/widget/WidgetManager';
import UserManagement from './components/users/UserManagement';
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
      letterSpacing: '-0.015em',
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
      letterSpacing: '-0.015em',
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.75,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
    button: {
      fontWeight: 500,
      textTransform: 'none',
      letterSpacing: '0.025em',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#0f172a',
          scrollbarColor: '#475569 transparent',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#475569',
            borderRadius: '4px',
            '&:hover': {
              backgroundColor: '#64748b',
            },
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(51, 65, 85, 0.5)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(148, 163, 184, 0.1)',
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          padding: '8px 16px',
          fontSize: '0.875rem',
          fontWeight: 500,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
          },
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: 'rgba(30, 41, 59, 0.5)',
            '& fieldset': {
              borderColor: 'rgba(148, 163, 184, 0.2)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(148, 163, 184, 0.3)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#3b82f6',
            },
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(30, 41, 59, 0.5)',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(148, 163, 184, 0.2)',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(148, 163, 184, 0.3)',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#3b82f6',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '6px',
          fontWeight: 500,
        },
        colorPrimary: {
          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
          color: '#ffffff',
        },
        colorSecondary: {
          background: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',
          color: '#ffffff',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: 'rgba(30, 41, 59, 0.95)',
          backdropFilter: 'blur(10px)',
          borderRight: '1px solid rgba(148, 163, 184, 0.1)',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          margin: '2px 8px',
          '&:hover': {
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            '&:hover': {
              backgroundColor: 'rgba(59, 130, 246, 0.3)',
            },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: 'rgba(30, 41, 59, 0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(148, 163, 184, 0.1)',
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: 'rgba(30, 41, 59, 0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(148, 163, 184, 0.1)',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: 'rgba(30, 41, 59, 0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(148, 163, 184, 0.1)',
          fontSize: '0.75rem',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          border: '1px solid',
        },
        standardSuccess: {
          backgroundColor: 'rgba(5, 150, 105, 0.1)',
          borderColor: 'rgba(5, 150, 105, 0.3)',
          color: '#10b981',
        },
        standardError: {
          backgroundColor: 'rgba(220, 38, 38, 0.1)',
          borderColor: 'rgba(220, 38, 38, 0.3)',
          color: '#ef4444',
        },
        standardWarning: {
          backgroundColor: 'rgba(234, 88, 12, 0.1)',
          borderColor: 'rgba(234, 88, 12, 0.3)',
          color: '#f97316',
        },
        standardInfo: {
          backgroundColor: 'rgba(8, 145, 178, 0.1)',
          borderColor: 'rgba(8, 145, 178, 0.3)',
          color: '#06b6d4',
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: '48px',
        },
        indicator: {
          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
          height: '3px',
          borderRadius: '2px',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.875rem',
          minHeight: '48px',
          '&:hover': {
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
          },
          '&.Mui-selected': {
            color: '#3b82f6',
          },
        },
      },
    },
  },
  shape: {
    borderRadius: 8,
  },
  shadows: [
    'none',
    '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    ...Array(19).fill('0 25px 50px -12px rgb(0 0 0 / 0.25)'),
  ] as any,
});

function App() {
  return (
    <ThemeProvider theme={theme}>
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
                  <Route path="settings" element={<SettingsManager />} />
                  <Route path="staff" element={<UserManagement />} />
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
