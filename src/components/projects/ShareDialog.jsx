import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Share2, Trash2, Mail, Eye, Edit } from "lucide-react";
import { cn } from "@/lib/utils";
import { sharedAccessApi } from '@/api/collaboration';

export default function ShareDialog({ open, onOpenChange, item, itemType }) {
  const [email, setEmail] = useState('');
  const [accessLevel, setAccessLevel] = useState('view');
  const queryClient = useQueryClient();

  const { data: shares = [] } = useQuery({
    queryKey: ['shared_access', item?.id],
    queryFn: () => sharedAccessApi.list(itemType, item?.id),
    enabled: !!item?.id && !!itemType
  });

  const createShare = useMutation({
    mutationFn: (data) => sharedAccessApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared_access', item?.id] });
      setEmail('');
    }
  });

  const updateShare = useMutation({
    mutationFn: ({ id, data }) => sharedAccessApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shared_access', item?.id] })
  });

  const deleteShare = useMutation({
    mutationFn: (id) => sharedAccessApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shared_access', item?.id] })
  });

  const handleShare = () => {
    if (!email || !item?.id) return;
    createShare.mutate({
      item_id: item.id,
      item_type: itemType,
      shared_with_email: email,
      access_level: accessLevel
    });
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" style={{ fontFamily: 'Segoe UI, sans-serif' }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-indigo-600" />
            Share "{item.name}"
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
                className="h-9"
              />
            </div>
            <Select value={accessLevel} onValueChange={setAccessLevel}>
              <SelectTrigger className="w-32 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="view">
                  <div className="flex items-center gap-2">
                    <Eye className="w-3 h-3" /> Can View
                  </div>
                </SelectItem>
                <SelectItem value="edit">
                  <div className="flex items-center gap-2">
                    <Edit className="w-3 h-3" /> Can Edit
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleShare} className="bg-indigo-600 hover:bg-indigo-700">
              Share
            </Button>
          </div>

          {shares.length > 0 && (
            <div className="border-t pt-4">
              <Label className="text-xs text-slate-500 mb-2 block">People with access</Label>
              <ScrollArea className="max-h-48">
                <div className="space-y-2">
                  {shares.map(share => (
                    <div key={share.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span className="text-sm">{share.shared_with_email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select 
                          value={share.access_level} 
                          onValueChange={(v) => updateShare.mutate({ id: share.id, data: { access_level: v } })}
                        >
                          <SelectTrigger className="h-7 w-28 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="view">Can View</SelectItem>
                            <SelectItem value="edit">Can Edit</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-7 w-7 text-red-500"
                          onClick={() => deleteShare.mutate(share.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}