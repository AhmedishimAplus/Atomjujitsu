import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Card, CardHeader, CardBody } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import { formatDate } from '../../utils/helpers';
import { User, Droplet, Plus, Minus, Edit, UserPlus, Save, RefreshCw } from 'lucide-react';
import { StaffMember } from '../../types';
import * as staffApi from '../../services/staffApi';
import * as api from '../../services/api';

const StaffManagement: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [editStaffName, setEditStaffName] = useState('');
  const [nameError, setNameError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [staffPurchases, setStaffPurchases] = useState<any[]>([]);
  const [purchasesByStaff, setPurchasesByStaff] = useState<Record<string, any[]>>({});
  const [isLoadingPurchases, setIsLoadingPurchases] = useState(false);

  // Load staff data from API on component mount
  useEffect(() => {
    fetchStaffData();
  }, []);

  // Fetch staff purchases from the API
  useEffect(() => {
    fetchStaffPurchases();
  }, []);

  const fetchStaffData = async () => {
    try {
      const staffData = await staffApi.getStaffList();
      // Map the backend data to frontend format
      const formattedStaff = staffData.map((staff: any) => ({
        id: staff._id,
        name: staff.name,
        waterBottleAllowance: {
          large: staff.Large_bottles,
          small: staff.Small_bottles
        }
      }));
      dispatch({ type: 'SET_STAFF_LIST', payload: formattedStaff });
    } catch (error) {
      console.error('Failed to fetch staff data:', error);
    }
  };

  const fetchStaffPurchases = async () => {
    try {
      setIsLoadingPurchases(true);
      const purchases = await api.getStaffPurchases();
      setStaffPurchases(purchases);

      // Group purchases by staff name
      const groupedPurchases = purchases.reduce((acc: Record<string, any[]>, purchase: any) => {
        const staffName = purchase.staffName || 'Unknown';
        if (!acc[staffName]) {
          acc[staffName] = [];
        }
        acc[staffName].push(purchase);
        return acc;
      }, {});

      setPurchasesByStaff(groupedPurchases);
    } catch (error) {
      console.error('Failed to fetch staff purchases:', error);
    } finally {
      setIsLoadingPurchases(false);
    }
  };

  // We now get staff purchases directly from the API instead of using local state
  // Handle water bottle allowance reset
  const handleResetAllowances = async () => {
    try {
      setIsLoading(true);
      const updatedStaff = await staffApi.resetAllStaffBottles();

      // Map the backend data to frontend format
      const formattedStaff = updatedStaff.map((staff: any) => ({
        id: staff._id,
        name: staff.name,
        waterBottleAllowance: {
          large: staff.Large_bottles,
          small: staff.Small_bottles
        }
      }));

      dispatch({ type: 'SET_STAFF_LIST', payload: formattedStaff });

      // Refresh staff purchases
      await fetchStaffPurchases();
    } catch (error) {
      console.error('Failed to reset allowances:', error);
    } finally {
      setIsLoading(false);
    }
  };
  // Handle add staff
  const handleAddStaff = async () => {
    // Validate name
    if (!newStaffName.trim()) {
      setNameError('Name is required');
      return;
    }

    try {
      setIsLoading(true);
      const result = await staffApi.createStaffMember(newStaffName.trim());

      // Create staff member object for local state
      const newStaff: StaffMember = {
        id: result._id,
        name: result.name,
        waterBottleAllowance: {
          large: result.Large_bottles,
          small: result.Small_bottles
        }
      };

      dispatch({ type: 'ADD_STAFF', payload: newStaff });
      setNewStaffName('');
      setIsAddModalOpen(false);
      setNameError('');

      // Refresh staff purchases
      await fetchStaffPurchases();
    } catch (error: any) {
      if (error.response && error.response.data && error.response.data.error) {
        setNameError(error.response.data.error);
      } else {
        setNameError('Failed to add staff member');
      }
    } finally {
      setIsLoading(false);
    }
  };
  // Handle update staff
  const handleUpdateStaff = async () => {
    if (!editingStaff) return;

    // Validate name
    if (!editStaffName.trim()) {
      setNameError('Name is required');
      return;
    }

    try {
      setIsLoading(true);
      const result = await staffApi.updateStaffName(editingStaff.id, editStaffName.trim());

      const updatedStaff: StaffMember = {
        ...editingStaff,
        name: result.name
      };

      dispatch({ type: 'UPDATE_STAFF', payload: updatedStaff });
      setIsEditModalOpen(false);
      setNameError('');

      // Refresh staff purchases to reflect name changes
      await fetchStaffPurchases();
    } catch (error: any) {
      if (error.response && error.response.data && error.response.data.error) {
        setNameError(error.response.data.error);
      } else {
        setNameError('Failed to update staff name');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle updating bottle allowance
  const handleUpdateBottleAllowance = async (staffId: string, type: 'large' | 'small', amount: number) => {
    try {
      setIsLoading(true);

      // Ensure the amount is between 0 and 2
      const newAmount = Math.max(0, Math.min(2, amount));

      // Create the update data object based on the bottle type
      const updateData = type === 'large'
        ? { Large_bottles: newAmount }
        : { Small_bottles: newAmount };

      const result = await staffApi.updateStaffBottles(staffId, updateData);

      // Update the local state
      const updatedStaff = state.staffMembers.map(staff => {
        if (staff.id === staffId) {
          return {
            ...staff,
            waterBottleAllowance: {
              ...staff.waterBottleAllowance,
              [type]: type === 'large' ? result.Large_bottles : result.Small_bottles
            }
          };
        }
        return staff;
      }); dispatch({ type: 'SET_STAFF_LIST', payload: updatedStaff });

      // Refresh staff purchases to update any associated data
      await fetchStaffPurchases();
    } catch (error) {
      console.error('Failed to update bottle allowance:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openEditModal = (staff: StaffMember) => {
    setEditingStaff(staff);
    setEditStaffName(staff.name);
    setNameError('');
    setIsEditModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
        <div className="flex gap-2">
          <Button
            variant="primary"
            onClick={() => setIsAddModalOpen(true)}
            leftIcon={<UserPlus size={18} />}
          >
            Add Staff
          </Button>
          <Button
            variant="secondary"
            onClick={handleResetAllowances}
            leftIcon={<Droplet size={18} />}
            disabled={isLoading}
          >
            Reset Water Bottle Allowances
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {state.staffMembers.map(staff => (
          <Card key={staff.id} className="transition-all duration-200 hover:shadow-lg">
            <CardBody className="p-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                    <User size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{staff.name}</h3>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEditModal(staff)}
                  leftIcon={<Edit size={16} />}
                >
                  Edit
                </Button>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Large Water Bottles:</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => handleUpdateBottleAllowance(
                        staff.id,
                        'large',
                        staff.waterBottleAllowance.large - 1
                      )}
                      disabled={staff.waterBottleAllowance.large <= 0 || isLoading}
                      className="p-1"
                    >
                      <Minus size={14} />
                    </Button>
                    <span className="font-medium w-10 text-center">{staff.waterBottleAllowance.large} / 2</span>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => handleUpdateBottleAllowance(
                        staff.id,
                        'large',
                        staff.waterBottleAllowance.large + 1
                      )}
                      disabled={staff.waterBottleAllowance.large >= 2 || isLoading}
                      className="p-1"
                    >
                      <Plus size={14} />
                    </Button>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full"
                    style={{ width: `${(staff.waterBottleAllowance.large / 2) * 100}%` }}
                  ></div>
                </div>

                <div className="flex justify-between items-center text-sm mt-2">
                  <span className="text-gray-500">Small Water Bottles:</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => handleUpdateBottleAllowance(
                        staff.id,
                        'small',
                        staff.waterBottleAllowance.small - 1
                      )}
                      disabled={staff.waterBottleAllowance.small <= 0 || isLoading}
                      className="p-1"
                    >
                      <Minus size={14} />
                    </Button>
                    <span className="font-medium w-10 text-center">{staff.waterBottleAllowance.small} / 2</span>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => handleUpdateBottleAllowance(
                        staff.id,
                        'small',
                        staff.waterBottleAllowance.small + 1
                      )}
                      disabled={staff.waterBottleAllowance.small >= 2 || isLoading}
                      className="p-1"
                    >
                      <Plus size={14} />
                    </Button>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-teal-600 h-2.5 rounded-full"
                    style={{ width: `${(staff.waterBottleAllowance.small / 2) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Purchases</h4>
                {purchasesByStaff[staff.name]?.slice(0, 3).map((purchase, index) => (
                  <div key={index} className="text-sm text-gray-600 mb-1">
                    {formatDate(purchase.createdAt)} - ${purchase.total.toFixed(2)}
                  </div>
                ))}
                {!purchasesByStaff[staff.name] || purchasesByStaff[staff.name].length === 0 ? (
                  <div className="text-sm text-gray-500 italic">No recent purchases</div>
                ) : null}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>      <Card>
        <CardHeader className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">Staff Purchase History</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchStaffPurchases}
            disabled={isLoadingPurchases}
            leftIcon={<RefreshCw size={16} className={isLoadingPurchases ? "animate-spin" : ""} />}
          >
            {isLoadingPurchases ? 'Refreshing...' : 'Refresh'}
          </Button>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Staff Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Method
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoadingPurchases ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                      Loading staff purchases...
                    </td>
                  </tr>
                ) : staffPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                      No staff transactions found
                    </td>
                  </tr>
                ) : (
                  staffPurchases
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((purchase) => (
                      <tr key={purchase._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatDate(purchase.createdAt)}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(purchase.createdAt).toLocaleTimeString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{purchase.staffName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{purchase.paymentMethod}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm font-medium text-gray-900">
                            ${purchase.total.toFixed(2)}
                          </div>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* Add Staff Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setNewStaffName('');
          setNameError('');
        }}
        title="Add New Staff Member"
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Staff Name"
            value={newStaffName}
            onChange={(e) => {
              setNewStaffName(e.target.value);
              if (e.target.value.trim()) setNameError('');
            }}
            placeholder="Enter staff name"
            fullWidth
            error={nameError}
            autoFocus
          />
          {nameError && <p className="text-sm text-red-600">{nameError}</p>}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddModalOpen(false);
                setNewStaffName('');
                setNameError('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAddStaff}
              disabled={isLoading}
              leftIcon={isLoading ? undefined : <Save size={18} />}
            >
              {isLoading ? 'Adding...' : 'Add Staff'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Staff Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingStaff(null);
          setEditStaffName('');
          setNameError('');
        }}
        title="Edit Staff Member"
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Staff Name"
            value={editStaffName}
            onChange={(e) => {
              setEditStaffName(e.target.value);
              if (e.target.value.trim()) setNameError('');
            }}
            placeholder="Enter staff name"
            fullWidth
            error={nameError}
            autoFocus
          />
          {nameError && <p className="text-sm text-red-600">{nameError}</p>}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingStaff(null);
                setEditStaffName('');
                setNameError('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleUpdateStaff}
              disabled={isLoading}
              leftIcon={isLoading ? undefined : <Save size={18} />}
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StaffManagement;