import { useListClips } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Upload, Star, Video, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Link } from "wouter";

export default function ClipsList() {
  const [status, setStatus] = useState<string>("all");
  
  // Need to typecast or ignore if the API client restricts string to specific union
  const queryParams = status !== "all" ? { status: status as any } : undefined;
  const { data: clips, isLoading } = useListClips(queryParams);

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">All Clips</h1>
          <p className="text-muted-foreground mt-1">Manage and upload generated shorts.</p>
        </div>
        <div className="w-48">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="bg-background border-border">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="ready">Ready</SelectItem>
              <SelectItem value="uploading">Uploading</SelectItem>
              <SelectItem value="uploaded">Uploaded</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : clips?.length === 0 ? (
        <div className="text-center py-20 bg-card/30 rounded-lg border border-border">
          <Video className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-bold">No clips found</h2>
          <p className="text-muted-foreground mt-2">Generate some clips by processing a job first.</p>
          <div className="mt-6">
            <Link href="/jobs/new">
              <Button>Start a New Job</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {clips?.map(clip => (
            <Card key={clip.id} className="bg-card border-border flex flex-col overflow-hidden">
              <div className="aspect-[9/16] bg-muted relative group">
                {clip.thumbnailPath ? (
                  <img src={clip.thumbnailPath} alt="Clip" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-black/50">
                    <Play className="w-12 h-12 text-white/50" />
                  </div>
                )}
                <div className="absolute top-2 left-2">
                  <Badge variant={clip.status === 'uploaded' ? 'default' : 'secondary'} className="capitalize border-none shadow-sm">
                    {clip.status}
                  </Badge>
                </div>
                <div className="absolute top-2 right-2">
                  {clip.aiScore && (
                    <Badge className="bg-accent text-accent-foreground hover:bg-accent/90 border-none font-bold shadow-sm">
                      <Star className="w-3 h-3 mr-1 fill-current" /> {clip.aiScore}
                    </Badge>
                  )}
                </div>
                <div className="absolute bottom-2 right-2">
                  <Badge variant="secondary" className="bg-black/70 text-white border-none font-mono">
                    {Math.floor(clip.duration)}s
                  </Badge>
                </div>
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button variant="secondary" size="icon" className="rounded-full w-12 h-12">
                    <Play className="w-6 h-6 ml-1" />
                  </Button>
                </div>
              </div>
              <CardHeader className="p-4 pb-0">
                <CardTitle className="text-base line-clamp-2 leading-tight" title={clip.title}>{clip.title}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2 flex-1">
                <p className="text-xs text-muted-foreground line-clamp-2">{clip.description}</p>
                {clip.uploadedPlatforms.length > 0 && (
                  <div className="flex gap-1 mt-3">
                    {clip.uploadedPlatforms.map(p => (
                      <Badge key={p} variant="outline" className="text-[10px] px-1 py-0 capitalize">{p}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter className="p-4 pt-0 border-t border-border mt-auto flex gap-2">
                <Link href={`/jobs/${clip.jobId}`} className="flex-1">
                  <Button variant="outline" className="w-full text-xs h-9">View Job</Button>
                </Link>
                <Button className="flex-1 font-bold text-xs h-9" disabled={clip.status === 'uploading'}>
                  <Upload className="w-3 h-3 mr-1" /> Upload
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
