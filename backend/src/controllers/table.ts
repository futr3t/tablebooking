import { Request, Response } from 'express';
import { TableModel } from '../models/Table';
import { AuthRequest, ApiResponse, Table, BulkTableOperation } from '../types';
import { createError, asyncHandler } from '../middleware/error';

export const getTables = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { restaurantId } = req.params;
  const { 
    includeInactive, 
    tableType, 
    page, 
    limit 
  } = req.query;

  if (!req.user) {
    throw createError('Authentication required', 401);
  }

  // Check restaurant access
  if (req.user.role !== 'super_admin' && req.user.restaurantId !== restaurantId) {
    throw createError('Access denied to this restaurant', 403);
  }

  const result = await TableModel.findByRestaurant(restaurantId, {
    includeInactive: includeInactive === 'true',
    tableType: tableType as string,
    page: page ? parseInt(page as string) : undefined,
    limit: limit ? parseInt(limit as string) : undefined
  });

  res.json({
    success: true,
    data: result
  } as ApiResponse);
});

export const getTable = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!req.user) {
    throw createError('Authentication required', 401);
  }

  const table = await TableModel.findById(id);
  if (!table) {
    throw createError('Table not found', 404);
  }

  // Check access permissions
  if (req.user.role !== 'super_admin' && req.user.restaurantId !== table.restaurantId) {
    throw createError('Access denied to this table', 403);
  }

  res.json({
    success: true,
    data: table
  } as ApiResponse);
});

export const createTable = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { restaurantId } = req.params;
  const tableData = req.body;

  if (!req.user) {
    throw createError('Authentication required', 401);
  }

  // Check restaurant access
  if (req.user.role !== 'super_admin' && req.user.restaurantId !== restaurantId) {
    throw createError('Access denied to this restaurant', 403);
  }

  // Validate required fields
  if (!tableData.number || !tableData.capacity) {
    throw createError('Table number and capacity are required', 400);
  }

  const table = await TableModel.create({
    restaurantId,
    ...tableData,
    minCapacity: tableData.minCapacity || Math.max(1, tableData.capacity - 2),
    maxCapacity: tableData.maxCapacity || tableData.capacity + 2
  });

  res.status(201).json({
    success: true,
    data: table,
    message: 'Table created successfully'
  } as ApiResponse);
});

export const updateTable = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const updates = req.body;

  if (!req.user) {
    throw createError('Authentication required', 401);
  }

  const existingTable = await TableModel.findById(id);
  if (!existingTable) {
    throw createError('Table not found', 404);
  }

  // Check access permissions
  if (req.user.role !== 'super_admin' && req.user.restaurantId !== existingTable.restaurantId) {
    throw createError('Access denied to this table', 403);
  }

  const updatedTable = await TableModel.update(id, updates);
  if (!updatedTable) {
    throw createError('Failed to update table', 500);
  }

  res.json({
    success: true,
    data: updatedTable,
    message: 'Table updated successfully'
  } as ApiResponse);
});

export const deleteTable = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!req.user) {
    throw createError('Authentication required', 401);
  }

  const table = await TableModel.findById(id);
  if (!table) {
    throw createError('Table not found', 404);
  }

  // Check access permissions
  if (req.user.role !== 'super_admin' && req.user.restaurantId !== table.restaurantId) {
    throw createError('Access denied to this table', 403);
  }

  const success = await TableModel.delete(id);
  if (!success) {
    throw createError('Failed to delete table', 500);
  }

  res.json({
    success: true,
    message: 'Table deleted successfully'
  } as ApiResponse);
});

export const bulkTableOperations = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { restaurantId } = req.params;
  const { operation, tables }: BulkTableOperation = req.body;

  if (!req.user) {
    throw createError('Authentication required', 401);
  }

  // Check restaurant access
  if (req.user.role !== 'super_admin' && req.user.restaurantId !== restaurantId) {
    throw createError('Access denied to this restaurant', 403);
  }

  if (!operation || !Array.isArray(tables) || tables.length === 0) {
    throw createError('Operation and tables array are required', 400);
  }

  let result;
  switch (operation) {
    case 'create':
      // Add restaurantId to each table
      const tablesToCreate = tables.map(table => ({
        ...table,
        restaurantId,
        minCapacity: table.minCapacity || Math.max(1, (table.capacity || 2) - 2),
        maxCapacity: table.maxCapacity || (table.capacity || 2) + 2
      }));
      result = await TableModel.bulkCreate(tablesToCreate);
      break;

    case 'update':
      result = [];
      for (const tableUpdate of tables) {
        if (!tableUpdate.id) {
          throw createError('Table ID is required for updates', 400);
        }
        const updated = await TableModel.update(tableUpdate.id, tableUpdate);
        if (updated) {
          result.push(updated);
        }
      }
      break;

    case 'delete':
      result = [];
      for (const table of tables) {
        if (!table.id) {
          throw createError('Table ID is required for deletion', 400);
        }
        const success = await TableModel.delete(table.id);
        result.push({ id: table.id, deleted: success });
      }
      break;

    default:
      throw createError('Invalid operation. Must be create, update, or delete', 400);
  }

  res.json({
    success: true,
    data: result,
    message: `Bulk ${operation} operation completed successfully`
  } as ApiResponse);
});

export const getTableSummary = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { restaurantId } = req.params;

  if (!req.user) {
    throw createError('Authentication required', 401);
  }

  // Check restaurant access
  if (req.user.role !== 'super_admin' && req.user.restaurantId !== restaurantId) {
    throw createError('Access denied to this restaurant', 403);
  }

  const summary = await TableModel.getSummary(restaurantId);

  res.json({
    success: true,
    data: summary
  } as ApiResponse);
});

export const searchTables = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { restaurantId } = req.params;
  const { 
    q: searchTerm, 
    tableType, 
    minCapacity, 
    maxCapacity 
  } = req.query;

  if (!req.user) {
    throw createError('Authentication required', 401);
  }

  // Check restaurant access
  if (req.user.role !== 'super_admin' && req.user.restaurantId !== restaurantId) {
    throw createError('Access denied to this restaurant', 403);
  }

  const tables = await TableModel.search(
    restaurantId,
    searchTerm as string || '',
    {
      tableType: tableType as string,
      minCapacity: minCapacity ? parseInt(minCapacity as string) : undefined,
      maxCapacity: maxCapacity ? parseInt(maxCapacity as string) : undefined
    }
  );

  res.json({
    success: true,
    data: tables
  } as ApiResponse);
});