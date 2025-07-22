# Task Completion Checklist

When completing any development task on this project, follow these steps:

## 1. Code Quality Checks

### TypeScript Compilation
- Ensure no TypeScript errors (project uses loose typing with strict: false)
- Check that imports are correct and types are properly defined
- Verify async/await usage is correct

### Code Style
- Follow existing patterns (Model/Service/Controller separation)
- Use consistent naming conventions (camelCase for functions, PascalCase for classes)
- Ensure proper error handling with try/catch blocks
- NO comments unless specifically requested

## 2. Testing

### Run Tests
```bash
cd backend
npm test                    # Run all tests
```

### Test Coverage Areas
- Availability algorithm edge cases
- Booking lock service scenarios  
- API endpoint validation
- Error handling paths

## 3. Database Considerations

### Schema Updates
- If adding new columns, update schema.sql
- Run migration scripts if needed
- Update model mapping functions (mapFromDb/mapToDb)
- Consider indexes for new queries

### Data Integrity
- Use transactions for multi-step operations
- Implement proper locking for concurrent access
- Validate foreign key relationships

## 4. API Standards

### Validation
- Use express-validator for input validation
- Return consistent error messages
- Validate business rules before database operations

### Security
- Sanitize all user inputs
- Check authentication/authorization
- Use parameterized queries (never string concatenation)
- Rate limit sensitive endpoints

## 5. Frontend Integration

### API Integration
- Update service files with new endpoints
- Handle loading and error states
- Implement proper TypeScript interfaces
- Test real-time updates if applicable

### UI/UX
- Follow Material-UI design patterns
- Ensure mobile responsiveness
- Add proper loading indicators
- Display user-friendly error messages

## 6. Performance

### Caching
- Invalidate Redis cache when data changes
- Implement cache-aside pattern
- Handle Redis connection failures gracefully

### Database Optimization
- Use appropriate indexes
- Avoid N+1 queries
- Batch operations where possible

## 7. Deployment Readiness

### Environment Variables
- Document any new environment variables
- Update .env.example
- Ensure defaults for optional features

### Error Handling
- Log errors appropriately
- Return user-friendly messages
- Don't expose internal details

## 8. Documentation

### Update CLAUDE.md if:
- Adding major features
- Changing architecture
- Modifying deployment process

### Code Documentation
- Keep code self-documenting
- Update TypeScript interfaces
- Maintain consistent patterns

## Important Reminders
- NEVER add comments unless requested
- Test concurrent operations (booking conflicts)
- Verify timezone handling for bookings
- Check role-based permissions
- Ensure backward compatibility