"use client";

import ActionMenu from "@/components/menus/ActionMenu";

export default function EnrollmentRow({
                                          enrollment,
                                          onView,
                                          onDelete,
                                      }) {
    return (
        <tr className="hover:bg-foreground/5 transition">
            {/* Student */}
            <td className="px-6 py-4">
                <div>
                    <p className="font-semibold text-foreground">
                        {
                            enrollment.student?.user
                                ?.name
                        }
                    </p>

                    <p className="text-sm text-muted-foreground">
                        {
                            enrollment.student?.user
                                ?.email
                        }
                    </p>
                </div>
            </td>

            {/* Course */}
            <td className="px-6 py-4">
                <div>
                    <p className="font-medium text-foreground">
                        {
                            enrollment.course
                                ?.title
                        }
                    </p>

                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {
                            enrollment.course
                                ?.description
                        }
                    </p>
                </div>
            </td>

            {/* Phone */}
            <td className="px-6 py-4 text-muted-foreground">
                {enrollment.student?.phone ||
                    "-"}
            </td>

            {/* Enrolled On */}
            <td className="px-6 py-4 text-muted-foreground">
                {new Date(
                    enrollment.enrolledAt
                ).toLocaleDateString()}
            </td>

            {/* Status / Expiry */}
            <td className="px-6 py-4">
                {enrollment.isExpired || (enrollment.expiresAt && new Date(enrollment.expiresAt) <= new Date()) ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        Expired ({new Date(enrollment.expiresAt).toLocaleDateString()})
                    </span>
                ) : enrollment.expiresAt ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Active (Expires {new Date(enrollment.expiresAt).toLocaleDateString()})
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                        Lifetime
                    </span>
                )}
            </td>

            {/* Actions */}
            <td className="px-6 py-4 text-right">
                <ActionMenu
                    items={[
                        {
                            label: "View",
                            onClick: () =>
                                onView?.(
                                    enrollment
                                ),
                        },
                        {
                            label: "Delete",
                            danger: true,
                            onClick: () =>
                                onDelete?.(
                                    enrollment
                                ),
                        },
                    ]}
                />
            </td>
        </tr>
    );
}