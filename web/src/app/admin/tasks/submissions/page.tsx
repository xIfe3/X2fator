"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckSquare, ImageIcon, Search, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { adminApi } from "@/lib/api/admin";
import type { TaskCompletion } from "@/lib/types";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { StatusPill } from "@/components/ui/StatusPill";
import { Tabs } from "@/components/ui/Tabs";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { ApiRequestError } from "@/lib/api-client";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime, resolveFileUrl } from "@/lib/utils";
import { Money } from "@/components/ui/Money";

type StatusFilter = "pending" | "approved" | "rejected" | "all";
type SourceFilter = "all" | "admin" | "ad";
type DateFilter = "all" | "today" | "7d" | "30d";
type SortOrder = "newest" | "oldest" | "reward_desc" | "reward_asc";

const PAGE_SIZE = 12;

const DAY_MS = 24 * 60 * 60 * 1000;

function submittedAt(c: TaskCompletion) {
  return new Date(c.completedAt ?? c.createdAt ?? 0).getTime();
}

function rewardOf(c: TaskCompletion) {
  return Number(c.reward ?? c.task?.reward ?? 0);
}

export default function AdminTaskSubmissionsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const { data: completions, isLoading, refetch } = useApiQuery(
    () => adminApi.tasks.completions(statusFilter),
    [statusFilter],
  );
  const { push } = useToast();

  const [search, setSearch] = useState("");
  const [taskFilter, setTaskFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [page, setPage] = useState(1);

  const [rejecting, setRejecting] = useState<TaskCompletion | null>(null);
  const [note, setNote] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkApproving, setBulkApproving] = useState(false);
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const [bulkNote, setBulkNote] = useState("");
  const [bulkRejecting, setBulkRejecting] = useState(false);

  // Tasks that appear in the loaded submissions, for the task dropdown.
  const taskOptions = useMemo(() => {
    const byId = new Map<string, string>();
    for (const c of completions ?? []) {
      byId.set(c.taskId, c.task?.title ?? "Untitled task");
    }
    return [...byId.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [completions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase().replace(/^@/, "");
    const now = Date.now();
    const minTime =
      dateFilter === "today"
        ? new Date().setHours(0, 0, 0, 0)
        : dateFilter === "7d"
          ? now - 7 * DAY_MS
          : dateFilter === "30d"
            ? now - 30 * DAY_MS
            : 0;

    const rows = (completions ?? []).filter((c) => {
      if (taskFilter !== "all" && c.taskId !== taskFilter) return false;
      if (sourceFilter === "ad" && !c.adId) return false;
      if (sourceFilter === "admin" && c.adId) return false;
      if (minTime && submittedAt(c) < minTime) return false;
      if (!q) return true;
      const haystack = [
        c.user?.firstName,
        c.user?.lastName,
        c.user ? `${c.user.firstName} ${c.user.lastName}` : "",
        c.user?.username,
        c.user?.email,
        c.task?.title,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });

    return rows.sort((a, b) => {
      switch (sortOrder) {
        case "oldest":
          return submittedAt(a) - submittedAt(b);
        case "reward_desc":
          return rewardOf(b) - rewardOf(a);
        case "reward_asc":
          return rewardOf(a) - rewardOf(b);
        default:
          return submittedAt(b) - submittedAt(a);
      }
    });
  }, [completions, search, taskFilter, sourceFilter, dateFilter, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pendingOnPage = pageItems.filter((c) => c.status === "pending");

  const filtersActive =
    search !== "" ||
    taskFilter !== "all" ||
    sourceFilter !== "all" ||
    dateFilter !== "all" ||
    sortOrder !== "newest";

  // Back to page 1 whenever the result set changes shape.
  useEffect(() => {
    setPage(1);
  }, [statusFilter, search, taskFilter, sourceFilter, dateFilter, sortOrder]);

  // Drop selections that are no longer visible or no longer pending.
  useEffect(() => {
    setSelected((prev) => {
      const pendingIds = new Set(
        (completions ?? []).filter((c) => c.status === "pending").map((c) => c.id),
      );
      const next = new Set([...prev].filter((id) => pendingIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [completions]);

  function clearFilters() {
    setSearch("");
    setTaskFilter("all");
    setSourceFilter("all");
    setDateFilter("all");
    setSortOrder("newest");
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectPage() {
    const allSelected = pendingOnPage.every((c) => selected.has(c.id));
    setSelected((prev) => {
      const next = new Set(prev);
      for (const c of pendingOnPage) {
        if (allSelected) next.delete(c.id);
        else next.add(c.id);
      }
      return next;
    });
  }

  async function approve(c: TaskCompletion) {
    setBusyId(c.id);
    try {
      await adminApi.tasks.approveCompletion(c.id);
      push("success", "Approved. Reward credited to the user's earnings wallet.");
      refetch();
    } catch (err) {
      push("error", err instanceof ApiRequestError ? err.message : "Could not approve this submission.");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmReject() {
    if (!rejecting) return;
    setBusyId(rejecting.id);
    try {
      await adminApi.tasks.rejectCompletion(rejecting.id, note.trim() || undefined);
      push("success", "Submission rejected.");
      setRejecting(null);
      setNote("");
      refetch();
    } catch (err) {
      push("error", err instanceof ApiRequestError ? err.message : "Could not reject this submission.");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmBulkApprove() {
    if (selected.size === 0) return;
    setBulkApproving(true);
    // One at a time — each approval credits a wallet in its own
    // transaction, and a failure shouldn't stop the rest.
    let approved = 0;
    let failed = 0;
    for (const id of selected) {
      try {
        await adminApi.tasks.approveCompletion(id);
        approved++;
      } catch {
        failed++;
      }
    }
    if (approved > 0) {
      push("success", `Approved ${approved} submission${approved === 1 ? "" : "s"}.`);
    }
    if (failed > 0) {
      push("error", `${failed} submission${failed === 1 ? "" : "s"} couldn't be approved.`);
    }
    setSelected(new Set());
    setBulkConfirmOpen(false);
    setBulkApproving(false);
    refetch();
  }

  async function confirmBulkReject() {
    if (selected.size === 0) return;
    setBulkRejecting(true);
    // Same one-at-a-time approach as bulk approve, so one failure
    // doesn't stop the rest.
    const reason = bulkNote.trim() || undefined;
    let rejected = 0;
    let failed = 0;
    for (const id of selected) {
      try {
        await adminApi.tasks.rejectCompletion(id, reason);
        rejected++;
      } catch {
        failed++;
      }
    }
    if (rejected > 0) {
      push("success", `Rejected ${rejected} submission${rejected === 1 ? "" : "s"}.`);
    }
    if (failed > 0) {
      push("error", `${failed} submission${failed === 1 ? "" : "s"} couldn't be rejected.`);
    }
    setSelected(new Set());
    setBulkNote("");
    setBulkRejectOpen(false);
    setBulkRejecting(false);
    refetch();
  }

  const statusLabel = statusFilter === "all" ? "" : `${statusFilter} `;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Task submissions</h1>
        <p className="mt-1 text-sm text-ink-dim">
          {filtered.length} {statusLabel}submission{filtered.length === 1 ? "" : "s"}
          {filtersActive && completions ? ` matching filters (of ${completions.length})` : ""}.
        </p>
      </div>

      <Card>
        <CardBody className="space-y-4">
          <div className="overflow-x-auto">
            <Tabs
              active={statusFilter}
              onChange={(key) => setStatusFilter(key as StatusFilter)}
              tabs={[
                { key: "pending", label: "Pending" },
                { key: "approved", label: "Approved" },
                { key: "rejected", label: "Rejected" },
                { key: "all", label: "All" },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-ink-faint" />
              <Input
                placeholder="Search user, @username, email, task…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                aria-label="Search submissions"
                rightElement={
                  search ? (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="text-ink-faint hover:text-ink"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : undefined
                }
              />
            </div>
            <Select aria-label="Filter by task" value={taskFilter} onChange={(e) => setTaskFilter(e.target.value)}>
              <option value="all">All tasks</option>
              {taskOptions.map(([id, title]) => (
                <option key={id} value={id}>
                  {title}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Filter by source"
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as SourceFilter)}
            >
              <option value="all">Any source</option>
              <option value="admin">Admin tasks</option>
              <option value="ad">Ad campaigns</option>
            </Select>
            <Select
              aria-label="Filter by date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilter)}
            >
              <option value="all">Any time</option>
              <option value="today">Today</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </Select>
            <Select
              aria-label="Sort submissions"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="reward_desc">Highest reward</option>
              <option value="reward_asc">Lowest reward</option>
            </Select>
          </div>

          {(filtersActive || pendingOnPage.length > 0) && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-2">
                {pendingOnPage.length > 0 && (
                  <Button size="sm" variant="secondary" onClick={toggleSelectPage}>
                    <CheckSquare className="h-3.5 w-3.5" />
                    {pendingOnPage.every((c) => selected.has(c.id)) ? "Unselect page" : "Select page"}
                  </Button>
                )}
                {filtersActive && (
                  <Button size="sm" variant="ghost" onClick={clearFilters}>
                    <X className="h-3.5 w-3.5" /> Clear filters
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary-dim/40 bg-primary-soft px-4 py-3">
          <p className="text-sm font-medium text-primary">
            {selected.size} submission{selected.size === 1 ? "" : "s"} selected
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                setBulkNote("");
                setBulkRejectOpen(true);
              }}
            >
              <ThumbsDown className="h-3.5 w-3.5" /> Reject selected
            </Button>
            <Button size="sm" onClick={() => setBulkConfirmOpen(true)}>
              <ThumbsUp className="h-3.5 w-3.5" /> Approve selected
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <PageSkeleton />
      ) : filtered.length === 0 ? (
        <Card>
          <CardBody>
            {filtersActive ? (
              <EmptyState
                icon={Search}
                title="No matches"
                description="No submissions match these filters."
                action={
                  <Button size="sm" variant="secondary" onClick={clearFilters}>
                    Clear filters
                  </Button>
                }
              />
            ) : statusFilter === "pending" ? (
              <EmptyState icon={ImageIcon} title="Nothing pending" description="All caught up — no submissions waiting on review." />
            ) : (
              <EmptyState icon={ImageIcon} title="No submissions" description={`No ${statusLabel}submissions yet.`} />
            )}
          </CardBody>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pageItems.map((c) => (
              <Card key={c.id} className="overflow-hidden">
                <div className="relative">
                  <a href={resolveFileUrl(c.screenshotUrl)} target="_blank" rel="noreferrer" className="block bg-base-raised">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={resolveFileUrl(c.screenshotUrl)} alt="Submission screenshot" className="h-48 w-full object-cover" />
                  </a>
                  {c.status === "pending" && (
                    <label className="absolute left-2 top-2 flex cursor-pointer items-center rounded-md bg-base-surface/90 p-1.5 shadow-sm">
                      <input
                        type="checkbox"
                        checked={selected.has(c.id)}
                        onChange={() => toggleSelected(c.id)}
                        aria-label={`Select submission for ${c.task?.title ?? "task"}`}
                        className="h-4 w-4 rounded border-base-border text-primary focus:ring-primary"
                      />
                    </label>
                  )}
                </div>
                <CardBody className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{c.task?.title ?? "Task"}</p>
                      <p className="mt-0.5 text-xs text-ink-faint">
                        {formatDateTime(c.completedAt ?? c.createdAt)}
                        {c.adId ? " · Ad campaign" : ""}
                      </p>
                    </div>
                    {statusFilter === "all" || c.status !== "pending" ? <StatusPill status={c.status} /> : null}
                  </div>
                  {c.user && (
                    <button
                      type="button"
                      onClick={() => setSearch(c.user!.email)}
                      className="block w-full text-left text-sm hover:opacity-80"
                      title="Show all submissions from this user"
                    >
                      <p className="text-ink">
                        {c.user.firstName} {c.user.lastName}{" "}
                        <span className="text-ink-faint">@{c.user.username}</span>
                      </p>
                      <p className="truncate text-xs text-ink-faint">{c.user.email}</p>
                    </button>
                  )}
                  <Money value={c.reward ?? c.task?.reward} size="sm" tone="primary" />
                  {c.status === "pending" ? (
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1" isLoading={busyId === c.id} onClick={() => approve(c)}>
                        <ThumbsUp className="h-3.5 w-3.5" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        className="flex-1"
                        onClick={() => {
                          setRejecting(c);
                          setNote("");
                        }}
                      >
                        <ThumbsDown className="h-3.5 w-3.5" /> Reject
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-1 text-xs text-ink-faint">
                      {c.reviewedAt && <p>Reviewed {formatDateTime(c.reviewedAt)}</p>}
                      {c.status === "rejected" && c.rejectionReason && (
                        <p className="rounded-lg border border-danger/30 bg-danger-soft px-2.5 py-1.5 text-danger">
                          {c.rejectionReason}
                        </p>
                      )}
                    </div>
                  )}
                </CardBody>
              </Card>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}

      <Modal open={!!rejecting} onClose={() => setRejecting(null)} title="Reject submission">
        <div className="space-y-4">
          <p className="text-sm text-ink-dim">
            Reject <span className="font-medium text-ink">{rejecting?.task?.title}</span>
            {rejecting?.user && (
              <>
                {" "}from{" "}
                <span className="font-medium text-ink">
                  {rejecting.user.firstName} {rejecting.user.lastName}
                </span>
              </>
            )}
            ? No reward will be credited.
          </p>
          <Textarea label="Note (optional)" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why is this being rejected?" />
          <Button variant="danger" className="w-full" isLoading={busyId === rejecting?.id} onClick={confirmReject}>
            Confirm reject
          </Button>
        </div>
      </Modal>

      <Modal open={bulkRejectOpen} onClose={() => setBulkRejectOpen(false)} title="Reject selected submissions">
        <div className="space-y-4">
          <p className="text-sm text-ink-dim">
            Reject{" "}
            <span className="font-medium text-ink">
              {selected.size} submission{selected.size === 1 ? "" : "s"}
            </span>
            ? No rewards will be credited. This can't be undone.
          </p>
          <Textarea
            label="Note (optional, sent with every rejection)"
            rows={3}
            value={bulkNote}
            onChange={(e) => setBulkNote(e.target.value)}
            placeholder="Why are these being rejected?"
          />
          <Button variant="danger" className="w-full" isLoading={bulkRejecting} onClick={confirmBulkReject}>
            Reject selected
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={bulkConfirmOpen}
        onClose={() => setBulkConfirmOpen(false)}
        onConfirm={confirmBulkApprove}
        title="Approve selected submissions"
        description={`Approve ${selected.size} submission${selected.size === 1 ? "" : "s"} and credit each reward to the user's task wallet? This can't be undone.`}
        confirmLabel="Approve selected"
        isLoading={bulkApproving}
      />
    </div>
  );
}
