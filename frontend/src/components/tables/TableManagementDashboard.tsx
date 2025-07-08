import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  Tooltip,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  TableChart as TableIcon,
  Restaurant as RestaurantIcon,
  Assessment as StatsIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { tableService } from '../../services/api';
import { Table as TableType, TableSummary } from '../../types';
import TableConfigurationForm from './TableConfigurationForm';

const TABLE_TYPES = [
  { value: 'standard', label: 'Standard' },
  { value: 'booth', label: 'Booth' },
  { value: 'bar', label: 'Bar' },
  { value: 'high_top', label: 'High Top' },
  { value: 'patio', label: 'Patio' },
  { value: 'private', label: 'Private' },
  { value: 'banquette', label: 'Banquette' },
  { value: 'communal', label: 'Communal' }
];

const TableManagementDashboard: React.FC = () => {
  const { user } = useAuth();
  const [tables, setTables] = useState<TableType[]>([]);
  const [summary, setSummary] = useState<TableSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    tableType: '',
    minCapacity: '',
    maxCapacity: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalTables, setTotalTables] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<TableType | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [tableToDelete, setTableToDelete] = useState<TableType | null>(null);

  const restaurantId = user?.restaurantId;

  useEffect(() => {
    console.log('Current user:', user);
    console.log('Restaurant ID:', restaurantId);
    if (restaurantId) {
      loadTables();
      loadSummary();
    } else {
      setError('No restaurant ID found. Please ensure your user account is associated with a restaurant.');
      setLoading(false);
    }
  }, [restaurantId, page, rowsPerPage, includeInactive, filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadTables = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Loading tables for restaurantId:', restaurantId);

      if (searchTerm) {
        // Use search API
        const searchFilters = {
          tableType: filters.tableType || undefined,
          minCapacity: filters.minCapacity ? parseInt(filters.minCapacity) : undefined,
          maxCapacity: filters.maxCapacity ? parseInt(filters.maxCapacity) : undefined
        };
        console.log('Searching tables with term:', searchTerm, 'filters:', searchFilters);
        const results = await tableService.searchTables(restaurantId!, searchTerm, searchFilters);
        setTables(results);
        setTotalTables(results.length);
      } else {
        // Use regular get tables API
        const options = {
          includeInactive,
          tableType: filters.tableType || undefined,
          page: page + 1,
          limit: rowsPerPage
        };
        console.log('Getting tables with options:', options);
        const result = await tableService.getTables(restaurantId!, options);
        console.log('Tables loaded:', result);
        setTables(result.tables);
        setTotalTables(result.total);
      }
    } catch (err: any) {
      console.error('Error loading tables:', err);
      console.error('Error response:', err.response?.data);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load tables';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const summaryData = await tableService.getSummary(restaurantId!);
      setSummary(summaryData);
    } catch (err) {
      console.error('Error loading summary:', err);
    }
  };

  const handleSearch = () => {
    setPage(0);
    loadTables();
  };

  const handleFilterChange = (field: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    setPage(0);
  };

  const clearFilters = () => {
    setFilters({
      tableType: '',
      minCapacity: '',
      maxCapacity: ''
    });
    setSearchTerm('');
    setPage(0);
  };

  const handleCreateTable = () => {
    setEditingTable(null);
    setDialogOpen(true);
  };

  const handleEditTable = (table: TableType) => {
    setEditingTable(table);
    setDialogOpen(true);
  };

  const handleDeleteTable = (table: TableType) => {
    setTableToDelete(table);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!tableToDelete) return;

    try {
      await tableService.deleteTable(tableToDelete.id);
      setDeleteConfirmOpen(false);
      setTableToDelete(null);
      loadTables();
      loadSummary();
    } catch (err) {
      setError('Failed to delete table');
      console.error('Error deleting table:', err);
    }
  };

  const handleTableSaved = () => {
    setDialogOpen(false);
    setEditingTable(null);
    loadTables();
    loadSummary();
  };

  const getTableTypeChip = (type: string) => {
    const typeConfig = TABLE_TYPES.find(t => t.value === type);
    return (
      <Chip 
        label={typeConfig?.label || type} 
        size="small" 
        variant="outlined"
      />
    );
  };

  if (!restaurantId) {
    return (
      <Alert severity="error">
        Restaurant access required
      </Alert>
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
            Table Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Configure your restaurant's table layout, capacity, and settings
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateTable}
          sx={{
            borderRadius: 2,
            px: 3,
            py: 1.5,
            fontWeight: 600,
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
            '&:hover': {
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
              transform: 'translateY(-1px)',
            },
          }}
        >
          Add New Table
        </Button>
      </Box>

      {/* Summary Cards */}
      {summary && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: 'white',
              border: 'none'
            }}>
              <CardContent sx={{ pb: '16px !important' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                      {summary.totalTables}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Total Tables
                    </Typography>
                  </Box>
                  <TableIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              color: 'white',
              border: 'none'
            }}>
              <CardContent sx={{ pb: '16px !important' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                      {summary.totalCapacity}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Total Capacity
                    </Typography>
                  </Box>
                  <RestaurantIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
              color: 'white',
              border: 'none'
            }}>
              <CardContent sx={{ pb: '16px !important' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                      {summary.averageCapacity.toFixed(1)}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Avg Capacity
                    </Typography>
                  </Box>
                  <StatsIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Search and Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: '#cbd5e1', 
                  mb: 0.5, 
                  fontSize: '0.875rem',
                  fontWeight: 500
                }}
              >
                Search Tables
              </Typography>
              <TextField
                fullWidth
                placeholder="Search tables..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                InputProps={{
                  endAdornment: (
                    <IconButton onClick={handleSearch}>
                      <SearchIcon />
                    </IconButton>
                  )
                }}
                sx={{
                  '& .MuiInputLabel-root': {
                    display: 'none',
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                variant="outlined"
                startIcon={<FilterIcon />}
                onClick={() => setShowFilters(!showFilters)}
                fullWidth
              >
                Filters
              </Button>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={includeInactive}
                    onChange={(e) => setIncludeInactive(e.target.checked)}
                  />
                }
                label="Include Inactive"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                variant="text"
                onClick={clearFilters}
                fullWidth
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>

          {showFilters && (
            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: '#cbd5e1', 
                    mb: 0.5, 
                    fontSize: '0.875rem',
                    fontWeight: 500
                  }}
                >
                  Table Type
                </Typography>
                <FormControl fullWidth>
                  <Select
                    value={filters.tableType}
                    onChange={(e) => handleFilterChange('tableType', e.target.value)}
                    sx={{
                      '& .MuiInputLabel-root': {
                        display: 'none',
                      }
                    }}
                  >
                    <MenuItem value="">All Types</MenuItem>
                    {TABLE_TYPES.map(type => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: '#cbd5e1', 
                    mb: 0.5, 
                    fontSize: '0.875rem',
                    fontWeight: 500
                  }}
                >
                  Min Capacity
                </Typography>
                <TextField
                  fullWidth
                  type="number"
                  value={filters.minCapacity}
                  onChange={(e) => handleFilterChange('minCapacity', e.target.value)}
                  sx={{
                    '& .MuiInputLabel-root': {
                      display: 'none',
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: '#cbd5e1', 
                    mb: 0.5, 
                    fontSize: '0.875rem',
                    fontWeight: 500
                  }}
                >
                  Max Capacity
                </Typography>
                <TextField
                  fullWidth
                  type="number"
                  value={filters.maxCapacity}
                  onChange={(e) => handleFilterChange('maxCapacity', e.target.value)}
                  sx={{
                    '& .MuiInputLabel-root': {
                      display: 'none',
                    }
                  }}
                />
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Tables List */}
      <Card>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Table Number</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Capacity</TableCell>
                <TableCell>Range</TableCell>
                <TableCell>Combinable</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : tables.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Typography color="textSecondary">
                      No tables found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                tables.map((table) => (
                  <TableRow 
                    key={table.id}
                    sx={{
                      '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.04)',
                        '& .MuiTableCell-root': {
                          color: 'inherit'
                        }
                      }
                    }}
                  >
                    <TableCell>
                      <Typography variant="subtitle2">
                        {table.number || 'Unnamed Table'}
                      </Typography>
                      {table.notes && (
                        <Typography variant="caption" color="textSecondary">
                          {table.notes}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {getTableTypeChip(table.tableType)}
                    </TableCell>
                    <TableCell>{table.capacity}</TableCell>
                    <TableCell>
                      {table.minCapacity}-{table.maxCapacity}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={table.isCombinable ? 'Yes' : 'No'} 
                        size="small"
                        color={table.isCombinable ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell>{table.priority}</TableCell>
                    <TableCell>
                      <Chip 
                        label={table.isActive ? 'Active' : 'Inactive'} 
                        size="small"
                        color={table.isActive ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Edit Table">
                        <IconButton 
                          size="small" 
                          onClick={() => handleEditTable(table)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Table">
                        <IconButton 
                          size="small" 
                          onClick={() => handleDeleteTable(table)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={totalTables}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </Card>

      {/* Table Configuration Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingTable ? 'Edit Table' : 'Create New Table'}
        </DialogTitle>
        <DialogContent>
          <TableConfigurationForm
            table={editingTable}
            restaurantId={restaurantId}
            onSave={handleTableSaved}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete table "{tableToDelete?.number}"? 
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>
            Cancel
          </Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TableManagementDashboard;