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
import { Upload, Server, AlertCircle } from "lucide-react";
import { WalletStatus } from "@/components/ui/wallet-status";

const DEFAULT_ICL_CONFIG = `version: "1.0"

services:
  ollama-test:
    image: ollama/ollama:0.3.12
    pull_policy: IfNotPresent
    expose:
      - port: 11434
        as: 11434
        to:
          - global: true
    env:
      - OLLAMA_MODEL=llama3.2
    command:
      - "sh"
      - "-c"
      - "apt update && apt install -y curl && /bin/ollama serve & while ! curl -s http://localhost:11434/api/tags > /dev/null; do sleep 1; done && /bin/ollama pull $OLLAMA_MODEL && /bin/ollama run $OLLAMA_MODEL 'Hello' && tail -f /dev/null"
profiles:
  name: ollama-testing
  duration: 1h
  mode: provider
  tier:
    - community
  compute:
    ollama-test:
      resources:
        cpu:
          units: 1
        memory:
          size: 2Gi
        storage:
          - size: 50Gi
        gpu:
          units: 1
          attributes:
            vendor:
              nvidia:
                - model: rtx4090
  placement:
    westcoast:
      attributes:
        region: us-west
      pricing:
        ollama-test:
          token: CST
          amount: 5
deployment:
  ollama-test:
    westcoast:
      profile: ollama-test
      count: 1`;

interface BalanceResponse {
  lockedBalance: string;
  unlockedBalance: string;
}

interface DeploymentResponse {
  deployment: {
    id: number;
    name: string;
    status: string;
  };
  transaction: {
    leaseId: string;
  };
  details: {
    status: string;
    provider: string;
    pricePerHour: string;
    startTime: string;
    remainingTime: string;
    forwarded_ports: {
      [key: string]: Array<{
        port: number;
        externalPort: number;
        proto: string;
        name: string;
        host: string;
      }>;
    };
    services: {
      [key: string]: {
        available: string;
        total: string;
        ready_replicas: number;
        replicas: number;
        uris?: string[];
        container_statuses?: Array<{
          name: string;
          ready: boolean;
          state: {
            running?: { startedAt: string };
            terminated?: { reason: string; exitCode: number };
            waiting?: { reason: string };
          };
        }>;
      };
    };
    providerDetails: {
      hostUri: string;
      spec: any;
      status: string;
      trust: number;
    };
    logs: string[];
  };
  lease: {
    status: string;
    duration: string;
  };
}

export default function Home() {
  const { toast } = useToast();
  const [deploymentInfo, setDeploymentInfo] = useState<DeploymentResponse | null>(null);
  const [isWalletLoading, setIsWalletLoading] = useState(true);

  const form = useForm<InsertDeployment>({
    resolver: zodResolver(insertDeploymentSchema),
    defaultValues: {
      name: "ollama-deployment",
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
      form.reset({
        name: "ollama-deployment",
        iclConfig: DEFAULT_ICL_CONFIG,
        providerUrl: "https://provider-proxy.spheron.network",
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
              <CardHeader>
                <CardTitle>Deployment Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium">Basic Information</h3>
                    <p>Name: {deploymentInfo.deployment.name}</p>
                    <p>Status: {deploymentInfo.deployment.status}</p>
                    <p>Lease ID: {deploymentInfo.transaction.leaseId}</p>
                  </div>

                  {deploymentInfo.details && (
                    <>
                      <div>
                        <h3 className="font-medium">Deployment Status</h3>
                        <p>Status: {deploymentInfo.details.status}</p>
                        <p>Provider: {deploymentInfo.details.provider}</p>
                        <p>Price per hour: {deploymentInfo.details.pricePerHour} CST</p>
                        <p>Start time: {new Date(deploymentInfo.details.startTime).toLocaleString()}</p>
                        <p>Remaining time: {deploymentInfo.details.remainingTime}</p>
                      </div>

                      {deploymentInfo.details.providerDetails && (
                        <div>
                          <h3 className="font-medium">Provider Details</h3>
                          <p>Host URI: {deploymentInfo.details.providerDetails.hostUri || 'Not available'}</p>
                          <p>Status: {deploymentInfo.details.providerDetails.status || 'Unknown'}</p>
                          <p>Trust Score: {deploymentInfo.details.providerDetails.trust || 'N/A'}</p>
                        </div>
                      )}

                      {deploymentInfo.details.services && Object.keys(deploymentInfo.details.services).length > 0 && (
                        <div>
                          <h3 className="font-medium">Services</h3>
                          {Object.entries(deploymentInfo.details.services).map(([serviceName, service]) => (
                            <div key={serviceName} className="mt-2 p-4 bg-muted rounded-lg">
                              <h4 className="font-medium">{serviceName}</h4>
                              <p>Available: {service.available}/{service.total}</p>
                              <p>Ready replicas: {service.ready_replicas}/{service.replicas}</p>

                              {service.uris && service.uris.length > 0 && (
                                <p>URIs: {service.uris.join(', ')}</p>
                              )}

                              {service.container_statuses && service.container_statuses.length > 0 && (
                                <div className="mt-2">
                                  <h5 className="font-medium">Container Statuses:</h5>
                                  {service.container_statuses.map((status, idx) => (
                                    <div key={idx} className="ml-4">
                                      <p>{status.name}: {status.ready ? 'Ready' : 'Not ready'}</p>
                                      {status.state.running && (
                                        <p className="text-sm">Running since: {status.state.running.startedAt}</p>
                                      )}
                                      {status.state.terminated && (
                                        <p className="text-sm">Terminated: {status.state.terminated.reason} (exit code {status.state.terminated.exitCode})</p>
                                      )}
                                      {status.state.waiting && (
                                        <p className="text-sm">Waiting: {status.state.waiting.reason}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {deploymentInfo.details.forwarded_ports &&
                        Object.entries(deploymentInfo.details.forwarded_ports).length > 0 && (
                          <div>
                            <h3 className="font-medium">Forwarded Ports</h3>
                            {Object.entries(deploymentInfo.details.forwarded_ports).map(([service, ports]) => (
                              <div key={service} className="mt-2">
                                <h4 className="font-medium">{service}:</h4>
                                <ul className="list-disc list-inside">
                                  {ports.map((port, idx) => (
                                    <li key={idx}>
                                      {port.proto.toUpperCase()} {port.host}:{port.externalPort} &rarr; {port.port} ({port.name})
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        )}

                      {deploymentInfo.details.logs && deploymentInfo.details.logs.length > 0 && (
                        <div>
                          <h3 className="font-medium">Deployment Logs</h3>
                          <pre className="mt-2 p-4 bg-muted rounded-lg overflow-x-auto">
                            {deploymentInfo.details.logs.join('\n')}
                          </pre>
                        </div>
                      )}
                    </>
                  )}

                  {deploymentInfo.lease && (
                    <div>
                      <h3 className="font-medium">Lease Information</h3>
                      <p>Status: {deploymentInfo.lease.status}</p>
                      <p>Duration: {deploymentInfo.lease.duration}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

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