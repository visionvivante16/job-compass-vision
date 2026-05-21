import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Users, CreditCard, TrendingUp, RefreshCw, ArrowLeft, AlertCircle, AlertTriangle, Send, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface Payment {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  amount: number;
  currency: string;
  status: string;
  created: number;
  description: string | null;
}

interface Subscription {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  status: string;
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  plan_amount: number;
  plan_interval: string;
  plan_currency: string;
  created: number;
}

interface FailedPayment {
  id: string;
  email: string;
  customer_name: string | null;
  event_type: string;
  amount: number | null;
  currency: string | null;
  failure_reason: string | null;
  retry_link: string | null;
  email_sent: boolean;
  created_at: string;
}

interface Stats {
  total_revenue: number;
  paid_users: number;
  active_subscriptions: number;
  canceled_subscriptions: number;
  past_due_subscriptions: number;
  total_transactions: number;
  failed_payments_count: number;
}

export default function AdminPayments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [failedPayments, setFailedPayments] = useState<FailedPayment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [subStatusFilter, setSubStatusFilter] = useState("all");
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("admin-payments", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      setPayments(data.payments || []);
      setSubscriptions(data.subscriptions || []);
      setFailedPayments(data.failed_payments || []);
      setStats(data.stats || null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to load payment data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const matchesSearch = !search ||
        (p.customer_email || "").toLowerCase().includes(search.toLowerCase()) ||
        (p.customer_name || "").toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [payments, search, statusFilter]);

  const filteredSubs = useMemo(() => {
    return subscriptions.filter(s => {
      const matchesSearch = !search ||
        (s.customer_email || "").toLowerCase().includes(search.toLowerCase()) ||
        (s.customer_name || "").toLowerCase().includes(search.toLowerCase());
      const matchesStatus = subStatusFilter === "all" || s.status === subStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [subscriptions, search, subStatusFilter]);

  const filteredFailed = useMemo(() => {
    return failedPayments.filter(f => {
      return !search ||
        f.email.toLowerCase().includes(search.toLowerCase()) ||
        (f.customer_name || "").toLowerCase().includes(search.toLowerCase());
    });
  }, [failedPayments, search]);

  const statusBadge = (status: string) => {
    switch (status) {
      case "succeeded": return <Badge variant="success">Succeeded</Badge>;
      case "active": return <Badge variant="success">Active</Badge>;
      case "failed": return <Badge variant="destructive">Failed</Badge>;
      case "canceled": return <Badge variant="destructive">Canceled</Badge>;
      case "past_due": return <Badge className="bg-accent/10 text-accent border-transparent">Past Due</Badge>;
      case "pending": return <Badge variant="secondary">Pending</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const eventTypeBadge = (type: string) => {
    switch (type) {
      case "checkout_expired": return <Badge variant="secondary">Checkout Expired</Badge>;
      case "invoice_payment_failed": return <Badge variant="destructive">Invoice Failed</Badge>;
      case "charge_failed": return <Badge variant="destructive">Charge Failed</Badge>;
      case "abandoned_checkout": return <Badge variant="secondary">Abandoned</Badge>;
      default: return <Badge variant="outline">{type}</Badge>;
    }
  };

  const handleSendFailedPaymentEmail = async (failedPayment: FailedPayment) => {
    setSendingEmailId(failedPayment.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("send-failed-payment-email", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { email: failedPayment.email, failed_payment_id: failedPayment.id },
      });

      if (error) throw error;
      if (data?.skipped) {
        toast({ title: "Skipped", description: data.error || "User is already premium", variant: "default" });
      } else {
        toast({ title: "Email Sent", description: `Recovery email sent to ${failedPayment.email}` });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to send email", variant: "destructive" });
    } finally {
      setSendingEmailId(null);
    }
  };

  const formatDate = (ts: number) => new Date(ts * 1000).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });

  const formatDateISO = (iso: string) => new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  const formatCurrency = (amount: number, currency = "USD") =>
    new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to="/admin">
              <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Payment Dashboard</h1>
              <p className="text-sm text-muted-foreground">Track payments & subscriptions from Stripe</p>
            </div>
          </div>
          <Button onClick={fetchData} disabled={loading} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <DollarSign className="h-4 w-4" /> Total Revenue
                </div>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.total_revenue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Users className="h-4 w-4" /> Paid Users
                </div>
                <p className="text-2xl font-bold text-foreground">{stats.paid_users}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <CreditCard className="h-4 w-4" /> Active Subs
                </div>
                <p className="text-2xl font-bold text-foreground">{stats.active_subscriptions}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <TrendingUp className="h-4 w-4" /> Transactions
                </div>
                <p className="text-2xl font-bold text-foreground">{stats.total_transactions}</p>
              </CardContent>
            </Card>
            <Card className="border-destructive/30">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 text-destructive text-sm mb-1">
                  <AlertTriangle className="h-4 w-4" /> Failed Payments
                </div>
                <p className="text-2xl font-bold text-destructive">{stats.failed_payments_count}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {loading && !stats && (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Loading payment data from Stripe...
          </div>
        )}

        {!loading && (
          <>
            <div className="mb-4">
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="max-w-sm"
              />
            </div>

            <Tabs defaultValue="payments" className="space-y-4">
              <TabsList>
                <TabsTrigger value="payments">Payments ({payments.length})</TabsTrigger>
                <TabsTrigger value="subscriptions">Subscriptions ({subscriptions.length})</TabsTrigger>
                <TabsTrigger value="failed" className="text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                  Failed ({failedPayments.length})
                </TabsTrigger>
              </TabsList>

              {/* Payments Tab */}
              <TabsContent value="payments" className="space-y-3">
                <div className="flex items-center gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="succeeded">Succeeded</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Card>
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPayments.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                              <AlertCircle className="h-5 w-5 mx-auto mb-2" />
                              No payments found
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredPayments.map(p => (
                            <TableRow key={p.id}>
                              <TableCell className="font-medium">{p.customer_name || "—"}</TableCell>
                              <TableCell className="text-muted-foreground">{p.customer_email || "—"}</TableCell>
                              <TableCell className="font-semibold">{formatCurrency(p.amount, p.currency)}</TableCell>
                              <TableCell>{statusBadge(p.status)}</TableCell>
                              <TableCell className="text-muted-foreground">{formatDate(p.created)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </TabsContent>

              {/* Subscriptions Tab */}
              <TabsContent value="subscriptions" className="space-y-3">
                <div className="flex items-center gap-2">
                  <Select value={subStatusFilter} onValueChange={setSubStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="canceled">Canceled</SelectItem>
                      <SelectItem value="past_due">Past Due</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Card>
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Period End</TableHead>
                          <TableHead>Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSubs.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                              <AlertCircle className="h-5 w-5 mx-auto mb-2" />
                              No subscriptions found
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredSubs.map(s => (
                            <TableRow key={s.id}>
                              <TableCell className="font-medium">{s.customer_name || "—"}</TableCell>
                              <TableCell className="text-muted-foreground">{s.customer_email || "—"}</TableCell>
                              <TableCell>
                                {formatCurrency(s.plan_amount, s.plan_currency)}/{s.plan_interval}
                                {s.cancel_at_period_end && (
                                  <span className="ml-1 text-xs text-destructive">(canceling)</span>
                                )}
                              </TableCell>
                              <TableCell>{statusBadge(s.status)}</TableCell>
                              <TableCell className="text-muted-foreground">{formatDate(s.current_period_end)}</TableCell>
                              <TableCell className="text-muted-foreground">{formatDate(s.created)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </TabsContent>

              {/* Failed Payments Tab */}
              <TabsContent value="failed" className="space-y-3">
                <Card>
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Email Sent</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredFailed.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                              <AlertCircle className="h-5 w-5 mx-auto mb-2" />
                              No failed payments recorded
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredFailed.map(f => (
                            <TableRow key={f.id}>
                              <TableCell className="font-medium">{f.customer_name || "—"}</TableCell>
                              <TableCell className="text-muted-foreground">{f.email}</TableCell>
                              <TableCell>{eventTypeBadge(f.event_type)}</TableCell>
                              <TableCell className="font-semibold">
                                {f.amount != null ? formatCurrency(f.amount / 100, f.currency || "USD") : "—"}
                              </TableCell>
                              <TableCell className="text-muted-foreground max-w-[200px] truncate" title={f.failure_reason || ""}>
                                {f.failure_reason || "—"}
                              </TableCell>
                              <TableCell>
                                {f.email_sent ? (
                                  <Badge variant="success">Sent</Badge>
                                ) : (
                                  <Badge variant="secondary">Pending</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">{formatDateISO(f.created_at)}</TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={sendingEmailId === f.id}
                                  onClick={() => handleSendFailedPaymentEmail(f)}
                                  className="gap-1.5"
                                >
                                  {sendingEmailId === f.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Send className="h-3.5 w-3.5" />
                                  )}
                                  Send Email
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </Layout>
  );
}
