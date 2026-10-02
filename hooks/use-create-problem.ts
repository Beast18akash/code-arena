"use client"
"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  defaultFormValues,
  problemSchema,
  type ProblemFormData,
} from "@/modules/problems/schema";
import { SAMPLE_PROBLEMS } from "@/modules/problems/constant/sample-problem";
import { notifyApiError, notifyProblemSaved } from "@/lib/notifications";

type UseCreateProblemOptions = {
  problemId?: string;
  initialValues?: ProblemFormData;
};

type TagsArray = {
  fields: { id: string }[];
  append: (value: string) => void;
  remove: (index: number) => void;
  replace: (values: string[]) => void;
};

export function useCreateProblem({ problemId, initialValues }: UseCreateProblemOptions = {}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [sampleType, setSampleType] = useState("DP");
  const isEditing = Boolean(problemId);

  const form = useForm<ProblemFormData>({
    resolver: zodResolver(problemSchema),
    defaultValues: initialValues ?? (defaultFormValues as ProblemFormData),
  });

  const testCasesArray = useFieldArray({
    control: form.control,
    name: "testCases" as const,
  });

  const tagsArray = useFieldArray({
    control: form.control,
    name: "tags" as never,
  }) as unknown as TagsArray;

  const onSubmit = async (values: ProblemFormData) => {
    try {
      setIsLoading(true);
      const response = await fetch(
        isEditing ? `/api/problems/${problemId}` : "/api/create-problem",
        {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        notifyApiError(response.status, data.error);
        return;
      }

      notifyProblemSaved(isEditing);
      router.push("/problems");
    } catch (error) {
      console.error("Error creating problem:", error);
      notifyApiError(
        undefined,
        error instanceof Error ? error.message : undefined,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const loadSampleData = () => {
    const sampleData =
      SAMPLE_PROBLEMS[sampleType as keyof typeof SAMPLE_PROBLEMS];
    const parsedSample = problemSchema.parse(sampleData);
    tagsArray.replace(parsedSample.tags);
    testCasesArray.replace(parsedSample.testCases);
    form.reset(parsedSample);
  };

  return {
    form,
    testCasesArray,
    tagsArray,
    isLoading,
    isEditing,
    sampleType,
    setSampleType,
    onSubmit: form.handleSubmit(onSubmit),
    loadSampleData,
  };
}