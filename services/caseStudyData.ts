
import type { AnalysisReport } from '../types';
import type { Locale } from '../hooks/useI18n';

interface CaseStudy {
    topic: string;
    report: AnalysisReport;
}

const CASE_STUDY_DATA_ZH: CaseStudy = {
    topic: `OpenAI 发布 ChatGPT Atlas 浏览器：
- 基于 Chromium，内嵌 ChatGPT 入口
- 支持一键对网页提问、对选中部分用 GPT 修改
- 支持基于浏览器的记忆功能
- 支持 Agent 模式，使用 GPT 对网页进行操作（需要 ChatGPT 付费订阅）
- macOS 版现已可用，其他平台仍在开发`,
    report: {
        summary: "OpenAI 发布的 ChatGPT Atlas 浏览器，深度集成了 ChatGPT 功能，通过 Agent 模式和记忆功能，预示着浏览器将从信息获取工具向智能操作平台演变，可能重塑浏览器市场格局，对谷歌等现有巨头构成挑战。",
        investmentScore: {
            score: 88,
            reason: "该产品代表了 AI 应用演进的重要方向，市场想象空间巨大，且由行业领导者 OpenAI 推出，成功概率较高。但仍面临技术、生态和监管挑战。"
        },
        analysis: {
            // Removed redundant macroPolicy and companyFundamentals from the visual layer
            industryChain: {
                upstream: [
                    { name: "AI 模型提供商", description: "OpenAI 提供核心的 GPT 模型能力。" },
                    { name: "云计算服务", description: "微软 Azure 等为 AI 模型的训练和推理提供算力支持。" }
                ],
                midstream: [
                    { name: "浏览器内核", description: "基于谷歌的开源项目 Chromium，降低了开发门槛。" },
                    { name: "浏览器开发商", description: "OpenAI 负责将 AI 功能与浏览器整合，打造最终产品。" }
                ],
                downstream: [
                    { name: "终端用户", description: "普通消费者和专业人士，利用 AI 提升网页浏览和工作效率。" },
                    { name: "开发者生态", description: "第三方开发者可能基于 Agent 功能开发新的插件和应用。" }
                ]
            },
            marketSentiment: {
                sentiment: "Positive",
                description: "市场普遍对此持积极态度，认为这是 AI 应用落地的重大创新。"
            }
        },
        marketSizeAndOutlook: {
            narrative: "全球浏览器市场由少数巨头主导，但 AI 的出现带来了新的变量。AI 浏览器不仅是信息入口，更是个人智能助理。未来，浏览器可能成为管理个人数字生活和工作的核心中枢，市场规模巨大。",
            tamSamSom: {
                TAM: "约3000亿美元 (全球数字广告市场)",
                SAM: "约500亿美元 (AI 驱动的生产力软件市场)",
                SOM: "约50亿美元 (初期 AI 浏览器及插件市场)",
                sourceOrMethodology: "基于现有市场报告和增长预测的估算"
            }
        },
        competitiveLandscape: {
            summary: "OpenAI 凭借其模型优势，在 AI 原生功能上领先，但 Google 拥有庞大的用户基础和生态系统。Atlas 试图通过差异化体验突围。",
            keyPlayers: [
                { name: "Google", marketShare: "65%", techAdvantage: "庞大生态与 Chrome 垄断地位", revenueGrowth: "稳健", grossMargin: "高", stockPerformance: "+15%" },
                { name: "Microsoft", marketShare: "5%", techAdvantage: "OpenAI 合作与 Copilot 整合", revenueGrowth: "快速", grossMargin: "高", stockPerformance: "+20%" },
                { name: "OpenAI (Atlas)", marketShare: "<1%", techAdvantage: "最强 LLM 能力与 Agent", revenueGrowth: "极快", grossMargin: "N/A", stockPerformance: "N/A" }
            ]
        },
        catalystTracker: {
            recentNews: [
                 { date: "2025-02-01", description: "OpenAI 正式发布 ChatGPT Atlas macOS 版。", impact: "Positive" },
                 { date: "2025-02-05", description: "Google 宣布 Chrome 将深度集成 Gemini 2.0。", impact: "Neutral" }
            ],
            upcomingCatalysts: [
                { date: "2025-Q2", event: "发布 Windows 版 Atlas 浏览器" },
                { date: "2025-Q3", event: "开放 Agent 插件商店" }
            ]
        },
        policyAnalysis: {
            keyBodies: ["FTC (美国)", "欧盟委员会"],
            currentPolicies: "关注大型科技公司对 AI 生态系统的垄断倾向。",
            assessment: "Headwind",
            potentialChanges: "随着 AI Agent 越来越多地处理个人数据和执行网络操作，各国监管机构可能会加强对数据隐私、算法透明度和潜在网络安全风险的审查。"
        },
        techTrajectory: {
            coreTech: "基于 LLM 的网页理解与自动化操作 (Agent)。",
            maturity: "Emerging",
            innovationTrends: ["多模态交互", "端侧模型推理", "跨应用操作"],
            moatAnalysis: "技术领先是其核心护城河，但浏览器内核依赖 Chromium 是潜在制约。"
        },
        scenarioAnalysis: [
            {
                scenario: "Bull Case",
                description: "Agent 功能大获成功，形成强大的插件生态，迅速抢占 20% 以上的浏览器市场份额，成为新的流量入口。",
                probability: 0.25,
                keyDrivers: ["Agent 技术实现突破", "Windows 版本顺利推出", "开发者社区积极响应"]
            },
            {
                scenario: "Base Case",
                description: "Atlas 浏览器在特定用户群（如开发者、内容创作者）中获得欢迎，占据 5-10% 的市场份额，迫使竞争对手加速整合 AI。",
                probability: 0.60,
                keyDrivers: ["AI 功能稳定迭代", "与付费订阅模式结合良好", "市场营销有效"]
            },
            {
                scenario: "Bear Case",
                description: "用户体验不佳，Agent 功能受限，谷歌等巨头迅速推出功能更强、整合更深的产品，Atlas 浏览器最终边缘化。",
                probability: 0.15,
                keyDrivers: ["技术瓶颈", "用户隐私担忧", "竞争对手的强力反击"]
            }
        ],
        investmentStrategy: {
            logic: "核心逻辑是投资于“AI淘金热中的卖铲人”。无论哪个 AI 应用最终胜出，提供底层算力和平台的公司都将受益。同时，关注现有浏览器巨头为应对竞争所采取的防御性创新。",
            suggestion: "建议重点关注 AI 基础设施的核心供应商，并适度配置浏览器市场的现有领导者，以对冲其潜在的被颠覆风险和其自身的 AI 转型潜力。",
            timeHorizons: {
                shortTerm: "关注产品发布和用户反馈带来的市场情绪波动，相关概念股可能有交易性机会。",
                mediumTerm: "观察用户增长数据和开发者生态的形成情况，验证其市场潜力。",
                longTerm: "长期持有 AI 基础设施的核心资产，并根据市场格局变化调整对浏览器厂商的配置。"
            }
        },
        tieredSuggestions: {
            coreHoldings: [
                { name: "微软", ticker: "MSFT", market: "US", reason: "作为 OpenAI 的主要合作伙伴和云服务提供商，深度受益于 AI 应用的普及。同时其 Edge 浏览器也在积极整合 AI。", relevance: "High" }
            ],
            strategicSatellites: [
                { name: "英伟达", ticker: "NVDA", market: "US", reason: "AI Agent 的复杂交互和推理需要强大的 GPU 算力支持，英伟达是该领域的绝对领导者。", relevance: "Medium" },
                { name: "谷歌", ticker: "GOOGL", market: "US", reason: "作为现有浏览器和搜索市场的霸主，既是潜在的受损者，也是最强大的反击者。其 Gemini AI 与 Chrome 的整合值得关注。", relevance: "Medium" }
            ],
            watchlist: [
                { name: "The Browser Company", ticker: "Private", market: "Other", reason: "其开发的 Arc 浏览器是 AI 浏览器领域的创新先锋，代表了行业的新方向，值得关注其发展动态。", relevance: "Low" }
            ]
        }
    }
};

const CASE_STUDY_DATA_EN: CaseStudy = {
    topic: `OpenAI Releases ChatGPT Atlas Browser:
- Based on Chromium, with a built-in ChatGPT entry point
- Supports one-click questioning of web pages and GPT-based editing of selected text
- Supports browser-based memory functionality
- Supports Agent mode to operate web pages using GPT (requires ChatGPT premium subscription)
- macOS version is now available, other platforms are under development`,
    report: {
        summary: "OpenAI's release of the ChatGPT Atlas browser, which deeply integrates ChatGPT features, signals a shift for browsers from information access tools to intelligent operating platforms. Through its Agent mode and memory function, it could reshape the browser market and challenge existing giants like Google.",
        investmentScore: {
            score: 88,
            reason: "This product represents a significant direction in the evolution of AI applications with vast market potential. Launched by industry leader OpenAI, it has a high probability of success, but still faces technical, ecological, and regulatory challenges."
        },
        analysis: {
            industryChain: {
                upstream: [
                    { name: "AI Model Provider", description: "OpenAI provides the core GPT model capabilities." },
                    { name: "Cloud Computing Services", description: "Microsoft Azure and others provide the computing power for AI model training and inference." }
                ],
                midstream: [
                    { name: "Browser Engine", description: "Based on Google's open-source Chromium project, which lowers the development barrier." },
                    { name: "Browser Developer", description: "OpenAI is responsible for integrating AI features with the browser to create the final product." }
                ],
                downstream: [
                    { name: "End Users", description: "General consumers and professionals who use AI to enhance web browsing and work efficiency." },
                    { name: "Developer Ecosystem", description: "Third-party developers may create new plugins and applications based on the Agent functionality." }
                ]
            },
            marketSentiment: {
                sentiment: "Positive",
                description: "The market is generally positive, viewing this as a major innovation in AI application deployment."
            }
        },
        marketSizeAndOutlook: {
            narrative: "The global browser market is dominated by a few giants, but AI introduces new variables. An AI browser is not just an information portal but a personal intelligent assistant. In the future, browsers could become the central hub for managing personal digital life and work, representing a massive market size.",
            tamSamSom: {
                TAM: " ~$300 Billion (Global Digital Advertising Market)",
                SAM: "~$50 Billion (AI-driven Productivity Software Market)",
                SOM: "~$5 Billion (Initial AI Browser & Plugin Market)",
                sourceOrMethodology: "Estimation based on existing market reports and growth forecasts"
            }
        },
        competitiveLandscape: {
            summary: "OpenAI leads in AI-native features, but Google has a massive user base and ecosystem. Atlas attempts to break through with a differentiated experience.",
            keyPlayers: [
                { name: "Google", marketShare: "65%", techAdvantage: "Massive ecosystem & Chrome monopoly", revenueGrowth: "Steady", grossMargin: "High", stockPerformance: "+15%" },
                { name: "Microsoft", marketShare: "5%", techAdvantage: "OpenAI partnership & Copilot", revenueGrowth: "Fast", grossMargin: "High", stockPerformance: "+20%" },
                { name: "OpenAI (Atlas)", marketShare: "<1%", techAdvantage: "Best LLM & Agent capabilities", revenueGrowth: "Very Fast", grossMargin: "N/A", stockPerformance: "N/A" }
            ]
        },
        catalystTracker: {
             recentNews: [
                 { date: "2025-02-01", description: "OpenAI officially releases ChatGPT Atlas for macOS.", impact: "Positive" },
                 { date: "2025-02-05", description: "Google announces Chrome will deeply integrate Gemini 2.0.", impact: "Neutral" }
            ],
            upcomingCatalysts: [
                { date: "2025-Q2", event: "Release of Windows version of Atlas" },
                { date: "2025-Q3", event: "Opening of Agent Plugin Store" }
            ]
        },
        policyAnalysis: {
            keyBodies: ["FTC (USA)", "European Commission"],
            currentPolicies: "Focus on monopolistic tendencies of big tech in the AI ecosystem.",
            assessment: "Headwind",
            potentialChanges: "As AI Agents handle more personal data and perform web operations, regulatory agencies worldwide may increase scrutiny on data privacy, algorithmic transparency, and potential cybersecurity risks."
        },
        techTrajectory: {
            coreTech: "LLM-based web understanding and automated operations (Agent).",
            maturity: "Emerging",
            innovationTrends: ["Multimodal interaction", "On-device model inference", "Cross-application operations"],
            moatAnalysis: "Technological leadership is its core moat, but dependence on Chromium is a potential constraint."
        },
        scenarioAnalysis: [
            {
                scenario: "Bull Case",
                description: "The Agent feature is a massive success, forming a strong plugin ecosystem and quickly capturing over 20% of the browser market share, becoming a new traffic gateway.",
                probability: 0.25,
                keyDrivers: ["Breakthrough in Agent technology", "Successful launch of Windows version", "Positive response from the developer community"]
            },
            {
                scenario: "Base Case",
                description: "The Atlas browser gains popularity among specific user groups (like developers, content creators), capturing 5-10% market share and forcing competitors to accelerate AI integration.",
                probability: 0.60,
                keyDrivers: ["Stable iteration of AI features", "Good integration with the paid subscription model", "Effective marketing"]
            },
            {
                scenario: "Bear Case",
                description: "Poor user experience, limited Agent functionality, and rapid counter-moves by giants like Google with more powerful and deeply integrated products lead to the marginalization of the Atlas browser.",
                probability: 0.15,
                keyDrivers: ["Technical bottlenecks", "User privacy concerns", "Strong counter-attacks from competitors"]
            }
        ],
        investmentStrategy: {
            logic: "The core logic is to invest in the 'picks and shovels' of the AI gold rush. Regardless of which AI application ultimately wins, the companies providing the underlying computing power and platforms will benefit. At the same time, pay attention to the defensive innovations of existing browser giants.",
            suggestion: "It is recommended to focus on core AI infrastructure suppliers and moderately allocate to existing leaders in the browser market to hedge against potential disruption and capitalize on their own AI transformation potential.",
            timeHorizons: {
                shortTerm: "Focus on market sentiment fluctuations from product launches and user feedback; there may be trading opportunities in related concept stocks.",
                mediumTerm: "Observe user growth data and the formation of the developer ecosystem to validate its market potential.",
                longTerm: "Hold core assets in AI infrastructure for the long term and adjust allocations to browser manufacturers based on market landscape changes."
            }
        },
        tieredSuggestions: {
            coreHoldings: [
                { name: "Microsoft", ticker: "MSFT", market: "US", reason: "As OpenAI's main partner and cloud service provider, it benefits deeply from the popularization of AI applications. Its Edge browser is also actively integrating AI.", relevance: "High" }
            ],
            strategicSatellites: [
                { name: "NVIDIA", ticker: "NVDA", market: "US", reason: "The complex interactions and reasoning of AI Agents require powerful GPU computing support, and NVIDIA is the undisputed leader in this field.", relevance: "Medium" },
                { name: "Google", ticker: "GOOGL", market: "US", reason: "As the dominant player in the current browser and search markets, it is both a potential loser and the most powerful counter-attacker. The integration of its Gemini AI with Chrome is worth watching.", relevance: "Medium" }
            ],
            watchlist: [
                { name: "The Browser Company", ticker: "Private", market: "Other", reason: "Its Arc browser is an innovative pioneer in the AI browser space, representing a new direction for the industry. Its development is worth monitoring.", relevance: "Low" }
            ]
        }
    }
};

export const getCaseStudyData = (locale: Locale): CaseStudy => {
    return locale === 'zh' ? CASE_STUDY_DATA_ZH : CASE_STUDY_DATA_EN;
}
