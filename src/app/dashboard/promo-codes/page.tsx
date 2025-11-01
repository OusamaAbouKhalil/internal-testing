"use client";

import { useState, useEffect, useCallback } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingOverlay, LoadingButton } from "@/components/ui/loading-spinner";
import { PromoCodeDialog } from "@/components/promo-code-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Ticket, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Calendar,
  TrendingUp,
  Users,
  Percent,
  Tag,
  CheckCircle,
  XCircle,
  Power,
  PowerOff
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { usePromoCodeManagementStore } from "@/stores/promo-code-management-store";
import { useFirebaseAuthStore } from "@/stores/firebase-auth-store";
import { PromoCode, PromoCodeFilters, PromoCodeTypeLabel, PromoCodeUsage } from "@/types/promo-code";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function PromoCodesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedPromoCode, setSelectedPromoCode] = useState<PromoCode | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<PromoCodeFilters>({});
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedPromoCodeUsage, setSelectedPromoCodeUsage] = useState<PromoCodeUsage[]>([]);
  const [showUsageDialog, setShowUsageDialog] = useState(false);

  const { 
    promoCodes, 
    loading, 
    error, 
    totalCount,
    hasMore,
    fetchPromoCodes, 
    createPromoCode, 
    updatePromoCode, 
    deletePromoCode,
    toggleActiveStatus,
    fetchPromoCodeUsage,
    addPromoCodeUsage,
    updatePromoCodeUsage,
    deletePromoCodeUsage,
    resetPagination
  } = usePromoCodeManagementStore();

  const { hasPermission } = useFirebaseAuthStore();

  useEffect(() => {
    fetchPromoCodes();
  }, []);

  useEffect(() => {
    const searchFilters: PromoCodeFilters = {
      search: searchTerm || undefined,
      ...filters
    };
    resetPagination();
    fetchPromoCodes(searchFilters);
  }, [searchTerm, filters]);

  const handleCreatePromoCode = useCallback(async (promoCodeData: any) => {
    await createPromoCode(promoCodeData);
  }, [createPromoCode]);

  const handleUpdatePromoCode = useCallback(async (promoCodeData: any) => {
    if (!selectedPromoCode) return;
    await updatePromoCode(selectedPromoCode.id, promoCodeData);
  }, [selectedPromoCode, updatePromoCode]);

  const handleDeletePromoCode = useCallback(async (promoCodeId: string) => {
    if (confirm('Are you sure you want to delete this promo code? This action cannot be undone.')) {
      await deletePromoCode(promoCodeId);
    }
  }, [deletePromoCode]);

  const handleToggleActiveStatus = useCallback(async (promoCodeId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === '1' ? false : true;
      await toggleActiveStatus(promoCodeId, newStatus);
    } catch (error) {
      console.error('Failed to toggle promo code status:', error);
    }
  }, [toggleActiveStatus]);

  const openCreateDialog = useCallback(() => {
    setDialogMode('create');
    setSelectedPromoCode(null);
    setIsCreateDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((promoCode: PromoCode) => {
    setDialogMode('edit');
    setSelectedPromoCode(promoCode);
    setIsEditDialogOpen(true);
  }, []);

  const handleLoadMore = () => {
    fetchPromoCodes(filters, true);
  };

  const handleViewUsage = async (promoCode: PromoCode) => {
    try {
      const usage = await fetchPromoCodeUsage(promoCode.id);
      setSelectedPromoCodeUsage(usage);
      setSelectedPromoCode(promoCode);
      setShowUsageDialog(true);
    } catch (error) {
      console.error('Failed to fetch promo code usage:', error);
    }
  };

  const getUsagePercentage = (promoCode: PromoCode): number => {
    return (promoCode.current_usage / promoCode.max_usage_times) * 100;
  };

  const getUsageColor = (percentage: number): string => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'INFLUENCER':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'EVENT':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-muted text-foreground';
    }
  };

  return (
    <AuthGuard requiredPermission={{ resource: 'promo_codes', action: 'read' }}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Promo Codes</h1>
            <p className="text-muted-foreground mt-2">Manage promotional codes and discounts</p>
            <p className="text-sm text-muted-foreground mt-1">Total: {totalCount} promo codes</p>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              className="flex items-center gap-2"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>
            
            {hasPermission('promo_codes', 'write') && (
              <LoadingButton
                onClick={openCreateDialog}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Promo Code
              </LoadingButton>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by code, description, or discount..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={() => setShowFilters((v) => !v)} className="whitespace-nowrap">
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
          </div>

          {showFilters && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Filters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Type</Label>
                    <Select
                      value={filters.type || undefined}
                      onValueChange={(value) => setFilters({ ...filters, type: value === 'all' ? undefined : value as any })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="INFLUENCER">Influencer</SelectItem>
                        <SelectItem value="EVENT">Event</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <Select
                      value={filters.is_active?.toString() || undefined}
                      onValueChange={(value) => setFilters({ ...filters, is_active: value === 'all' ? undefined : value === 'true' })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="true">Active</SelectItem>
                        <SelectItem value="false">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Min Discount (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={filters.min_discount || ''}
                      onChange={(e) => setFilters({ ...filters, min_discount: e.target.value ? parseFloat(e.target.value) : undefined })}
                    />
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Max Discount (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="100"
                      value={filters.max_discount || ''}
                      onChange={(e) => setFilters({ ...filters, max_discount: e.target.value ? parseFloat(e.target.value) : undefined })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Promo Codes Grid */}
        <LoadingOverlay loading={loading}>
          <div className="grid gap-4">
            {promoCodes.map((promoCode) => {
              const usagePercentage = getUsagePercentage(promoCode);
              return (
                <Card key={promoCode.id} className="transition-all duration-200 hover:shadow-md">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white text-xl">
                            <Ticket className="h-6 w-6" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="flex items-center gap-2 mb-1">
                              <Tag className="h-5 w-5" />
                              {promoCode.code}
                            </CardTitle>
                            <CardDescription className="text-sm">
                              {promoCode.description}
                            </CardDescription>
                          </div>
                        </div>
                        
                        {/* Status Badges */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          <Badge className={getTypeColor(promoCode.type)}>
                            {PromoCodeTypeLabel[promoCode.type]}
                          </Badge>
                          {promoCode.is_active === '1' ? (
                            <Badge className="bg-green-100 text-green-800 border-green-200">
                              Active
                            </Badge>
                          ) : (
                            <Badge className="bg-muted text-foreground">
                              Inactive
                            </Badge>
                          )}
                          {usagePercentage >= 100 && (
                            <Badge className="bg-red-100 text-red-800 border-red-200">
                              Fully Used
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        {hasPermission('promo_codes', 'read') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewUsage(promoCode)}
                            className="hover:bg-blue-50 hover:border-blue-200 text-blue-600 border-blue-300"
                            title="View usage details"
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {hasPermission('promo_codes', 'write') && (
                          <>
                            {/* Toggle Active Status */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleActiveStatus(promoCode.id, promoCode.is_active)}
                              className={
                                promoCode.is_active === '1'
                                  ? "hover:bg-orange-50 hover:border-orange-200 text-orange-600 border-orange-300"
                                  : "hover:bg-green-50 hover:border-green-200 text-green-600 border-green-300"
                              }
                              title={promoCode.is_active === '1' ? 'Disable promo code' : 'Activate promo code'}
                            >
                              {promoCode.is_active === '1' ? (
                                <PowerOff className="h-4 w-4" />
                              ) : (
                                <Power className="h-4 w-4" />
                              )}
                            </Button>

                            {/* Edit Button */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(promoCode)}
                              className="hover:bg-blue-50 hover:border-blue-200"
                              title="Edit promo code"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        
                        {hasPermission('promo_codes', 'delete') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeletePromoCode(promoCode.id)}
                            className="hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                            title="Delete promo code"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-1">
                          <Percent className="h-3 w-3" />
                          Discount
                        </h4>
                        <p className="text-lg font-bold text-green-600">{promoCode.discount.toFixed(2)}%</p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          Usage
                        </h4>
                        <p className={`text-lg font-bold ${getUsageColor(usagePercentage)}`}>
                          {promoCode.current_usage} / {promoCode.max_usage_times}
                        </p>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className={`h-2 rounded-full ${
                              usagePercentage >= 90 ? 'bg-red-500' : 
                              usagePercentage >= 70 ? 'bg-yellow-500' : 
                              'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          Per User Limit
                        </h4>
                        <p className="text-sm font-medium">{promoCode.max_usage_per_user}</p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Created
                        </h4>
                        <p className="text-sm font-medium">
                          {new Date(promoCode.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </LoadingOverlay>

        {/* Load More Button */}
        {hasMore && (
          <div className="flex justify-center">
            <Button variant="outline" onClick={handleLoadMore} disabled={loading}>
              Load More Promo Codes
            </Button>
          </div>
        )}

        {promoCodes.length === 0 && !loading && (
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No promo codes found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || Object.keys(filters).length > 0 
                    ? 'No promo codes match your search criteria.' 
                    : 'Create your first promo code to offer discounts to your users.'
                  }
                </p>
                {hasPermission('promo_codes', 'write') && !searchTerm && Object.keys(filters).length === 0 && (
                  <Button onClick={openCreateDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Promo Code
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Promo Code Dialog */}
        <PromoCodeDialog
          open={isCreateDialogOpen || isEditDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setIsCreateDialogOpen(false);
              setIsEditDialogOpen(false);
              setSelectedPromoCode(null);
            }
          }}
          promoCode={selectedPromoCode}
          mode={dialogMode}
          onSave={dialogMode === 'create' ? handleCreatePromoCode : handleUpdatePromoCode}
          loading={loading}
          error={error}
        />

        {/* Usage Dialog */}
        <Dialog open={showUsageDialog} onOpenChange={setShowUsageDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Usage Details - {selectedPromoCode?.code}
              </DialogTitle>
              <DialogDescription>
                View who has used this promo code and how many times
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {selectedPromoCodeUsage.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No usage recorded</h3>
                  <p className="text-muted-foreground">This promo code hasn't been used by anyone yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Total Users: {selectedPromoCodeUsage.length}</h4>
                    <h4 className="font-medium">Total Usage: {selectedPromoCodeUsage.reduce((sum, usage) => sum + usage.number_of_usage, 0)}</h4>
                  </div>
                  
                  <div className="border rounded-lg">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Student ID
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Email
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Times Used
                            </th>
                            
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {selectedPromoCodeUsage.map((usage) => (
                            <tr key={usage.student_id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-foreground font-mono">
                                {usage.student_id}
                              </td>
                              <td className="px-4 py-3 text-sm text-foreground">
                                {usage.email}
                              </td>
                              <td className="px-4 py-3 text-sm text-foreground">
                                <Badge variant="outline" className="font-mono">
                                  {usage.number_of_usage}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
}

