import HeroSection from "./components/HeroSection";
import MissionSection from "./components/MissionSection";
import FeaturesSection from "./components/FeaturesSection";
import TeamSection from "./components/TeamSection";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gray-100">
      <HeroSection />

      <MissionSection />

      <FeaturesSection />

      <TeamSection />
    </main>
  );
}