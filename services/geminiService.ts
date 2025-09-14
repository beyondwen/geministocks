
import type { AnalysisReport } from '../types';

export const getAnalysis = async (topic: string): Promise<AnalysisReport> => {
  // The frontend now calls our own serverless function (API proxy)
  // which will then call the Gemini API securely.
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ topic }),
  });

  if (!response.ok) {
    // Try to parse the error message from our API proxy
    try {
      const errorData = await response.json();
      throw new Error(errorData.error || `请求分析失败，状态码：${response.status}`);
    } catch (e) {
      throw new Error(`请求分析失败，状态码：${response.status}`);
    }
  }

  const result: AnalysisReport = await response.json();
  return result;
};
