import React, { useState, useEffect } from 'react';
import { getCashiers, getCashierDetails, approveCashier, deleteCashier } from '../../services/api';
import { User } from '../../types';
import Button from '../ui/Button';
import { Eye, Check, Trash2, AlertCircle } from 'lucide-react';
import Modal from '../ui/Modal';

// Define a more specific type for cashiers from the API
interface CashierUser extends User {
    _id: string; // Make _id required for cashier users from the API
}

const UserManagement: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [cashiers, setCashiers] = useState<CashierUser[]>([]);
    const [selectedCashier, setSelectedCashier] = useState<CashierUser | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [cashierToDelete, setCashierToDelete] = useState<CashierUser | null>(null);

    // Load cashiers on component mount
    useEffect(() => {
        loadCashiers();
    }, []);

    const loadCashiers = async () => {
        try {
            setLoading(true);
            setError('');
            const data = await getCashiers();
            setCashiers(data);

            if (data.length === 0) {
                setError('No cashiers found in the system');
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to load cashiers');
            console.error('Error loading cashiers:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleViewCashier = async (cashierId: string) => {
        try {
            setLoading(true);
            setError('');
            const cashier = await getCashierDetails(cashierId);
            setSelectedCashier(cashier);
            setIsDetailsModalOpen(true);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to get cashier details');
        } finally {
            setLoading(false);
        }
    };

    const handleApproveCashier = async (cashierId: string) => {
        try {
            setLoading(true);
            setError('');
            await approveCashier(cashierId);
            setSuccess('Cashier approved successfully');

            // Refresh the cashier list
            await loadCashiers();

            // Close the details modal if it's open
            if (isDetailsModalOpen) {
                setIsDetailsModalOpen(false);
            }

            // Show success message for 3 seconds
            setTimeout(() => {
                setSuccess('');
            }, 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to approve cashier');
        } finally {
            setLoading(false);
        }
    };

    const openDeleteModal = (cashier: CashierUser) => {
        setCashierToDelete(cashier);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteCashier = async () => {
        if (!cashierToDelete || !cashierToDelete._id) return;

        try {
            setLoading(true);
            setError('');
            await deleteCashier(cashierToDelete._id);
            setSuccess('Cashier deleted successfully');

            // Refresh the cashier list
            await loadCashiers();

            // Close the delete confirmation modal
            setIsDeleteModalOpen(false);
            setCashierToDelete(null);

            // Close the details modal if it's open
            if (isDetailsModalOpen) {
                setIsDetailsModalOpen(false);
                setSelectedCashier(null);
            }

            // Show success message for 3 seconds
            setTimeout(() => {
                setSuccess('');
            }, 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to delete cashier');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string | undefined) => {
        return dateString ? new Date(dateString).toLocaleString() : 'Unknown';
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-6">User Management</h1>
            <p className="text-gray-600 mb-6">Manage cashier accounts. As an admin, you can approve new cashiers or remove existing ones.</p>

            {error && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
                    <div className="flex items-center">
                        <AlertCircle className="h-5 w-5 mr-2" />
                        <p>{error}</p>
                    </div>
                </div>
            )}

            {success && (
                <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6" role="alert">
                    <p>{success}</p>
                </div>
            )}

            {loading && cashiers.length === 0 ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            ) : (
                <div className="bg-white shadow-md rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Email
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Created
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {cashiers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-4 text-center text-sm font-medium text-gray-500">
                                        No cashiers found
                                    </td>
                                </tr>
                            ) : (
                                cashiers.map((cashier) => (
                                    <tr key={cashier._id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {cashier.name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {cashier.email}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {cashier.isApproved ? (
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                    Approved
                                                </span>
                                            ) : (
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                                    Pending Approval
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {cashier.createdAt ? new Date(cashier.createdAt).toLocaleDateString() : 'Unknown'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => cashier._id ? handleViewCashier(cashier._id) : null}
                                                    className="text-blue-600 hover:text-blue-900"
                                                    title="View Details"
                                                >
                                                    <Eye size={18} />
                                                </button>

                                                {!cashier.isApproved && (<button
                                                    onClick={() => cashier._id ? handleApproveCashier(cashier._id) : null}
                                                    className="text-green-600 hover:text-green-900"
                                                    title="Approve Cashier"
                                                >
                                                    <Check size={18} />
                                                </button>
                                                )}

                                                <button
                                                    onClick={() => openDeleteModal(cashier)}
                                                    className="text-red-600 hover:text-red-900"
                                                    title="Delete Cashier"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Cashier Details Modal */}
            {selectedCashier && (
                <Modal
                    isOpen={isDetailsModalOpen}
                    onClose={() => {
                        setIsDetailsModalOpen(false);
                        setSelectedCashier(null);
                    }}
                    title="Cashier Details"
                >
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
                            <div className="mt-2 grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Name</p>
                                    <p className="mt-1">{selectedCashier.name}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Email</p>
                                    <p className="mt-1">{selectedCashier.email}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Phone</p>
                                    <p className="mt-1">{selectedCashier.phone || 'Not provided'}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Created</p>
                                    <p className="mt-1">{formatDate(selectedCashier.createdAt)}</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-medium text-gray-900">Account Status</h3>
                            <div className="mt-2 grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Email Verified</p>
                                    <p className="mt-1">{selectedCashier.isEmailVerified ? 'Yes' : 'No'}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Approved</p>
                                    <p className="mt-1">{selectedCashier.isApproved ? 'Yes' : 'No'}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">2FA Enabled</p>
                                    <p className="mt-1">{selectedCashier.isTwoFactorEnabled ? 'Yes' : 'No'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 mt-6">
                            {!selectedCashier.isApproved && (
                                <Button
                                    onClick={() => handleApproveCashier(selectedCashier._id)}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                    Approve Cashier
                                </Button>
                            )}
                            <Button
                                onClick={() => openDeleteModal(selectedCashier)}
                                className="bg-red-600 hover:bg-red-700 text-white"
                            >
                                Delete Cashier
                            </Button>
                            <Button
                                onClick={() => {
                                    setIsDetailsModalOpen(false);
                                    setSelectedCashier(null);
                                }}
                                className="bg-gray-200 hover:bg-gray-300 text-gray-800"
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setCashierToDelete(null);
                }}
                title="Confirm Delete"
            >
                <div className="space-y-4">
                    <p className="text-gray-700">
                        Are you sure you want to delete the cashier{' '}
                        <span className="font-semibold">{cashierToDelete?.name}</span>?
                    </p>
                    <p className="text-gray-700">This action cannot be undone.</p>

                    <div className="flex justify-end space-x-3 mt-6">
                        <Button
                            onClick={handleDeleteCashier}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            Delete
                        </Button>
                        <Button
                            onClick={() => {
                                setIsDeleteModalOpen(false);
                                setCashierToDelete(null);
                            }}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-800"
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default UserManagement;
