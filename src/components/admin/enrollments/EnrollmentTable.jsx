"use client";

import ActionMenu from "@/components/menus/ActionMenu";

import EnrollmentRow from "./EnrollmentRow";

export default function EnrollmentTable({
                                            enrollments = [],
                                            onView,
                                            onDelete,
                                        }) {
    if (!enrollments.length) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <h3 className="text-lg font-semibold text-foreground">
                    No Enrollments Found
                </h3>

                <p className="mt-2 text-sm text-muted-foreground">
                    There are no enrollments available.
                </p>
            </div>
        );
    }

    return (
        <>
            {/* Desktop & Tablet */}
            <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
                <table className="min-w-full">
                    <thead>
                    <tr className="border-b border-border text-[9px] uppercase tracking-widest text-muted-foreground font-black text-left">
                        <th className="px-6 py-4 font-medium">
                            Student
                        </th>
                        <th className="px-6 py-4 font-medium">
                            Course
                        </th>
                        <th className="px-6 py-4 font-medium">
                            Phone
                        </th>
                        <th className="px-6 py-4 font-medium">
                            Enrolled On
                        </th>
                        <th className="px-6 py-4 font-medium">
                            Status / Expiry
                        </th>
                        <th className="px-6 py-4 text-right font-medium">
                            Actions
                        </th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                    {enrollments.map(
                        (enrollment) => (
                            <EnrollmentRow
                                key={
                                    enrollment.id
                                }
                                enrollment={
                                    enrollment
                                }
                                onView={onView}
                                onDelete={
                                    onDelete
                                }
                            />
                        )
                    )}
                    </tbody>
                </table>
            </div>

            {/* Mobile */}
            <div className="grid gap-4 md:hidden">
                {enrollments.map(
                    (enrollment) => (
                        <div
                            key={
                                enrollment.id
                            }
                            className="rounded-xl border border-border bg-card p-4"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="font-semibold text-foreground">
                                        {
                                            enrollment
                                                .student
                                                ?.user
                                                ?.name
                                        }
                                    </h3>

                                    <p className="break-all text-xs text-muted-foreground">
                                        {
                                            enrollment
                                                .student
                                                ?.user
                                                ?.email
                                        }
                                    </p>
                                </div>

                                <ActionMenu
                                    items={[
                                        {
                                            label:
                                                "View",
                                            onClick:
                                                () =>
                                                    onView?.(
                                                        enrollment
                                                    ),
                                        },
                                        {
                                            label:
                                                "Delete",
                                            danger: true,
                                            onClick:
                                                () =>
                                                    onDelete?.(
                                                        enrollment
                                                    ),
                                        },
                                    ]}
                                />
                            </div>

                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                <div>
                                    <p className="text-muted-foreground">
                                        Course
                                    </p>

                                    <span className="font-medium text-foreground">
                    {
                        enrollment
                            .course
                            ?.title
                    }
                  </span>
                                </div>

                                <div>
                                    <p className="text-muted-foreground">
                                        Phone
                                    </p>

                                    <span className="text-foreground">
                    {enrollment
                            .student
                            ?.phone ||
                        "-"}
                  </span>
                                </div>

                                <div className="col-span-2">
                                    <p className="text-muted-foreground">
                                        Enrolled
                                    </p>

                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-foreground">
                                            {new Date(
                                                enrollment.enrolledAt
                                            ).toLocaleDateString()}
                                        </span>
                                        {enrollment.isExpired || (enrollment.expiresAt && new Date(enrollment.expiresAt) <= new Date()) ? (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400">
                                                Expired
                                            </span>
                                        ) : enrollment.expiresAt ? (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400">
                                                Expires {new Date(enrollment.expiresAt).toLocaleDateString()}
                                            </span>
                                        ) : (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                                                Lifetime
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                )}
            </div>
        </>
    );
}