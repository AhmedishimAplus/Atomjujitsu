import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { Card, CardHeader, CardBody } from '../ui/Card';
import Button from '../ui/Button';
import { formatDate } from '../../utils/helpers';
import { User, Droplet } from 'lucide-react';

const StaffManagement: React.FC = () => {
  const { state, dispatch } = useAppContext();
  
  // Filter transactions by staff
  const staffTransactions = state.transactions.filter(
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {state.staffMembers.map(staff => (
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
                  <span className="font-medium">{staff.waterBottleAllowance.large} / 2</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full"
                    style={{ width: `${(staff.waterBottleAllowance.large / 2) * 100}%` }}
                  ></div>
                </div>
                
                <div className="flex justify-between items-center text-sm mt-2">
                  <span className="text-gray-500">Small Water Bottles:</span>
                  <span className="font-medium">{staff.waterBottleAllowance.small} / 2</span>
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
                {transactionsByStaff[staff.name]?.slice(0, 3).map((transaction, index) => (
                  <div key={index} className="text-sm text-gray-600 mb-1">
                    {formatDate(transaction.timestamp)} - ${transaction.total.toFixed(2)}
                  </div>
                ))}
                {!transactionsByStaff[staff.name] || transactionsByStaff[staff.name].length === 0 ? (
                  <div className="text-sm text-gray-500 italic">No recent purchases</div>
                ) : null}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
      
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-800">Staff Purchase History</h2>
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
                {staffTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                      No staff transactions found
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
                          <div className="text-sm text-gray-500">{transaction.paymentMethod}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm font-medium text-gray-900">
                            ${transaction.total.toFixed(2)}
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