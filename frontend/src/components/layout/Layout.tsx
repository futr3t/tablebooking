import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Avatar,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  BookOnline,
  TableBar,
  People,
  Settings,
  Widgets,
  ExitToApp,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const drawerWidth = 240;

const Layout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { text: 'Dashboard', icon: <Dashboard />, path: '/' },
    { text: 'Bookings', icon: <BookOnline />, path: '/bookings' },
    { text: 'Tables', icon: <TableBar />, path: '/tables' },
    { text: 'Settings', icon: <Settings />, path: '/settings' },
    { text: 'Staff', icon: <People />, path: '/staff' },
    { text: 'Widget', icon: <Widgets />, path: '/widget' },
  ];

  const drawer = (
    <div>
      <Toolbar sx={{ 
        background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
        color: 'white',
        minHeight: '80px !important',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h5" noWrap component="div" sx={{ 
            fontWeight: 700,
            letterSpacing: '-0.025em',
            mb: 0.5
          }}>
            TableBooking
          </Typography>
          <Typography variant="caption" sx={{ 
            opacity: 0.9,
            fontSize: '0.75rem',
            fontWeight: 500
          }}>
            Restaurant Management
          </Typography>
        </Box>
      </Toolbar>
      <Box sx={{ p: 2 }}>
        <List sx={{ px: 0 }}>
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => navigate(item.path)}
                selected={location.pathname === item.path}
                sx={{
                  borderRadius: 2,
                  minHeight: 48,
                  px: 2,
                  '&.Mui-selected': {
                    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                    color: 'white',
                    '& .MuiListItemIcon-root': {
                      color: 'white',
                    },
                    '&:hover': {
                      background: 'linear-gradient(135deg, #1d4ed8 0%, #5b21b6 100%)',
                    },
                  },
                  '&:hover': {
                    backgroundColor: 'rgba(37, 99, 235, 0.08)',
                  },
                }}
              >
                <ListItemIcon sx={{ 
                  minWidth: 40,
                  color: location.pathname === item.path ? 'white' : 'inherit'
                }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text} 
                  primaryTypographyProps={{
                    fontWeight: location.pathname === item.path ? 600 : 500,
                    fontSize: '0.875rem'
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid #e2e8f0',
          color: 'text.primary',
        }}
      >
        <Toolbar sx={{ minHeight: '72px !important' }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h4" noWrap component="div" sx={{ 
              fontWeight: 700,
              color: 'text.primary',
              letterSpacing: '-0.025em'
            }}>
              {menuItems.find(item => item.path === location.pathname)?.text || 'Dashboard'}
            </Typography>
            <Typography variant="body2" sx={{ 
              color: 'text.secondary',
              mt: 0.5
            }}>
              {location.pathname === '/' && 'Overview of today\'s bookings and activity'}
              {location.pathname === '/bookings' && 'Manage all restaurant bookings'}
              {location.pathname === '/tables' && 'Configure table layout and capacity'}
              {location.pathname === '/settings' && 'Restaurant configuration and preferences'}
              {location.pathname === '/widget' && 'Booking widget for your website'}
              {location.pathname === '/staff' && 'Team management and permissions'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1.5,
              px: 2, 
              py: 1, 
              borderRadius: 3,
              backgroundColor: 'rgba(37, 99, 235, 0.05)',
              border: '1px solid rgba(37, 99, 235, 0.1)',
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                backgroundColor: 'rgba(37, 99, 235, 0.08)',
              }
            }} onClick={handleMenu}>
              <Avatar sx={{ 
                width: 36, 
                height: 36,
                background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                fontSize: '0.875rem',
                fontWeight: 600
              }}>
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </Avatar>
              <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                <Typography variant="subtitle2" sx={{ 
                  fontWeight: 600,
                  lineHeight: 1,
                  color: 'text.primary'
                }}>
                  {user?.firstName} {user?.lastName}
                </Typography>
                <Typography variant="caption" sx={{ 
                  color: 'text.secondary',
                  textTransform: 'capitalize'
                }}>
                  {user?.role?.replace('_', ' ')}
                </Typography>
              </Box>
            </Box>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
              sx={{
                '& .MuiPaper-root': {
                  borderRadius: 2,
                  minWidth: 200,
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                  border: '1px solid #e2e8f0',
                  mt: 1
                }
              }}
            >
              <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #e2e8f0' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar sx={{ 
                    width: 40, 
                    height: 40,
                    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                    fontSize: '1rem',
                    fontWeight: 600
                  }}>
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {user?.firstName} {user?.lastName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {user?.email}
                    </Typography>
                  </Box>
                </Box>
              </Box>
              <MenuItem onClick={handleLogout} sx={{ py: 1.5, px: 2 }}>
                <ListItemIcon>
                  <ExitToApp fontSize="small" />
                </ListItemIcon>
                <Typography variant="body2">Sign Out</Typography>
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="mailbox folders"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          backgroundColor: 'background.default',
        }}
      >
        <Toolbar sx={{ minHeight: '72px !important' }} />
        <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;