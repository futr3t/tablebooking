import React, { useState } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Card,
  CardContent
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Schedule as ScheduleIcon,
  Restaurant as RestaurantIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import RestaurantSettingsPanel from './RestaurantSettingsPanel';
import { NotificationSettings } from './NotificationSettings';
import { TurnTimeRules } from './TurnTimeRules';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const a11yProps = (index: number) => {
  return {
    id: `settings-tab-${index}`,
    'aria-controls': `settings-tabpanel-${index}`,
  };
};

export const SettingsManager: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  if (!user?.restaurantId) {
    return (
      <Card>
        <CardContent>
          <Typography color="error">
            Restaurant access required to view settings
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        mb: 4,
        flexDirection: { xs: 'column', sm: 'row' },
        gap: { xs: 2, sm: 0 }
      }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{
            fontWeight: 700,
            color: 'text.primary',
            mb: 0.5
          }}>
            Restaurant Settings
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Configure your restaurant's operational settings, notifications, and booking preferences
          </Typography>
        </Box>
      </Box>

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            aria-label="restaurant settings tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab
              icon={<RestaurantIcon />}
              label="General Settings"
              {...a11yProps(0)}
              sx={{ minHeight: 64 }}
            />
            <Tab
              icon={<NotificationsIcon />}
              label="Notifications"
              {...a11yProps(1)}
              sx={{ minHeight: 64 }}
            />
            <Tab
              icon={<ScheduleIcon />}
              label="Turn Time Rules"
              {...a11yProps(2)}
              sx={{ minHeight: 64 }}
            />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          <RestaurantSettingsPanel />
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <NotificationSettings restaurantId={user.restaurantId} />
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <TurnTimeRules restaurantId={user.restaurantId} />
        </TabPanel>
      </Card>
    </Box>
  );
};

export default SettingsManager;
