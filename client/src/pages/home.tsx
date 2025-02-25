import { useState } from "react";
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

// Keep the DEFAULT_ICL_CONFIG as is...
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
    forwarded_ports: Array<{
      port: number;
      as: number;
    }>;
  };
  lease: {
    status: string;
    duration: string;
  };
}

export default function Home() {
  const { toast } = useToast();
  const [deploymentInfo, setDeploymentInfo] = useState<DeploymentResponse | null>(null);

  const form = useForm<InsertDeployment>({
    resolver: zodResolver(insertDeploymentSchema),
    defaultValues: {
      name: "ollama-deployment",
      iclConfig: DEFAULT_ICL_CONFIG,
      providerUrl: "https://provider-proxy.spheron.network",
    },
  });

  const { data: escrowBalance } = useQuery<BalanceResponse>({
    queryKey: ["/api/balance"],
  });

  const deployMutation = useMutation({
    mutationFn: async (data: InsertDeployment) => {
      const res = await apiRequest("POST", "/api/deployments", data);
      return res.json();
    },
    onSuccess: (data: DeploymentResponse) => {
      setDeploymentInfo(data);
      toast({
        title: "Deployment Created",
        description: "Your deployment has been created successfully",
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

  return (
    <div className="container mx-auto py-10 px-4">
      <h1 className="text-4xl font-bold mb-8">Spheron Deployment Creator</h1>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Balance Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {escrowBalance ? (
              <div className="space-y-2">
                <p className="text-lg">
                  Available Balance: {escrowBalance.unlockedBalance} CST
                </p>
                <p className="text-sm text-muted-foreground">
                  Locked in deployments: {escrowBalance.lockedBalance} CST
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
          <Card>
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
                  <div>
                    <h3 className="font-medium">Deployment Status</h3>
                    <p>Status: {deploymentInfo.details.status}</p>
                    <div className="mt-2">
                      <h4 className="font-medium">Forwarded Ports:</h4>
                      <ul className="list-disc list-inside">
                        {deploymentInfo.details.forwarded_ports?.map((port, idx) => (
                          <li key={idx}>
                            Port {port.port} as {port.as}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
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
                      <FormLabel>Deployment Name</FormLabel>
                      <FormControl>
                        <Input placeholder="my-deployment" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="iclConfig"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ICL Configuration (YAML)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="version: '1.0'..."
                          className="font-mono"
                          rows={10}
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  disabled={deployMutation.isPending}
                  className="w-full"
                >
                  {deployMutation.isPending ? "Creating Deployment..." : "Create Deployment"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}