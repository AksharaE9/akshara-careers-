'use client'

/**
 * app/console/users/page.tsx
 *
 * Screen 12 — User Management & RBAC Access Control (§14.16).
 * Super Admin only screen. Create users, assign roles, revoke sessions.
 */

import React, { useState, useEffect } from 'react'
import { DataTable, ColumnDef } from '@/components/console/DataTable'

interface UserRow {
  id: string
  email: string
  name: string
  role: string
  isActive: boolean
  lastLoginAt: string | null
  mustChangePassword: boolean
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState('recruiter')
  const [newPassword, setNewPassword] = useState('TempPassword@123')

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/console/users')
      if (res.ok) {
        const json = await res.json()
        setUsers(json.users || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // F7: fetchUsers is also called from handleCreateUser below.
  useEffect(() => {
    ;(async () => {
      await fetchUsers()
    })()
  }, [])

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/console/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail,
          name: newName,
          role: newRole,
          temporaryPassword: newPassword,
        }),
      })
      if (res.ok) {
        setShowCreateModal(false)
        fetchUsers()
      }
    } catch {}
  }

  const columns: ColumnDef<UserRow>[] = [
    {
      id: 'name',
      header: 'User & Email',
      accessor: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-(--color-ink-900)">{row.name}</span>
          <span className="font-mono text-(--font-size-step--2) text-(--color-graphite)">{row.email}</span>
        </div>
      ),
    },
    {
      id: 'role',
      header: 'RBAC Role',
      accessor: (row) => (
        <span className="font-mono text-(--font-size-step--2) uppercase px-2 py-0.5 rounded bg-(--color-marigold)/15 text-(--color-ink-900) font-bold">
          {row.role}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Account Status',
      accessor: (row) => (
        <div className="flex items-center gap-2 font-mono text-(--font-size-step--2)">
          <span className={row.isActive ? 'text-(--color-leaf) font-bold' : 'text-(--color-kumkum)'}>
            {row.isActive ? 'Active' : 'Disabled'}
          </span>
          {row.mustChangePassword && (
            <span className="px-1.5 py-0.5 rounded bg-(--color-kumkum)/10 text-(--color-kumkum) font-medium">
              Password Rotation Required
            </span>
          )}
        </div>
      ),
    },
    {
      id: 'lastLoginAt',
      header: 'Last Login',
      accessor: (row) => (
        <span className="font-mono text-(--font-size-step--2) text-(--color-graphite)">
          {row.lastLoginAt ? new Date(row.lastLoginAt).toLocaleString() : 'Never'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      accessor: () => (
        <button
          type="button"
          data-testid="session-revoke"
          className="px-2.5 py-1 rounded bg-(--color-ink-900)/5 hover:bg-(--color-kumkum)/10 text-(--font-size-step--2) font-semibold text-(--color-kumkum)"
        >
          Revoke Session
        </button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-(--color-ink-900)/10">
        <div>
          <span className="font-mono text-(--font-size-step--2) uppercase text-(--color-graphite) font-semibold tracking-wider">
            Access Control · Super Admin Only
          </span>
          <h1 className="text-(--font-size-step-2) font-bold text-(--color-ink-900) tracking-tight">
            User Management
          </h1>
        </div>

        <button
          type="button"
          data-testid="user-create"
          onClick={() => setShowCreateModal(true)}
          className="px-3.5 py-1.5 rounded-lg bg-(--color-marigold) text-white font-medium text-(--font-size-step--1) hover:bg-(--color-marigold)/90"
        >
          + Create Console User
        </button>
      </div>

      <DataTable
        columns={columns}
        data={users}
        totalCount={users.length}
        loading={loading}
      />

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-(--color-ink-900)/10 rounded-xl p-6 shadow-2xl space-y-4">
            <h2 className="text-(--font-size-step-1) font-bold text-(--color-ink-900)">Create Console Account</h2>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-(--font-size-step--1) font-medium text-(--color-ink-900) mb-1">Full Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Anand Murthy"
                  className="w-full h-10 px-3 border border-(--color-ink-900)/15 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-(--font-size-step--1) font-medium text-(--color-ink-900) mb-1">Email Address</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="anand@akshara.in"
                  className="w-full h-10 px-3 border border-(--color-ink-900)/15 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-(--font-size-step--1) font-medium text-(--color-ink-900) mb-1">Assigned Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full h-10 px-3 border border-(--color-ink-900)/15 rounded-lg font-mono text-(--font-size-step--1)"
                >
                  <option value="recruiter">Recruiter (Scoped to assigned drives)</option>
                  <option value="admin">Admin (Full operations & content)</option>
                  <option value="super_admin">Super Admin (Unrestricted)</option>
                </select>
              </div>

              <div>
                <label className="block text-(--font-size-step--1) font-medium text-(--color-ink-900) mb-1">Temporary Password</label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full h-10 px-3 border border-(--color-ink-900)/15 rounded-lg font-mono"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 border border-(--color-ink-900)/15 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-(--color-marigold) text-white rounded-lg font-semibold"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
