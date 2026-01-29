# Playwright Tests

## Authentication Setup

Tests use Playwright's `storageState` pattern for authentication.

### How It Works

1. **`auth.setup.ts`** runs first (setup project)
   - Authenticates as super admin via NextAuth credentials API
   - Saves session to `playwright/.auth/user.json`
   
2. **Main tests** use the saved session
   - `playwright.config.ts` configures `storageState` 
   - All tests run with super admin privileges

### Running Tests

```bash
# Run all tests (auth setup runs automatically)
npx playwright test

# Run specific test file
npx playwright test tests/ifab-features.spec.ts

# Run with UI
npx playwright test --ui

# Debug mode
npx playwright test --debug
```

### Auth Credentials

- Email: `super@example.com`
- Password: `super123`

Located in `tests/auth.setup.ts` - update if credentials change.

### Troubleshooting

If tests fail with "not authenticated":

1. Delete auth cache: `rm -rf playwright/.auth`
2. Re-run tests (setup will recreate auth)

If auth setup fails:
- Check dev server is running on `http://localhost:3000`
- Verify credentials exist in database
- Check NextAuth credentials provider is enabled

### Future Agent Chats

✅ **This setup will work in future sessions** because:
- Setup script (`auth.setup.ts`) is committed
- Config (`playwright.config.ts`) is committed  
- Setup runs automatically on every test execution
- No manual intervention needed

## Test Structure

- `auth.setup.ts` - Authentication setup (runs first)
- `ifab-features.spec.ts` - IFAB vs Custom questions tests
- `laws-simple.spec.ts` - Legacy tests (may need auth updates)
- `laws-tagging-system.spec.ts` - Legacy tests (may need auth updates)

## Known Issues

- Session persistence can be flaky with NextAuth + Playwright
- Some UI selectors may need adjustment as UI evolves
- Screenshots saved to `test-results/` for debugging
