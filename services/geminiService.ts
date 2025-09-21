// FIX: Refactored to use the @google/genai SDK, adhering to security and API guidelines.
import { GoogleGenAI, Type } from "@google/genai";
import type { AnalysisReport, StockAnalysisReport } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const MODEL_NAME = 'gemini-2.5-flash';

// --- Topic Analysis Service ---

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING, description: "关于核心事件或主题的1-3句话摘要。" },
    analysis: {
      type: Type.OBJECT,
      properties: {
        macroPolicy: { type: Type.STRING, description: "分析该事件与当前宏观经济环境和相关政策的关联。" },
        industryChain: {
          type: Type.OBJECT,
          description: "产业链分析",
          properties: {
            upstream: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: { name: { type: Type.STRING }, description: { type: Type.STRING } }
              }
            },
            midstream: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: { name: { type: Type.STRING }, description: { type: Type.STRING } }
              }
            },
            downstream: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: { name: { type: Type.STRING }, description: { type: Type.STRING } }
              }
            }
          }
        },
        companyFundamentals: { type: Type.STRING, description: "分析事件对核心公司的财务、技术、市场地位可能产生的正面或负面影响。" },
        marketSentiment: {
          type: Type.OBJECT,
          properties: {
            sentiment: { type: Type.STRING, enum: ["Positive", "Neutral", "Negative"] },
            description: { type: Type.STRING }
          }
        }
      },
      required: ['macroPolicy', 'industryChain', 'companyFundamentals', 'marketSentiment']
    },
    investmentStrategy: {
      type: Type.OBJECT,
      properties: {
        logic: { type: Type.STRING, description: "基于四维一体分析凝练出的核心投资逻辑。" },
        suggestion: { type: Type.STRING, description: "策略建议，例如是短期交易型机会还是长期价值布局。" },
        risks: { type: Type.STRING, description: "明确提示可能面临的潜在风险。" }
      },
      required: ['logic', 'suggestion', 'risks']
    },
    recommendedStocks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          ticker: { type: Type.STRING },
          market: { type: Type.STRING, enum: ["A-Share", "Hong Kong", "US", "Other"] },
          reason: { type: Type.STRING },
          relevance: { type: Type.STRING, enum: ["High", "Medium", "Low"] }
        },
        required: ['name', 'ticker', 'market', 'reason', 'relevance']
      }
    }
  },
  required: ['summary', 'analysis', 'investmentStrategy', 'recommendedStocks']
};

export const getAnalysis = async (topic: string): Promise<AnalysisReport> => {
    try {
        const prompt = `
          你是一位专业的金融分析师，专长于投资研究。你的任务是使用“四维一体立体化挖掘法”来分析所提供的财经新闻、主题或文本。你的分析必须具有时效性，请结合最新的网络信息和市场数据进行。基于你的分析，请提供一份结构化的投资策略报告。

          “四维一体立体化挖掘法”包含以下四个维度：
          1.  宏观与政策面 (macroPolicy)
          2.  行业与产业链 (industryChain)
          3.  公司基本面 (companyFundamentals)
          4.  市场情绪与催化剂 (marketSentiment)

          这是需要分析的文本：
          ---
          ${topic}
          ---

          请立即生成完整的分析报告。
        `;
        
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: analysisSchema,
            },
        });
        
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as AnalysisReport;
    } catch (error) {
        console.error('Error in getAnalysis:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        throw new Error(`Failed to get analysis. Reason: ${errorMessage}`);
    }
};

// --- Stock Analysis Service ---

const stockAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        companyProfile: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING },
                ticker: { type: Type.STRING },
                exchange: { type: Type.STRING },
                sector: { type: Type.STRING },
                industry: { type: Type.STRING },
                summary: { type: Type.STRING },
            },
            required: ['name', 'ticker', 'exchange', 'sector', 'industry', 'summary']
        },
        financialSummary: {
            type: Type.OBJECT,
            properties: {
                period: { type: Type.STRING },
                highlights: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            metric: { type: Type.STRING },
                            value: { type: Type.STRING },
                            comment: { type: Type.STRING },
                        },
                        required: ['metric', 'value', 'comment']
                    }
                }
            },
            required: ['period', 'highlights']
        },
        swotAnalysis: {
            type: Type.OBJECT,
            properties: {
                strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
                opportunities: { type: Type.ARRAY, items: { type: Type.STRING } },
                threats: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['strengths', 'weaknesses', 'opportunities', 'threats']
        },
        investmentThesis: {
            type: Type.OBJECT,
            properties: {
                bull: { type: Type.STRING },
                bear: { type: Type.STRING },
                conclusion: { type: Type.STRING },
            },
            required: ['bull', 'bear', 'conclusion']
        },
        riskAnalysis: {
            type: Type.OBJECT,
            properties: {
                level: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
                description: { type: Type.STRING },
                factors: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['level', 'description', 'factors']
        },
        corporateGovernance: {
            type: Type.OBJECT,
            properties: {
                summary: { type: Type.STRING },
            },
            required: ['summary']
        },
        esgRating: {
            type: Type.OBJECT,
            properties: {
                rating: { type: Type.STRING },
                summary: { type: Type.STRING },
            },
            required: ['rating', 'summary']
        }
    },
    required: ['companyProfile', 'financialSummary', 'swotAnalysis', 'investmentThesis', 'riskAnalysis', 'corporateGovernance', 'esgRating']
};


export const getStockAnalysis = async (stockQuery: string): Promise<StockAnalysisReport> => {
    try {
        const prompt = `
          你是一位顶级的股票研究分析师，拥有多年的金融市场经验。你的任务是针对给定的股票（通过名称或代码识别）提供一份全面、深入、客观的综合分析报告。

          为确保报告的时效性，请务必结合最新的网络搜索结果、市场数据和相关新闻进行分析。
          
          你的分析需要包含以下几个核心部分：
          1.  公司概况 (Company Profile)
          2.  财务摘要 (Financial Summary)
          3.  SWOT 分析
          4.  投资论点 (Investment Thesis)
          5.  风险分析 (Risk Analysis)
          6.  公司治理 (Corporate Governance)
          7.  ESG 评级 (ESG Rating)

          分析的股票是:
          ---
          ${stockQuery}
          ---

          请立即生成完整的分析报告。
        `;
        
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: stockAnalysisSchema,
            },
        });
        
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as StockAnalysisReport;
    } catch (error) {
        console.error('Error in getStockAnalysis:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        throw new Error(`Failed to get stock analysis. Reason: ${errorMessage}`);
    }
};
