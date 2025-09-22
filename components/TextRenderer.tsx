import React from 'react';
import Tooltip from './Tooltip';
import { GLOSSARY } from './glossary';

interface TextRendererProps {
  text: string;
  keywords?: string[];
}

const TextRenderer: React.FC<TextRendererProps> = ({ text, keywords = [] }) => {
  if (!text) {
    return null;
  }

  // Combine glossary terms and keywords into a single regex for splitting the text.
  // Using a Set prevents duplicates and improves performance.
  const allTerms = [
    ...new Set([...Object.keys(GLOSSARY), ...keywords.map(k => k.toLowerCase())]),
  ].filter(Boolean);

  if (allTerms.length === 0) {
    return <>{text}</>;
  }
  
  // Build a regex that will find any of the terms, case-insensitively.
  const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${allTerms.map(escapeRegExp).join('|')})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, index) => {
        if (!part) return null; // Don't render empty strings

        const lowerPart = part.toLowerCase();
        const isKeyword = keywords.some(k => k.toLowerCase() === lowerPart);
        const glossaryDefinition = GLOSSARY[lowerPart];

        // Case 1: The part is a glossary term.
        if (glossaryDefinition) {
          // If it's also a keyword, wrap it in a <mark> tag inside the tooltip.
          const content = isKeyword ? (
            <mark className="bg-cyan-100 text-cyan-800 rounded-sm px-1 mx-px font-semibold">
              {part}
            </mark>
          ) : (
            part
          );
          return (
            <Tooltip key={index} tip={glossaryDefinition}>
              {content}
            </Tooltip>
          );
        } 
        // Case 2: The part is just a keyword (and not a glossary term).
        else if (isKeyword) {
          return (
            <mark key={index} className="bg-cyan-100 text-cyan-800 rounded-sm px-1 mx-px font-semibold">
              {part}
            </mark>
          );
        }
        // Case 3: The part is plain text.
        return <span key={index}>{part}</span>;
      })}
    </>
  );
};

export default TextRenderer;
