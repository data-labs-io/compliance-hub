# IP Fabric Compliance Dashboard - Documentation

## Overview

This directory contains technical documentation for the IP Fabric Compliance Dashboard project.

## Available Documentation

### Performance Optimizations
- **[Snapshot Loading Optimization](./snapshot-loading-optimization.md)** - Comprehensive guide to the snapshot loading performance improvements implemented in December 2025
  - 60-70% faster initial load times
  - Rate limiting optimization
  - API version caching
  - Parallel batch processing
  - Hover-based prefetching

## Quick Links

### For Developers
- **Configuration:** See [snapshot-loading-optimization.md#configuration](./snapshot-loading-optimization.md#configuration)
- **Testing:** See [snapshot-loading-optimization.md#testing--validation](./snapshot-loading-optimization.md#testing--validation)
- **Troubleshooting:** See [snapshot-loading-optimization.md#troubleshooting](./snapshot-loading-optimization.md#troubleshooting)

### For Operations
- **Environment Variables:** `NEXT_PUBLIC_RATE_LIMIT_INTERVAL` controls API rate limiting
- **Rollback:** See [snapshot-loading-optimization.md#rollback-instructions](./snapshot-loading-optimization.md#rollback-instructions)
- **Monitoring:** Check browser console for performance logs

## Documentation Standards

When adding new documentation:
1. Use clear, descriptive filenames (kebab-case)
2. Include table of contents for long documents
3. Provide code examples where applicable
4. Document configuration options
5. Include troubleshooting sections
6. Add rollback/recovery procedures
7. Keep changelog updated

## Contributing

When making changes to the codebase that affect:
- Performance
- Configuration
- Architecture
- User experience
- Deployment

Please update or create corresponding documentation in this directory.

---

**Last Updated:** December 2025
