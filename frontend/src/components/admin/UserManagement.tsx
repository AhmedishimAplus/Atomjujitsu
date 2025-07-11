import React, { useState } from 'react';
import { searchUsers, getUserById, deleteUser } from '../../services/api';
import { User } from '../../types';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Card } from '../ui/Card';
import { Search, Trash2, Eye } from 'lucide-react';
import Modal from '../ui/Modal';

const UserManagement: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) {
      setError('Please enter an email or phone number to search');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      const result = await searchUsers(searchQuery);
      setUsers(result);
      
      if (result.length === 0) {
        setError('No users found matching your search criteria');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to search users');
    } finally {
      setLoading(false);
    }
  };

  const handleViewUser = async (userId: string) => {
    try {
      setLoading(true);
      setError('');
      const user = await getUserById(userId);
      setSelectedUser(user);
      setIsModalOpen(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to get user details');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      setLoading(true);
      setError('');
      await deleteUser(userToDelete.id);
      setSuccess(`User ${userToDelete.name} was deleted successfully`);
      setUsers(users.filter(user => user.id !== userToDelete.id));
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">User Management</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      <Card className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4">Search Users</h2>
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by email or phone number"
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? 'Searching...' : (
              <div className="flex items-center gap-1">
                <Search size={16} />
                <span>Search</span>
              </div>
            )}
          </Button>
        </form>
        <p className="text-sm text-gray-500 mt-2">
          Enter an email address or phone number to search for a specific cashier.
        </p>
      </Card>

      {users.length > 0 && (
        <Card className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Search Results</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr>
                  <th className="py-2 px-4 border-b text-left">Name</th>
                  <th className="py-2 px-4 border-b text-left">Email</th>
                  <th className="py-2 px-4 border-b text-left">Phone</th>
                  <th className="py-2 px-4 border-b text-left">Verified</th>
                  <th className="py-2 px-4 border-b text-left">2FA</th>
                  <th className="py-2 px-4 border-b text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="py-2 px-4 border-b">{user.name}</td>
                    <td className="py-2 px-4 border-b">{user.email}</td>
                    <td className="py-2 px-4 border-b">{user.phone || 'N/A'}</td>
                    <td className="py-2 px-4 border-b">
                      {user.isEmailVerified ? (
                        <span className="text-green-600">Yes</span>
                      ) : (
                        <span className="text-red-600">No</span>
                      )}
                    </td>
                    <td className="py-2 px-4 border-b">
                      {user.isTwoFactorEnabled ? (
                        <span className="text-green-600">Enabled</span>
                      ) : (
                        <span className="text-gray-500">Disabled</span>
                      )}
                    </td>
                    <td className="py-2 px-4 border-b text-center">
                      <div className="flex justify-center gap-2">
                        <Button 
                          onClick={() => handleViewUser(user.id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white p-1"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </Button>
                        <Button
                          onClick={() => handleDeleteClick(user)}
                          className="bg-red-600 hover:bg-red-700 text-white p-1"
                          title="Delete User"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* User Details Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="User Details"
      >
        {selectedUser && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-700">Name</h3>
              <p>{selectedUser.name}</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-700">Email</h3>
              <p>{selectedUser.email}</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-700">Phone</h3>
              <p>{selectedUser.phone || 'Not provided'}</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-700">Account Status</h3>
              <div className="flex flex-col gap-1">
                <p>
                  <span className="font-medium">Email Verified:</span>{' '}
                  {selectedUser.isEmailVerified ? (
                    <span className="text-green-600">Yes</span>
                  ) : (
                    <span className="text-red-600">No</span>
                  )}
                </p>
                <p>
                  <span className="font-medium">2FA Enabled:</span>{' '}
                  {selectedUser.isTwoFactorEnabled ? (
                    <span className="text-green-600">Yes</span>
                  ) : (
                    <span className="text-gray-600">No</span>
                  )}
                </p>
                {selectedUser.loginAttempts !== undefined && selectedUser.loginAttempts > 0 && (
                  <p>
                    <span className="font-medium">Login Attempts:</span>{' '}
                    <span className={`${selectedUser.loginAttempts >= 3 ? 'text-red-600' : 'text-gray-600'}`}>
                      {selectedUser.loginAttempts}/5
                    </span>
                  </p>
                )}
                {selectedUser.lockUntil && new Date(selectedUser.lockUntil) > new Date() && (
                  <p>
                    <span className="font-medium">Account Locked Until:</span>{' '}
                    <span className="text-red-600">
                      {new Date(selectedUser.lockUntil).toLocaleString()}
                    </span>
                  </p>
                )}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-700">Password Management</h3>
              <p className="text-sm text-gray-600 bg-yellow-50 p-2 rounded border border-yellow-200">
                For security reasons, passwords cannot be viewed. If this user needs a password reset, 
                please instruct them to use the "Forgot Password" option on the login page or contact a system administrator.
              </p>
            </div>
            <div className="pt-4 flex justify-end">
              <Button
                onClick={() => setIsModalOpen(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Deletion"
      >
        {userToDelete && (
          <div className="space-y-4">
            <p className="text-gray-700">
              Are you sure you want to delete the user <span className="font-semibold">{userToDelete.name}</span> with email <span className="font-semibold">{userToDelete.email}</span>?
            </p>
            <p className="text-red-600 text-sm">
              This action cannot be undone. The user will lose all access to the system.
            </p>
            <div className="pt-4 flex justify-end gap-2">
              <Button
                onClick={() => setIsDeleteModalOpen(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteUser}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={loading}
              >
                {loading ? 'Deleting...' : 'Delete User'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default UserManagement;
