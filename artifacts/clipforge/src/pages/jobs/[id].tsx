import { useParams, Link } from "wouter";
import { 
  useGetJob, 
  useGetJobClips, 
  useProcessJob, 
  useUpdateClip,
  useUploadClip,
  useListAccounts,
  getGetJobQueryKey,
  getGetJobClipsQueryKey,
  getListAccountsQueryKey,
  getGetDashboardStatsQueryKey,
  getGetRecentActivityQueryKey,
} from "@workspace/api-client-react";
import { ArrowLeft, Play, RefreshCw, Star, Upload, ExternalLink, Loader2, Save, CheckCircle2, Download, Video } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

const PROCESSING_STATUSES = ["pending", "downloading", "transcribing", "analyzing", "clipping"];

function ClipCard({ clip }: { clip: any }) {
  const handlePlay = () => {
    if (clip.filePath) {
      // Open video in new tab to bypass iframe proxy streaming restrictions
      window.open(clip.filePath, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Card className="bg-card border-border flex flex-col overflow-hidden">
      {/* Thumbnail / player trigger */}
      <div
        className="aspect-[9/16] bg-black relative group cursor-pointer max-h-72 overflow-hidden"
        onClick={handlePlay}
      >
        {clip.thumbnailPath ? (
          <img
            src={`${clip.thumbnailPath}?v=${clip.id}`}
            alt={clip.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-900">
            <Play className="w-10 h-10 text-white/20" />
          </div>
        )}

        {/* Hover overlay */}
        {clip.filePath && (
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="rounded-full bg-white/20 backdrop-blur-sm p-4">
              <Play className="w-8 h-8 text-white fill-white" />
            </div>
          </div>
        )}

        {/* AI score badge */}
        {clip.aiScore != null && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-primary text-primary-foreground font-bold border-none shadow">
              <Star className="w-3 h-3 mr-1 fill-current" />
              {clip.aiScore}
            </Badge>
          </div>
        )}

        {/* Duration badge */}
        <div className="absolute bottom-2 right-2">
          <Badge variant="secondary" className="bg-black/70 text-white border-none font-mono text-xs">
            {Math.floor(clip.duration)}s
          </Badge>
        </div>

        {/* Uploaded badge */}
        {(clip.uploadedPlatforms || []).length > 0 && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-green-600 text-white border-none text-xs shadow">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Uploaded
            </Badge>
          </div>
        )}
      </div>

      <CardHeader className="p-4 pb-0">
        <CardTitle className="text-base line-clamp-2 leading-tight">{clip.title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2 flex-1">
        <p className="text-xs text-muted-foreground line-clamp-2">{clip.description}</p>
        <p className="text-xs text-muted-foreground/50 mt-2 font-mono">
          {Number(clip.startTime).toFixed(1)}s – {Number(clip.endTime).toFixed(1)}s
        </p>
      </CardContent>
      <CardFooter className="p-4 pt-0 border-t border-border mt-auto flex gap-2 flex-wrap">
        <ClipEditDialog clip={clip} />
        {clip.filePath && (
          <a
            href={clip.filePath}
            download
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-transparent px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </a>
        )}
        <ClipUploadDialog clip={clip} />
      </CardFooter>
    </Card>
  );
}

function ClipEditDialog({ clip }: { clip: any }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(clip.title);
  const [desc, setDesc] = useState(clip.description);
  const updateClip = useUpdateClip();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleSave = () => {
    updateClip.mutate(
      { clipId: clip.id, data: { title, description: desc } },
      {
        onSuccess: () => {
          toast({ title: "Clip updated" });
          queryClient.invalidateQueries({ queryKey: getGetJobClipsQueryKey(clip.jobId) });
          setOpen(false);
        },
        onError: (err) => toast({ title: "Failed to update", variant: "destructive", description: String(err) }),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Edit</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-card border-border">
        <DialogHeader><DialogTitle>Edit Clip</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-background border-border" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Caption</label>
            <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={4} className="bg-background border-border" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={updateClip.isPending}>
            {updateClip.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ClipUploadDialog({ clip }: { clip: any }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const uploadClip = useUploadClip();
  const { data: accounts } = useListAccounts({ query: { queryKey: getListAccountsQueryKey() } });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const connectedPlatforms = (accounts || []).filter((a) => a.isConnected).map((a) => a.platform);
  const toggle = (p: string) => setSelected((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);

  const handleUpload = () => {
    if (!selected.length) return;
    uploadClip.mutate(
      { clipId: clip.id, data: { platforms: selected as any } },
      {
        onSuccess: (result) => {
          const ok = result.results.filter((r) => r.success).map((r) => r.platform);
          const failed = result.results.filter((r) => !r.success);
          if (ok.length) toast({ title: `Uploaded to ${ok.join(", ")}` });
          if (failed.length) toast({ title: "Some uploads failed", variant: "destructive", description: failed.map((r) => `${r.platform}: ${r.error}`).join("; ") });
          queryClient.invalidateQueries({ queryKey: getGetJobClipsQueryKey(clip.jobId) });
          queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetRecentActivityQueryKey() });
          setOpen(false);
          setSelected([]);
        },
        onError: (err) => toast({ title: "Upload failed", variant: "destructive", description: String(err) }),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex-1 font-bold" size="sm">
          <Upload className="w-4 h-4 mr-2" /> Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm bg-card border-border">
        <DialogHeader><DialogTitle>Upload to Platforms</DialogTitle></DialogHeader>
        <div className="space-y-3 py-4">
          {(["youtube", "instagram", "tiktok"] as const).map((p) => {
            const connected = connectedPlatforms.includes(p);
            const alreadyUploaded = (clip.uploadedPlatforms || []).includes(p);
            return (
              <div key={p} className={`flex items-center gap-3 p-3 rounded-lg border ${connected ? "border-border" : "border-border/40 opacity-50"}`}>
                <Checkbox id={`upload-${p}-${clip.id}`} checked={selected.includes(p)} onCheckedChange={() => connected && !alreadyUploaded && toggle(p)} disabled={!connected || alreadyUploaded} />
                <label htmlFor={`upload-${p}-${clip.id}`} className="flex-1 capitalize font-medium cursor-pointer">{p}</label>
                {alreadyUploaded && <Badge variant="outline" className="text-xs text-green-500 border-green-500/30">Done</Badge>}
                {!connected && <Badge variant="outline" className="text-xs">Not connected</Badge>}
              </div>
            );
          })}
          {connectedPlatforms.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              No accounts connected. Go to <Link href="/accounts" className="text-primary hover:underline">Accounts</Link> to add them.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleUpload} disabled={!selected.length || uploadClip.isPending} className="font-bold">
            {uploadClip.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            Upload{selected.length > 0 ? ` to ${selected.length}` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Queued",
  downloading: "Downloading video...",
  transcribing: "Transcribing audio...",
  analyzing: "AI analyzing content...",
  clipping: "Cutting clips...",
  done: "Done",
  failed: "Failed",
};

const PROGRESS_MAP: Record<string, number> = {
  pending: 5,
  downloading: 20,
  transcribing: 45,
  analyzing: 65,
  clipping: 85,
  done: 100,
  failed: 0,
};

export default function JobDetail() {
  const params = useParams();
  const jobId = parseInt(params.id || "0");
  const isProcessing = (status: string) => PROCESSING_STATUSES.includes(status);

  const { data: job, isLoading: jobLoading } = useGetJob(jobId, {
    query: {
      enabled: !!jobId,
      queryKey: getGetJobQueryKey(jobId),
      // Poll every 3 seconds while processing
      refetchInterval: (query) => {
        const data = query.state.data as any;
        return data && isProcessing(data.status) ? 3000 : false;
      },
    },
  });

  const { data: clips, isLoading: clipsLoading } = useGetJobClips(jobId, {
    query: {
      enabled: !!jobId,
      queryKey: getGetJobClipsQueryKey(jobId),
      refetchInterval: job && isProcessing(job.status) ? 5000 : false,
    },
  });

  const processJob = useProcessJob();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleProcess = () => {
    processJob.mutate(
      { jobId },
      {
        onSuccess: () => {
          toast({ title: "Processing started", description: "AI pipeline is running. Updates will appear automatically." });
          queryClient.invalidateQueries({ queryKey: getGetJobQueryKey(jobId) });
        },
        onError: (err) => {
          toast({ title: "Failed to start processing", variant: "destructive", description: String(err) });
        },
      }
    );
  };

  if (jobLoading) {
    return (
      <div className="p-8 flex justify-center items-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!job) {
    return <div className="p-8 text-center text-muted-foreground">Job not found.</div>;
  }

  const processing = isProcessing(job.status);
  const progress = PROGRESS_MAP[job.status] ?? 0;

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link href="/jobs">
            <Button variant="ghost" size="icon" className="mt-1">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight line-clamp-2 max-w-2xl">
              {job.videoTitle || "Processing..."}
            </h1>
            <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
              <a href={job.youtubeUrl} target="_blank" rel="noreferrer" className="hover:text-primary flex items-center gap-1">
                <ExternalLink className="w-3 h-3" />
                <span className="max-w-xs truncate">{job.youtubeUrl}</span>
              </a>
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {job.status === "pending" && (
            <Button onClick={handleProcess} disabled={processJob.isPending} className="font-bold">
              {processJob.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
              Start Processing
            </Button>
          )}
          {job.status === "failed" && (
            <Button onClick={handleProcess} disabled={processJob.isPending} variant="destructive">
              <RefreshCw className={`w-4 h-4 mr-2 ${processJob.isPending ? "animate-spin" : ""}`} />
              Retry
            </Button>
          )}
          {job.status === "done" && (
            <Button variant="outline" onClick={handleProcess} disabled={processJob.isPending}>
              <RefreshCw className={`w-4 h-4 mr-2 ${processJob.isPending ? "animate-spin" : ""}`} />
              Reprocess
            </Button>
          )}
        </div>
      </div>

      {/* Pipeline status card */}
      <Card className="bg-card/50 backdrop-blur-sm border-border overflow-hidden">
        <div className="flex flex-col md:flex-row">
          <div className="w-full md:w-72 aspect-video bg-muted relative flex-shrink-0">
            {job.videoThumbnail ? (
              <img src={job.videoThumbnail} alt="Thumbnail" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Video className="w-12 h-12 text-muted-foreground opacity-40" />
              </div>
            )}
          </div>
          <div className="p-6 flex flex-col justify-center flex-1">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-lg">Pipeline Status</h3>
              {job.status === "done" && <CheckCircle2 className="w-5 h-5 text-green-500" />}
              {job.status === "failed" && <XCircle className="w-5 h-5 text-destructive" />}
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-primary">{STATUS_LABELS[job.status] || job.status}</span>
                <span className="text-muted-foreground font-mono">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex gap-6 text-xs text-muted-foreground pt-1">
                {(["downloading", "transcribing", "analyzing", "clipping"] as const).map((step) => {
                  const stepProgress = PROGRESS_MAP[step];
                  const isDone = progress > stepProgress || job.status === "done";
                  const isCurrent = job.status === step;
                  return (
                    <span key={step} className={isDone ? "text-primary" : isCurrent ? "text-foreground" : ""}>
                      {isDone ? "✓ " : isCurrent ? "• " : ""}{step}
                    </span>
                  );
                })}
              </div>
              {job.errorMessage && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm border border-destructive/20 mt-2">
                  {job.errorMessage}
                </div>
              )}
              {job.status === "done" && (
                <div className="text-sm text-muted-foreground pt-1">
                  {job.clipsCount} clips generated · {job.uploadedCount} uploaded
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Clips grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Generated Clips</h2>
          <Badge variant="outline" className="text-base px-3 py-1">{clips?.length || 0}</Badge>
        </div>

        {processing ? (
          <div className="text-center py-24 bg-card/30 rounded-lg border border-border border-dashed">
            <RefreshCw className="w-10 h-10 text-primary mx-auto mb-4 animate-spin opacity-60" />
            <h2 className="text-xl font-semibold">AI is working...</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              {STATUS_LABELS[job.status]} Page updates automatically every few seconds.
            </p>
          </div>
        ) : clips?.length === 0 ? (
          <div className="text-center py-24 bg-card/30 rounded-lg border border-border">
            <Video className="w-10 h-10 text-muted-foreground mx-auto mb-4 opacity-40" />
            <h2 className="text-xl font-semibold">No clips yet</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              {job.status === "pending"
                ? "Click \"Start Processing\" to begin the AI pipeline."
                : "No high-quality segments were found in this video."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clips?.map((clip) => (
              <ClipCard key={clip.id} clip={clip} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
