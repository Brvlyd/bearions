'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, Pencil, Trash2 } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'

interface User {
  id: string
  email: string
  full_name: string | null
  phone?: string | null
  address?: string | null
  is_approved: boolean
  created_at: string
  updated_at: string
}

export default function UsersManagementPage() {
  const { tr } = useLanguage()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [editFormData, setEditFormData] = useState({
    full_name: '',
    phone: '',
    address: ''
  })
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (error: any) {
      console.error('Error loading users:', error)
      setMessage({ type: 'error', text: tr('Failed to load users', 'Gagal memuat pengguna') })
    } finally {
      setLoading(false)
    }
  }

  const openEditModal = (user: User) => {
    setSelectedUser(user)
    setEditFormData({
      full_name: user.full_name || '',
      phone: user.phone || '',
      address: user.address || ''
    })
    setShowEditModal(true)
    setMessage(null)
  }

  const closeEditModal = () => {
    setShowEditModal(false)
    setSelectedUser(null)
    setEditFormData({
      full_name: '',
      phone: '',
      address: ''
    })
  }

  const handleSaveEdit = async () => {
    if (!selectedUser) return

    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: editFormData.full_name.trim() || null,
          phone: editFormData.phone.trim() || null,
          address: editFormData.address.trim() || null
        })
        .eq('id', selectedUser.id)

      if (error) throw error

      setMessage({ type: 'success', text: tr('User updated successfully!', 'Pengguna berhasil diperbarui!') })
      loadUsers()
      closeEditModal()
    } catch (error: any) {
      console.error('Error updating user:', error)
      setMessage({ type: 'error', text: error.message || tr('Failed to update user', 'Gagal memperbarui pengguna') })
    }
  }

  const openDeleteModal = (user: User) => {
    setSelectedUser(user)
    setShowDeleteModal(true)
  }

  const closeDeleteModal = () => {
    setShowDeleteModal(false)
    setSelectedUser(null)
  }

  const handleDeleteUser = async () => {
    if (!selectedUser) return

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', selectedUser.id)

      if (error) throw error

      setMessage({ type: 'success', text: tr('User deleted successfully!', 'Pengguna berhasil dihapus!') })
      loadUsers()
      closeDeleteModal()
    } catch (error: any) {
      console.error('Error deleting user:', error)
      setMessage({ type: 'error', text: error.message || tr('Failed to delete user', 'Gagal menghapus pengguna') })
      closeDeleteModal()
    }
  }

  const getFilteredUsers = () => {
    let filtered = [...users]

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(u =>
        (u.full_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.phone?.includes(searchQuery)
      )
    }

    return filtered
  }

  const filteredUsers = getFilteredUsers()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black mb-2">{tr('User Management', 'Manajemen Pengguna')}</h1>
        <p className="text-gray-600">{tr('Manage and monitor registered users', 'Kelola dan pantau pengguna terdaftar')}</p>
      </div>

      {/* Message Alert */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">{tr('Total Users', 'Total Pengguna')}</p>
          <p className="text-2xl font-bold text-black">{users.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">{tr('Users This Month', 'Pengguna Bulan Ini')}</p>
          <p className="text-2xl font-bold text-blue-600">
            {users.filter(u => {
              const userDate = new Date(u.created_at)
              const now = new Date()
              return userDate.getMonth() === now.getMonth() && userDate.getFullYear() === now.getFullYear()
            }).length}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">{tr('Last 7 Days', '7 Hari Terakhir')}</p>
          <p className="text-2xl font-bold text-green-600">
            {users.filter(u => {
              const userDate = new Date(u.created_at)
              const weekAgo = new Date()
              weekAgo.setDate(weekAgo.getDate() - 7)
              return userDate >= weekAgo
            }).length}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder={tr('Search by name, email, or phone...', 'Cari berdasarkan nama, email, atau telepon...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 pr-12 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-gray-600"
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {tr('User', 'Pengguna')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {tr('Contact', 'Kontak')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {tr('Joined', 'Bergabung')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {tr('Actions', 'Aksi')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    {tr('No users found', 'Tidak ada pengguna')}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-semibold">
                          {(user.full_name || user.email || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-black">{user.full_name || tr('No name', 'Tanpa nama')}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <p>{user.phone || '-'}</p>
                      <p className="text-xs text-gray-400">{user.address || '-'}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="text-gray-600 hover:text-black p-2 hover:bg-gray-100 rounded"
                          title={tr('Edit', 'Ubah')}
                        >
                          <Pencil className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(user)}
                          className="text-gray-600 hover:text-red-600 p-2 hover:bg-red-50 rounded"
                          title={tr('Delete', 'Hapus')}
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-black mb-4">{tr('Edit User', 'Ubah Pengguna')}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  {tr('Full Name *', 'Nama Lengkap *')}
                </label>
                <input
                  type="text"
                  value={editFormData.full_name}
                  onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-black"
                  placeholder={tr('Enter user\'s full name', 'Masukkan nama lengkap pengguna')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  {tr('Phone', 'Telepon')}
                </label>
                <input
                  type="text"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-black"
                  placeholder={tr('e.g., 081234567890', 'contoh: 081234567890')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  {tr('Address', 'Alamat')}
                </label>
                <textarea
                  value={editFormData.address}
                  onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-black"
                  rows={3}
                />
              </div>

            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={closeEditModal}
                className="px-4 py-2 bg-gray-100 text-black rounded hover:bg-gray-200 transition font-medium"
              >
                {tr('Cancel', 'Batal')}
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition font-medium"
              >
                {tr('Save Changes', 'Simpan Perubahan')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-black mb-4">{tr('Delete User', 'Hapus Pengguna')}</h3>
            <p className="text-gray-600 mb-6">
              {tr('Are you sure you want to delete', 'Yakin ingin menghapus')} <strong>{selectedUser.full_name || selectedUser.email}</strong>? {tr('This action cannot be undone.', 'Tindakan ini tidak dapat dibatalkan.')}
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={closeDeleteModal}
                className="px-4 py-2 bg-gray-100 text-black rounded hover:bg-gray-200 transition font-medium"
              >
                {tr('Cancel', 'Batal')}
              </button>
              <button
                onClick={handleDeleteUser}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition font-medium"
              >
                {tr('Delete', 'Hapus')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
