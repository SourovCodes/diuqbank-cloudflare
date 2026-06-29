import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import type { FilterOptions } from '@diuqbank/shared/types'
import { useAuth } from '../../context/AuthContext'
import { useFilterOptions } from '../../hooks/useFilterOptions'
import { api, type MergeBody, type MergeResponse } from '../../lib/api'
import { toastError, toastSuccess } from '../../lib/toast'
import { ErrorMessage } from '../../components/ui/ErrorMessage'
import { SearchableSelect } from '../../components/ui/SearchableSelect'
import {
  Button,
  Card,
  Field,
  FormActions,
  LoadingState,
  PageHeader,
  SecondaryLink,
  TextInput,
} from '../../components/admin/ui'

type MergeItem = { id: number; label: string; departmentId?: number }

type MergeConfig = {
  titlePlural: string
  nounSingular: string
  backTo: string
  departmentScoped?: boolean
  itemsOf: (opts: FilterOptions) => MergeItem[]
  merge: (token: string, body: MergeBody) => Promise<MergeResponse<unknown>>
  invalidateKeys: string[]
}

function MergePage({ config }: { config: MergeConfig }) {
  const { token } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: options, isPending, isError } = useFilterOptions()

  const [departmentId, setDepartmentId] = useState('')
  const [selected, setSelected] = useState<number[]>([])
  const [keepId, setKeepId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [preview, setPreview] = useState<MergeResponse<unknown>['preview'] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // The full candidate list, scoped to a department for course merges.
  const items = useMemo<MergeItem[]>(() => {
    if (!options) return []
    const all = config.itemsOf(options)
    if (!config.departmentScoped) return all
    if (!departmentId) return []
    return all.filter(i => String(i.departmentId) === departmentId)
  }, [options, config, departmentId])

  const visible = useMemo(
    () => (search ? items.filter(i => i.label.toLowerCase().includes(search.toLowerCase())) : items),
    [items, search],
  )

  const selectedItems = items.filter(i => selected.includes(i.id))

  function reset() {
    setSelected([])
    setKeepId(null)
    setPreview(null)
    setError(null)
  }

  function toggle(id: number) {
    setPreview(null)
    setError(null)
    setSelected(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      // Keep the keeper valid; default it to the first still-selected item.
      setKeepId(k => (k !== null && next.includes(k) ? k : (next[0] ?? null)))
      return next
    })
  }

  const mergeIds = keepId === null ? [] : selected.filter(id => id !== keepId)
  const canSubmit = keepId !== null && mergeIds.length > 0

  async function run(dryRun: boolean) {
    if (!token || keepId === null || !canSubmit) return
    setBusy(true)
    setError(null)
    try {
      const res = await config.merge(token, { keepId, mergeIds, dryRun })
      if (dryRun) {
        setPreview(res.preview ?? res.summary ?? null)
      } else {
        const s = res.summary ?? res.preview
        toastSuccess(
          `Merged ${mergeIds.length} ${config.nounSingular}(s)` +
            (s ? ` — ${s.questionsCombined} question(s) combined, ${s.submissionsMoved} submission(s) moved.` : '.'),
        )
        for (const key of config.invalidateKeys) {
          queryClient.invalidateQueries({ queryKey: [key] })
        }
        navigate(config.backTo)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Merge failed.')
      toastError(err, 'Merge failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title={`Merge ${config.titlePlural}`}
        subtitle={`Fold several ${config.nounSingular}s into one. The keeper stays; the rest are deleted and every reference is repointed to it. Questions that end up identical are merged automatically (the oldest survives).`}
        action={<SecondaryLink to={config.backTo}>Back</SecondaryLink>}
      />

      {isPending ? (
        <LoadingState label="Loading options" />
      ) : isError || !options ? (
        <ErrorMessage message="Failed to load options." />
      ) : (
        <Card className="space-y-5 p-6">
          {config.departmentScoped && (
            <Field label="Department" hint="Courses can only be merged within the same department.">
              <SearchableSelect
                placeholder="Select department"
                options={options.departments.map(d => ({ value: String(d.id), label: `${d.name} (${d.shortName})` }))}
                value={departmentId}
                onChange={v => { setDepartmentId(v); reset() }}
              />
            </Field>
          )}

          <Field label={`Select ${config.nounSingular}s to merge`} hint="Pick two or more, then choose which one to keep.">
            {config.departmentScoped && !departmentId ? (
              <p className="text-sm text-gray-400">Select a department first.</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-gray-400">Nothing to merge here.</p>
            ) : (
              <>
                <TextInput
                  placeholder="Search"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="mb-2"
                />
                <div className="max-h-72 divide-y divide-gray-100 overflow-y-auto rounded-md border border-gray-200">
                  {visible.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-gray-400">No matches.</p>
                  ) : (
                    visible.map(item => {
                      const checked = selected.includes(item.id)
                      return (
                        <label
                          key={item.id}
                          className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-gray-50"
                        >
                          <span className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggle(item.id)}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-gray-800">{item.label}</span>
                          </span>
                          {checked && (
                            <label className="flex items-center gap-1.5 text-xs text-gray-500">
                              <input
                                type="radio"
                                name="keeper"
                                checked={keepId === item.id}
                                onChange={() => { setKeepId(item.id); setPreview(null) }}
                                className="h-3.5 w-3.5 text-green-600 focus:ring-green-500"
                              />
                              keep
                            </label>
                          )}
                        </label>
                      )
                    })
                  )}
                </div>
                <p className="mt-1.5 text-xs text-gray-400">
                  {selected.length} selected
                  {keepId !== null && selectedItems.length > 0 && (
                    <> — keeping <span className="font-medium text-gray-600">{selectedItems.find(i => i.id === keepId)?.label}</span></>
                  )}
                </p>
              </>
            )}
          </Field>

          {preview && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-semibold">This merge will:</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                <li>delete {preview.itemsDeleted} {config.nounSingular}(s)</li>
                {typeof preview.coursesMerged === 'number' && preview.coursesMerged > 0 && (
                  <li>auto-merge {preview.coursesMerged} same-named course(s)</li>
                )}
                <li>combine {preview.questionsCombined} duplicate question(s)</li>
                <li>move {preview.submissionsMoved} submission(s)</li>
                {preview.manualSubmissionsMoved > 0 && (
                  <li>repoint {preview.manualSubmissionsMoved} manual submission(s)</li>
                )}
              </ul>
              <p className="mt-2 text-xs">This cannot be undone.</p>
            </div>
          )}

          {error && <ErrorMessage message={error} />}

          <FormActions>
            {!preview ? (
              <Button type="button" variant="secondary" disabled={!canSubmit || busy} onClick={() => run(true)}>
                {busy ? 'Checking...' : 'Preview merge'}
              </Button>
            ) : (
              <Button type="button" variant="danger" disabled={busy} onClick={() => run(false)}>
                {busy ? 'Merging...' : 'Confirm merge'}
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={() => navigate(config.backTo)}>
              Cancel
            </Button>
          </FormActions>
        </Card>
      )}
    </div>
  )
}

// --- Per-resource pages ------------------------------------------------------

export function AdminDepartmentsMergePage() {
  return (
    <MergePage
      config={{
        titlePlural: 'Departments',
        nounSingular: 'department',
        backTo: '/admin/departments',
        itemsOf: o => o.departments.map(d => ({ id: d.id, label: `${d.name} (${d.shortName})` })),
        merge: api.mergeDepartments,
        invalidateKeys: ['admin-departments', 'admin-courses', 'admin-questions', 'filter-options'],
      }}
    />
  )
}

export function AdminCoursesMergePage() {
  return (
    <MergePage
      config={{
        titlePlural: 'Courses',
        nounSingular: 'course',
        backTo: '/admin/courses',
        departmentScoped: true,
        itemsOf: o => o.courses.map(c => ({ id: c.id, label: c.name, departmentId: c.departmentId })),
        merge: api.mergeCourses,
        invalidateKeys: ['admin-courses', 'admin-questions', 'filter-options'],
      }}
    />
  )
}

export function AdminSemestersMergePage() {
  return (
    <MergePage
      config={{
        titlePlural: 'Semesters',
        nounSingular: 'semester',
        backTo: '/admin/semesters',
        itemsOf: o => o.semesters.map(s => ({ id: s.id, label: s.name })),
        merge: api.mergeSemesters,
        invalidateKeys: ['admin-semesters', 'admin-questions', 'filter-options'],
      }}
    />
  )
}

export function AdminExamTypesMergePage() {
  return (
    <MergePage
      config={{
        titlePlural: 'Exam Types',
        nounSingular: 'exam type',
        backTo: '/admin/exam-types',
        itemsOf: o => o.examTypes.map(e => ({ id: e.id, label: e.name })),
        merge: api.mergeExamTypes,
        invalidateKeys: ['admin-exam-types', 'admin-questions', 'filter-options'],
      }}
    />
  )
}
