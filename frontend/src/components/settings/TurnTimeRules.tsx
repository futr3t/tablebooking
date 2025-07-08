import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Paper,
  Alert,
  Chip,
  Stack,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AccessTime as TimeIcon,
  Groups as GroupsIcon
} from '@mui/icons-material';
import { turnTimeRulesService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface TurnTimeRule {
  id: string;
  restaurantId: string;
  name?: string;
  minPartySize: number;
  maxPartySize: number;
  turnTimeMinutes: number;
  description?: string;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TurnTimeRulesProps {
  restaurantId: string;
}

export const TurnTimeRules: React.FC<TurnTimeRulesProps> = ({ restaurantId }) => {
  const { user } = useAuth();
  const [rules, setRules] = useState<TurnTimeRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<TurnTimeRule | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    minPartySize: 1,
    maxPartySize: 2,
    turnTimeMinutes: 90,
    description: '',
    priority: 0
  });

  useEffect(() => {
    loadRules();
  }, [restaurantId]);

  const loadRules = async () => {
    try {
      setLoading(true);
      const rules = await turnTimeRulesService.getRules(restaurantId);
      setRules(rules);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load turn time rules');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (rule?: TurnTimeRule) => {
    if (rule) {
      setEditingRule(rule);
      setFormData({
        name: rule.name || '',
        minPartySize: rule.minPartySize,
        maxPartySize: rule.maxPartySize,
        turnTimeMinutes: rule.turnTimeMinutes,
        description: rule.description || '',
        priority: rule.priority
      });
    } else {
      setEditingRule(null);
      setFormData({
        name: '',
        minPartySize: 1,
        maxPartySize: 2,
        turnTimeMinutes: 90,
        description: '',
        priority: 0
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingRule(null);
    setError(null);
  };

  const handleSave = async () => {
    try {
      if (editingRule) {
        await turnTimeRulesService.updateRule(editingRule.id, formData);
      } else {
        await turnTimeRulesService.createRule(restaurantId, formData);
      }
      handleCloseDialog();
      loadRules();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save turn time rule');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this turn time rule?')) {
      try {
        await turnTimeRulesService.deleteRule(id);
        loadRules();
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to delete turn time rule');
      }
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} min`;
    if (mins === 0) return `${hours} hr`;
    return `${hours} hr ${mins} min`;
  };

  const getPartySizeDisplay = (min: number, max: number) => {
    if (min === max) return `${min} ${min === 1 ? 'person' : 'people'}`;
    return `${min}-${max} people`;
  };

  // Check if user can manage rules
  const canManageRules = user?.role === 'super_admin' || user?.role === 'owner' || user?.role === 'manager';

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TimeIcon />
          Turn Time Rules
        </Typography>
        {canManageRules && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Rule
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Configure different turn times based on party size. Rules are applied in priority order.
          </Typography>

          {loading ? (
            <Typography>Loading...</Typography>
          ) : rules.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <GroupsIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                No turn time rules configured. The default restaurant turn time will be used for all bookings.
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Party Size</TableCell>
                    <TableCell>Turn Time</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell>Status</TableCell>
                    {canManageRules && <TableCell align="right">Actions</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rules.sort((a, b) => b.priority - a.priority || a.minPartySize - b.minPartySize).map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <GroupsIcon fontSize="small" color="action" />
                          <Typography variant="body2">
                            {getPartySizeDisplay(rule.minPartySize, rule.maxPartySize)}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={formatDuration(rule.turnTimeMinutes)}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">{rule.name || '-'}</Typography>
                          {rule.description && (
                            <Typography variant="caption" color="text.secondary">
                              {rule.description}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={rule.priority} size="small" />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={rule.isActive ? 'Active' : 'Inactive'}
                          size="small"
                          color={rule.isActive ? 'success' : 'default'}
                        />
                      </TableCell>
                      {canManageRules && (
                        <TableCell align="right">
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => handleOpenDialog(rule)}>
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" onClick={() => handleDelete(rule.id)} color="error">
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingRule ? 'Edit Turn Time Rule' : 'Add Turn Time Rule'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Name (Optional)"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              helperText="e.g., Quick lunch, Large party dining"
            />
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Min Party Size"
                type="number"
                value={formData.minPartySize}
                onChange={(e) => setFormData({ ...formData, minPartySize: parseInt(e.target.value) || 1 })}
                inputProps={{ min: 1, max: 100 }}
                fullWidth
              />
              <TextField
                label="Max Party Size"
                type="number"
                value={formData.maxPartySize}
                onChange={(e) => setFormData({ ...formData, maxPartySize: parseInt(e.target.value) || 1 })}
                inputProps={{ min: 1, max: 100 }}
                fullWidth
              />
            </Box>

            <TextField
              label="Turn Time (minutes)"
              type="number"
              value={formData.turnTimeMinutes}
              onChange={(e) => setFormData({ ...formData, turnTimeMinutes: parseInt(e.target.value) || 30 })}
              inputProps={{ min: 30, max: 480, step: 15 }}
              fullWidth
              helperText={`Duration: ${formatDuration(formData.turnTimeMinutes)}`}
            />

            <TextField
              label="Description (Optional)"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={2}
              fullWidth
            />

            <TextField
              label="Priority"
              type="number"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
              inputProps={{ min: 0 }}
              fullWidth
              helperText="Higher priority rules take precedence"
            />

            {error && (
              <Alert severity="error">
                {error}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSave} 
            variant="contained"
            disabled={formData.minPartySize > formData.maxPartySize}
          >
            {editingRule ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};