import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getTables,
  getTable,
  createTable,
  updateTable,
  deleteTable,
  bulkTableOperations,
  getTableSummary,
  searchTables
} from '../controllers/table';

const router = Router();

// All table routes require authentication
router.use(authenticate);

// Get all tables for a restaurant with filtering and pagination
router.get('/restaurant/:restaurantId', getTables);

// Get table summary statistics for a restaurant
router.get('/restaurant/:restaurantId/summary', getTableSummary);

// Search tables in a restaurant
router.get('/restaurant/:restaurantId/search', searchTables);

// Bulk operations for tables
router.post('/restaurant/:restaurantId/bulk', bulkTableOperations);

// Get a specific table
router.get('/:id', getTable);

// Create a new table
router.post('/restaurant/:restaurantId', createTable);

// Update a table
router.put('/:id', updateTable);

// Delete a table (soft delete)
router.delete('/:id', deleteTable);

export default router;