import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Card, CardHeader, CardBody } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Modal from '../ui/Modal';
import { ProductItem } from '../../types';

import { Plus, Edit, Trash2 } from 'lucide-react';
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  createCategory,
  getCategories,
  deleteCategory,
  deleteSubcategory
} from '../../services/api';


const InventoryManagement: React.FC = () => {
  const { } = useAppContext(); // Keeping the context import for future use
  const [searchTerm, setSearchTerm] = useState('');
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '', subcategories: [''] });
  const [products, setProducts] = useState<any[]>([]);
  const [editableField, setEditableField] = useState<{productId: string, field: string, value: string | number} | null>(null);
  const [formData, setFormData] = useState<any>({
    name: '',
    staffPrice: 0,
    sellPrice: 0,
    costPrice: 0,
    stock: 0,
    owner: 'Quarter',
    categoryId: '',
    subcategory: '',
    description: '',
    isAvailable: true
  });
  const [categories, setCategories] = useState<any[]>([]);

  // Fetch products and categories from backend
  const fetchProductsAndCategories = () => {
    getProducts().then(setProducts);
    getCategories().then(setCategories);
  };
  useEffect(() => {
    fetchProductsAndCategories();
  }, []);

  // Filter products based on search term
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle opening the add/edit product modal
  const handleOpenProductModal = (product: ProductItem | null = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        staffPrice: product.staffPrice,
        sellPrice: product.sellPrice,
        costPrice: product.costPrice,
        stock: product.stock,
        owner: product.owner,
        categoryId: product.categoryId,
        subcategory: product.subcategory,
        description: product.description,
        isAvailable: product.isAvailable
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        staffPrice: 0,
        sellPrice: 0,
        costPrice: 0,
        stock: 0,
        owner: 'Quarter',
        categoryId: '',
        subcategory: '',
        description: '',
        isAvailable: true
      });
    }
    setProductModalOpen(true);
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev: typeof formData) => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value
    }));
  };  // No need for handleCategorySelection since it's now handled in the Select onChange directly
  // Handle saving product (create or update via backend)
  const handleSaveProduct = async () => {
    try {
      // Validate required fields
      const subcategories = categories
        .find(cat => cat._id === formData.categoryId)
        ?.subcategories || [];

      const selectedSubcategory = subcategories
        .find((sub: any) => sub.name === formData.subcategory);

      if (!formData.name || !formData.categoryId || !selectedSubcategory) {
        console.log('Form validation failed:', {
          name: formData.name,
          categoryId: formData.categoryId,
          subcategory: formData.subcategory
        });

        let errorMessage = 'Please fill in all required fields:\n';
        if (!formData.name) errorMessage += '- Product Name\n';
        if (!formData.categoryId) errorMessage += '- Category\n';
        if (!selectedSubcategory) errorMessage += '- Subcategory\n';

        alert(errorMessage);
        return;
      }

      if (formData.staffPrice < 0 || formData.sellPrice < 0 || (formData.owner === 'Quarter' && formData.costPrice < 0)) {
        alert('Prices cannot be negative');
        return;
      }

      if (formData.stock < 0) {
        alert('Stock cannot be negative');
        return;
      }

      const payload: any = {
        name: formData.name.trim(),
        staffPrice: parseFloat(formData.staffPrice),
        sellPrice: parseFloat(formData.sellPrice),
        stock: parseInt(formData.stock),
        owner: formData.owner,
        categoryId: formData.categoryId,
        subcategory: formData.subcategory,
        description: formData.description?.trim() || '',
        isAvailable: formData.isAvailable
      };

      // Only include costPrice if owner is Quarter
      if (formData.owner === 'Quarter') {
        payload.costPrice = parseFloat(formData.costPrice);
      } console.log('Submitting payload:', payload);

      if (editingProduct) {
        await updateProduct(editingProduct._id, payload);
      } else {
        await createProduct(payload);
      }

      setProductModalOpen(false);
      fetchProductsAndCategories();
    } catch (error: any) {
      if (error.response?.data?.error) {
        alert(error.response.data.error);
      } else if (error.response?.data?.errors) {
        const errorMessages = error.response.data.errors.map((e: any) => e.msg).join('\n');
        alert(errorMessages);
      } else {
        alert('An error occurred while saving the product');
      }
      console.error('Error saving product:', error);
    }
  };

  // Handle opening delete confirmation modal
  const handleOpenDeleteModal = (product: ProductItem) => {
    setEditingProduct(product);
    setDeleteModalOpen(true);
  };  // Handle deleting product
  const handleDeleteProduct = async () => {
    if (!editingProduct) return;

    try {
      await deleteProduct(editingProduct._id);
      await fetchProductsAndCategories();
      setDeleteModalOpen(false);
    } catch (error: any) {
      console.error('Error deleting product:', error);
      alert(error.response?.data?.error || 'Error deleting product');
    }
  };

  // Category modal handlers
  const handleOpenCategoryModal = () => {
    setCategoryForm({ name: '', subcategories: [''] });
    setCategoryModalOpen(true);
  };  const handleCategoryFormChange = (idx: number, value: string) => {
    setCategoryForm((prev: typeof categoryForm) => {
      const newSubs = [...prev.subcategories];
      newSubs[idx] = value;
      return { ...prev, subcategories: newSubs };
    });
  };  const handleCategoryNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCategoryForm((prev: typeof categoryForm) => ({ ...prev, name: e.target.value }));
  };
  const handleAddSubcategoryField = () => {
    setCategoryForm(prev => ({ ...prev, subcategories: [...prev.subcategories, ''] }));
  };
  const handleRemoveSubcategoryField = (idx: number) => {
    setCategoryForm(prev => ({
      ...prev,
      subcategories: prev.subcategories.filter((_, i) => i !== idx)
    }));
  };
  const handleAddCategory = async () => {
    if (!categoryForm.name || !categoryForm.subcategories.some(s => s.trim())) return;
    const validSubcategories = categoryForm.subcategories.filter(s => s.trim());
    await createCategory({
      name: categoryForm.name,
      subcategories: validSubcategories.map(s => ({ name: s }))
    });
    fetchProductsAndCategories();
    setCategoryModalOpen(false);
  };
  // Category update/delete handlers
  const handleDeleteCategory = async (catId: string) => {
    try {
      await deleteCategory(catId);
      await fetchProductsAndCategories();
    } catch (error: any) {
      console.error('Error deleting category:', error);
      alert(error.response?.data?.error || 'Error deleting category');
    }
  };

  const handleDeleteSubcategory = async (catId: string, subcatName: string) => {
    try {
      await deleteSubcategory(catId, subcatName);
      await fetchProductsAndCategories();
    } catch (error: any) {
      console.error('Error deleting subcategory:', error);
      alert(error.response?.data?.error || 'Error deleting subcategory');
    }
  };

  // Handle direct field editing
  const handleStartEditing = (productId: string, field: string, value: string | number) => {
    setEditableField({ productId, field, value });
  };

  const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (editableField) {
      setEditableField({
        ...editableField,
        value: e.target.value
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, productId: string) => {
    if (e.key === 'Enter' && editableField) {
      handleSaveField(productId);
    } else if (e.key === 'Escape') {
      setEditableField(null);
    }
  };

  const handleSaveField = async (productId: string) => {
    if (!editableField) return;

    try {
      const product = products.find(p => p._id === productId);
      if (!product) return;

      const field = editableField.field;
      let value: number | string = editableField.value;

      // Convert to number for numeric fields
      if (['staffPrice', 'sellPrice', 'costPrice', 'stock'].includes(field)) {
        value = field === 'stock' 
          ? Math.max(0, parseInt(value as string)) 
          : Math.max(0, parseFloat(value as string));
      }

      const payload: any = {
        ...product,
        [field]: value
      };

      // Remove costPrice if owner is not Quarter
      if (product.owner !== 'Quarter' && field !== 'owner') {
        delete payload.costPrice;
      }

      await updateProduct(productId, payload);
      fetchProductsAndCategories();
      setEditableField(null);
    } catch (error) {
      console.error('Error updating field:', error);
      alert('Failed to update product field.');
    }
  };
  
  const handleIncrement = (productId: string, field: string, currentValue: number) => {
    try {
      const product = products.find(p => p._id === productId);
      if (!product) return;

      let step = field === 'stock' ? 1 : 0.5;
      let newValue = Math.max(0, currentValue + step);
      
      const payload = {
        ...product,
        [field]: newValue
      };

      // Remove costPrice if owner is not Quarter
      if (product.owner !== 'Quarter' && field !== 'owner') {
        delete payload.costPrice;
      }

      updateProduct(productId, payload);
      fetchProductsAndCategories();
    } catch (error) {
      console.error('Error incrementing field:', error);
      alert('Failed to update product field.');
    }
  };
  
  const handleDecrement = (productId: string, field: string, currentValue: number) => {
    try {
      const product = products.find(p => p._id === productId);
      if (!product) return;

      let step = field === 'stock' ? 1 : 0.5;
      let newValue = Math.max(0, currentValue - step);
      
      const payload = {
        ...product,
        [field]: newValue
      };

      // Remove costPrice if owner is not Quarter
      if (product.owner !== 'Quarter' && field !== 'owner') {
        delete payload.costPrice;
      }

      updateProduct(productId, payload);
      fetchProductsAndCategories();
    } catch (error) {
      console.error('Error decrementing field:', error);
      alert('Failed to update product field.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
        <div className="flex gap-2">
          <Button variant="primary" onClick={() => handleOpenProductModal()} leftIcon={<Plus size={18} />}>Add Product</Button>
          <Button variant="outline" onClick={handleOpenCategoryModal}>Add Category</Button>
        </div>
      </div>

      {/* Category Management Table */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-800">Categories & Subcategories</h2>
        </CardHeader>
        <CardBody>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2">Category</th>
                <th className="px-4 py-2">Subcategories</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map(cat => (
                <tr key={cat._id}>
                  <td className="px-4 py-2 font-medium">{cat.name}</td>
                  <td className="px-4 py-2">
                    <ul className="flex flex-wrap gap-2">
                      {cat.subcategories.map((sub: any) => (
                        <li key={sub.name} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                          {sub.name}
                          <Button size="xs" variant="ghost" onClick={() => handleDeleteSubcategory(cat._id, sub.name)}><Trash2 size={14} /></Button>
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-4 py-2">
                    <Button size="xs" variant="danger" onClick={() => handleDeleteCategory(cat._id)}><Trash2 size={16} /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      {/* Products Card */}
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
              <thead className="bg-gray-50">                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subcategory
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Owner
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Staff Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sell Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cost Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product) => (
                  <tr key={product._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{product.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {product.categoryId?.name || 'N/A'}
                      </div>
                    </td>                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{product.subcategory || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{product.owner || 'Quarter'}</div>
                    </td>                    <td className="px-6 py-4 whitespace-nowrap">
                      {editableField && editableField.productId === product._id && editableField.field === 'staffPrice' ? (
                        <div className="flex items-center">
                          <input
                            type="number"
                            className="w-20 px-2 py-1 border rounded text-sm"
                            value={editableField.value}
                            onChange={handleFieldChange}
                            onBlur={() => handleSaveField(product._id)}
                            onKeyDown={(e) => handleKeyDown(e, product._id)}
                            step="0.01"
                            min="0"
                            autoFocus
                          />
                        </div>
                      ) : (
                        <div className="flex items-center text-sm text-gray-900 group">                          <button 
                            className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded-full mr-1 text-gray-500 hover:text-white hover:bg-red-500 transition-all"
                            onClick={() => handleDecrement(product._id, 'staffPrice', product.staffPrice)}
                          >
                            -
                          </button>
                          
                          <span 
                            className="cursor-pointer min-w-[40px] text-center"
                            onDoubleClick={() => handleStartEditing(product._id, 'staffPrice', product.staffPrice)}
                          >
                            {product.staffPrice}
                          </span>
                          
                          <button 
                            className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded-full ml-1 text-gray-500 hover:text-white hover:bg-green-500 transition-all"
                            onClick={() => handleIncrement(product._id, 'staffPrice', product.staffPrice)}
                          >
                            +
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editableField && editableField.productId === product._id && editableField.field === 'sellPrice' ? (
                        <div className="flex items-center">
                          <input
                            type="number"
                            className="w-20 px-2 py-1 border rounded text-sm"
                            value={editableField.value}
                            onChange={handleFieldChange}
                            onBlur={() => handleSaveField(product._id)}
                            onKeyDown={(e) => handleKeyDown(e, product._id)}
                            step="0.01"
                            min="0"
                            autoFocus
                          />
                        </div>
                      ) : (
                        <div className="flex items-center text-sm text-gray-900 group">                          <button 
                            className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded-full mr-1 text-gray-500 hover:text-white hover:bg-red-500 transition-all"
                            onClick={() => handleDecrement(product._id, 'sellPrice', product.sellPrice)}
                          >
                            -
                          </button>
                          
                          <span 
                            className="cursor-pointer min-w-[40px] text-center"
                            onDoubleClick={() => handleStartEditing(product._id, 'sellPrice', product.sellPrice)}
                          >
                            {product.sellPrice}
                          </span>
                          
                          <button 
                            className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded-full ml-1 text-gray-500 hover:text-white hover:bg-green-500 transition-all"
                            onClick={() => handleIncrement(product._id, 'sellPrice', product.sellPrice)}
                          >
                            +
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.owner === 'Quarter' ? (
                        editableField && editableField.productId === product._id && editableField.field === 'costPrice' ? (
                          <div className="flex items-center">
                            <input
                              type="number"
                              className="w-20 px-2 py-1 border rounded text-sm"
                              value={editableField.value}
                              onChange={handleFieldChange}
                              onBlur={() => handleSaveField(product._id)}
                              onKeyDown={(e) => handleKeyDown(e, product._id)}
                              step="0.01"
                              min="0"
                              autoFocus
                            />
                          </div>
                        ) : (
                          <div className="flex items-center text-sm text-gray-900 group">                            <button 
                              className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded-full mr-1 text-gray-500 hover:text-white hover:bg-red-500 transition-all"
                              onClick={() => handleDecrement(product._id, 'costPrice', product.costPrice || 0)}
                            >
                              -
                            </button>
                            
                            <span 
                              className="cursor-pointer min-w-[40px] text-center"
                              onDoubleClick={() => handleStartEditing(product._id, 'costPrice', product.costPrice || 0)}
                            >
                              {product.costPrice || 0}
                            </span>
                            
                            <button 
                              className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded-full ml-1 text-gray-500 hover:text-white hover:bg-green-500 transition-all"
                              onClick={() => handleIncrement(product._id, 'costPrice', product.costPrice || 0)}
                            >
                              +
                            </button>
                          </div>
                        )
                      ) : (
                        <div className="text-sm text-gray-500">N/A</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editableField && editableField.productId === product._id && editableField.field === 'stock' ? (
                        <div className="flex items-center">
                          <input
                            type="number"
                            className="w-20 px-2 py-1 border rounded text-sm"
                            value={editableField.value}
                            onChange={handleFieldChange}
                            onBlur={() => handleSaveField(product._id)}
                            onKeyDown={(e) => handleKeyDown(e, product._id)}
                            step="1"
                            min="0"
                            autoFocus
                          />
                        </div>
                      ) : (
                        <div className="flex items-center text-sm text-gray-900 group">                          <button 
                            className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded-full mr-1 text-gray-500 hover:text-white hover:bg-red-500 transition-all"
                            onClick={() => handleDecrement(product._id, 'stock', product.stock)}
                          >
                            -
                          </button>
                          
                          <span 
                            className="cursor-pointer min-w-[40px] text-center"
                            onDoubleClick={() => handleStartEditing(product._id, 'stock', product.stock)}
                          >
                            {product.stock}
                          </span>
                          
                          <button 
                            className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded-full ml-1 text-gray-500 hover:text-white hover:bg-green-500 transition-all"
                            onClick={() => handleIncrement(product._id, 'stock', product.stock)}
                          >
                            +
                          </button>
                        </div>
                      )}
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
              label="Staff Price"
              name="staffPrice"
              value={formData.staffPrice}
              onChange={handleInputChange}
              fullWidth
              step="0.01"
              min="0"
            />
            <Input
              type="number"
              label="Sell Price"
              name="sellPrice"
              value={formData.sellPrice}
              onChange={handleInputChange}
              fullWidth
              step="0.01"
              min="0"
            />
          </div>
          {formData.owner === 'Quarter' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                type="number"
                label="Cost Price"
                name="costPrice"
                value={formData.costPrice}
                onChange={handleInputChange}
                fullWidth
                step="0.01"
                min="0"
              />
              <Input
                type="number"
                label="Stock"
                name="stock"
                value={formData.stock}
                onChange={handleInputChange}
                fullWidth
                min="0"
              />
            </div>
          )}
          {formData.owner !== 'Quarter' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                type="number"
                label="Stock"
                name="stock"
                value={formData.stock}
                onChange={handleInputChange}
                fullWidth
                min="0"
              />
            </div>
          )}
          <Select
            label="Owner"
            options={[
              { value: 'Quarter', label: 'Quarter' },
              { value: 'Sharoofa', label: 'Sharoofa' }
            ]}            value={formData.owner}
            onChange={val => setFormData((prev: typeof formData) => ({ ...prev, owner: val }))}
            fullWidth
          />          <Select
            label="Category"
            options={[
              { value: '', label: 'Select a category' },
              ...categories.map(cat => ({ value: cat._id, label: cat.name }))
            ]}
            value={formData.categoryId}            onChange={val => {
              setFormData((prev: typeof formData) => ({
                ...prev,
                categoryId: val,
                subcategory: '' // Reset subcategory when category changes
              }));
            }}
            fullWidth
          />          <Select label="Subcategory"
            options={
              !formData.categoryId
                ? [{ value: '', label: 'Select a category first' }]
                : [
                  { value: '', label: 'Select a subcategory' },
                  ...(categories.find(cat => cat._id === formData.categoryId)?.subcategories || [])
                    .filter((sub: any) => sub.name && sub.name.trim())
                    .map((sub: any) => ({ value: sub.name, label: sub.name }))
                ]
            }
            value={formData.subcategory}
            onChange={val => setFormData((prev: typeof formData) => ({ ...prev, subcategory: val }))}
            fullWidth
            disabled={!formData.categoryId}
            error={formData.categoryId && !formData.subcategory ? 'Please select a subcategory' : undefined}
          />

          <Input
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            fullWidth
          />

          <div className="flex items-center space-x-2">
            <label htmlFor="isAvailable">Available</label>
            <input
              id="isAvailable"
              type="checkbox"
              checked={formData.isAvailable}
              onChange={e => setFormData((prev: typeof formData) => ({ ...prev, isAvailable: e.target.checked }))}
            />
          </div>

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

      {/* Category Modal */}
      <Modal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        title="Add Category & Subcategories"
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Category Name"
            name="name"
            value={categoryForm.name}
            onChange={handleCategoryNameChange}
            fullWidth
          />
          {categoryForm.subcategories.map((sub, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <Input
                label={idx === 0 ? 'Subcategory Name' : ''}
                name={`subcategory-${idx}`}
                value={sub}
                onChange={e => handleCategoryFormChange(idx, e.target.value)}
                fullWidth
              />
              {categoryForm.subcategories.length > 1 && (
                <Button size="xs" variant="danger" onClick={() => handleRemoveSubcategoryField(idx)}>-</Button>
              )}
              {idx === categoryForm.subcategories.length - 1 && (
                <Button size="xs" variant="primary" onClick={handleAddSubcategoryField}>+</Button>
              )}
            </div>
          ))}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setCategoryModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAddCategory}
              disabled={!categoryForm.name || !categoryForm.subcategories.filter(s => s.trim()).length}
            >
              Add
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default InventoryManagement;