import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChannelList } from "@/components/channels/ChannelList";
import { ChannelView } from "@/components/channels/ChannelView";
import { MessageSquare } from "lucide-react";

interface Channel {
  id: string;
  name: string;
  description?: string;
  type: 'client' | 'vendor';
  scope: 'global' | 'project';
  projectId?: string;
  accountId?: string;
  isActive: boolean;
  createdAt: string;
}

export default function VendorChannels() {
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);

  return (
    <div className="h-[calc(100vh-4rem)] p-6">
      <div className="h-full">
        <Card className="h-full flex flex-col">
          <CardHeader className="flex-shrink-0">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-violet-600" />
              Messagerie par projet
            </CardTitle>
            <CardDescription>
              Communiquez avec vos clients pour chaque projet assigné
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 h-full">
              {/* Sidebar with channel list */}
              <div className="lg:col-span-1 border-r bg-gray-50 dark:bg-gray-900/20 overflow-y-auto p-4">
                <ChannelList
                  selectedChannelId={selectedChannel?.id}
                  onSelectChannel={setSelectedChannel}
                  endpoint="/api/vendor/channels"
                />
              </div>

              {/* Main content area */}
              <div className="lg:col-span-2 overflow-hidden">
                {selectedChannel ? (
                  <ChannelView channel={selectedChannel} />
                ) : (
                  <div className="h-full flex items-center justify-center bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20">
                    <div className="text-center text-muted-foreground p-8">
                      <div className="h-16 w-16 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mx-auto mb-4">
                        <MessageSquare className="h-8 w-8 text-violet-600" />
                      </div>
                      <p className="font-medium text-lg">Sélectionnez un projet</p>
                      <p className="text-sm mt-2">
                        Choisissez un projet dans la liste pour commencer la discussion
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
