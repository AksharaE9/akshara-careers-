/**
 * lib/auth/rbac.ts
 *
 * Authoritative RBAC Capability Engine (§14.2).
 * Three roles: 'recruiter' | 'admin' | 'super_admin'.
 *
 * Implemented as a single `can(user, capability, resource?)` function used across
 * middleware, route handlers, server actions, and UI components.
 */

export type UserRole = 'recruiter' | 'admin' | 'super_admin'

export type Capability =
  | 'view_pulse'
  | 'view_applications'
  | 'view_candidate_360'
  | 'change_stage'
  | 'add_note'
  | 'delete_note'
  | 'download_resume'
  | 'merge_candidates'
  | 'view_funnel_analytics'
  | 'view_traffic_analytics'
  | 'manage_jobs'
  | 'close_jobs'
  | 'manage_drives'
  | 'assign_recruiters'
  | 'merge_colleges'
  | 'view_security'
  | 'view_system'
  | 'edit_content'
  | 'export_data'
  | 'schedule_reports'
  | 'manage_users'
  | 'change_roles'
  | 'force_logout'
  | 'view_audit'
  | 'dpdp_delete'
  | 'rotate_password'

export interface RBACUser {
  id: string
  role: UserRole
  assignedDriveIds?: string[]
  assignedJobIds?: string[]
}

export interface ResourceContext {
  driveId?: string | null
  jobId?: string | null
  authorId?: string | null
  actorId?: string | null
}

export function can(
  user: RBACUser | null | undefined,
  capability: Capability,
  resource?: ResourceContext,
): boolean {
  if (!user) return false

  const { role } = user

  // Super Admin can do everything
  if (role === 'super_admin') return true

  switch (capability) {
    // ── Super Admin ONLY ──
    case 'manage_users':
    case 'change_roles':
    case 'force_logout':
    case 'dpdp_delete':
      return false // Handled above if super_admin

    // ── Admin & Super Admin ──
    case 'delete_note':
    case 'merge_candidates':
    case 'view_funnel_analytics':
    case 'view_traffic_analytics':
    case 'manage_jobs':
    case 'close_jobs':
    case 'assign_recruiters':
    case 'merge_colleges':
    case 'view_security':
    case 'view_system':
    case 'edit_content':
    case 'export_data':
    case 'schedule_reports':
      return role === 'admin'

    case 'view_audit':
      // Admin sees only own actions unless super_admin
      if (role === 'admin') {
        if (!resource?.actorId) return true // general view allowed for own filters
        return resource.actorId === user.id
      }
      return false

    // ── All Roles with Scoping ──
    case 'rotate_password':
    case 'change_stage':
    case 'add_note':
    case 'download_resume':
      return true

    case 'view_pulse':
    case 'view_applications':
    case 'view_candidate_360':
      if (role === 'admin') return true
      if (role === 'recruiter') {
        if (!resource || (!resource.driveId && !resource.jobId)) return true
        if (resource.driveId && user.assignedDriveIds?.includes(resource.driveId)) return true
        if (resource.jobId && user.assignedJobIds?.includes(resource.jobId)) return true
        // If neither matched and both were specified
        return false
      }
      return false

    case 'manage_drives':
      if (role === 'admin') return true
      if (role === 'recruiter') {
        if (!resource?.driveId) return false
        return user.assignedDriveIds?.includes(resource.driveId) ?? false
      }
      return false

    default:
      return false
  }
}
