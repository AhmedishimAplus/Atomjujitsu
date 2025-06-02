import React, { useEffect } from 'react'; // Added useEffect
import { useAppContext } from '../../context/AppContext';
import { Card, CardHeader, CardBody } from '../ui/Card';
import Button from '../ui/Button';
import { formatDate } from '../../utils/helpers';
import { User, Droplet, Loader2, AlertTriangle } from 'lucide-react'; // Added Loader2 and AlertTriangle

const StaffManagement: React.FC = () => {
  const { state, dispatch, fetchStaff } = useAppContext(); // Added fetchStaff
  const { staffMembers, transactions, isLoadingStaff, fetchStaffError } = state;

  // Fetch staff if not already called by AppProvider or if needed specifically here
  // useEffect(() => {
  //   if (staffMembers.length === 0 && !isLoadingStaff && !fetchStaffError) {
  //     fetchStaff();
  //   }
  // }, [staffMembers, isLoadingStaff, fetchStaffError, fetchStaff]);
  
  // Filter transactions by staff (this uses transactions from context, which are fetched in FinancialTracking or AppProvider)
  const staffTransactions = transactions.filter(
    transaction => transaction.staffDiscount && transaction.staffName
  );
  
  // Group transactions by staff name
  const transactionsByStaff = staffTransactions.reduce((acc, transaction) => {
    const staffName = transaction.staffName || 'Unknown';
    if (!acc[staffName]) {
      acc[staffName] = [];
    }
    acc[staffName].push(transaction);
    return acc;
  }, {} as Record<string, typeof staffTransactions>);
  
  // Handle water bottle allowance reset
  const handleResetAllowances = () => {
    dispatch({ type: 'RESET_ALLOWANCES' });
  };

  if (isLoadingStaff && staffMembers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <p className="mt-4 text-lg text-gray-700">Loading staff members...</p>
      </div>
    );
  }

  if (fetchStaffError) {
    return (
      <div className="text-center py-10 bg-red-50 p-6 rounded-lg shadow-md">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
        <h3 className="mt-2 text-xl font-semibold text-red-700">Failed to load staff data</h3>
        <p className="mt-1 text-md text-gray-600">{fetchStaffError}</p>
        <Button onClick={() => fetchStaff && fetchStaff()} className="mt-4"> {/* Ensure fetchStaff is defined before calling */}
          Try Again
        </Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
        <Button
          variant="primary"
          onClick={handleResetAllowances}
          leftIcon={<Droplet size={18} />}
        >
          Reset Water Bottle Allowances
        </Button>
      </div>
      
      {staffMembers.length === 0 && !isLoadingStaff && (
         <div className="text-center py-10 text-gray-500">
           <User size={48} className="mx-auto mb-4 opacity-50" />
           <p className="text-xl">No staff members found.</p>
           <p className="mt-1">Staff data might still be loading or none exists in the system.</p>
         </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {staffMembers.map(staff => (
          <Card key={staff.id} className="transition-all duration-200 hover:shadow-lg">
            <CardBody className="p-6">
              <div className="flex items-center space-x-4">
                <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                  <User size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{staff.name}</h3>
                </div>
              </div>
              
              <div className="mt-4 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Large Water Bottles:</span>
                  <span className="font-medium">{staff.waterBottleAllowance?.large ?? 'N/A'} / 2</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full"
                    style={{ width: `${((staff.waterBottleAllowance?.large ?? 0) / 2) * 100}%` }}
                  ></div>
                </div>
                
                <div className="flex justify-between items-center text-sm mt-2">
                  <span className="text-gray-500">Small Water Bottles:</span>
                  <span className="font-medium">{staff.waterBottleAllowance?.small ?? 'N/A'} / 2</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-teal-600 h-2.5 rounded-full"
                    style={{ width: `${((staff.waterBottleAllowance?.small ?? 0) / 2) * 100}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Purchases (Staff Discount)</h4>
                {transactionsByStaff[staff.name]?.slice(0, 3).map((transaction, index) => (
                  <div key={index} className="text-sm text-gray-600 mb-1">
                    {formatDate(transaction.timestamp)} - {formatCurrency(transaction.total)}
                  </div>
                ))}
                {!transactionsByStaff[staff.name] || transactionsByStaff[staff.name].length === 0 ? (
                  <div className="text-sm text-gray-500 italic">No recent discounted purchases</div>
                ) : null}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
      
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-800">All Staff Discount Purchase History</h2>
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
                    Order ID
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
                {staffTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      No staff discount transactions found
                    </td>
                  </tr>
                ) : (
                  staffTransactions
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatDate(transaction.timestamp)}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(transaction.timestamp).toLocaleTimeString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{transaction.staffName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{transaction.orderId}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{transaction.paymentMethod}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(transaction.total)}
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
    </div>
  );
};

export default StaffManagement;