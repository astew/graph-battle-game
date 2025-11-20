import React from 'react';

const GRID_SPACING = 96;
const NODE_RADIUS = 24;
const SLOT_RADIUS = NODE_RADIUS + 10;

function formatClassSegment(value) {
  if (!value && value !== 0) {
    return 'none';
  }
  return String(value).replace(/[^a-zA-Z0-9_-]/g, '-');
}

function getStrengthTier(strength) {
  if (strength <= 0) return 'strength-0';
  if (strength === 1) return 'strength-1';
  if (strength <= 8) return 'strength-2-8';
  if (strength <= 20) return 'strength-9-20';
  return 'strength-21-plus';
}

function createEdgeKey(a, b) {
  if (!a || !b) {
    return '';
  }
  return a < b ? `${a}::${b}` : `${b}::${a}`;
}

function describeNode(node, playersById) {
  const owner = node.ownerId ? playersById.get(node.ownerId) : null;
  const ownerName = owner?.name ?? node.ownerId ?? 'Unclaimed';
  return `${node.id} controlled by ${ownerName} with strength ${node.strength}`;
}

function BoardCanvas({
  nodes,
  edges,
  playersById,
  onNodeSelect,
  selectedAttackerId,
  targetNodeIds,
  reinforcementHighlights,
  gridDimensions,
  highlightedEdges,
  currentPlayerId,
  activeAnimation,
}) {
  if (!nodes || nodes.length === 0) {
    return <div className="board-empty">Board unavailable</div>;
  }

  const coordinates = nodes.map((node) => {
    const row = node.position?.row ?? 0;
    const column = node.position?.column ?? 0;
    const cx = column * GRID_SPACING + GRID_SPACING / 2;
    const cy = row * GRID_SPACING + GRID_SPACING / 2;
    const positionKey = `${row},${column}`;
    return { node, cx, cy, row, column, positionKey };
  });

  const derivedMaxRow = coordinates.reduce((max, entry) => Math.max(max, entry.row), 0);
  const derivedMaxColumn = coordinates.reduce((max, entry) => Math.max(max, entry.column), 0);
  const totalRows = Math.max(gridDimensions?.rows ?? derivedMaxRow + 1, 1);
  const totalColumns = Math.max(gridDimensions?.columns ?? derivedMaxColumn + 1, 1);
  const width = totalColumns * GRID_SPACING;
  const height = totalRows * GRID_SPACING;

  const nodeLookup = new Map(coordinates.map((entry) => [entry.node.id, entry]));
  const nodesByPosition = new Map(coordinates.map((entry) => [entry.positionKey, entry]));

  const targetIds = targetNodeIds ?? new Set();
  const reinforcementIds = reinforcementHighlights ?? new Set();
  const highlightedEdgeKeys = highlightedEdges ?? new Set();
  const activeEdgeKey =
    activeAnimation?.type === 'attack-iteration'
      ? createEdgeKey(activeAnimation.attackerId, activeAnimation.defenderId)
      : null;

  const boardClasses = ['board', 'board-canvas'];
  if (currentPlayerId) {
    boardClasses.push(`board--active-${formatClassSegment(currentPlayerId)}`);
  }
  if (activeAnimation) {
    boardClasses.push('board--animating');
  }

  const slotElements = [];
  for (let row = 0; row < totalRows; row += 1) {
    for (let column = 0; column < totalColumns; column += 1) {
      const cx = column * GRID_SPACING + GRID_SPACING / 2;
      const cy = row * GRID_SPACING + GRID_SPACING / 2;
      const positionKey = `${row},${column}`;
      const occupied = nodesByPosition.has(positionKey);
      const slotClasses = ['board-slot'];
      if (occupied) {
        slotClasses.push('board-slot--occupied');
      }
      slotElements.push(
        <circle
          key={`slot-${positionKey}`}
          className={slotClasses.join(' ')}
          cx={cx}
          cy={cy}
          r={SLOT_RADIUS}
          aria-hidden="true"
        />
      );
    }
  }

  const edgeElements = (edges ?? [])
    .map(([fromId, toId], index) => {
      const from = nodeLookup.get(fromId);
      const to = nodeLookup.get(toId);
      if (!from || !to) {
        return null;
      }

      const edgeKey = createEdgeKey(fromId, toId);
      const classes = ['board-edge'];
      if (highlightedEdgeKeys.has(edgeKey)) {
        classes.push('board-edge--highlighted');
      }
      if (activeEdgeKey && edgeKey === activeEdgeKey) {
        classes.push('board-edge--animating');
      }

      return (
        <line
          key={`edge-${fromId}-${toId}-${index}`}
          x1={from.cx}
          y1={from.cy}
          x2={to.cx}
          y2={to.cy}
          className={classes.join(' ')}
        />
      );
    })
    .filter(Boolean);

  const handleNodeActivate = (nodeId) => {
    if (typeof onNodeSelect === 'function') {
      onNodeSelect(nodeId);
    }
  };

  const nodeElements = coordinates.map(({ node, cx, cy, row, column }) => {
    const owner = node.ownerId ? playersById.get(node.ownerId) : null;
    const fill = owner?.color ?? '#9CA3AF';
    const classes = [
      'board-node',
      `node--owner-${formatClassSegment(node.ownerId ?? 'unclaimed')}`,
      `node--row-${formatClassSegment(row)}`,
      `node--col-${formatClassSegment(column)}`,
      `node--${getStrengthTier(node.strength)}`,
    ];
    if (node.id === selectedAttackerId) {
      classes.push('board-node--selected');
    }
    if (targetIds.has(node.id)) {
      classes.push('board-node--targetable');
    }
    if (reinforcementIds.has(node.id)) {
      classes.push('board-node--reinforced');
    }
    if (node.ownerId && node.ownerId === currentPlayerId) {
      classes.push('board-node--active-owner');
    }
    if (activeAnimation?.type === 'attack-iteration' && node.id === activeAnimation.attackerId) {
      classes.push('board-node--attack-source');
    }
    if (activeAnimation?.type === 'attack-iteration' && node.id === activeAnimation.defenderId) {
      classes.push('board-node--attack-target');
    }
    if (activeAnimation?.type === 'reinforcement-step' && node.id === activeAnimation.nodeId) {
      classes.push('board-node--reinforcing');
    }
    const ariaLabel = describeNode(node, playersById);
    const transformParts = [`translate(${cx} ${cy})`];
    if (node.id === selectedAttackerId) {
      transformParts.push('scale(1.08)');
    }
    const transform = transformParts.join(' ');

    const onKeyDown = (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleNodeActivate(node.id);
      }
    };

    return (
      <g
        key={node.id}
        className={classes.join(' ')}
        transform={transform}
        tabIndex={0}
        role="button"
        aria-label={ariaLabel}
        onClick={() => handleNodeActivate(node.id)}
        onKeyDown={onKeyDown}
      >
        <circle r={NODE_RADIUS} fill={fill} />
        <text className="board-node__strength" textAnchor="middle" dominantBaseline="central">
          {node.strength}
        </text>
      </g>
    );
  });

  return (
    <div className={boardClasses.join(' ')} role="application" aria-label="Battlefield">
      <svg className="board-svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        <g className="board-slots">{slotElements}</g>
        <g className="board-edges">{edgeElements}</g>
        <g className="board-nodes">{nodeElements}</g>
      </svg>
    </div>
  );
}

export default BoardCanvas;
export { createEdgeKey };
