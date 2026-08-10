'use client'

/**
 * components/console/DataTable.tsx
 *
 * Universal DataTable Primitive (§14.3.5).
 * - Server-side pagination, 25 rows hard-capped.
 * - URL parameter-backed sorting and filtering.
 * - Skeleton loading states (zero layout shift).
 * - Multi-state empty/error displays.
 * - Bulk select with sticky action bar.
 * - Comfortable / compact row density toggle.
 */

import React, { useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

export interface ColumnDef<T> {
  id: string
  header: string
  accessor?: (row: T) => React.ReactNode
  sortable?: boolean
  className?: string
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[]
  data: T[]
  totalCount: number
  pageSize?: number
  loading?: boolean
  error?: string | null
  emptyMessage?: string
  noFilterResultsMessage?: string
  hasActiveFilters?: boolean
  selectedIds?: string[]
  onSelectionChange?: (ids: string[]) => void
  bulkActions?: React.ReactNode
  keyField?: keyof T
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  totalCount,
  pageSize = 25,
  loading = false,
  error = null,
  emptyMessage = 'No records found in this view.',
  noFilterResultsMessage = 'No records match your active filters.',
  hasActiveFilters = false,
  selectedIds = [],
  onSelectionChange,
  bulkActions,
  keyField = 'id',
}: DataTableProps<T>) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable')

  const currentPage = parseInt(searchParams.get('page') || '1', 10)
  const currentSort = searchParams.get('sort') || ''
  const currentOrder = searchParams.get('order') || 'desc'
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  const handleSort = (colId: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (currentSort === colId) {
      params.set('order', currentOrder === 'asc' ? 'desc' : 'asc')
    } else {
      params.set('sort', colId)
      params.set('order', 'asc')
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(newPage))
    router.push(`${pathname}?${params.toString()}`)
  }

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onSelectionChange) return
    if (e.target.checked) {
      const allIds = data.map((item) => String(item[keyField]))
      onSelectionChange(allIds)
    } else {
      onSelectionChange([])
    }
  }

  const handleSelectRow = (id: string) => {
    if (!onSelectionChange) return
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((item) => item !== id))
    } else {
      onSelectionChange([...selectedIds, id])
    }
  }

  const allSelected = data.length > 0 && data.every((item) => selectedIds.includes(String(item[keyField])))

  return (
    <div data-testid="datatable" className="flex flex-col w-full bg-[--color-chalk] border border-[--color-ink-900]/10 rounded-lg overflow-hidden shadow-xs">
      {/* Table Top Controls */}
      <div className="px-4 py-2.5 bg-white border-b border-[--color-ink-900]/10 flex items-center justify-between text-[--font-size-step--2]">
        <div className="flex items-center gap-3 text-[--color-graphite]">
          <span>
            Showing <strong className="text-[--color-ink-900] font-mono tabular-nums">{Math.min(data.length, totalCount)}</strong> of{' '}
            <strong className="text-[--color-ink-900] font-mono tabular-nums">{totalCount}</strong> records
          </span>
          {selectedIds.length > 0 && (
            <span className="px-2 py-0.5 rounded bg-[--color-marigold]/15 text-[--color-ink-900] font-medium font-mono">
              {selectedIds.length} selected
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDensity(density === 'comfortable' ? 'compact' : 'comfortable')}
            className="px-2 py-1 border border-[--color-ink-900]/15 rounded hover:bg-[--color-ink-900]/5 text-[--color-ink-900] font-mono"
            title="Toggle row density"
          >
            {density === 'comfortable' ? 'Compact' : 'Comfortable'}
          </button>
        </div>
      </div>

      {/* Sticky Bulk Action Bar */}
      {selectedIds.length > 0 && bulkActions && (
        <div data-testid="bulk-action-bar" className="sticky top-16 z-20 bg-[--color-ink-900] text-white px-4 py-2 flex items-center justify-between">
          <span className="text-[--font-size-step--1] font-medium">
            {selectedIds.length} items selected for bulk action
          </span>
          <div className="flex items-center gap-2">{bulkActions}</div>
        </div>
      )}

      {/* Table View */}
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[--color-chalk] border-b border-[--color-ink-900]/10 text-[--font-size-step--2] uppercase font-mono tracking-wider text-[--color-graphite]">
              {onSelectionChange && (
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleSelectAll}
                    className="rounded border-[--color-ink-900]/20 text-[--color-marigold] focus:ring-[--color-marigold]"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.id}
                  onClick={() => col.sortable && handleSort(col.id)}
                  className={`p-3 font-semibold ${col.sortable ? 'cursor-pointer hover:text-[--color-ink-900]' : ''} ${col.className || ''}`}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && currentSort === col.id && (
                      <span className="text-[--color-marigold]">{currentOrder === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-[--color-ink-900]/5 bg-white">
            {loading ? (
              // Skeleton rows (zero layout shift)
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {onSelectionChange && <td className="p-3 w-10"><div className="h-4 w-4 bg-[--color-ink-900]/10 rounded" /></td>}
                  {columns.map((col) => (
                    <td key={col.id} className="p-3">
                      <div className="h-4 bg-[--color-ink-900]/10 rounded w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={columns.length + (onSelectionChange ? 1 : 0)} className="p-8 text-center text-[--color-kumkum]">
                  <p className="font-medium text-[--font-size-step-0]">Failed to load data</p>
                  <p className="text-[--font-size-step--1] mt-1 opacity-80">{error}</p>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (onSelectionChange ? 1 : 0)} className="p-12 text-center text-[--color-graphite]">
                  <p className="font-medium text-[--font-size-step-0] text-[--color-ink-900]">
                    {hasActiveFilters ? noFilterResultsMessage : emptyMessage}
                  </p>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={() => router.push(pathname)}
                      className="mt-3 text-[--font-size-step--1] text-[--color-marigold] underline font-medium"
                    >
                      Clear active filters
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              data.map((row, idx) => {
                const rowId = String(row[keyField] || idx)
                const isSelected = selectedIds.includes(rowId)
                const paddingClass = density === 'comfortable' ? 'py-3.5 px-3' : 'py-2 px-3'

                return (
                  <tr
                    key={rowId}
                    data-testid={`datatable-row-${rowId}`}
                    className={`hover:bg-[--color-ink-900]/[0.02] transition-colors ${
                      isSelected ? 'bg-[--color-marigold]/5' : ''
                    }`}
                  >
                    {onSelectionChange && (
                      <td className={`${paddingClass} w-10 text-center`}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(rowId)}
                          className="rounded border-[--color-ink-900]/20 text-[--color-marigold] focus:ring-[--color-marigold]"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.id} className={`${paddingClass} text-[--font-size-step--1] text-[--color-ink-900] ${col.className || ''}`}>
                        {col.accessor ? col.accessor(row) : String(row[col.id] ?? '')}
                      </td>
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div data-testid="datatable-pagination" className="px-4 py-3 bg-[--color-chalk] border-t border-[--color-ink-900]/10 flex items-center justify-between text-[--font-size-step--1]">
        <span className="text-[--color-graphite]">
          Page <strong className="font-mono tabular-nums text-[--color-ink-900]">{currentPage}</strong> of{' '}
          <strong className="font-mono tabular-nums text-[--color-ink-900]">{totalPages}</strong>
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={currentPage <= 1 || loading}
            onClick={() => handlePageChange(currentPage - 1)}
            className="px-3 py-1 bg-white border border-[--color-ink-900]/15 rounded text-[--font-size-step--2] font-medium text-[--color-ink-900] disabled:opacity-40 hover:bg-[--color-ink-900]/5"
          >
            &larr; Previous
          </button>
          <button
            type="button"
            disabled={currentPage >= totalPages || loading}
            onClick={() => handlePageChange(currentPage + 1)}
            className="px-3 py-1 bg-white border border-[--color-ink-900]/15 rounded text-[--font-size-step--2] font-medium text-[--color-ink-900] disabled:opacity-40 hover:bg-[--color-ink-900]/5"
          >
            Next &rarr;
          </button>
        </div>
      </div>
    </div>
  )
}
