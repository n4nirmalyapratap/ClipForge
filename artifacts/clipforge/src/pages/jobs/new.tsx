import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateJob, useProcessJob, getListJobsQueryKey, getGetDashboardStatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Link2, Loader2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function NewJob() {
  const [url, setUrl] = useState("");
  const [, setLocation] = useLocation();
  const createJob = useCreateJob();
  const processJob = useProcessJob();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isPending = createJob.isPending || processJob.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    createJob.mutate(
      { data: { youtubeUrl: url } },
      {
        onSuccess: (job) => {
          queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
          // Auto-trigger processing immediately after creation
          processJob.mutate(
            { jobId: job.id },
            {
              onSuccess: () => {
                toast({ title: "Processing started", description: "AI is analyzing your video. This may take a few minutes." });
                setLocation(`/jobs/${job.id}`);
              },
              onError: () => {
                // Still navigate even if process trigger fails — user can retry
                setLocation(`/jobs/${job.id}`);
              },
            }
          );
        },
        onError: (err) => {
          toast({ title: "Failed to create job", variant: "destructive", description: String(err) });
        }
      }
    );
  };

  return (
    <div className="p-8 max-w-3xl mx-auto w-full space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/jobs">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Job</h1>
          <p className="text-muted-foreground mt-1">Paste a YouTube URL to start AI processing.</p>
        </div>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>YouTube Source</CardTitle>
            <CardDescription>
              Paste the URL of the YouTube video you want to repurpose into shorts. Only use videos that allow repurposing or are copyright-free.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Link2 className="h-5 w-5 text-muted-foreground" />
                </div>
                <Input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="pl-10 py-6 text-lg bg-background border-border focus-visible:ring-primary"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                />
              </div>
              {isPending && (
                <div className="text-sm text-muted-foreground flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-md p-3">
                  <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" />
                  <span>
                    {createJob.isPending ? "Creating job..." : "Starting AI pipeline — downloading, transcribing, and analyzing your video..."}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-4 border-t border-border pt-6">
            <Link href="/jobs">
              <Button variant="outline" type="button" disabled={isPending}>Cancel</Button>
            </Link>
            <Button type="submit" disabled={!url.trim() || isPending} className="font-bold">
              {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {isPending ? "Starting..." : "Start Processing"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
