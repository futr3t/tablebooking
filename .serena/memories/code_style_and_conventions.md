# Code Style and Conventions

## TypeScript Configuration
- Target: ES2020
- Module: CommonJS
- Strict mode: Disabled (noImplicitAny: false)
- ES Module Interop: Enabled
- Source maps and declarations: Enabled

## Naming Conventions

### Files and Directories
- **Directories**: lowercase with hyphens (e.g., `booking-lock.ts`)
- **Files**: camelCase for most files, kebab-case for some services
- **Test files**: `*.test.ts` in `__tests__` directory

### Code Conventions
- **Classes**: PascalCase (e.g., `UserModel`, `BookingService`)
- **Functions/Methods**: camelCase (e.g., `createBooking`, `findById`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `JWT_SECRET`, `RATE_LIMIT_MAX`)
- **Interfaces/Types**: PascalCase (e.g., `AuthRequest`, `BookingMetadata`)
- **Enums**: PascalCase with UPPER_SNAKE_CASE values

### Database Conventions
- **Table names**: snake_case plural (e.g., `users`, `bookings`)
- **Column names**: snake_case (e.g., `customer_name`, `booking_date`)
- **Mapping**: Automatic conversion between snake_case (DB) and camelCase (JS)

## Code Patterns

### Error Handling
- Custom `AppError` class for application errors
- `asyncHandler` wrapper for async route handlers
- Centralized error middleware
- Graceful error messages with proper HTTP status codes

### Model Pattern (DAO)
```typescript
export class ModelName {
  static async findById(id: string): Promise<Type | null> { }
  static async create(data: CreateType): Promise<Type> { }
  static async update(id: string, updates: Partial<Type>): Promise<Type | null> { }
  static async delete(id: string): Promise<boolean> { }
}
```

### Service Pattern
- Business logic separated from controllers
- Static methods for stateless operations
- Clear separation of concerns

### Controller Pattern
- Use `asyncHandler` for all async operations
- Validate input early
- Return consistent API responses
- Status codes: 200 (OK), 201 (Created), 400 (Bad Request), 401 (Unauthorized), 409 (Conflict)

### API Response Format
```typescript
{
  success: boolean;
  data?: any;
  message?: string;
  error?: string;
}
```

## Best Practices
- NO comments in code unless specifically requested
- Clear, self-documenting code
- Comprehensive error logging with console.error
- Input validation using express-validator
- Proper TypeScript types (avoid 'any' where possible)
- Database transactions for atomic operations
- Redis caching with fallback handling