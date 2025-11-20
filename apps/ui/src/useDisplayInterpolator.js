import { useCallback, useEffect, useRef, useState } from 'react';
import core from '@graph-battle/core';
import { ATTACK_ITERATION_MS, REINFORCEMENT_STEP_MS, ANIMATION_SPEED_MULTIPLIER_FAST } from './constants.js';

const { EVENT_TYPES } = core ?? {};

export default function useDisplayInterpolator(eventBus, initialView, getView, animationSpeed) {
  const [displayState, setDisplayState] = useState(() => {
    if (!initialView) return null;
    const playerTotals = computePlayerTotals(initialView.nodes);
    return { ...initialView, playerTotals };
  });
  const [activeAnimation, setActiveAnimation] = useState(null);
  const [animationQueue, setAnimationQueue] = useState([]);

  const enqueueAnimation = useCallback((animation) => {
    setAnimationQueue((prev) => [...prev, animation]);
  }, []);

  const processQueue = useCallback(() => {
    if (activeAnimation || animationQueue.length === 0) {
      return;
    }

    const nextAnimation = animationQueue[0];
    setAnimationQueue((prev) => prev.slice(1));
    setActiveAnimation(nextAnimation);

    // Beginning handler: update display state immediately (for some events)
    setDisplayState((prev) => {
      if (!prev) return prev;
      let updated = { ...prev };
      if (nextAnimation.type === 'reinforcement-step') {
        updated.nodes = prev.nodes.map((node) => {
          if (node.id === nextAnimation.nodeId) {
            return { ...node, strength: nextAnimation.strength };
          }
          return node;
        });
      } else if (nextAnimation.type === 'attack-resolved') {
        // Update to final state
        const finalView = getView();
        updated = { ...finalView, playerTotals: computePlayerTotals(finalView.nodes) };
      } else if (nextAnimation.type === 'reinforcements-complete') {
        // No display change, just end of reinforcements
      }
      // For 'attack-iteration', delay the update to after animation
      // Recompute playerTotals if nodes changed
      if (updated.nodes !== prev.nodes) {
        updated.playerTotals = computePlayerTotals(updated.nodes);
      }
      return updated;
    });

    // Determine duration
    let duration = 0;
    if (nextAnimation.type === 'attack-iteration') {
      const base = ATTACK_ITERATION_MS;
      const multiplier = animationSpeed === 'fast' ? ANIMATION_SPEED_MULTIPLIER_FAST : 1;
      duration = Math.max(140, base * multiplier);
    } else if (nextAnimation.type === 'reinforcement-step') {
      const base = REINFORCEMENT_STEP_MS;
      const multiplier = animationSpeed === 'fast' ? ANIMATION_SPEED_MULTIPLIER_FAST : 1;
      duration = Math.max(140, base * multiplier);
    }
    // For 'attack-resolved', duration is 0

    setTimeout(() => {
      // End handler: update display state for events that delay updates
      if (nextAnimation.type === 'attack-iteration') {
        setDisplayState((prev) => {
          if (!prev) return prev;
          const updatedNodes = prev.nodes.map((node) => {
            if (node.id === nextAnimation.attackerId) {
              return { ...node, strength: nextAnimation.attackerStrength };
            }
            if (node.id === nextAnimation.defenderId) {
              return { ...node, strength: nextAnimation.defenderStrength };
            }
            return node;
          });
          return { ...prev, nodes: updatedNodes, playerTotals: computePlayerTotals(updatedNodes) };
        });
      }
      // Clear animation
      setActiveAnimation(null);
    }, duration);
  }, [activeAnimation, animationQueue, animationSpeed, getView]);

  useEffect(() => {
    processQueue();
  }, [processQueue]);

  useEffect(() => {
    if (!eventBus) return;

    const subscriptions = [
      eventBus.subscribe(EVENT_TYPES.ATTACK_ITERATION, (event) => {
        enqueueAnimation({ type: 'attack-iteration', ...event.payload });
      }),
      eventBus.subscribe(EVENT_TYPES.REINFORCEMENT_STEP, (event) => {
        enqueueAnimation({ type: 'reinforcement-step', ...event.payload });
      }),
      eventBus.subscribe(EVENT_TYPES.ATTACK_RESOLVED, (event) => {
        enqueueAnimation({ type: 'attack-resolved', ...event.payload });
      }),
      eventBus.subscribe(EVENT_TYPES.REINFORCEMENTS_AWARDED, (event) => {
        enqueueAnimation({ type: 'reinforcements-awarded', ...event.payload });
      }),
      eventBus.subscribe(EVENT_TYPES.REINFORCEMENTS_COMPLETE, (event) => {
        enqueueAnimation({ type: 'reinforcements-complete', ...event.payload });
      }),
    ];

    return () => {
      subscriptions.forEach((unsub) => unsub());
    };
  }, [eventBus, enqueueAnimation]);

  // Update displayState when initialView changes, but not during animations
  useEffect(() => {
    if (activeAnimation || animationQueue.length > 0 || !initialView) return;
    const playerTotals = computePlayerTotals(initialView.nodes);
    setDisplayState({ ...initialView, playerTotals });
  }, [initialView, activeAnimation, animationQueue.length]);

  const isInteractionLocked = Boolean(activeAnimation) || animationQueue.length > 0;

  return [displayState, activeAnimation, isInteractionLocked];
}

function computePlayerTotals(nodes) {
  const totals = new Map();
  for (const node of nodes ?? []) {
    if (node.ownerId) {
      totals.set(node.ownerId, (totals.get(node.ownerId) || 0) + 1);
    }
  }
  return totals;
}