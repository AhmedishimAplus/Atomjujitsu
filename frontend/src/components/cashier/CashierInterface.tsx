import React, { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Card, CardHeader, CardBody, CardFooter } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Toggle from '../ui/Toggle';
import Modal from '../ui/Modal';
import { ProductItem } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import { Minus, Plus, Trash2, Check, X, DollarSign, CreditCard } from 'lucide-react';
import { getProducts, getCategories } from '../../services/api';

const CashierInterface: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'InstaPay' | 'Cash'>('Cash');
  const [staffName, setStaffName] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsData, categoriesData] = await Promise.all([
          getProducts(),
          getCategories()
        ]);
        setProducts(productsData.filter((p: any) => p.isAvailable));
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, []);

  // Filter products based on search term
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    product.isAvailable
  );

  // Group products by category and subcategory
  const productsByCategory: Record<string, Record<string, any[]>> = {};
  filteredProducts.forEach(product => {
    const cat = categories.find((c: any) => c._id === product.categoryId);
    const catName = cat ? cat.name : 'Uncategorized';
    const subcatName = product.subcategory || 'Uncategorized';
    if (!productsByCategory[catName]) productsByCategory[catName] = {};
    if (!productsByCategory[catName][subcatName]) productsByCategory[catName][subcatName] = [];
    productsByCategory[catName][subcatName].push(product);
  });

  // Handle adding item to order
  const handleAddItem = (product: ProductItem) => {
    dispatch({
      type: 'ADD_TO_ORDER',
      payload: {
        product,
        quantity: 1,
        isStaffPrice: state.currentOrder.staffDiscount
      }
    });
  };

  // Handle removing item from order
  const handleRemoveItem = (productId: string) => {
    dispatch({
      type: 'REMOVE_FROM_ORDER',
      payload: productId
    });
  };

  // Handle updating item quantity
  const handleUpdateQuantity = (productId: string, newQuantity: number) => {
    dispatch({
      type: 'UPDATE_ORDER_ITEM_QUANTITY',
      payload: {
        productId,
        quantity: newQuantity
      }
    });
  };

  // Handle staff discount toggle
  const handleStaffDiscountToggle = (enabled: boolean) => {
    dispatch({
      type: 'SET_STAFF_DISCOUNT',
      payload: {
        enabled,
        staffName: enabled ? staffName : ''
      }
    });
  };

  // Handle staff name change
  const handleStaffNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStaffName(e.target.value);
    if (state.currentOrder.staffDiscount) {
      dispatch({
        type: 'SET_STAFF_DISCOUNT',
        payload: {
          enabled: true,
          staffName: e.target.value
        }
      });
    }
  };

  // Handle payment
  const handlePayment = () => {
    dispatch({
      type: 'COMPLETE_ORDER',
      payload: {
        paymentMethod
      }
    });
    setPaymentModalOpen(false);
    setReceiptModalOpen(true);
  };

  // Handle closing receipt and resetting
  const handleCloseReceipt = () => {
    setReceiptModalOpen(false);
    setStaffName('');
    setPaymentMethod('Cash');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Products Section */}
      <div className="lg:col-span-2">
        <div className="mb-4">
          <Input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            fullWidth
          />
        </div>

        {Object.entries(productsByCategory).map(([category, subcats]) => (
          <div key={category} className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">{category}</h2>
            {Object.entries(subcats).map(([subcat, prods]) => (
              <div key={subcat} className="mb-4">
                <h3 className="text-md font-medium text-gray-700 mb-2">{subcat}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {prods.map((product) => (
                    <Card key={product._id} className="transform transition-transform duration-200 hover:scale-105">
                      <CardBody className="p-4">
                        <h3 className="font-medium text-gray-800">{product.name}</h3>
                        <p className="text-sm text-gray-500 mb-2">
                          {state.currentOrder.staffDiscount
                            ? formatCurrency(product.staffPrice)
                            : formatCurrency(product.sellPrice)}
                        </p>
                        <p className="text-xs text-gray-500 mb-4">
                          Available: {product.stock}
                        </p>
                        <Button
                          variant="primary"
                          size="sm"
                          fullWidth
                          onClick={() => handleAddItem(product)}
                          disabled={product.stock === 0}
                        >
                          Add to Order
                        </Button>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Order Section */}
      <div>
        <Card className="sticky top-4">
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-800">Current Order</h2>
          </CardHeader>

          <CardBody className="max-h-[calc(100vh-300px)] overflow-y-auto">
            {state.currentOrder.items.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No items in order yet
              </div>
            ) : (
              <div className="space-y-4">
                {state.currentOrder.items.map((item) => (
                  <div key={item.productId} className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-800">{item.name}</h3>
                      <p className="text-sm text-gray-500">
                        {formatCurrency(item.price)} x {item.quantity}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleUpdateQuantity(item.productId, item.quantity - 1)}
                      >
                        <Minus size={16} />
                      </Button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleUpdateQuantity(item.productId, item.quantity + 1)}
                      >
                        <Plus size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleRemoveItem(item.productId)}
                      >
                        <Trash2 size={16} className="text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>

          <CardFooter className="border-t border-gray-200 bg-gray-50">
            <div className="w-full space-y-4">
              <div className="flex items-center justify-between">
                <Toggle
                  label="Staff Discount"
                  checked={state.currentOrder.staffDiscount}
                  onChange={handleStaffDiscountToggle}
                />
                <p className="font-semibold text-lg">
                  {formatCurrency(state.currentOrder.total)}
                </p>
              </div>

              {state.currentOrder.staffDiscount && (
                <Input
                  placeholder="Staff Name"
                  value={staffName}
                  onChange={handleStaffNameChange}
                  fullWidth
                />
              )}

              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => dispatch({ type: 'RESET_ORDER' })}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => setPaymentModalOpen(true)}
                  disabled={state.currentOrder.items.length === 0 || (state.currentOrder.staffDiscount && !staffName)}
                >
                  Pay
                </Button>
              </div>
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* Payment Modal */}
      <Modal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title="Payment"
        size="sm"
      >
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select Payment Method</h3>
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant={paymentMethod === 'Cash' ? 'primary' : 'outline'}
                fullWidth
                onClick={() => setPaymentMethod('Cash')}
                leftIcon={<DollarSign size={18} />}
              >
                Cash
              </Button>
              <Button
                variant={paymentMethod === 'InstaPay' ? 'primary' : 'outline'}
                fullWidth
                onClick={() => setPaymentMethod('InstaPay')}
                leftIcon={<CreditCard size={18} />}
              >
                InstaPay
              </Button>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <div className="flex justify-between mb-2">
              <span className="font-medium">Subtotal:</span>
              <span>{formatCurrency(state.currentOrder.total)}</span>
            </div>
            {state.currentOrder.staffDiscount && (
              <div className="flex justify-between mb-2 text-blue-600">
                <span className="font-medium">Staff Discount:</span>
                <span>Applied</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t border-gray-200">
              <span>Total:</span>
              <span>{formatCurrency(state.currentOrder.total)}</span>
            </div>
          </div>

          <div className="flex space-x-3">
            <Button
              variant="outline"
              fullWidth
              onClick={() => setPaymentModalOpen(false)}
              leftIcon={<X size={18} />}
            >
              Cancel
            </Button>
            <Button
              variant="success"
              fullWidth
              onClick={handlePayment}
              leftIcon={<Check size={18} />}
            >
              Confirm
            </Button>
          </div>
        </div>
      </Modal>

      {/* Receipt Modal */}
      <Modal
        isOpen={receiptModalOpen}
        onClose={handleCloseReceipt}
        title="Receipt"
        size="sm"
      >
        <div className="space-y-4">
          <div className="text-center border-b border-gray-200 pb-4">
            <h3 className="font-bold text-xl">RECEIPT</h3>
            <p className="text-gray-500 text-sm">{new Date().toLocaleString()}</p>
          </div>

          <div className="space-y-2">
            {state.completedOrders[state.completedOrders.length - 1]?.items.map((item, index) => (
              <div key={index} className="flex justify-between">
                <span>
                  {item.name} x{item.quantity}
                </span>
                <span>{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200 pt-2 mt-2">
            {state.completedOrders[state.completedOrders.length - 1]?.staffDiscount && (
              <div className="flex justify-between text-blue-600 text-sm">
                <span>Staff Discount</span>
                <span>Applied</span>
              </div>
            )}
            <div className="flex justify-between font-bold mt-2">
              <span>TOTAL</span>
              <span>
                {formatCurrency(state.completedOrders[state.completedOrders.length - 1]?.total || 0)}
              </span>
            </div>
            <div className="flex justify-between text-sm text-gray-500 mt-1">
              <span>Payment Method</span>
              <span>{state.completedOrders[state.completedOrders.length - 1]?.paymentMethod}</span>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4 text-center">
            <p className="text-sm text-gray-500">Thank you for your purchase!</p>
            <Button
              variant="primary"
              fullWidth
              className="mt-4"
              onClick={handleCloseReceipt}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CashierInterface;