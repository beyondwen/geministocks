import React, { useState } from 'react';
import type { IndustryChain, IndustryChainNode } from '../types';
import { XIcon } from './icons/Icons';

const NodeCard: React.FC<{ 
    node: IndustryChainNode; 
    onClick: () => void; 
    isSelected: boolean;
}> = ({ node, onClick, isSelected }) => (
    <button 
        onClick={onClick}
        className={`bg-white rounded-lg border p-3 shadow-sm hover:shadow-md transition-all w-full text-left focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-cyan-500 ${
            isSelected ? 'border-cyan-500 ring-2 ring-cyan-500/50' : 'border-gray-200'
        }`}
        aria-pressed={isSelected}
    >
        <h5 className="font-semibold text-sm text-gray-800">{node.name}</h5>
        <p className="text-xs text-gray-600 mt-1">{node.description}</p>
    </button>
);

const Branch: React.FC<{ 
    title: string; 
    nodes: IndustryChainNode[]; 
    color: string;
    onNodeSelect: (node: IndustryChainNode) => void;
    selectedNode: IndustryChainNode | null;
}> = ({ title, nodes, color, onNodeSelect, selectedNode }) => {
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
                    <NodeCard 
                        key={index} 
                        node={node} 
                        onClick={() => onNodeSelect(node)}
                        isSelected={selectedNode?.name === node.name && selectedNode?.description === node.description}
                    />
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
  const [selectedNode, setSelectedNode] = useState<IndustryChainNode | null>(null);

  const handleNodeSelect = (node: IndustryChainNode) => {
    // Allow toggling selection by clicking the same node again
    if (selectedNode && selectedNode.name === node.name && selectedNode.description === node.description) {
      setSelectedNode(null);
    } else {
      setSelectedNode(node);
    }
  };

  const hasUpstream = chain.upstream && chain.upstream.length > 0;
  const hasMidstream = chain.midstream && chain.midstream.length > 0;
  const hasDownstream = chain.downstream && chain.downstream.length > 0;

  return (
    <div className="mt-4 font-sans">
        <div className="flex flex-col md:flex-row justify-center items-stretch">
            {hasUpstream && <Branch title="上游 ⬆️" nodes={chain.upstream} color="blue" onNodeSelect={handleNodeSelect} selectedNode={selectedNode} />}
            
            {hasUpstream && hasMidstream && <ArrowConnector />}

            {hasMidstream && <Branch title="中游 ↔️" nodes={chain.midstream} color="purple" onNodeSelect={handleNodeSelect} selectedNode={selectedNode} />}

            {hasMidstream && hasDownstream && <ArrowConnector />}
            
            {hasDownstream && <Branch title="下游 ⬇️" nodes={chain.downstream} color="green" onNodeSelect={handleNodeSelect} selectedNode={selectedNode} />}
        </div>
        
        {/* Detail View Panel */}
        {selectedNode && (
            <div 
                className="mt-4 bg-white/80 backdrop-blur-lg border border-cyan-400 rounded-xl shadow-2xl p-4 animate-fade-in"
                role="dialog"
                aria-modal="true"
                aria-labelledby="node-details-title"
            >
                <div className="flex justify-between items-center">
                    <h4 id="node-details-title" className="text-lg font-bold text-cyan-800">{selectedNode.name}</h4>
                    <button 
                        onClick={() => setSelectedNode(null)}
                        className="p-1 rounded-full text-gray-500 hover:bg-gray-200 transition-colors"
                        aria-label="关闭详细信息"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>
                <p className="text-sm text-gray-700 mt-2">{selectedNode.description}</p>
            </div>
        )}
    </div>
  );
};

export default IndustryChainViz;