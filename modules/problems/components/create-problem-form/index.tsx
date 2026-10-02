"use client";

import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ProblemFormData } from "@/modules/problems/schema";
import { FormHeader } from "./form-header";
import { useCreateProblem } from "@/hooks/use-create-problem";
import { BasicInfoSection } from "./basic-info-section";
import { TagsSection } from "./tags-section";
import { TestCasesSection } from "./test-cases-section";
import { LanguageSections } from "./language-section";
import { AdditionalInfoSection } from "./additional-info-section";

export function CreateProblemForm({
  problemId,
  initialValues,
}: {
  problemId?: string;
  initialValues?: ProblemFormData;
}) {
  const {
    form,
    testCasesArray,
    tagsArray,
    isLoading,
    isEditing,
    sampleType,
    setSampleType,
    onSubmit,
    loadSampleData,
  } = useCreateProblem({ problemId, initialValues });
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <Card className="shadow-xl">
        {/* FormHeader */}
        <FormHeader
          sampleType={sampleType}
          setSampleType={setSampleType}
          onLoadSample={loadSampleData}
          isEditing={isEditing}
        />

        <CardContent className="p-6">
          <form onSubmit={onSubmit} className="space-y-8">
            <BasicInfoSection form={form}/>
            <TagsSection form={form} tagsArray={tagsArray}/>
            <TestCasesSection form={form} testCasesArray={testCasesArray}/>
            <LanguageSections form={form}/>
              <AdditionalInfoSection form={form} />
              <SubmitButton isLoading={isLoading} isEditing={isEditing} />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


function SubmitButton({isLoading, isEditing}: { isLoading: boolean; isEditing: boolean }) {
return (
     <div className="flex justify-end mt-6">
      <Button type="submit" size="lg" disabled={isLoading} className="gap-2">
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            {isEditing ? "Saving..." : "Creating..."}
          </>
        ) : (
          <>
            {isEditing ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            {isEditing ? "Save Changes" : "Create Problem"}
          </>
        )}
      </Button>
    </div>
)
}