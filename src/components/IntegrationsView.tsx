"use client";

import {
  Check,
  Clock,
  Link2,
  Mail,
  Shield,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { cn, formatDate } from "@/lib/utils";
import { useRecall } from "@/lib/store";
import {
  Badge,
  Button,
  Dialog,
  EmptyState,
  PageHeader,
  SectionCard,
} from "@/components/ui";

export function EmailView() {
  const email = useRecall((s) => s.email);
  const updateEmail = useRecall((s) => s.updateEmail);
  const profile = useRecall((s) => s.profile);
  const [connectOpen, setConnectOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const connected = email.status === "connected";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        breadcrumbs={["Integrations", "Email"]}
        title="Email"
        description="Save threads as sources and cite them like any other document. No external account is connected in this phase."
        actions={
          <Badge tone="outline">
            <Sparkles className="h-2.5 w-2.5" /> coming soon
          </Badge>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-7 pb-8 scroll-thin">
        {notice && (
          <div className="mb-3 rounded-lg border border-white/12 bg-white/[0.06] px-3 py-2 text-[11.5px] text-ink/85">
            {notice}
          </div>
        )}

        <div className="space-y-3">
          <SectionCard
            title="Connection status"
            description="Recall reads nothing until you grant access."
            actions={
              <span
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2 py-1 text-[10.5px] font-medium",
                  connected
                    ? "bg-white/[0.09] text-ink/85"
                    : "border border-white/12 text-faint",
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    connected ? "bg-white" : "bg-white/30",
                  )}
                />
                {connected ? "Connected" : "Not connected"}
              </span>
            }
          >
            <div className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/[0.08]">
                <Mail className="h-4 w-4 text-muted" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-medium">
                  {connected ? email.account : "No mailbox linked"}
                </p>
                <p className="text-[11px] text-faint">
                  {connected && email.lastSync
                    ? `Last sync ${formatDate(email.lastSync)}`
                    : "Connect a mailbox to pull threads into your library."}
                </p>
              </div>
              {connected ? (
                <Button
                  onClick={() => {
                    updateEmail({
                      status: "disconnected",
                      account: "",
                      lastSync: "",
                    });
                    setNotice("Mailbox disconnected (frontend only).");
                  }}
                >
                  Disconnect
                </Button>
              ) : (
                <Button variant="primary" onClick={() => setConnectOpen(true)}>
                  <Link2 className="h-3.5 w-3.5" /> Connect
                </Button>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Permissions"
            description="Each permission is requested separately, and each can be revoked."
          >
            <div className="space-y-2">
              {email.permissions.map((p) => (
                <div
                  key={p.label}
                  className="flex items-start justify-between gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-[12px] text-ink/90">{p.label}</p>
                    <p className="text-[11px] leading-relaxed text-faint">
                      {p.detail}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded px-1.5 py-px text-[9.5px] font-medium uppercase tracking-wide",
                      p.granted
                        ? "bg-white/[0.09] text-muted"
                        : "border border-white/10 text-faint",
                    )}
                  >
                    {p.granted ? "granted" : "not granted"}
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="What this would do"
            description="Planned behaviour once the integration ships."
          >
            <ul className="space-y-1.5">
              {[
                "Save a thread as a source, with the message body as the excerpt.",
                "Cite the sender and timestamp alongside the passage.",
                "Draft replies only when you explicitly ask.",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-faint" />
                  <span className="text-[11.5px] leading-relaxed text-muted">
                    {t}
                  </span>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      </div>

      <Dialog
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
        title="Connect a mailbox"
        description="This is a placeholder flow. No OAuth handshake happens and no credentials are stored."
        footer={
          <>
            <Button onClick={() => setConnectOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                updateEmail({
                  status: "connected",
                  account: profile.email || "alex.chen@recall.app",
                  lastSync: new Date().toISOString().slice(0, 10),
                  permissions: email.permissions.map((p) => ({
                    ...p,
                    granted: true,
                  })),
                });
                setConnectOpen(false);
                setNotice(
                  "Mailbox marked connected for demonstration. No account was linked.",
                );
              }}
            >
              <Shield className="h-3.5 w-3.5" /> Simulate connection
            </Button>
          </>
        }
      >
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <p className="text-[11.5px] leading-relaxed text-muted">
            In a real build this opens your provider&apos;s consent screen and
            returns a scoped token. Nothing of the sort is implemented here.
          </p>
        </div>
      </Dialog>
    </div>
  );
}

export function ResearchView() {
  const research = useRecall((s) => s.research);
  const addResearch = useRecall((s) => s.addResearch);
  const toggleSaved = useRecall((s) => s.toggleResearchSaved);

  const [topic, setTopic] = useState("");
  const [activeId, setActiveId] = useState(research[0]?.id ?? "");
  const [notice, setNotice] = useState<string | null>(null);

  const active = research.find((r) => r.id === activeId) ?? research[0] ?? null;

  const run = () => {
    const trimmed = topic.trim();
    if (!trimmed) return;
    const id = `res_${Date.now()}`;
    addResearch({
      id,
      topic: trimmed,
      at: new Date().toISOString(),
      status: "complete",
      saved: false,
      summary:
        "This is a placeholder result. No search was performed and no sources were retrieved — the research engine arrives in a later phase.",
      sources: [],
    });
    setActiveId(id);
    setTopic("");
    setNotice("Added a placeholder run. No research was actually performed.");
  };

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        <PageHeader
          breadcrumbs={["Integrations", "Smart research"]}
          title="Smart research"
          description="Ask a question, get a structured brief with sources. Placeholder results only in this phase."
          actions={
            <Badge tone="outline">
              <Sparkles className="h-2.5 w-2.5" /> coming soon
            </Badge>
          }
        />

        <div className="px-7 pb-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run();
            }}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 transition focus-within:border-white/25"
          >
            <Sparkles className="h-4 w-4 shrink-0 text-faint" />
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What do you want researched?"
              className="w-full bg-transparent text-[13px] placeholder:text-faint focus:outline-none"
            />
            <Button type="submit" variant="primary" size="sm" disabled={!topic.trim()}>
              Research
            </Button>
          </form>
          {notice && (
            <p className="mt-2 text-[11px] text-faint">{notice}</p>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-7 pb-6 scroll-thin">
          {research.length === 0 ? (
            <EmptyState
              icon={<Sparkles className="h-6 w-6" />}
              title="No research runs yet"
              description="Enter a topic above to create one."
            />
          ) : (
            <div className="grid gap-3 lg:grid-cols-[280px_1fr]">
              {/* History */}
              <div>
                <p className="mb-2 text-[10.5px] uppercase tracking-[0.08em] text-faint">
                  Research history
                </p>
                <div className="space-y-1">
                  {research.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setActiveId(r.id)}
                      className={cn(
                        "w-full rounded-lg px-2.5 py-2 text-left transition",
                        active?.id === r.id
                          ? "bg-white/[0.09]"
                          : "hover:bg-white/[0.05]",
                      )}
                    >
                      <p className="line-clamp-2 text-[12px] text-ink/90">
                        {r.topic}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-faint">
                        <Clock className="h-2.5 w-2.5" />
                        {formatDate(r.at)}
                        {r.saved && " · saved"}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Result layout */}
              <div>
                {active && (
                  <div className="rounded-xl border border-white/[0.07] bg-black/35 p-4 backdrop-blur-md">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-[13.5px] font-semibold leading-snug">
                        {active.topic}
                      </h2>
                      <Button
                        size="sm"
                        onClick={() => toggleSaved(active.id)}
                      >
                        {active.saved ? "Saved" : "Save research"}
                      </Button>
                    </div>

                    <p className="mt-2.5 text-[12px] leading-relaxed text-muted">
                      {active.summary}
                    </p>

                    <div className="mt-4">
                      <p className="text-[10.5px] uppercase tracking-[0.08em] text-faint">
                        Sources ({active.sources.length})
                      </p>
                      {active.sources.length === 0 ? (
                        <p className="mt-1.5 rounded-lg border border-dashed border-white/12 px-3 py-4 text-center text-[11.5px] text-faint">
                          No sources retrieved. This run is a placeholder.
                        </p>
                      ) : (
                        <div className="mt-1.5 space-y-1.5">
                          {active.sources.map((s) => (
                            <div
                              key={s.id}
                              className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                            >
                              <div className="flex items-center gap-2">
                                <p className="min-w-0 flex-1 truncate text-[12px] text-ink/90">
                                  {s.title}
                                </p>
                                <Badge tone="muted">{s.kind}</Badge>
                              </div>
                              <p className="mt-0.5 text-[10.5px] text-faint">
                                {s.domain}
                              </p>
                              <p className="mt-1 text-[11.5px] leading-relaxed text-muted">
                                {s.snippet}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function MeetingView() {
  const meetings = useRecall((s) => s.meetings);
  const addMeeting = useRecall((s) => s.addMeeting);
  const updateMeeting = useRecall((s) => s.updateMeeting);
  const deleteMeeting = useRecall((s) => s.deleteMeeting);
  const sources = useRecall((s) => s.sources);

  const [activeId, setActiveId] = useState(meetings[0]?.id ?? "");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const active = meetings.find((m) => m.id === activeId) ?? meetings[0] ?? null;

  const create = () => {
    const id = `mtg_${Date.now()}`;
    addMeeting({
      id,
      title: "Untitled meeting",
      date: new Date().toISOString().slice(0, 10),
      time: "10:00",
      participants: [],
      notes: "",
      suggestedSourceIds: [],
      status: "draft",
    });
    setActiveId(id);
  };

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex w-[280px] shrink-0 flex-col border-r border-white/[0.06] bg-black/20 backdrop-blur-xl">
        <div className="flex items-center justify-between px-5 pb-3 pt-6">
          <div>
            <h1 className="text-[15px] font-semibold">Meeting prep</h1>
            <p className="text-[11.5px] text-faint">
              {meetings.length} meeting{meetings.length === 1 ? "" : "s"}
            </p>
          </div>
          <Button size="sm" onClick={create} title="New meeting prep">
            +
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 scroll-thin">
          {meetings.length === 0 ? (
            <EmptyState title="No meetings" description="Create one to prep." />
          ) : (
            meetings.map((m) => (
              <button
                key={m.id}
                onClick={() => setActiveId(m.id)}
                className={cn(
                  "mb-0.5 w-full rounded-lg px-2.5 py-2 text-left transition",
                  active?.id === m.id
                    ? "bg-white/[0.09]"
                    : "hover:bg-white/[0.05]",
                )}
              >
                <p className="truncate text-[12.5px] font-medium">{m.title}</p>
                <p className="mt-0.5 text-[11px] text-faint">
                  {formatDate(m.date)} · {m.time}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <PageHeader
          breadcrumbs={["Integrations", "Meeting prep"]}
          title={active ? active.title : "Meeting prep"}
          description="Notes, participants, and the sources worth bringing. Nothing syncs to a calendar in this phase."
          actions={
            <Badge tone="outline">
              <Sparkles className="h-2.5 w-2.5" /> coming soon
            </Badge>
          }
        />

        {active ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-7 pb-8 scroll-thin">
            <div className="space-y-3">
              <SectionCard title="Details">
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-[11px] text-faint">Title</span>
                    <input
                      value={active.title}
                      onChange={(e) =>
                        updateMeeting(active.id, { title: e.target.value })
                      }
                      className="mt-0.5 w-full rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[12.5px] focus:border-white/25 focus:outline-none"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <label className="block">
                      <span className="text-[11px] text-faint">Date</span>
                      <input
                        type="date"
                        value={active.date}
                        onChange={(e) =>
                          updateMeeting(active.id, { date: e.target.value })
                        }
                        className="mt-0.5 w-full rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[12.5px] focus:border-white/25 focus:outline-none"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[11px] text-faint">Time</span>
                      <input
                        type="time"
                        value={active.time}
                        onChange={(e) =>
                          updateMeeting(active.id, { time: e.target.value })
                        }
                        className="mt-0.5 w-full rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[12.5px] focus:border-white/25 focus:outline-none"
                      />
                    </label>
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Participants"
                description={`${active.participants.length} invited`}
              >
                <div className="flex flex-wrap gap-1.5">
                  {active.participants.map((p) => (
                    <span
                      key={p.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[11.5px] text-ink/85"
                    >
                      <span className="grid h-4 w-4 place-items-center rounded-full bg-white/[0.12] text-[8px] font-semibold">
                        {p.name
                          .split(" ")
                          .map((x) => x[0])
                          .slice(0, 2)
                          .join("")}
                      </span>
                      {p.name}
                      <span className="text-faint">· {p.role}</span>
                    </span>
                  ))}
                  {active.participants.length === 0 && (
                    <p className="text-[11.5px] text-faint">
                      No participants added.
                    </p>
                  )}
                </div>
              </SectionCard>

              <SectionCard title="Preparation notes">
                <textarea
                  value={active.notes}
                  onChange={(e) =>
                    updateMeeting(active.id, { notes: e.target.value })
                  }
                  rows={5}
                  placeholder="What is the decision this meeting needs to make?"
                  className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2 text-[12.5px] leading-relaxed placeholder:text-faint focus:border-white/25 focus:outline-none"
                />
              </SectionCard>

              <SectionCard
                title="Relevant documents"
                description="Sources worth having open during this conversation."
              >
                <div className="space-y-1">
                  {active.suggestedSourceIds.map((id) => {
                    const src = sources.find((s) => s.id === id);
                    if (!src) return null;
                    return (
                      <div
                        key={id}
                        className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5"
                      >
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/50" />
                        <p className="min-w-0 flex-1 truncate text-[11.5px] text-ink/85">
                          {src.title}
                        </p>
                        <span className="shrink-0 text-[10px] text-faint">
                          {src.collection}
                        </span>
                      </div>
                    );
                  })}
                  {active.suggestedSourceIds.length === 0 && (
                    <p className="text-[11.5px] text-faint">
                      No suggestions yet.
                    </p>
                  )}
                </div>
              </SectionCard>

              <SectionCard
                title="Meeting summary"
                description="Filled in after the meeting. Placeholder layout."
              >
                <div className="rounded-lg border border-dashed border-white/12 px-3 py-6 text-center">
                  <p className="text-[11.5px] text-faint">
                    No summary yet. Summaries are not generated in this phase.
                  </p>
                </div>
              </SectionCard>

              <div className="flex justify-end gap-1.5">
                <Button
                  variant="danger"
                  onClick={() => setConfirmDelete(active.id)}
                >
                  Delete prep
                </Button>
                <Button
                  variant="primary"
                  onClick={() => updateMeeting(active.id, { status: "ready" })}
                >
                  {active.status === "ready" ? "Marked ready" : "Mark ready"}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid flex-1 place-items-center">
            <EmptyState
              title="No meeting selected"
              description="Create one to start prepping."
              action={
                <Button size="sm" onClick={create}>
                  New meeting prep
                </Button>
              }
            />
          </div>
        )}
      </div>

      <Dialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title="Delete this meeting prep?"
        description="The prep notes are removed from this session."
        footer={
          <>
            <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirmDelete) {
                  deleteMeeting(confirmDelete);
                  const next = meetings.find((m) => m.id !== confirmDelete);
                  setActiveId(next?.id ?? "");
                }
                setConfirmDelete(null);
              }}
            >
              Delete
            </Button>
          </>
        }
      />
    </div>
  );
}
