import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Card, CardHeader, CardBody, CardFooter } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Toggle from '../ui/Toggle';
import Modal from '../ui/Modal';
import { ProductItem, PurchasePayload } from '../../types'; // Import PurchasePayload
import { formatCurrency } from '../../utils/helpers';
import { Minus, Plus, Trash2, Check, X, DollarSign, CreditCard, Loader2, AlertTriangle } from 'lucide-react';

const CashierInterface: React.FC = () => {
  const { 
    state, 
    dispatch,  // Keep dispatch for non-API actions like UI changes if any remain
    createPurchase, // Use the new context function
    fetchProducts // For potential manual refresh, though createPurchase handles it
  } = useAppContext();

  const { 
    inventory, 
    currentOrder, 
    completedOrders, 
    staffMembers, // For staff discount logic
    isCreatingPurchase, 
    createPurchaseError,
    isLoadingInventory,
    fetchInventoryError 
  } = state;

  const [searchTerm, setSearchTerm] = useState('');
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [lastCompletedOrderForReceipt, setLastCompletedOrderForReceipt] = useState<typeof currentOrder | null>(null);
  const [paymentMethodUI, setPaymentMethodUI] = useState<'InstaPay' | 'Cash'>('Cash');
  const [staffNameUI, setStaffNameUI] = useState('');
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Effect to clear payment error when modal closes or on successful payment
  useEffect(() => {
    if (!paymentModalOpen || receiptModalOpen) {
      setPaymentError(null);
    }
  }, [paymentModalOpen, receiptModalOpen]);

  // Effect to update local staffNameUI if context staffName changes (e.g. from another component or reset)
  useEffect(() => {
    setStaffNameUI(currentOrder.staffName || '');
  }, [currentOrder.staffName]);
  
  // Filter products based on search term
  const filteredProducts = inventory.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Group products by category
  const productsByCategory = filteredProducts.reduce((acc, product) => {
    if (!acc[product.category]) {
      acc[product.category] = [];
    }
    acc[product.category].push(product);
    return acc;
  }, {} as Record<string, ProductItem[]>);
  
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
        staffName: enabled ? staffNameUI : '' // Use local staffNameUI
      }
    });
  };
  
  // Handle staff name change
  const handleStaffNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStaffName = e.target.value;
    setStaffNameUI(newStaffName); // Update local UI state
    if (currentOrder.staffDiscount) { // Check context's staffDiscount status
      dispatch({
        type: 'SET_STAFF_DISCOUNT',
        payload: {
          enabled: true,
          staffName: newStaffName
        }
      });
    }
  };
  
  // Handle payment
  const handlePayment = async () => {
    if (!currentOrder || currentOrder.items.length === 0) {
      setPaymentError("Cannot process empty order.");
      return;
    }
    setPaymentError(null);

    const payload: PurchasePayload = {
      items: currentOrder.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        // priceAtPurchase: item.price // Optional: if backend needs this
      })),
      paymentMethod: paymentMethodUI,
      staffName: currentOrder.staffDiscount ? currentOrder.staffName : undefined,
      totalAmount: currentOrder.total,
      staffDiscountApplied: currentOrder.staffDiscount,
      // transactionId: paymentMethodUI === 'InstaPay' ? 'someInstaPayTxId' : undefined, // Example
    };

    try {
      const completedOrderResult = await createPurchase(payload);
      if (completedOrderResult) {
        // The CREATE_PURCHASE_SUCCESS action in reducer already updates completedOrders and resets currentOrder.
        // It also triggers product refetch.
        // The dispatch({ type: 'COMPLETE_ORDER', ... }) call for staff allowance might still be needed
        // if that logic is purely client-side and not part of the backend purchase creation.
        // However, it's better if all order effects are handled by the backend or triggered by its response.
        // For now, let's assume the staff allowance update in COMPLETE_ORDER reducer is okay as a local effect.
        if (currentOrder.staffDiscount && currentOrder.staffName) {
             dispatch({ type: 'COMPLETE_ORDER', payload: { paymentMethod: paymentMethodUI } }); // To trigger staff allowance update
        }

        setLastCompletedOrderForReceipt(completedOrderResult); // Use the direct result for the receipt
        setPaymentModalOpen(false);
        setReceiptModalOpen(true);
        setStaffNameUI(''); // Reset local staff name
        // currentOrder is reset by CREATE_PURCHASE_SUCCESS
      } else {
        // This case should ideally be handled by the error catch block
        setPaymentError(createPurchaseError || "Purchase creation failed to return an order.");
      }
    } catch (error: any) {
      console.error("Payment failed:", error);
      setPaymentError(error.message || createPurchaseError || "An unknown error occurred during payment.");
    }
  };
  
  // Handle closing receipt and resetting
  const handleCloseReceipt = () => {
    setReceiptModalOpen(false);
    setLastCompletedOrderForReceipt(null);
    setStaffNameUI(''); // Reset local staff name
    setPaymentMethodUI('Cash'); // Reset payment method for next order
    // currentOrder is already reset by CREATE_PURCHASE_SUCCESS
    // Staff discount in currentOrder (now new order) should be false by default
  };
  
  if (isLoadingInventory && inventory.length === 0) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-blue-600" /> <p className="ml-3 text-lg">Loading products...</p></div>;
  }

  if (fetchInventoryError) {
    return <div className="text-center py-20 text-red-600">
      <AlertTriangle size={48} className="mx-auto mb-4"/>
      <p className="text-xl">Error loading products: {fetchInventoryError}</p>
      <Button onClick={() => fetchProducts()} className="mt-4">Try Again</Button>
      </div>;
  }

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
        
        {Object.entries(productsByCategory).length === 0 && !isLoadingInventory && (
          <div className="text-center py-10 text-gray-500">No products available.</div>
        )}
        {Object.entries(productsByCategory).map(([category, products]) => (
          <div key={category} className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">{category}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {products.map((product) => (
                <Card key={product.id} className={`transform transition-transform duration-200 hover:scale-105 ${product.quantity === 0 ? 'opacity-50' : ''}`}>
                  <CardBody className="p-4">
                    <h3 className="font-medium text-gray-800">{product.name}</h3>
                    <p className="text-sm text-gray-500 mb-2">
                      {currentOrder.staffDiscount
                        ? formatCurrency(product.staffPrice)
                        : formatCurrency(product.regularPrice)}
                    </p>
                    <p className={`text-xs mb-4 ${product.quantity <= product.reorderThreshold ? 'text-red-500 font-semibold' : 'text-gray-500'}`}>
                      Available: {product.quantity}
                      {product.quantity <= product.reorderThreshold && product.quantity > 0 && <AlertTriangle size={14} className="inline ml-1 text-orange-500" />}
                      {product.quantity === 0 && <span className="ml-1 text-red-600 font-bold">Out of Stock</span>}
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      fullWidth
                      onClick={() => handleAddItem(product)}
                      disabled={product.quantity === 0 || isCreatingPurchase}
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
      
      {/* Order Section */}
      <div>
        <Card className="sticky top-4">
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-800">Current Order</h2>
          </CardHeader>
          
          <CardBody className="max-h-[calc(100vh-300px)] overflow-y-auto">
            {currentOrder.items.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No items in order yet
              </div>
            ) : (
              <div className="space-y-4">
                {currentOrder.items.map((item) => (
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
                        disabled={isCreatingPurchase}
                      >
                        <Minus size={16} />
                      </Button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleUpdateQuantity(item.productId, item.quantity + 1)}
                        disabled={isCreatingPurchase}
                      >
                        <Plus size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleRemoveItem(item.productId)}
                        disabled={isCreatingPurchase}
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
                  checked={currentOrder.staffDiscount}
                  onChange={handleStaffDiscountToggle}
                  disabled={isCreatingPurchase}
                />
                <p className="font-semibold text-lg">
                  {formatCurrency(currentOrder.total)}
                </p>
              </div>
              
              {currentOrder.staffDiscount && (
                <Input
                  placeholder="Staff Name"
                  value={staffNameUI}
                  onChange={handleStaffNameChange}
                  fullWidth
                  disabled={isCreatingPurchase}
                  required={currentOrder.staffDiscount}
                />
              )}
              
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => dispatch({ type: 'RESET_ORDER' })}
                  disabled={isCreatingPurchase}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => { setPaymentError(null); setPaymentModalOpen(true); }}
                  disabled={currentOrder.items.length === 0 || (currentOrder.staffDiscount && !currentOrder.staffName) || isCreatingPurchase}
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
        onClose={() => !isCreatingPurchase && setPaymentModalOpen(false)}
        title="Confirm Payment"
        size="sm"
      >
        <div className="space-y-6">
          {paymentError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded" role="alert">
              <strong className="font-bold">Payment Error: </strong>
              <span>{paymentError}</span>
            </div>
          )}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select Payment Method</h3>
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant={paymentMethodUI === 'Cash' ? 'primary' : 'outline'}
                fullWidth
                onClick={() => setPaymentMethodUI('Cash')}
                leftIcon={<DollarSign size={18} />}
                disabled={isCreatingPurchase}
              >
                Cash
              </Button>
              <Button
                variant={paymentMethodUI === 'InstaPay' ? 'primary' : 'outline'}
                fullWidth
                onClick={() => setPaymentMethodUI('InstaPay')}
                leftIcon={<CreditCard size={18} />}
                disabled={isCreatingPurchase}
              >
                InstaPay
              </Button>
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-4">
            <div className="flex justify-between mb-2">
              <span className="font-medium">Subtotal:</span>
              <span>{formatCurrency(currentOrder.total)}</span>
            </div>
            {currentOrder.staffDiscount && (
              <div className="flex justify-between mb-2 text-blue-600">
                <span className="font-medium">Staff Discount ({currentOrder.staffName}):</span>
                <span>Applied</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t border-gray-200">
              <span>Total Due:</span>
              <span>{formatCurrency(currentOrder.total)}</span>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <Button
              variant="outline"
              fullWidth
              onClick={() => setPaymentModalOpen(false)}
              leftIcon={<X size={18} />}
              disabled={isCreatingPurchase}
            >
              Cancel
            </Button>
            <Button
              variant="success"
              fullWidth
              onClick={handlePayment}
              leftIcon={isCreatingPurchase ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
              disabled={isCreatingPurchase}
            >
              {isCreatingPurchase ? 'Processing...' : 'Confirm Payment'}
            </Button>
          </div>
        </div>
      </Modal>
      
      {/* Receipt Modal */}
      {lastCompletedOrderForReceipt && (
        <Modal
          isOpen={receiptModalOpen}
          onClose={handleCloseReceipt}
          title="Transaction Receipt"
          size="sm"
        >
          <div className="space-y-4">
            <div className="text-center border-b border-gray-200 pb-4">
              <h3 className="font-bold text-xl">RECEIPT</h3>
              <p className="text-gray-500 text-sm">Order ID: {lastCompletedOrderForReceipt.id}</p>
              <p className="text-gray-500 text-sm">{new Date(lastCompletedOrderForReceipt.timestamp).toLocaleString()}</p>
            </div>
            
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {lastCompletedOrderForReceipt.items.map((item, index) => (
                <div key={index} className="flex justify-between">
                  <span className="flex-1 pr-2">
                    {item.name} <span className="text-gray-500">x{item.quantity}</span>
                  </span>
                  <span className="text-right">{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            
            <div className="border-t border-gray-200 pt-2 mt-2">
              {lastCompletedOrderForReceipt.staffDiscount && (
                <div className="flex justify-between text-blue-600 text-sm">
                  <span>Staff Discount ({lastCompletedOrderForReceipt.staffName})</span>
                  <span>Applied</span>
                </div>
              )}
              <div className="flex justify-between font-bold mt-2">
                <span>TOTAL</span>
                <span>
                  {formatCurrency(lastCompletedOrderForReceipt.total || 0)}
                </span>
              </div>
              <div className="flex justify-between text-sm text-gray-500 mt-1">
                <span>Payment Method</span>
                <span>{lastCompletedOrderForReceipt.paymentMethod}</span>
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
                New Order
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CashierInterface;