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
        keyTakeaways: [
            "浏览器成为 AI 的新入口：AI 正在从聊天框走向更广泛的应用场景，浏览器是其落地并与用户交互的关键平台。",
            "Agent 模式潜力巨大：通过模拟用户操作网页，AI Agent 能够自动化复杂任务，为生产力工具和新商业模式带来想象空间。",
            "挑战现有巨头：Atlas 浏览器直接对标 Google Chrome 和 Microsoft Edge，意图通过 AI 功能争夺用户和市场份额。",
            "利好 AI 基础设施供应商：AI 应用的普及将进一步推高对算力（如 GPU）和云服务的需求。"
        ],
        investmentScore: {
            score: 88,
            reason: "该产品代表了 AI 应用演进的重要方向，市场想象空间巨大，且由行业领导者 OpenAI 推出，成功概率较高。但仍面临技术、生态和监管挑战。"
        },
        analysis: {
            macroPolicy: "随着 AI Agent 越来越多地处理个人数据和执行网络操作，各国监管机构可能会加强对数据隐私、算法透明度和潜在网络安全风险的审查。此外，大型科技公司利用 AI 巩固其生态系统优势，也可能引发新的反垄断担忧。",
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
            companyFundamentals: "此举是 OpenAI 商业化战略的关键一步，旨在将其 AI 技术从单一的聊天接口扩展到更广泛的平台，创造新的订阅收入来源并构建强大的用户生态。这反映了公司从技术驱动向产品和平台驱动的转变。",
            marketSentiment: {
                sentiment: "Positive",
                description: "市场普遍对此持积极态度，认为这是 AI 应用落地的重大创新。Agent 模式和记忆功能被视为核心亮点，引发了对“AI原生浏览器”的广泛讨论和期待。催化剂包括 Windows 版本的发布、Agent 功能的增强以及与 ChatGPT Plus 订阅的深度绑定。"
            }
        },
        marketSizeAndOutlook: "全球浏览器市场由少数巨头主导，但 AI 的出现带来了新的变量。AI 浏览器不仅是信息入口，更是个人智能助理。未来，浏览器可能成为管理个人数字生活和工作的核心中枢，市场规模巨大。其前景取决于 Agent 功能的成熟度、生态系统的建立以及用户习惯的迁移。",
        investmentStrategy: {
            logic: "核心逻辑是投资于“AI淘金热中的卖铲人”。无论哪个 AI 应用最终胜出，提供底层算力和平台的公司都将受益。同时，关注现有浏览器巨头为应对竞争所采取的防御性创新。",
            suggestion: "建议重点关注 AI 基础设施的核心供应商，并适度配置浏览器市场的现有领导者，以对冲其潜在的被颠覆风险和其自身的 AI 转型潜力。",
            risks: "主要风险包括：Agent 技术成熟度不及预期、用户接受度低、强大的竞争对手（如谷歌、微软）迅速模仿并利用其现有优势进行反击、以及潜在的监管风险。"
        },
        allocationCadenceAndOutlook: "短期内，市场热情较高，相关概念股可能有溢价。建议在产品发布更多平台版本、用户数据初步验证后分批建仓。长期来看，AI 与各类终端的结合是大势所趋，浏览器是其中的关键一环，值得长期关注和配置。",
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
        },
        associationAnalysis: {
            relatedStocks: [
                { name: "微软", ticker: "MSFT", reason: "OpenAI 的主要战略投资者和技术合作伙伴。" },
                { name: "谷歌", ticker: "GOOGL", reason: "Chrome 浏览器的开发者，是 Atlas 的主要竞争对手。" }
            ],
            relatedTopics: [
                { name: "AI Agent", reason: "Atlas 浏览器的核心功能之一，是实现自动化操作的关键技术。" },
                { name: "浏览器大战", reason: "AI 的加入可能引发新一轮的浏览器市场份额争夺战。" }
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
        keyTakeaways: [
            "Browsers as a new entry point for AI: AI is moving beyond chatbots to broader applications, with browsers being a key platform for user interaction.",
            "Huge potential in Agent mode: By simulating user actions, AI Agents can automate complex tasks, opening up possibilities for productivity tools and new business models.",
            "Challenging existing giants: Atlas directly competes with Google Chrome and Microsoft Edge, aiming to capture users and market share through AI features.",
            "Beneficial for AI infrastructure providers: The proliferation of AI applications will further drive demand for computing power (like GPUs) and cloud services."
        ],
        investmentScore: {
            score: 88,
            reason: "This product represents a significant direction in the evolution of AI applications with vast market potential. Launched by industry leader OpenAI, it has a high probability of success, but still faces technical, ecological, and regulatory challenges."
        },
        analysis: {
            macroPolicy: "As AI Agents handle more personal data and perform web operations, regulatory agencies worldwide may increase scrutiny on data privacy, algorithmic transparency, and potential cybersecurity risks. Furthermore, large tech companies using AI to solidify their ecosystem advantages could spark new antitrust concerns.",
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
            companyFundamentals: "This move is a key step in OpenAI's commercialization strategy, aiming to expand its AI technology from a single chat interface to a broader platform, creating new subscription revenue streams and building a strong user ecosystem. It reflects the company's shift from being technology-driven to product- and platform-driven.",
            marketSentiment: {
                sentiment: "Positive",
                description: "The market is generally positive, viewing this as a major innovation in AI application deployment. The Agent mode and memory function are seen as core highlights, sparking widespread discussion and anticipation for 'AI-native browsers'. Catalysts include the release of a Windows version, enhancement of Agent capabilities, and deep integration with the ChatGPT Plus subscription."
            }
        },
        marketSizeAndOutlook: "The global browser market is dominated by a few giants, but AI introduces new variables. An AI browser is not just an information portal but a personal intelligent assistant. In the future, browsers could become the central hub for managing personal digital life and work, representing a massive market size. Its outlook depends on the maturity of Agent functionality, the establishment of an ecosystem, and the migration of user habits.",
        investmentStrategy: {
            logic: "The core logic is to invest in the 'picks and shovels' of the AI gold rush. Regardless of which AI application ultimately wins, the companies providing the underlying computing power and platforms will benefit. At the same time, pay attention to the defensive innovations of existing browser giants.",
            suggestion: "It is recommended to focus on core AI infrastructure suppliers and moderately allocate to existing leaders in the browser market to hedge against potential disruption and capitalize on their own AI transformation potential.",
            risks: "Key risks include: Agent technology not maturing as expected, low user adoption, strong competitors (like Google, Microsoft) quickly imitating and leveraging their existing advantages to counter, and potential regulatory risks."
        },
        allocationCadenceAndOutlook: "In the short term, market enthusiasm is high, and related concept stocks may be at a premium. It is advisable to build positions in batches after more platform versions are released and initial user data is validated. In the long term, the integration of AI with various terminals is a major trend, and the browser is a key part of it, deserving long-term attention and allocation.",
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
        },
        associationAnalysis: {
            relatedStocks: [
                { name: "Microsoft", ticker: "MSFT", reason: "OpenAI's main strategic investor and technology partner." },
                { name: "Google", ticker: "GOOGL", reason: "Developer of the Chrome browser and Atlas's main competitor." }
            ],
            relatedTopics: [
                { name: "AI Agent", reason: "A core feature of the Atlas browser and the key technology for enabling automated operations." },
                { name: "Browser Wars", reason: "The introduction of AI could trigger a new round of competition for browser market share." }
            ]
        }
    }
};

export const getCaseStudyData = (locale: Locale): CaseStudy => {
    return locale === 'zh' ? CASE_STUDY_DATA_ZH : CASE_STUDY_DATA_EN;
}
