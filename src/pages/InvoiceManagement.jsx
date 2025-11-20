import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileText, 
  Plus, 
  Download,
  Send,
  CheckCircle,
  AlertTriangle,
  DollarSign
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/components/ui/toast";

export default function InvoiceManagement() {
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: invoices = [] } = useQuery({
    queryKey: ['client-invoices'],
    queryFn: async () => {
      const data = await base44.entities.ClientInvoice.list('-invoice_date', 200);
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const data = await base44.entities.Client.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: domCareClients = [] } = useQuery({
    queryKey: ['domcare-clients'],
    queryFn: async () => {
      const data = await base44.entities.DomCareClient.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const allClients = [...clients, ...domCareClients];

  const updateInvoiceMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClientInvoice.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-invoices'] });
      toast.success("Invoice Updated", "Changes saved successfully");
    },
  });

  const filteredInvoices = invoices.filter(inv => {
    const client = allClients.find(c => c.id === inv.client_id);
    const matchesSearch = client?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         inv.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || inv.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0),
    outstanding: invoices.filter(i => i.status === 'sent' || i.status === 'overdue')
                         .reduce((sum, inv) => sum + (inv.balance_due || 0), 0),
    paid: invoices.filter(i => i.status === 'paid')
                  .reduce((sum, inv) => sum + (inv.total_amount || 0), 0),
    overdue: invoices.filter(i => i.status === 'overdue').length
  };

  const getClientName = (clientId) => {
    const client = allClients.find(c => c.id === clientId);
    return client?.full_name || 'Unknown Client';
  };

  const markAsSent = (invoice) => {
    updateInvoiceMutation.mutate({
      id: invoice.id,
      data: {
        status: 'sent',
        sent_date: new Date().toISOString()
      }
    });
  };

  const markAsPaid = (invoice) => {
    updateInvoiceMutation.mutate({
      id: invoice.id,
      data: {
        status: 'paid',
        paid_date: new Date().toISOString(),
        amount_paid: invoice.total_amount,
        balance_due: 0
      }
    });
  };

  const statusColors = {
    draft: "bg-gray-100 text-gray-800",
    sent: "bg-blue-100 text-blue-800",
    partially_paid: "bg-yellow-100 text-yellow-800",
    paid: "bg-green-100 text-green-800",
    overdue: "bg-red-100 text-red-800",
    cancelled: "bg-gray-400 text-gray-800"
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Client Invoicing
            </h1>
            <p className="text-gray-500">Manage client invoices and track payments</p>
          </div>
          <Button className="bg-blue-600">
            <Plus className="w-4 h-4 mr-2" />
            Create Invoice
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-sm text-blue-800 mb-1">Total Invoiced</p>
              <p className="text-3xl font-bold text-blue-900">£{stats.total.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-8 h-8 text-orange-600" />
              </div>
              <p className="text-sm text-orange-800 mb-1">Outstanding</p>
              <p className="text-3xl font-bold text-orange-900">£{stats.outstanding.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-sm text-green-800 mb-1">Paid</p>
              <p className="text-3xl font-bold text-green-900">£{stats.paid.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <p className="text-sm text-red-800 mb-1">Overdue</p>
              <p className="text-3xl font-bold text-red-900">{stats.overdue}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                placeholder="Search by client or invoice number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Invoices List */}
        <div className="space-y-4">
          {filteredInvoices.map((invoice) => (
            <Card key={invoice.id} className="border-l-4 border-blue-500">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold">{invoice.invoice_number || `INV-${invoice.id.slice(0, 8)}`}</h3>
                      <Badge className={statusColors[invoice.status]}>
                        {invoice.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>

                    <p className="text-gray-700 font-medium mb-1">{getClientName(invoice.client_id)}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                      <div>
                        <p className="text-gray-600">Invoice Date</p>
                        <p className="font-medium">{format(parseISO(invoice.invoice_date), 'MMM d, yyyy')}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Period</p>
                        <p className="font-medium">
                          {format(parseISO(invoice.period_start), 'MMM d')} - {format(parseISO(invoice.period_end), 'MMM d')}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Due Date</p>
                        <p className="font-medium">{invoice.due_date ? format(parseISO(invoice.due_date), 'MMM d, yyyy') : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Total Amount</p>
                        <p className="font-bold text-lg">£{invoice.total_amount?.toLocaleString()}</p>
                      </div>
                    </div>

                    {invoice.split_billing && invoice.split_billing.length > 0 && (
                      <div className="mt-3 p-3 bg-purple-50 rounded border border-purple-200">
                        <p className="text-sm font-medium text-purple-900 mb-2">Split Billing:</p>
                        <div className="flex flex-wrap gap-2">
                          {invoice.split_billing.map((split, idx) => (
                            <Badge key={idx} className="bg-purple-100 text-purple-800">
                              {split.payer_name}: £{split.amount} ({split.percentage}%)
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    {invoice.status === 'draft' && (
                      <Button size="sm" onClick={() => markAsSent(invoice)}>
                        <Send className="w-4 h-4 mr-1" />
                        Send
                      </Button>
                    )}
                    {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                      <Button size="sm" className="bg-green-600" onClick={() => markAsPaid(invoice)}>
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Mark Paid
                      </Button>
                    )}
                    <Button size="sm" variant="outline">
                      <Download className="w-4 h-4 mr-1" />
                      PDF
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredInvoices.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold mb-2">No Invoices Found</h3>
              <p className="text-gray-600 mb-4">Create your first client invoice</p>
              <Button className="bg-blue-600">
                <Plus className="w-4 h-4 mr-2" />
                Create Invoice
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}