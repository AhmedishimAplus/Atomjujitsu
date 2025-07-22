import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Card, CardHeader, CardBody } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import Toggle from '../ui/Toggle';
import { Bundle } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import { Search, Plus, DollarSign, Phone, Trash2, Users } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import {
    getBundles,
    createBundle,
    addFundsToBundle,
    settleBundle,
    getStaff
} from '../../services/api';

const BundleManagement: React.FC = () => {
    const { state, dispatch } = useAppContext();

    // Redirect non-admin users
    if (state.user?.role !== 'Admin') {
        dispatch({ type: 'SET_VIEW', payload: 'cashier' });
        return <Navigate to="/" replace />;
    }

    const [bundles, setBundles] = useState<Bundle[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [addFundsModalOpen, setAddFundsModalOpen] = useState(false);
    const [selectedBundle, setSelectedBundle] = useState<Bundle | null>(null);
    const [staff, setStaff] = useState<any[]>([]);

    // Create bundle form state
    const [newBundle, setNewBundle] = useState({
        phoneNumber: '',
        amount: '',
        isStaff: false,
        staffId: ''
    });

    // Add funds form state
    const [fundsAmount, setFundsAmount] = useState('');

    // Fetch bundles and staff on component mount
    useEffect(() => {
        fetchBundles();
        fetchStaff();
    }, []);

    const fetchBundles = async () => {
        try {
            setLoading(true);
            const data = await getBundles(searchTerm);
            setBundles(data);
        } catch (error) {
            console.error('Error fetching bundles:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStaff = async () => {
        try {
            const data = await getStaff();
            setStaff(data);
        } catch (error) {
            console.error('Error fetching staff:', error);
        }
    };

    // Search bundles
    const handleSearch = () => {
        fetchBundles();
    };

    // Handle search on Enter key
    const handleSearchKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    // Create new bundle
    const handleCreateBundle = async () => {
        try {
            if (!newBundle.phoneNumber || !newBundle.amount) {
                alert('Please fill in all required fields');
                return;
            }

            if (parseFloat(newBundle.amount) < 0) {
                alert('Initial amount cannot be negative');
                return;
            }

            // If it's a staff bundle, ensure staff is selected
            if (newBundle.isStaff && !newBundle.staffId) {
                alert('Please select a staff member for staff bundle');
                return;
            }

            const bundleData: any = {
                phoneNumber: newBundle.phoneNumber,
                amount: parseFloat(newBundle.amount),
                isStaff: newBundle.isStaff
            };

            // Only include staffId if it's a staff bundle and staffId is provided
            if (newBundle.isStaff && newBundle.staffId) {
                bundleData.staffId = newBundle.staffId;
            }

            await createBundle(bundleData);

            // Reset form and close modal
            setNewBundle({
                phoneNumber: '',
                amount: '',
                isStaff: false,
                staffId: ''
            });
            setCreateModalOpen(false);

            // Refresh bundles
            fetchBundles();
        } catch (error: any) {
            console.error('Bundle creation error:', error);
            const errorMessage = error.response?.data?.error ||
                error.response?.data?.errors?.[0]?.msg ||
                'Error creating bundle';
            alert(errorMessage);
        }
    };

    // Add funds to bundle
    const handleAddFunds = async () => {
        try {
            if (!selectedBundle || !fundsAmount) {
                alert('Please enter a valid amount');
                return;
            }

            if (parseFloat(fundsAmount) <= 0) {
                alert('Amount must be positive');
                return;
            }

            await addFundsToBundle(selectedBundle._id, parseFloat(fundsAmount));

            // Reset form and close modal
            setFundsAmount('');
            setAddFundsModalOpen(false);
            setSelectedBundle(null);

            // Refresh bundles
            fetchBundles();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Error adding funds');
        }
    };

    // Settle bundle
    const handleSettleBundle = async (bundle: Bundle) => {
        if (confirm(`Are you sure you want to settle bundle for ${bundle.phoneNumber}? This action cannot be undone.`)) {
            try {
                await settleBundle(bundle._id);
                fetchBundles();
            } catch (error: any) {
                alert(error.response?.data?.error || 'Error settling bundle');
            }
        }
    };

    // Open add funds modal
    const openAddFundsModal = (bundle: Bundle) => {
        setSelectedBundle(bundle);
        setAddFundsModalOpen(true);
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-800">Bundle Management</h1>
                <Button
                    onClick={() => setCreateModalOpen(true)}
                    className="flex items-center gap-2"
                >
                    <Plus size={20} />
                    Create Bundle
                </Button>
            </div>

            {/* Search Bar */}
            <Card>
                <CardBody className="p-4">
                    <div className="flex gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                            <Input
                                type="text"
                                placeholder="Search by phone number..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyPress={handleSearchKeyPress}
                                className="pl-10"
                            />
                        </div>
                        <Button onClick={handleSearch}>Search</Button>
                    </div>
                </CardBody>
            </Card>

            {/* Bundles Grid */}
            {loading ? (
                <div className="text-center py-8">Loading bundles...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {bundles.map((bundle) => (
                        <Card key={bundle._id} className="hover:shadow-lg transition-shadow">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Phone size={20} className="text-blue-500" />
                                        <span className="font-semibold">{bundle.phoneNumber}</span>
                                    </div>
                                    {bundle.isStaff && (
                                        <div className="flex items-center gap-1 text-sm text-purple-600 bg-purple-100 px-2 py-1 rounded">
                                            <Users size={16} />
                                            Staff
                                        </div>
                                    )}
                                </div>
                            </CardHeader>
                            <CardBody className="space-y-4">
                                <div className="text-center">
                                    <div className="text-3xl font-bold mb-1" style={{
                                        color: bundle.amount >= 0 ? '#10b981' : bundle.amount >= -100 ? '#f59e0b' : '#ef4444'
                                    }}>
                                        {formatCurrency(bundle.amount)}
                                    </div>
                                    {bundle.amount < 0 && (
                                        <div className="text-sm text-red-600">
                                            {bundle.amount < -100 ? 'Settlement Required' : 'Negative Balance'}
                                        </div>
                                    )}
                                </div>

                                {bundle.isStaff && bundle.staffName && (
                                    <div className="text-sm text-gray-600 text-center">
                                        Staff: {bundle.staffName}
                                    </div>
                                )}

                                <div className="text-xs text-gray-500 text-center">
                                    Created: {new Date(bundle.createdAt).toLocaleDateString()}
                                </div>

                                <div className="flex gap-2 mt-4">
                                    <Button
                                        onClick={() => openAddFundsModal(bundle)}
                                        className="flex-1 flex items-center justify-center gap-1 text-sm"
                                        variant="outline"
                                    >
                                        <DollarSign size={16} />
                                        Add Funds
                                    </Button>
                                    <Button
                                        onClick={() => handleSettleBundle(bundle)}
                                        className="flex-1 flex items-center justify-center gap-1 text-sm"
                                        variant="outline"
                                        style={{ borderColor: '#ef4444', color: '#ef4444' }}
                                    >
                                        <Trash2 size={16} />
                                        Settle
                                    </Button>
                                </div>
                            </CardBody>
                        </Card>
                    ))}
                </div>
            )}

            {bundles.length === 0 && !loading && (
                <div className="text-center py-12 text-gray-500">
                    <Phone size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No bundles found</p>
                    {searchTerm && <p className="text-sm">Try adjusting your search terms</p>}
                </div>
            )}

            {/* Create Bundle Modal */}
            <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Create New Bundle">
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Phone Number *
                        </label>
                        <Input
                            type="text"
                            placeholder="Enter phone number"
                            value={newBundle.phoneNumber}
                            onChange={(e) => setNewBundle({ ...newBundle, phoneNumber: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Initial Amount *
                        </label>
                        <Input
                            type="number"
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                            value={newBundle.amount}
                            onChange={(e) => setNewBundle({ ...newBundle, amount: e.target.value })}
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <Toggle
                            checked={newBundle.isStaff}
                            onChange={(checked) => setNewBundle({ ...newBundle, isStaff: checked, staffId: '' })}
                        />
                        <span className="text-sm font-medium">Staff Bundle</span>
                    </div>

                    {newBundle.isStaff && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Staff Member *
                            </label>
                            <select
                                value={newBundle.staffId}
                                onChange={(e) => setNewBundle({ ...newBundle, staffId: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select staff member</option>
                                {staff.map((member) => (
                                    <option key={member._id} value={member._id}>
                                        {member.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex gap-3 pt-4">
                        <Button
                            onClick={() => setCreateModalOpen(false)}
                            variant="outline"
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleCreateBundle} className="flex-1">
                            Create Bundle
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Add Funds Modal */}
            <Modal isOpen={addFundsModalOpen} onClose={() => setAddFundsModalOpen(false)} title="Add Funds">
                <div className="p-6 space-y-4">
                    <h2 className="text-xl font-bold">Add Funds</h2>

                    {selectedBundle && (
                        <div className="bg-gray-50 p-3 rounded">
                            <div className="text-sm text-gray-600">Bundle for:</div>
                            <div className="font-semibold">{selectedBundle.phoneNumber}</div>
                            <div className="text-sm text-gray-600 mt-1">
                                Current Balance: <span className="font-semibold">{formatCurrency(selectedBundle.amount)}</span>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Amount to Add *
                        </label>
                        <Input
                            type="number"
                            placeholder="0.00"
                            min="0.01"
                            step="0.01"
                            value={fundsAmount}
                            onChange={(e) => setFundsAmount(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button
                            onClick={() => setAddFundsModalOpen(false)}
                            variant="outline"
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleAddFunds} className="flex-1">
                            Add Funds
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default BundleManagement;
