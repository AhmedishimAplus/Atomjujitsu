import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Card, CardHeader, CardBody } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Modal from '../ui/Modal';
import { ProductItem } from '../../types'; // Omit will be used for formData
import { formatCurrency } from '../../utils/helpers'; // Removed generateId
import { Plus, Edit, Trash2, AlertTriangle, Loader2 } from 'lucide-react';

// Define a type for the form data, excluding 'id' for new products
type ProductFormData = Omit<ProductItem, 'id'>;

const initialFormData: ProductFormData = {
  name: '',
  regularPrice: 0,
  staffPrice: 0,
  purchaseCost: 0,
  quantity: 0,
  reorderThreshold: 0,
  category: 'Drinks', // Default category or ensure it's set from available categories
  image: '', // Optional image field
};

const InventoryManagement: React.FC = () => {
  const { 
    state, 
    // dispatch, // Direct dispatch for CRUD will be replaced by context functions
    addProduct, 
    updateProduct, 
    deleteProduct 
  } = useAppContext();
  
  const { inventory, isMutatingInventory, mutateInventoryError, fetchInventoryError, isLoadingInventory } = state;

  const [searchTerm, setSearchTerm] = useState('');
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  
  // Clear local error when modal closes or operation changes
  useEffect(() => {
    if (!productModalOpen && !deleteModalOpen) {
      setLocalError(null);
    }
  }, [productModalOpen, deleteModalOpen]);
  
  // Filter products based on search term
  const filteredProducts = inventory.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Available categories - ensure this is robust if inventory is initially empty
  const categories = Array.from(
    new Set(inventory.map(product => product.category).filter(Boolean))
  );
  
  // Handle opening the add/edit product modal
  const handleOpenProductModal = (product: ProductItem | null = null) => {
    setLocalError(null); // Clear previous errors
    if (product) {
      setEditingProduct(product);
      // When editing, formData includes all fields from ProductItem
      setFormData({
        name: product.name,
        regularPrice: product.regularPrice,
        staffPrice: product.staffPrice,
        purchaseCost: product.purchaseCost,
        quantity: product.quantity,
        reorderThreshold: product.reorderThreshold,
        category: product.category,
        image: product.image || '',
      });
    } else {
      setEditingProduct(null);
      // For new product, use initialFormData (Omit<ProductItem, 'id'>)
      setFormData({...initialFormData, category: categories[0] || 'Drinks' });
    }
    setProductModalOpen(true);
  };
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    let parsedValue: string | number = value;
    if (type === 'number') {
      parsedValue = value === '' ? '' : parseFloat(value); // Keep empty string for temporary empty input
    }

    setFormData(prev => ({
      ...prev,
      [name]: parsedValue
    }));
  };
  
  // Handle category selection
  const handleCategoryChange = (value: string) => {
    // If user selects "+ Add New Category", we might open another input or modal
    // For now, assume 'New Category' is a temporary value to trigger new category input logic
    if (value === 'New Category') {
      // Potentially show a new input field for the new category name
      // For this example, we'll just set it and expect another field to capture the new name
      // Or, the form could have a dedicated "newCategoryName" field that appears.
    }
    setFormData(prev => ({
      ...prev,
      category: value
    }));
  };
  
  // Handle saving product
  const handleSaveProduct = async () => {
    setLocalError(null);
    // Ensure numeric fields are numbers, provide defaults if empty string was temporarily set
    const numericFields: (keyof ProductFormData)[] = ['regularPrice', 'staffPrice', 'purchaseCost', 'quantity', 'reorderThreshold'];
    const processedFormData = { ...formData };

    for (const field of numericFields) {
      if (processedFormData[field] === '' || isNaN(Number(processedFormData[field]))) {
        processedFormData[field] = 0; // Default to 0 if empty or NaN
      } else {
        processedFormData[field] = Number(processedFormData[field]);
      }
    }
    
    // Basic validation
    if (!processedFormData.name || processedFormData.regularPrice < 0 || processedFormData.quantity < 0) {
      setLocalError("Product name, valid price, and quantity are required.");
      return;
    }

    try {
      if (editingProduct && editingProduct.id) {
        // Update existing product (id is from editingProduct, not formData)
        await updateProduct(editingProduct.id, processedFormData);
      } else {
        // Add new product (formData is Omit<ProductItem, 'id'>)
        await addProduct(processedFormData);
      }
      setProductModalOpen(false);
      setEditingProduct(null); // Reset editing state
    } catch (error: any) {
      console.error("Failed to save product:", error);
      setLocalError(error.message || "An error occurred while saving the product.");
      // Modal remains open to show the error
    }
  };
  
  // Handle opening delete confirmation modal
  const handleOpenDeleteModal = (product: ProductItem) => {
    setLocalError(null); // Clear previous errors
    setEditingProduct(product);
    setDeleteModalOpen(true);
  };
  
  // Handle deleting product
  const handleDeleteProduct = async () => {
    if (editingProduct && editingProduct.id) {
      setLocalError(null);
      try {
        await deleteProduct(editingProduct.id);
        setDeleteModalOpen(false);
        setEditingProduct(null); // Reset editing state
      } catch (error: any) {
        console.error("Failed to delete product:", error);
        setLocalError(error.message || "An error occurred while deleting the product.");
        // Modal remains open
      }
    }
  };
  
  if (isLoadingInventory) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-700">Loading inventory...</p>
      </div>
    );
  }

  if (fetchInventoryError) {
    return (
      <div className="text-center py-10">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
        <h3 className="mt-2 text-lg font-medium text-red-700">Failed to load inventory</h3>
        <p className="mt-1 text-sm text-gray-600">{fetchInventoryError}</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
        <Button
          variant="primary"
          onClick={() => handleOpenProductModal()}
          leftIcon={<Plus size={18} />}
          disabled={isMutatingInventory}
        >
          Add Product
        </Button>
      </div>
      
      {mutateInventoryError && !localError && ( // Show global error if no local error from current operation
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Operation Error: </strong>
          <span className="block sm:inline">{mutateInventoryError}</span>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-800">Products</h2>
          <Input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64"
          />
        </CardHeader>
        
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Regular Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Staff Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reorder At
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.length === 0 && !isLoadingInventory && (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      No products found.
                    </td>
                  </tr>
                )}
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{product.name}</div>
                      {product.image && <img src={product.image} alt={product.name} className="h-10 w-10 object-cover rounded mt-1"/>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{product.category}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatCurrency(product.regularPrice)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatCurrency(product.staffPrice)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatCurrency(product.purchaseCost)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${product.quantity <= product.reorderThreshold ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                        {product.quantity}
                        {product.quantity <= product.reorderThreshold && (
                          <AlertTriangle size={16} className="inline ml-1 text-red-500" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{product.reorderThreshold}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenProductModal(product)}
                        className="text-blue-600 hover:text-blue-800 mr-2"
                        disabled={isMutatingInventory}
                        aria-label="Edit product"
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDeleteModal(product)}
                        className="text-red-600 hover:text-red-800"
                        disabled={isMutatingInventory}
                        aria-label="Delete product"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
      
      {/* Product Modal */}
      <Modal
        isOpen={productModalOpen}
        onClose={() => !isMutatingInventory && setProductModalOpen(false)}
        title={editingProduct ? 'Edit Product' : 'Add New Product'}
        size="lg" // Increased size for more fields
      >
        <div className="space-y-4">
          {localError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{localError}</span>
            </div>
          )}
          <Input
            label="Product Name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            fullWidth
            disabled={isMutatingInventory}
            required
          />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              type="number"
              label="Regular Price"
              name="regularPrice"
              value={formData.regularPrice.toString()} // Ensure value is string for input
              onChange={handleInputChange}
              fullWidth
              step="0.01"
              min="0"
              disabled={isMutatingInventory}
              required
            />
            <Input
              type="number"
              label="Staff Price"
              name="staffPrice"
              value={formData.staffPrice.toString()}
              onChange={handleInputChange}
              fullWidth
              step="0.01"
              min="0"
              disabled={isMutatingInventory}
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              type="number"
              label="Purchase Cost"
              name="purchaseCost"
              value={formData.purchaseCost.toString()}
              onChange={handleInputChange}
              fullWidth
              step="0.01"
              min="0"
              disabled={isMutatingInventory}
            />
            <Select
              label="Category"
              options={[
                ...categories.map(cat => ({ value: cat, label: cat })),
                // Simple text input for new category for now
              ]}
              value={formData.category}
              onChange={(value) => handleCategoryChange(value as string)}
              fullWidth
              disabled={isMutatingInventory}
            />
          </div>
           {/* Optional: Input for new category if that flow is complex */}
           <Input
            label="Category Name (if new or to change)"
            name="category"
            value={formData.category}
            onChange={handleInputChange}
            placeholder="Enter category name"
            fullWidth
            disabled={isMutatingInventory}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              type="number"
              label="Quantity in Stock"
              name="quantity"
              value={formData.quantity.toString()}
              onChange={handleInputChange}
              fullWidth
              min="0"
              disabled={isMutatingInventory}
              required
            />
            <Input
              type="number"
              label="Reorder Threshold"
              name="reorderThreshold"
              value={formData.reorderThreshold.toString()}
              onChange={handleInputChange}
              fullWidth
              min="0"
              disabled={isMutatingInventory}
            />
          </div>

          <Input
            label="Image URL (Optional)"
            name="image"
            value={formData.image || ''}
            onChange={handleInputChange}
            fullWidth
            disabled={isMutatingInventory}
          />
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setProductModalOpen(false)}
              disabled={isMutatingInventory}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveProduct}
              disabled={isMutatingInventory || !formData.name}
              leftIcon={isMutatingInventory ? <Loader2 className="animate-spin" size={18} /> : undefined}
            >
              {isMutatingInventory ? (editingProduct ? 'Updating...' : 'Adding...') : (editingProduct ? 'Update Product' : 'Add Product')}
            </Button>
          </div>
        </div>
      </Modal>
      
      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => !isMutatingInventory && setDeleteModalOpen(false)}
        title="Confirm Deletion"
        size="sm"
      >
        <div className="space-y-4">
          {localError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{localError}</span>
            </div>
          )}
          <p className="text-gray-700">
            Are you sure you want to delete the product: <span className="font-medium">{editingProduct?.name}</span>?
            This action cannot be undone.
          </p>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
              disabled={isMutatingInventory}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteProduct}
              disabled={isMutatingInventory}
              leftIcon={isMutatingInventory ? <Loader2 className="animate-spin" size={18} /> : undefined}
            >
              {isMutatingInventory ? 'Deleting...' : 'Delete Product'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default InventoryManagement;