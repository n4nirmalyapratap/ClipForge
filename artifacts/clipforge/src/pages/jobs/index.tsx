import { useListJobs, useDeleteJob, getListJobsQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Plus, Trash2, ExternalLink, Film, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'done': return <Badge className="bg-emerald-500 hover:bg-emerald-600">Done</Badge>;
    case 'failed': return <Badge variant="destructive">Failed</Badge>;
    case 'pending': return <Badge variant="secondary">Pending</Badge>;
    default: return <Badge variant="outline" className="text-primary border-primary animate-pulse">{status}</Badge>;
  }
};

export default function JobsList() {
  const { data: jobs, isLoading } = useListJobs();
  const deleteJob = useDeleteJob();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this job?")) {
      deleteJob.mutate({ jobId: id }, {
        onSuccess: () => {
          toast({ title: "Job deleted successfully" });
          queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
        },
        onError: (err) => {
          toast({ title: "Failed to delete job", variant: "destructive", description: String(err) });
        }
      });
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Jobs</h1>
          <p className="text-muted-foreground mt-1">Manage your video processing pipeline.</p>
        </div>
        <Link href="/jobs/new">
          <Button className="font-bold tracking-tight shadow-primary/20 shadow-lg">
            <Plus className="w-4 h-4 mr-2" /> NEW JOB
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : jobs?.length === 0 ? (
        <div className="text-center py-20 bg-card/30 rounded-lg border border-border">
          <Film className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-bold">No jobs found</h2>
          <p className="text-muted-foreground mt-2 mb-6">You haven't processed any videos yet.</p>
          <Link href="/jobs/new">
            <Button><Plus className="w-4 h-4 mr-2" /> Create First Job</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs?.map((job) => (
            <Card key={job.id} className="bg-card/50 backdrop-blur-sm border-border overflow-hidden hover:bg-card/80 transition-colors">
              <CardContent className="p-0 sm:flex items-center">
                <div className="w-full sm:w-64 h-36 bg-muted relative shrink-0">
                  {job.videoThumbnail ? (
                    <img src={job.videoThumbnail} alt="Thumbnail" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Film className="w-8 h-8 text-muted-foreground opacity-50" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    {getStatusBadge(job.status)}
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between sm:h-36">
                  <div>
                    <h3 className="font-bold text-lg line-clamp-1" title={job.videoTitle || job.youtubeUrl}>
                      {job.videoTitle || "Unknown Title"}
                    </h3>
                    <div className="flex items-center text-sm text-muted-foreground mt-1 gap-2">
                      <a href={job.youtubeUrl} target="_blank" rel="noreferrer" className="hover:text-primary flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" /> Source
                      </a>
                      <span>•</span>
                      <span>{new Date(job.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex gap-4 text-sm font-medium">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-xs uppercase tracking-wider">Clips</span>
                        <span>{job.clipsCount}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-xs uppercase tracking-wider">Uploaded</span>
                        <span>{job.uploadedCount}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleDelete(job.id)} disabled={deleteJob.isPending}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                      <Link href={`/jobs/${job.id}`}>
                        <Button size="sm">View Details</Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
