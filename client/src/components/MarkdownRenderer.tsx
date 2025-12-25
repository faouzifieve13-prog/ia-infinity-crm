import { useMemo } from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const htmlContent = useMemo(() => {
    if (!content) return '';
    
    let html = content
      // Escape HTML characters first
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      
      // Headers (### Header -> <h3>)
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2 text-foreground">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold mt-4 mb-2 text-foreground">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-4 mb-2 text-foreground">$1</h1>')
      
      // Bold text (**text** or __text__)
      .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold">$1</strong>')
      .replace(/__([^_]+)__/g, '<strong class="font-semibold">$1</strong>')
      
      // Italic text (*text* or _text_)
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/_([^_]+)_/g, '<em>$1</em>')
      
      // Horizontal rules (---)
      .replace(/^---$/gm, '<hr class="my-4 border-border" />')
      
      // Bullet points (- item)
      .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
      
      // Numbered lists (1. item)
      .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
      
      // Line breaks
      .replace(/\n\n/g, '</p><p class="mb-3">')
      .replace(/\n/g, '<br />');
    
    // Wrap in paragraph if not starting with a block element
    if (!html.startsWith('<h') && !html.startsWith('<hr') && !html.startsWith('<li')) {
      html = '<p class="mb-3">' + html + '</p>';
    }
    
    // Wrap consecutive list items in ul/ol
    html = html.replace(/(<li[^>]*>.*?<\/li>)+/g, (match) => {
      if (match.includes('list-disc')) {
        return '<ul class="mb-3 space-y-1">' + match + '</ul>';
      }
      return '<ol class="mb-3 space-y-1">' + match + '</ol>';
    });
    
    return html;
  }, [content]);

  return (
    <div 
      className={`prose prose-sm dark:prose-invert max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
      data-testid="markdown-content"
    />
  );
}

export function cleanMarkdown(text: string): string {
  if (!text) return '';
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_{2}([^_]+)_{2}/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/^### /gm, '')
    .replace(/^## /gm, '')
    .replace(/^# /gm, '')
    .replace(/^---$/gm, '');
}
