import { useGetDashboardStats, useGetRecentActivity, useGetUploadsByPlatform } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Plus, Youtube, Instagram, Music2, Activity, PlayCircle, Layers, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: activity, isLoading: activityLoading } = useGetRecentActivity();
  const { data: uploads, isLoading: uploadsLoading } = useGetUploadsByPlatform();

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your video processing pipeline.</p>
        </div>
        <Link href="/jobs/new">
          <Button className="font-bold tracking-tight shadow-primary/20 shadow-lg">
            <Plus className="w-4 h-4 mr-2" /> NEW JOB
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Jobs</CardTitle>
            <Layers className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{statsLoading ? "-" : stats?.totalJobs}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {statsLoading ? "..." : `${stats?.jobsProcessing} currently processing`}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 backdrop-blur-sm border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Clips</CardTitle>
            <PlayCircle className="w-4 h-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{statsLoading ? "-" : stats?.totalClips}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {statsLoading ? "..." : `${stats?.clipsReady} ready to upload`}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Uploads</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{statsLoading ? "-" : stats?.totalUploads}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all platforms</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Connected Accounts</CardTitle>
            <Share2 className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{statsLoading ? "-" : stats?.connectedAccounts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <Link href="/accounts" className="text-primary hover:underline">Manage accounts</Link>
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" /> Recent Activity
          </h2>
          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <div className="divide-y divide-border">
              {activityLoading ? (
                <div className="p-8 text-center text-muted-foreground">Loading activity...</div>
              ) : activity?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No recent activity</div>
              ) : (
                activity?.map((item) => (
                  <div key={item.id} className="p-4 flex items-start gap-4 hover:bg-secondary/50 transition-colors">
                    <div className={`mt-0.5 w-2 h-2 rounded-full ${
                      item.type === 'job_failed' ? 'bg-destructive' :
                      item.type === 'job_done' ? 'bg-emerald-500' :
                      item.type === 'clip_uploaded' ? 'bg-blue-500' : 'bg-primary'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight">Uploads by Platform</h2>
          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardContent className="p-6 space-y-6">
              {uploadsLoading ? (
                <div className="text-center text-muted-foreground py-4">Loading platforms...</div>
              ) : uploads?.length === 0 ? (
                <div className="text-center text-muted-foreground py-4">No uploads yet</div>
              ) : (
                uploads?.map((stat) => {
                  const Icon = stat.platform === 'youtube' ? Youtube :
                              stat.platform === 'instagram' ? Instagram : Music2;
                  const colorClass = stat.platform === 'youtube' ? 'text-red-500' :
                                    stat.platform === 'instagram' ? 'text-pink-500' : 'text-cyan-400';
                  
                  return (
                    <div key={stat.platform} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-md bg-secondary ${colorClass}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="font-medium capitalize">{stat.platform}</div>
                      </div>
                      <div className="text-xl font-bold">{stat.count}</div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Ensure the Share2 component is available since it's used
import { Share2 } from "lucide-react";
