'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useApi } from '@/hooks/useApi';
import { AppShell } from '@/components/ui/AppShell';
import { Card, EmptyState, Skeleton } from '@/components/ui/index';
import { Check, X } from 'lucide-react';

export default function InvitationsPage() {
  const { request, loading } = useApi();
  const [invitations, setInvitations] = useState<any[]>([]);

  useEffect(() => { loadInvitations(); }, []);

  const loadInvitations = async () => {
    const res = await request<any>('/api/invitations');
    if (res?.success) setInvitations(res.data);
  };

  const respond = async (invitationId: string, groupId: string, action: 'accept' | 'reject') => {
    const res = await request<any>(`/api/groups/${groupId}/invite`, {
      method: 'PATCH',
      body: { invitationId, action },
    });
    if (res?.success) {
      toast.success(action === 'accept' ? 'Joined group! 🎉' : 'Invitation declined');
      setInvitations(prev => prev.filter(inv => inv._id !== invitationId));
    }
  };

  return (
    <AppShell title="Invitations" showBack>
      <div className="px-4 pt-4 space-y-3">
        {loading && invitations.length === 0 ? (
          [0,1,2].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)
        ) : invitations.length === 0 ? (
          <EmptyState icon="📬" title="No pending invitations" description="You'll see group invites here" />
        ) : (
          invitations.map((inv: any) => (
            <motion.div key={inv._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-brand-500/15 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                    👥
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-semibold text-dark-100">
                      {inv.groupId?.name || 'Group Invitation'}
                    </p>
                    <p className="text-xs text-dark-400 mt-0.5">
                      Invited by {inv.inviterId?.name || 'Someone'}
                    </p>
                    <p className="text-xs text-dark-500 mt-1 capitalize">
                      {inv.groupId?.privacy || 'private'} group
                    </p>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => respond(inv._id, inv.groupId?._id, 'accept')}
                        className="flex-1 py-2 bg-brand-500/20 text-brand-400 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-transform border border-brand-500/30"
                      >
                        <Check size={14} /> Accept
                      </button>
                      <button
                        onClick={() => respond(inv._id, inv.groupId?._id, 'reject')}
                        className="flex-1 py-2 bg-dark-700 text-dark-400 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                      >
                        <X size={14} /> Decline
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </AppShell>
  );
}
