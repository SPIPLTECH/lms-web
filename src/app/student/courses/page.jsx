"use client";

import Loader from "@/components/common/Loader";
import PageHeader from "@/components/layouts/PageHeader";
import Card from "@/components/ui/Card";
import SnapCardSlider from "@/components/ui/SnapCardSlider";

import StoreCourseCard from "@/components/student/store/StoreCourseCard";

import useCourses from "@/hooks/queries/student/useCourses";
import useMyCourses from "@/hooks/queries/student/useMyCourses";
import useAvailableCourseFilters from "@/hooks/queries/student/useAvailableCourseFilters";
import { AiAssistantWidget } from "@/features/ai-assistant/components";

export default function StudentCoursesPage() {
    const {data: courses = [], isLoading, isError} = useCourses();
    const {data: myEnrollments = []} = useMyCourses();

    // Only the enrolled-exclusion half of this hook is used here — search/
    // category/level faceting was removed from this page, so those params
    // are passed as no-ops. The Store page (its other caller) still uses
    // the full filtering.
    const {availableCourses} = useAvailableCourseFilters({
        courses,
        myEnrollments,
        search: "",
        category: "",
        level: "",
    });

    if (isLoading) {
        return <Loader/>;
    }

    if (isError) {
        return (
            <Card tone="flat" className="p-8 text-center">
                <h2 className="text-xl font-semibold text-foreground">
                    Unable to load courses
                </h2>

                <p className="mt-2 text-muted-foreground">
                    Please try again later.
                </p>
            </Card>
        );
    }

    return (
        <div className="-m-2 sm:-m-6 md:-m-16 p-3 sm:p-6 pt-0 sm:pt-0 space-y-8 flex flex-col flex-1 min-h-0">
            <PageHeader
                title="Browse Courses"
                subtitle="Discover courses and start learning."
                className="items-center text-center"
            />

            {/* min-w-0 keeps the slider's overflow-x contained here instead of
                letting it push the page itself sideways. */}
            <div className="flex flex-col flex-1 min-h-0 min-w-0 rounded-2xl border border-border bg-card px-3 py-4 md:px-12 md:py-6">
                <SnapCardSlider
                    items={availableCourses}
                    getKey={(course) => course.id}
                    renderItem={(course) => <StoreCourseCard course={course}/>}
                    gridClassName="md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
                    dotsLabel="Course slides"
                    getDotLabel={(course, i) => `Go to ${course.title || `course slide ${i + 1}`}`}
                    emptyState={
                        <div className="rounded-xl border border-dashed border-transparent p-12 text-center">
                            <h3 className="text-lg font-semibold text-foreground">No courses found</h3>
                            <p className="mt-2 text-muted-foreground">
                                You&apos;re already enrolled in every published course, or no courses match your filters.
                            </p>
                        </div>
                    }
                />
            </div>

            <AiAssistantWidget scopeHint="BROWSING" />
        </div>
    );
}
