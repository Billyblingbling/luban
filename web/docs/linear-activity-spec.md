# Linear Activity UI Specification

This document captures the CSS/layout observations used to implement the Linear-style activity
feed in Luban.

Scope:
- Timeline-style activity list with mixed "system events" and "message cards"
- Dimensions, spacing, and colors measured from the Linear issue detail page

## Overall structure

```
┌─────────────────────────────────────────────────────────────────┐
│ ─── Divider (1px solid #e8e8e8) ───                              │
├─────────────────────────────────────────────────────────────────┤
│ [Activity title]                               [Subscribe] [...]│
├─────────────────────────────────────────────────────────────────┤
│ ○── [Actor] [Action text] · [Timestamp]        (plain event row) │
│ │                                                               │
│ ●── [Actor] [Timestamp]                      (message/card row) │
│ │   [Message content...]                                         │
│ │   [Reply/input...]                                             │
│ │                                                               │
│ ○── [Actor] [Action text] · [Timestamp]        (plain event row) │
└─────────────────────────────────────────────────────────────────┘
```

Legend:
- `○`: small circular icon (system event)
- `●`: avatar (message)
- `│`: timeline connector line

## Key measurements

### 1) Message card styling

- Border: `1px solid #e8e8e8`
- Border radius: `8px`
- Background: `#ffffff`
- Shadow:
  - `rgba(0,0,0,0.022) 0px 3px 6px -2px`
  - `rgba(0,0,0,0.044) 0px 1px 1px 0px`
- Padding: `12px 16px`

### 2) Timeline connector

- Present between adjacent event rows
- Width: `1px`
- Color: `#c8c8c8`
- Positioned absolutely
- The line passes through the vertical center of the icon/avatar column

### 3) Avatar / icon sizes

- Avatar: `20x20px`, circular (`border-radius: 50%`)
- Event icon container: `14x18px` column, with `padding-top: 2px`

### 4) Plain event row layout

```css
.event-row {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  padding: 1px 0;
}

.event-icon-column {
  width: 14px;
  height: 18px;
  margin-right: 11px;
  padding-top: 2px;
}

.event-text-column {
  flex: 1 1 auto;
}
```

### 5) Event text styling

```css
.event-actor {
  font-size: 12px;
  font-weight: 500;
  color: #5b5b5d;
  text-decoration: none;
}

.event-text {
  font-size: 12px;
  font-weight: 400;
  color: #5b5b5d;
}

.event-separator {
  font-size: 12px;
  color: #5b5b5d;
  margin: 0 4px;
}

.event-timestamp {
  font-size: 12px;
  font-weight: 400;
  color: #5b5b5d;
}
```

### 6) Spacing

- Vertical gap between activity items: ~`18px` (depends on content type)

### 7) Color reference (HEX)

| Purpose | Value |
| --- | --- |
| Primary text | `#1b1b1b` |
| Secondary/meta text | `#5b5b5d` |
| Timeline line | `#c8c8c8` |
| Borders | `#e8e8e8` |
| Page background | `#fdfdfd` |

## Implementation notes

- System events should render as plain rows (no card).
- User/assistant messages render as cards aligned with the same icon/avatar column.
- The timeline connector should visually "break" at cards (cards are visually dominant).
