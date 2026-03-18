'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useApi } from '@/hooks/useApi';
import { AppShell } from '@/components/ui/AppShell';
import { Card, EmptyState, Skeleton } from '@/components/ui/index';
import { Plus, Search, Globe, Lock, ChevronRight, Copy, Check, Link } from 'lucide-react';

export default function GroupsPage() {
  const router = useRouter();
  const { request, loading } = useApi();
  const [myGroups, setMyGroups] = useState<any[]>([]);
  const [publicGroups, setPublicGroups] = useState<any[]>([]);
  const [tab, setTab] = useState<'my' | 'discover'>('my');
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    privacy: 'private' as 'private' | 'public',
    autoAccept: false,
  });
  const [inviteCode, setInviteCode] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdGroup, setCreatedGroup] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [myRes, pubRes] = await Promise.all([
      request<any>('/api/groups'),
      request<any>('/api/groups?type=public'),
    ]);
    if (myRes?.success) setMyGroups(myRes.data);
    if (pubRes?.success) setPublicGroups(pubRes.data);
  };

  const handleCreate = async () => {
    if (!createForm.name.trim()) return toast.error('Group name is required');
    setCreating(true);
    const res = await request<any>('/api/groups', {
      method: 'POST',
      body: createForm,
    });
    if (res?.success) {
      setCreatedGroup(res.data);
      setCreateForm({ name: '', description: '', privacy: 'private', autoAccept: false });
      loadData();
    }
    setCreating(false);
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) return toast.error('Enter an invite code');
    const res = await request<any>('/api/groups/join', {
      method: 'POST',
      body: { inviteCode },
    });
    if (res?.success) {
      toast.success(res.message);
      setShowJoin(false);
      setInviteCode('');
      loadData();
    }
  };

  const handleJoinPublic = async (groupId: string) => {
    const res = await request<any>('/api/groups/join', {
      method: 'POST',
      body: { groupId },
    });
    if (res?.success) {
      toast.success(res.message);
      loadData();
    }
  };

  const filteredPublic = publicGroups.filter((g) =>
    g.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInviteLink = (code: string) =>
    `${typeof window !== 'undefined' ? window.location.origin : ''}/join/${code}`;

  return (
    <AppShell
      title="Groups"
      rightAction={
        <button
          onClick={() => { setShowCreate(true); setCreatedGroup(null); }}
          className="w-9 h-9 bg-brand-500/20 rounded-xl flex items-center justify-center text-brand-400 active:scale-95 transition-transform"
        >
          <Plus size={18} />
        </button>
      }
    >
      <div className="px-4 pt-4 space-y-4 pb-6">
        {/* Tabs */}
        <div className="flex gap-2 bg-dark-800 p-1 rounded-xl">
          {(['my', 'discover'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-lg font-display font-semibold text-sm transition-all ${
                t === tab ? 'bg-brand-500 text-white' : 'text-dark-400'
              }`}
            >
              {t === 'my' ? 'My Groups' : 'Discover'}
            </button>
          ))}
        </div>

        {/* MY GROUPS TAB */}
        {tab === 'my' && (
          <div className="space-y-3">
            <button
              onClick={() => setShowJoin(true)}
              className="w-full p-3 border border-dashed border-dark-600 rounded-xl flex items-center gap-2 text-dark-400 hover:border-brand-500/40 hover:text-brand-400 transition-colors"
            >
              <Search size={16} />
              <span className="text-sm">Join via invite code</span>
            </button>

            {loading && myGroups.length === 0 ? (
              [0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
            ) : myGroups.length === 0 ? (
              <EmptyState
                icon="👥"
                title="No groups yet"
                description="Create a group or join one with an invite code"
                action={
                  <button
                    onClick={() => { setShowCreate(true); setCreatedGroup(null); }}
                    className="bg-brand-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm"
                  >
                    Create Group
                  </button>
                }
              />
            ) : (
              myGroups.map((g: any) => (
                <GroupCard
                  key={g._id}
                  group={g}
                  onClick={() => router.push(`/groups/${g._id}`)}
                  getInviteLink={getInviteLink}
                />
              ))
            )}
          </div>
        )}

        {/* DISCOVER TAB */}
        {tab === 'discover' && (
          <div className="space-y-3">
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-500" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search public groups..."
                className="w-full bg-dark-800 border border-dark-600 rounded-xl pl-10 pr-4 py-3 text-dark-50 placeholder-dark-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            {filteredPublic.length === 0 ? (
              <EmptyState icon="🔍" title="No public groups found" />
            ) : (
              filteredPublic.map((g: any) => (
                <Card key={g._id} className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-brand-500/15 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                    👥
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-semibold text-dark-100">{g.name}</p>
                    <p className="text-xs text-dark-400 mt-0.5 line-clamp-1">
                      {g.description || 'Public group'}
                    </p>
                    <p className="text-xs text-dark-500 mt-0.5">{g.totalWorkouts || 0} workouts</p>
                  </div>
                  <button
                    onClick={() => handleJoinPublic(g._id)}
                    className="px-3 py-1.5 bg-brand-500/20 border border-brand-500/30 text-brand-400 rounded-lg text-xs font-semibold active:scale-95 transition-transform"
                  >
                    Join
                  </button>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      {/* ===== CREATE GROUP MODAL ===== */}
      <AnimatePresence>
        {showCreate && (
          <Modal
            title={createdGroup ? '🎉 Group Created!' : 'Create Group'}
            onClose={() => { setShowCreate(false); setCreatedGroup(null); }}
          >
            {!createdGroup ? (
              /* ---- CREATION FORM ---- */
              <div className="space-y-5">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Group Name <span className="text-brand-400">*</span>
                  </label>
                  <input
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder="My Fitness Squad"
                    className="w-full bg-dark-700 border border-dark-600 rounded-xl px-4 py-3.5 text-dark-50 placeholder-dark-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Description <span className="text-dark-500 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    placeholder="What's this group about?"
                    rows={3}
                    className="w-full bg-dark-700 border border-dark-600 rounded-xl px-4 py-3 text-dark-50 placeholder-dark-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors resize-none"
                  />
                </div>

                {/* Privacy */}
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Privacy</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setCreateForm({ ...createForm, privacy: 'private' })}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        createForm.privacy === 'private'
                          ? 'bg-brand-500/15 border-brand-500 text-brand-300'
                          : 'bg-dark-700 border-dark-600 text-dark-400'
                      }`}
                    >
                      <Lock size={22} />
                      <span className="font-semibold text-sm">Private</span>
                      <span className="text-[10px] text-center leading-tight opacity-70">
                        Invite only. Hidden from public.
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreateForm({ ...createForm, privacy: 'public' })}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        createForm.privacy === 'public'
                          ? 'bg-brand-500/15 border-brand-500 text-brand-300'
                          : 'bg-dark-700 border-dark-600 text-dark-400'
                      }`}
                    >
                      <Globe size={22} />
                      <span className="font-semibold text-sm">Public</span>
                      <span className="text-[10px] text-center leading-tight opacity-70">
                        Listed in directory. Anyone can request.
                      </span>
                    </button>
                  </div>
                </div>

                {/* Auto-accept — only for public */}
                {createForm.privacy === 'public' && (
                  <div
                    className="flex items-center justify-between p-4 bg-dark-700 rounded-xl cursor-pointer border border-dark-600"
                    onClick={() => setCreateForm({ ...createForm, autoAccept: !createForm.autoAccept })}
                  >
                    <div className="flex-1 pr-4">
                      <p className="text-sm font-medium text-dark-200">Auto-accept members</p>
                      <p className="text-xs text-dark-500 mt-0.5">Members join instantly without approval</p>
                    </div>
                    <div className={`w-12 h-6 rounded-full transition-colors flex-shrink-0 relative ${createForm.autoAccept ? 'bg-brand-500' : 'bg-dark-500'}`}>
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${createForm.autoAccept ? 'translate-x-6' : 'translate-x-0.5'}`} />
                    </div>
                  </div>
                )}

                {/* CREATE BUTTON — always visible, large and clear */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={creating || !createForm.name.trim()}
                    className="w-full py-4 bg-gradient-to-r from-brand-500 to-brand-600 text-white font-display font-bold rounded-2xl text-base disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20"
                  >
                    {creating ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        {createForm.privacy === 'private' ? <Lock size={18} /> : <Globe size={18} />}
                        Create {createForm.privacy === 'private' ? 'Private' : 'Public'} Group
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* ---- SUCCESS SCREEN WITH AUTO INVITE LINK ---- */
              <div className="space-y-5">
                {/* Group info */}
                <div className="bg-dark-700 rounded-2xl p-4 text-center">
                  <div className="w-16 h-16 bg-brand-500/20 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3">
                    👥
                  </div>
                  <h3 className="font-display text-xl font-bold text-dark-50">{createdGroup.name}</h3>
                  <span className={`inline-flex items-center gap-1 mt-1 text-xs px-2 py-1 rounded-full font-semibold ${
                    createdGroup.privacy === 'public'
                      ? 'bg-green-500/15 text-green-400'
                      : 'bg-dark-600 text-dark-400'
                  }`}>
                    {createdGroup.privacy === 'public' ? <Globe size={10} /> : <Lock size={10} />}
                    {createdGroup.privacy}
                  </span>
                </div>

                {/* Invite Code */}
                <div>
                  <p className="text-sm font-medium text-dark-300 mb-2">Invite Code</p>
                  <InviteCopyBox value={createdGroup.inviteCode} label="Code" />
                </div>

                {/* Invite Link — auto generated */}
                <div>
                  <p className="text-sm font-medium text-dark-300 mb-2 flex items-center gap-1.5">
                    <Link size={14} className="text-brand-400" />
                    Invite Link <span className="text-[10px] text-brand-400 bg-brand-500/10 px-1.5 py-0.5 rounded-full">Auto-generated</span>
                  </p>
                  <InviteCopyBox value={getInviteLink(createdGroup.inviteCode)} label="Link" />
                </div>

                {/* Share to WhatsApp */}
                <button
                  onClick={() => {
                    const text = `Join my fitness group "${createdGroup.name}" on FitTrack!\n\nUse invite code: *${createdGroup.inviteCode}*\nOr click this link: ${getInviteLink(createdGroup.inviteCode)}`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                  }}
                  className="w-full py-3.5 bg-green-600/20 border border-green-500/30 rounded-xl font-semibold text-green-400 flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                  📲 Share Invite on WhatsApp
                </button>

                {/* Go to group */}
                <button
                  onClick={() => {
                    setShowCreate(false);
                    setCreatedGroup(null);
                    router.push(`/groups/${createdGroup._id}`);
                  }}
                  className="w-full py-4 bg-gradient-to-r from-brand-500 to-brand-600 text-white font-display font-bold rounded-2xl text-base active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20"
                >
                  Go to Group →
                </button>

                <button
                  onClick={() => { setShowCreate(false); setCreatedGroup(null); }}
                  className="w-full py-3 text-dark-400 text-sm"
                >
                  Close
                </button>
              </div>
            )}
          </Modal>
        )}
      </AnimatePresence>

      {/* ===== JOIN BY CODE MODAL ===== */}
      <AnimatePresence>
        {showJoin && (
          <Modal title="Join a Group" onClose={() => setShowJoin(false)}>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Enter Invite Code
                </label>
                <input
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="e.g. ABC12345"
                  className="w-full bg-dark-700 border border-dark-600 rounded-xl px-4 py-4 text-dark-50 placeholder-dark-500 focus:outline-none focus:border-brand-500 font-mono text-2xl tracking-widest text-center uppercase"
                  maxLength={8}
                  autoFocus
                />
                <p className="text-xs text-dark-500 mt-2 text-center">
                  Ask your group admin for the 8-character invite code
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleJoin}
                  disabled={loading || inviteCode.trim().length < 6}
                  className="w-full py-4 bg-gradient-to-r from-brand-500 to-brand-600 text-white font-display font-bold rounded-2xl text-base disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all shadow-lg shadow-brand-500/20"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Joining...
                    </span>
                  ) : (
                    'Join Group'
                  )}
                </button>
              </div>

              <button
                onClick={() => setShowJoin(false)}
                className="w-full py-3 text-dark-400 text-sm text-center"
              >
                Cancel
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </AppShell>
  );
}

// ===== INVITE COPY BOX =====
function InviteCopyBox({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success(`${label} copied!`);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="flex items-center gap-2 bg-dark-700 border border-dark-600 rounded-xl px-4 py-3">
      <p className="flex-1 text-sm text-dark-200 font-mono break-all leading-snug">{value}</p>
      <button
        onClick={copy}
        className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
          copied
            ? 'bg-green-500/20 text-green-400'
            : 'bg-brand-500/20 text-brand-400 active:scale-95'
        }`}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

// ===== GROUP CARD =====
function GroupCard({
  group,
  onClick,
  getInviteLink,
}: {
  group: any;
  onClick: () => void;
  getInviteLink: (code: string) => string;
}) {
  const [copied, setCopied] = useState(false);

  const copyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(getInviteLink(group.inviteCode));
    setCopied(true);
    toast.success('Invite link copied!');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Card onClick={onClick} className="cursor-pointer">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-brand-400/20 to-brand-600/20 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
          👥
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-display font-semibold text-dark-100">{group.name}</p>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
                group.privacy === 'public'
                  ? 'bg-green-500/15 text-green-400'
                  : 'bg-dark-600 text-dark-400'
              }`}
            >
              {group.privacy === 'public' ? '🌐 Public' : '🔒 Private'}
            </span>
          </div>
          <p className="text-xs text-dark-400 mt-0.5">
            {group.members?.length || 0} members · {group.totalWorkouts || 0} workouts
          </p>
          {/* Auto invite link copy button */}
          {group.inviteCode && (
            <button
              onClick={copyLink}
              className="mt-2 inline-flex items-center gap-1.5 text-[11px] bg-dark-700 px-2.5 py-1.5 rounded-lg text-dark-400 hover:text-brand-400 hover:bg-dark-600 transition-colors"
            >
              {copied ? <Check size={11} className="text-green-400" /> : <Link size={11} />}
              {copied ? 'Link copied!' : 'Copy invite link'}
            </button>
          )}
        </div>
        <ChevronRight size={16} className="text-dark-600 flex-shrink-0 mt-1" />
      </div>
    </Card>
  );
}

// ===== MODAL =====
function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="w-full max-w-lg bg-dark-900 border-t border-dark-700 rounded-t-3xl"
        style={{ maxHeight: '92vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-dark-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-800">
          <h3 className="font-display text-xl font-bold text-dark-50">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-dark-700 rounded-full flex items-center justify-center text-dark-300 hover:text-dark-50 transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* Scrollable content — padding bottom ensures buttons never get cut off */}
        <div className="overflow-y-auto px-6 py-5" style={{ maxHeight: 'calc(92vh - 80px)', paddingBottom: '2rem' }}>
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}