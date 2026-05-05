'use client'

/**
 * MyViewNode.tsx
 * ─────────────────────────────────────────────────────────────────────
 * THE LOGGED-IN USER'S CENTER NODE — "My View" mode
 *
 * Visual spec (DO NOT CHANGE THESE VALUES):
 *   Background   : #0C2918  (deep forest green)
 *   Border       : 1.5px solid #1D9E75
 *   Name text    : #FFFFFF
 *   "You" label  : #5DCAA5  (mint green)
 *   Avatar bg    : #1D9E75  (brand green)
 *   Avatar text  : #FFFFFF
 *   Avatar size  : 36 × 36px
 *   Node width   : min 170px
 *   Border radius: 15px
 *   Outer ring   : animated pulse, 1.5px solid #1D9E75, inset -5px
 *   Avatar ring  : animated pulse, 1.5px solid #5DCAA5, inset -3px on avatar
 *
 * ALL STYLES ARE INLINE — no CSS modules, no Tailwind, no className colors.
 * React Flow overrides external CSS. Inline styles are the only safe approach.
 *
 * Animations are injected once via a <style> tag (keyframes can't be inline).
 * ─────────────────────────────────────────────────────────────────────
 */

import { memo, useState, useCallback, type KeyboardEvent } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import type { TreeNodeData } from '@/types'

// ─── Inject keyframe animations once ──────────────────────────────────────

let mvStylesInjected = false
function injectStyles() {
  if (mvStylesInjected || typeof document === 'undefined') return
  mvStylesInjected = true
  const el = document.createElement('style')
  el.textContent = `
    @keyframes mvNodeEnter {
      0%   { opacity: 0; transform: scale(0.7); }
      65%  { transform: scale(1.05); }
      100% { opacity: 1; transform: scale(1); }
    }
    @keyframes mvOuterPulse {
      0%, 100% { opacity: 0;    transform: scale(1); }
      35%      { opacity: 0.55; transform: scale(1.04); }
      65%      { opacity: 0.2;  transform: scale(1.07); }
    }
    @keyframes mvAvatarPulse {
      0%, 100% { opacity: 0;    transform: scale(1); }
      50%      { opacity: 0.65; transform: scale(1.15); }
    }
    @keyframes mvBtnIn {
      from { opacity: 0; transform: translateY(5px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .mv-enter        { animation: mvNodeEnter   0.4s cubic-bezier(0.16,1,0.3,1) both; }
    .mv-outer-pulse  { animation: mvOuterPulse  2.6s ease-in-out infinite; }
    .mv-avatar-pulse { animation: mvAvatarPulse 2.2s ease-in-out infinite; }
    .mv-btn-1 { animation: mvBtnIn 0.18s ease both 0ms; }
    .mv-btn-2 { animation: mvBtnIn 0.18s ease both 65ms; }
    .mv-btn-3 { animation: mvBtnIn 0.18s ease both 130ms; }
    @media (prefers-reduced-motion: reduce) {
      .mv-enter, .mv-outer-pulse, .mv-avatar-pulse,
      .mv-btn-1, .mv-btn-2, .mv-btn-3 { animation: none !important; }
    }
  `
  document.head.appendChild(el)
}

// ─── Design constants — LOCKED. Do not change. ────────────────────────────

const C = {
  nodeBg:         '#0C2918',
  nodeBorder:     '#1D9E75',
  nameColor:      '#FFFFFF',
  youLabel:       '#5DCAA5',
  yearColor:      'rgba(255,255,255,0.42)',
  nativeColor:    '#FFFFFF',
  avatarBg:       '#1D9E75',
  avatarText:     '#FFFFFF',
  outerRing:      '#1D9E75',
  avatarRing:     '#5DCAA5',
  genBadgeBg:     'rgba(255,255,255,0.13)',
  genBadgeText:   'rgba(255,255,255,0.72)',
  linkedDot:      '#1D9E75',
  linkedBorder:   '#0C2918',
  hoverBtnBg:     '#FFFFFF',
  hoverBtnText:   '#1D9E75',
  hoverBtnBorder: 'rgba(0,0,0,0.15)',
} as const

const RTL_LANGS = ['ar', 'ur', 'he', 'fa']

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase()
}

function formatYear(person: TreeNodeData['person']): string {
  if (person.is_deceased && person.death_date) {
    const dy = new Date(person.death_date).getFullYear()
    return person.birth_year ? `${person.birth_year} \u2013 ${dy}` : `\u2020 ${dy}`
  }
  return person.birth_year ? `b. ${person.birth_year}` : ''
}

// ─── MyViewNode ───────────────────────────────────────────────────────────

export const MyViewNode = memo(function MyViewNode({
  data,
  selected,
}: NodeProps<TreeNodeData>) {
  injectStyles()

  const { person, relationships, displayLanguage, onNodeClick, onAddMember } = data
  const [hovered, setHovered] = useState(false)

  const rel      = relationships[0]
  const yearStr  = formatYear(person)
  const isRtl    = RTL_LANGS.includes(rel?.language_code ?? '')
  const showNative = displayLanguage !== 'en' && !!rel?.relation_native

  const handleClick = useCallback(
    () => onNodeClick(person.id),
    [person.id, onNodeClick],
  )
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onNodeClick(person.id)
      }
    },
    [person.id, onNodeClick],
  )

  return (
    <div
      className="mv-enter"
      role="button"
      tabIndex={0}
      aria-label={`${person.full_name}, your profile node`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      style={{
        position:   'relative',
        display:    'flex',
        alignItems: 'center',
        gap:        10,
        padding:    '11px 13px',
        minWidth:   170,
        maxWidth:   210,
        cursor:     'pointer',
        outline:    'none',
        userSelect: 'none',
        background:   C.nodeBg,
        border:       `1.5px solid ${C.nodeBorder}`,
        borderRadius: 15,
        boxShadow: selected
          ? `0 0 0 4px rgba(29,158,117,0.28), 0 4px 20px rgba(0,0,0,0.28)`
          : hovered
          ? `0 0 0 3px rgba(29,158,117,0.2),  0 4px 16px rgba(0,0,0,0.22)`
          : `0 2px 14px rgba(0,0,0,0.22)`,
        transform:  hovered ? 'translateY(-1px)' : 'translateY(0)',
        transition: 'box-shadow 0.18s ease, transform 0.15s ease',
      }}
    >
      {/* React Flow handles (invisible — required for edges) */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ opacity: 0, pointerEvents: 'none', width: 6, height: 6 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ opacity: 0, pointerEvents: 'none', width: 6, height: 6 }}
      />

      {/* Outer animated pulse ring */}
      <div
        className="mv-outer-pulse"
        aria-hidden="true"
        style={{
          position:     'absolute',
          inset:        -5,
          borderRadius: 19,
          border:       `1.5px solid ${C.outerRing}`,
          opacity:      0,
          pointerEvents: 'none',
        }}
      />

      {/* Generation badge (hover only) */}
      {person.generation !== undefined && hovered && (
        <div
          aria-hidden="true"
          style={{
            position:     'absolute',
            top:          -9,
            left:         10,
            background:   C.genBadgeBg,
            color:        C.genBadgeText,
            fontSize:     8,
            fontWeight:   600,
            padding:      '2px 7px',
            borderRadius: 99,
            whiteSpace:   'nowrap',
            pointerEvents: 'none',
            letterSpacing: '0.03em',
          }}
        >
          Gen {person.generation}
        </div>
      )}

      {/* Avatar */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        {/* Animated ring around avatar */}
        <div
          className="mv-avatar-pulse"
          aria-hidden="true"
          style={{
            position:     'absolute',
            inset:        -3,
            borderRadius: '50%',
            border:       `1.5px solid ${C.avatarRing}`,
            opacity:      0,
            pointerEvents: 'none',
          }}
        />

        {/* Avatar circle */}
        <div
          style={{
            width:          36,
            height:         36,
            borderRadius:   '50%',
            background:     C.avatarBg,
            color:          C.avatarText,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            fontSize:       12,
            fontWeight:     600,
            overflow:       'hidden',
            flexShrink:     0,
            fontFamily:     'inherit',
          }}
        >
          {person.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={person.photo_url}
              alt={person.full_name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
            />
          ) : (
            getInitials(person.full_name)
          )}
        </div>

        {/* Green dot — has a Rootwise account */}
        {person.linked_user_id && (
          <div
            title="Has a Rootwise account"
            aria-label="Has a Rootwise account"
            style={{
              position:     'absolute',
              bottom:       0,
              right:        0,
              width:        9,
              height:       9,
              borderRadius: '50%',
              background:   C.linkedDot,
              border:       `2px solid ${C.linkedBorder}`,
              zIndex:       1,
            }}
          />
        )}
      </div>

      {/* Text content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Name */}
        <div
          style={{
            fontSize:     13,
            fontWeight:   600,
            color:        C.nameColor,
            whiteSpace:   'nowrap',
            overflow:     'hidden',
            textOverflow: 'ellipsis',
            letterSpacing: '-0.3px',
            lineHeight:   1.3,
          }}
        >
          {person.full_name}
        </div>

        {/* "You" label — always shows */}
        <div
          style={{
            fontSize:  9,
            fontWeight: 500,
            color:     C.youLabel,
            marginTop: 1,
            lineHeight: 1.3,
          }}
        >
          You
        </div>

        {/* Native script relation (optional) */}
        {showNative && rel?.relation_native && (
          <div
            dir={isRtl ? 'rtl' : 'ltr'}
            lang={rel.language_code ?? undefined}
            style={{
              fontSize:  11,
              fontWeight: 600,
              color:     C.nativeColor,
              marginTop: 1,
              lineHeight: 1.2,
              textAlign: isRtl ? 'right' : 'left',
            }}
          >
            {rel.relation_native}
          </div>
        )}

        {/* Pronunciation hint */}
        {showNative && rel?.relation_romanized && (
          <div
            style={{
              fontSize:  9,
              color:     'rgba(255,255,255,0.45)',
              fontStyle: 'italic',
              marginTop: 1,
              lineHeight: 1.2,
            }}
          >
            ({rel.relation_romanized})
          </div>
        )}

        {/* Birth / death year */}
        {yearStr && (
          <div
            style={{
              fontSize:  9,
              color:     C.yearColor,
              marginTop: 2,
              lineHeight: 1.3,
            }}
          >
            {yearStr}
          </div>
        )}
      </div>

      {/* Hover add buttons */}
      {hovered && (
        <div
          aria-hidden="true"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            position:  'absolute',
            bottom:    -28,
            left:      '50%',
            transform: 'translateX(-50%)',
            display:   'flex',
            gap:       4,
            zIndex:    100,
            whiteSpace: 'nowrap',
            pointerEvents: 'all',
          }}
        >
          {([
            { label: '+ Spouse', r: 'spouse', cls: 'mv-btn-1' },
            { label: '+ Child',  r: 'child',  cls: 'mv-btn-2' },
            { label: '+ Parent', r: 'parent', cls: 'mv-btn-3' },
          ] as const).map(({ label, r, cls }) => (
            <button
              key={r}
              className={cls}
              tabIndex={0}
              onClick={e => { e.stopPropagation(); onAddMember(person.id, r) }}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault(); e.stopPropagation()
                  onAddMember(person.id, r)
                }
              }}
              style={{
                padding:      '3px 8px',
                borderRadius: 99,
                background:   C.hoverBtnBg,
                border:       `0.5px solid ${C.hoverBtnBorder}`,
                color:        C.hoverBtnText,
                fontSize:     10,
                fontWeight:   600,
                cursor:       'pointer',
                boxShadow:    '0 2px 10px rgba(0,0,0,0.14)',
                fontFamily:   'inherit',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
})
