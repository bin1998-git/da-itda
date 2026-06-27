'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';
import { useEffect, useRef, useState } from 'react';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  onImageUpload?: (file: File) => Promise<string>;
}

/* ── SVG 아이콘 ─────────────────────────────────────────────────────────── */
const icons = {
  bold: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
    </svg>
  ),
  italic: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/>
    </svg>
  ),
  strike: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M16 4H9a3 3 0 0 0-2.83 4"/><path d="M14 12a4 4 0 0 1 0 8H6"/><line x1="4" y1="12" x2="20" y2="12"/>
    </svg>
  ),
  h2: (
    <svg width="17" height="15" viewBox="0 0 28 24" fill="currentColor">
      <text x="0" y="18" fontSize="18" fontWeight="700" fontFamily="system-ui">H</text>
      <text x="12" y="18" fontSize="13" fontWeight="700" fontFamily="system-ui">2</text>
    </svg>
  ),
  h3: (
    <svg width="17" height="15" viewBox="0 0 28 24" fill="currentColor">
      <text x="0" y="18" fontSize="18" fontWeight="700" fontFamily="system-ui">H</text>
      <text x="12" y="18" fontSize="13" fontWeight="700" fontFamily="system-ui">3</text>
    </svg>
  ),
  bulletList: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/>
      <circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none"/>
      <circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"/>
      <circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none"/>
    </svg>
  ),
  orderedList: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/>
      <text x="1" y="8" fontSize="7" fill="currentColor" stroke="none" fontWeight="700">1</text>
      <text x="1" y="14" fontSize="7" fill="currentColor" stroke="none" fontWeight="700">2</text>
      <text x="1" y="20" fontSize="7" fill="currentColor" stroke="none" fontWeight="700">3</text>
    </svg>
  ),
  blockquote: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/>
      <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/>
    </svg>
  ),
  alignLeft: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/>
    </svg>
  ),
  alignCenter: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>
    </svg>
  ),
  alignRight: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/>
    </svg>
  ),
  hr: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="12" x2="21" y2="12"/>
    </svg>
  ),
  image: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21,15 16,10 5,21"/>
    </svg>
  ),
  undo: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7v6h6"/><path d="M3 13A9 9 0 1 0 6 6.2L3 13"/>
    </svg>
  ),
  redo: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 7v6h-6"/><path d="M21 13a9 9 0 1 1-3-6.8L21 13"/>
    </svg>
  ),
};

/* ── 툴바 버튼 ──────────────────────────────────────────────────────────── */
function ToolBtn({
  onClick, active, disabled, title, children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      disabled={disabled}
      title={title}
      style={{ transition: 'background-color 60ms ease, color 60ms ease, box-shadow 60ms ease' }}
      className={`
        relative flex items-center justify-center w-8 h-8 rounded-lg
        disabled:opacity-30 disabled:cursor-not-allowed
        ${active
          ? 'bg-amber-500/20 text-amber-500 dark:text-amber-400 shadow-[inset_0_1px_3px_rgba(0,0,0,0.15)]'
          : 'text-stone-400 dark:text-white/40 hover:bg-black/8 dark:hover:bg-white/10 hover:text-stone-800 dark:hover:text-white'
        }
      `}
    >
      {children}
      {active && (
        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-500" />
      )}
    </button>
  );
}

function Divider() {
  return <span className="w-px h-5 bg-black/10 dark:bg-white/10 mx-0.5 shrink-0" />;
}

/* ── 메인 컴포넌트 ──────────────────────────────────────────────────────── */
export default function RichTextEditor({
  value,
  onChange,
  placeholder = '상품의 특징, 원산지, 보관 방법, 주의사항 등을 자세히 입력하세요.',
  onImageUpload,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Placeholder.configure({ placeholder }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image.configure({ inline: false, allowBase64: false }),
    ],
    content: value || '',
    onUpdate({ editor }) {
      const html = editor.getHTML();
      onChange(html === '<p></p>' ? '' : html);
    },
  });

  useEffect(() => {
    if (editor && value === '' && !editor.isEmpty) {
      editor.commands.clearContent();
    }
  }, [value, editor]);

  if (!editor) return null;

  const charCount = editor.getText().length;

  // 선택 없으면 커서 위치의 현재 블록 전체를 선택 후 마크 적용
  const applyMark = (markCmd: () => void) => {
    if (editor.state.selection.empty) {
      const { $from } = editor.state.selection;
      editor.commands.setTextSelection({
        from: $from.start($from.depth),
        to: $from.end($from.depth),
      });
    }
    markCmd();
  };

  const handleImageFile = async (file: File) => {
    if (!onImageUpload) return;
    setUploadError('');
    const MAX = 5 * 1024 * 1024;
    if (file.size > MAX) {
      setUploadError('이미지는 5MB 이하만 업로드 가능합니다.');
      return;
    }
    setUploading(true);
    try {
      const url = await onImageUpload(file);
      editor.chain().focus().setImage({ src: url }).run();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : '이미지 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden bg-[#FAF8F5] dark:bg-[#141414] focus-within:border-amber-500/40 focus-within:shadow-[0_0_0_3px_rgba(245,158,11,0.08)] transition-all duration-200">

      {/* ── 툴바 ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-0.5 px-3 py-2 border-b border-black/8 dark:border-white/8 bg-white/60 dark:bg-white/3 backdrop-blur-sm overflow-x-auto scrollbar-none flex-nowrap min-w-0">

        {/* 텍스트 스타일 */}
        <ToolBtn onClick={() => applyMark(() => editor.chain().focus().toggleBold().run())} active={editor.isActive('bold')} title="굵게 (Ctrl+B)">
          {icons.bold}
        </ToolBtn>
        <ToolBtn onClick={() => applyMark(() => editor.chain().focus().toggleItalic().run())} active={editor.isActive('italic')} title="기울임 (Ctrl+I)">
          {icons.italic}
        </ToolBtn>
        <ToolBtn onClick={() => applyMark(() => editor.chain().focus().toggleStrike().run())} active={editor.isActive('strike')} title="취소선">
          {icons.strike}
        </ToolBtn>

        <Divider />

        {/* 제목 */}
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="큰 제목">
          {icons.h2}
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="소제목">
          {icons.h3}
        </ToolBtn>

        <Divider />

        {/* 목록 */}
        <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="글머리 목록">
          {icons.bulletList}
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="번호 목록">
          {icons.orderedList}
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="인용">
          {icons.blockquote}
        </ToolBtn>

        <Divider />

        {/* 정렬 */}
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="왼쪽 정렬">
          {icons.alignLeft}
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="가운데 정렬">
          {icons.alignCenter}
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="오른쪽 정렬">
          {icons.alignRight}
        </ToolBtn>

        <Divider />

        {/* 기타 */}
        <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="구분선">
          {icons.hr}
        </ToolBtn>

        {/* 이미지 업로드 */}
        {onImageUpload && (
          <ToolBtn
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            title={uploading ? '업로드 중...' : '이미지 삽입'}
          >
            {uploading ? (
              <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
            ) : icons.image}
          </ToolBtn>
        )}

        <Divider />

        {/* Undo / Redo */}
        <ToolBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="되돌리기 (Ctrl+Z)">
          {icons.undo}
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="다시실행 (Ctrl+Y)">
          {icons.redo}
        </ToolBtn>

        {/* 현재 블록 타입 뱃지 */}
        <div className="ml-auto shrink-0">
          {editor.isActive('heading', { level: 2 }) && (
            <span className="text-[10px] font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full whitespace-nowrap">H2</span>
          )}
          {editor.isActive('heading', { level: 3 }) && (
            <span className="text-[10px] font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full whitespace-nowrap">H3</span>
          )}
          {editor.isActive('bulletList') && (
            <span className="text-[10px] font-semibold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full whitespace-nowrap">글머리</span>
          )}
          {editor.isActive('blockquote') && (
            <span className="text-[10px] font-semibold text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded-full whitespace-nowrap">인용</span>
          )}
        </div>
      </div>

      {/* ── 에디터 본문 ────────────────────────────────────────────────── */}
      <EditorContent editor={editor} />

      {/* 이미지 업로드 에러 */}
      {uploadError && (
        <div className="px-4 py-2 bg-rose-500/10 border-t border-rose-500/20 flex items-center justify-between gap-2">
          <span className="text-xs text-rose-400">{uploadError}</span>
          <button type="button" onClick={() => setUploadError('')} className="text-rose-400 hover:text-rose-300 text-sm leading-none">×</button>
        </div>
      )}

      {/* 숨김 파일 인풋 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageFile(file);
          e.target.value = '';
        }}
      />

      {/* ── 하단 상태바 ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-black/6 dark:border-white/6 bg-white/40 dark:bg-white/2">
        <div className="flex items-center gap-3 text-[11px] text-stone-400 dark:text-white/25">
          <span>Ctrl+B 굵게</span>
          <span>·</span>
          <span>Ctrl+I 기울임</span>
          <span>·</span>
          <span>Ctrl+Z 되돌리기</span>
          {onImageUpload && (
            <>
              <span>·</span>
              <span>이미지 버튼으로 사진 삽입</span>
            </>
          )}
        </div>
        <span className={`text-[11px] font-medium transition-colors ${charCount > 4500 ? 'text-rose-400' : 'text-stone-400 dark:text-white/25'}`}>
          {charCount.toLocaleString()} 자
        </span>
      </div>
    </div>
  );
}
