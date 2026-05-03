import { useListAccounts, useCreateAccount, useDeleteAccount, getListAccountsQueryKey } from "@workspace/api-client-react";
import { useState } from "react";
import { Plus, Trash2, Youtube, Instagram, Music2, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PLATFORMS = [
  { id: "youtube", name: "YouTube Shorts", icon: Youtube, color: "text-red-500" },
  { id: "instagram", name: "Instagram Reels", icon: Instagram, color: "text-pink-500" },
  { id: "tiktok", name: "TikTok", icon: Music2, color: "text-cyan-400" },
];

export default function AccountsList() {
  const { data: accounts, isLoading } = useListAccounts();
  const createAccount = useCreateAccount();
  const deleteAccount = useDeleteAccount();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<string>("");
  const [accountName, setAccountName] = useState("");
  const [credentials, setCredentials] = useState("");

  const handleCreate = () => {
    if (!platform || !accountName || !credentials) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }

    let parsedCredentials = {};
    try {
      parsedCredentials = JSON.parse(credentials);
    } catch (e) {
      parsedCredentials = { token: credentials }; // fallback
    }

    createAccount.mutate(
      { 
        data: { 
          platform: platform as any, 
          accountName, 
          credentials: parsedCredentials 
        } 
      },
      {
        onSuccess: () => {
          toast({ title: "Account connected successfully" });
          queryClient.invalidateQueries({ queryKey: getListAccountsQueryKey() });
          setOpen(false);
          setPlatform("");
          setAccountName("");
          setCredentials("");
        },
        onError: (err) => {
          toast({ title: "Failed to connect account", variant: "destructive", description: String(err) });
        }
      }
    );
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to disconnect this account?")) {
      deleteAccount.mutate(
        { accountId: id },
        {
          onSuccess: () => {
            toast({ title: "Account disconnected" });
            queryClient.invalidateQueries({ queryKey: getListAccountsQueryKey() });
          },
          onError: (err) => {
            toast({ title: "Failed to disconnect account", variant: "destructive", description: String(err) });
          }
        }
      );
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto w-full space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Connected Accounts</h1>
          <p className="text-muted-foreground mt-1">Manage your social media destinations.</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="font-bold shadow-primary/20 shadow-lg">
              <Plus className="w-4 h-4 mr-2" /> Connect Account
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-card border-border">
            <DialogHeader>
              <DialogTitle>Connect New Account</DialogTitle>
              <DialogDescription>
                Add a social media account to upload your clips automatically.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Platform</label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="flex items-center gap-2">
                          <p.icon className={`w-4 h-4 ${p.color}`} />
                          {p.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Account Name / Handle</label>
                <Input 
                  placeholder="@username" 
                  value={accountName} 
                  onChange={e => setAccountName(e.target.value)}
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center justify-between">
                  <span>API Credentials</span>
                  <a href="/settings" className="text-primary text-xs hover:underline">How to get these?</a>
                </label>
                <Input 
                  placeholder='{"access_token": "..."}' 
                  value={credentials} 
                  onChange={e => setCredentials(e.target.value)}
                  className="bg-background border-border font-mono text-xs"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createAccount.isPending}>
                {createAccount.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Connect
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : accounts?.length === 0 ? (
        <div className="text-center py-20 bg-card/30 rounded-lg border border-border">
          <Share2 className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-bold">No accounts connected</h2>
          <p className="text-muted-foreground mt-2">Connect YouTube, Instagram, or TikTok to enable direct uploads.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts?.map(account => {
            const platformMeta = PLATFORMS.find(p => p.id === account.platform) || PLATFORMS[0];
            const Icon = platformMeta.icon;
            
            return (
              <Card key={account.id} className="bg-card border-border flex flex-col">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className={`p-3 rounded-xl bg-secondary ${platformMeta.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    {account.isConnected ? (
                      <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Connected
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20">
                        <XCircle className="w-3 h-3 mr-1" /> Disconnected
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pb-4 flex-1">
                  <CardTitle className="text-xl mb-1">{account.accountName}</CardTitle>
                  <CardDescription className="capitalize text-xs tracking-wider font-medium">
                    {platformMeta.name}
                  </CardDescription>
                </CardContent>
                <CardFooter className="pt-0 flex justify-end">
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(account.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-4 h-4 mr-2" /> Disconnect
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Needed to avoid undefined variables
import { Share2 } from "lucide-react";
