import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { insertDeploymentSchema, type InsertDeployment } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Server, AlertCircle, RefreshCw, X } from "lucide-react";
import { WalletStatus } from "@/components/ui/wallet-status";
import { cn } from "@/lib/utils";

const DEFAULT_ICL_CONFIG = `version: "1.0"

services:
  py-cuda:
    image: spheronnetwork/jupyter-notebook:pytorch-2.4.1-cuda-enabled
    pull_policy: IfNotPresent
    expose:
      - port: 8888
        as: 8888
        to:
          - global: true
      - port: 3000
        as: 3000
        to:
          - global: true
    env:
      - JUPYTER_TOKEN=test

profiles:
  name: py-cuda
  duration: 2h
  mode: provider
  compute:
    py-cuda:
      resources:
        cpu:
          units: 16
        memory:
          size: 64Gi
        storage:
          - size: 500Gi
        gpu:
          units: 1
          attributes:
            vendor:
              nvidia:
                - model: rtx6000-ada
  placement:
    westcoast:
      pricing:
        py-cuda:
          token: CST
          amount: 1

deployment:
  py-cuda:
    westcoast:
      profile: py-cuda
      count: 1`;

interface DeploymentResponse {
  deployment: {
    name: string;
    status: string;
  };
  transaction: {
    leaseId: string;
    status: number;
    hash: string;
  };
  details: {
    services: {
      [key: string]: {
        name: string;
        available: number;
        total: number;
        observed_generation: number;
        replicas: number;
        updated_replicas: number;
        ready_replicas: number;
        available_replicas: number;
        container_statuses: Array<{
          name: string;
          ready: boolean;
          state: {
            running?: { startedAt: string };
            waiting?: { reason: string };
          };
        }>;
        creationTimestamp: string;
      };
    };
    forwarded_ports: {
      [key: string]: Array<{
        host: string;
        port: number;
        externalPort: number;
        proto: string;
        name: string;
      }>;
    };
    status: string;
  };
}

export default function Home() {
  const { toast } = useToast();
  const [deploymentInfo, setDeploymentInfo] = useState<DeploymentResponse | null>(null);
  const [isWalletLoading, setIsWalletLoading] = useState(true);

  const form = useForm<InsertDeployment>({
    resolver: zodResolver(insertDeploymentSchema),
    defaultValues: {
      name: "jupyter-deployment",
      iclConfig: DEFAULT_ICL_CONFIG,
      providerUrl: "https://provider-proxy.spheron.network",
    },
  });

  const { data: escrowBalance, isLoading: isBalanceLoading } = useQuery<BalanceResponse>({
    queryKey: ["/api/balance"],
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsWalletLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const formatBalance = (rawBalance: string) => {
    const balanceInCST = Number(rawBalance) / 1e6;
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 6,
      maximumFractionDigits: 6
    }).format(balanceInCST);
  };

  const deployMutation = useMutation({
    mutationFn: async (data: InsertDeployment) => {
      const res = await apiRequest("POST", "/api/deployments", data);
      return res.json();
    },
    onSuccess: (data: DeploymentResponse) => {
      setDeploymentInfo(data);
      toast({
        title: "Deployment Created",
        description: "Your deployment has been created successfully. Fetching deployment details...",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const refreshDeploymentMutation = useMutation({
    mutationFn: async (leaseId: string) => {
      const res = await apiRequest("GET", `/api/deployments/${leaseId}`);
      return res.json();
    },
    onSuccess: (data) => {
      setDeploymentInfo(prev => ({
        ...prev!,
        details: data
      }));
      toast({
        title: "Deployment Details Updated",
        description: "Successfully fetched the latest deployment information.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const closeDeploymentMutation = useMutation({
    mutationFn: async (leaseId: string) => {
      const res = await apiRequest("POST", `/api/deployments/${leaseId}/close`);
      return res.json();
    },
    onSuccess: () => {
      setDeploymentInfo(null);
      toast({
        title: "Deployment Closed",
        description: "Your deployment has been successfully closed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertDeployment) => {
    deployMutation.mutate(data);
  };

  const walletAddress = "0x355A9b118Fd7f4b15A30572039316b362A0E5d8a";

  return (
    <div className="min-h-screen flex flex-col">
      <div className="container mx-auto py-10 px-4 flex-grow">
        <div className="flex justify-between items-center mb-8 border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h1 className="text-4xl font-black">Spheron Protocol SDK example</h1>
          <WalletStatus
            isConnected={!isBalanceLoading && !!escrowBalance}
            isLoading={isWalletLoading || isBalanceLoading}
            address={walletAddress}
          />
        </div>

        <div className="grid gap-8">
          <Card className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl font-black">
                <Server className="h-6 w-6" />
                Balance Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {escrowBalance ? (
                <div className="space-y-2">
                  <p className="text-xl font-bold">
                    Available Balance: {formatBalance(escrowBalance.unlockedBalance)} CST
                  </p>
                  <p className="text-lg text-muted-foreground">
                    Locked in deployments: {formatBalance(escrowBalance.lockedBalance)} CST
                  </p>
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Unable to fetch balance. Please ensure you have sufficient CST funds.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {deploymentInfo && (
            <Card className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Deployment Details</CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => refreshDeploymentMutation.mutate(deploymentInfo.transaction.leaseId)}
                    disabled={refreshDeploymentMutation.isPending}
                    className="border-2 border-black"
                  >
                    <RefreshCw className={cn(
                      "mr-2 h-4 w-4",
                      refreshDeploymentMutation.isPending && "animate-spin"
                    )} />
                    Refresh Details
                  </Button>
                  <Button 
                    variant="destructive"
                    size="sm"
                    onClick={() => closeDeploymentMutation.mutate(deploymentInfo.transaction.leaseId)}
                    disabled={closeDeploymentMutation.isPending}
                    className="border-2 border-black"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Close Deployment
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium text-lg mb-2">Basic Information</h3>
                    <div className="space-y-2">
                      <p><span className="font-bold">Name:</span> {deploymentInfo.deployment.name}</p>
                      <p><span className="font-bold">Status:</span> {deploymentInfo.deployment.status}</p>
                      <p><span className="font-bold">Lease ID:</span> {deploymentInfo.transaction.leaseId}</p>
                      <p><span className="font-bold">Transaction Hash:</span> {deploymentInfo.transaction.hash}</p>
                    </div>
                  </div>

                  {deploymentInfo.details && (
                    <>
                      <div>
                        <h3 className="font-medium text-lg mb-2">Services Status</h3>
                        {Object.entries(deploymentInfo.details.services).map(([serviceName, service]) => (
                          <div key={serviceName} className="border-2 border-black p-4 mb-4">
                            <h4 className="font-bold mb-2">{service.name || serviceName}</h4>
                            <div className="grid grid-cols-2 gap-2">
                              <p><span className="font-bold">Available:</span> {service.available}/{service.total}</p>
                              <p><span className="font-bold">Replicas:</span> {service.ready_replicas}/{service.replicas}</p>
                              <p><span className="font-bold">Updated:</span> {service.updated_replicas}</p>
                              <p><span className="font-bold">Generation:</span> {service.observed_generation}</p>
                              <p><span className="font-bold">Created:</span> {new Date(service.creationTimestamp).toLocaleString()}</p>
                            </div>

                            {service.container_statuses?.map((status, idx) => (
                              <div key={idx} className="mt-2 pl-4 border-l-2 border-black">
                                <p><span className="font-bold">Container:</span> {status.name}</p>
                                <p><span className="font-bold">Ready:</span> {status.ready ? 'Yes' : 'No'}</p>
                                {status.state.running && (
                                  <p><span className="font-bold">Started:</span> {new Date(status.state.running.startedAt).toLocaleString()}</p>
                                )}
                                {status.state.waiting && (
                                  <p><span className="font-bold">Waiting:</span> {status.state.waiting.reason}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>

                      {deploymentInfo.details.forwarded_ports && 
                       Object.entries(deploymentInfo.details.forwarded_ports).length > 0 && (
                        <div>
                          <h3 className="font-medium text-lg mb-2">Forwarded Ports</h3>
                          {Object.entries(deploymentInfo.details.forwarded_ports).map(([service, ports]) => (
                            <div key={service} className="border-2 border-black p-4">
                              <h4 className="font-bold mb-2">{service}</h4>
                              <ul className="space-y-2">
                                {ports.map((port, idx) => (
                                  <li key={idx} className="flex items-center gap-2">
                                    <span className="font-bold">{port.proto.toUpperCase()}</span>
                                    <span>{port.host}:{port.externalPort} → {port.port}</span>
                                    <span className="text-sm text-muted-foreground">({port.name})</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {!deploymentInfo && (
            <Card className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl font-black">
                  <Upload className="h-6 w-6" />
                  Create Deployment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold">Deployment Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="my-deployment"
                              {...field}
                              className="border-2 border-black focus-visible:ring-4 ring-primary/20"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="iclConfig"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold">ICL Configuration (YAML)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="version: '1.0'..."
                              className="font-mono border-2 border-black min-h-[300px] focus-visible:ring-4 ring-primary/20"
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      disabled={deployMutation.isPending}
                      className="w-full border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                    >
                      {deployMutation.isPending ? "Creating Deployment..." : "Create Deployment"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <footer className="border-t-4 border-black py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="font-black text-lg flex items-center justify-center gap-2">
            Powered by
            <span className="text-primary hover:underline cursor-pointer transition-colors">
              Spheron
            </span>
          </p>
        </div>
      </footer>
    </div>
  );
}

interface BalanceResponse {
  lockedBalance: string;
  unlockedBalance: string;
}