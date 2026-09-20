import axios from "axios";
export function getJudge0languageId(language: string) {
    const languageMap = {
        "PYTHON" :71,
        "JAVASCRIPT":63,
        "JAVA":62,
    }
    return languageMap[language.toUpperCase() as keyof typeof languageMap] || null;
}

export async function submitToJudge0(submissions: any) {

const options = {
  method: 'POST',
  url: 'https://judge0-extra-ce1.p.rapidapi.com/submissions/batch',
  params: {
    base64_encoded: 'false',
  },
  headers: {
    'x-rapidapi-key': process.env.X_RAPIDAPI_KEY,
    'x-rapidapi-host': 'judge0-extra-ce1.p.rapidapi.com',
    'Content-Type': 'application/json'
  },
  data: {
    submissions: submissions
  }
}

const {data} = await axios.request(options);
return data;
}
 
export async function pollBatchResult(tokens:string[]){

while(true){
const options = {
  method: 'GET',
  url: 'https://judge0-extra-ce1.p.rapidapi.com/submissions/batch',
  params: {
    tokens: tokens.join(','),
    base64_encoded: 'true',
    fields: '*'
  },
  headers: {
    'x-rapidapi-key': process.env.X_RAPIDAPI_KEY,
    'x-rapidapi-host': 'judge0-extra-ce1.p.rapidapi.com',
    'Content-Type': 'application/json'
  }
};

const {data} = await axios.request(options);
const results = data.submissions;
const allSubmitted = results.every((sub:any)=>sub.status!==1 && sub.status!==2)

if(allSubmitted) return results;
await sleep(2000);  
}
}
export const sleep = (ms:number)=>new Promise((resolve)=>setTimeout(resolve,ms))
