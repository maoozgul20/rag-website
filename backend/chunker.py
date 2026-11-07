"""Step 1a: the recursive chunker, copied from the notebook unchanged."""


def recursive_chunk(text, chunk_size=300, chunk_overlap=50):
    separators = ["\n\n", "\n", ". ", " "]

    def _split(t, seps):
        if len(t) <= chunk_size:
            return [t]
        if not seps:
            step = chunk_size - chunk_overlap
            return [t[i:i + chunk_size] for i in range(0, len(t), step)]
        sep = seps[0]
        parts = t.split(sep)
        # keep the separator attached to each piece, except the last one
        pieces = [p + sep if i < len(parts) - 1 else p
                  for i, p in enumerate(parts)]
        chunks, current = [], ""
        for piece in pieces:
            if len(current) + len(piece) <= chunk_size:
                current += piece
            else:
                if current:
                    chunks.append(current)
                if len(piece) > chunk_size:
                    chunks.extend(_split(piece, seps[1:]))
                    current = ""
                else:
                    current = piece
        if current:
            chunks.append(current)
        return chunks

    chunks = [c for c in _split(text, separators) if c.strip()]
    # overlap: each chunk carries the first chunk_overlap characters
    # of the next chunk, so a sentence cut at a boundary still
    # appears whole in one of the two chunks
    out = []
    for i, c in enumerate(chunks):
        if i < len(chunks) - 1:
            out.append(c + chunks[i + 1][:chunk_overlap])
        else:
            out.append(c)
    return out
