"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useIsMutating, useQueryClient } from "@tanstack/react-query";
import { LayoutTemplate, Sparkles } from "lucide-react";

import Loader from "@/components/common/Loader";
import ComposerSidebar from "@/components/instructor/composer/ComposerSidebar";
import CourseMetaPanel from "@/components/instructor/composer/CourseMetaPanel";
import LessonCanvas from "@/components/instructor/composer/LessonCanvas";
import AiComposerModal from "@/components/instructor/composer/AiComposerModal";

import { useInstructorCourse } from "@/hooks/queries/instructor/useInstructorCourse";
import { useCreateModule } from "@/hooks/queries/instructor/useCreateModule";
import { useCreateLesson } from "@/hooks/queries/instructor/useCreateLesson";
import { QUERY_KEYS } from "@/constants/queryKeys";

function findLessonAndModule(course, lessonId) {
  for (const mod of course.modules || []) {
    const lesson = (mod.lessons || []).find((l) => l.id === lessonId);
    if (lesson) return { lesson, module: mod };
  }
  return { lesson: null, module: null };
}

export default function CourseComposer({ courseId }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { data: course, isLoading, isError } = useInstructorCourse(courseId);

  const [view, setView] = useState("lesson");
  const [selectedLessonId, setSelectedLessonId] = useState(
    searchParams.get("lessonId") || null,
  );

  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiModalScope, setAiModalScope] = useState("COURSE");
  const [aiContext, setAiContext] = useState({});

  const createModule = useCreateModule();
  const createLesson = useCreateLesson();
  const isSaving = useIsMutating() > 0;

  useEffect(() => {
    if (!course || selectedLessonId) return;
    const firstLesson = course.modules?.[0]?.lessons?.[0];
    if (firstLesson?.id) setSelectedLessonId(firstLesson.id);
  }, [course?.id, selectedLessonId]);

  const selectLesson = (lessonId) => {
    setView("lesson");
    setSelectedLessonId(lessonId);
    router.replace(`/instructor/courses/${courseId}/composer?lessonId=${lessonId}`);
  };

  const openAiAssistant = (scope = "COURSE", context = {}) => {
    setAiModalScope(scope);
    setAiContext({ courseId, courseTitle: course?.title, ...context });
    setAiModalOpen(true);
  };

  const handleApplyAiGeneratedData = async (generatedData, scope) => {
    console.log("[Composer] Applying AI generated data:", scope, generatedData);

    try {
      if (scope === "MODULE" && generatedData?.title) {
        const newMod = await createModule.mutateAsync({
          courseId,
          title: generatedData.title,
          description: generatedData.description || "",
        });

        // Add lessons if returned in generated module
        if (newMod?.id && Array.isArray(generatedData.lessons)) {
          for (let i = 0; i < generatedData.lessons.length; i++) {
            const l = generatedData.lessons[i];
            await createLesson.mutateAsync({
              moduleId: newMod.id,
              title: l.title || `Lesson ${i + 1}`,
              description: l.description || "",
              order: i + 1,
            });
          }
        }
      } else if (scope === "COURSE" && Array.isArray(generatedData?.modules)) {
        const existingModules = course?.modules || [];
        let orderOffset = existingModules.length > 0 ? Math.max(...existingModules.map((m) => m.order)) : 0;

        for (let mIdx = 0; mIdx < generatedData.modules.length; mIdx++) {
          const modDef = generatedData.modules[mIdx];
          orderOffset += 1;

          const createdMod = await createModule.mutateAsync({
            courseId,
            title: modDef.title || `Module ${orderOffset}`,
            description: modDef.description || "",
            order: orderOffset,
          });

          if (createdMod?.id && Array.isArray(modDef.lessons)) {
            for (let lIdx = 0; lIdx < modDef.lessons.length; lIdx++) {
              const lesDef = modDef.lessons[lIdx];
              await createLesson.mutateAsync({
                moduleId: createdMod.id,
                title: lesDef.title || `Lesson ${lIdx + 1}`,
                description: lesDef.description || "",
                order: lIdx + 1,
              });
            }
          }
        }
      }

      // Refresh instructor course query
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.INSTRUCTOR_COURSE, courseId],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.MODULES, courseId],
      });
    } catch (err) {
      console.error("Error applying AI generated structure:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader />
      </div>
    );
  }

  if (isError || !course) {
    return (
      <div className="text-center py-24 text-muted-foreground">
        Could not load this course.
      </div>
    );
  }

  const { lesson, module: parentModule } = findLessonAndModule(course, selectedLessonId);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-background/50 backdrop-blur-md px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <LayoutTemplate size={16} className="text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Course Composer
            </p>
            <h1 className="text-sm font-bold text-foreground truncate">{course.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => openAiAssistant("COURSE")}
            className="px-3 py-1.5 text-xs font-semibold bg-primary rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            style={{ "--btn-rainbow-fill": "#7C3AED" }}
          >
            <Sparkles size={13} className="fill-current animate-pulse" />
            <span>Ask OTree AI</span>
          </button>

          <span
            className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${
              isSaving
                ? "text-amber-400 bg-amber-950/30 border border-amber-800/60"
                : "text-emerald-400 bg-emerald-950/30 border border-emerald-800/60"
            }`}
          >
            {isSaving ? "Saving…" : "Synced"}
          </span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-5 items-start">
        <ComposerSidebar
          course={course}
          courseId={courseId}
          selectedLessonId={selectedLessonId}
          view={view}
          onSelectLesson={selectLesson}
          onSelectSettings={() => setView("settings")}
          onOpenAiAssistant={(scope, ctx) => openAiAssistant(scope, ctx)}
        />

        <main className="flex-1 min-w-0 w-full rounded-2xl border border-border bg-background/50 backdrop-blur-md p-6">
          {view === "settings" ? (
            <CourseMetaPanel course={course} courseId={courseId} />
          ) : lesson ? (
            <LessonCanvas
              lesson={lesson}
              moduleId={parentModule.id}
              courseId={courseId}
              onOpenAiAssistant={(scope, ctx) => openAiAssistant(scope, ctx)}
            />
          ) : (
            <div className="text-center py-16 text-muted-foreground text-sm space-y-3">
              <p>Select or add a lesson from the Course Map to start building content.</p>
              <button
                type="button"
                onClick={() => openAiAssistant("MODULE")}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-xl transition"
              >
                <Sparkles size={13} />
                <span>Generate Module with AI</span>
              </button>
            </div>
          )}
        </main>
      </div>

      <AiComposerModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        initialScope={aiModalScope}
        contextData={aiContext}
        onApply={handleApplyAiGeneratedData}
      />
    </div>
  );
}
