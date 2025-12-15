import { Card } from "@/components/ui/card";
import { TestStarter } from "@/components/test/test-starter";

export default function ArPracticePage() {
  return (
    <div className="mx-auto max-w-screen-md px-6 py-10 space-y-4">
      <Card className="space-y-3">
        <p className="text-sm uppercase tracking-[0.12em] text-neutrals-textOnLightSecondary">
          A.R. practice
        </p>
        <h1 className="text-2xl font-bold text-neutrals-textOnLightPrimary">
          Offside and teamwork clips for assistant referees.
        </h1>
        <p className="text-neutrals-textOnLightSecondary">
          Decide correctly on offside/teamwork scenarios. Review explanations after each clip.
        </p>
        <TestStarter
          endpoint="/api/tests/start"
          redirectBase="/practice/ar"
          payload={{ categoryType: "AR", type: "AR_CLIP" }}
          label="Start A.R. practice"
        />
      </Card>
    </div>
  );
}

