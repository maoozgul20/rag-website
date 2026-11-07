import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

// Models often write math as \[ ... \] or \( ... \); remark-math only reads $ delimiters
function normalizeMath(text) {
  return text
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, m) => `\n$$\n${m.trim()}\n$$\n`)
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, m) => `$${m.trim()}$`)
}

// Renders the model's Markdown answer (lists, bold, code, tables, math) like a chat app.
// Raw HTML in the answer is not rendered, so model output cannot inject markup.
export default function Markdown({ children }) {
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: true }]]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: 'ignore' }]]}
        components={{
          a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
          table: ({ node, ...props }) => <div className="md-table"><table {...props} /></div>,
        }}
      >
        {normalizeMath(children || '')}
      </ReactMarkdown>
    </div>
  )
}
