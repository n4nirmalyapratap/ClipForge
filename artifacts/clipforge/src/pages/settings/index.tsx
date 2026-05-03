import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KeyRound, ShieldAlert, BookOpen, ExternalLink, Youtube, Instagram, Music2 } from "lucide-react";

export default function Settings() {
  return (
    <div className="p-8 max-w-4xl mx-auto w-full space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">API Setup Guide</h1>
        <p className="text-muted-foreground mt-1">Configure your platform credentials for automated uploading.</p>
      </div>

      <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-start gap-4">
        <ShieldAlert className="w-6 h-6 text-primary shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-primary">Why do I need these?</h3>
          <p className="text-sm text-primary/80 mt-1">
            To automatically upload videos on your behalf, ClipForge needs API access to your social media accounts. 
            Your credentials are encrypted before storage and are never shared.
          </p>
        </div>
      </div>

      <Tabs defaultValue="youtube" className="w-full">
        <TabsList className="grid grid-cols-3 bg-card border border-border">
          <TabsTrigger value="youtube" className="data-[state=active]:bg-secondary">
            <Youtube className="w-4 h-4 mr-2 text-red-500" /> YouTube
          </TabsTrigger>
          <TabsTrigger value="instagram" className="data-[state=active]:bg-secondary">
            <Instagram className="w-4 h-4 mr-2 text-pink-500" /> Instagram
          </TabsTrigger>
          <TabsTrigger value="tiktok" className="data-[state=active]:bg-secondary">
            <Music2 className="w-4 h-4 mr-2 text-cyan-400" /> TikTok
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="youtube" className="mt-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Youtube className="w-5 h-5 text-red-500" /> YouTube Data API v3 Setup
              </CardTitle>
              <CardDescription>Required to upload Shorts to your YouTube channel.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-bold text-sm border border-border">1</div>
                  <div className="space-y-2 flex-1">
                    <h4 className="font-semibold text-foreground">Create a Google Cloud Project</h4>
                    <p className="text-sm text-muted-foreground">Go to the <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center">Google Cloud Console <ExternalLink className="w-3 h-3 ml-1" /></a> and create a new project.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-bold text-sm border border-border">2</div>
                  <div className="space-y-2 flex-1">
                    <h4 className="font-semibold text-foreground">Enable the YouTube Data API v3</h4>
                    <p className="text-sm text-muted-foreground">In the "APIs & Services" library, search for "YouTube Data API v3" and click Enable.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-bold text-sm border border-border">3</div>
                  <div className="space-y-2 flex-1">
                    <h4 className="font-semibold text-foreground">Configure OAuth Consent Screen</h4>
                    <p className="text-sm text-muted-foreground">Set up your OAuth consent screen. Add the <code>https://www.googleapis.com/auth/youtube.upload</code> scope.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-bold text-sm border border-border">4</div>
                  <div className="space-y-2 flex-1">
                    <h4 className="font-semibold text-foreground">Create Credentials</h4>
                    <p className="text-sm text-muted-foreground">Create OAuth 2.0 Client IDs. Download the JSON file and paste its contents when connecting your account.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="instagram" className="mt-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Instagram className="w-5 h-5 text-pink-500" /> Instagram Graph API Setup
              </CardTitle>
              <CardDescription>Required to publish Reels to your Instagram Professional account.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-bold text-sm border border-border">1</div>
                  <div className="space-y-2 flex-1">
                    <h4 className="font-semibold text-foreground">Create a Meta App</h4>
                    <p className="text-sm text-muted-foreground">Go to the <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center">Meta App Dashboard <ExternalLink className="w-3 h-3 ml-1" /></a> and create a "Business" app.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-bold text-sm border border-border">2</div>
                  <div className="space-y-2 flex-1">
                    <h4 className="font-semibold text-foreground">Link Instagram Professional Account</h4>
                    <p className="text-sm text-muted-foreground">Ensure your Instagram account is a Professional account and linked to a Facebook Page.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-bold text-sm border border-border">3</div>
                  <div className="space-y-2 flex-1">
                    <h4 className="font-semibold text-foreground">Generate Long-Lived Access Token</h4>
                    <p className="text-sm text-muted-foreground">Use the Graph API Explorer to generate a token with <code>instagram_basic</code> and <code>instagram_content_publish</code> permissions.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-bold text-sm border border-border">4</div>
                  <div className="space-y-2 flex-1">
                    <h4 className="font-semibold text-foreground">Paste Token</h4>
                    <p className="text-sm text-muted-foreground">Format your token as <code>{`{"access_token": "YOUR_TOKEN", "ig_user_id": "YOUR_IG_ID"}`}</code> and paste it when connecting.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tiktok" className="mt-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music2 className="w-5 h-5 text-cyan-400" /> TikTok API Setup
              </CardTitle>
              <CardDescription>Required to post directly to your TikTok account.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-bold text-sm border border-border">1</div>
                  <div className="space-y-2 flex-1">
                    <h4 className="font-semibold text-foreground">Register as Developer</h4>
                    <p className="text-sm text-muted-foreground">Go to the <a href="https://developers.tiktok.com/" target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center">TikTok Developer Portal <ExternalLink className="w-3 h-3 ml-1" /></a> and register.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-bold text-sm border border-border">2</div>
                  <div className="space-y-2 flex-1">
                    <h4 className="font-semibold text-foreground">Create an App</h4>
                    <p className="text-sm text-muted-foreground">Create a new app and request the "Video Kit" permission for Direct Post functionality.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-bold text-sm border border-border">3</div>
                  <div className="space-y-2 flex-1">
                    <h4 className="font-semibold text-foreground">Generate Credentials</h4>
                    <p className="text-sm text-muted-foreground">Get your Client Key and Client Secret. Format them as JSON to use when connecting your account.</p>
                    <div className="bg-secondary p-3 rounded-md border border-border font-mono text-xs mt-2 overflow-x-auto">
                      {`{"client_key": "...", "client_secret": "..."}`}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
