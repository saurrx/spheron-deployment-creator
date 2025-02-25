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

interface BalanceResponse {
  lockedBalance: string;
  unlockedBalance: string;
}

export default function Home() {
  const { toast } = useToast();
  const [balance, setBalance] = useState<string | null>(null);

  const form = useForm<InsertDeployment>({
    resolver: zodResolver(insertDeploymentSchema),
    defaultValues: {
      name: "",
      iclConfig: "",
      providerUrl: "https://provider.spheron.network",
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
    onSuccess: () => {
      toast({
        title: "Deployment Created",
        description: "Your deployment has been created successfully",
      });
      form.reset();
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
                  Available Balance: {escrowBalance.unlockedBalance} USDT
                </p>
                <p className="text-sm text-muted-foreground">
                  Locked in deployments: {escrowBalance.lockedBalance} USDT
                </p>
              </div>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Unable to fetch balance. Please ensure you have sufficient funds.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

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

                <FormField
                  control={form.control}
                  name="providerUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provider URL</FormLabel>
                      <FormControl>
                        <Input {...field} />
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