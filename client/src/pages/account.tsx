import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Mail, Calendar, CreditCard, Settings } from "lucide-react";

export default function Account() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-amber-950/20 to-orange-900/30 p-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center text-amber-300">Loading account information...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-amber-950/20 to-orange-900/30 p-4">
      <div className="container mx-auto max-w-4xl space-y-6">
        
        {/* Account Overview */}
        <Card className="border-amber-600/30 bg-black/40 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-300">
              <User className="w-5 h-5" />
              Account Overview
            </CardTitle>
            <CardDescription className="text-amber-200/70">
              Manage your account settings and view your corporation status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* Profile Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-200/70">Email:</span>
                  <span className="text-amber-200">{user?.email || "Not provided"}</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-200/70">Member since:</span>
                  <span className="text-amber-200">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Unknown"}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CreditCard className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-200/70">Credits:</span>
                  <Badge variant="outline" className="border-amber-600/30 text-amber-300">
                    {user?.credits || 0}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <Settings className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-200/70">Active Crawler:</span>
                  <span className="text-amber-200">
                    {user?.activeCrawlerId ? `#${user.activeCrawlerId}` : "None"}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Actions */}
        <Card className="border-amber-600/30 bg-black/40 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-amber-300">Account Actions</CardTitle>
            <CardDescription className="text-amber-200/70">
              Manage your account preferences and settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            
            <Button 
              variant="outline" 
              className="w-full border-amber-600/30 text-amber-300 hover:bg-amber-600/10"
              disabled
            >
              <Settings className="w-4 h-4 mr-2" />
              Profile Settings (Coming Soon)
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full border-amber-600/30 text-amber-300 hover:bg-amber-600/10"
              disabled
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Purchase Credits (Coming Soon)
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full border-red-600/30 text-red-300 hover:bg-red-600/10"
              onClick={() => window.location.href = "/api/logout"}
            >
              Logout
            </Button>
            
          </CardContent>
        </Card>

        {/* Corporation Status */}
        <Card className="border-amber-600/30 bg-black/40 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-amber-300">Corporation Status</CardTitle>
            <CardDescription className="text-amber-200/70">
              Current season and sponsorship information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center text-amber-200/70 py-4">
              Corporation details will be displayed here once implemented.
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}