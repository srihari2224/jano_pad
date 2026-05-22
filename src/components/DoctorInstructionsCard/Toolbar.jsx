/**
 * Toolbar.jsx — the formatting toolbar above the editor.
 * Every control reflects live active state via editor.isActive().
 */
import {
  IconUndo,
  IconRedo,
  IconListBullet,
  IconListOrdered,
  IconAlignLeft,
  IconAlignCenter,
  IconAlignRight,
  IconClearFormat,
} from './icons';

/** A single toolbar button — keeps editor focus on mousedown. */
function TbBtn({ active, disabled, title, onClick, children }) {
  return (
    <button
      type="button"
      className={`tb-btn ${active ? 'is-active' : ''}`}
      disabled={disabled}
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default function Toolbar({ editor }) {
  if (!editor) return null;

  const headingValue = editor.isActive('heading', { level: 1 })
    ? 'h1'
    : editor.isActive('heading', { level: 2 })
      ? 'h2'
      : editor.isActive('heading', { level: 3 })
        ? 'h3'
        : 'p';

  const setBlock = (v) => {
    const chain = editor.chain().focus();
    if (v === 'p') chain.setParagraph().run();
    else chain.setHeading({ level: Number(v[1]) }).run();
  };

  const textColor = editor.getAttributes('textStyle').color || '#1a1a1a';
  const highlightColor = editor.getAttributes('highlight').color || '#fde68a';

  return (
    <div className="np-toolbar">
      {/* History */}
      <div className="tb-group">
        <TbBtn
          title="Undo  (Ctrl+Z)"
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <IconUndo size={15} />
        </TbBtn>
        <TbBtn
          title="Redo  (Ctrl+Y)"
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <IconRedo size={15} />
        </TbBtn>
      </div>
      <span className="tb-sep" />

      {/* Inline formatting */}
      <div className="tb-group">
        <TbBtn
          title="Bold  (Ctrl+B)"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <span className="tb-btn--glyph tb-glyph-bold">B</span>
        </TbBtn>
        <TbBtn
          title="Italic  (Ctrl+I)"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <span className="tb-btn--glyph tb-glyph-italic">I</span>
        </TbBtn>
        <TbBtn
          title="Underline  (Ctrl+U)"
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <span className="tb-btn--glyph tb-glyph-underline">U</span>
        </TbBtn>
        <TbBtn
          title="Strikethrough"
          active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <span className="tb-btn--glyph tb-glyph-strike">S</span>
        </TbBtn>
      </div>
      <span className="tb-sep" />

      {/* Block type */}
      <div className="tb-group">
        <select
          className="tb-select"
          value={headingValue}
          onChange={(e) => setBlock(e.target.value)}
        >
          <option value="p">Normal</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </select>
      </div>
      <span className="tb-sep" />

      {/* Lists */}
      <div className="tb-group">
        <TbBtn
          title="Bullet list"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <IconListBullet size={15} />
        </TbBtn>
        <TbBtn
          title="Numbered list"
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <IconListOrdered size={15} />
        </TbBtn>
      </div>
      <span className="tb-sep" />

      {/* Alignment */}
      <div className="tb-group">
        <TbBtn
          title="Align left"
          active={editor.isActive({ textAlign: 'left' })}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
        >
          <IconAlignLeft size={15} />
        </TbBtn>
        <TbBtn
          title="Align center"
          active={editor.isActive({ textAlign: 'center' })}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
        >
          <IconAlignCenter size={15} />
        </TbBtn>
        <TbBtn
          title="Align right"
          active={editor.isActive({ textAlign: 'right' })}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
        >
          <IconAlignRight size={15} />
        </TbBtn>
      </div>
      <span className="tb-sep" />

      {/* Colour */}
      <div className="tb-group">
        <label className="tb-color" title="Text colour">
          <span
            className="tb-color__swatch"
            style={{ background: textColor }}
          />
          <input
            type="color"
            className="tb-color__input"
            value={textColor}
            onChange={(e) =>
              editor.chain().focus().setColor(e.target.value).run()
            }
          />
        </label>
        <label className="tb-color" title="Highlight colour">
          <span
            className="tb-color__swatch"
            style={{ background: highlightColor }}
          />
          <input
            type="color"
            className="tb-color__input"
            value={highlightColor}
            onChange={(e) =>
              editor
                .chain()
                .focus()
                .setHighlight({ color: e.target.value })
                .run()
            }
          />
        </label>
      </div>
      <span className="tb-sep" />

      {/* Clear */}
      <div className="tb-group">
        <TbBtn
          title="Clear formatting"
          onClick={() =>
            editor.chain().focus().unsetAllMarks().clearNodes().run()
          }
        >
          <IconClearFormat size={15} />
        </TbBtn>
      </div>
    </div>
  );
}
