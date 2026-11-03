"use client";

import {
  Check,
  Download,
  Loader2,
  LogOut,
  ShieldAlert,
  Trash2,
  User,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useRecall } from "@/lib/store";
import { useAuth } from "@/components/AuthProvider";
import { modelOptions } from "@/lib/mock/workspace";
import {
  Badge,
  Button,
  Dialog,
  Dropdown,
  PageHeader,
  SectionCard,
  Segmented,
  Toggle,
} from "@/components/ui";

const SECTIONS = [
  { id: "profile", label: "Profile" },
  { id: "appearance", label: "Appearance" },
  { id: "ai", label: "AI preferences" },
  { id: "memory", label: "Memory" },
  { id: "privacy", label: "Privacy" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

export function SettingsView() {
  const { user, signOut, updateProfileData } = useAuth();
  const profile = useRecall((s) => s.profile);
  const updateProfile = useRecall((s) => s.updateProfile);
  const aiPrefs = useRecall((s) => s.aiPrefs);
  const updateAiPrefs = useRecall((s) => s.updateAiPrefs);
  const memoryPrefs = useRecall((s) => s.memoryPrefs);
  const updateMemoryPrefs = useRecall((s) => s.updateMemoryPrefs);
  const privacyPrefs = useRecall((s) => s.privacyPrefs);
  const updatePrivacyPrefs = useRecall((s) => s.updatePrivacyPrefs);
  const sources = useRecall((s) => s.sources);
  const chats = useRecall((s) => s.chats);

  const [section, setSection] = useState<SectionId>("profile");
  const [theme, setTheme] = useState<"dark" | "light" | "system">("dark");
  const [density, setDensity] = useState<"comfortable" | "compact">(
    "comfortable",
  );
  const [exportOpen, setExportOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 2600);
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      if (user) {
        const { error } = await updateProfileData({
          displayName: profile.displayName,
          role: profile.role,
        });
        if (error) {
          flash(`Failed to update profile: ${error.message}`);
        } else {
          flash("Profile updated successfully in Supabase!");
        }
      } else {
        flash("Profile updated in local session.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving profile";
      flash(msg);
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1">
      {/* Section nav */}
      <div className="flex w-[220px] shrink-0 flex-col border-r border-white/[0.06] bg-black/20 backdrop-blur-xl">
        <div className="px-5 pb-3 pt-6">
          <h1 className="text-[15px] font-semibold">Settings</h1>
          <p className="text-[11.5px] text-faint">Workspace configuration</p>
        </div>
        <nav className="px-3">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={cn(
                "mb-0.5 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12.5px] transition",
                section === s.id
                  ? "bg-white/[0.09] text-ink"
                  : "text-muted hover:bg-white/[0.05] hover:text-ink",
              )}
            >
              {s.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <PageHeader
          breadcrumbs={["Workspace", "Settings", SECTIONS.find((s) => s.id === section)!.label]}
          title={SECTIONS.find((s) => s.id === section)!.label}
          description="Manage your profile, preferences, and workspace configuration."
        />

        <div className="min-h-0 flex-1 overflow-y-auto px-7 pb-8 scroll-thin">
          {notice && (
            <div className="mb-3 rounded-lg border border-white/12 bg-white/[0.06] px-3 py-2 text-[11.5px] text-ink/85">
              {notice}
            </div>
          )}

          {section === "profile" && (
            <div className="space-y-3">
              <SectionCard
                title="Profile"
                description="How you appear across the workspace."
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-white/[0.25] to-white/[0.1] text-[14px] font-semibold text-ink">
                    {profile.initials}
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className="block">
                      <span className="text-[11px] text-faint">
                        Display name
                      </span>
                      <input
                        value={profile.displayName}
                        onChange={(e) =>
                          updateProfile({
                            displayName: e.target.value,
                            initials: e.target.value
                              .split(" ")
                              .map((p) => p[0])
                              .filter(Boolean)
                              .slice(0, 2)
                              .join("")
                              .toUpperCase(),
                          })
                        }
                        className="mt-0.5 w-full rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[12.5px] focus:border-white/25 focus:outline-none"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[11px] text-faint">Role</span>
                      <input
                        value={profile.role}
                        onChange={(e) =>
                          updateProfile({ role: e.target.value })
                        }
                        className="mt-0.5 w-full rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[12.5px] focus:border-white/25 focus:outline-none"
                      />
                    </label>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
                  <p className="text-[11px] text-faint">
                    {user
                      ? "Changes sync directly to your Supabase profile."
                      : "Running in local guest preview mode."}
                  </p>
                  <Button
                    variant="primary"
                    disabled={savingProfile}
                    onClick={handleSaveProfile}
                  >
                    {savingProfile ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <Check className="h-3.5 w-3.5" /> Save changes
                      </>
                    )}
                  </Button>
                </div>
              </SectionCard>

              <SectionCard title="Account information">
                <dl className="space-y-2">
                  {[
                    ["Email", user?.email || profile.email],
                    [
                      "Account status",
                      user ? "Authenticated (Supabase Auth)" : "Local guest mode",
                    ],
                    [
                      "User ID",
                      user?.id ? `${user.id.slice(0, 18)}...` : "Local preview",
                    ],
                    ["Sources", String(sources.length)],
                    ["Chats", String(chats.length)],
                  ].map(([k, v]) => (
                    <div
                      key={k}
                      className="flex items-baseline justify-between"
                    >
                      <dt className="text-[11.5px] text-faint">{k}</dt>
                      <dd className="font-mono text-[11.5px] text-ink/85">{v}</dd>
                    </div>
                  ))}
                </dl>
                {user ? (
                  <div className="mt-4 flex items-center justify-between border-t border-white/[0.08] pt-3">
                    <div className="text-[11px] text-faint">
                      Signed in as <span className="text-ink">{user.email}</span>
                    </div>
                    <Button
                      variant="ghost"
                      className="text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300"
                      onClick={() => signOut()}
                    >
                      <LogOut className="h-3.5 w-3.5" /> Sign Out
                    </Button>
                  </div>
                ) : (
                  <p className="mt-3 text-[11px] leading-relaxed text-faint">
                    Running in local preview mode. Configure Supabase credentials in
                    .env.local to activate cloud authentication and full RLS persistence.
                  </p>
                )}
              </SectionCard>
            </div>
          )}

          {section === "appearance" && (
            <div className="space-y-3">
              <SectionCard
                title="Theme"
                description="The workspace currently ships a single dark theme."
              >
                <Segmented
                  value={theme}
                  onChange={(v) => {
                    setTheme(v);
                    flash(
                      v === "dark"
                        ? "Dark theme is the only theme implemented in this phase."
                        : "Light and system themes are not implemented yet.",
                    );
                  }}
                  options={[
                    { value: "dark", label: "Dark" },
                    { value: "light", label: "Light" },
                    { value: "system", label: "System" },
                  ]}
                />
                <p className="mt-2 text-[11px] text-faint">
                  Selecting Light or System is a placeholder — only Dark renders.
                </p>
              </SectionCard>

              <SectionCard title="Density">
                <Segmented
                  value={density}
                  onChange={setDensity}
                  options={[
                    { value: "comfortable", label: "Comfortable" },
                    { value: "compact", label: "Compact" },
                  ]}
                />
              </SectionCard>

              <SectionCard
                title="Appearance settings"
                description="Visual preferences for the workspace shell."
              >
                <div className="space-y-2.5">
                  {[
                    ["Reduce motion", "Disable ambient animation and transitions."],
                    ["Show source excerpts", "Display excerpt text in list rows."],
                  ].map(([label, detail]) => (
                    <div
                      key={label}
                      className="flex items-start justify-between gap-3"
                    >
                      <div>
                        <p className="text-[12px] text-ink/90">{label}</p>
                        <p className="text-[11px] text-faint">{detail}</p>
                      </div>
                      <Toggle
                        checked={false}
                        onChange={() =>
                          flash("This preference is not wired up yet.")
                        }
                        label={label}
                      />
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>
          )}

          {section === "ai" && (
            <div className="space-y-3">
              <SectionCard
                title="Default model"
                description="Which model Recall uses when you start a new chat."
              >
                <Dropdown
                  label="Default model"
                  value={aiPrefs.defaultModel}
                  onChange={(v) => updateAiPrefs({ defaultModel: v })}
                  options={modelOptions.map((m) => ({
                    value: m.label,
                    label: `${m.label} — ${m.detail}`,
                  }))}
                />
                <p className="mt-2 text-[11px] text-faint">
                  Model selection is a frontend control only. No model is
                  called in this phase.
                </p>
              </SectionCard>

              <SectionCard title="Response preferences">
                <div className="space-y-3">
                  <div>
                    <p className="mb-1 text-[11px] text-faint">
                      Response length
                    </p>
                    <Segmented
                      value={aiPrefs.responseLength}
                      onChange={(v) => updateAiPrefs({ responseLength: v })}
                      options={[
                        { value: "concise", label: "Concise" },
                        { value: "balanced", label: "Balanced" },
                        { value: "detailed", label: "Detailed" },
                      ]}
                    />
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[12px] text-ink/90">
                        Always cite sources
                      </p>
                      <p className="text-[11px] text-faint">
                        Every answer must carry a passage-level citation.
                      </p>
                    </div>
                    <Toggle
                      checked={aiPrefs.alwaysCite}
                      onChange={(v) => updateAiPrefs({ alwaysCite: v })}
                      label="Always cite sources"
                    />
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[12px] text-ink/90">
                        Show confidence
                      </p>
                      <p className="text-[11px] text-faint">
                        Display a relevance score beside each citation.
                      </p>
                    </div>
                    <Toggle
                      checked={aiPrefs.showConfidence}
                      onChange={(v) => updateAiPrefs({ showConfidence: v })}
                      label="Show confidence"
                    />
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Context settings"
                description="How much of your library is pulled into each answer."
              >
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-[11.5px] text-muted">
                        Context chunks per answer
                      </p>
                      <span className="text-[11.5px] tabular-nums text-ink/85">
                        {aiPrefs.contextChunks}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={2}
                      max={20}
                      value={aiPrefs.contextChunks}
                      onChange={(e) =>
                        updateAiPrefs({
                          contextChunks: Number(e.target.value),
                        })
                      }
                      className="mt-1.5 w-full accent-white"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-[11.5px] text-muted">Temperature</p>
                      <span className="text-[11.5px] tabular-nums text-ink/85">
                        {aiPrefs.temperature.toFixed(1)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.1}
                      value={aiPrefs.temperature}
                      onChange={(e) =>
                        updateAiPrefs({
                          temperature: Number(e.target.value),
                        })
                      }
                      className="mt-1.5 w-full accent-white"
                    />
                  </div>
                </div>
              </SectionCard>
            </div>
          )}

          {section === "memory" && (
            <div className="space-y-3">
              <SectionCard
                title="Memory preferences"
                description="Control what Recall is allowed to remember."
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[12px] text-ink/90">
                        Enable AI memory
                      </p>
                      <p className="text-[11px] text-faint">
                        Allow Recall to carry facts between conversations.
                      </p>
                    </div>
                    <Toggle
                      checked={memoryPrefs.memoryEnabled}
                      onChange={(v) =>
                        updateMemoryPrefs({ memoryEnabled: v })
                      }
                      label="Enable AI memory"
                    />
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[12px] text-ink/90">
                        Require approval
                      </p>
                      <p className="text-[11px] text-faint">
                        Nothing is remembered until you approve it.
                      </p>
                    </div>
                    <Toggle
                      checked={memoryPrefs.requireApproval}
                      onChange={(v) =>
                        updateMemoryPrefs({ requireApproval: v })
                      }
                      label="Require approval"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-[11.5px] text-muted">
                        Auto-expire after
                      </p>
                      <span className="text-[11.5px] tabular-nums text-ink/85">
                        {memoryPrefs.autoExpireDays} days
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={365}
                      step={30}
                      value={memoryPrefs.autoExpireDays}
                      onChange={(e) =>
                        updateMemoryPrefs({
                          autoExpireDays: Number(e.target.value),
                        })
                      }
                      className="mt-1.5 w-full accent-white"
                    />
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Data management"
                description="Bulk actions over everything Recall has learned."
              >
                <div className="flex flex-wrap gap-1.5">
                  <Button onClick={() => flash("Export queued — not implemented in this phase.")}>
                    <Download className="h-3.5 w-3.5" /> Export memories
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => flash("Bulk delete is not implemented in this phase.")}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete all memories
                  </Button>
                </div>
              </SectionCard>
            </div>
          )}

          {section === "privacy" && (
            <div className="space-y-3">
              <SectionCard
                title="Privacy settings"
                description="What leaves this device, and what does not."
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[12px] text-ink/90">
                        Anonymous usage analytics
                      </p>
                      <p className="text-[11px] text-faint">
                        Off by default. No telemetry is sent in this phase.
                      </p>
                    </div>
                    <Toggle
                      checked={privacyPrefs.analytics}
                      onChange={(v) =>
                        updatePrivacyPrefs({ analytics: v })
                      }
                      label="Anonymous usage analytics"
                    />
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[12px] text-ink/90">
                        Opt out of model training
                      </p>
                      <p className="text-[11px] text-faint">
                        Your sources are never used to train models.
                      </p>
                    </div>
                    <Toggle
                      checked={privacyPrefs.trainingOptOut}
                      onChange={(v) =>
                        updatePrivacyPrefs({ trainingOptOut: v })
                      }
                      label="Opt out of model training"
                    />
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Data export"
                description="Download everything Recall holds about you."
              >
                <Button onClick={() => setExportOpen(true)}>
                  <Download className="h-3.5 w-3.5" /> Request data export
                </Button>
              </SectionCard>

              <SectionCard
                title="Danger zone"
                description="Irreversible actions. Handle with care."
              >
                <Button variant="danger" onClick={() => setDeleteOpen(true)}>
                  <ShieldAlert className="h-3.5 w-3.5" /> Delete account
                </Button>
              </SectionCard>
            </div>
          )}
        </div>
      </div>

      <Dialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Request a data export"
        description="A real export would produce a JSON bundle of your sources, chats, notes, and memories."
        footer={
          <>
            <Button onClick={() => setExportOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                setExportOpen(false);
                flash("Export is not implemented in this phase.");
              }}
            >
              <Download className="h-3.5 w-3.5" /> Request export
            </Button>
          </>
        }
      >
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <p className="text-[11.5px] leading-relaxed text-muted">
            This phase has no backend, so no file will be produced. The control
            exists so the flow is in place for later.
          </p>
        </div>
      </Dialog>

      <Dialog
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setDeleteConfirmText("");
        }}
        title="Delete your account?"
        description="This would permanently remove your sources, chats, notes, and memories. There is no undo."
        footer={
          <>
            <Button
              onClick={() => {
                setDeleteOpen(false);
                setDeleteConfirmText("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={deleteConfirmText !== "DELETE"}
              onClick={() => {
                setDeleteOpen(false);
                setDeleteConfirmText("");
                flash("Account deletion is not implemented in this phase.");
              }}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete account
            </Button>
          </>
        }
      >
        <label className="block">
          <span className="text-[11px] text-muted">
            Type <span className="font-mono text-ink">DELETE</span> to confirm
          </span>
          <input
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder="DELETE"
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 font-mono text-[12px] placeholder:text-faint focus:border-white/25 focus:outline-none"
          />
        </label>
        <div className="mt-3 flex items-center gap-2">
          <Badge tone="outline">
            <User className="h-2.5 w-2.5" /> {profile.email}
          </Badge>
        </div>
      </Dialog>
    </div>
  );
}
