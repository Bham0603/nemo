"use client";

import { create } from "zustand";
import {
  aiPreferences as seedAi,
  chats as seedChats,
  conceptEdges as seedEdges,
  conceptNodes as seedNodes,
  contextGroups as seedGroups,
  emailIntegration as seedEmail,
  meetingPreps as seedMeetings,
  memoryItems as seedMemory,
  memoryPreferences as seedMemoryPrefs,
  notes as seedNotes,
  privacyPreferences as seedPrivacy,
  researchRuns as seedResearch,
  searchHistory as seedHistory,
  sources as seedSources,
  userProfile as seedProfile,
} from "./seed";
import type {
  AiPreferences,
  Chat,
  ConceptEdge,
  ConceptNode,
  ContextGroup,
  EmailIntegration,
  MeetingPrep,
  MemoryApproval,
  MemoryCategory,
  MemoryItem,
  MemoryPreferences,
  Message,
  Note,
  PrivacyPreferences,
  ResearchRun,
  SearchHistoryEntry,
  Source,
  UserProfile,
  ViewId,
} from "./types";

interface State {
  /* navigation */
  view: ViewId;
  setView: (v: ViewId) => void;

  /* sources / library */
  sources: Source[];
  setSources: (s: Source[]) => void;
  addSources: (s: Source[]) => void;
  removeSource: (id: string) => void;
  removeSources: (ids: string[]) => void;

  /* context groups (chats sidebar) */
  groups: ContextGroup[];
  toggleGroup: (id: string) => void;
  addGroupItem: (groupId: string, label: string) => void;
  removeGroupItem: (groupId: string, itemId: string) => void;

  /* chats */
  chats: Chat[];
  activeChatId: string;
  setActiveChat: (id: string) => void;
  setChatMode: (id: string, mode: Chat["mode"]) => void;
  toggleSelectedSource: (chatId: string, sourceId: string) => void;
  appendMessage: (chatId: string, m: Message) => void;
  updateMessage: (chatId: string, id: string, patch: Partial<Message>) => void;
  newChat: () => string;

  /* notes */
  notes: Note[];
  setNotes: (n: Note[]) => void;
  addNote: (n: Note) => void;
  updateNote: (id: string, patch: Partial<Note>) => void;
  deleteNote: (id: string) => void;

  /* memory */
  memory: MemoryItem[];
  addMemory: (m: MemoryItem) => void;
  updateMemory: (id: string, patch: Partial<MemoryItem>) => void;
  deleteMemory: (id: string) => void;
  setMemoryApproval: (id: string, approval: MemoryApproval) => void;
  toggleMemory: (id: string) => void;

  /* connections */
  nodes: ConceptNode[];
  edges: ConceptEdge[];
  selectedNodeId: string | null;
  setSelectedNode: (id: string | null) => void;

  /* search */
  searchHistory: SearchHistoryEntry[];
  pushSearchHistory: (query: string, resultCount: number) => void;
  clearSearchHistory: () => void;

  /* settings */
  profile: UserProfile;
  updateProfile: (patch: Partial<UserProfile>) => void;
  aiPrefs: AiPreferences;
  updateAiPrefs: (patch: Partial<AiPreferences>) => void;
  memoryPrefs: MemoryPreferences;
  updateMemoryPrefs: (patch: Partial<MemoryPreferences>) => void;
  privacyPrefs: PrivacyPreferences;
  updatePrivacyPrefs: (patch: Partial<PrivacyPreferences>) => void;

  /* integrations */
  email: EmailIntegration;
  updateEmail: (patch: Partial<EmailIntegration>) => void;
  research: ResearchRun[];
  addResearch: (r: ResearchRun) => void;
  toggleResearchSaved: (id: string) => void;
  meetings: MeetingPrep[];
  addMeeting: (m: MeetingPrep) => void;
  updateMeeting: (id: string, patch: Partial<MeetingPrep>) => void;
  deleteMeeting: (id: string) => void;

  /* command palette */
  commandOpen: boolean;
  setCommandOpen: (v: boolean) => void;

  /* responsive navigation */
  mobileNavOpen: boolean;
  setMobileNavOpen: (v: boolean) => void;
  toggleMobileNav: () => void;
  contextPanelOpen: boolean;
  setContextPanelOpen: (v: boolean) => void;
  toggleContextPanel: () => void;
}

const nowIso = () => new Date().toISOString();

export const useRecall = create<State>((set) => ({
  view: "chats",
  setView: (v) => set({ view: v }),

  sources: seedSources,
  setSources: (s) => set({ sources: s }),
  addSources: (s) => set((st) => ({ sources: [...s, ...st.sources] })),
  removeSource: (id) =>
    set((st) => ({ sources: st.sources.filter((x) => x.id !== id) })),
  removeSources: (ids) =>
    set((st) => ({
      sources: st.sources.filter((x) => !ids.includes(x.id)),
    })),

  groups: seedGroups,
  toggleGroup: (id) =>
    set((st) => ({
      groups: st.groups.map((g) =>
        g.id === id ? { ...g, expanded: !g.expanded } : g,
      ),
    })),
  addGroupItem: (groupId, label) =>
    set((st) => ({
      groups: st.groups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              expanded: true,
              items: [...g.items, { id: `item_${Date.now()}`, label }],
            }
          : g,
      ),
    })),
  removeGroupItem: (groupId, itemId) =>
    set((st) => ({
      groups: st.groups.map((g) =>
        g.id === groupId
          ? { ...g, items: g.items.filter((i) => i.id !== itemId) }
          : g,
      ),
    })),

  chats: seedChats,
  activeChatId: seedChats[0].id,
  setActiveChat: (id) => set({ activeChatId: id, view: "chats" }),
  setChatMode: (id, mode) =>
    set((st) => ({
      chats: st.chats.map((c) => (c.id === id ? { ...c, mode } : c)),
    })),
  toggleSelectedSource: (chatId, sourceId) =>
    set((st) => ({
      chats: st.chats.map((c) => {
        if (c.id !== chatId) return c;
        const has = c.selectedSourceIds.includes(sourceId);
        return {
          ...c,
          selectedSourceIds: has
            ? c.selectedSourceIds.filter((s) => s !== sourceId)
            : [...c.selectedSourceIds, sourceId],
        };
      }),
    })),
  appendMessage: (chatId, m) =>
    set((st) => ({
      chats: st.chats.map((c) =>
        c.id === chatId
          ? { ...c, messages: [...c.messages, m], updatedAt: nowIso() }
          : c,
      ),
    })),
  updateMessage: (chatId, id, patch) =>
    set((st) => ({
      chats: st.chats.map((c) =>
        c.id === chatId
          ? {
              ...c,
              messages: c.messages.map((m) =>
                m.id === id ? { ...m, ...patch } : m,
              ),
            }
          : c,
      ),
    })),
  newChat: () => {
    const id = `chat_${Date.now()}`;
    const chat: Chat = {
      id,
      title: "New context chat",
      subtitle: "Select sources and ask questions grounded in them",
      mode: "context",
      selectedSourceIds: [],
      messages: [],
      updatedAt: nowIso(),
    };
    set((st) => ({ chats: [chat, ...st.chats], activeChatId: id }));
    return id;
  },

  notes: seedNotes,
  setNotes: (n) => set({ notes: n }),
  addNote: (n) => set((st) => ({ notes: [n, ...st.notes] })),
  updateNote: (id, patch) =>
    set((st) => ({
      notes: st.notes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
    })),
  deleteNote: (id) =>
    set((st) => ({ notes: st.notes.filter((n) => n.id !== id) })),

  memory: seedMemory,
  addMemory: (m) => set((st) => ({ memory: [m, ...st.memory] })),
  updateMemory: (id, patch) =>
    set((st) => ({
      memory: st.memory.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    })),
  deleteMemory: (id) =>
    set((st) => ({ memory: st.memory.filter((m) => m.id !== id) })),
  setMemoryApproval: (id, approval) =>
    set((st) => ({
      memory: st.memory.map((m) =>
        m.id === id
          ? { ...m, approval, enabled: approval === "approved" }
          : m,
      ),
    })),
  toggleMemory: (id) =>
    set((st) => ({
      memory: st.memory.map((m) =>
        m.id === id ? { ...m, enabled: !m.enabled } : m,
      ),
    })),

  nodes: seedNodes,
  edges: seedEdges,
  selectedNodeId: null,
  setSelectedNode: (id) => set({ selectedNodeId: id }),

  searchHistory: seedHistory,
  pushSearchHistory: (query, resultCount) =>
    set((st) => {
      const trimmed = query.trim();
      if (!trimmed) return st;
      const withoutDup = st.searchHistory.filter(
        (h) => h.query.toLowerCase() !== trimmed.toLowerCase(),
      );
      return {
        searchHistory: [
          {
            id: `sh_${Date.now()}`,
            query: trimmed,
            at: nowIso(),
            resultCount,
          },
          ...withoutDup,
        ].slice(0, 12),
      };
    }),
  clearSearchHistory: () => set({ searchHistory: [] }),

  profile: seedProfile,
  updateProfile: (patch) =>
    set((st) => ({ profile: { ...st.profile, ...patch } })),
  aiPrefs: seedAi,
  updateAiPrefs: (patch) =>
    set((st) => ({ aiPrefs: { ...st.aiPrefs, ...patch } })),
  memoryPrefs: seedMemoryPrefs,
  updateMemoryPrefs: (patch) =>
    set((st) => ({ memoryPrefs: { ...st.memoryPrefs, ...patch } })),
  privacyPrefs: seedPrivacy,
  updatePrivacyPrefs: (patch) =>
    set((st) => ({ privacyPrefs: { ...st.privacyPrefs, ...patch } })),

  email: seedEmail,
  updateEmail: (patch) => set((st) => ({ email: { ...st.email, ...patch } })),
  research: seedResearch,
  addResearch: (r) => set((st) => ({ research: [r, ...st.research] })),
  toggleResearchSaved: (id) =>
    set((st) => ({
      research: st.research.map((r) =>
        r.id === id ? { ...r, saved: !r.saved } : r,
      ),
    })),
  meetings: seedMeetings,
  addMeeting: (m) => set((st) => ({ meetings: [m, ...st.meetings] })),
  updateMeeting: (id, patch) =>
    set((st) => ({
      meetings: st.meetings.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    })),
  deleteMeeting: (id) =>
    set((st) => ({ meetings: st.meetings.filter((m) => m.id !== id) })),

  commandOpen: false,
  setCommandOpen: (v) => set({ commandOpen: v }),

  mobileNavOpen: false,
  setMobileNavOpen: (v) => set({ mobileNavOpen: v }),
  toggleMobileNav: () => set((st) => ({ mobileNavOpen: !st.mobileNavOpen })),
  contextPanelOpen: true,
  setContextPanelOpen: (v) => set({ contextPanelOpen: v }),
  toggleContextPanel: () =>
    set((st) => ({ contextPanelOpen: !st.contextPanelOpen })),
}));

export const useActiveChat = () => {
  const { chats, activeChatId } = useRecall();
  return chats.find((c) => c.id === activeChatId) ?? chats[0];
};

export const memoryCategoryLabel: Record<MemoryCategory, string> = {
  preference: "Preferences",
  interest: "Interests",
  project: "Projects",
  fact: "Important facts",
  goal: "Learning goals",
  custom: "Custom",
};
