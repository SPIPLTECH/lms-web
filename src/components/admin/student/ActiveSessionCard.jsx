"use client";

import { MonitorSmartphone } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Loader from "@/components/common/Loader";
import { useConfirm } from "@/context/ConfirmContext";
import { useToast } from "@/components/ui/ToastProvider";
import { useRevokeSession, useUserSessions } from "@/hooks/queries/admin/useSessions";

const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : "—");

/**
 * The account's active sign-ins (one per device; an account may be signed in
 * on several devices) and an audited way to end each — for a student who lost
 * or left a device. Ending one signs only that device out and stops any
 * playback it holds; the other devices stay signed in.
 */
export default function ActiveSessionCard({ userId }) {
    const confirm = useConfirm();
    const { showToast } = useToast();
    const { data: sessions = [], isLoading, isError } = useUserSessions(userId);
    const revoke = useRevokeSession(userId);

    const active = sessions.filter((session) => session.status === "ACTIVE");

    const handleRevoke = async (session) => {
        const confirmed = await confirm({
            title: "End active session",
            message:
                "This signs the student out on this device and stops any video playing there. Their other devices stay signed in. The action is recorded.",
            confirmText: "End session",
            cancelText: "Cancel",
        });
        if (!confirmed) return;

        revoke.mutate(session.id, {
            onSuccess: () => showToast("Session ended.", "success"),
            onError: () => showToast("Could not end the session. Please try again.", "error"),
        });
    };

    return (
        <Card tone="flat" className="space-y-4">
            <div className="flex items-center gap-2">
                <MonitorSmartphone className="h-5 w-5 text-primary" />
                <h3 className="text-base font-semibold text-foreground">
                    {active.length > 1 ? `Active sessions (${active.length})` : "Active session"}
                </h3>
            </div>

            {isLoading && (
                <div className="flex justify-center py-4">
                    <Loader />
                </div>
            )}

            {isError && <p className="text-sm text-red-500">Failed to load sessions.</p>}

            {!isLoading && !isError && active.length === 0 && (
                <p className="text-sm text-muted-foreground">Not signed in on any device.</p>
            )}

            {active.length > 0 && (
                <ul className="divide-y divide-border">
                    {active.map((session) => {
                        const ending = revoke.isPending && revoke.variables === session.id;
                        return (
                            <li
                                key={session.id}
                                className="flex flex-col gap-4 py-3 first:pt-0 last:pb-0 md:flex-row md:items-center md:justify-between"
                            >
                                <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                                    <dt className="text-muted-foreground">Device</dt>
                                    <dd className="text-foreground">{session.device?.label || "Unknown device"}</dd>
                                    <dt className="text-muted-foreground">Signed in with</dt>
                                    <dd className="text-foreground">{session.authMethod === "GOOGLE" ? "Google" : "Password"}</dd>
                                    <dt className="text-muted-foreground">Signed in</dt>
                                    <dd className="text-foreground">{formatDateTime(session.createdAt)}</dd>
                                    <dt className="text-muted-foreground">Last active</dt>
                                    <dd className="text-foreground">{formatDateTime(session.lastSeenAt)}</dd>
                                </dl>
                                <Button
                                    type="button"
                                    variant="danger"
                                    onClick={() => handleRevoke(session)}
                                    disabled={revoke.isPending}
                                >
                                    {ending ? "Ending…" : "End session"}
                                </Button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </Card>
    );
}
