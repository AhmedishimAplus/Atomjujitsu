import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Card, CardHeader, CardBody } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Modal from '../ui/Modal';
import { ProductItem } from '../../types';
import { formatCurrency, generateId } from '../../utils/helpers';
import { Plus, Edit, Trash2, AlertTriangle } from 'lucide-react';

const InventoryManagement: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  
  const [formData, setFormData] = useState<Omit<ProductItem, 'id'>>({
    name: '',
    regularPrice: 0,
    staffPrice: 0,
    purchaseCost: 0,
    quantity: 0,
    reorderThreshold: 0,
    category: 'Drinks'
  });
  
  // Filter products based on search term
  const filteredProducts = state.inventory.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Available categories
  const categories = Array.from(
    new Set(state.inventory.map(product => product.category))
  );
  
  // Handle opening the add/edit product modal
  const handleOpenProductModal = (product: ProductItem | null = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        regularPrice: product.regularPrice,
        staffPrice: product.staffPrice,
        purchaseCost: product.purchaseCost,
        quantity: product.quantity,
        reorderThreshold: product.reorderThreshold,
        category: product.category
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        regularPrice: 0,
        staffPrice: 0,
        purchaseCost: 0,
        quantity: 0,
        reorderThreshold: 0,
        category: categories[0] || 'Drinks'
      });
    }
    setProductModalOpen(true);
  };
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'name' || name === 'category' ? value : parseFloat(value)
    }));
  };
  
  // Handle category selection
  const handleCategoryChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      category: value
    }));
  };
  
  // Handle saving product
  const handleSaveProduct = () => {
    if (editingProduct) {
      // Update existing product
      dispatch({
        type: 'UPDATE_PRODUCT',
        payload: {
          ...formData,
          id: editingProduct.id
        }
      });
    } else {
      // Add new product
      dispatch({
        type: 'ADD_PRODUCT',
        payload: {
          ...formData,
          id: generateId()
        }
      });
    }
    setProductModalOpen(false);
  };
  
  // Handle opening delete confirmation modal
  const handleOpenDeleteModal = (product: ProductItem) => {
    setEditingProduct(product);
    setDeleteModalOpen(true);
  };
  
  // Handle deleting product
  const handleDeleteProduct = () => {
    if (editingProduct) {
      dispatch({
        type: 'REMOVE_PRODUCT',
        payload: editingProduct.id
      });
    }
    setDeleteModalOpen(false);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
        <Button
          variant="primary"
          onClick={() => handleOpenProductModal()}
          leftIcon={<Plus size={18} />}
        >
          Add Product
        </Button>
      </div>
      
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
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{product.name}</div>
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
                          <AlertTriangle size={16} className="inline ml-1" />
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
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDeleteModal(product)}
                        className="text-red-600 hover:text-red-800"
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
        onClose={() => setProductModalOpen(false)}
        title={editingProduct ? 'Edit Product' : 'Add Product'}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Product Name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            fullWidth
          />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              type="number"
              label="Regular Price"
              name="regularPrice"
              value={formData.regularPrice}
              onChange={handleInputChange}
              fullWidth
              step="0.01"
              min="0"
            />
            <Input
              type="number"
              label="Staff Price"
              name="staffPrice"
              value={formData.staffPrice}
              onChange={handleInputChange}
              fullWidth
              step="0.01"
              min="0"
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              type="number"
              label="Purchase Cost"
              name="purchaseCost"
              value={formData.purchaseCost}
              onChange={handleInputChange}
              fullWidth
              step="0.01"
              min="0"
            />
            <Select
              label="Category"
              options={[
                ...categories.map(cat => ({ value: cat, label: cat })),
                { value: 'New Category', label: '+ Add New Category' }
              ]}
              value={formData.category}
              onChange={handleCategoryChange}
              fullWidth
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              type="number"
              label="Quantity in Stock"
              name="quantity"
              value={formData.quantity}
              onChange={handleInputChange}
              fullWidth
              min="0"
            />
            <Input
              type="number"
              label="Reorder Threshold"
              name="reorderThreshold"
              value={formData.reorderThreshold}
              onChange={handleInputChange}
              fullWidth
              min="0"
            />
          </div>
          
          {formData.category === 'New Category' && (
            <Input
              label="New Category Name"
              name="category"
              value=""
              onChange={handleInputChange}
              fullWidth
            />
          )}
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setProductModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveProduct}
              disabled={!formData.name}
            >
              {editingProduct ? 'Update' : 'Add'} Product
            </Button>
          </div>
        </div>
      </Modal>
      
      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Product"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete <span className="font-medium">{editingProduct?.name}</span>?
            This action cannot be undone.
          </p>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteProduct}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default InventoryManagement;