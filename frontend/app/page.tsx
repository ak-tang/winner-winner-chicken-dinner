import ConstraintForm from "@/components/ConstraintForm";

export default function Home() {
  return (
    <main className="flex-1 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <div className="text-6xl mb-4">🐔</div>
          <h1 className="text-4xl font-bold text-green-900 mb-2 tracking-tight">
            Winner Winner Chicken Dinner
          </h1>
          <p className="text-stone-500 text-lg">
            Tell us about your dinner party and we&apos;ll craft the perfect menu.
          </p>
        </div>
        <ConstraintForm />
      </div>
    </main>
  );
}
