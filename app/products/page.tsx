"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAppSelector } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Package,
  Search,
  Plus,
  Edit,
  Eye,
  QrCode,
  ChevronRight,
  Home,
  RefreshCw,
  Tag,
  Box,
  Trash2,
  Download,
  Upload,
  Filter as FilterIcon,
  X,
  Check,
  AlertTriangle,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  supplier: string;
  quantity: number;
  price: number;
  status: "active" | "inactive" | "out_of_stock";
  description?: string;
  image?: string;
  createdAt: Date;
  lastUpdated?: Date;
}

export default function ProductsPage() {
  const router = useRouter();
  const authState = useAppSelector((state) => state.auth);
  const user = authState.user;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"name" | "price" | "quantity">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    if (authState.status === "unauthenticated") {
      router.push("/login");
      return;
    }

    fetchProducts();
  }, [authState.status, router]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setProducts([]);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: "name" | "price" | "quantity") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const handleSelectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map(p => p.id));
    }
  };

  const handleSelectProduct = (productId: string) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedProducts.length} selected products?`)) return;
    try {
      // TODO: API call
      console.log("Bulk deleting:", selectedProducts);
      setSelectedProducts([]);
      await fetchProducts();
    } catch (error) {
      console.error("Failed to bulk delete:", error);
    }
  };

  const handleBulkStatusChange = async (status: string) => {
    try {
      // TODO: API call
      console.log("Changing status to:", status, "for:", selectedProducts);
      setSelectedProducts([]);
      await fetchProducts();
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const handleExportCSV = () => {
    const csv = [
      ["SKU", "Name", "Category", "Supplier", "Quantity", "Price", "Status"],
      ...filteredProducts.map(p => [
        p.sku,
        p.name,
        p.category,
        p.supplier,
        p.quantity,
        p.price,
        p.status
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `products-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredProducts = products
    .filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.supplier.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
      const matchesStatus = statusFilter === "all" || product.status === statusFilter;
      
      return matchesSearch && matchesCategory && matchesStatus;
    })
    .sort((a, b) => {
      const multiplier = sortOrder === "asc" ? 1 : -1;
      if (sortBy === "name") return a.name.localeCompare(b.name) * multiplier;
      if (sortBy === "price") return (a.price - b.price) * multiplier;
      if (sortBy === "quantity") return (a.quantity - b.quantity) * multiplier;
      return 0;
    });

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "text-green-400 bg-green-500/10 border-green-500/20";
      case "inactive": return "text-gray-400 bg-gray-500/10 border-gray-500/20";
      case "out_of_stock": return "text-red-400 bg-red-500/10 border-red-500/20";
      default: return "text-gray-400 bg-gray-500/10 border-gray-500/20";
    }
  };

  if (authState.status === "loading" || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="w-16 h-16 border-4 border-gray-800 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <DashboardLayout userRole={user.role} userName={user.displayName || user.email}>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Home className="h-4 w-4" />
          <ChevronRight className="h-3 w-3" />
          <span className="text-white font-medium">Products</span>
        </nav>

        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-2">
              Products
            </h1>
            <p className="text-gray-400 text-lg">Manage your product inventory</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleExportCSV}
              className="border-gray-800 text-white hover:bg-gray-800/50 backdrop-blur-sm transition-all"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Link href="/products/new">
              <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/20 transition-all duration-200">
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards - Matching Dashboard Style */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Products</CardTitle>
              <div className="text-gray-400 p-2 rounded-lg bg-gray-800/50">
                <Package className="h-6 w-6" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">
                {products.length}
              </div>
              <p className="text-xs text-gray-500">{filteredProducts.length} filtered</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Active</CardTitle>
              <div className="text-gray-400 p-2 rounded-lg bg-gray-800/50">
                <Check className="h-6 w-6" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">
                {products.filter(p => p.status === "active").length}
              </div>
              <p className="text-xs text-gray-500">In stock & available</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Out of Stock</CardTitle>
              <div className="text-gray-400 p-2 rounded-lg bg-gray-800/50">
                <AlertTriangle className="h-6 w-6" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">
                {products.filter(p => p.status === "out_of_stock").length}
              </div>
              <p className="text-xs text-gray-500">Needs restocking</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Value</CardTitle>
              <div className="text-gray-400 p-2 rounded-lg bg-gray-800/50">
                <Tag className="h-6 w-6" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">
                ${products.reduce((sum, p) => sum + (p.price * p.quantity), 0).toLocaleString()}
              </div>
              <p className="text-xs text-gray-500">Inventory value</p>
            </CardContent>
          </Card>
        </div>

        {/* Bulk Actions Bar */}
        {selectedProducts.length > 0 && (
          <div className="mb-6 p-4 bg-blue-600/10 border border-blue-600/30 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-white font-medium">{selectedProducts.length} selected</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedProducts([])}
                className="border-gray-700 text-white hover:bg-gray-800"
              >
                Clear
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkStatusChange("active")}
                className="border-green-600 text-green-400 hover:bg-green-500/10"
              >
                <Check className="h-4 w-4 mr-1" />
                Mark Active
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkStatusChange("inactive")}
                className="border-gray-600 text-gray-400 hover:bg-gray-500/10"
              >
                Mark Inactive
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkDelete}
                className="border-red-600 text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
              </div>
            </div>
        )}

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products by name, SKU, or supplier..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-3 bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all backdrop-blur-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            </div>
          
          <div className="flex gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-3 bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all backdrop-blur-sm"
            >
              <option value="all">All Categories</option>
              <option value="electronics">Electronics</option>
              <option value="clothing">Clothing</option>
              <option value="food">Food & Beverage</option>
              <option value="other">Other</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-3 bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all backdrop-blur-sm"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
            
            <Button
              variant="outline"
              onClick={fetchProducts}
              disabled={loading}
              className="border-gray-800 text-white hover:bg-gray-900"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Products Table */}
        <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800">
          <CardContent className="p-6">
        {loading ? (
          <div className="text-center py-12">
                <RefreshCw className="h-12 w-12 text-gray-600 mx-auto mb-3 animate-spin" />
                <p className="text-gray-400">Loading products...</p>
          </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg mb-2">No products found</p>
                <p className="text-gray-500 text-sm mb-6">
                  {searchTerm || categoryFilter !== "all" || statusFilter !== "all"
                ? "Try adjusting your filters"
                    : "Add your first product to get started"}
            </p>
                {!searchTerm && categoryFilter === "all" && statusFilter === "all" && (
              <Link href="/products/new">
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Product
                </Button>
              </Link>
            )}
              </div>
        ) : (
          <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="px-4 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                            onChange={handleSelectAll}
                            className="rounded border-gray-700 bg-gray-800 text-blue-600 focus:ring-blue-600 focus:ring-offset-gray-900"
                          />
                        </th>
                        <th 
                          className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                          onClick={() => handleSort("name")}
                        >
                          <div className="flex items-center gap-1">
                            Product
                            <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">SKU</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Category</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Supplier</th>
                        <th 
                          className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                          onClick={() => handleSort("quantity")}
                        >
                          <div className="flex items-center gap-1">
                            Quantity
                            <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </th>
                        <th 
                          className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                          onClick={() => handleSort("price")}
                        >
                          <div className="flex items-center gap-1">
                            Price
                            <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {paginatedProducts.map((product) => (
                        <tr key={product.id} className="hover:bg-gray-800/30 transition-colors">
                          <td className="px-4 py-4">
                            <input
                              type="checkbox"
                              checked={selectedProducts.includes(product.id)}
                              onChange={() => handleSelectProduct(product.id)}
                              className="rounded border-gray-700 bg-gray-800 text-blue-600 focus:ring-blue-600 focus:ring-offset-gray-900"
                            />
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center">
                                {product.image ? (
                                  <img src={product.image} alt={product.name} className="w-full h-full object-cover rounded-lg" />
                                ) : (
                                  <Box className="h-5 w-5 text-gray-400" />
                                )}
                              </div>
                              <div>
                                <p className="text-white font-medium">{product.name}</p>
                                {product.quantity < 10 && product.quantity > 0 && (
                                  <p className="text-xs text-yellow-400 flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    Low stock
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-gray-300 font-mono text-sm">{product.sku}</p>
                          </td>
                          <td className="px-4 py-4">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border text-blue-400 bg-blue-500/10 border-blue-500/20">
                              <Tag className="h-3 w-3" />
                          {product.category}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-gray-300">{product.supplier}</p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-gray-300">{product.quantity}</p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-gray-300">${product.price.toFixed(2)}</p>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs border ${getStatusColor(product.status)}`}>
                              {product.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedProduct(product);
                                  setShowDetailsModal(true);
                                }}
                                className="border-gray-700 text-white hover:bg-gray-800"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Link href={`/products/edit/${product.id}`}>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-gray-700 text-white hover:bg-gray-800"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-gray-700 text-blue-400 hover:bg-blue-500/10"
                              >
                                <QrCode className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-800">
                    <p className="text-sm text-gray-400">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredProducts.length)} of {filteredProducts.length} products
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="border-gray-700 text-white hover:bg-gray-800 disabled:opacity-50"
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                              className={
                                currentPage === pageNum
                                  ? "bg-blue-600 text-white hover:bg-blue-700"
                                  : "border-gray-700 text-white hover:bg-gray-800"
                              }
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="border-gray-700 text-white hover:bg-gray-800 disabled:opacity-50"
                      >
                        Next
                        <ChevronRightIcon className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Product Details Modal */}
        {showDetailsModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowDetailsModal(false)}>
          <Card className="bg-gray-900 border-gray-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="border-b border-gray-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-2xl">Product Details</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {selectedProduct.image && (
                  <div className="w-full h-48 bg-gray-800 rounded-lg overflow-hidden">
                    <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-400">Product Name</label>
                    <p className="text-white text-lg mt-1">{selectedProduct.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400">SKU</label>
                    <p className="text-white font-mono mt-1">{selectedProduct.sku}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400">Category</label>
                    <p className="text-white mt-1">{selectedProduct.category}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400">Supplier</label>
                    <p className="text-white mt-1">{selectedProduct.supplier}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400">Quantity</label>
                    <p className="text-white text-lg font-semibold mt-1">{selectedProduct.quantity}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400">Price</label>
                    <p className="text-white text-lg font-semibold mt-1">${selectedProduct.price.toFixed(2)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400">Total Value</label>
                    <p className="text-blue-400 text-lg font-semibold mt-1">
                      ${(selectedProduct.price * selectedProduct.quantity).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400">Status</label>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm border ${getStatusColor(selectedProduct.status)}`}>
                        {selectedProduct.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </div>
                    </div>
                </div>

                {selectedProduct.description && (
                  <div>
                    <label className="text-sm font-medium text-gray-400">Description</label>
                    <p className="text-white mt-1">{selectedProduct.description}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t border-gray-800">
                  <Link href={`/products/edit/${selectedProduct.id}`} className="flex-1">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Product
                    </Button>
                </Link>
                  <Button
                    variant="outline"
                    className="border-gray-700 text-blue-400 hover:bg-blue-500/10"
                  >
                    <QrCode className="h-4 w-4 mr-2" />
                    Generate QR
                  </Button>
                </div>
            </div>
            </CardContent>
          </Card>
            </div>
        )}
      </div>
    </DashboardLayout>
  );
}
