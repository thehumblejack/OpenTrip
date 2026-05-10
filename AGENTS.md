<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 🚨 STRICT DATA DELETION SECURITY PROTOCOL 🚨

**CRITICAL RULE FOR ALL AI ASSISTANTS WORKING IN THIS PROJECT:**
Before writing code that executes `delete()` on the database, OR before modifying core data synchronization logic (`syncTripToSupabase`), OR before replacing any file content that handles user data persistence:
1. **You MUST explicitly warn the user** about the potential for data loss.
2. **You MUST ask for explicit permission** before writing or executing the destructive change.
3. NEVER assume it is safe to rewrite data synchronization flows without testing or warning first.
