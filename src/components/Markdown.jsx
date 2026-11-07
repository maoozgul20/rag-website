import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// Renders the model's Markdown answer (lists, bold, code, tables) like a chat app.
// Raw HTML in the answer is not rendered, so model output cannot inject markup.
export default function Markdown({ children }) {
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
          table: ({ node, ...props }) => <div className="md-table"><table {...props} /></div>,
        }}
      >
        {children || ''}
      </ReactMarkdown>
    </div>
  )
}
