/**
 * app/console/layout.tsx
 *
 * Recruiter & Administrator console layout shell (§14.3).
 */

import { getCurrentUser } from '@/lib/auth/session'
import { ConsoleShell } from '@/components/console/ConsoleShell'

interface ConsoleLayoutProps {
  children: React.ReactNode
}

export default async function ConsoleLayout({ children }: ConsoleLayoutProps) {
  const user = await getCurrentUser()

  return <ConsoleShell user={user}>{children}</ConsoleShell>
}
