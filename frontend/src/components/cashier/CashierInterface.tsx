import React, { useEffect, useState, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Card, CardHeader, CardBody, CardFooter } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Toggle from '../ui/Toggle';
import Modal from '../ui/Modal';
import Select from '../ui/Select';
import { ProductItem } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import { Trash2, Check, X, DollarSign, CreditCard, ChevronUp, ChevronDown } from 'lucide-react';
import { getProducts, getCategories, createSale } from '../../services/api';
import * as staffApi from '../../services/staffApi';
import qrCodeImg from '../../assets/instapay.jpeg';

const CashierInterface: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false); const [paymentMethod, setPaymentMethod] = useState<'InstaPay' | 'Cash'>('Cash'); const [staffName, setStaffName] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<{ id: string; name: string; Large_bottles: number; Small_bottles: number }[]>([]);  // Fetch products, categories, and staff on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsData, categoriesData, staffData] = await Promise.all([
          getProducts(),
          getCategories(),
          staffApi.getStaffList()
        ]);
        setProducts(productsData.filter((p: ProductItem) => p.isAvailable));
        setCategories(categoriesData);        // Format staff data for dropdown
        const formattedStaffList = staffData.map((staff: any) => ({
          id: staff._id,
          name: staff.name,
          Large_bottles: staff.Large_bottles,
          Small_bottles: staff.Small_bottles
        }));
        setStaffList(formattedStaffList);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, []);

  // Refresh staff data when receipt modal changes state
  // This ensures we always have the latest allowance data
  useEffect(() => {
    if (receiptModalOpen) {
      refreshStaffData();
    }
  }, [receiptModalOpen]);

  // Filter products based on search term
  const filteredProducts = useMemo(() =>
    products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      product.isAvailable
    ), [products, searchTerm]);

  // Group products by category and subcategory, showing all categories/subcategories
  const productsByCategory = useMemo(() => {
    const grouped: Record<string, Record<string, ProductItem[]>> = {};
    // Initialize all categories and subcategories
    categories.forEach(cat => {
      if (cat.name) {
        grouped[cat.name] = {};
        (cat.subcategories || []).forEach((subcat: { name: string }) => {
          if (subcat.name) {
            grouped[cat.name][subcat.name] = [];
          }
        });
      }
    });
    // Place products in their correct category/subcategory
    filteredProducts.forEach((product: ProductItem) => {
      // Handle both string and object for categoryId
      let catId: string | undefined = undefined;
      if (typeof product.categoryId === 'string') {
        catId = product.categoryId;
      } else if (product.categoryId && typeof product.categoryId === 'object' && '_id' in product.categoryId) {
        catId = (product.categoryId as any)._id;
      }
      const cat = categories.find(c => c._id === catId);
      if (cat && cat.name && product.subcategory) {
        // Find the subcategory by case-insensitive, trimmed match
        const subcat = (cat.subcategories || []).find((s: { name: string }) =>
          s.name.trim().toLowerCase() === product.subcategory.trim().toLowerCase()
        );
        if (subcat) {
          if (!grouped[cat.name][subcat.name]) {
            grouped[cat.name][subcat.name] = [];
          }
          grouped[cat.name][subcat.name].push(product);
        }
      }
    });
    return grouped;
  }, [filteredProducts, categories]);

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
  };  // Handle staff discount toggle
  const handleStaffDiscountToggle = (enabled: boolean) => {
    if (!enabled) {
      // Reset staff name when disabling discount
      setStaffName('');
      setSelectedStaff(null);
    }

    dispatch({
      type: 'SET_STAFF_DISCOUNT',
      payload: {
        enabled,
        staffName: enabled ? staffName : ''
      }
    });
  };  // Handle staff name change
  const handleStaffNameChange = async (value: string) => {
    setStaffName(value);

    // If staff name is cleared, reset the selected staff
    if (!value) {
      setSelectedStaff(null);
      return;
    }

    // Define the staff type
    type StaffType = {
      id: string;
      name: string;
      Large_bottles: number;
      Small_bottles: number;
    };

    // First refresh staff data to get the most up-to-date allowances
    try {
      const updatedStaffList = await refreshStaffData();

      // Find the selected staff member with the latest data
      const staff = updatedStaffList.find((s: StaffType) => s.name === value) ||
        staffList.find((s: StaffType) => s.name === value);

      setSelectedStaff(staff || null);

      if (state.currentOrder.staffDiscount) {
        dispatch({
          type: 'SET_STAFF_DISCOUNT',
          payload: {
            enabled: true,
            staffName: value,
            staffId: staff?.id
          }
        });
      }
    } catch (error) {
      console.error('Error updating staff data:', error);

      // Fallback to current staff list if refresh fails
      const staff = staffList.find((s: { id: string; name: string }) => s.name === value);
      setSelectedStaff(staff || null);

      if (state.currentOrder.staffDiscount && staff) {
        dispatch({
          type: 'SET_STAFF_DISCOUNT',
          payload: {
            enabled: true,
            staffName: value,
            staffId: staff?.id
          }
        });
      }
    }
  };// Calculate preview of final totals with water bottle allowances
  const calculatePreviewTotal = () => {
    const order = state.currentOrder;
    let total = 0;

    if (order.staffDiscount && selectedStaff) {
      // Track how many water bottles would be free
      let largeFreeRemaining = selectedStaff.Large_bottles;
      let smallFreeRemaining = selectedStaff.Small_bottles;

      for (const item of order.items) {
        const isLargeWaterBottle = item.name.toLowerCase().includes('large water bottle');
        const isSmallWaterBottle = item.name.toLowerCase().includes('small water bottle');

        if (isLargeWaterBottle && largeFreeRemaining > 0) {
          // Calculate how many are free vs. paid
          const freeCount = Math.min(largeFreeRemaining, item.quantity);
          const paidCount = item.quantity - freeCount;

          // Add paid bottles to the total
          total += paidCount * item.price;
          largeFreeRemaining -= freeCount;
        } else if (isSmallWaterBottle && smallFreeRemaining > 0) {
          // Calculate how many are free vs. paid
          const freeCount = Math.min(smallFreeRemaining, item.quantity);
          const paidCount = item.quantity - freeCount;

          // Add paid bottles to the total
          total += paidCount * item.price;
          smallFreeRemaining -= freeCount;
        } else {
          // Not a water bottle or no more free allowance
          total += item.quantity * item.price;
        }
      }
    } else {
      // No staff discount, calculate normal total
      total = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    }

    // Ensure total is never negative
    return Math.max(0, total);
  };
  // Handle payment
  const handlePayment = async () => {
    // Prepare payload for backend
    const order = state.currentOrder;

    // Calculate free water bottle quantities
    interface BottleInfo {
      productId: string;
      freeQuantity: number;
      paidQuantity: number;
    }

    const freeBottleInfo: BottleInfo[] = [];
    const items = order.items.map(item => {
      const itemData: any = {
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        regularPrice: item.regularPrice ?? item.price, // fallback if not present
        staffPrice: item.staffPrice ?? item.price, // fallback if not present
        priceUsed: item.price,
      };

      // Calculate free vs. paid quantities for water bottles
      if (order.staffDiscount && selectedStaff) {
        const isLargeWaterBottle = item.name.toLowerCase().includes('large water bottle');
        const isSmallWaterBottle = item.name.toLowerCase().includes('small water bottle');

        if (isLargeWaterBottle && selectedStaff.Large_bottles > 0) {
          const freeCount = Math.min(selectedStaff.Large_bottles, item.quantity);
          itemData.freeQuantity = freeCount;
          itemData.paidQuantity = item.quantity - freeCount;

          freeBottleInfo.push({
            productId: item.productId,
            freeQuantity: freeCount,
            paidQuantity: item.quantity - freeCount
          });
        } else if (isSmallWaterBottle && selectedStaff.Small_bottles > 0) {
          const freeCount = Math.min(selectedStaff.Small_bottles, item.quantity);
          itemData.freeQuantity = freeCount;
          itemData.paidQuantity = item.quantity - freeCount;

          freeBottleInfo.push({
            productId: item.productId,
            freeQuantity: freeCount,
            paidQuantity: item.quantity - freeCount
          });
        }
      }

      return itemData;
    });

    const payload: any = {
      items,
      subtotal: calculatePreviewTotal(),
      staffDiscount: order.staffDiscount,
      paymentMethod,
      total: calculatePreviewTotal(),
    };
    if (order.staffDiscount && selectedStaff) {
      payload.staffName = staffName;
      payload.staffId = selectedStaff.id;
    } try {
      await createSale(payload);

      // Refresh products after sale to update stock
      const productsData = await getProducts();
      setProducts(productsData.filter((p: ProductItem) => p.isAvailable));

      // Refresh staff data to get updated water bottle allowances
      await refreshStaffData();

      dispatch({
        type: 'COMPLETE_ORDER',
        payload: {
          paymentMethod,
          freeBottleInfo
        }
      });

      setPaymentModalOpen(false);
      setReceiptModalOpen(true);
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Payment failed');
    }
  };  // Function to refresh staff data
  const refreshStaffData = async () => {
    try {
      const staffData = await staffApi.getStaffList();
      // Format staff data for dropdown
      const formattedStaffList = staffData.map((staff: any) => ({
        id: staff._id,
        name: staff.name,
        Large_bottles: staff.Large_bottles,
        Small_bottles: staff.Small_bottles
      }));
      setStaffList(formattedStaffList);

      // If a staff member is selected, update their water bottle allowance data
      if (selectedStaff) {
        const updatedStaff = formattedStaffList.find((staff: any) => staff.id === selectedStaff.id);
        if (updatedStaff) {
          setSelectedStaff(updatedStaff);
        }
      }

      return formattedStaffList; // Return the list for use in other functions
    } catch (error) {
      console.error('Error refreshing staff data:', error);
      return []; // Return empty array on error
    }
  };

  // Handle closing receipt and resetting
  const handleCloseReceipt = () => {
    setReceiptModalOpen(false);

    // Refresh the staff data to get the updated bottle allowances
    refreshStaffData();

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
        {categories.map(cat => (
          <div key={cat._id} className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">{cat.name}</h2>
            {(cat.subcategories || []).map((subcat: { name: string }) => (
              <div key={subcat.name} className="mb-4">
                <h3 className="text-md font-medium text-gray-700 mb-2">{subcat.name}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {(productsByCategory[cat.name]?.[subcat.name] || []).length === 0 ? (
                    <div className="text-gray-400 italic">No products</div>
                  ) : (
                    productsByCategory[cat.name][subcat.name].map(product => (
                      <Card key={product._id} className="transform transition-transform duration-200 hover:scale-105">
                        <CardBody className="p-4">
                          <div className="flex flex-col h-full">
                            <h3 className="font-medium text-gray-900">{product.name}</h3>
                            <div className="mt-1 text-sm text-gray-600">
                              {product.description}
                            </div>
                            <div className="mt-auto pt-4">
                              <div className="flex justify-between items-center">
                                <div className="text-lg font-semibold">
                                  {state.currentOrder.staffDiscount ? (
                                    <>
                                      <span className="text-blue-600">${product.staffPrice.toFixed(2)}</span>
                                      <span className="text-sm text-gray-500 line-through ml-2">
                                        ${product.sellPrice.toFixed(2)}
                                      </span>
                                    </>
                                  ) : (
                                    <span>${product.sellPrice.toFixed(2)}</span>
                                  )}
                                </div>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleAddItem(product)}
                                  disabled={!product.isAvailable || product.stock <= 0}
                                >
                                  Add
                                </Button>
                              </div>
                              {product.stock <= 0 && (
                                <p className="text-red-500 text-sm mt-1">Out of stock</p>
                              )}
                              {product.stock > 0 && (
                                <p className="text-xs text-gray-500 mt-1">Stock: {product.stock}</p>
                              )}
                            </div>
                          </div>
                        </CardBody>
                      </Card>
                    ))
                  )}
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
              <div className="space-y-4">                {state.currentOrder.items.map((item) => {                  // Check if this is a water bottle and if staff member has allowances
                const isLargeWaterBottle = item.name.toLowerCase().includes('large water bottle');
                const isSmallWaterBottle = item.name.toLowerCase().includes('small water bottle');

                // Determine free bottle count based on staff allowance
                let freeBottleCount = 0;
                if (state.currentOrder.staffDiscount && selectedStaff) {
                  if (isLargeWaterBottle) {
                    freeBottleCount = Math.min(selectedStaff.Large_bottles, item.quantity);
                  } else if (isSmallWaterBottle) {
                    freeBottleCount = Math.min(selectedStaff.Small_bottles, item.quantity);
                  }
                }

                return (
                  <div key={item.productId} className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex-1">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-gray-500">
                        ${item.price.toFixed(2)} × {item.quantity}
                        {freeBottleCount > 0 && (
                          <span className="ml-1 text-green-600 font-medium">
                            ({freeBottleCount} free)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">                      <div className="text-right">
                      {freeBottleCount > 0 ? (
                        <>
                          <div className="font-medium">
                            ${((item.quantity - freeBottleCount) * item.price).toFixed(2)}
                          </div>
                          <div className="text-xs text-green-600 font-medium">
                            {freeBottleCount} × $0.00 (free)
                          </div>
                          {item.quantity - freeBottleCount > 0 && (
                            <div className="text-xs text-gray-600">
                              {item.quantity - freeBottleCount} × ${item.price.toFixed(2)}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="font-medium">
                          ${(item.quantity * item.price).toFixed(2)}
                        </div>
                      )}
                    </div>
                      <div className="flex flex-col space-y-1">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleUpdateQuantity(item.productId, item.quantity + 1)}
                        >
                          <ChevronUp size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleUpdateQuantity(item.productId, item.quantity - 1)}
                        >
                          <ChevronDown size={14} />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleRemoveItem(item.productId)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                );
              })}
              </div>
            )}
          </CardBody>

          <CardFooter className="border-t border-gray-200 bg-gray-50">
            <div className="w-full space-y-4">              <div className="flex items-center justify-between">
              <Toggle
                label="Staff Discount"
                checked={state.currentOrder.staffDiscount}
                onChange={handleStaffDiscountToggle}
              />
              <p className="font-semibold text-lg">
                {state.currentOrder.staffDiscount && selectedStaff
                  ? formatCurrency(calculatePreviewTotal())
                  : formatCurrency(state.currentOrder.total)}
              </p>
            </div>{state.currentOrder.staffDiscount && (
              <>
                <Select
                  options={[
                    { value: '', label: '-- Select Staff --' },
                    ...staffList.map(staff => ({ value: staff.name, label: staff.name }))
                  ]}
                  label="Staff Name"
                  value={staffName}
                  onChange={handleStaffNameChange}
                  fullWidth
                />
                {staffName && selectedStaff && (
                  <div className="bg-white p-3 rounded-md border border-gray-200 mt-2">
                    <div className="text-sm font-medium text-gray-800 mb-2">Water Bottle Allowance</div>

                    {/* Large Water Bottles */}
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Large Bottles:</span>
                      <span className="font-medium">{selectedStaff.Large_bottles} / 2</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${(selectedStaff.Large_bottles / 2) * 100}%` }}
                      ></div>
                    </div>

                    {/* Show how many large bottles will be used from allowance in this order */}
                    {state.currentOrder.items.some(item => item.name.toLowerCase().includes('large water bottle')) && (
                      <div className="text-xs mb-3 flex justify-between">
                        <span className="text-gray-500">In this order:</span>
                        {(() => {
                          const largeBottleItem = state.currentOrder.items.find(
                            item => item.name.toLowerCase().includes('large water bottle')
                          );
                          const count = largeBottleItem ? Math.min(largeBottleItem.quantity, selectedStaff.Large_bottles) : 0;
                          return (
                            <span className={count > 0 ? "text-green-600 font-medium" : "text-gray-500"}>
                              {count > 0 ? `${count} bottle${count > 1 ? 's' : ''} free` : 'No free bottles'}
                            </span>
                          );
                        })()}
                      </div>
                    )}

                    {/* Small Water Bottles */}
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Small Bottles:</span>
                      <span className="font-medium">{selectedStaff.Small_bottles} / 2</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                      <div
                        className="bg-teal-600 h-2 rounded-full"
                        style={{ width: `${(selectedStaff.Small_bottles / 2) * 100}%` }}
                      ></div>
                    </div>

                    {/* Show how many small bottles will be used from allowance in this order */}
                    {state.currentOrder.items.some(item => item.name.toLowerCase().includes('small water bottle')) && (
                      <div className="text-xs mb-1 flex justify-between">
                        <span className="text-gray-500">In this order:</span>
                        {(() => {
                          const smallBottleItem = state.currentOrder.items.find(
                            item => item.name.toLowerCase().includes('small water bottle')
                          );
                          const count = smallBottleItem ? Math.min(smallBottleItem.quantity, selectedStaff.Small_bottles) : 0;
                          return (
                            <span className={count > 0 ? "text-green-600 font-medium" : "text-gray-500"}>
                              {count > 0 ? `${count} bottle${count > 1 ? 's' : ''} free` : 'No free bottles'}
                            </span>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}<div className="flex space-x-2">
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => {
                    dispatch({ type: 'RESET_ORDER' });
                    setStaffName('');
                  }}
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
            {paymentMethod === 'InstaPay' && (
              <div className="flex flex-col items-center mt-4">
                <img src={qrCodeImg} alt="InstaPay QR Code" className="w-72 h-72 object-contain border rounded shadow bg-white" style={{ background: '#fff', border: '1px solid #ddd' }} />
                <div className="mt-2 text-sm text-gray-700 text-center">
                  Scan this QR code with your InstaPay app to pay.<br />
                  <span className="font-mono text-xs text-gray-500">ahmedaraby2002@instapay</span>
                </div>
              </div>
            )}
          </div>          <div className="border-t border-gray-200 pt-4">            <div className="flex justify-between mb-2">
            <span className="font-medium">Subtotal:</span>
            <span>{formatCurrency(calculatePreviewTotal())}</span>
          </div>{state.currentOrder.staffDiscount && (
            <>
              <div className="flex justify-between mb-2 text-blue-600">
                <span className="font-medium">Staff Discount:</span>
                <span>Applied</span>
              </div>
              {selectedStaff && staffName && (
                <div className="mb-2 text-gray-700 bg-gray-50 p-2 rounded-md">
                  <div className="text-sm font-semibold mb-1">Water Bottle Allowance:</div>
                  {state.currentOrder.items.some(item => item.name.toLowerCase().includes('large water bottle')) && (
                    <div className="flex justify-between text-sm mb-1">
                      <span>Large Bottles:</span>
                      <span>{selectedStaff.Large_bottles} remaining</span>
                    </div>
                  )}
                  {state.currentOrder.items.some(item => item.name.toLowerCase().includes('small water bottle')) && (
                    <div className="flex justify-between text-sm">
                      <span>Small Bottles:</span>
                      <span>{selectedStaff.Small_bottles} remaining</span>
                    </div>
                  )}                    {state.currentOrder.items.some(item => item.name.toLowerCase().includes('large water bottle')) && (
                    <div className="mt-1 text-sm">
                      {(() => {
                        const largeBottleItem = state.currentOrder.items.find(
                          item => item.name.toLowerCase().includes('large water bottle')
                        );
                        const freeCount = Math.min(selectedStaff.Large_bottles, largeBottleItem?.quantity || 0);
                        const paidCount = (largeBottleItem?.quantity || 0) - freeCount;

                        return (
                          <div className="mt-1">
                            {freeCount > 0 && (
                              <div className="text-green-600 font-medium">
                                {freeCount} large bottle{freeCount > 1 ? 's' : ''} free
                              </div>
                            )}
                            {paidCount > 0 && (
                              <div className="text-gray-600">
                                {paidCount} large bottle{paidCount > 1 ? 's' : ''} will be charged
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  {state.currentOrder.items.some(item => item.name.toLowerCase().includes('small water bottle')) && (
                    <div className="text-sm">
                      {(() => {
                        const smallBottleItem = state.currentOrder.items.find(
                          item => item.name.toLowerCase().includes('small water bottle')
                        );
                        const freeCount = Math.min(selectedStaff.Small_bottles, smallBottleItem?.quantity || 0);
                        const paidCount = (smallBottleItem?.quantity || 0) - freeCount;

                        return (
                          <div className="mt-1">
                            {freeCount > 0 && (
                              <div className="text-green-600 font-medium">
                                {freeCount} small bottle{freeCount > 1 ? 's' : ''} free
                              </div>
                            )}
                            {paidCount > 0 && (
                              <div className="text-gray-600">
                                {paidCount} small bottle{paidCount > 1 ? 's' : ''} will be charged
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}
            </>
          )}            <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t border-gray-200">
              <span>Total:</span>
              <span>{formatCurrency(calculatePreviewTotal())}</span>
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
          </div>          <div className="space-y-2">            {state.completedOrders[state.completedOrders.length - 1]?.items.map((item, index) => {
            const isFreeItem = item.freeQuantity && item.freeQuantity > 0;
            const freeQuantity = item.freeQuantity || 0;

            // For display in the receipt, we want to show the full original price
            // but we need to identify whether the item is partially/fully free
            const displayAmount = item.price * item.quantity;

            return (
              <div key={index} className="flex justify-between">
                <span>
                  {item.name} x{item.quantity}
                  {isFreeItem && <span className="text-green-600 text-xs ml-1">({freeQuantity} free)</span>}
                </span>
                <span>{formatCurrency(displayAmount)}</span>
              </div>
            );
          })}
          </div>          <div className="border-t border-gray-200 pt-2 mt-2">
            {state.completedOrders[state.completedOrders.length - 1]?.staffDiscount && (
              <>
                <div className="flex justify-between text-blue-600 text-sm">
                  <span>Staff Discount</span>
                  <span>Applied</span>
                </div>

                {/* Display water bottle allowance info */}
                {(state.completedOrders[state.completedOrders.length - 1]?.items.some(item =>
                  item.name.toLowerCase().includes('water bottle') && item.freeQuantity)) && (
                    <div className="text-green-600 text-sm mt-1">
                      <span>Water Bottle Allowance Applied</span>
                    </div>
                  )}
              </>
            )}<div className="flex justify-between font-bold mt-2">
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