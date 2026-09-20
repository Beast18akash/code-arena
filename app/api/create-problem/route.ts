import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { getCurrentUserData, currentUserRole } from "@/modules/auth/actions";
import { getJudge0languageId, pollBatchResult, submitToJudge0 } from "@/lib/judge0";
import { prisma } from "@/lib/db";
import { Problem } from "@/lib/generated/prisma/client";

export async function POST(request: Request) {
  try {
    const userRole = await currentUserRole();
    const userData = await getCurrentUserData();

    if(!userRole || !userData){
      return NextResponse.json({ error: "You are not logged in " }, { status: 401 });
    }

    if (userRole !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Not authorized to create problem" }, { status: 401 });
    }

    const {title , description , difficulty , tags , examples , constraints ,testCases , codeSnippet , referenceSolutions ,} = await request.json();

    if (!title || !description || !difficulty || !tags || !examples || !constraints || !testCases || !codeSnippet || !referenceSolutions) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if(!Array.isArray(testCases) || testCases.length === 0){
      return NextResponse.json({ error: "At least one test case is required" }, { status: 400 });
    }


    for(const  [language, solutionCode] of Object.entries(referenceSolutions)){
      // get the Judge0 language ID for the given language
      const languageId = getJudge0languageId(language);
      // prepare judge0 submission for all test cases
      const submissions = testCases.map(testCase => ({
        language_id: languageId,
        source_code: solutionCode,
        stdin: testCase.input,
        expected_output: testCase.output,
      }));

// submit all submissions in one batch
      const submissionResponse = await submitToJudge0(submissions);

//  Extract tokens from response
const tokens = submissionResponse.map((res:any)=>res.token)


// POll judge0 untill all submissions are done
const results = await pollBatchResult(tokens)
// check if all test cases pass
for(let i=0;i<results.length;i++){
  const result = results[i];
  // 
  if(result.status.id !==3){
    return NextResponse.json({error:`Validation failed for${language}`, testCases:{
      input : submissions[i].stdin,
      expectedOutput: submissions[i].expected_output,
      actualOutput: result.stdout ,
      error : result.stderr || result.compile_output
    },
    details :result ,
  },
   {status:400});
  }
}
    }

const newProblem = await prisma.problem.create({
  data:{
    title,
    description,
    difficulty,
    tags,
    example: examples,
    constraints,
    testCases,
    codeSnippets: codeSnippet,
    referenceSolutions,
    userId: userData.id,
  }
})

return NextResponse.json({ success: true, message:"Problem created successfully" , data:newProblem} , {status:201})

  } catch (error) {
    console.error("Error creating problem:", error);
    return NextResponse.json(
      { error: "Failed to create problem" },
      { status: 500 }
    );
  }
}