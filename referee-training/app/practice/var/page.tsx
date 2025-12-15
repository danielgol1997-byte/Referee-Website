import { Card } from "@/components/ui/card";
import { TestStarter } from "@/components/test/test-starter";

export default function VarPracticePage() {
  return (
    <div className="mx-auto max-w-screen-md px-6 py-10 space-y-4">
      <Card className="space-y-3">
        <p className="text-sm uppercase tracking-[0.12em] text-neutrals-textOnLightSecondary">
          VAR practice
        </p>
        <h1 className="text-2xl font-bold text-neutrals-textOnLightPrimary">
          Select the referee decision and VAR recommendation.
        </h1>
        <p className="text-neutrals-textOnLightSecondary">
          Each clip requires two answers: on-field decision and VAR recommendation (Intervention / Check complete).
        </p>
        <TestStarter
          endpoint="/api/tests/start"
          redirectBase="/practice/var"
          payload={{ categoryType: "VAR", type: "VAR_CLIP" }}
          label="Start VAR practice"
        />
      </Card>
    </div>
  );
}

