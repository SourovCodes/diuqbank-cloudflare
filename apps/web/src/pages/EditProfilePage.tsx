import { useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { Avatar } from '../components/ui/Avatar'
import { Spinner } from '../components/ui/Spinner'
import { ErrorMessage } from '../components/ui/ErrorMessage'

export function EditProfilePage() {
  const { user, token, updateUser } = useAuth()
  const [name, setName] = useState(user?.name ?? '')
  const [username, setUsername] = useState(user?.username ?? '')
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const updated = await api.updateMe(token, { name, username })
      updateUser(updated)
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes.')
    } finally {
      setSaving(false)
    }
  }

  async function handleImageUpload(file: File) {
    if (!token) return
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5 MB.')
      return
    }
    setUploadingImage(true)
    setError(null)
    try {
      const updated = await api.uploadImage(token, file)
      updateUser(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image.')
    } finally {
      setUploadingImage(false)
    }
  }

  if (!user) return null

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Edit Profile</h1>

      <div className="space-y-6">
        {/* Avatar section */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">Profile Picture</h2>
          <div className="flex items-center gap-4">
            {uploadingImage ? <Spinner className="h-12 w-12" /> : <Avatar name={user.name} image={user.image} size={12} />}
            <div>
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={uploadingImage}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
              >
                {uploadingImage ? 'Uploading…' : 'Change photo'}
              </button>
              <p className="mt-1 text-xs text-gray-400">PNG, JPG, GIF, WebP · max 5 MB</p>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f) }}
              />
            </div>
          </div>
        </div>

        {/* Profile form */}
        <form onSubmit={handleSave} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Account Info</h2>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Full name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Username</label>
            <div className="flex items-center rounded-lg border border-gray-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
              <span className="pl-3 text-sm text-gray-400">@</span>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="flex-1 rounded-r-lg px-2 py-2 text-sm text-gray-900 focus:outline-none"
                pattern="[a-z0-9._\-]+"
                title="Lowercase letters, numbers, dots, underscores, hyphens"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Email</label>
            <input
              type="text"
              value={user.email}
              disabled
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
            />
          </div>

          {error && <ErrorMessage message={error} />}
          {success && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              Profile updated successfully.
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  )
}
