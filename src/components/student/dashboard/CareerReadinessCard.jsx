"use client";

import { useState } from "react";
import { Briefcase } from "lucide-react";

import { useCareer, useCareerRoles, useSetCareerGoal } from "@/hooks/queries/student/useAdaptiveAgents";

/**
 * Career Guidance agent — readiness for the role the learner is aiming at,
 * the skills to build next, and courses that cover them.
 *
 * Skills are measured from the learner's own quiz answers (concept mastery),
 * completed courses and — at half strength — the skills on their profile;
 * the card says so, so the number is never a mystery.
 */

const LEVEL_LABELS = { READY: "Ready", APPROACHING: "Getting close", BUILDING: "Building up" };
const LEVEL_TONES = {
    READY: "bg-success/10 text-success",
    APPROACHING: "bg-warning/10 text-warning",
    BUILDING: "bg-muted text-muted-foreground",
};

export default function CareerReadinessCard() {
    const { data, isLoading, isError } = useCareer();
    const { data: roles } = useCareerRoles();
    const setGoal = useSetCareerGoal();
    // The choice shows at once; readiness for it takes a few seconds to
    // compute server-side. Without this the picker snapped back to the old
    // role until the response arrived.
    const [chosenRole, setChosenRole] = useState(null);

    if (isError) return null;
    const goal = data?.goal;

    const chooseRole = (roleKey) => {
        if (!roleKey) return;
        setChosenRole(roleKey);
        setGoal.mutate(roleKey, { onSettled: () => setChosenRole(null) });
    };

    return (
        <section className="rounded-2xl bg-card border border-border p-5" aria-label="Career readiness">
            <div className="mb-3 flex items-center gap-2 border-b border-border pb-3">
                <Briefcase size={14} className="text-primary" aria-hidden />
                <h3 className="text-h3 text-foreground">Career readiness</h3>
            </div>

            {isLoading && <div className="h-20 rounded-xl bg-muted/50 animate-pulse" />}

            {data && (
                <>
                    <label className="block text-[11px] font-medium text-muted-foreground" htmlFor="career-goal">
                        I&apos;m aiming to become
                    </label>
                    <select
                        id="career-goal"
                        value={chosenRole ?? goal?.roleKey ?? ""}
                        onChange={(e) => chooseRole(e.target.value)}
                        disabled={setGoal.isPending}
                        className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-2 text-sm text-foreground"
                    >
                        <option value="">Choose a role…</option>
                        {(roles ?? []).map((role) => (
                            <option key={role.key} value={role.key}>
                                {role.name}
                            </option>
                        ))}
                    </select>

                    {setGoal.isPending && (
                        <p role="status" className="mt-2 text-[11px] text-muted-foreground">Working out your readiness…</p>
                    )}
                    {setGoal.isError && (
                        <p role="alert" className="mt-2 text-[11px] text-destructive">Couldn&apos;t save that goal. Try again.</p>
                    )}

                    {goal && !setGoal.isPending ? (
                        <div className="mt-3">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-semibold text-foreground">{goal.name}</span>
                                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${LEVEL_TONES[goal.readinessLevel]}`}>
                                    {LEVEL_LABELS[goal.readinessLevel]}
                                </span>
                            </div>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" aria-label={`Readiness ${goal.readinessScore} of 100`}>
                                <div className="h-full rounded-full bg-primary" style={{ width: `${goal.readinessScore}%` }} />
                            </div>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                                Skill match {goal.skillMatchPercent}% · {goal.confidence.toLowerCase()} confidence
                                {goal.source === "PROFILE_TEXT" ? " · from your profile's career goal" : ""}
                            </p>

                            {goal.gaps.length > 0 && (
                                <>
                                    <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Build next</p>
                                    <ul className="mt-1.5 space-y-2">
                                        {goal.gaps.map((gap) => (
                                            <li key={gap.skill} className="text-sm">
                                                <span className="font-medium text-foreground">{gap.skill}</span>
                                                {gap.courses.length > 0 && (
                                                    <span className="block text-[11px] text-muted-foreground">
                                                        Covered in: {gap.courses.map((c) => c.title).join(", ")}
                                                    </span>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )}
                        </div>
                    ) : (
                        !setGoal.isPending &&
                        data.topMatches.length > 0 && (
                            <div className="mt-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Closest matches today</p>
                                <ul className="mt-1.5 space-y-1">
                                    {data.topMatches.map((m) => (
                                        <li key={m.roleKey} className="flex items-center justify-between text-sm">
                                            <span className="text-foreground">{m.name}</span>
                                            <span className="text-[11px] tabular-nums text-muted-foreground">{m.skillMatchPercent}% match</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )
                    )}

                    <p className="mt-3 text-[10px] leading-snug text-muted-foreground">{data.method}</p>
                </>
            )}
        </section>
    );
}
