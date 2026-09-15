import LandingNavbar from "@/components/layouts/LandingNavbar";
import Hero from "@/components/home/Hero";
import GoalCategoryDiscovery from "@/components/home/GoalCategoryDiscovery";
import CourseDiscovery from "@/components/home/CourseDiscovery";
import LearningExperience from "@/components/home/LearningExperience";
import OutcomeSection from "@/components/home/OutcomeSection";
import FinalCta from "@/components/home/FinalCta";
import Footer from "@/components/layouts/Footer";
import { AiAssistantWidget } from "@/features/ai-assistant/components";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      <LandingNavbar />

      {/* Each section below owns its own vertical rhythm and, where it needs
          to read as a distinct scene, its own full-bleed background band —
          sections are no longer forced into one shared tight spacing rail. */}

      {/* Scene 1: Hero */}
      <Hero />

      {/* Scene 2: Explore by domain — compact, supporting */}
      <GoalCategoryDiscovery />

      {/* Scene 3: Course discovery — supporting grid of real courses */}
      <CourseDiscovery />

      {/* Scene 4: Why Orange Tree is different — one unified product story */}
      <LearningExperience />

      {/* Scene 5: Outcome — completion & certificate */}
      <OutcomeSection />

      {/* Scene 6: Final CTA */}
      <FinalCta />

      <Footer />

      <AiAssistantWidget scopeHint="GUEST" />
    </main>
  );
}
