/**
 * tests/unit/rbac.test.ts
 *
 * Unit tests asserting every cell of the RBAC matrix (§14.2).
 */

import { describe, it, expect } from 'vitest'
import { can, RBACUser } from '../../lib/auth/rbac'

describe('RBAC Capability Matrix (§14.2)', () => {
  const superAdmin: RBACUser = { id: 'sa-1', role: 'super_admin' }
  const admin: RBACUser = { id: 'adm-1', role: 'admin' }
  const recruiter: RBACUser = {
    id: 'rec-1',
    role: 'recruiter',
    assignedDriveIds: ['drv-1', 'drv-2'],
    assignedJobIds: ['job-1'],
  }

  it('super_admin has full unrestricted permissions', () => {
    expect(can(superAdmin, 'manage_users')).toBe(true)
    expect(can(superAdmin, 'change_roles')).toBe(true)
    expect(can(superAdmin, 'force_logout')).toBe(true)
    expect(can(superAdmin, 'dpdp_delete')).toBe(true)
    expect(can(superAdmin, 'view_audit')).toBe(true)
    expect(can(superAdmin, 'edit_content')).toBe(true)
    expect(can(superAdmin, 'delete_note')).toBe(true)
    expect(can(superAdmin, 'view_funnel_analytics')).toBe(true)
  })

  it('admin has access to operational insight, content, and system health but NOT super_admin actions', () => {
    expect(can(admin, 'manage_users')).toBe(false)
    expect(can(admin, 'change_roles')).toBe(false)
    expect(can(admin, 'force_logout')).toBe(false)
    expect(can(admin, 'dpdp_delete')).toBe(false)

    // Admin allowed capabilities
    expect(can(admin, 'delete_note')).toBe(true)
    expect(can(admin, 'view_funnel_analytics')).toBe(true)
    expect(can(admin, 'view_traffic_analytics')).toBe(true)
    expect(can(admin, 'manage_jobs')).toBe(true)
    expect(can(admin, 'close_jobs')).toBe(true)
    expect(can(admin, 'manage_drives')).toBe(true)
    expect(can(admin, 'merge_colleges')).toBe(true)
    expect(can(admin, 'view_security')).toBe(true)
    expect(can(admin, 'view_system')).toBe(true)
    expect(can(admin, 'edit_content')).toBe(true)
    expect(can(admin, 'export_data')).toBe(true)
  })

  it('recruiter has access only to assigned drives/jobs and basic stage/note mutations', () => {
    expect(can(recruiter, 'manage_users')).toBe(false)
    expect(can(recruiter, 'manage_jobs')).toBe(false)
    expect(can(recruiter, 'delete_note')).toBe(false)
    expect(can(recruiter, 'view_funnel_analytics')).toBe(false)
    expect(can(recruiter, 'view_traffic_analytics')).toBe(false)
    expect(can(recruiter, 'merge_colleges')).toBe(false)

    // Scoped permissions
    expect(can(recruiter, 'view_applications', { driveId: 'drv-1' })).toBe(true)
    expect(can(recruiter, 'view_applications', { driveId: 'drv-3' })).toBe(false)
    expect(can(recruiter, 'view_applications', { jobId: 'job-1' })).toBe(true)
    expect(can(recruiter, 'manage_drives', { driveId: 'drv-1' })).toBe(true)
    expect(can(recruiter, 'manage_drives', { driveId: 'drv-99' })).toBe(false)

    // Stage changes and note adding
    expect(can(recruiter, 'change_stage')).toBe(true)
    expect(can(recruiter, 'add_note')).toBe(true)
    expect(can(recruiter, 'download_resume')).toBe(true)
    expect(can(recruiter, 'rotate_password')).toBe(true)
  })
})
