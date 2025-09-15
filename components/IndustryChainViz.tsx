import React from 'react';
import type { IndustryChain, IndustryChainNode } from '../types';

const NodeCard: React.FC<{ node: IndustryChainNode }> = ({ node }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow w-full">
        <h5 className="font-semibold text-sm text-gray-800">{node.name}</h5>
        <p className="text-xs text-gray-600 mt-1">{node.description}</p>
    </div>
);

const Branch: React.FC<{ title: string, nodes: IndustryChainNode[], color: string }> = ({ title, nodes, color }) => {
    if (!nodes || nodes.length === 0) {
        return null;
    }

    const branchColorStyle = {
        'blue': { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800' },
        'purple': { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800' },
        'green': { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800' },
    }[color] || { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-800' };

    return (
        <div className={`flex-1 min-w-[200px] ${branchColorStyle.bg} border-t-4 ${branchColorStyle.border} rounded-lg p-4 flex flex-col`}>
            <h4 className={`text-lg font-bold text-center mb-4 ${branchColorStyle.text}`}>{title}</h4>
            <div className="space-y-3">
                {nodes.map((node, index) => (
                    <NodeCard key={index} node={node} />
                ))}
            </div>
        </div>
    );
};

// New component for the animated arrow connector
const ArrowConnector: React.FC = () => (
    <>
        {/* Arrow for mobile view (vertical layout) */}
        <div className="flex md:hidden justify-center items-center my-2 text-gray-400">
            <svg className="w-8 h-8 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
        </div>
        {/* Arrow for desktop view (horizontal layout) */}
        <div className="hidden md:flex justify-center items-center mx-2 text-gray-400">
            <svg className="w-10 h-10 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
        </div>
    </>
);

interface IndustryChainVizProps {
  chain: IndustryChain;
}

const IndustryChainViz: React.FC<IndustryChainVizProps> = ({ chain }) => {
  const hasUpstream = chain.upstream && chain.upstream.length > 0;
  const hasMidstream = chain.midstream && chain.midstream.length > 0;
  const hasDownstream = chain.downstream && chain.downstream.length > 0;

  return (
    <div className="mt-4 font-sans">
        <div className="flex flex-col md:flex-row justify-center items-stretch">
            {hasUpstream && <Branch title="上游 ⬆️" nodes={chain.upstream} color="blue" />}
            
            {hasUpstream && hasMidstream && <ArrowConnector />}

            {hasMidstream && <Branch title="中游 ↔️" nodes={chain.midstream} color="purple" />}

            {hasMidstream && hasDownstream && <ArrowConnector />}
            
            {hasDownstream && <Branch title="下游 ⬇️" nodes={chain.downstream} color="green" />}
        </div>
    </div>
  );
};

export default IndustryChainViz;
